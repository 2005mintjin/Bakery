import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fresh, validate } from "../src/saveSystem.js";
import {
  beginDough,
  knead,
  addTopping,
  putInOven,
  tickBaking,
  collectBread,
} from "../src/baking.js";
import { plant, water, harvest, cropStage } from "../src/garden.js";
import { buyItem } from "../src/bakery.js";
import { tickShop, serve } from "../src/shop.js";
import { configureWorld, transition } from "../src/sceneManager.js";
const recipes = JSON.parse(
    readFileSync(new URL("../data/recipes.json", import.meta.url)),
  ),
  goods = JSON.parse(
    readFileSync(new URL("../data/storeItems.json", import.meta.url)),
  );
function finishKnead(s) {
  for (let i = 0; i < 20; i++) knead(s, 60);
}
test("three breads require dough, mouse work, topping and oven before collection exactly once", () => {
  for (const [topping, id] of [
    ["none", "loaf"],
    ["honey", "honeybread"],
    ["berry", "berrybread"],
  ]) {
    const s = fresh();
    s.items.berry = 2;
    const initial = structuredClone(s.items);
    assert.equal(putInOven(s), false);
    assert.equal(collectBread(s), false);
    assert.ok(beginDough(s));
    assert.equal(beginDough(s), false);
    assert.equal(s.items.flour, initial.flour - 2);
    assert.equal(s.items.yeast, initial.yeast - 1);
    assert.equal(s.items.salt, initial.salt - 1);
    assert.equal(addTopping(s, topping), false);
    finishKnead(s);
    assert.equal(s.baking.phase, "topping");
    assert.ok(addTopping(s, topping));
    assert.equal(addTopping(s, topping), false);
    assert.ok(putInOven(s));
    assert.equal(tickBaking(s, 59), false);
    assert.equal(collectBread(s), false);
    assert.ok(tickBaking(s, 1));
    assert.equal(collectBread(s)[id], 1);
    assert.equal(s.warehouse[id], 1);
    assert.equal(collectBread(s), false);
    assert.equal(s.items.honey, initial.honey - (topping === "honey" ? 1 : 0));
    assert.equal(s.items.berry, initial.berry - (topping === "berry" ? 2 : 0));
  }
});
test("missing dough and topping ingredients do not get spent, movement work is capped", () => {
  const s = fresh();
  s.items.yeast = 0;
  const before = structuredClone(s);
  assert.equal(beginDough(s), false);
  assert.deepEqual(s, before);
  s.items.yeast = 1;
  beginDough(s);
  assert.equal(knead(s, Infinity), false);
  assert.equal(knead(s, -1), false);
  knead(s, 9000);
  assert.equal(s.baking.progress, 5);
  finishKnead(s);
  s.items.honey = 0;
  assert.equal(addTopping(s, "honey"), false);
  assert.equal(s.baking.phase, "topping");
  assert.ok(addTopping(s, "none"));
});
test("every dough stage survives save validation and a bake resumes from saved seconds", () => {
  let s = fresh();
  beginDough(s);
  knead(s, 30);
  s = validate(s);
  assert.equal(s.baking.progress, 2.5);
  finishKnead(s);
  assert.equal(validate(s).baking.phase, "topping");
  addTopping(s, "honey");
  assert.equal(validate(s).doughs.honeybread, 1);
  assert.equal(s.baking, null);
  putInOven(s);
  tickBaking(s, 2);
  s = validate(s);
  assert.equal(s.oven.seconds, 2);
  tickBaking(s, 58);
  assert.equal(validate(s).oven.phase, "ready");
  const bad = fresh();
  bad.baking = { phase: "ready", progress: 0, topping: "none", seconds: 5 };
  assert.throws(() => validate(bad));
});
test("v2 migration keeps old progress and adds starters once", () => {
  const old = fresh();
  old.version = 2;
  delete old.baking;
  delete old.garden;
  delete old.items.yeast;
  delete old.items.salt;
  delete old.items.berrySeeds;
  old.money = 123;
  old.quests.delivery = "done";
  old.warehouse.loaf = 4;
  old.shop.customer = { name: "이웃", bread: "loaf" };
  let s = validate(old);
  assert.equal(s.version, 8);
  assert.equal(s.money, 123);
  assert.equal(s.quests.delivery, "done");
  assert.equal(s.warehouse.loaf, 4);
  assert.equal(s.items.yeast, 6);
  assert.equal(s.items.salt, 6);
  assert.equal(s.items.berrySeeds, 2);
  assert.equal(s.shop.customer.phase, "waiting");
  s.items.salt = 1;
  assert.equal(validate(s).items.salt, 1);
});
test("each ingredient and seed is sold individually; unaffordable purchases change nothing", () => {
  assert.deepEqual(
    goods.map((g) => g.id),
    [
      "flour",
      "yeast",
      "salt",
      "honey",
      "berrySeeds",
      "water",
      "sugar",
      "butter",
      "meat",
      "fish",
      "chocolate",
    ],
  );
  for (const item of goods) {
    const s = fresh(),
      items = structuredClone(s.items);
    assert.ok(buyItem(s, item));
    assert.equal(s.money, 60 - item.price);
    assert.equal(s.items[item.id], items[item.id] + 1);
    for (const k of Object.keys(items))
      if (k !== item.id) assert.equal(s.items[k], items[k]);
    s.money = 0;
    const before = structuredClone(s);
    assert.equal(buyItem(s, item), false);
    assert.deepEqual(s, before);
  }
});
test("crops require a seed and watering, grow in game time, yield eight berries only once", () => {
  const s = fresh();
  assert.equal(plant(s, -1), false);
  assert.equal(plant(s, 6), false);
  assert.ok(plant(s, 0));
  assert.equal(s.items.berrySeeds, 1);
  assert.equal(plant(s, 0), false);
  s.minutes += 300;
  assert.equal(cropStage(s, 0), "dry");
  assert.equal(harvest(s, 0), false);
  assert.ok(water(s, 0));
  assert.equal(water(s, 0), false);
  s.minutes += 119;
  assert.equal(cropStage(s, 0), "growing");
  assert.equal(harvest(s, 0), false);
  s.minutes += 1;
  assert.equal(cropStage(s, 0), "ripe");
  const restored = validate(s);
  assert.ok(harvest(restored, 0));
  assert.equal(restored.items.berry, 8);
  assert.equal(harvest(restored, 0), false);
  assert.equal(cropStage(restored, 0), "empty");
  assert.equal(s.items.berry, 0);
});
test("knock precedes customer appearance and service, and the portrait survives saves", () => {
  const s = fresh();
  s.shop.open = true;
  s.display.loaf = 1;
  assert.ok(tickShop(s, 12, [], () => 0));
  assert.equal(s.shop.customer.phase, "knocking");
  assert.equal(serve(s, recipes), false);
  tickShop(s, 0.6);
  assert.equal(s.shop.customer.phase, "knocking");
  tickShop(s, 0.6);
  assert.equal(s.shop.customer.phase, "waiting");
  assert.equal(validate(s).shop.customer.portrait, "mira");
  assert.ok(serve(s, recipes));
  assert.equal(s.money, 76);
  assert.equal(serve(s, recipes), false);
});
test("western route leads to berry field and returns to town", () => {
  configureWorld(
    JSON.parse(
      readFileSync(new URL("../data/worldMaps.json", import.meta.url)),
    ),
  );
  const s = fresh();
  s.x = 35;
  s.y = 310;
  assert.ok(transition(s));
  assert.equal(s.scene, "field");
  assert.equal(validate(s).scene, "field");
  s.x = 925;
  assert.ok(transition(s));
  assert.equal(s.scene, "town");
  assert.equal(s.x, 48);
});
