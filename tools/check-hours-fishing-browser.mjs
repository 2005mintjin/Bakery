// Isolated host/browser storage; no personal save files are touched.
import assert from "node:assert/strict";
import http from "node:http";
import { buildWeb } from "./build-web.mjs";
import { staticFiles } from "../server/staticFiles.js";
import { fresh } from "../src/saveSystem.js";
import { webSavePrefix } from "../src/edition.js";
import { advanceDialogue } from "./browser-dialogue.mjs";
const {chromium}=await import(process.env.BAKERY_PLAYWRIGHT_MODULE||"playwright");
const root=await buildWeb(),server=http.createServer(async(req,res)=>{
  try {const path=decodeURIComponent(new URL(req.url,"http://localhost").pathname);if(!path.startsWith("/Bakery/"))throw Error("path");await staticFiles(req,res,path.slice(7),root);}
  catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,"127.0.0.1",r));let browser;
try{
  browser=await chromium.launch({executablePath:process.env.BAKERY_BROWSER,args:["--no-sandbox"]});
  const p=await browser.newPage({viewport:{width:1366,height:1000}}),errors=[];
  p.on("pageerror",e=>errors.push(e.message));
  const state=Object.assign(fresh(),{scene:"city",x:728,y:268,minutes:720});
  state.tutorial.bakeryIntroSeen=true;state.items.fish=5;state.fishStock={large:1,medium:1,small:1};
  await p.addInitScript(({state,key})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));},{state,key:webSavePrefix+"/Bakery/1"});
  const choose=name=>p.getByRole("button",{name,exact:true}).click(),drain=()=>advanceDialogue(p,30);
  async function start(){
    await p.goto(`http://127.0.0.1:${server.address().port}/Bakery/`);
    await p.getByRole("button",{name:/^1번 ·/}).waitFor();
    await p.evaluate(async()=>{
      const {UI}=await import("./src/ui.js"),{Renderer}=await import("./src/renderer.js");
      const update=UI.prototype.update,draw=Renderer.prototype.draw;
      UI.prototype.update=function(...args){window.hoursGame=this.g;return update.apply(this,args);};
      Renderer.prototype.draw=function(...args){window.hoursRenderer=this;return draw.apply(this,args);};
    });
    await p.getByRole("button",{name:/^1번 ·/}).click();await p.locator("#overlay").waitFor({state:"hidden"});
    await p.waitForFunction(()=>window.hoursGame?.started);
  }
  await start();await p.keyboard.press("e");
  await p.waitForFunction(()=>window.hoursGame.state.scene==="store");
  await choose("잡화점 직원과 대화");await drain();
  const font=await p.locator("#typed-dialogue").evaluate(el=>({family:getComputedStyle(el).fontFamily,size:getComputedStyle(el).fontSize}));
  assert.match(font.family,/sans-serif/);assert.equal(font.size,"22px");
  await p.screenshot({path:"/tmp/bakery-readable-dialogue.png",fullPage:true});
  await choose("잡은 생선을 팔고 싶어요.");await drain();
  const before=await p.evaluate(()=>window.hoursGame.state.money);
  for(const [name,price] of [["대형",24],["중형",12],["소형",6]])await choose(`${name} 생선 1마리 판매 · ${price}G`);
  assert.equal(await p.evaluate(()=>window.hoursGame.state.money),before+42);
  assert.equal(await p.evaluate(()=>window.hoursGame.state.items.fish),2);
  assert.equal(await p.evaluate(()=>window.hoursGame.state.dailyLedger.fishSales),42);
  await p.screenshot({path:"/tmp/bakery-fish-market.png",fullPage:true});
  await p.keyboard.press("Escape");await choose("← 소도시로 나가기");
  // Closing a facility ejects a player already inside, and closes its door.
  await p.evaluate(()=>Object.assign(window.hoursGame.state,{scene:"store",minutes:1200}));
  await p.waitForFunction(()=>window.hoursGame.state.scene==="city");
  assert.match(await p.locator("#toast").textContent(),/영업시간/);
  await p.keyboard.press("e");assert.equal(await p.evaluate(()=>window.hoursGame.state.scene),"city");
  const evening=await p.evaluate(async()=>{
    const {residents}=await import("./src/npc.js");return residents(window.hoursGame).filter(n=>n.offDuty).map(n=>n.name);
  });
  assert.ok(evening.includes("아리엔"));assert.ok(evening.includes("로터스"));
  // Sunday is a real calendar weekday, survives saving and keeps employees outside.
  await p.evaluate(()=>Object.assign(window.hoursGame.state,{day:7,minutes:720,x:180,y:310}));
  await p.waitForFunction(()=>document.querySelector("[data-day]").textContent.includes("일요일"));
  await p.keyboard.press("e");await drain();assert.equal(await p.locator("#dialogue-speaker").textContent(),"아리엔");
  if(await p.locator("#overlay").isVisible())await p.keyboard.press("Escape");
  await p.keyboard.press("Escape");await choose("저장");
  await p.locator("#overlay").waitFor({state:"hidden"});await start();
  assert.equal(await p.evaluate(()=>window.hoursGame.state.day),7);
  await p.screenshot({path:"/tmp/bakery-sunday-off-duty.png",fullPage:true});
  await p.evaluate(async()=>{
    const g=window.hoursGame,{tickShop}=await import("./src/shop.js");
    Object.assign(g.state,{day:1,minutes:720});Object.assign(g.state.shop,{open:true,customer:null,elapsed:0,visitorQueue:["adel","barista"]});
    if(tickShop(g.state,12,g.data.customers,()=>0))throw Error("Working staff left work");
    if(g.state.shop.visitorQueue.length!==2)throw Error("Deferred visitors were removed");
    g.state.minutes=1080;
    if(!tickShop(g.state,1,g.data.customers,()=>0)||g.state.shop.customer.portrait!=="adel")throw Error("Off duty arrival missing");
    g.state.shop.open=false;g.state.shop.customer=null;
    Object.assign(g.state,{scene:"pond",x:591,y:287,day:1,minutes:720});g.ui.show("fishing");
  });
  for(const [roll,size,label] of [[.1,"large","대형"],[.4,"medium","중형"],[.9,"small","소형"]]){
    await p.evaluate(roll=>{window.oldFishRandom=Math.random;Math.random=()=>roll;},roll);
    await choose("낚싯대 던지기");
    await p.evaluate(()=>{Math.random=window.oldFishRandom;});
    await p.waitForFunction(()=>window.hoursGame.state.fishing?.phase==="bite");
    await choose("낚아채기 · Space");
    assert.equal(await p.evaluate(()=>window.hoursGame.state.fishing.phase),"caught");
    assert.equal(await p.evaluate(size=>window.hoursGame.state.fishStock[size],size),1);
    assert.match(await p.locator('#overlay [role="status"]').textContent(),new RegExp(label+" 생선"));
  }
  await p.keyboard.press("Escape");
  await p.evaluate(async()=>{
    const {spend}=await import("./src/inventory.js"),g=window.hoursGame;
    if(!spend(g.state,{fish:2})||g.state.fishStock.large!==1)throw Error("Legacy fish not consumed first");
    g.ui.inventoryItem="fish";g.ui.show("inventory");
  });
  assert.match(await p.locator(".item-detail").textContent(),/대형 1마리/);
  await p.keyboard.press("Escape");await p.keyboard.press("Escape");await choose("저장");
  await p.locator("#overlay").waitFor({state:"hidden"});await start();
  assert.deepEqual(await p.evaluate(()=>window.hoursGame.state.fishStock),{large:1,medium:1,small:1});
  // Sample all backgrounds directly, without pretending a closed facility is open.
  const lighting=await p.evaluate(()=>{
    const r=window.hoursRenderer,g=window.hoursGame,old=r.c,results={};
    const canvas=document.createElement("canvas");canvas.width=2880;canvas.height=1728;
    const c=canvas.getContext("2d");c.setTransform(3,0,0,3,0,0);c.imageSmoothingEnabled=false;
    try{
      r.c=c;
      for(const scene of ["downtown","downtownEast","bakery","bakeryKitchen","store","hall","workshop","post","cafe"]){
        results[scene]=[];
        for(const minutes of [720,1050,1140]){
          r.draw({state:{...g.state,scene,minutes},data:g.data},false,0);
          const points=r.lighting[scene].windows?.[0];
          let x=440,y=240,w=80,h=50;
          if(points){x=Math.min(...points.map(p=>p[0]))+2;y=Math.min(...points.map(p=>p[1]))+2;w=Math.max(2,Math.max(...points.map(p=>p[0]))-x-2);h=Math.max(2,Math.max(...points.map(p=>p[1]))-y-2);}
          const pixels=c.getImageData(x*3,y*3,w*3,h*3).data;let sum=0,red=0,blue=0;
          for(let i=0;i<pixels.length;i+=4){sum+=pixels[i]+pixels[i+1]+pixels[i+2];red+=pixels[i];blue+=pixels[i+2];}
          results[scene].push({light:sum/(pixels.length/4),warm:red/(blue||1)});
        }
      }
    }finally{r.c=old;}
    return results;
  });
  for(const [scene,[day,sunset,night]] of Object.entries(lighting)){
    assert.ok(night.light<day.light,scene+" does not darken");
    assert.ok(sunset.warm>day.warm,scene+" sunset not warmer");
  }
  await p.setViewportSize({width:390,height:844});
  await p.evaluate(()=>Object.assign(window.hoursGame.state,{scene:"city",day:7,minutes:720,x:180,y:310}));
  await p.locator("[data-touch-interact]").click();await drain();
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);
  console.log("PASS: opening/closing and Sunday staff outdoors, door closure/ejection, deferred staff visitors, three real catches and size UI, priced store sales, legacy recipe use, save/reload, sunset/night in all new maps/interiors, readable 22px PC dialogue and mobile NPC interaction.");
}finally{await browser?.close();await new Promise(r=>server.close(r));}
