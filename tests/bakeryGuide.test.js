import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fresh, validate } from "../src/saveSystem.js";
import { needsBakeryGuide, markBakeryGuideSeen } from "../src/tutorial.js";
import { showBakeryGuide } from "../src/ui/screens/guide.js";
import { customerActor } from "../src/serviceDialogue.js";
import { voicePlan } from "../src/dialogueVoice.js";
const json = (name) =>
  JSON.parse(
    readFileSync(new URL("../data/" + name + ".json", import.meta.url)),
  );
const customers = json("customers"),
  service = json("serviceDialogues"),
  voices = json("voices"),
  guide = json("tutorial");
test("each sister customer reuses exactly her counter SD crop and keeps her own name/voice", () => {
  for (const id of ["arien", "sasha", "erina"]) {
    const person = customers.find((p) => p.portrait === id),
      original = structuredClone(person),
      c = { name: person.name, portrait: id, bread: "loaf", quantity: 2 };
    const actor = customerActor(c, person);
    assert.equal(actor.portraitAsset, person.spriteAsset);
    assert.deepEqual(actor.portraitBounds, person.spriteBounds);
    assert.notEqual(actor.portraitBounds, person.spriteBounds);
    assert.equal(actor.name, person.name);
    assert.deepEqual(voicePlan({ text: "안녕" }, actor, voices), [id, id]);
    assert.deepEqual(person, original);
  }
  assert.ok(!service.staff.store.portraitBounds);
  assert.ok(service.staff.store.portraitAsset.endsWith("/cat-sisters.png"));
  const ryo = customers.find((p) => p.portrait === "post-clerk");
  assert.equal(
    customerActor({ portrait: "post-clerk" }, ryo).portraitAsset,
    ryo.portraitAsset,
  );
  assert.equal(customerActor({ portrait: "mira" }, null).portrait, "mira");
});
test("bakery guide only triggers in the shop until marked and changes no inventory/time/progress", () => {
  const s = fresh();
  assert.equal(needsBakeryGuide(s), false);
  s.scene = "bakeryKitchen";
  assert.equal(needsBakeryGuide(s), false);
  s.scene = "bakery";
  assert.equal(needsBakeryGuide(s), true);
  const before = structuredClone(s);
  markBakeryGuideSeen(s);
  assert.equal(needsBakeryGuide(s), false);
  before.tutorial.bakeryIntroSeen = true;
  assert.deepEqual(s, before);
  assert.equal(needsBakeryGuide(validate(s)), false);
});
test("old saves gain only the optional guide flag and malformed guide records are rejected", () => {
  const old = fresh();
  old.money = 777;
  old.doughs.loaf = 2;
  old.quests.delivery = "active";
  delete old.tutorial;
  const s = validate(old);
  assert.equal(s.tutorial.bakeryIntroSeen, false);
  assert.equal(s.money, 777);
  assert.equal(s.doughs.loaf, 2);
  assert.equal(s.quests.delivery, "active");
  assert.equal(s.version, 8);
  for (const tutorial of [
    null,
    [],
    true,
    { bakeryIntroSeen: "yes" },
    { bakeryIntroSeen: 1 },
  ])
    assert.throws(() => validate({ ...fresh(), tutorial }));
});
test("all guide pages navigate backwards/forwards, can finish, and mark the guide as read without charging", () => {
  let actions,
    html,
    closed = false;
  const s = fresh(),
    ui = {
      g: { state: s, data: { tutorial: guide } },
      panel(h, a) {
        html = h;
        actions = a;
      },
      close() {
        closed = true;
      },
    };
  showBakeryGuide(ui);
  assert.equal(s.tutorial.bakeryIntroSeen, true);
  assert.match(html, /1 \/ 4/);
  actions.find((a) => a[0] === "다음 안내")[1]();
  assert.match(html, /2 \/ 4/);
  actions.find((a) => a[0] === "이전 안내")[1]();
  assert.match(html, /1 \/ 4/);
  for (let i = 0; i < 3; i++) actions.find((a) => a[0] === "다음 안내")[1]();
  actions.find((a) => a[0] === "빵집 시작하기")[1]();
  assert.equal(closed, true);
  assert.equal(s.money, 60);
  assert.equal(s.stamina, 100);
});
