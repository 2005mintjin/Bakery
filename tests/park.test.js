import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {fresh,validate} from "../src/saveSystem.js";
import {configureWorld,transition,repairPosition} from "../src/sceneManager.js";
import {configureSchedule,buildOffDutyActors} from "../src/schedule.js";
import {move} from "../src/player.js";
import {residents} from "../src/npc.js";
const json=k=>JSON.parse(readFileSync(new URL(`../data/${k}.json`,import.meta.url)));
const data=Object.fromEntries(["worldMaps","npcs","city","downtown","customers","staffSchedule","civicActors"].map(k=>[k,json(k)]));
configureWorld(data.worldMaps);configureSchedule(data.staffSchedule);data.offDutyActors=buildOffDutyActors(data);
function walk(s,key){
 const from=s.scene;
 for(let i=0;i<180;i++){move(s,new Set([key]),.05,residents({state:s,data}));transition(s);if(s.scene!==from)return;}
 assert.fail(`Route blocked: ${from} (${s.x},${s.y}) ${key}`);
}
test("return from the middle of the pub square works on a wide lane, including Sundays",()=>{
 for(const day of [1,7])for(const y of [300,310,315]){
  const s=Object.assign(fresh(),{scene:"downtownEast",day,minutes:720,x:480,y});
  walk(s,"a");assert.equal(s.scene,"downtown");assert.deepEqual([s.x,s.y],[905,310]);
 }
});
test("incoming positions do not bounce and old edge/blocked saves can escape",()=>{
 const s=Object.assign(fresh(),{scene:"downtown",x:925,y:310});
 assert.ok(transition(s));assert.deepEqual([s.scene,s.x,s.y],["downtownEast",180,310]);
 assert.equal(transition(s),false);
 Object.assign(s,{x:48,y:280});walk(s,"a");assert.equal(s.scene,"downtown");
 Object.assign(s,{scene:"downtownEast",x:100,y:310});repairPosition(s);walk(s,"a");assert.equal(s.scene,"downtown");
});
test("the square connects to the supplied park and park saves preserve progress",()=>{
 const s=Object.assign(fresh(),{scene:"downtownEast",x:900,y:310});walk(s,"d");
 assert.deepEqual([s.scene,s.x,s.y],["park",48,310]);assert.equal(transition(s),false);
 assert.ok(existsSync(new URL('../'+data.worldMaps.park.asset,import.meta.url)));
 const loaded=validate(s);assert.deepEqual(loaded,s);
 loaded.x=310;walk(loaded,"a");assert.deepEqual([loaded.scene,loaded.x,loaded.y],["downtownEast",905,310]);
});
test("park basin blocks entry and all three park residents stand on safe ground",()=>{
 const s={scene:"park",x:400,y:310};
 for(let i=0;i<40;i++)move(s,new Set(["d"]),.05,[]);
 assert.ok(s.x<455);assert.ok(s.x>=445);
 assert.equal(data.downtown.park.residents.length,3);
 for(const n of data.downtown.park.residents){
  assert.ok(!data.worldMaps.park.obstacles.some(b=>n.x+10>b.x&&n.x-10<b.x+b.w&&n.y+6>b.y&&n.y-8<b.y+b.h),n.name);
  assert.ok(existsSync(new URL('../'+n.portraitAsset,import.meta.url)));
 }
});
test("door approach positions are free of residents both during work and on Sunday",()=>{
 for(const day of [1,7])for(const scene of ["town","city"]){
  const s=Object.assign(fresh(),{scene,day,minutes:720});const npcs=residents({state:s,data});
  for(const door of data.worldMaps[scene].doors){
   const x=door.x,y=door.y+40;
   assert.ok(!npcs.some(n=>x+10>n.x-12&&x-10<n.x+12&&y+6>n.y-10&&y-8<n.y+12),`${scene}/${door.id}`);
  }
 }
});
test("performance art is separate from Charlotte's usual portrait",()=>{
 const c=json("charlotte"),npc=data.city.residents.find(n=>n.id==="reader");
 assert.notEqual(c.performance.imageAsset,npc.portraitAsset);
 assert.ok(existsSync(new URL('../'+c.performance.imageAsset,import.meta.url)));
});

test("relocated city residents leave the main road traversable on workdays and Sunday",()=>{
 for(const day of [1,7]){
  const s=Object.assign(fresh(),{scene:"city",day,minutes:720,x:900,y:310});
  walk(s,"a");assert.equal(s.scene,"town");
 }
});
