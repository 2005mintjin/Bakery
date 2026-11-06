// Isolated static host and browser slots; no personal save files are used.
import assert from "node:assert/strict";
import http from "node:http";
import { buildWeb } from "./build-web.mjs";
import { staticFiles } from "../server/staticFiles.js";
import { fresh } from "../src/saveSystem.js";
import { webSavePrefix } from "../src/edition.js";
import { advanceDialogue } from "./browser-dialogue.mjs";
const { chromium } = await import(process.env.BAKERY_PLAYWRIGHT_MODULE || "playwright");
const root = await buildWeb();
const server = http.createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    if (!path.startsWith("/Bakery/")) throw Error("path");
    await staticFiles(req, res, path.slice(7), root);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
let browser;
try {
  browser = await chromium.launch({executablePath:process.env.BAKERY_BROWSER, args:["--no-sandbox"]});
  const context = await browser.newContext({viewport:{width:1366,height:1000},hasTouch:true});
  const p = await context.newPage(), errors=[];
  p.on("pageerror",e=>errors.push(e.message));
  const state=Object.assign(fresh(),{scene:"downtown",x:166,y:310,minutes:720});
  state.tutorial.bakeryIntroSeen=true;
  await p.addInitScript(({state,key})=>{
    if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));
    window.clinicVoiceStarts=[];
    const create=AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource=function(){
      const node=create.call(this), start=node.start;
      node.start=function(...args){window.clinicVoiceStarts.push(this.buffer);return start.apply(this,args);};
      return node;
    };
  },{state,key:webSavePrefix+"/Bakery/1"});
  const choose=name=>p.getByRole("button",{name,exact:true}).click();
  const drain=()=>advanceDialogue(p,40);
  async function start(){
    await p.goto(`http://127.0.0.1:${server.address().port}/Bakery/`);
    await p.getByRole("button",{name:/^1번 ·/}).waitFor();
    await p.evaluate(async()=>{
      const {UI}=await import("./src/ui.js"),{Renderer}=await import("./src/renderer.js");
      const update=UI.prototype.update, draw=Renderer.prototype.draw;
      UI.prototype.update=function(...args){window.clinicGame=this.g;return update.apply(this,args);};
      Renderer.prototype.draw=function(...args){window.clinicRenderer=this;return draw.apply(this,args);};
    });
    await p.getByRole("button",{name:/^1번 ·/}).click();
    await p.locator("#overlay").waitFor({state:"hidden"});
    await p.waitForFunction(()=>window.clinicGame?.started);
  }
  async function saved(){
    const expected=await p.evaluate(()=>structuredClone(window.clinicGame.state.clinic));
    await p.keyboard.press("Escape");await choose("저장");await p.locator("#overlay").waitFor({state:"hidden"});await start();
    assert.deepEqual(await p.evaluate(()=>window.clinicGame.state.clinic),expected);
  }
  async function enter(){
    await p.keyboard.down("w");
    try{await p.waitForFunction(()=>window.clinicGame.state.scene==="clinic");}
    finally{await p.keyboard.up("w");}
    await p.getByRole("button",{name:"콘스탄체와 대화 · 의사",exact:true}).waitFor();
  }
  async function voice(key){
    await p.waitForFunction(key=>{
      const buffer=window.clinicGame.voices.buffers.get(key)?.buffer;
      return buffer&&window.clinicVoiceStarts.some(b=>b===buffer);
    },key);
  }
  async function speak(key){
    await choose({konstanze:"콘스탄체와 대화 · 의사",valeria:"발레리아와 대화 · 의사",catherine:"캐서린과 대화 · 간호사"}[key]);
    assert.match(await p.locator(".dialogue-portrait img").getAttribute("src"),new RegExp(`${key}-portrait.png$`));
  }
  await start();await enter();
  assert.ok(await p.evaluate(()=>window.clinicRenderer.scenery.get(window.clinicGame.data.interiorBackgrounds.clinic.asset).src.endsWith("clinic.png")));
  await p.screenshot({path:"/tmp/bakery-clinic-interior.png",fullPage:true});
  for(const key of ["konstanze","valeria","catherine"]){
    await speak(key);
    if(key==="catherine")await choose("도와드릴 게 있을까요.");
    await voice(key);await drain();
    await p.screenshot({path:`/tmp/bakery-clinic-${key}.png`,fullPage:true});
    await p.keyboard.press("Escape");
  }
  // Accept after reading; ESC during the offer does not accept.
  await speak("konstanze");await drain();await choose("도와드릴 게 있을까요?");await p.keyboard.press("Escape");
  assert.equal(await p.evaluate(()=>window.clinicGame.state.clinic.bread),"none");
  await speak("konstanze");await drain();await choose("도와드릴 게 있을까요?");await drain();
  assert.equal(await p.evaluate(()=>window.clinicGame.state.clinic.bread),"active");await saved();
  await speak("konstanze");await drain();await choose("여기 있어요.");await drain();
  assert.match(await p.locator("#toast").textContent(),/밀빵 3개/);await p.keyboard.press("Escape");
  await p.evaluate(()=>window.clinicGame.state.items.loaf=3);
  await speak("konstanze");await drain();await choose("여기 있어요.");await drain();
  assert.deepEqual(await p.evaluate(()=>({bread:window.clinicGame.state.clinic.bread,loaf:window.clinicGame.state.items.loaf,money:window.clinicGame.state.money})),{bread:"done",loaf:0,money:120});
  await speak("konstanze");await drain();await choose("혹시 몇 살인가요?");await drain();await choose("20대 초반 같아요!");await drain();await p.keyboard.press("Escape");
  await speak("valeria");await drain();await choose("무슨 일을 하시나요?");await drain();await choose("자신감을 가지세요!");await drain();await choose("혹시 간호사인가요?");await drain();await p.keyboard.press("Escape");
  // Gift: accept, package, persist, deliver to the replaced outdoor resident, report.
  await speak("catherine");await choose("도와드릴 게 있을까요.");await drain();await choose("미하일이 누군데요?");await drain();await choose("당연하죠.");await drain();
  await speak("catherine");await drain();await choose("여기 있어요.");await drain();assert.match(await p.locator("#toast").textContent(),/베리 빵/);await p.keyboard.press("Escape");
  await p.evaluate(()=>window.clinicGame.state.items.berrybread=1);
  await speak("catherine");await drain();await choose("여기 있어요.");await drain();
  assert.equal(await p.evaluate(()=>window.clinicGame.state.clinic.gift),"wrapped");
  await p.locator('[data-panel="inventory"]:visible').first().click();assert.match(await p.locator(".panel").textContent(),/리본으로 포장한 베리 빵/);await p.keyboard.press("Escape");
  await p.locator('[data-panel="journal"]:visible').first().click();assert.match(await p.locator(".panel").textContent(),/미하일에게 전하세요/);await p.keyboard.press("Escape");await saved();
  await choose("← 번화가로 나가기");assert.equal(await p.evaluate(()=>window.clinicGame.state.scene),"downtown");assert.equal(await p.evaluate(()=>window.clinicGame.state.x),166);
  await p.evaluate(()=>Object.assign(window.clinicGame.state,{x:740,y:320}));
  await p.keyboard.press("e");await voice("mikhail");await drain();
  assert.match(await p.locator(".dialogue-portrait img").getAttribute("src"),/mikhail-portrait.png$/);
  await p.screenshot({path:"/tmp/bakery-mikhail-gift.png",fullPage:true});
  await choose("여기 선물이야.");await drain();assert.equal(await p.evaluate(()=>window.clinicGame.state.clinic.gift),"delivered");assert.equal(await p.evaluate(()=>window.clinicGame.state.quests.clinicDelivery),"done");await saved();
  await p.evaluate(()=>Object.assign(window.clinicGame.state,{x:166,y:310}));await enter();
  await speak("catherine");await drain();await choose("네, 갖다줬어요.");await drain();await choose("감사히 잘 먹겠대요.");await drain();
  assert.equal(await p.evaluate(()=>window.clinicGame.state.quests.clinicGift),"done");await saved();
  await speak("catherine");await drain();await choose("고양이인가요, 아님 강아지인가요?");await drain();await choose("안아주세요!");await drain();await choose("쓰다듬는다.");await drain();await p.keyboard.press("Escape");
  // Interior windows change at dusk/night; the ordinary day remains unaltered.
  const lights=await p.evaluate(async()=>{
    const {drawSceneLighting}=await import("./src/render/lighting.js");
    const r=window.clinicRenderer,canvas=document.createElement("canvas");canvas.width=960;canvas.height=576;
    const c=canvas.getContext("2d"),out=[];
    for(const minutes of [720,1020,1140]){
      c.drawImage(r.bg.clinic,0,0,960,576);drawSceneLighting({c,lighting:r.lighting},"clinic",minutes);
      const a=c.getImageData(20,70,35,35).data;let sum=0;for(let i=0;i<a.length;i+=4)sum+=a[i]+a[i+1]+a[i+2];out.push(sum);
    }return out;
  });assert.ok(lights[2]<lights[0]);assert.notEqual(lights[0],lights[1]);
  // Closing ejects to the right exterior and Sunday staff stand outside.
  await p.evaluate(()=>window.clinicGame.state.minutes=1080);
  await p.waitForFunction(()=>window.clinicGame.state.scene==="downtown");
  await p.evaluate(()=>Object.assign(window.clinicGame.state,{day:7,minutes:720,x:166,y:310}));await p.keyboard.press("e");
  assert.equal(await p.evaluate(()=>window.clinicGame.state.scene),"downtown");assert.match(await p.locator("#toast").textContent(),/일요일/);
  assert.equal(await p.evaluate(async()=>{const {residents}=await import("./src/npc.js");return residents(window.clinicGame).filter(n=>n.workplace==="clinic").length;}),3);
  await p.evaluate(()=>Object.assign(window.clinicGame.state,{x:900,y:310}));
  await p.keyboard.down("a");try{await p.waitForFunction(()=>window.clinicGame.state.scene==="city",null,{timeout:15000});}finally{await p.keyboard.up("a");}
  // Actual four visitor arrivals use their SD at the counter and normal portraits/voices.
  for(const key of ["konstanze","valeria","catherine","mikhail"]){
    await p.evaluate(async key=>{
      const g=window.clinicGame,{tickShop}=await import("./src/shop.js");Object.assign(g.state,{scene:"bakery",minutes:720,day:7});Object.assign(g.state.shop,{open:true,customer:null,elapsed:0,visitorQueue:[key],lastVisitor:null});
      tickShop(g.state,12,g.data.customers,()=>.4);tickShop(g.state,1.2,g.data.customers,()=>.4);
    },key);
    await p.locator(".spot-customerTalk").waitFor({state:"visible"});
    assert.ok(await p.evaluate(key=>window.clinicRenderer.counterArt.get(key).src.endsWith(`${key}-sd.png`),key));
    await choose("손님과 대화하기");await voice(key);await drain();
    assert.match(await p.locator(".dialogue-portrait img").getAttribute("src"),new RegExp(`${key}-portrait.png$`));
    await p.evaluate(()=>{const s=window.clinicGame.state,c=s.shop.customer;s.display[c.bread]=c.quantity;});
    await choose("네, 금방 갖다 드릴게요!");await drain();await choose("대화 마치기");
    assert.equal(await p.evaluate(()=>window.clinicGame.state.shop.customer),null);
  }
  // Mobile clinic buttons and outdoor Mikhail conversation fit without horizontal overflow.
  await p.setViewportSize({width:390,height:844});
  await p.evaluate(()=>Object.assign(window.clinicGame.state,{scene:"clinic",day:1,minutes:720}));
  await speak("catherine");await drain();await choose("안아주세요!");await drain();
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await p.screenshot({path:"/tmp/bakery-clinic-mobile.png",fullPage:true});await p.keyboard.press("Escape");
  await choose("← 번화가로 나가기");await p.evaluate(()=>Object.assign(window.clinicGame.state,{x:740,y:320}));await p.locator('[data-touch-interact]').click();await drain();await choose("눈은 뭐 하다 다쳤니?");await drain();
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);
  console.log("PASS: walk-in clinic/exit, three embedded staff and four matching portraits/decoded voice sources, all quests and missing-stock/ESC guards, wrapped-gift inventory/journal, intermediate saves/reload, Mikhail replacement/delivery/report, post-quest branches, closing/Sunday staff, four bakery SD/portrait/voice sales, mobile controls/layout.");
} finally {await browser?.close();await new Promise(r=>server.close(r));}
