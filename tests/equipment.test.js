import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fresh, validate } from "../src/saveSystem.js";
import {
  buyEquipment,
  upgradeOven,
  ovenLimit,
  ovenDuration,
  availableProducts,
} from "../src/equipment.js";
import {
  beginDough,
  putInOven,
  tickBaking,
  collectBread,
  dryBerries,
} from "../src/baking.js";
import { setSaleMenu, tickShop } from "../src/shop.js";
import {
  configureWorld,
  nearbyDoor,
  enterBuilding,
} from "../src/sceneManager.js";
import { leaveInterior, isInterior } from "../src/interior.js";
const rich = () => {
  const s = fresh();
  s.money = 5000;
  Object.assign(s.items, {
    flour: 30,
    water: 10,
    salt: 10,
    sugar: 10,
    butter: 10,
    berry: 30,
  });
  return s;
};
test("new game locks pies/cookies without spending; molds charge once and independently unlock recipes", () => {
  const s = rich(),
    before = structuredClone(s);
  assert.equal(beginDough(s, "pie"), false);
  assert.equal(beginDough(s, "cookie"), false);
  assert.deepEqual(s, before);
  s.money = 149;
  assert.equal(buyEquipment(s, "pieMold"), false);
  assert.equal(s.money, 149);
  s.money = 270;
  assert.ok(buyEquipment(s, "pieMold"));
  assert.equal(s.money, 120);
  assert.equal(buyEquipment(s, "pieMold"), false);
  assert.equal(beginDough(s, "cookie"), false);
  assert.ok(buyEquipment(s, "cookieMold"));
  assert.equal(s.money, 0);
  assert.equal(availableProducts(s).length, 9);
  assert.ok(beginDough(s, "pie"));
});
test("oven upgrades have independent tiers, exact prices, capacity limits, faster timers and a busy guard", () => {
  let s = rich();
  s.doughs.loaf = 20;
  assert.equal(putInOven(s, { loaf: 7 }), false);
  assert.ok(upgradeOven(s, "capacity"));
  assert.equal(ovenLimit(s), 9);
  assert.ok(upgradeOven(s, "speed"));
  assert.equal(ovenDuration(s), 45);
  assert.equal(s.money, 4550);
  assert.ok(putInOven(s, { loaf: 9 }));
  assert.equal(s.oven.duration, 45);
  const before = structuredClone(s);
  assert.equal(upgradeOven(s, "speed"), false);
  assert.deepEqual(s, before);
  tickBaking(s, 44.9);
  s = validate(s);
  assert.equal(s.oven.phase, "baking");
  assert.equal(tickBaking(s, 0.1), true);
  assert.ok(collectBread(s));
  assert.equal(s.warehouse.loaf, 9);
  assert.ok(upgradeOven(s, "capacity"));
  assert.ok(upgradeOven(s, "speed"));
  assert.equal(ovenLimit(s), 12);
  assert.equal(ovenDuration(s), 30);
  assert.equal(upgradeOven(s, "capacity"), false);
  assert.equal(upgradeOven(s, "speed"), false);
  s.doughs.loaf = 12;
  assert.ok(putInOven(s, { loaf: 12 }));
  tickBaking(s, 30);
  collectBread(s);
  assert.ok(dryBerries(s, 12));
  tickBaking(s, 30);
  assert.ok(collectBread(s));
  assert.equal(s.items.driedberry, 12);
  assert.deepEqual(validate(s), s);
});
test("sale menu rejects empty/locked products and limits all future random orders while preserving pending requests", () => {
  const s = rich();
  assert.equal(setSaleMenu(s, []), false);
  assert.equal(setSaleMenu(s, ["fishpie"]), false);
  assert.equal(setSaleMenu(s, ["loaf", "loaf"]), false);
  assert.ok(setSaleMenu(s, ["honeybread"]));
  s.shop.open = true;
  for (const random of [() => 0, () => 0.5, () => 0.9999]) {
    s.shop.customer = null;
    assert.ok(tickShop(s, 12, [], random));
    assert.equal(s.shop.customer.bread, "honeybread");
    assert.ok(s.shop.customer.quantity >= 1 && s.shop.customer.quantity <= 3);
  }
  const pending = structuredClone(s.shop.customer);
  assert.ok(setSaleMenu(s, ["loaf"]));
  assert.deepEqual(s.shop.customer, pending);
  assert.deepEqual(validate(s).shop.menu, ["loaf"]);
});
test("v7 migration preserves bakery progress and grants molds only for previously used products", () => {
  const s = rich();
  s.version = 7;
  delete s.equipment;
  delete s.shop.menu;
  s.items.fishpie = 2;
  s.doughs.berrycookie = 3;
  s.oven = { kind: "baking", phase: "baking", batch: { loaf: 2 }, seconds: 22 };
  const migrated = validate(s);
  assert.equal(migrated.version, 8);
  assert.equal(migrated.equipment.pieMold, true);
  assert.equal(migrated.equipment.cookieMold, true);
  assert.equal(migrated.items.fishpie, 2);
  assert.equal(migrated.doughs.berrycookie, 3);
  assert.equal(migrated.oven.seconds, 22);
  assert.equal(migrated.oven.duration, 60);
  assert.equal(migrated.money, 5000);
  assert.deepEqual(validate(migrated), migrated);
  const unused = fresh();
  unused.version = 7;
  assert.equal(validate(unused).equipment.pieMold, false);
  assert.equal(validate(unused).equipment.cookieMold, false);
});
test("v8 validation rejects malformed equipment/menu/timer/capacity without rewriting valid upgraded saves", () => {
  const s = rich();
  for (const equipment of [
    null,
    { ...s.equipment, pieMold: 1 },
    { ...s.equipment, capacityLevel: 3 },
    { ...s.equipment, speedLevel: 0.5 },
  ])
    assert.throws(() => validate({ ...s, equipment }));
  for (const menu of [[], ["fishpie"], ["loaf", "loaf"], ["bad"]])
    assert.throws(() => validate({ ...s, shop: { ...s.shop, menu } }));
  s.doughs.loaf = 6;
  putInOven(s);
  assert.throws(() => validate({ ...s, oven: { ...s.oven, duration: 1 } }));
  assert.throws(() =>
    validate({ ...s, oven: { ...s.oven, batch: { loaf: 7 } } }),
  );
});
test("workshop door is reachable from the city road and returns outside its obstacle footprint", () => {
  const maps = JSON.parse(
    readFileSync(new URL("../data/worldMaps.json", import.meta.url)),
  );
  configureWorld(maps);
  const s = fresh();
  Object.assign(s, { scene: "city", x: 750, y: 535 });
  const door = nearbyDoor(s);
  assert.equal(door.scene, "workshop");
  assert.ok(enterBuilding(s, door));
  assert.ok(isInterior(s.scene));
  assert.deepEqual(validate(s), s);
  assert.ok(leaveInterior(s));
  assert.equal(s.scene, "city");
  assert.ok(
    !maps.city.obstacles.some(
      (b) => s.x > b.x && s.x < b.x + b.w && s.y > b.y && s.y < b.y + b.h,
    ),
  );
});
