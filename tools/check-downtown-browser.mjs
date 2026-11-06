// New outdoor maps on an isolated host/browser save; never touches personal saves.
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
    const path = decodeURIComponent(new URL(req.url,"http://localhost").pathname);
    if (!path.startsWith("/Bakery/")) throw Error("path");
    await staticFiles(req,res,path.slice("/Bakery".length),root);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0,"127.0.0.1",r));
let browser;
try {
  browser = await chromium.launch({executablePath:process.env.BAKERY_BROWSER,args:["--no-sandbox"]});
  const context = await browser.newContext({ viewport:{width:1366,height:1000}, hasTouch:true });
  const p = await context.newPage(), errors=[];
  p.on("pageerror",(e)=>errors.push(e.message));
  const initial = Object.assign(fresh(),{scene:"city",x:870,y:310});
  initial.tutorial.bakeryIntroSeen=true;
  await p.addInitScript(({state,key})=>{
    if (!localStorage.getItem(key)) localStorage.setItem(key,JSON.stringify(state));
  },{state:initial,key:webSavePrefix+"/Bakery/1"});
  const choose = (name)=>p.getByRole("button",{name,exact:true}).click();
  async function start() {
    await p.goto(`http://127.0.0.1:${server.address().port}/Bakery/`);
    await p.getByRole("button",{name:/^1번 ·/}).waitFor();
    await p.evaluate(async()=>{
      const {UI}=await import("./src/ui.js"),{Renderer}=await import("./src/renderer.js");
      const update=UI.prototype.update,draw=Renderer.prototype.draw;
      UI.prototype.update=function(...args){window.downtownGame=this.g;return update.apply(this,args);};
      Renderer.prototype.draw=function(...args){window.downtownRenderer=this;return draw.apply(this,args);};
    });
    await p.getByRole("button",{name:/^1번 ·/}).click();
    await p.locator("#overlay").waitFor({state:"hidden"});
    await p.waitForFunction(()=>window.downtownGame?.started);
  }
  async function walk(key,scene) {
    await p.keyboard.down(key);
    try { await p.waitForFunction((scene)=>window.downtownGame.state.scene===scene,scene,{timeout:15000}); }
    finally { await p.keyboard.up(key); }
  }
  async function saveReload(scene) {
    await p.keyboard.press("Escape"); await choose("저장");
    await p.locator("#overlay").waitFor({state:"hidden"});
    const before=await p.evaluate(()=>{
      const {x,y,money,items}=window.downtownGame.state;return {x,y,money,items};
    });
    await start();
    const after=await p.evaluate(()=>{
      const {x,y,money,items}=window.downtownGame.state;return {x,y,money,items};
    });
    assert.deepEqual(after,before);
    assert.equal(await p.evaluate(()=>window.downtownGame.state.scene),scene);
  }
  await start();
  await walk("d","downtown");
  await p.waitForFunction(()=>document.querySelector("#location").textContent.includes("병원"));
  assert.ok(await p.evaluate(()=>window.downtownRenderer.scenery.get(window.downtownGame.data.worldMaps.downtown.asset).src.endsWith("downtown-services.png")));
  assert.equal(await p.locator("#interior-actions").isVisible(),false);
  await saveReload("downtown");
  // Walk toward the top row; the building footprint stops the player on the pavement.
  await p.evaluate(()=>Object.assign(window.downtownGame.state,{x:480,y:310,minutes:720}));
  await p.keyboard.down("w"); await p.waitForTimeout(700); await p.keyboard.up("w");
  assert.ok(await p.evaluate(()=>window.downtownGame.state.y>=277));
  await p.screenshot({path:"/tmp/bakery-downtown-services.png",fullPage:true});
  // Talk to each new NPC using real interaction, with the right generic portrait.
  for (const scene of ["downtown","downtownEast"]) {
    const list=await p.evaluate((scene)=>window.downtownGame.data.downtown[scene].residents,scene);
    for (const npc of list) {
      await p.evaluate(({scene,npc})=>{
        const blocks=window.downtownGame.data.worldMaps[scene].obstacles;
        const options=[[npc.x,npc.y+40],[npc.x+40,npc.y],[npc.x-40,npc.y],[npc.x,npc.y-40]];
        const point=options.find(([x,y])=>!blocks.some((b)=>x+10>b.x&&x-10<b.x+b.w&&y+6>b.y&&y-8<b.y+b.h));
        if (!point) throw Error("No safe NPC approach: "+npc.name);
        Object.assign(window.downtownGame.state,{scene,x:point[0],y:point[1]});
      },{scene,npc});
      await p.keyboard.press("e");
      await p.locator("#dialogue-speaker").waitFor();
      assert.equal(await p.locator("#dialogue-speaker").textContent(),npc.name);
      assert.equal(await p.locator(".dialogue-portrait img").getAttribute("src"),npc.portraitAsset);
      await advanceDialogue(p,12);
      if (npc.story === "mikhail") await choose("..됐어.");
      await p.locator("#overlay").waitFor({state:"hidden"});
    }
  }
  // Cross the east connection from the service street through normal movement.
  await p.evaluate(()=>Object.assign(window.downtownGame.state,{scene:"downtown",x:860,y:310}));
  await walk("d","downtownEast");
  assert.ok(await p.evaluate(()=>window.downtownRenderer.scenery.get(window.downtownGame.data.worldMaps.downtownEast.asset).src.endsWith("downtown-square.png")));
  await saveReload("downtownEast");
  await p.evaluate(()=>Object.assign(window.downtownGame.state,{x:470,y:310,minutes:720}));
  await p.keyboard.down("s");await p.waitForTimeout(700);await p.keyboard.up("s");
  assert.ok(await p.evaluate(()=>window.downtownGame.state.y<324));
  async function brightness(minutes) {
    return p.evaluate(async(minutes)=>{
      window.downtownGame.state.minutes=minutes;
      await new Promise((resolve)=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const c=document.querySelector("#world"),pixels=c.getContext("2d").getImageData(0,0,c.width,c.height).data;
      let sum=0;for(let i=0;i<pixels.length;i+=4)sum+=pixels[i]+pixels[i+1]+pixels[i+2];
      return sum/(pixels.length/4);
    },minutes);
  }
  const day=await brightness(720),night=await brightness(1140);
  assert.ok(night<day);
  await p.screenshot({path:"/tmp/bakery-downtown-square-night.png",fullPage:true});
  await p.setViewportSize({width:390,height:844});
  await p.evaluate(()=>Object.assign(window.downtownGame.state,{x:185,y:310,minutes:720}));
  const left=await p.locator('[data-move="a"]').boundingBox();assert.ok(left);
  const cdp=await context.newCDPSession(p);
  await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x:left.x+left.width/2,y:left.y+left.height/2,id:1}]});
  await p.waitForFunction(()=>window.downtownGame.state.scene==="downtown");
  await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
  await p.screenshot({path:"/tmp/bakery-downtown-mobile.png",fullPage:true});
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  // The return road continues all the way to the original shopping district.
  await walk("a","city");
  assert.equal(await p.locator("#interior-actions").isVisible(),false);
  assert.deepEqual(errors,[]);
  console.log("PASS: correct two-map order, real keyboard/touch round trips, original backgrounds, all six NPC conversations/portraits, building and fence collision, save/reload in both new scenes, night lighting and 390px layout; no JS errors; clinic interior is covered by check-clinic-browser.");
} finally {
  await browser?.close(); await new Promise((r)=>server.close(r));
}
