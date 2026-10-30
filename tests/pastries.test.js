import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fresh, validate } from "../src/saveSystem.js";
import { productIds, productCounts, doughTypes } from "../src/recipeBook.js";
import {
  beginDough,
  knead,
  addTopping,
  dryBerries,
  putInOven,
  tickBaking,
  collectBread,
} from "../src/baking.js";
import { chooseOrder, tickShop, serve } from "../src/shop.js";
import { orderText } from "../src/serviceDialogue.js";
import { display, undisplay } from "../src/bakery.js";
import { drawCounter } from "../src/counterArt.js";
const json = (n) =>
    JSON.parse(
      readFileSync(new URL("../data/" + n + ".json", import.meta.url)),
    ),
  recipes = json("recipes"),
  customers = json("customers"),
  dialogues = json("serviceDialogues");
function rich() {
  const s = fresh();
  s.equipment.pieMold = true;
  s.equipment.cookieMold = true;
  for (const key of [
    "flour",
    "yeast",
    "salt",
    "water",
    "sugar",
    "butter",
    "honey",
    "berry",
    "driedberry",
    "fish",
    "meat",
    "chocolate",
  ])
    s.items[key] = 50;
  return s;
}
function shape(s, r) {
  assert.ok(beginDough(s, r.doughType));
  for (let i = 0; i < 20; i++) knead(s, 60);
  assert.ok(addTopping(s, r.finish));
}
test("all nine JSON recipes match dough and filling costs and can produce exactly one item", () => {
  assert.deepEqual(
    recipes.map((r) => r.id),
    productIds,
  );
  for (const r of recipes) {
    const s = rich(),
      before = structuredClone(s.items),
      d = doughTypes[r.doughType],
      finish = d.finishes[r.finish];
    const combined = { ...d.cost };
    for (const [id, n] of Object.entries(finish.cost))
      combined[id] = (combined[id] || 0) + n;
    assert.deepEqual(r.cost, combined, r.id);
    shape(s, r);
    assert.equal(s.doughs[r.id], 1);
    assert.equal(s.stamina, 90);
    for (const [id, n] of Object.entries(r.cost))
      assert.equal(s.items[id], before[id] - n, r.id + " " + id);
    assert.ok(putInOven(s, { [r.id]: 1 }));
    tickBaking(s, 60);
    collectBread(s);
    assert.equal(s.warehouse[r.id], 1);
  }
});
test("missing base or filling ingredients do not spend other materials, and dough groups cannot use another filling", () => {
  const s = rich();
  s.items.water = 0;
  const before = structuredClone(s);
  assert.equal(beginDough(s, "pie"), false);
  assert.deepEqual(s, before);
  s.items.water = 3;
  beginDough(s, "pie");
  for (let i = 0; i < 20; i++) knead(s, 60);
  s.items.sugar = 0;
  const topped = structuredClone(s);
  assert.equal(addTopping(s, "berry"), false);
  assert.deepEqual(s, topped);
  assert.equal(addTopping(s, "chocolate"), false);
  assert.equal(beginDough(s, "__proto__"), false);
});
test("berry drying shares the oven, spends two berries per portion and returns only dried ingredient", () => {
  let s = rich();
  s.items.berry = 12;
  s.doughs.loaf = 1;
  for (const n of [0, 7, 1.5, -1]) assert.equal(dryBerries(s, n), false);
  assert.ok(dryBerries(s, 6));
  assert.equal(s.items.berry, 0);
  assert.equal(putInOven(s, { loaf: 1 }), false);
  assert.equal(dryBerries(s, 1), false);
  tickBaking(s, 27.5);
  s = validate(s);
  assert.equal(s.oven.kind, "drying");
  assert.equal(s.oven.seconds, 27.5);
  assert.equal(collectBread(s), false);
  tickBaking(s, 32.5);
  const before = s.items.driedberry;
  collectBread(s);
  assert.equal(s.items.driedberry, before + 6);
  assert.equal(s.warehouse.driedberry, undefined);
  assert.equal(s.doughs.loaf, 1);
  assert.equal(collectBread(s), false);
});
test("cookie topping uses oven-dried berries; mixed pastry batches preserve the six-piece limit", () => {
  const s = rich();
  s.items.driedberry = 0;
  dryBerries(s, 1);
  tickBaking(s, 60);
  collectBread(s);
  for (const r of recipes.slice(3)) shape(s, r);
  assert.equal(s.items.driedberry, 0);
  assert.ok(putInOven(s));
  assert.equal(
    Object.values(s.oven.batch).reduce((a, b) => a + b, 0),
    6,
  );
  tickBaking(s, 60);
  collectBread(s);
  for (const r of recipes.slice(3)) assert.equal(s.warehouse[r.id], 1);
});
test("orders choose products independently from visitor sequence and quantity varies between one and three", () => {
  const c = customers[0];
  assert.notEqual(
    chooseOrder(c, () => 0),
    chooseOrder(c, () => 0.9999),
  );
  const s = fresh();
  s.shop.open = true;
  for (const quantity of [1, 2, 3]) {
    s.shop.customer = null;
    let i = 0;
    const random = () => [0.4, (quantity - 1) / 3 + 0.001][i++];
    tickShop(s, 12, customers, random);
    assert.equal(s.shop.customer.quantity, quantity);
    assert.ok(productIds.includes(s.shop.customer.bread));
    const saved = validate(s);
    assert.equal(saved.shop.customer.quantity, quantity);
    assert.equal(saved.shop.customer.bread, s.shop.customer.bread);
  }
});
test("cat fish-pie and bear meat-pie preferences increase odds without excluding the rest", () => {
  for (const [person, favorite] of [
    [customers.find((c) => c.portrait === "sora"), "fishpie"],
    [customers.find((c) => c.portrait === "jun"), "meatpie"],
  ]) {
    let seed = 17;
    const counts = productCounts();
    for (let i = 0; i < 6000; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      counts[chooseOrder(person, () => seed / 4294967296)]++;
    }
    assert.ok(counts[favorite] > 1800);
    assert.ok(Object.values(counts).every((n) => n > 100));
  }
});
test("three-piece order is atomic, pays unit price times quantity and cannot be served twice", () => {
  const s = fresh();
  s.shop.customer = {
    name: "사샤",
    portrait: "sasha",
    phase: "waiting",
    arrival: 1.2,
    bread: "fishpie",
    quantity: 3,
  };
  s.display.fishpie = 2;
  const before = structuredClone(s);
  assert.equal(serve(s, recipes), false);
  assert.deepEqual(s, before);
  s.display.fishpie = 3;
  assert.ok(serve(s, recipes));
  assert.equal(s.display.fishpie, 0);
  assert.equal(s.money, 60 + 42 * 3);
  assert.equal(s.revenue, 42 * 3);
  assert.equal(serve(s, recipes), false);
});
test("all ten visitors have matching speech, quantity templates and supplied SD/portrait resources", () => {
  assert.equal(customers.length, 10);
  for (const c of customers) {
    const line = orderText(dialogues, { ...c, bread: "berrypie", quantity: 3 });
    assert.ok(line.includes("베리 파이"));
    assert.ok(line.includes("3"));
    assert.ok(!line.includes("{"));
    assert.ok(existsSync(new URL("../" + c.portraitAsset, import.meta.url)));
    if (c.spriteAsset)
      assert.ok(existsSync(new URL("../" + c.spriteAsset, import.meta.url)));
  }
  assert.match(dialogues.customers.jun.order, /아이/);
  assert.match(dialogues.customers.sora.thanks, /남편/);
  assert.match(dialogues.customers.barista.order, /드림다/);
});
test("v6 save migration preserves original queue, timer, fatigue, quests and one-piece old orders", () => {
  const old = fresh();
  old.version = 6;
  old.doughs = { loaf: 2, honeybread: 1, berrybread: 0 };
  old.oven = { phase: "baking", batch: { loaf: 2 }, seconds: 22 };
  old.baking = { phase: "kneading", progress: 30, topping: null, seconds: 0 };
  old.stamina = 17;
  old.shop.customer = {
    name: "마리아",
    portrait: "sora",
    bread: "loaf",
    phase: "waiting",
    arrival: 1.2,
  };
  old.quests.friend = "done";
  const s = validate(old);
  assert.equal(s.version, 8);
  assert.equal(s.doughs.loaf, 2);
  assert.equal(s.doughs.fishpie, 0);
  assert.equal(s.oven.kind, "baking");
  assert.equal(s.oven.seconds, 22);
  assert.equal(s.baking.type, "bread");
  assert.equal(s.shop.customer.quantity, 1);
  assert.equal(s.stamina, 17);
  assert.equal(s.quests.friend, "done");
  assert.deepEqual(validate(s), s);
});
test("new save validation rejects invalid dough groups, drying batches and order quantities", () => {
  const s = fresh();
  for (const quantity of [0, 4, 1.5])
    assert.throws(() =>
      validate({
        ...s,
        shop: {
          ...s.shop,
          customer: {
            name: "a",
            portrait: "arien",
            bread: "cookie",
            phase: "waiting",
            arrival: 1.2,
            quantity,
          },
        },
      }),
    );
  const bad = rich();
  beginDough(bad);
  bad.baking.type = "__proto__";
  assert.throws(() => validate(bad));
  for (const batch of [
    { driedberry: 7 },
    { driedberry: 0 },
    { driedberry: 1, loaf: 1 },
    { driedberry: 0.5 },
  ])
    assert.throws(() =>
      validate({
        ...s,
        oven: { kind: "drying", phase: "baking", seconds: 0, batch },
      }),
    );
});
test("display quantities and returns preserve real inventory; the filled counter image gets no food overlays", () => {
  const s = fresh();
  s.items.cookie = 3;
  assert.ok(display(s, "cookie", 3));
  assert.equal(s.items.cookie, 0);
  assert.equal(s.display.cookie, 3);
  assert.equal(display(s, "cookie", 1), false);
  assert.ok(undisplay(s, "cookie", 2));
  assert.equal(s.items.cookie, 2);
  assert.equal(s.display.cookie, 1);
  assert.equal(display(s, "water"), false);
  let overlays = 0;
  drawCounter(
    {
      c: {
        drawImage() {
          overlays++;
        },
      },
    },
    s,
  );
  assert.equal(overlays, 0);
});
