// Isolated static host/browser save; no personal slots are used.
import assert from "node:assert/strict";
import http from "node:http";
import {buildWeb} from "./build-web.mjs";
import {staticFiles} from "../server/staticFiles.js";
import {fresh} from "../src/saveSystem.js";
import {webSavePrefix} from "../src/edition.js";
import {advanceDialogue} from "./browser-dialogue.mjs";
const {chromium}=await import(process.env.BAKERY_PLAYWRIGHT_MODULE||"playwright");
const root=await buildWeb(),server=http.createServer(async(req,res)=>{
 try{const path=decodeURIComponent(new URL(req.url,"http://localhost").pathname);if(!path.startsWith("/Bakery/"))throw Error("path");await staticFiles(req,res,path.slice(7),root);}catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,"127.0.0.1",r));let browser;
try{
 browser=await chromium.launch({executablePath:process.env.BAKERY_BROWSER,args:["--no-sandbox"]});
 const context=await browser.newContext({viewport:{width:1366,height:1000},hasTouch:true});
 const p=await context.newPage(),errors=[];p.on("pageerror",e=>errors.push(e.message));
 const state=Object.assign(fresh(),{scene:"downtownEast",day:7,minutes:720,x:480,y:310});state.tutorial.bakeryIntroSeen=true;
 await p.addInitScript(({state,key})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));},{state,key:webSavePrefix+"/Bakery/1"});
 const choose=name=>p.getByRole("button",{name,exact:true}).click(),drain=()=>advanceDialogue(p,30);
 async function start(){
  await p.goto(`http://127.0.0.1:${server.address().port}/Bakery/`);await p.getByRole("button",{name:/^1번 ·/}).waitFor();
  await p.evaluate(async()=>{
   const {UI}=await import("./src/ui.js"),{Renderer}=await import("./src/renderer.js");const update=UI.prototype.update,draw=Renderer.prototype.draw;
   UI.prototype.update=function(...args){window.parkGame=this.g;return update.apply(this,args);};
   Renderer.prototype.draw=function(...args){window.parkRenderer=this;return draw.apply(this,args);};
  });
  await p.getByRole("button",{name:/^1번 ·/}).click();await p.locator("#overlay").waitFor({state:"hidden"});await p.waitForFunction(()=>window.parkGame?.started);
 }
 async function walk(key,scene){await p.keyboard.down(key);try{await p.waitForFunction(scene=>window.parkGame.state.scene===scene,scene,{timeout:15000});}finally{await p.keyboard.up(key);}}
 await start();
 // Reproduce the actual report: start in the middle, then simply walk west.
 await walk("a","downtown");
 assert.ok(await p.evaluate(()=>window.parkGame.state.x>880));
 await walk("d","downtownEast");
 assert.ok(await p.evaluate(()=>window.parkGame.state.x>=160));
 await walk("d","park");
 assert.ok(await p.evaluate(()=>window.parkRenderer.scenery.get(window.parkGame.data.worldMaps.park.asset).src.endsWith("park.png")));
 await p.evaluate(()=>Object.assign(window.parkGame.state,{x:310,y:310}));
 await p.keyboard.press("Escape");await choose("저장");await p.locator("#overlay").waitFor({state:"hidden"});await start();
 assert.equal(await p.evaluate(()=>window.parkGame.state.scene),"park");
 assert.equal(await p.evaluate(()=>window.parkGame.state.x),310);
 await p.screenshot({path:"/tmp/bakery-park-day.png",fullPage:true});
 const npcs=await p.evaluate(()=>window.parkGame.data.downtown.park.residents);
 for(const npc of npcs){
  await p.evaluate(npc=>{
   const g=window.parkGame,blocks=g.data.worldMaps.park.obstacles;
   const point=[[npc.x,npc.y+40],[npc.x+40,npc.y],[npc.x-40,npc.y]].find(([x,y])=>!blocks.some(b=>x+10>b.x&&x-10<b.x+b.w&&y+6>b.y&&y-8<b.y+b.h));
   if(!point)throw Error("No safe NPC approach");Object.assign(g.state,{x:point[0],y:point[1]});
  },npc);
  await p.keyboard.press("e");assert.equal(await p.locator("#dialogue-speaker").textContent(),npc.name);await drain();
 }
 async function light(minutes){return p.evaluate(async minutes=>{
  Object.assign(window.parkGame.state,{x:310,y:310,minutes});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const c=document.querySelector("#world"),a=c.getContext("2d").getImageData(0,0,c.width,c.height).data;let sum=0;
  for(let i=0;i<a.length;i+=4)sum+=a[i]+a[i+1]+a[i+2];return sum/(a.length/4);
 },minutes);}
 const day=await light(720),night=await light(1140);assert.ok(night<day);
 await p.screenshot({path:"/tmp/bakery-park-night.png",fullPage:true});
 await p.evaluate(()=>window.parkGame.state.minutes=720);
 await walk("a","downtownEast");await walk("a","downtown");await walk("a","city");await walk("a","town");
 // Regular conversation retains the normal portrait, with the smaller same-family text.
 await p.evaluate(()=>Object.assign(window.parkGame.state,{scene:"city",day:1,minutes:720,x:400,y:300}));
 await p.keyboard.press("e");await drain();
 const font=await p.locator("#typed-dialogue").evaluate(e=>({size:getComputedStyle(e).fontSize,family:getComputedStyle(e).fontFamily}));
 assert.equal(font.size,"20px");assert.match(font.family,/sans-serif/);
 assert.match(await p.locator(".dialogue-portrait img").getAttribute("src"),/charlotte-portrait.png$/);
 await choose("연주를 들어본다.");await drain();
 await p.waitForFunction(()=>document.querySelector("#charlotte-performance")?.currentTime>0);
 assert.match(await p.locator(".portrait-scene img").getAttribute("src"),/charlotte-performance.png$/);
 await p.screenshot({path:"/tmp/bakery-charlotte-new-performance.png",fullPage:true});
 await p.keyboard.press("Space");await drain();
 await p.keyboard.press("Escape");await p.setViewportSize({width:390,height:844});
 await p.locator("[data-touch-interact]").click();await drain();
 assert.equal(await p.locator("#typed-dialogue").evaluate(e=>getComputedStyle(e).fontSize),"18px");
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await p.keyboard.press("Escape");
 // Actual touch leaves the square from its central path, with all Sunday staff present.
 await p.evaluate(()=>Object.assign(window.parkGame.state,{scene:"downtownEast",x:480,y:310,day:7,minutes:720}));
 const left=await p.locator('[data-move="a"]').boundingBox();const cdp=await context.newCDPSession(p);
 await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x:left.x+left.width/2,y:left.y+left.height/2,id:1}]});
 await p.waitForFunction(()=>window.parkGame.state.scene==="downtown");
 await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
 assert.deepEqual(errors,[]);
 console.log("PASS: return from the pub square center by keyboard/touch with Sunday NPCs, safe two-way entrances, park arrival/NPCs/save reload/night lights, complete return to city, same-font 20px PC/18px mobile text, separate new performance artwork and Space skip.");
}finally{await browser?.close();await new Promise(r=>server.close(r));}
