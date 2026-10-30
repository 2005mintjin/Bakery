import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fresh, validate } from "../src/saveSystem.js";
import {
  castLine,
  tickFishing,
  reelLine,
  cancelFishing,
  nearFishingSpot,
  fishingRules,
} from "../src/fishing.js";
import { configureWorld, transition, obstacles } from "../src/sceneManager.js";
import { move } from "../src/player.js";
import {
  beginDough,
  knead,
  addTopping,
  putInOven,
  tickBaking,
  collectBread,
} from "../src/baking.js";
const maps = JSON.parse(
  readFileSync(new URL("../data/worldMaps.json", import.meta.url)),
);
const atPond = () =>
  Object.assign(fresh(), {
    scene: "pond",
    x: fishingRules.x,
    y: fishingRules.y,
  });
test("field west leads to pond, east returns; dock accessible and water blocks walking", () => {
  configureWorld(maps);
  const s = Object.assign(fresh(), { scene: "field", x: 31, y: 310 });
  assert.ok(transition(s));
  assert.equal(s.scene, "pond");
  s.x = 929;
  assert.ok(transition(s));
  assert.equal(s.scene, "field");
  Object.assign(s, { scene: "pond", x: 905, y: fishingRules.y });
  for (let i = 0; i < 46; i++) move(s, new Set(["a"]), 0.05, []);
  assert.ok(nearFishingSpot(s));
  for (let i = 0; i < 90; i++) move(s, new Set(["a"]), 0.05, []);
  assert.ok(s.x >= 572, "cannot walk into water west of the dock");
  assert.ok(obstacles.pond.length > 0);
});
test("casting spends once, bite/reel gives exactly one fish and repeat works", () => {
  const s = atPond();
  assert.equal(
    castLine(s, () => 0),
    "cast",
  );
  assert.equal(s.stamina, 97);
  assert.equal(s.minutes, 368);
  assert.equal(castLine(s), "busy");
  assert.equal(s.stamina, 97);
  assert.equal(tickFishing(s, 1.9), false);
  assert.equal(s.fishing.phase, "waiting");
  assert.equal(tickFishing(s, 0.1), true);
  assert.equal(s.fishing.phase, "bite");
  assert.ok(reelLine(s));
  assert.equal(s.items.fish, 1);
  assert.equal(reelLine(s), false);
  assert.equal(tickFishing(s, 10), false);
  assert.equal(
    castLine(s, () => 1),
    "cast",
  );
  tickFishing(s, 4);
  assert.ok(reelLine(s));
  assert.equal(s.items.fish, 2);
});
test("early, missed, cancelled and exhausted casts never give fish", () => {
  const s = atPond();
  castLine(s, () => 0);
  assert.equal(reelLine(s), false);
  assert.equal(s.fishing.phase, "early");
  castLine(s, () => 0);
  tickFishing(s, 2);
  tickFishing(s, 2.5);
  assert.equal(s.fishing.phase, "missed");
  assert.equal(reelLine(s), false);
  castLine(s);
  cancelFishing(s);
  assert.equal(s.fishing, null);
  assert.equal(s.items.fish, 0);
  s.stamina = 2;
  const before = structuredClone(s);
  assert.equal(castLine(s), "tired");
  assert.deepEqual(s, before);
  s.stamina = 100;
  s.scene = "field";
  assert.equal(castLine(s), "location");
  s.scene = "pond";
  assert.equal(
    castLine(s, () => NaN),
    "invalid",
  );
});
test("old saves gain optional fishing state; pond fish and rounds survive validation", () => {
  const old = fresh();
  delete old.fishing;
  assert.equal(validate(old).fishing, null);
  const s = atPond();
  castLine(s, () => 0);
  tickFishing(s, 2);
  const loaded = validate(s);
  assert.equal(loaded.fishing.phase, "bite");
  assert.ok(reelLine(loaded));
  assert.equal(validate(loaded).items.fish, 1);
  for (const bad of [
    { phase: "fake", elapsed: 0, waitFor: 2 },
    { phase: "bite", elapsed: -1, waitFor: 2 },
    { phase: "bite", elapsed: 0, waitFor: Infinity },
  ])
    assert.throws(() => validate({ ...s, fishing: bad }));
  assert.throws(() => validate({ ...s, scene: "town" }));
});
test("two caught fish make a fish pie using the existing mold and oven rules", () => {
  const s = atPond();
  for (let i = 0; i < 2; i++) {
    castLine(s, () => 0);
    tickFishing(s, 2);
    reelLine(s);
  }
  cancelFishing(s);
  s.items.water = 1;
  assert.equal(beginDough(s, "pie"), false);
  s.equipment.pieMold = true;
  assert.ok(beginDough(s, "pie"));
  for (let i = 0; i < 20; i++) knead(s, 60);
  assert.ok(addTopping(s, "fish"));
  assert.equal(s.items.fish, 0);
  assert.equal(s.doughs.fishpie, 1);
  assert.ok(putInOven(s, { fishpie: 1 }));
  tickBaking(s, 60);
  assert.equal(collectBread(s).fishpie, 1);
  assert.equal(s.warehouse.fishpie, 1);
});
