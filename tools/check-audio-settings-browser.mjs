// Isolated static host/storage: legacy preferences, real UI and decoded audio sources.
import assert from "node:assert/strict";
import http from "node:http";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { buildWeb } from "./build-web.mjs";
import { staticFiles } from "../server/staticFiles.js";
import { fresh } from "../src/saveSystem.js";
import { webSavePrefix } from "../src/edition.js";
import { advanceDialogue } from "./browser-dialogue.mjs";
const {chromium} = await import(process.env.BAKERY_PLAYWRIGHT_MODULE || "playwright");
const root = await buildWeb();
const server = http.createServer(async(req,res)=>{
  try {
    const path=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
    if(!path.startsWith("/Bakery/"))throw Error("path");
    await staticFiles(req,res,path.slice(7),root);
  } catch {res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,"127.0.0.1",r));
let browser;
try {
  browser=await chromium.launch({executablePath:process.env.BAKERY_BROWSER,args:["--no-sandbox"]});
  const p=await browser.newPage({viewport:{width:1366,height:1000}}), errors=[];
  p.on("pageerror",e=>errors.push(e.message));
  const state=Object.assign(fresh(),{scene:"clinic",minutes:720});state.tutorial.bakeryIntroSeen=true;
  await p.addInitScript(({state,key})=>{
    if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));
    if(!localStorage.getItem("hearth-audio"))localStorage.setItem("hearth-audio",JSON.stringify({volume:.42,muted:false}));
    window.audioSettingsStarts=[];
    const createGain=AudioContext.prototype.createGain, createSource=AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createGain=function(){
      const node=createGain.call(this), ramp=node.gain.linearRampToValueAtTime;node.testRamps=[];
      node.gain.linearRampToValueAtTime=function(value,...args){node.testRamps.push(value);return ramp.call(this,value,...args);};return node;
    };
    AudioContext.prototype.createBufferSource=function(){
      const node=createSource.call(this),connect=node.connect,start=node.start;
      node.connect=function(target,...args){node.testTarget=target;return connect.call(this,target,...args);};
      node.start=function(...args){window.audioSettingsStarts.push({buffer:node.buffer,gain:Math.max(...(node.testTarget?.testRamps||[0]))});return start.apply(this,args);};return node;
    };
  },{state,key:webSavePrefix+"/Bakery/1"});
  const choose=name=>p.getByRole("button",{name,exact:true}).click();
  const drain=()=>advanceDialogue(p,30);
  async function start(){
    await p.goto(`http://127.0.0.1:${server.address().port}/Bakery/`);await p.getByRole("button",{name:/^1번 ·/}).waitFor();
    await p.evaluate(async()=>{
      const {UI}=await import("./src/ui.js"),update=UI.prototype.update;
      UI.prototype.update=function(...args){window.audioSettingsGame=this.g;return update.apply(this,args);};
    });
    await p.getByRole("button",{name:/^1번 ·/}).click();await p.locator("#overlay").waitFor({state:"hidden"});
    await p.waitForFunction(()=>window.audioSettingsGame?.started);
  }
  async function settings(){await p.locator('[data-panel="audio"]:visible').first().click();await p.getByRole("heading",{name:"소리 설정"}).waitFor();}
  async function slider(id,value){await p.locator(`#${id}-volume`).evaluate((el,value)=>{el.value=String(value);el.dispatchEvent(new Event("input",{bubbles:true}));},value);assert.equal(await p.locator(`#${id}-value`).textContent(),value+"%");}
  async function speak(key){await choose(key==="valeria"?"발레리아와 대화 · 의사":"캐서린과 대화 · 간호사");}
  async function verifyVoice(key,volume){
    await p.waitForFunction(key=>{
      const buffer=window.audioSettingsGame.voices.buffers.get(key)?.buffer;
      return buffer&&window.audioSettingsStarts.some(s=>s.buffer===buffer);
    },key);
    const gain=await p.evaluate(key=>{
      const g=window.audioSettingsGame,buffer=g.voices.buffers.get(key).buffer;
      return {actual:window.audioSettingsStarts.findLast(s=>s.buffer===buffer).gain,base:g.data.voices.gain,speaker:g.data.voices.speakers[key].gain||1};
    },key);
    assert.ok(Math.abs(gain.actual-volume*gain.base*gain.speaker)<1e-6);
  }
  await start();await settings();
  assert.equal(await p.locator("#music-volume").inputValue(),"42");assert.equal(await p.locator("#voice-volume").inputValue(),"42");
  await slider("music",0);
  assert.equal(await p.locator("#voice-volume").inputValue(),"42");assert.equal(await p.evaluate(()=>window.audioSettingsGame.music.audio.volume),0);
  await p.keyboard.press("Escape");await speak("valeria");await verifyVoice("valeria",.42);await p.keyboard.press("Escape");
  const bytes=await p.evaluate(async()=>Array.from(new Uint8Array(await (await fetch("assets/audio/voices/valeria.mp3")).arrayBuffer())));
  const expected=await readFile(new URL("../assets/audio/voices/valeria.mp3",import.meta.url));
  assert.equal(createHash("sha256").update(Buffer.from(bytes)).digest("hex"),createHash("sha256").update(expected).digest("hex"));
  // Voice-only silence does not turn down background music.
  await settings();await slider("music",65);await slider("voice",0);await p.keyboard.press("Escape");
  const count=await p.evaluate(()=>window.audioSettingsStarts.length);await speak("valeria");await p.waitForTimeout(650);
  assert.equal(await p.evaluate(()=>window.audioSettingsStarts.length),count);assert.equal(await p.evaluate(()=>window.audioSettingsGame.music.audio.volume),.65);await p.keyboard.press("Escape");
  await settings();await slider("voice",73);await p.screenshot({path:"/tmp/bakery-separated-audio-settings.png",fullPage:true});await p.keyboard.press("Escape");
  // Revised first greeting speaks normally; the following narration is a separate silent page.
  await speak("catherine");await verifyVoice("catherine",.73);
  await p.waitForFunction(()=>window.audioSettingsGame.ui.dialogueController.model.phase==="ready");
  assert.equal(await p.locator("#typed-dialogue").textContent(),"어머, 귀여워라.");assert.equal(await p.locator("#dialogue-choices").isVisible(),false);
  await p.locator("#dialogue-next").click();
  const afterSpeech=await p.evaluate(()=>window.audioSettingsStarts.length);
  await p.waitForFunction(()=>window.audioSettingsGame.ui.dialogueController.model.phase==="ready");
  assert.equal(await p.locator("#dialogue-speaker").textContent(),"이야기");assert.match(await p.locator("#typed-dialogue").textContent(),/쓰다듬고/);
  assert.equal(await p.evaluate(()=>window.audioSettingsStarts.length),afterSpeech);await p.locator("#dialogue-next").click();await choose("도와드릴 게 있을까요.");await drain();
  await choose("당연하죠.");await drain();assert.equal(await p.evaluate(()=>window.audioSettingsGame.state.clinic.gift),"baking");
  // Both channels and the global mute flag survive navigation/reload.
  await settings();await choose("음소거");assert.equal(await p.evaluate(()=>window.audioSettingsGame.music.audio.muted),true);
  await p.keyboard.press("Escape");const mutedCount=await p.evaluate(()=>window.audioSettingsStarts.length);await speak("valeria");await p.waitForTimeout(500);assert.equal(await p.evaluate(()=>window.audioSettingsStarts.length),mutedCount);await p.keyboard.press("Escape");
  await start();await settings();
  assert.equal(await p.locator("#music-volume").inputValue(),"65");assert.equal(await p.locator("#voice-volume").inputValue(),"73");await choose("음소거 해제");
  // Charlotte's actual performance stays on the music channel when voices are set to zero.
  await slider("music",27);await slider("voice",0);await p.keyboard.press("Escape");
  await p.evaluate(()=>Object.assign(window.audioSettingsGame.state,{scene:"city",x:400,y:300}));await p.keyboard.press("e");await drain();await choose("연주를 들어본다.");await drain();
  await p.waitForFunction(()=>document.querySelector("#charlotte-performance")?.currentTime>0);
  assert.equal(await p.locator("#charlotte-performance").evaluate(a=>a.volume),.27);await p.keyboard.press("Space");await drain();await p.keyboard.press("Escape");
  await p.setViewportSize({width:390,height:844});await settings();
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await slider("music",18);await slider("voice",81);await p.screenshot({path:"/tmp/bakery-separated-audio-mobile.png",fullPage:true});
  await start();await settings();assert.equal(await p.locator("#music-volume").inputValue(),"18");assert.equal(await p.locator("#voice-volume").inputValue(),"81");
  assert.deepEqual(errors,[]);
  console.log("PASS: legacy shared preference migration, independent music/voice sliders and actual AudioBufferSource gains, zero/mute isolation, new Valeria MP3 bytes/decoding, sequential Catherine speech/silent narration and quest acceptance, persistence/reload, performance music volume/Space skip, mobile settings layout.");
}finally{await browser?.close();await new Promise(r=>server.close(r));}
