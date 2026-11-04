import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fresh, validate } from "../src/saveSystem.js";
import { tickShop } from "../src/shop.js";
import { closeShop } from "../src/wellbeing.js";
import { customerPortraits } from "../src/visitorOrder.js";
import { customerActor, orderText, resolveCustomerReply } from "../src/serviceDialogue.js";
import { voicePlan } from "../src/dialogueVoice.js";
const json=(key)=>JSON.parse(readFileSync(new URL(`../data/${key}.json`,import.meta.url)));
const customers=json("customers"),dialogues=json("serviceDialogues"),voices=json("voices"),recipes=json("recipes");
function rng(seed=17) { return ()=> { seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296; }; }
function visit(s,random) {
  s.shop.open=true;s.shop.elapsed=0;s.shop.customer=null;
  assert.ok(tickShop(s,12,customers,random));
  const c=structuredClone(s.shop.customer);
  tickShop(s,1.2,customers,random);
  assert.equal(s.shop.customer.phase,"waiting");
  return c;
}
test("visitor roster adds Hendel, Adel and Martin with separate SD/portraits; Lotus stays excluded",()=>{
  assert.deepEqual([...customerPortraits].sort(),customers.map(c=>c.portrait).sort());
  assert.equal(customers.some(c=>c.portrait==="lotus"),false);
  for(const key of ["hendel","adel","martin"]) {
    const c=customers.find(c=>c.portrait===key);
    assert.ok(c);assert.ok(c.spriteBounds.every(Number.isFinite));
    assert.notEqual(c.spriteAsset,c.portraitAsset);assert.equal(c.dialogueUsesSprite,undefined);
    for(const f of [c.spriteAsset,c.portraitAsset])assert.ok(existsSync(new URL("../"+f,import.meta.url)));
    const actor=customerActor(c,c);assert.equal(actor.portraitAsset,c.portraitAsset);
    assert.deepEqual(voicePlan({text:"안녕!"},actor,voices),[key,key,null]);
    assert.ok(orderText(dialogues,{...c,bread:"honeybread",quantity:3}).includes("꿀빵 3개"));
    for(const reply of ["thanks","later","decline"])assert.ok(dialogues.customers[key][reply]);
  }
  assert.match(dialogues.customers.hendel.order,/으음/);
  assert.match(dialogues.customers.adel.order,/주겠니/);
  assert.match(dialogues.customers.martin.order,/주겠나/);
  assert.equal(customers.find(c=>c.portrait==="martin").preferences.honeybread,4);
});
test("each shuffled cycle visits every customer exactly once and reshuffles after exhaustion",()=>{
  const s=fresh(),random=rng(),cycles=[];
  let previous;
  for(let cycle=0;cycle<8;cycle++) {
    const seen=[];
    for(let i=0;i<customers.length;i++)seen.push(visit(s,random).portrait);
    assert.equal(new Set(seen).size,customers.length);
    assert.deepEqual([...seen].sort(),[...customerPortraits].sort());
    if(previous)assert.notEqual(seen[0],previous.at(-1));
    cycles.push(seen.join(","));previous=seen;
    assert.deepEqual(s.shop.visitorQueue,[]);
  }
  assert.ok(new Set(cycles).size>1);
});
test("saved remaining visitors survive closing/reopening and pending orders retain their exact bread and quantity",()=>{
  const s=fresh(),random=rng();visit(s,random);
  const current=structuredClone(s.shop.customer),remaining=[...s.shop.visitorQueue];
  const loaded=validate(s);
  assert.deepEqual(loaded.shop.customer,current);
  assert.deepEqual(loaded.shop.visitorQueue,remaining);
  assert.equal(resolveCustomerReply(loaded,"later",recipes),"waiting");
  assert.deepEqual(loaded.shop.visitorQueue,remaining);
  closeShop(loaded);assert.deepEqual(loaded.shop.visitorQueue,remaining);
  assert.equal(visit(loaded,random).portrait,remaining[0]);
});
test("all three new visitor orders roundtrip; old saves keep progress and initialize a new cycle",()=>{
  for(const key of ["hendel","adel","martin"]) {
    const s=fresh();s.shop.visitorQueue=[key];const c=visit(s,rng());assert.equal(c.portrait,key);
    const loaded=validate(s);assert.deepEqual(loaded.shop,s.shop);
    loaded.display[c.bread]=c.quantity;
    const money=loaded.money;
    assert.equal(resolveCustomerReply(loaded,"serve",recipes),"served");
    assert.equal(loaded.money,money+recipes.find(r=>r.id===c.bread).price*c.quantity);
    assert.equal(resolveCustomerReply(loaded,"serve",recipes),"unavailable");
  }
  const old=fresh();delete old.shop.visitorQueue;delete old.shop.lastVisitor;
  old.shop.customer={name:"마리아",portrait:"sora",bread:"honeybread",quantity:2,phase:"waiting",arrival:1.2};
  old.quests.friend="done";old.money=450;
  const loaded=validate(old);
  assert.equal(loaded.money,450);assert.deepEqual(loaded.quests,old.quests);
  assert.deepEqual(loaded.shop.customer,old.shop.customer);
  assert.deepEqual(loaded.shop.visitorQueue,[]);assert.equal(loaded.shop.lastVisitor,"sora");
  loaded.shop.customer=null;assert.notEqual(visit(loaded,rng()).portrait,"sora");
});
test("invalid/duplicate queues and forbidden Lotus orders are rejected",()=>{
  for(const q of [null,{},["mira","mira"],["lotus"],["unknown"]]) {
    const s=fresh();s.shop.visitorQueue=q;assert.throws(()=>validate(s));
  }
  const s=fresh();s.shop.lastVisitor="lotus";assert.throws(()=>validate(s));
  s.shop.lastVisitor=null;s.shop.customer={name:"로터스",portrait:"lotus",bread:"loaf",quantity:1,phase:"waiting",arrival:1.2};
  assert.throws(()=>validate(s));
});
