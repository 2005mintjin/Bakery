import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fresh, validate } from "../src/saveSystem.js";
import { residentFrame } from "../src/residentAnimation.js";
import { talk } from "../src/dialogue.js";
import { customerActor, orderText } from "../src/serviceDialogue.js";
import { voicePlan } from "../src/dialogueVoice.js";
const json=k=>JSON.parse(readFileSync(new URL(`../data/${k}.json`,import.meta.url)));
const city=json("city"),story=json("charlotte"),npc=city.residents.find(n=>n.id==="reader"),customers=json("customers");
test("Yun is replaced with Charlotte; every original sentence and choice is retained",()=>{
  assert.equal(npc.name,"샬롯");assert.equal(npc.line,undefined);
  const source=readFileSync(new URL('../data/source/charlotte-dialogue.txt',import.meta.url),'utf8');
  const text=Object.values(story.nodes).flatMap(n=>n.pages||[]).map(p=>p.text).join('\n');
  const labels=Object.values(story.nodes).flatMap(n=>n.choices||[]).map(c=>c.label);
  for(const [,line] of source.matchAll(/"([^"]+)"/g))assert.ok(text.includes(line),line);
  for(const [,label] of source.matchAll(/\[([^\]]+)\]/g))assert.ok(labels.includes(label),label);
  assert.equal(story.nodes.offer.pages.at(-1).kind,"narration");
  for(const node of Object.values(story.nodes))for(const link of [node.next,...(node.choices||[]).map(c=>c.next)].filter(Boolean))assert.ok(story.nodes[link]);
});
test("GIF timing loops all six frames with a fixed anchor, including reduced-motion fallback",()=>{
  const a=npc.spriteAnimation;
  assert.deepEqual(a.durations,[170,170,170,170,170,170]);
  for(let i=0;i<6;i++)assert.equal(residentFrame(a,(i*170+10)/1000),i);
  assert.equal(residentFrame(a,1.03),0);assert.equal(residentFrame(a,-1),0);
  assert.equal(residentFrame(a,1,true),0);assert.equal(residentFrame(undefined,1),0);
  assert.deepEqual(npc.spriteBounds,[149,6,246,470]);
  for(const f of [a.asset,a.sourceAsset,npc.spriteAsset,npc.portraitAsset])assert.ok(existsSync(new URL('../'+f,import.meta.url)));
});
test("street branches return to the original choices and do not award or consume anything",()=>{
  let shown;const g={state:fresh(),data:{charlotte:story},ui:{say(actor,pages,actions,options){shown={actor,pages,actions,options};},close(){},open:true}};
  g.state.scene="city";const before=structuredClone(g.state);talk(g,npc);
  for(const label of ["꼬리 만져봐도 되나요?","기타를 연주해도 될 거 같은데요."]){
    shown.actions.find(c=>c[0]===label)[1]();assert.ok(shown.pages.length>1);
    shown.options.onComplete();assert.equal(shown.actions.length,4);
  }
  assert.deepEqual(g.state,before);
});
test("Charlotte is a bakery visitor with SD, separate portrait, original voice and valid saved orders",()=>{
  const c=customers.find(c=>c.portrait==="charlotte");assert.ok(c);assert.equal(customers.length,18);
  assert.notEqual(c.spriteAsset,c.portraitAsset);assert.equal(customerActor(c,c).portraitAsset,c.portraitAsset);
  assert.deepEqual(voicePlan({text:"안녕!"},c,json("voices")),["charlotte","charlotte",null]);
  const s=fresh();s.shop.customer={...c,bread:"honeybread",quantity:2,phase:"waiting",arrival:1.2};
  assert.equal(validate(s).shop.customer.portrait,"charlotte");
  assert.match(orderText(json("serviceDialogues"),s.shop.customer),/꿀빵 2개/);
  assert.ok(!customers.some(c=>c.portrait==="lotus"));
});
