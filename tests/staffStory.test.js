import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fresh, validate } from "../src/saveSystem.js";
import { DialogueSequence, characters } from "../src/dialogueSequence.js";
import {
  StaffStory,
  staffEntry,
  validateStaffStories,
} from "../src/staffStory.js";
import { openStaffDialogue, hasStaffAccess } from "../src/serviceDialogue.js";
import { configureWorld } from "../src/sceneManager.js";
const stories = JSON.parse(
    readFileSync(new URL("../data/staffStories.json", import.meta.url)),
  ),
  service = JSON.parse(
    readFileSync(new URL("../data/serviceDialogues.json", import.meta.url)),
  );
configureWorld(
  JSON.parse(readFileSync(new URL("../data/worldMaps.json", import.meta.url))),
);
function game(scene) {
  let shown;
  const g = {
    state: fresh(),
    keys: new Set(),
    data: { serviceDialogues: service, staffStories: stories },
    ui: {
      serviceAccess: null,
      say(actor, pages, actions, options) {
        shown = { actor, pages, actions, options };
      },
      close() {
        this.serviceAccess = null;
      },
      notify() {},
      show(type) {
        shown = { type };
      },
    },
  };
  g.state.scene = scene;
  return {
    g,
    get shown() {
      return shown;
    },
    choose(label) {
      const found = shown.actions.find((x) => x[0] === label);
      assert.ok(found, "Missing choice: " + label);
      found[1]();
    },
    finish() {
      shown.options.onComplete();
    },
  };
}
test("typewriter progresses in complete graphemes; Space reveals a line before advancing it", () => {
  assert.equal(characters("가👩‍🍳나").length, 3);
  const s = new DialogueSequence(["가👩‍🍳나", "두 번째 줄"], {
    hasChoices: true,
  });
  s.tick(28);
  assert.equal(s.text, "가");
  assert.equal(s.advance(), "revealed");
  assert.equal(s.index, 0);
  assert.equal(s.text, "가👩‍🍳나");
  assert.equal(s.advance(), "page");
  assert.equal(s.index, 1);
  assert.equal(s.text, "");
  s.advance();
  assert.equal(s.phase, "ready");
  assert.equal(s.advance(), "choices");
  assert.equal(s.advance(), "choices");
  assert.equal(s.index, 1);
});
test("grouped sisters greeting remains one page; no choices are revealed by typing alone", () => {
  const pages = stories.store.nodes.welcome.pages;
  assert.equal(pages.length, 1);
  const s = new DialogueSequence(pages, { hasChoices: true });
  s.tick(99999);
  assert.equal(s.phase, "ready");
  assert.equal(s.index, 0);
  assert.ok(s.text.includes("첫째: 어서오세요!"));
  assert.ok(s.text.includes("에리나: ... 하세요."));
  s.advance();
  assert.equal(s.phase, "choices");
});
test("all quoted source lines and branch targets are included in the JSON story", () => {
  assert.ok(validateStaffStories(stories));
  for (const [scene, file] of [
    ["post", "post-dialogue.txt"],
    ["store", "store-dialogue.txt"],
  ]) {
    const source = readFileSync(
      new URL("../data/source/" + file, import.meta.url),
      "utf8",
    );
    const emitted = Object.values(stories[scene].nodes)
      .flatMap((n) => n.pages || [])
      .map((p) => p.text)
      .join("\n");
    for (const match of source.matchAll(/"([^"]+)"/g))
      assert.ok(
        emitted.includes(match[1]),
        "Missing supplied line: " + match[1],
      );
  }
  assert.equal(stories.post.nodes.compliment.pages.length, 2);
  assert.equal(stories.post.nodes.sister.pages.length, 3);
  assert.equal(stories.store.nodes["erina-hesitate"].pages.length, 4);
  assert.equal(stories.store.nodes["erina-pet"].pages.length, 3);
});
test("postal signing grants a parcel only after its response is advanced, once per day", () => {
  const t = game("post"),
    s = t.g.state;
  openStaffDialogue(t.g, "post");
  assert.equal(t.shown.pages[0].text, "안녕, 오늘도 소포가 왔던데?");
  t.choose("네, 서명할게요.");
  assert.equal(s.parcelDay, 0);
  assert.equal(s.items.flour, 12);
  t.finish();
  assert.equal(s.parcelDay, 1);
  assert.equal(s.items.flour, 16);
  const story = new StaffStory(t.g, "post");
  story.go("parcel");
  t.finish();
  assert.equal(s.items.flour, 16);
});
test("declining exits; unclaimed parcel remains available on a revisit; chat returns to topics", () => {
  const t = game("post"),
    s = t.g.state;
  openStaffDialogue(t.g, "post");
  t.choose("안녕히 계세요.");
  assert.equal(s.scene, "post");
  t.finish();
  assert.equal(s.scene, "town");
  assert.equal(s.parcelDay, 0);
  s.scene = "post";
  openStaffDialogue(t.g, "post");
  assert.equal(t.shown.pages[0].text, "어머, 못 받은 게 있었니?");
  assert.ok(t.shown.actions.some((x) => x[0] === "네, 서명할게요."));
  t.choose("잡담하기.");
  t.finish();
  t.choose("오늘도 예쁘시네요.");
  assert.equal(t.shown.pages.length, 2);
  t.finish();
  t.choose("저희 누나한테 편지는 안 오나요?");
  assert.equal(t.shown.pages.length, 3);
  t.finish();
  t.choose("아무것도 아니에요.");
  t.finish();
  assert.equal(s.scene, "town");
  s.day++;
  assert.equal(staffEntry(s, "post", stories.post), "first");
});
test("store conversation gates shopping and handles every Erina branch and return", () => {
  const t = game("store"),
    g = t.g;
  openStaffDialogue(g, "store");
  assert.equal(hasStaffAccess(g, "supplies"), false);
  t.choose("말을 걸어본다.");
  t.choose("부모님은 어디 계시니?");
  assert.equal(t.shown.pages.length, 1);
  t.finish();
  t.choose("너네 서로 알아볼 수 있겠어?");
  t.finish();
  t.choose("에리나한테 말을 걸어본다.");
  assert.equal(t.shown.pages[0].text, "....");
  t.choose("에리나한테 말을 걸어본다.");
  assert.equal(t.shown.pages.length, 4);
  t.choose("에리나를 쓰다듬는다.");
  assert.equal(t.shown.pages.length, 3);
  t.finish();
  t.choose("상점을 둘러본다.");
  assert.equal(t.shown.type, "supplies");
  assert.equal(hasStaffAccess(g, "supplies"), true);
  g.ui.close();
  assert.equal(hasStaffAccess(g, "supplies"), false);
  openStaffDialogue(g, "store");
  t.choose("말을 걸어본다.");
  t.choose("에리나한테 말을 걸어본다.");
  t.choose("...미안.");
  t.choose("상점 떠나기");
  assert.equal(g.state.scene, "city");
  assert.equal(g.state.money, 60);
});
test("v3 saves migrate visit records while keeping dough, crop and money; v4 preserves visits", () => {
  const s = fresh();
  s.version = 3;
  delete s.dialogueVisits;
  s.money = 88;
  s.baking = { phase: "kneading", progress: 25, topping: null, seconds: 0 };
  s.garden[2] = { plantedAt: 100, wateredAt: 200 };
  const migrated = validate(s);
  assert.equal(migrated.version, 4);
  assert.deepEqual(migrated.dialogueVisits, { postDay: 0 });
  assert.equal(migrated.money, 88);
  assert.equal(migrated.baking.progress, 25);
  assert.deepEqual(migrated.garden[2], s.garden[2]);
  migrated.dialogueVisits.postDay = 1;
  assert.equal(validate(migrated).dialogueVisits.postDay, 1);
  migrated.dialogueVisits.postDay = -1;
  assert.throws(() => validate(migrated));
});
