import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fresh, validate } from "../src/saveSystem.js";
import { configureSchedule, facilityOpen, weekdayName, buildOffDutyActors, canVisitBakery } from "../src/schedule.js";
import { configureWorld, enterBuilding } from "../src/sceneManager.js";
import { residents } from "../src/npc.js";
import { tickShop } from "../src/shop.js";
import { castLine, tickFishing, reelLine, cancelFishing } from "../src/fishing.js";
import { fishCounts } from "../src/fishStock.js";
import { sellFish } from "../src/fishMarket.js";
import { spend } from "../src/inventory.js";
import { dayReport } from "../src/dailyReport.js";
const json=k=>JSON.parse(readFileSync(new URL(`../data/${k}.json`,import.meta.url)));
const data=Object.fromEntries(["staffSchedule","customers","civicActors","npcs","city","downtown","worldMaps"].map(k=>[k,json(k)]));
configureSchedule(data.staffSchedule);configureWorld(data.worldMaps);data.offDutyActors=buildOffDutyActors(data);
test("calendar weekdays and staggered closing boundaries; Sunday closes all facilities",()=>{
  const s=fresh();assert.equal(weekdayName(s),"월");
  for(const [scene,h] of Object.entries(data.staffSchedule.facilities)){
    s.day=1;s.minutes=h.open-1;assert.equal(facilityOpen(s,scene),false);
    s.minutes=h.open;assert.equal(facilityOpen(s,scene),true);
    s.minutes=h.close-1;assert.equal(facilityOpen(s,scene),true);
    s.minutes=h.close;assert.equal(facilityOpen(s,scene),false);
    s.day=7;s.minutes=720;assert.equal(facilityOpen(s,scene),false);
    s.day=6;assert.equal(facilityOpen(s,scene),true);
  }
  s.day=7;s.minutes=1439;assert.equal(weekdayName(s),"일");
  s.day=8;s.minutes=0;assert.equal(weekdayName(s),"월");
});
test("closed doors refuse entry, staff appear outside only off duty and disappear during bakery visits",()=>{
  const s=Object.assign(fresh(),{scene:"city",minutes:720});
  const door=data.worldMaps.city.doors.find(d=>d.scene==="store");
  assert.ok(enterBuilding(s,door));
  s.scene="city";s.minutes=1200;assert.equal(enterBuilding(s,door),false);
  const g={state:s,data};assert.ok(residents(g).some(n=>n.portrait==="arien"));
  s.shop.customer={portrait:"arien"};assert.ok(!residents(g).some(n=>n.portrait==="arien"));
  s.shop.customer=null;s.minutes=720;assert.ok(!residents(g).some(n=>n.offDuty));
  s.day=7;assert.ok(residents(g).some(n=>n.portrait==="lotus"));
  assert.ok(!data.customers.some(c=>c.portrait==="lotus"));
});
test("working staff are deferred without being removed from their saved visit cycle",()=>{
  const s=fresh();s.shop.open=true;s.shop.visitorQueue=["adel","barista"];
  assert.equal(tickShop(s,12,data.customers,()=>0),false);
  assert.deepEqual(s.shop.visitorQueue,["adel","barista"]);
  s.minutes=1080;assert.ok(tickShop(s,1,data.customers,()=>0));assert.equal(s.shop.customer.portrait,"adel");
  s.shop.customer=null;s.minutes=1200;assert.ok(tickShop(s,12,data.customers,()=>0));assert.equal(s.shop.customer.portrait,"barista");
  assert.equal(canVisitBakery({...s,minutes:720},data.customers.find(c=>c.portrait==="martin")),true);
  assert.deepEqual(validate(s).shop.visitorQueue,[]);
});
function catchFish(s,roll){let i=0;assert.equal(castLine(s,()=>i++===0?0:roll),"cast");tickFishing(s,2);assert.ok(reelLine(s));assert.equal(reelLine(s),false);cancelFishing(s);}
test("fish size probabilities use exact 20/50/30 boundaries and cannot reroll on reload",()=>{
  for(const [roll,size] of [[0,"large"],[.19999,"large"],[.2,"medium"],[.69999,"medium"],[.7,"small"],[1,"small"]]){
    let s=Object.assign(fresh(),{scene:"pond",x:591,y:287});let i=0;
    castLine(s,()=>i++===0?0:roll);assert.equal(s.fishing.size,size);
    s=validate(s);tickFishing(s,2);assert.ok(reelLine(s));assert.equal(fishCounts(s)[size],1);
  }
  const counts={large:0,medium:0,small:0};
  for(let i=0;i<1000;i++){
    const s=Object.assign(fresh(),{scene:"pond",x:591,y:287});catchFish(s,(i+.5)/1000);
    counts[Object.keys(counts).find(k=>s.fishStock[k]===1)]++;
  }
  assert.deepEqual(counts,{large:200,medium:500,small:300});
});
test("fish sell at distinct prices only in an open store; duplicate sales never pay",()=>{
  const s=Object.assign(fresh(),{scene:"pond",x:591,y:287});
  for(const roll of [0,.4,.9])catchFish(s,roll);
  assert.deepEqual(s.fishStock,{large:1,medium:1,small:1});
  assert.equal(sellFish(s,"large"),false);s.scene="store";s.minutes=720;
  const money=s.money;
  assert.equal(sellFish(s,"large"),24);assert.equal(sellFish(s,"medium"),12);assert.equal(sellFish(s,"small"),6);
  assert.equal(sellFish(s,"large"),false);assert.equal(s.money,money+42);assert.equal(s.items.fish,0);
  assert.equal(dayReport(s).fishSales,42);assert.equal(dayReport(s).sales,0);assert.deepEqual(s.guild.sales,{});
  s.items.fish=2;s.day=7;assert.equal(sellFish(s,"legacy"),false);s.day=1;s.minutes=1200;assert.equal(sellFish(s,"legacy"),false);
  assert.equal(sellFish(s,"legacy",-1),false);assert.equal(sellFish(s,"fake"),false);
});
test("legacy fish remain intact; recipes consume legacy/small/medium/large in that order",()=>{
  const old=fresh();delete old.fishStock;old.items.fish=4;
  const s=validate(old);assert.equal(fishCounts(s).legacy,4);assert.equal(s.items.fish,4);
  s.fishStock={large:1,medium:1,small:1};s.items.fish=4;
  assert.ok(spend(s,{fish:2}));assert.deepEqual(s.fishStock,{large:1,medium:1,small:0});assert.equal(s.items.fish,2);
  assert.ok(spend(s,{fish:2}));assert.deepEqual(s.fishStock,{large:0,medium:0,small:0});
  assert.deepEqual(validate(s).fishStock,s.fishStock);
  for(const bad of [null,{large:-1,medium:0,small:0},{large:1,medium:1,small:1}])assert.throws(()=>validate({...s,fishStock:bad}));
});
test("every off-duty actor has a walkable, distinct outdoor position and original art",()=>{
  const positions=new Set();
  for(const a of data.offDutyActors){
    const key=`${a.scene}:${a.x}:${a.y}`;assert.ok(!positions.has(key));positions.add(key);
    assert.ok(a.spriteAsset);assert.ok(a.portraitAsset);
    assert.ok(!data.worldMaps[a.scene].obstacles.some(b=>a.x+10>b.x&&a.x-10<b.x+b.w&&a.y+6>b.y&&a.y-8<b.y+b.h),a.name);
  }
});

test("a deferred first visit never repeats the previous cycle's last visitor",()=>{
  const s=fresh();s.shop.open=true;s.shop.lastVisitor="mira";
  s.shop.visitorQueue=["adel","mira",...data.customers.map(c=>c.portrait).filter(id=>!["adel","mira"].includes(id))];
  assert.ok(tickShop(s,12,data.customers,()=>0));
  assert.notEqual(s.shop.customer.portrait,"mira");
  assert.ok(s.shop.visitorQueue.includes("mira"));
});
