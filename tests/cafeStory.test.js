import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fresh, validate } from "../src/saveSystem.js";
import { openStaffDialogue, hasStaffAccess } from "../src/serviceDialogue.js";
import { validateStaffStories } from "../src/staffStory.js";
import { showCafe } from "../src/ui/screens/cafe.js";
import { drawStaff } from "../src/staffArt.js";
import { configureWorld } from "../src/sceneManager.js";
const json = (name) =>
  JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url)));
const stories = json("staffStories"),
  service = json("serviceDialogues");
configureWorld(json("worldMaps"));
function session() {
  let shown,
    closed = 0;
  const g = {
    state: fresh(),
    keys: new Set(),
    data: {
      staffStories: stories,
      serviceDialogues: service,
      cafeItems: json("cafeItems"),
    },
    ui: {
      serviceAccess: null,
      say(actor, pages, actions, options) {
        shown = { actor, pages, actions, options };
      },
      close() {
        this.serviceAccess = null;
        closed++;
      },
      notify() {},
      show(type) {
        assert.equal(type, "cafe");
        showCafe(this);
      },
      panel(html, actions) {
        shown = { html, actions };
      },
    },
  };
  g.state.scene = "cafe";
  g.ui.g = g;
  return {
    g,
    start() {
      return openStaffDialogue(g, "cafe");
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
test("barista data includes all supplied dialogue, choices and the correct original images", () => {
  assert.ok(validateStaffStories(stories));
  const source = readFileSync(
    new URL("../data/source/barista-dialogue.txt", import.meta.url),
    "utf8",
  );
  const text = Object.values(stories.cafe.nodes)
    .flatMap((n) => n.pages || [])
    .map((p) => p.text)
    .join("\n");
  const choices = Object.values(stories.cafe.nodes)
    .flatMap((n) => n.choices || [])
    .map((c) => c.label);
  for (const [, quote] of source.matchAll(/"([^"]+)"/g))
    assert.ok(text.includes(quote), quote);
  for (const [, label] of source.matchAll(/\[([^\]]+)\]/g))
    assert.ok(choices.includes(label), label);
  assert.equal(service.staff.cafe.name, "데셰네");
  for (const [asset, width, height] of [
    [json("interiorBackgrounds").cafe.asset, 1536, 1024],
    [service.staff.cafe.portraitAsset, 1254, 1254],
  ]) {
    const png = readFileSync(new URL("../" + asset, import.meta.url));
    assert.equal(png.readUInt32BE(16), width);
    assert.equal(png.readUInt32BE(20), height);
  }
  let drawn = false;
  drawStaff(
    {
      c: {
        drawImage() {
          drawn = true;
        },
      },
    },
    { scene: "cafe" },
    service.staff.cafe,
  );
  assert.equal(drawn, false);
});
test("ordering follows the greeting, purchases retain prices/recovery and closing resets access", () => {
  const t = session(),
    s = t.g.state;
  s.stamina = 40;
  showCafe(t.g.ui);
  assert.equal(t.shown.actor.name, "데셰네");
  assert.equal(hasStaffAccess(t.g, "cafe"), false);
  assert.equal(s.money, 60);
  t.choose("주문하기");
  assert.equal(hasStaffAccess(t.g, "cafe"), true);
  assert.match(t.shown.html, /기력 40/);
  t.choose("따뜻한 커피 · 8G");
  assert.equal(s.money, 52);
  assert.equal(s.stamina, 55);
  t.choose("베리 케이크 · 12G");
  assert.equal(s.money, 40);
  assert.equal(s.stamina, 80);
  t.g.ui.close();
  assert.equal(hasStaffAccess(t.g, "cafe"), false);
  showCafe(t.g.ui);
  assert.equal(t.shown.pages[0].text, "안녕하심까.");
  assert.deepEqual(validate(s), s);
});
test("Crema, other-menu and brunch replies return to conversation topics in the specified order", () => {
  const t = session();
  t.start();
  t.choose("말 걸어보기");
  t.choose("빨간 머리 아주머니는 어디 계시나요?");
  assert.equal(t.shown.pages.length, 7);
  assert.match(t.shown.pages.at(-1).text, /검은머리 고양이/);
  t.finish();
  t.choose("다른 메뉴는 안 내나요?");
  assert.equal(t.shown.pages.length, 3);
  t.choose("뭐, 그렇죠.");
  t.choose("다른 메뉴는 안 내나요?");
  t.choose("브런치는 어때요?");
  assert.equal(t.shown.pages.length, 7);
  t.finish();
  assert.ok(t.shown.actions.some((c) => c[0] === "말 없이 바라보기."));
  assert.equal(t.g.state.money, 60);
});
test("all staring stages and every stop choice return to topics, then final stare returns automatically", () => {
  const t = session();
  t.start();
  t.choose("말 걸어보기");
  for (let stopAt = 0; stopAt < 3; stopAt++) {
    t.choose("말 없이 바라보기.");
    for (let i = 0; i < stopAt; i++) t.choose("계속 바라보기.");
    t.choose("그만하기.");
    assert.ok(t.shown.actions.some((c) => c[0] === "다른 메뉴는 안 내나요?"));
  }
  t.choose("말 없이 바라보기.");
  for (const line of [
    "눈싸움은 잘 못하지 말임다.",
    "제가 그렇게 신기하게 생겼슴까.",
    "커피 안 사먹을 검까.",
  ]) {
    t.choose("계속 바라보기.");
    assert.equal(t.shown.pages[1].text, line);
  }
  t.finish();
  assert.ok(t.shown.actions.some((c) => c[0] === "아무것도 아니에요."));
  assert.equal(t.g.state.stamina, 100);
});
test("goodbye waits until its line is advanced; nothing exits immediately and ESC grants no purchase", () => {
  const t = session();
  t.start();
  t.choose("카페 나오기");
  assert.equal(t.g.state.scene, "cafe");
  assert.equal(t.shown.pages[0].text, "..잘 가십쇼.");
  t.finish();
  assert.equal(t.g.state.scene, "city");
  assert.equal(t.g.state.x, 281);
  t.g.state.scene = "cafe";
  t.start();
  t.choose("말 걸어보기");
  t.choose("아무것도 아니에요.");
  assert.equal(t.g.state.scene, "city");
  t.g.state.scene = "cafe";
  t.start();
  t.g.ui.close();
  assert.equal(t.g.state.scene, "cafe");
  assert.equal(t.g.state.money, 60);
  assert.equal(t.g.state.stamina, 100);
  assert.equal(hasStaffAccess(t.g, "cafe"), false);
});
