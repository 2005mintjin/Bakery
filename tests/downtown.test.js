import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fresh, validate } from "../src/saveSystem.js";
import { configureWorld, transition, nearbyDoor, obstacles, repairPosition } from "../src/sceneManager.js";
import { move } from "../src/player.js";
import { residents } from "../src/npc.js";
import { interact } from "../src/app/interactions.js";
const json = (name) => JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url)));
const world = json("worldMaps"), downtown = json("downtown");
configureWorld(world);
function blocked(scene, x, y) {
  return obstacles[scene].some((b) => x + 10 > b.x && x - 10 < b.x + b.w && y + 6 > b.y && y - 8 < b.y + b.h);
}
function walkUntilTransition(s, direction) {
  const before = s.scene;
  for (let i = 0; i < 160; i++) {
    move(s, new Set([direction]), .05, downtown[s.scene]?.residents || []);
    transition(s);
    if (s.scene !== before) return;
  }
  assert.fail(`Cannot leave ${before} to ${direction}`);
}
test("rightward route visits services first, then the square; both return paths work", () => {
  const s = Object.assign(fresh(), { scene: "city", x: 900, y: 310 });
  walkUntilTransition(s, "d"); assert.equal(s.scene, "downtown");
  assert.equal(blocked(s.scene, s.x, s.y), false);
  assert.deepEqual(downtown.downtown.buildings.map((b) => b.id), ["hospital", "police", "bookstore", "recordStore"]);
  walkUntilTransition(s, "d"); assert.equal(s.scene, "downtownEast");
  assert.equal(blocked(s.scene, s.x, s.y), false);
  assert.deepEqual([s.x, s.y], [180, 310]);
  walkUntilTransition(s, "a"); assert.equal(s.scene, "downtown");
  walkUntilTransition(s, "a"); assert.equal(s.scene, "city");
});
test("a transition requires its own road opening and never bounces immediately", () => {
  for (const [scene,x,y] of [["city",925,250],["downtown",925,250],["downtown",35,400],["downtownEast",35,400]]) {
    const s = Object.assign(fresh(), { scene,x,y });
    assert.equal(transition(s), false); assert.equal(s.scene, scene);
  }
  const s = Object.assign(fresh(), { scene:"city", x:925, y:310 });
  assert.ok(transition(s)); assert.equal(transition(s), false);
});
test("new maps load bundled PNGs, have no active buildings and preserve old saves", () => {
  for (const scene of ["downtown", "downtownEast"]) {
    assert.ok(existsSync(new URL("../" + world[scene].asset, import.meta.url)));
    assert.deepEqual(world[scene].doors, []);
    const s = Object.assign(fresh(), { scene, x:480, y:310 });
    assert.deepEqual(validate(s), s);
    assert.equal(nearbyDoor(s), undefined);
    assert.ok(downtown[scene].buildings.every((b) => b.available === false));
  }
  assert.deepEqual(validate(fresh()), fresh());
  assert.throws(() => validate({ ...fresh(), scene:"unknownDistrict" }));
});
test("buildings, fountain and fenced square block movement; repair keeps safe positions walkable", () => {
  for (const [scene,x,y,key] of [["downtown",480,285,"w"],["downtown",470,512,"w"],["downtownEast",470,311,"s"]]) {
    const s = { scene,x,y };
    for (let i=0;i<50;i++) move(s,new Set([key]),.05,[]);
    assert.equal(blocked(scene,s.x,s.y),false);
    assert.ok(Math.hypot(s.x-x,s.y-y)<35);
  }
  for (const scene of ["downtown", "downtownEast"]) {
    const s = { scene, x:480, y:100 }; repairPosition(s);
    assert.deepEqual([s.x,s.y],world[scene].safeSpawn);
    assert.equal(blocked(scene,s.x,s.y),false);
  }
});
test("nine unique townsfolk stand on walkable ground, use their own art and only offer conversation", () => {
  const all = Object.values(downtown).flatMap((a) => a.residents);
  assert.equal(new Set(all.map((n) => n.id)).size,9);
  for (const scene of Object.keys(downtown)) {
    const npcs = residents({ state:{scene}, data:{downtown} });
    assert.equal(npcs.length,3);
    for (const npc of npcs) {
      assert.equal(blocked(scene,npc.x,npc.y),false,npc.id);
      assert.equal(npc.quest,undefined);
      assert.ok(npc.line.length>0);
      assert.ok(existsSync(new URL("../"+npc.portraitAsset,import.meta.url)));
      let shown;
      const g = {state:{scene,x:npc.x,y:npc.y},data:{downtown},ui:{say(...args){shown=args;}}};
      interact(g);
      assert.equal(shown[0].name,npc.name);
      assert.equal(shown[0].portraitAsset,npc.portraitAsset);
      assert.deepEqual(shown[1],[npc.line]);
    }
  }
});
