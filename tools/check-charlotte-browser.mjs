// Isolated static host and browser saves; never touches personal save files.
import assert from "node:assert/strict";
import http from "node:http";
import { buildWeb } from "./build-web.mjs";
import { staticFiles } from "../server/staticFiles.js";
import { fresh } from "../src/saveSystem.js";
import { webSavePrefix } from "../src/edition.js";
import { advanceDialogue } from "./browser-dialogue.mjs";
const {chromium}=await import(process.env.BAKERY_PLAYWRIGHT_MODULE||"playwright");
const root=await buildWeb(),server=http.createServer(async(req,res)=>{
  try{const path=decodeURIComponent(new URL(req.url,"http://localhost").pathname);if(!path.startsWith("/Bakery/"))throw Error("path");await staticFiles(req,res,path.slice(7),root);}catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,"127.0.0.1",r));let browser;
try{
  browser=await chromium.launch({executablePath:process.env.BAKERY_BROWSER,args:["--no-sandbox"]});
  const p=await browser.newPage({viewport:{width:1366,height:1000}}),errors=[];
  p.on("pageerror",e=>errors.push(e.message));
  const state=Object.assign(fresh(),{scene:"city",x:330,y:310,minutes:720});state.tutorial.bakeryIntroSeen=true;
  await p.addInitScript(({state,key})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));},{state,key:webSavePrefix+"/Bakery/1"});
  const choose=name=>p.getByRole("button",{name,exact:true}).click(),drain=()=>advanceDialogue(p,30);
  async function start(){
    await p.goto(`http://127.0.0.1:${server.address().port}/Bakery/`);
    await p.getByRole("button",{name:/^1번 ·/}).waitFor();
    await p.evaluate(async()=>{
      const {UI}=await import("./src/ui.js"),{Renderer}=await import("./src/renderer.js");
      const update=UI.prototype.update,draw=Renderer.prototype.draw;
      UI.prototype.update=function(...args){window.charlotteGame=this.g;return update.apply(this,args);};
      Renderer.prototype.draw=function(...args){window.charlotteRenderer=this;return draw.apply(this,args);};
    });
    await p.getByRole("button",{name:/^1번 ·/}).click();await p.locator("#overlay").waitFor({state:"hidden"});
    await p.waitForFunction(()=>window.charlotteGame?.started);
  }
  await start();
  const animation=await p.evaluate(async()=>{
    const {drawResident}=await import("./src/residentArt.js");
    const g=window.charlotteGame,r=window.charlotteRenderer,npc=g.data.city.residents.find(n=>n.id==="reader");
    const canvas=document.createElement("canvas");canvas.width=200;canvas.height=200;const c=canvas.getContext("2d");
    const painter={c,residentArt:r.residentArt,oval(){}};const rows=[];
    for(let i=0;i<6;i++){
      c.clearRect(0,0,200,200);drawResident(painter,{...npc,x:100,y:160},(i*170+10)/1000);
      const pixels=c.getImageData(0,0,200,200).data;let hash=2166136261,minY=200,maxY=0;
      for(let k=0;k<pixels.length;k++){hash=Math.imul(hash^pixels[k],16777619);if(k%4===3&&pixels[k]>128){minY=Math.min(minY,Math.floor(k/4/200));maxY=Math.max(maxY,Math.floor(k/4/200));}}
      rows.push({hash,minY,maxY});
    }
    return {name:npc.name,rows,source:npc.spriteAnimation.sourceAsset};
  });
  assert.equal(animation.name,"샬롯");assert.match(animation.source,/\.gif$/);
  assert.ok(new Set(animation.rows.map(r=>r.hash)).size>=5);
  assert.ok(Math.max(...animation.rows.map(r=>r.maxY))-Math.min(...animation.rows.map(r=>r.maxY))<=1);
  await p.screenshot({path:"/tmp/bakery-charlotte-street.png",fullPage:true});
  async function talk(){await p.keyboard.press("e");await drain();assert.equal(await p.locator("#dialogue-speaker").textContent(),"샬롯");}
  await talk();
  for(const choice of ["꼬리 만져봐도 되나요?","기타를 연주해도 될 거 같은데요."]){await choose(choice);await drain();}
  async function listen(){
    await choose("연주를 들어본다.");await drain();
    await p.waitForFunction(()=>{const a=document.querySelector("#charlotte-performance");return a&&!a.paused&&a.currentTime>0&&a.duration>60;});
    assert.equal(await p.evaluate(()=>window.charlotteGame.music.audio.paused),true);
    assert.equal(await p.evaluate(()=>window.charlotteGame.music.performanceActive),true);
  }
  await listen();
  await p.evaluate(()=>window.charlotteGame.music.setSuspended(true));
  await p.evaluate(()=>window.charlotteGame.music.setSuspended(false));
  assert.equal(await p.evaluate(()=>window.charlotteGame.music.audio.paused),true);
  await p.screenshot({path:"/tmp/bakery-charlotte-performance.png",fullPage:true});
  await p.keyboard.press("Space");await drain();await choose("아주 좋은 연주네요.");await drain();
  assert.equal(await p.locator("#charlotte-performance").count(),0);
  await p.waitForFunction(()=>!window.charlotteGame.music.audio.paused);
  // Natural completion of the actual MP3 follows the same feedback path.
  await listen();await p.evaluate(()=>{const a=document.querySelector("#charlotte-performance");a.currentTime=a.duration-.15;});
  await p.locator("#charlotte-performance").waitFor({state:"detached"});await drain();
  await choose("다른 곡은 없나요?");await drain();
  // ESC cancels, cleans audio and returns background music without advancing dialogue.
  await listen();await p.keyboard.press("Escape");
  assert.equal(await p.locator("#charlotte-performance").count(),0);
  await p.waitForFunction(()=>!window.charlotteGame.music.audio.paused);
  assert.equal(await p.locator("#overlay").isVisible(),false);
  // The corrected doorway is reached on foot; the old wall location no longer enters.
  await p.evaluate(()=>Object.assign(window.charlotteGame.state,{x:750,y:535,minutes:720}));
  await p.keyboard.press("e");assert.equal(await p.evaluate(()=>window.charlotteGame.state.scene),"city");
  await p.evaluate(()=>Object.assign(window.charlotteGame.state,{x:805,y:540}));
  await p.screenshot({path:"/tmp/bakery-workshop-door-corrected.png",fullPage:true});
  await p.keyboard.down("w");try{await p.waitForFunction(()=>window.charlotteGame.state.scene==="workshop");}finally{await p.keyboard.up("w");}
  await choose("← 소도시로 나가기");assert.equal(await p.evaluate(()=>window.charlotteGame.state.x),805);
  // Real arrival uses her static SD at the counter and the full portrait in dialogue.
  await p.evaluate(async()=>{
    const g=window.charlotteGame,{tickShop}=await import("./src/shop.js");
    Object.assign(g.state,{scene:"bakery",day:7,minutes:720});
    Object.assign(g.state.shop,{open:true,customer:null,elapsed:0,visitorQueue:["charlotte"]});
    tickShop(g.state,12,g.data.customers,()=>.4);tickShop(g.state,1.2,g.data.customers,()=>.4);
  });
  await p.locator(".spot-customerTalk").waitFor({state:"visible"});
  assert.ok(await p.evaluate(()=>window.charlotteRenderer.counterArt.get("charlotte").src.endsWith("charlotte-sd.png")));
  await p.keyboard.press("Escape");await choose("저장");await p.locator("#overlay").waitFor({state:"hidden"});await start();
  assert.equal(await p.evaluate(()=>window.charlotteGame.state.shop.customer.portrait),"charlotte");
  await choose("손님과 대화하기");
  assert.match(await p.locator(".dialogue-portrait img").getAttribute("src"),/charlotte-portrait.png$/);
  await p.waitForFunction(()=>window.charlotteGame.voices.buffers.has("charlotte"));await drain();
  assert.match(await p.locator("#typed-dialogue").textContent(),/연주/);
  await p.evaluate(()=>{const s=window.charlotteGame.state;s.display[s.shop.customer.bread]=s.shop.customer.quantity;});
  await choose("네, 금방 갖다 드릴게요!");await drain();await choose("대화 마치기");
  assert.equal(await p.evaluate(()=>window.charlotteGame.state.shop.customer),null);
  await p.setViewportSize({width:390,height:844});
  await p.evaluate(()=>Object.assign(window.charlotteGame.state,{scene:"city",x:330,y:310,day:1,minutes:720}));
  await p.locator("[data-touch-interact]").click();await drain();await listen();
  await choose("연주 건너뛰기 · Space");await drain();await choose("별로에요.");await drain();
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await p.screenshot({path:"/tmp/bakery-charlotte-mobile.png",fullPage:true});
  assert.deepEqual(errors,[]);
  console.log("PASS: GIF-derived six-frame motion and stable feet, all original dialogue, real performance MP3 playback/natural end/Space/mobile skip/ESC cleanup/BGM restore, corrected workshop door, Charlotte bakery SD/portrait/voice/order save and sale, mobile layout.");
}finally{await browser?.close();await new Promise(r=>server.close(r));}
