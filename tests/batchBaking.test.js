import { productCounts } from "../src/recipeBook.js";
import test from "node:test";
import assert from "node:assert/strict";
import { fresh, validate } from "../src/saveSystem.js";
import {
  beginDough,
  knead,
  addTopping,
  putInOven,
  tickBaking,
  collectBread,
  nextBatch,
  bakeSeconds,
} from "../src/baking.js";
import { sleepUntilMorning } from "../src/wellbeing.js";
import { showWarehouse } from "../src/ui/screens/bakery.js";
function stock() {
  const s = fresh();
  s.items.flour = 40;
  s.items.yeast = 20;
  s.items.salt = 20;
  s.items.berry = 20;
  s.items.honey = 10;
  return s;
}
function prepare(s, type = "none") {
  assert.ok(beginDough(s));
  for (let i = 0; i < 20; i++) knead(s, 60);
  assert.ok(addTopping(s, type));
}
test("prepared dough queues by type and consumes ingredients/stamina only once per piece", () => {
  const s = stock();
  for (const type of ["none", "none", "honey", "berry"]) prepare(s, type);
  assert.deepEqual(s.doughs, {
    ...productCounts(),
    loaf: 2,
    honeybread: 1,
    berrybread: 1,
  });
  assert.equal(s.baking, null);
  assert.equal(s.oven, null);
  assert.equal(s.stamina, 60);
  assert.equal(s.items.flour, 32);
  assert.equal(s.items.honey, 9);
  assert.equal(s.items.berry, 18);
  assert.equal(addTopping(s, "none"), false);
  let html;
  showWarehouse({
    g: {
      state: s,
      data: {
        recipes: [
          { id: "loaf", name: "밀빵" },
          { id: "honeybread", name: "꿀빵" },
          { id: "berrybread", name: "베리빵" },
        ],
      },
    },
    panel(text) {
      html = text;
    },
  });
  assert.match(html, /밀빵 · 준비 반죽 2개/);
  assert.match(html, /구운 빵 0개/);
});
test("one mixed batch holds up to six and rejects empty, excessive, fractional or unavailable selections atomically", () => {
  const s = stock();
  s.doughs = { ...productCounts(), loaf: 5, honeybread: 2, berrybread: 2 };
  for (const batch of [
    {},
    { ...productCounts(), loaf: 7 },
    { ...productCounts(), loaf: 5, honeybread: 2 },
    { ...productCounts(), loaf: -1 },
    { ...productCounts(), loaf: 1.5 },
    { ...productCounts(), loaf: NaN },
    { ...productCounts(), loaf: Infinity },
    { ...productCounts(), loaf: 6 },
    { unknown: 1 },
    [],
  ]) {
    const before = structuredClone(s);
    assert.equal(putInOven(s, batch), false);
    assert.deepEqual(s, before);
  }
  assert.ok(
    putInOven(s, { ...productCounts(), loaf: 2, honeybread: 2, berrybread: 2 }),
  );
  assert.deepEqual(s.doughs, {
    ...productCounts(),
    loaf: 3,
    honeybread: 0,
    berrybread: 0,
  });
  assert.equal(putInOven(s, { ...productCounts(), loaf: 1 }), false);
  assert.equal(bakeSeconds, 60);
  assert.equal(tickBaking(s, 59.99), false);
  assert.equal(collectBread(s), false);
  assert.equal(tickBaking(s, 0.01), true);
  assert.equal(tickBaking(s, 5), false);
  assert.deepEqual(collectBread(s), {
    ...productCounts(),
    loaf: 2,
    honeybread: 2,
    berrybread: 2,
  });
  assert.deepEqual(s.warehouse, {
    ...productCounts(),
    loaf: 2,
    honeybread: 2,
    berrybread: 2,
  });
  assert.equal(collectBread(s), false);
});
test("next batch leaves extra dough queued and a new dough can be prepared while oven is busy or ready", () => {
  let s = stock();
  s.doughs = { ...productCounts(), loaf: 3, honeybread: 2, berrybread: 2 };
  assert.deepEqual(nextBatch(s), {
    ...productCounts(),
    loaf: 3,
    honeybread: 2,
    berrybread: 1,
  });
  putInOven(s);
  prepare(s);
  assert.equal(s.doughs.loaf, 1);
  assert.equal(s.doughs.berrybread, 1);
  tickBaking(s, 20);
  s = validate(s);
  assert.equal(s.oven.seconds, 20);
  assert.equal(s.doughs.loaf, 1);
  beginDough(s);
  knead(s, 30);
  tickBaking(s, 40);
  assert.equal(s.baking.progress, 2.5);
  assert.equal(s.oven.phase, "ready");
  assert.ok(validate(s));
  collectBread(s);
  assert.equal(s.baking.progress, 2.5);
});
test("legacy kneading and topping keep exact progress; shaped dough migrates once into ready stock", () => {
  for (const [phase, progress] of [
    ["kneading", 33.5],
    ["topping", 100],
  ]) {
    const old = fresh();
    old.version = 5;
    old.baking = { phase, progress, topping: null, seconds: 0 };
    old.money = 123;
    old.stamina = 17;
    const s = validate(old);
    assert.deepEqual(s.baking, { ...old.baking, type: "bread" });
    assert.equal(s.money, 123);
    assert.equal(s.stamina, 17);
    assert.equal(s.oven, null);
  }
  for (const topping of ["none", "honey", "berry"]) {
    const old = fresh();
    old.version = 5;
    old.baking = { phase: "shaped", progress: 100, topping, seconds: 0 };
    const s = validate(old),
      id = { none: "loaf", honey: "honeybread", berry: "berrybread" }[topping];
    assert.equal(s.baking, null);
    assert.equal(s.doughs[id], 1);
    assert.deepEqual(validate(s), s);
    assert.equal(s.warehouse[id], 0);
  }
});
test("legacy baking preserves fraction completed and ready bread remains claimable exactly once", () => {
  for (const version of [3, 4, 5]) {
    const old = fresh();
    old.version = version;
    old.baking = {
      phase: "baking",
      progress: 100,
      topping: "honey",
      seconds: 2,
    };
    let s = validate(old);
    assert.equal(s.version, 7);
    assert.equal(s.oven.seconds, 24);
    assert.equal(s.oven.batch.honeybread, 1);
    assert.equal(s.baking, null);
    tickBaking(s, 36);
    assert.equal(collectBread(s).honeybread, 1);
    assert.equal(collectBread(s), false);
    old.baking = {
      phase: "ready",
      progress: 100,
      topping: "berry",
      seconds: 5,
    };
    s = validate(old);
    assert.equal(s.oven.seconds, 60);
    assert.equal(s.oven.phase, "ready");
    assert.equal(collectBread(s).berrybread, 1);
    assert.equal(collectBread(s), false);
  }
});
test("new queue, working dough and mixed oven survive roundtrip; malformed batch saves are rejected", () => {
  const s = stock();
  s.doughs = { ...productCounts(), loaf: 4, honeybread: 2, berrybread: 1 };
  putInOven(s, { ...productCounts(), loaf: 2, honeybread: 2, berrybread: 1 });
  beginDough(s);
  knead(s, 10);
  tickBaking(s, 32.25);
  assert.deepEqual(validate(s), s);
  for (const edit of [
    (x) => delete x.doughs,
    (x) => (x.doughs.loaf = -1),
    (x) => (x.doughs.loaf = 0.5),
    (x) => (x.doughs.fake = 1),
    (x) => (x.oven.batch.loaf = 7),
    (x) => (x.oven.batch.loaf = NaN),
    (x) => (x.oven.batch = {}),
    (x) => (x.oven.seconds = 61),
    (x) => (x.oven.phase = "ready"),
    (x) => (x.baking.phase = "shaped"),
  ]) {
    const bad = structuredClone(s);
    edit(bad);
    assert.throws(() => validate(bad));
  }
});
test("sleep finishes a whole batch, preserves raw stock and a separately kneaded dough", () => {
  const s = stock();
  s.doughs.loaf = 8;
  putInOven(s, { ...productCounts(), loaf: 6 });
  beginDough(s);
  knead(s, 60);
  sleepUntilMorning(s);
  assert.equal(s.oven.phase, "ready");
  assert.equal(s.baking.progress, 5);
  assert.equal(s.doughs.loaf, 2);
  assert.equal(collectBread(s).loaf, 6);
  assert.equal(s.warehouse.loaf, 6);
});
test("older sparse warehouses gain missing zero counts and collect migrated bread without NaN", () => {
  const old = fresh();
  old.version = 5;
  old.warehouse = { ...productCounts(), loaf: 2 };
  old.baking = { phase: "ready", progress: 100, topping: "honey", seconds: 5 };
  const s = validate(old);
  assert.deepEqual(s.warehouse, {
    ...productCounts(),
    loaf: 2,
    honeybread: 0,
    berrybread: 0,
  });
  collectBread(s);
  assert.deepEqual(s.warehouse, {
    ...productCounts(),
    loaf: 2,
    honeybread: 1,
    berrybread: 0,
  });
});
