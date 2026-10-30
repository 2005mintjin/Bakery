import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fresh, validate } from "../src/saveSystem.js";
import { talk } from "../src/dialogue.js";
import { advanceClock } from "../src/wellbeing.js";
import { workDay } from "../src/dailyReport.js";
import {
  anastasiaStatus,
  chooseDailyBread,
  acceptDailyBread,
  completeDailyBread,
  cancelDailyBread,
  dailyQuestEntry,
} from "../src/anastasiaQuests.js";
import { voicePlan } from "../src/dialogueVoice.js";
const json = (n) =>
  JSON.parse(readFileSync(new URL("../data/" + n + ".json", import.meta.url)));
const data = {
  npcs: json("npcs"),
  quests: json("quests"),
  townStories: json("townStories"),
  recipes: json("recipes"),
};
function game(s = fresh()) {
  let shown,
    closed = 0;
  const g = {
    state: s,
    data,
    ui: {
      say(actor, pages, actions, options) {
        shown = { actor, pages, actions, options };
      },
      close() {
        closed++;
      },
      notify() {},
    },
  };
  return {
    g,
    start: () => talk(g, data.npcs[0]),
    get shown() {
      return shown;
    },
    get closed() {
      return closed;
    },
    finish() {
      shown.options.onComplete();
    },
    choose(label) {
      const c = shown.actions.find((c) => c[0] === label);
      assert.ok(c, label);
      c[1]();
    },
  };
}
test("Anastasia preserves the legacy NPC/quest IDs and supplied lines, SD, portrait and voice", () => {
  const n = data.npcs[0],
    c = json("customers")[0],
    story = data.townStories.mira,
    config = json("voices");
  assert.equal(n.id, "mira");
  assert.equal(n.name, "아나스타샤");
  assert.equal(n.quest, "delivery");
  assert.equal(c.name, n.name);
  assert.equal(c.spriteAsset, n.spriteAsset);
  assert.notEqual(n.spriteAsset, n.portraitAsset);
  for (const f of [
    n.spriteAsset,
    n.portraitAsset,
    config.speakers.anastasia.asset,
  ])
    assert.ok(existsSync(new URL("../" + f, import.meta.url)));
  const pages = Object.values(story.nodes)
    .flatMap((n) => n.pages || [])
    .map((p) => p.text)
    .join("\n");
  const source = readFileSync(
    new URL("../data/source/anastasia-dialogue.txt", import.meta.url),
    "utf8",
  );
  for (const [, line] of source.matchAll(/"([^"]+)"/g)) {
    if (line.includes("{*"))
      assert.ok(pages.includes("그럼.. {bread}(으)로 주세요."));
    else assert.ok(pages.includes(line), line);
  }
  assert.deepEqual(voicePlan({ text: "가. 나" }, n, config), [
    "anastasia",
    null,
    null,
    "anastasia",
  ]);
  assert.ok(voicePlan({ text: "...." }, n, config).every((k) => k === null));
  assert.ok(
    voicePlan({ text: "잠시 생각한다.", kind: "narration" }, n, config).every(
      (k) => k === null,
    ),
  );
});
test("initial offer is accepted after all pages; decline, wait, cancel and missing bread cost nothing", () => {
  const t = game(),
    s = t.g.state;
  t.start();
  t.choose("..네, 그럼 이만.");
  assert.equal(t.closed, 1);
  assert.equal(s.quests.delivery, undefined);
  t.start();
  t.choose("네, 맞아요. 무슨 부탁이 있으시죠?");
  assert.equal(t.shown.pages.length, 4);
  assert.equal(s.quests.delivery, undefined);
  t.start();
  assert.equal(s.quests.delivery, undefined);
  t.choose("네, 맞아요. 무슨 부탁이 있으시죠?");
  t.finish();
  assert.equal(s.quests.delivery, "active");
  t.start();
  t.choose("그럼요.");
  assert.match(t.shown.pages[0].text, /아직 밀빵/);
  assert.equal(s.money, 60);
  assert.equal(s.quests.delivery, "active");
  t.start();
  t.choose("아직 준비중이에요.");
  assert.equal(t.shown.pages[0].text, "그럼 기다리죠, 뭐.");
  t.finish();
  t.start();
  t.choose("오늘은 못 갖다드리겠네요.");
  assert.equal(s.quests.delivery, undefined);
});
test("reading thanks completes once, preserves affinity and unlocks both after-quest conversation loops", () => {
  const t = game(),
    s = t.g.state;
  s.quests.delivery = "active";
  s.items.loaf = 1;
  s.affinity.mira = 3;
  t.start();
  t.choose("그럼요.");
  assert.equal(s.items.loaf, 1);
  assert.equal(s.quests.delivery, "active");
  const complete = t.shown.options.onComplete;
  complete();
  complete();
  assert.equal(s.items.loaf, 0);
  assert.equal(s.money, 95);
  assert.equal(s.affinity.mira, 4);
  assert.equal(s.quests.delivery, "done");
  assert.equal(s.anastasia.introDay, 1);
  assert.equal(s.dailyLedger.rewards, 35);
  t.start();
  t.choose("그럼 동생은 지어낸 건가요?");
  assert.equal(t.shown.pages.length, 2);
  t.finish();
  assert.equal(t.shown.pages[0].text, "역시 갓 구운 빵이 최고네요.");
  t.choose("빵을 정말 좋아하시나 보네요.");
  assert.equal(t.shown.pages.length, 3);
  t.finish();
  assert.equal(s.money, 95);
});
function done() {
  const s = fresh();
  s.quests.delivery = "done";
  s.anastasia.introDay = 1;
  s.day = 2;
  return s;
}
test("daily request chooses only unlocked foods, fixes its item after reading and survives save/load", () => {
  const s = done();
  for (const r of [0, 0.3, 0.6, 1])
    assert.ok(
      ["loaf", "honeybread", "berrybread"].includes(
        chooseDailyBread(s, () => r),
      ),
    );
  s.equipment.pieMold = true;
  s.equipment.cookieMold = true;
  assert.equal(
    chooseDailyBread(s, () => 1),
    "chococookie",
  );
  assert.equal(acceptDailyBread(s, "unknown"), false);
  assert.ok(acceptDailyBread(s, "fishpie"));
  assert.equal(acceptDailyBread(s, "loaf"), false);
  const loaded = validate(s);
  assert.equal(loaded.anastasia.daily.product, "fishpie");
  assert.equal(anastasiaStatus(loaded), "active");
  assert.match(
    dailyQuestEntry(loaded, data.recipes)[0].description,
    /생선파이/,
  );
  const t = game(loaded);
  t.start();
  assert.equal(t.shown.pages[0].text, "갓 구운 빵은 가져오셨을까요?");
  t.choose("당연하죠, 여기 있어요.");
  assert.match(t.shown.pages[0].text, /생선파이/);
  assert.equal(loaded.money, 60);
});
test("daily turn-in pays recipe price and affinity once, supports cancel/retry, expires and resets at 06:00", () => {
  const s = done();
  assert.ok(acceptDailyBread(s, "loaf"));
  assert.equal(completeDailyBread(s, data.recipes), false);
  assert.ok(cancelDailyBread(s));
  assert.equal(completeDailyBread(s, data.recipes), false);
  assert.ok(acceptDailyBread(s, "honeybread"));
  s.items.honeybread = 2;
  assert.ok(completeDailyBread(s, data.recipes));
  assert.equal(completeDailyBread(s, data.recipes), false);
  assert.equal(s.money, 85);
  assert.equal(s.items.honeybread, 1);
  assert.equal(s.affinity.mira, 1);
  assert.equal(acceptDailyBread(s, "loaf"), false);
  s.minutes = 1439;
  advanceClock(s, 2);
  assert.equal(workDay(s), 2);
  assert.equal(anastasiaStatus(s), "done");
  s.minutes = 360;
  assert.equal(anastasiaStatus(s), undefined);
  assert.ok(acceptDailyBread(s, "loaf"));
  const t = game(s);
  t.start();
  t.choose("아직 굽고 있어요.");
  t.finish();
  t.start();
  t.choose("오늘은 못 드리겠네요.");
  assert.equal(s.anastasia.daily.status, "active");
  t.finish();
  assert.equal(s.anastasia.daily.status, "cancelled");
  assert.equal(s.money, 85);
});
test("daily offer commits only after its two pages; after-daily thanks and special-bread loops work", () => {
  const t = game(done()),
    s = t.g.state;
  t.start();
  t.choose("아직 빵을 굽는 중인걸요.");
  assert.equal(t.shown.pages[0].text, "아, 그런가요...");
  t.finish();
  t.start();
  t.choose("당연하죠, 무슨 빵으로 드릴까요?");
  assert.equal(s.anastasia.daily, null);
  assert.equal(t.shown.pages.length, 2);
  assert.ok(!t.shown.pages[0].text.includes("{bread}"));
  t.finish();
  const item = s.anastasia.daily.product;
  s.items[item] = 1;
  t.start();
  t.choose("당연하죠, 여기 있어요.");
  assert.equal(s.anastasia.daily.status, "active");
  t.finish();
  assert.equal(s.anastasia.daily.status, "done");
  t.start();
  t.choose("고마워요.");
  assert.equal(t.shown.pages.length, 2);
  t.finish();
  t.choose("그냥 저희 빵집에서 사 가면 안 될까요?");
  assert.equal(t.shown.pages.length, 3);
  t.finish();
  assert.equal(t.shown.pages[0].text, "오늘도 맛있는 갓 구운 빵이었네요...");
});
test("legacy completed/active saves keep progress, customer order and economy; malformed daily states reject", () => {
  for (const status of ["active", "done"]) {
    const s = fresh();
    delete s.anastasia;
    s.quests.delivery = status;
    s.affinity.mira = 5;
    s.money = 123;
    s.items.loaf = 4;
    s.shop.customer = {
      name: "미라",
      portrait: "mira",
      bread: "loaf",
      quantity: 3,
      phase: "waiting",
      arrival: 1.2,
    };
    const loaded = validate(s);
    assert.equal(loaded.shop.customer.name, "아나스타샤");
    assert.equal(loaded.shop.customer.quantity, 3);
    assert.equal(loaded.money, 123);
    assert.equal(loaded.items.loaf, 4);
    assert.equal(loaded.affinity.mira, 5);
    assert.equal(loaded.quests.delivery, status);
    assert.equal(loaded.anastasia.introDay, status === "done" ? 1 : null);
    assert.deepEqual(validate(loaded), loaded);
  }
  const s = done();
  acceptDailyBread(s, "loaf");
  for (const patch of [
    { day: 99 },
    { product: "fake" },
    { status: "fake" },
    { day: 1 },
  ])
    assert.throws(() =>
      validate({
        ...s,
        anastasia: {
          ...s.anastasia,
          daily: { ...s.anastasia.daily, ...patch },
        },
      }),
    );
  for (const a of [
    null,
    [],
    { introDay: -1, daily: null },
    { introDay: 1, daily: [] },
  ])
    assert.throws(() => validate({ ...s, anastasia: a }));
});
