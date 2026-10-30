import test from "node:test";
import assert from "node:assert/strict";
import { fresh, validate } from "../src/saveSystem.js";
import { serve } from "../src/shop.js";
import { buyItem } from "../src/bakery.js";
import { buyEquipment, upgradeOven } from "../src/equipment.js";
import { buyRefreshment, advanceClock } from "../src/wellbeing.js";
import { accept, complete } from "../src/quest.js";
import { dayReport, workDay } from "../src/dailyReport.js";
import { settleNight } from "../src/nightSettlement.js";
import { putInOven, tickBaking } from "../src/baking.js";
import { showSleep } from "../src/ui/screens/rest.js";
const recipes = [
  { id: "loaf", price: 12 },
  { id: "honeybread", price: 20 },
];
function sale(s, id, quantity) {
  s.display[id] = quantity;
  s.shop.customer = { bread: id, quantity, phase: "waiting" };
  assert.ok(serve(s, recipes));
}
test("successful sales, rewards and separate supplies/cafe/molds/upgrades enter daily settlement once", () => {
  const s = fresh();
  s.money = 2000;
  s.stamina = 0;
  sale(s, "loaf", 3);
  sale(s, "honeybread", 2);
  assert.equal(serve(s, recipes), false);
  assert.ok(buyItem(s, { id: "flour", price: 10, quantity: 2 }));
  assert.equal(buyRefreshment(s, { price: 15, stamina: 20 }), "bought");
  assert.ok(buyEquipment(s, "pieMold"));
  assert.equal(buyEquipment(s, "pieMold"), false);
  assert.ok(upgradeOven(s, "speed"));
  const q = { id: "delivery", reward: 30 };
  accept(s, q);
  assert.ok(complete(s, q));
  assert.equal(complete(s, q), false);
  assert.deepEqual(dayReport(s), {
    day: 1,
    sales: 76,
    rewards: 30,
    expenses: 375,
    customers: 2,
    sold: { loaf: 3, honeybread: 2 },
  });
  assert.equal(s.money, 2000 + 76 + 30 - 375);
  const saved = validate(s);
  assert.deepEqual(dayReport(saved), dayReport(s));
});
test("failed payments and missing stock never alter the daily report", () => {
  const s = fresh();
  s.money = 0;
  s.stamina = 100;
  assert.equal(buyItem(s, { id: "flour", price: 10, quantity: 1 }), false);
  assert.equal(buyRefreshment(s, { price: 15, stamina: 20 }), "full");
  assert.equal(buyEquipment(s, "pieMold"), false);
  assert.equal(upgradeOven(s, "speed"), false);
  s.shop.customer = { bread: "loaf", quantity: 3, phase: "waiting" };
  assert.equal(serve(s, recipes), false);
  assert.equal(s.dailyLedger, null);
  assert.equal(dayReport(s).sales, 0);
});
test("late-night orders stay in the same working day and a fresh day begins at 06:00", () => {
  const s = fresh();
  s.minutes = 1438;
  sale(s, "loaf", 1);
  advanceClock(s, 5);
  assert.equal(s.day, 2);
  assert.equal(workDay(s), 1);
  sale(s, "loaf", 2);
  assert.equal(dayReport(s).sales, 36);
  assert.equal(dayReport(s).customers, 2);
  s.minutes = 360;
  assert.equal(dayReport(s).sales, 0);
  sale(s, "honeybread", 1);
  assert.equal(dayReport(s).day, 2);
  assert.equal(dayReport(s).sales, 20);
});
test("retirement snapshots totals, advances once, restores sleep and leaves the oven claimable", () => {
  const s = fresh();
  s.scene = "bakery";
  s.money = 500;
  s.minutes = 1320;
  s.stamina = 5;
  sale(s, "loaf", 2);
  buyItem(s, { id: "salt", price: 8, quantity: 1 });
  s.shop.open = true;
  s.shop.customer = { phase: "waiting", bread: "loaf" };
  s.doughs.loaf = 1;
  assert.ok(putInOven(s, { loaf: 1 }));
  tickBaking(s, 1);
  const report = settleNight(s);
  assert.equal(report.day, 1);
  assert.equal(report.sales, 24);
  assert.equal(report.expenses, 8);
  assert.equal(report.money, 516);
  assert.equal(report.rest.duration, 480);
  assert.equal(report.rest.recovered, 95);
  assert.equal(s.day, 2);
  assert.equal(s.minutes, 360);
  assert.equal(s.stamina, 100);
  assert.equal(s.shop.open, false);
  assert.equal(s.shop.customer, null);
  assert.equal(s.oven.phase, "ready");
  assert.equal(dayReport(s).sales, 0);
  assert.deepEqual(validate(s).lastNight, report);
  sale(s, "honeybread", 1);
  assert.equal(report.sales, 24);
  assert.equal(dayReport(s).sales, 20);
});
test("sleep confirmation is cancellable and double activation cannot skip an extra day", () => {
  const s = fresh();
  s.scene = "bakery";
  s.minutes = 1200;
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
  const before = structuredClone(s);
  showSleep(ui);
  assert.deepEqual(s, before);
  const confirm = actions[0][1];
  confirm();
  confirm();
  assert.equal(shown, "nightReport");
  assert.equal(s.day, 2);
  const outside = fresh();
  assert.equal(settleNight(outside), null);
});
test("old saves preserve money/revenue and add empty reports; malformed report saves are rejected", () => {
  const old = fresh();
  old.money = 150;
  old.revenue = 500;
  delete old.dailyLedger;
  delete old.lastNight;
  const s = validate(old);
  assert.equal(s.money, 150);
  assert.equal(s.revenue, 500);
  assert.equal(s.dailyLedger, null);
  assert.equal(s.lastNight, null);
  s.scene = "bakery";
  settleNight(s);
  for (const patch of [
    { sales: -1 },
    { sold: { unknown: 2 } },
    { customers: 0.5 },
    { day: 999 },
  ])
    assert.throws(() =>
      validate({ ...s, dailyLedger: { ...s.dailyLedger, ...patch } }),
    );
  for (const patch of [
    { money: -1 },
    { wakeDay: 999 },
    { rest: { duration: 480, recovered: 101, stamina: 100 } },
  ])
    assert.throws(() =>
      validate({ ...s, lastNight: { ...s.lastNight, ...patch } }),
    );
});
