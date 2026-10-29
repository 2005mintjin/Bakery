import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fresh, validate } from "../src/saveSystem.js";
import { talk } from "../src/dialogue.js";
import { TownStory, validateTownStories } from "../src/townStory.js";
import { drawResident } from "../src/residentArt.js";
const json = (name) =>
  JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url)));
const stories = json("townStories"),
  npcs = json("npcs"),
  quests = json("quests");
function game(id, state = fresh()) {
  let shown,
    closed = 0;
  const g = {
    state,
    data: { townStories: stories, npcs, quests },
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
  const npc = npcs.find((n) => n.id === id);
  return {
    g,
    npc,
    start() {
      return talk(g, npc);
    },
    get shown() {
      return shown;
    },
    get closed() {
      return closed;
    },
    choose(label) {
      const choice = shown.actions.find((c) => c[0] === label);
      assert.ok(choice, label);
      choice[1]();
    },
    finish() {
      shown.options.onComplete();
    },
  };
}
test("all supplied resident quotes, choices, links and distinct original PNGs are included", () => {
  assert.ok(validateTownStories(stories));
  for (const [id, file] of [
    ["sora", "maria-dialogue.txt"],
    ["jun", "isidoro-dialogue.txt"],
  ]) {
    const source = readFileSync(
      new URL("../data/source/" + file, import.meta.url),
      "utf8",
    );
    const text = Object.values(stories[id].nodes)
      .flatMap((n) => n.pages || [])
      .map((p) => p.text)
      .join("\n");
    for (const [, line] of source.matchAll(/"([^"]+)"/g))
      assert.ok(text.includes(line), line);
    const labels = Object.values(stories[id].nodes)
      .flatMap((n) => n.choices || [])
      .map((c) => c.label);
    for (const [, label] of source.matchAll(/\[([^\]]+)\]/g))
      assert.ok(labels.includes(label), label);
    const npc = npcs.find((n) => n.id === id);
    assert.notEqual(npc.spriteAsset, npc.portraitAsset);
    for (const asset of [npc.spriteAsset, npc.portraitAsset])
      assert.ok(existsSync(new URL("../" + asset, import.meta.url)));
  }
  assert.equal(npcs.find((n) => n.id === "sora").name, "마리아");
  assert.equal(npcs.find((n) => n.id === "jun").name, "이시도로");
  const invalid = structuredClone(stories);
  invalid.sora.nodes.active.choices[0].next = "absent";
  assert.throws(() => validateTownStories(invalid));
});
test("Maria offer accepts after reading, missing bread costs nothing, cancel and retry work", () => {
  const t = game("sora"),
    s = t.g.state;
  t.start();
  t.choose("혹시 좋아하는 빵이 있나요?");
  assert.equal(s.quests.friend, undefined);
  t.g.ui.close();
  assert.equal(s.quests.friend, undefined);
  t.start();
  t.choose("혹시 좋아하는 빵이 있나요?");
  t.finish();
  assert.equal(s.quests.friend, "active");
  t.start();
  t.choose("여기 있어요.");
  assert.equal(s.money, 60);
  assert.match(t.shown.pages[0].text, /가방에 꿀빵/);
  t.finish();
  t.choose("지금 굽고 있어요.");
  t.finish();
  assert.equal(s.quests.friend, "active");
  t.start();
  t.choose("아쉽게도 없네요.");
  assert.equal(s.quests.friend, undefined);
  assert.equal(s.money, 60);
  t.start();
  t.choose("혹시 좋아하는 빵이 있나요?");
  t.finish();
  s.items.honeybread = 1;
  t.start();
  t.choose("여기 있어요.");
  assert.equal(s.items.honeybread, 0);
  assert.equal(s.money, 80);
  assert.equal(s.quests.friend, "done");
  assert.equal(s.affinity.sora, 1);
  const story = new TownStory(t.g, t.npc);
  story.go("complete");
  assert.equal(s.money, 80);
  t.start();
  t.choose("요즘 어떻게 지내시나요?");
  t.choose("그럼 입양은 어때요?");
  assert.equal(t.shown.pages.length, 3);
  t.finish();
  t.start();
  t.choose("요즘 어떻게 지내시나요?");
  t.choose("강아지는 어때요?");
  assert.equal(t.shown.pages.length, 4);
});
test("Isidoro has both farming offers, waits without consuming, and rewards three berries once", () => {
  for (const choice of ["잘 되고 있어요.", "아직 아무것도 안 심었는걸요."]) {
    const t = game("jun"),
      s = t.g.state;
    t.start();
    t.choose(choice);
    t.finish();
    assert.equal(s.quests.berries, "active");
    assert.equal(s.items.berrySeeds, 2);
    t.start();
    t.choose("아직이에요.");
    assert.equal(t.shown.pages.length, 2);
    t.finish();
    t.start();
    t.choose("베리 여기 있어요.");
    assert.equal(s.money, 60);
    assert.equal(s.quests.berries, "active");
    s.items.berry = 3;
    t.start();
    t.choose("베리 여기 있어요.");
    assert.equal(s.items.berry, 0);
    assert.equal(s.money, 80);
    assert.equal(s.affinity.jun, 1);
    new TownStory(t.g, t.npc).go("complete");
    assert.equal(s.money, 80);
    for (const label of ["그럼요.", "씨앗 더 없나요?", "글쎄요."]) {
      t.start();
      t.choose(label);
      assert.ok(t.shown.pages.length);
      t.finish();
    }
  }
});
test("existing active and done quest IDs and affinity survive save/load without duplicated rewards", () => {
  const s = fresh();
  s.quests = { friend: "done", berries: "active", delivery: "done" };
  s.affinity = { sora: 2, jun: 3 };
  s.money = 250;
  const loaded = validate(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(loaded, s);
  const m = game("sora", loaded);
  m.start();
  assert.equal(m.shown.pages[0].text, "안녕, 오늘도 빵 냄새가 나네.");
  const j = game("jun", loaded);
  j.start();
  assert.equal(j.shown.pages[0].text, "그래, 농사는 잘 됐나?");
  assert.equal(loaded.money, 250);
});
test("SD art draws from its alpha bounds with feet anchored and a common height", () => {
  for (const npc of npcs.filter((n) => n.spriteAsset)) {
    const image = {},
      calls = [],
      r = {
        residentArt: new Map([[npc.id, image]]),
        oval() {},
        c: {
          drawImage(...args) {
            calls.push(args);
          },
        },
      };
    assert.equal(drawResident(r, npc), true);
    const [img, sx, sy, sw, sh, x, y, w, h] = calls[0];
    assert.equal(img, image);
    assert.deepEqual([sx, sy, sw, sh], npc.spriteBounds);
    assert.equal(y + h, npc.y);
    assert.equal(x + w / 2, npc.x);
    assert.equal(h, 64);
  }
  assert.equal(drawResident({}, npcs[0]), false);
});
