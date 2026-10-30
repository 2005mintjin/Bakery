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
import {
  advanceClock,
  sleepPreview,
  sleepUntilMorning,
  buyRefreshment,
  maxStamina,
  doughStaminaCost,
} from "../src/wellbeing.js";
import { daylight, drawDaylight } from "../src/render/daylight.js";
import {
  configureWorld,
  nearbyDoor,
  enterBuilding,
} from "../src/sceneManager.js";
import { isInterior, leaveInterior } from "../src/interior.js";
import { showShop } from "../src/ui/screens/bakery.js";
import { showSleep } from "../src/ui/screens/rest.js";
const json = (file) =>
  JSON.parse(
    readFileSync(new URL("../data/" + file + ".json", import.meta.url)),
  );
configureWorld(json("worldMaps"));
test("16:00 turns golden, 19:00 is night, midnight stays dark and 06:00 clears", () => {
  assert.equal(daylight(14 * 60).darkness, 0);
  assert.equal(daylight(14 * 60).warmth, 0);
  assert.equal(daylight(959).warmth, 0);
  assert.equal(daylight(960).phase, "노을");
  assert.ok(daylight(960).warmth > 0);
  assert.ok(daylight(1080).darkness > daylight(960).darkness);
  assert.equal(daylight(1140).phase, "밤");
  assert.ok(daylight(1140).darkness > 0.5);
  assert.deepEqual(daylight(1440), daylight(0));
  assert.ok(daylight(300).darkness > daylight(330).darkness);
  assert.equal(daylight(360).darkness, 0);
  assert.equal(daylight(360).phase, "낮");
  const calls = [];
  drawDaylight(
    {
      fillRect() {
        calls.push(this.fillStyle);
      },
    },
    1140,
  );
  assert.equal(calls.length, 2);
  assert.match(calls[1], /15,28,65/);
});
test("clock crosses midnight and full days without skipping to 06:00 or restoring stamina", () => {
  const s = fresh();
  s.minutes = 1439;
  s.stamina = 11;
  advanceClock(s, 2);
  assert.equal(s.day, 2);
  assert.equal(s.minutes, 1);
  assert.equal(s.stamina, 11);
  advanceClock(s, 1440 * 2 + 20);
  assert.equal(s.day, 4);
  assert.equal(s.minutes, 21);
  advanceClock(s, -30);
  assert.equal(s.minutes, 21);
});
test("one dough costs 10 stamina exactly once, low stamina or missing ingredients costs nothing", () => {
  const s = fresh();
  assert.equal(s.minutes, 360);
  assert.equal(s.stamina, maxStamina);
  assert.ok(beginDough(s));
  assert.equal(s.stamina, 100 - doughStaminaCost);
  assert.equal(beginDough(s), false);
  assert.equal(s.stamina, 90);
  for (let i = 0; i < 20; i++) knead(s, 60);
  addTopping(s, "none");
  putInOven(s);
  tickBaking(s, 60);
  collectBread(s);
  assert.equal(s.stamina, 90);
  s.stamina = 9;
  const items = structuredClone(s.items);
  assert.equal(beginDough(s), false);
  assert.deepEqual(s.items, items);
  assert.equal(s.stamina, 9);
  s.stamina = 100;
  s.items.salt = 0;
  assert.equal(beginDough(s), false);
  assert.equal(s.stamina, 100);
});
test("sleep recovery is proportional to hours until 06:00 across midnight", () => {
  for (const [minute, duration, recovered, day] of [
    [1320, 480, 100, 2],
    [0, 360, 75, 1],
    [120, 240, 50, 1],
    [300, 60, 12, 1],
  ]) {
    const s = fresh();
    s.minutes = minute;
    s.stamina = 0;
    const before = structuredClone(s);
    assert.equal(sleepPreview(s).duration, duration);
    assert.deepEqual(s, before);
    const result = sleepUntilMorning(s);
    assert.equal(result.recovered, recovered);
    assert.equal(s.stamina, recovered);
    assert.equal(s.minutes, 360);
    assert.equal(s.day, day);
  }
  const s = fresh();
  s.minutes = 120;
  s.stamina = 90;
  sleepUntilMorning(s);
  assert.equal(s.stamina, 100);
});
test("retiring closes shop, cancels pending orders, preserves stock and finishes an oven overnight", () => {
  const s = fresh();
  s.scene = "bakery";
  s.minutes = 1380;
  s.stamina = 15;
  s.shop.open = true;
  s.shop.elapsed = 11;
  s.shop.customer = { name: "마리아" };
  s.display.loaf = 2;
  s.oven = {
    phase: "baking",
    batch: { loaf: 0, honeybread: 1, berrybread: 0 },
    seconds: 1,
  };
  const stock = structuredClone(s.warehouse),
    money = s.money;
  sleepUntilMorning(s);
  assert.equal(s.shop.open, false);
  assert.equal(s.shop.customer, null);
  assert.equal(s.shop.elapsed, 0);
  assert.equal(s.display.loaf, 2);
  assert.equal(s.money, money);
  assert.deepEqual(s.warehouse, stock);
  assert.equal(s.oven.phase, "ready");
  assert.equal(s.scene, "bakery");
  assert.equal(collectBread(s).honeybread, 1);
  assert.equal(s.warehouse.honeybread, 1);
});
test("shop sign offers retirement and cancelling sleep keeps time/stamina unchanged", () => {
  const s = fresh();
  s.scene = "bakery";
  s.shop.open = true;
  s.shop.customer = { phase: "waiting" };
  s.minutes = 1320;
  s.stamina = 10;
  let actions, shown;
  const ui = {
    g: { state: s },
    panel(html, a) {
      actions = a;
    },
    show(type) {
      shown = type;
    },
  };
  showShop(ui);
  actions.find((a) => a[0] === "가게 닫고 퇴근하기")[1]();
  assert.equal(shown, "sleep");
  assert.equal(s.shop.open, false);
  assert.equal(s.shop.customer, null);
  assert.equal(s.minutes, 1320);
  assert.equal(s.stamina, 10);
  showSleep(ui);
  assert.equal(s.minutes, 1320);
  assert.equal(s.stamina, 10);
  assert.equal(actions[0][0], "잠자기 · 오전 6시에 기상");
  s.scene = "field";
  showSleep(ui);
  assert.equal(actions, undefined);
});
test("cafe coffee and dessert charge individually, clamp recovery and reject full or poor purchases", () => {
  const [coffee, dessert] = json("cafeItems"),
    s = fresh();
  s.stamina = 40;
  assert.equal(buyRefreshment(s, coffee), "bought");
  assert.equal(s.stamina, 55);
  assert.equal(s.money, 52);
  assert.equal(buyRefreshment(s, dessert), "bought");
  assert.equal(s.stamina, 80);
  assert.equal(s.money, 40);
  s.stamina = 98;
  assert.equal(buyRefreshment(s, coffee), "bought");
  assert.equal(s.stamina, 100);
  const money = s.money;
  assert.equal(buyRefreshment(s, dessert), "full");
  assert.equal(s.money, money);
  s.money = 0;
  s.stamina = 20;
  assert.equal(buyRefreshment(s, dessert), "poor");
  assert.equal(s.stamina, 20);
  assert.equal(buyRefreshment(s, { price: -5, stamina: 5 }), "invalid");
  assert.equal(s.money, 0);
});
test("cafe doorway, first-person interior, exit and saves work without changing the store door", () => {
  const s = fresh();
  s.scene = "city";
  s.x = 281;
  s.y = 225;
  const door = nearbyDoor(s);
  assert.equal(door.scene, "cafe");
  assert.ok(enterBuilding(s, door));
  assert.equal(isInterior(s.scene), true);
  s.stamina = 47;
  assert.deepEqual(validate(s), s);
  assert.ok(leaveInterior(s));
  assert.equal(s.scene, "city");
  assert.equal(s.x, 281);
  assert.equal(s.y, 270);
});
test("v1-v4 saves gain stamina once while v5 persists fatigue and rejects corrupt stamina", () => {
  for (const version of [1, 2, 3, 4]) {
    const s = fresh();
    s.version = version;
    delete s.stamina;
    s.money = 185;
    s.quests.friend = "done";
    s.items.berry = 11;
    s.minutes = 1300;
    const migrated = validate(s);
    assert.equal(migrated.version, 6);
    assert.equal(migrated.stamina, 100);
    assert.equal(migrated.minutes, 1300);
    assert.equal(migrated.money, 185);
    assert.equal(migrated.items.berry, 11);
    assert.equal(migrated.quests.friend, "done");
    migrated.stamina = 17;
    assert.equal(validate(migrated).stamina, 17);
  }
  for (const bad of [-1, 101, NaN, Infinity, null, undefined])
    assert.throws(() => validate({ ...fresh(), stamina: bad }));
});
