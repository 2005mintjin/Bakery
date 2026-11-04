import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fresh, validate } from "../src/saveSystem.js";
import { CivicStory, civicAction, validateCivicStories } from "../src/civicStory.js";
import { talk } from "../src/dialogue.js";
import { recordSale } from "../src/dailyReport.js";
import { advanceClock } from "../src/wellbeing.js";
import { syncGuild, guildSupplies } from "../src/guild.js";
import { receiveParcel } from "../src/shop.js";
import { leaveInterior, isInterior } from "../src/interior.js";
import { configureWorld, enterBuilding, repairPosition } from "../src/sceneManager.js";
const json = (name) => JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url)));
const data = Object.fromEntries(["civicStories", "civicActors", "city", "townStories", "quests", "npcs"].map((key) => [key, json(key)]));
function harness(key, s = fresh()) {
  s.scene = ["martin", "mariaGift"].includes(key) ? (key === "martin" ? "city" : "town") : "hall";
  let shown;
  const ui = { open: true, say(actor, pages, actions, options) { this.open = true; shown = { actor, pages, actions, options }; }, close() { this.open = false; }, notify() {} };
  const g = { state: s, data, ui };
  const actor = key === "martin" ? data.city.residents.find((n) => n.id === "artist") : key === "mariaGift" ? data.npcs.find((n) => n.id === "sora") : undefined;
  const story = new CivicStory(g, key, actor);
  return { g, s, story, get shown() { return shown; }, start() { ui.open = true; story.start(); }, finish() { shown.options.onComplete(); }, choose(label) { const choice = shown.actions.find((c) => c[0] === label); assert.ok(choice, label); assert.ok(!choice[2]); choice[1](); } };
}
test("town hall actors, source lines, graph links and original resources are present", () => {
  assert.ok(validateCivicStories(data.civicStories));
  const all = JSON.stringify(data.civicStories);
  for (const key of ["lotus", "hendel", "adel", "martin"]) {
    const source = readFileSync(new URL(`../data/source/${key}-dialogue.txt`, import.meta.url), "utf8");
    for (const [, quote] of source.matchAll(/"([^"]+)"/g)) {
      assert.ok(all.includes(quote), quote);
    }
    for (const suffix of ["portrait.png", "sd.png"])
      assert.ok(existsSync(new URL(`../assets/characters/residents/${key}-${suffix}`, import.meta.url)));
  }
  const bad = structuredClone(data.civicStories); bad.lotus.nodes.entry.choices[0].next = "absent";
  assert.throws(() => validateCivicStories(bad));
});
test("hall door enters from city and exits at its own door; Harin is replaced with Martin", () => {
  const maps = json("worldMaps"); configureWorld(maps);
  const s = fresh(); s.scene = "city";
  const door = maps.city.doors.find((d) => d.scene === "hall");
  s.x = door.x; s.y = door.y + 45;
  repairPosition(s); assert.equal(s.x, door.x); assert.equal(s.y, door.y + 45);
  assert.ok(enterBuilding(s, door)); assert.ok(isInterior(s.scene));
  leaveInterior(s); assert.equal(s.scene, "city"); assert.equal(s.x, door.x);
  assert.equal(data.city.residents.find((n) => n.id === "artist").name, "마틴");
});
test("Lotus taste unlocks only after reading; gift is unavailable without bread and consumes once", () => {
  const h = harness("lotus"); h.start(); h.choose("도와드릴 게 있나요?"); h.choose("그럼 이장님은 무슨 빵을 제일 좋아하시나요?");
  assert.equal(h.s.civic.lotusTaste, false); h.finish(); assert.equal(h.s.civic.lotusTaste, true);
  assert.equal(h.shown.actions.find((c) => c[0] === "베리 빵 선물하기")[2], true);
  h.s.items.berrybread = 2; h.story.go("menu"); h.choose("베리 빵 선물하기");
  assert.equal(h.s.items.berrybread, 2); const done = h.shown.options.onComplete; done(); done();
  assert.equal(h.s.items.berrybread, 1); assert.equal(h.s.guild.grade, "D");
  h.choose("베리 빵 선물하기"); h.g.ui.close(); h.finish(); assert.equal(h.s.items.berrybread, 1);
});
test("Martin acceptance, misleading report, both Maria replies and final report are atomic and persistent", () => {
  for (const reply of ["마틴 아저씨가 줬어요.", "제가 주는 거에요."]) {
    const h = harness("martin"); h.start(); h.choose("도와드릴 게 있을까요?"); h.choose("제가 전해줄게요!");
    assert.equal(h.s.civic.martinGift, "none"); h.finish(); assert.equal(h.s.civic.martinGift, "carrying");
    h.start(); h.choose("....네."); h.finish(); assert.equal(h.s.civic.martinGift, "carrying");
    const s = validate(h.s), m = harness("mariaGift", s); m.start(); m.choose(reply);
    const finish = m.shown.options.onComplete;
    m.finish(); finish(); assert.equal(s.civic.martinGift, "delivered"); assert.equal(s.quests.martinGift, "active");
    const back = harness("martin", validate(s)); back.start(); back.choose("...유치하대요."); back.finish();
    assert.equal(back.s.civic.martinGift, "done"); assert.equal(back.s.quests.martinGift, "done");
    assert.equal(civicAction(back.s, "acceptGift"), false); assert.equal(civicAction(back.s, "deliverGift"), false);
    back.start(); assert.ok(back.shown.actions.some((c) => c[0] === "마리아 씨랑 잘 지내시나요?"));
  }
});
test("Maria offers gift regardless of her original quest progress and removes it after delivery", () => {
  for (const status of [undefined, "active", "done"]) {
    const h = harness("mariaGift"); h.s.civic.martinGift = "carrying"; h.s.quests.martinGift = "active";
    if (status) h.s.quests.friend = status;
    talk(h.g, data.npcs.find((n) => n.id === "sora"));
    assert.ok(h.shown.actions.some((c) => c[0] === "여기 선물이에요."));
    h.s.civic.martinGift = "delivered";
    talk(h.g, data.npcs.find((n) => n.id === "sora"));
    assert.ok(!h.shown.actions.some((c) => c[0] === "여기 선물이에요."));
    assert.equal(h.s.quests.friend, status);
  }
});
test("closing or changing scene before completion never transfers a gift", () => {
  const h = harness("mariaGift"); h.s.civic.martinGift = "carrying"; h.s.quests.martinGift = "active";
  h.start(); h.choose("마틴 아저씨가 줬어요."); h.g.ui.close(); h.finish();
  assert.equal(h.s.civic.martinGift, "carrying");
  h.start(); h.choose("마틴 아저씨가 줬어요."); h.s.scene = "city"; h.finish();
  assert.equal(h.s.civic.martinGift, "carrying");
});
test("guild counts quantities, evaluates Monday at 06:00 and never uses lifetime revenue", () => {
  const s = fresh(); s.revenue = 999999;
  recordSale(s, "loaf", 35, 560); assert.equal(s.guild.grade, "D");
  s.day = 8; s.minutes = 359; syncGuild(s); assert.equal(s.guild.grade, "D");
  advanceClock(s, 1); assert.equal(s.guild.grade, "C"); assert.equal(s.guild.average, 5);
  assert.deepEqual(s.guild.sales, {});
  advanceClock(s, 7 * 1440); assert.equal(s.guild.grade, "C"); assert.equal(s.guild.average, 0);
});
test("all grade boundaries, zero-sales days and multi-week clock jumps", () => {
  for (const [count, grade] of [[34,"D"],[35,"C"],[69,"C"],[70,"B"],[139,"B"],[140,"A"]]) {
    const s = fresh(); recordSale(s, "honeybread", count, count * 25);
    advanceClock(s, 7 * 1440); assert.equal(s.guild.grade, grade);
    assert.equal(s.guild.average, count / 7);
  }
  const s = fresh(); recordSale(s, "loaf", 140, 2240); advanceClock(s, 21 * 1440);
  assert.equal(s.guild.grade, "A"); assert.equal(s.guild.evaluated, 22); assert.deepEqual(s.guild.sales, {});
});
test("grade supplies preserve once-per-day collection even after a promotion", () => {
  const s = fresh(), flour = s.items.flour;
  assert.ok(receiveParcel(s)); assert.equal(s.items.flour, flour + 4); assert.equal(receiveParcel(s), false);
  s.guild.grade = "A"; assert.equal(receiveParcel(s), false);
  advanceClock(s, 1440);
  const before = structuredClone(s.items), supplies = guildSupplies(s);
  assert.ok(receiveParcel(s));
  for (const [id, n] of Object.entries(supplies)) assert.equal(s.items[id], before[id] + n);
});
test("old saves start tracking from migration day without inventing old sales or changing inventory", () => {
  const old = fresh(); delete old.guild; delete old.civic; old.day = 12; old.revenue = 99999;
  const s = validate(old); assert.equal(s.guild.joinedDay, 12); assert.equal(s.guild.grade, "D");
  assert.deepEqual(s.items, old.items); assert.equal(s.revenue, old.revenue);
  advanceClock(s, 3 * 1440); assert.equal(s.guild.grade, "D");
  recordSale(s, "loaf", 70, 1120); advanceClock(s, 7 * 1440); assert.equal(s.guild.grade, "B");
  assert.deepEqual(validate(s).guild, s.guild);
});
test("corrupt new fields and mismatched quest stages are rejected", () => {
  for (const change of [s => s.civic = null, s => s.civic.martinGift = "fake", s => s.civic.martinGift = "done", s => s.guild.grade = "S", s => s.guild.sales = {"1": -1}, s => s.guild.evaluated = 3, s => s.guild.sales = {"99": 1}]) {
    const s = fresh(); change(s); assert.throws(() => validate(s));
  }
});
test("Adel speaks the current grade and explains evaluation cadence", () => {
  for (const grade of ["D", "C", "B", "A"]) {
    const h = harness("adel"); h.s.guild.grade = grade; h.start(); h.choose("제 조합원 등급은 어떤가요?");
    const text = h.shown.pages.map((p) => p.text).join(" ");
    assert.match(text, new RegExp(grade + " ?등급")); assert.match(text, /월요일 06:00/); assert.match(text, /직전 7영업일/);
  }
});
