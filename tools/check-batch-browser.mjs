import { productCounts } from "../src/recipeBook.js";
// Slot 3 is temporary and restored byte-for-byte. Run sequentially with save checks.
import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { advanceDialogue } from "./browser-dialogue.mjs";
const { chromium } = await import(
  process.env.BAKERY_PLAYWRIGHT_MODULE || "playwright"
);
const file = fileURLToPath(new URL("../saves/slot-3.json", import.meta.url));
let backup, browser;
try {
  backup = await readFile(file);
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
try {
  browser = await chromium.launch({
    executablePath: process.env.BAKERY_BROWSER,
    args: ["--no-sandbox"],
  });
  const p = await browser.newPage({ viewport: { width: 1280, height: 1000 } }),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto("http://127.0.0.1:5173");
  const initial = await p.evaluate(async () => {
    const { fresh } = await import("/src/saveSystem.js");
    return fresh();
  });
  initial.scene = "bakeryKitchen";
  initial.items.flour = 16;
  initial.items.yeast = 8;
  initial.items.salt = 8;
  initial.items.berry = 4;
  await writeFile(file, JSON.stringify(initial));
  await p.reload();
  await p.evaluate(async () => {
    const { UI } = await import("/src/ui.js"),
      panel = UI.prototype.panel;
    UI.prototype.panel = function (...args) {
      window.batchGame = this.g;
      return panel.apply(this, args);
    };
  });
  await p.getByRole("button", { name: /3번/ }).click();
  async function hidden() {
    await p.locator("#overlay").waitFor({ state: "hidden" });
  }
  async function choose(label) {
    await p.getByRole("button", { name: label, exact: true }).click();
  }
  async function close() {
    await choose("닫기 · ESC");
    await hidden();
  }
  async function save() {
    await p.keyboard.press("Escape");
    await choose("저장");
    await hidden();
    return (await p.request.get("http://127.0.0.1:5173/api/saves/3")).json();
  }
  async function reloadSave(s) {
    if (s) {
      assert.equal(
        (
          await p.request.put("http://127.0.0.1:5173/api/saves/3", { data: s })
        ).status(),
        200,
      );
    }
    await p.keyboard.press("Escape");
    await choose("불러오기");
    await hidden();
  }
  async function cycle() {
    const b = await p.locator("#dough").boundingBox();
    await p.mouse.move(b.x + b.width * 0.3, b.y + b.height * 0.51);
    await p.mouse.down();
    await p.mouse.move(b.x + b.width * 0.7, b.y + b.height * 0.51, {
      steps: 10,
    });
    if (await p.locator("#dough").count())
      await p.mouse.move(b.x + b.width * 0.3, b.y + b.height * 0.51, {
        steps: 10,
      });
    await p.mouse.up();
  }
  async function finish() {
    for (let i = 0; i < 8 && (await p.locator("#dough").count()); i++)
      await cycle();
    await p.getByRole("heading", { name: "토핑 선택", exact: true }).waitFor();
  }
  async function prepare(topping) {
    await p.locator(".spot-oven").click();
    await choose("재료 섞어 반죽 시작");
    await finish();
    await choose(topping);
    await close();
  }
  await hidden();
  for (const topping of [
    "아무것도 넣지 않기 · 밀빵",
    "아무것도 넣지 않기 · 밀빵",
    "아무것도 넣지 않기 · 밀빵",
    "꿀 1개 넣기 · 꿀빵",
    "꿀 1개 넣기 · 꿀빵",
    "베리 2개 넣기 · 베리빵",
    "베리 2개 넣기 · 베리빵",
  ])
    await prepare(topping);
  let s = await save();
  assert.deepEqual(s.doughs, {
    ...productCounts(),
    loaf: 3,
    honeybread: 2,
    berrybread: 2,
  });
  assert.equal(s.stamina, 30);
  assert.equal(s.oven, null);
  await reloadSave();
  await p.locator(".spot-warehouse").click();
  assert.match(await p.locator(".panel").textContent(), /밀빵 · 준비 반죽 3개/);
  await close();
  await p.locator(".spot-ovenBatch").click();
  await p.locator("#batch-berrybread").fill("2");
  assert.equal(
    await p
      .getByRole("button", { name: "선택한 반죽 굽기", exact: true })
      .isDisabled(),
    true,
  );
  assert.match(await p.locator("#batch-size").textContent(), /7\/6/);
  await p.locator("#batch-loaf").fill("2");
  const started = Date.now();
  await choose("선택한 반죽 굽기");
  assert.match(await p.locator(".panel").textContent(), /6\/6개/);
  assert.equal(await p.locator("#bake-progress").getAttribute("max"), "60");
  await p.screenshot({ path: "/tmp/hearth-batch-oven.png" });
  await close();
  await p.locator(".spot-oven").click();
  await choose("재료 섞어 반죽 시작");
  await cycle();
  await close();
  s = await save();
  assert.equal(s.baking.phase, "kneading");
  assert.equal(s.doughs.loaf, 1);
  assert.deepEqual(s.oven.batch, {
    ...productCounts(),
    loaf: 2,
    honeybread: 2,
    berrybread: 2,
  });
  assert.ok(s.oven.seconds > 0 && s.oven.seconds < 60);
  const progress = s.baking.progress;
  await reloadSave();
  await p.locator(".spot-oven").click();
  assert.equal(await p.locator("#dough").count(), 1);
  await p.waitForFunction(
    () => window.batchGame.state.oven?.phase === "ready",
    null,
    { timeout: 75000 },
  );
  assert.ok(Date.now() - started >= 59000);
  assert.equal(await p.locator("#dough").count(), 1);
  assert.equal(
    await p.evaluate(() => window.batchGame.state.baking.progress),
    progress,
  );
  await finish();
  await choose("아무것도 넣지 않기 · 밀빵");
  await close();
  await p.locator(".spot-ovenBatch").click();
  await choose("완성한 빵 모두 꺼내기");
  await close();
  s = await save();
  assert.deepEqual(s.warehouse, {
    ...productCounts(),
    loaf: 2,
    honeybread: 2,
    berrybread: 2,
  });
  assert.deepEqual(s.doughs, {
    ...productCounts(),
    loaf: 2,
    honeybread: 0,
    berrybread: 0,
  });
  assert.equal(s.oven, null);
  assert.equal(s.stamina, 20);
  await p.setViewportSize({ width: 540, height: 850 });
  await p.locator(".spot-ovenBatch").click();
  for (const id of ["loaf", "honeybread", "berrybread"]) {
    const bounds = await p.locator("#batch-" + id).boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 540);
  }
  await choose("선택한 반죽 굽기");
  await close();
  s = await save();
  s.minutes = 1380;
  await reloadSave(s);
  await p.keyboard.press("Escape");
  await choose("퇴근·잠자기");
  await choose("잠자기 · 오전 6시에 기상");
  await hidden();
  await p.locator(".room-arrow").click();
  await p.locator(".spot-ovenBatch").click();
  await choose("완성한 빵 모두 꺼내기");
  await close();
  s = await save();
  assert.equal(s.warehouse.loaf, 4);
  assert.equal(s.doughs.loaf, 0);
  assert.equal(s.oven, null);
  await p.locator(".spot-warehouse").click();
  await choose("밀빵 꺼내기");
  await close();
  await p.locator(".room-arrow").click();
  await p.locator(".spot-shelf").click();
  await choose("밀빵 진열");
  await close();
  s = await save();
  s.shop.open = true;
  s.shop.customer = {
    name: "마리아",
    portrait: "sora",
    bread: "loaf",
    quantity: 1,
    phase: "waiting",
    arrival: 1.2,
  };
  await reloadSave(s);
  await p.locator(".spot-customerTalk").click();
  await advanceDialogue(p);
  await choose("네, 금방 갖다 드릴게요!");
  await close();
  s = await save();
  assert.equal(s.display.loaf, 0);
  assert.equal(s.money, 76);
  const gains = await p.evaluate(async () => {
    const { DialogueVoice } = await import("/src/dialogueVoice.js"),
      config = await (await fetch("/data/voices.json")).json(),
      ctx = new AudioContext(),
      values = [];
    await ctx.resume();
    const create = ctx.createGain.bind(ctx);
    ctx.createGain = () => {
      const gain = create(),
        ramp = gain.gain.linearRampToValueAtTime.bind(gain.gain);
      gain.gain.linearRampToValueAtTime = (value, time) => {
        if (value > 0) values.push(value);
        return ramp(value, time);
      };
      return gain;
    };
    const voices = new DialogueVoice(
      config,
      { volume: 0.5, muted: false },
      { getContext: () => ctx },
    );
    await voices.unlock();
    const id = voices.begin();
    for (const key of ["maria", "arien", "sasha", "erina"])
      voices.type(id, [key]);
    voices.end(id);
    await ctx.close();
    return values;
  });
  assert.equal(gains.length, 4);
  for (const value of gains.slice(1)) assert.equal(value, gains[0] * 2);
  const legacy = {
    ...initial,
    version: 5,
    baking: { phase: "baking", progress: 100, topping: "berry", seconds: 2 },
  };
  await reloadSave(legacy);
  s = await save();
  assert.equal(s.version, 7);
  assert.equal(s.baking, null);
  assert.ok(s.oven.seconds >= 24 && s.oven.seconds < 27);
  assert.equal(s.oven.batch.berrybread, 1);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: 7 real mouse doughs, mixed 6-piece 60-second batch, overflow guard, concurrent kneading untouched on completion, save/reload, warehouse/sale, sleep, narrow inputs, legacy oven migration and twofold sisters Web Audio gain; no JS errors",
  );
} finally {
  await browser?.close();
  if (backup) await writeFile(file, backup);
  else
    await unlink(file).catch((e) => {
      if (e.code !== "ENOENT") throw e;
    });
}
