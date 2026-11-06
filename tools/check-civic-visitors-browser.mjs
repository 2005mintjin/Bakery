// Isolated static host and browser saves; never reads personal save files.
import assert from "node:assert/strict";
import http from "node:http";
import { buildWeb } from "./build-web.mjs";
import { staticFiles } from "../server/staticFiles.js";
import { fresh } from "../src/saveSystem.js";
import { webSavePrefix } from "../src/edition.js";
import { advanceDialogue } from "./browser-dialogue.mjs";
const { chromium } = await import(process.env.BAKERY_PLAYWRIGHT_MODULE || "playwright");
const root=await buildWeb();
const server=http.createServer(async(req,res)=>{
  try {
    const path=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
    if(!path.startsWith("/Bakery/"))throw Error("path");
    await staticFiles(req,res,path.slice("/Bakery".length),root);
  } catch { res.writeHead(404);res.end(); }
});
await new Promise(r=>server.listen(0,"127.0.0.1",r));
let browser;
try {
  browser=await chromium.launch({executablePath:process.env.BAKERY_BROWSER,args:["--no-sandbox"]});
  const p=await browser.newPage({viewport:{width:1366,height:1000}}),errors=[];
  p.on("pageerror",e=>errors.push(e.message));
  const initial=Object.assign(fresh(),{scene:"bakery", day:7, minutes:720});initial.tutorial.bakeryIntroSeen=true;
  await p.addInitScript(({state,key})=>{
    if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));
    window.visitorVoiceStarts=[];
    const create=AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource=function(){
      const node=create.call(this),start=node.start;
      node.start=function(...args){window.visitorVoiceStarts.push(this.buffer);return start.apply(this,args);};
      return node;
    };
  },{state:initial,key:webSavePrefix+"/Bakery/1"});
  const choose=name=>p.getByRole("button",{name,exact:true}).click();
  const drain=()=>advanceDialogue(p,20);
  async function start(){
    await p.goto(`http://127.0.0.1:${server.address().port}/Bakery/`);
    await p.getByRole("button",{name:/^1번 ·/}).waitFor();
    await p.evaluate(async()=>{
      const {UI}=await import("./src/ui.js"),{Renderer}=await import("./src/renderer.js");
      const update=UI.prototype.update,draw=Renderer.prototype.draw;
      UI.prototype.update=function(...args){window.visitorGame=this.g;return update.apply(this,args);};
      Renderer.prototype.draw=function(...args){window.visitorRenderer=this;return draw.apply(this,args);};
    });
    await p.getByRole("button",{name:/^1번 ·/}).click();
    await p.locator("#overlay").waitFor({state:"hidden"});
    await p.waitForFunction(()=>window.visitorGame?.started);
  }
  await start();
  for(const key of ["hendel","adel","martin"]){
    const pending=await p.evaluate(async key=>{
      const g=window.visitorGame,{tickShop}=await import("./src/shop.js");
      g.state.shop.open=true;g.state.shop.customer=null;g.state.shop.elapsed=0;
      g.state.shop.visitorQueue=[key,...g.data.customers.filter(c=>c.portrait!==key).map(c=>c.portrait)];g.state.shop.lastVisitor=null;
      tickShop(g.state,12,g.data.customers,()=>.4);
      tickShop(g.state,1.2,g.data.customers,()=>.4);
      return {customer:structuredClone(g.state.shop.customer),queue:[...g.state.shop.visitorQueue],last:g.state.shop.lastVisitor};
    },key);
    await p.locator(".spot-customerTalk").waitFor({state:"visible"});
    assert.equal(pending.customer.portrait,key);
    assert.ok(await p.evaluate(key=>window.visitorRenderer.counterArt.get(key).src.endsWith(`${key}-sd.png`),key));
    // The actual foreground must cover the lower half of every new SD visitor.
    assert.ok(await p.evaluate(()=>{
      const r=window.visitorRenderer,c=r.c.canvas,expected=document.createElement("canvas");
      expected.width=c.width;expected.height=c.height;
      const e=expected.getContext("2d");e.drawImage(r.bg.bakery,0,0);
      const a=r.c.getImageData(1050,1440,750,120).data,b=e.getImageData(1050,1440,750,120).data;
      return a.every((v,i)=>v===b[i]);
    }));
    await p.screenshot({path:`/tmp/bakery-${key}-counter.png`,fullPage:true});
    await p.keyboard.press("Escape");await choose("저장");
    await p.locator("#overlay").waitFor({state:"hidden"});await start();
    assert.deepEqual(await p.evaluate(()=>({customer:window.visitorGame.state.shop.customer,queue:window.visitorGame.state.shop.visitorQueue,last:window.visitorGame.state.shop.lastVisitor})),pending);
    await choose("손님과 대화하기");
    assert.match(await p.locator(".dialogue-portrait img").getAttribute("src"),new RegExp(`${key}-portrait.png$`));
    await p.waitForFunction(key=>{
      const buffer=window.visitorGame.voices.buffers.get(key)?.buffer;
      return buffer&&window.visitorVoiceStarts.some(b=>b===buffer);
    },key);
    await drain();
    const text=await p.locator("#typed-dialogue").textContent();
    assert.ok(text.includes(String(pending.customer.quantity)));
    assert.ok(!text.includes("{bread}"));
    await choose("아직 빵이 준비가 안 됐네요.");
    assert.deepEqual(await p.evaluate(()=>window.visitorGame.state.shop.customer),pending.customer);
    const money=await p.evaluate(()=>{
      const s=window.visitorGame.state,c=s.shop.customer;s.display[c.bread]=c.quantity;return s.money;
    });
    await choose("손님과 대화하기");await drain();await choose("네, 금방 갖다 드릴게요!");
    await drain();
    assert.equal(await p.evaluate(()=>window.visitorGame.state.shop.customer),null);
    assert.ok(await p.evaluate(before=>window.visitorGame.state.money>before,money));
    if(key==="martin"){
      await p.setViewportSize({width:390,height:844});
      assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await p.screenshot({path:"/tmp/bakery-martin-visitor-mobile.png",fullPage:true});
    }
    await choose("대화 마치기");
  }
  const cycles=await p.evaluate(async()=>{
    const g=window.visitorGame,{tickShop}=await import("./src/shop.js"),{validate}=await import("./src/saveSystem.js");
    g.state.shop.visitorQueue=[];g.state.shop.lastVisitor=null;
    let seed=31;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const cycles=[];
    for(let cycle=0;cycle<3;cycle++){
      const ids=[];
      for(let i=0;i<g.data.customers.length;i++){
        const s=g.state;s.shop.open=true;s.shop.customer=null;s.shop.elapsed=0;
        tickShop(s,12,g.data.customers,random);ids.push(s.shop.customer.portrait);
        if(i===4)g.state=validate(structuredClone(s));
      }
      cycles.push(ids);
    }
    g.state.shop.open=false;return cycles;
  });
  for(const ids of cycles){assert.equal(ids.length,14);assert.equal(new Set(ids).size,14);assert.ok(!ids.includes("lotus"));}
  assert.notDeepEqual(cycles[0],cycles[1]);
  assert.notEqual(cycles[0].at(-1),cycles[1][0]);
  assert.deepEqual(errors,[]);
  console.log("PASS: Hendel/Adel/Martin arrival, SD counter/foreground masking, full portrait and real voice, pending-order save/reload, waiting/serving, mobile dialogue, three shuffled cycles without repeats, and Lotus excluded.");
} finally {
  await browser?.close();await new Promise(r=>server.close(r));
}
