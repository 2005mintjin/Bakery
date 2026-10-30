// Uses slot 3 temporarily and restores its bytes; run sequentially with save checks.
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
  initial.scene = "cafe";
  initial.stamina = 40;
  await writeFile(file, JSON.stringify(initial));
  await p.reload();
  await p.getByRole("button", { name: /3번/ }).click();
  async function hidden() {
    await p.locator("#overlay").waitFor({ state: "hidden" });
  }
  async function choose(label) {
    await p.getByRole("button", { name: label, exact: true }).click();
  }
  async function finish() {
    await advanceDialogue(p);
  }
  async function open() {
    await p.locator(".spot-cafeTalk").click();
    await p.locator("#typed-dialogue").waitFor();
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
  await hidden();
  await p.screenshot({ path: "/tmp/hearth-cafe-background.png" });
  const image = await p.evaluate(async () => {
    const config = await (await fetch("/data/interiorBackgrounds.json")).json(),
      img = new Image();
    img.src = config.cafe.asset;
    await img.decode();
    return { src: config.cafe.asset, width: img.width, height: img.height };
  });
  assert.equal(image.src, "assets/backgrounds/interiors/cafe.png");
  assert.equal(image.width, 1536);
  await open();
  const portrait = p.locator(".dialogue-portrait img");
  assert.equal(
    await portrait.getAttribute("src"),
    "assets/characters/clerks/barista.png",
  );
  assert.equal(await portrait.getAttribute("alt"), "데셰네");
  await portrait.evaluate((img) => img.decode());
  assert.equal(await p.locator(".dialogue-choice").count(), 0);
  await p.keyboard.press("Space");
  assert.equal(await p.locator("#typed-dialogue").textContent(), "안녕하심까.");
  await p.keyboard.press("Space");
  await p.screenshot({ path: "/tmp/hearth-barista-dialogue.png" });
  await choose("말 걸어보기");
  await finish();
  await choose("빨간 머리 아주머니는 어디 계시나요?");
  await p.keyboard.press("Space");
  assert.equal(
    await p.locator("#typed-dialogue").textContent(),
    "누구 말임까.",
  );
  assert.match(await p.locator("#dialogue-page").textContent(), /1 \/ 7/);
  await finish();
  await choose("다른 메뉴는 안 내나요?");
  await finish();
  await choose("뭐, 그렇죠.");
  await choose("다른 메뉴는 안 내나요?");
  await finish();
  await choose("브런치는 어때요?");
  await finish();
  for (let stop = 0; stop < 3; stop++) {
    await choose("말 없이 바라보기.");
    await finish();
    for (let i = 0; i < stop; i++) {
      await choose("계속 바라보기.");
      await finish();
    }
    await choose("그만하기.");
  }
  await choose("말 없이 바라보기.");
  await finish();
  for (const text of [
    "눈싸움은 잘 못하지 말임다.",
    "제가 그렇게 신기하게 생겼슴까.",
    "커피 안 사먹을 검까.",
  ]) {
    await choose("계속 바라보기.");
    await p.keyboard.press("Space");
    await p.keyboard.press("Space");
    await p.keyboard.press("Space");
    assert.equal(await p.locator("#typed-dialogue").textContent(), text);
    await finish();
  }
  await choose("아무것도 아니에요.");
  await hidden();
  let state = await save();
  assert.equal(state.scene, "city");
  assert.equal(state.money, 60);
  assert.equal(state.stamina, 40);
  await p.keyboard.press("e");
  await p.locator(".spot-cafeTalk").waitFor();
  await open();
  await p.keyboard.press("Escape");
  await hidden();
  state = await save();
  assert.equal(state.scene, "cafe");
  assert.equal(state.money, 60);
  await open();
  await finish();
  await choose("주문하기");
  await choose("따뜻한 커피 · 8G");
  await choose("베리 케이크 · 12G");
  await close();
  state = await save();
  assert.equal(state.money, 40);
  assert.equal(state.stamina, 80);
  await p.keyboard.press("Escape");
  await choose("불러오기");
  await hidden();
  assert.match(await p.locator("#status").textContent(), /기력 80\/100/);
  await p.setViewportSize({ width: 600, height: 900 });
  await open();
  await finish();
  const bounds = await p
    .getByRole("button", { name: "주문하기", exact: true })
    .boundingBox();
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 600);
  await choose("주문하기");
  await choose("따뜻한 커피 · 8G");
  await close();
  state = await save();
  assert.equal(state.stamina, 95);
  assert.equal(state.money, 32);
  await open();
  await finish();
  await choose("카페 나오기");
  assert.equal(await p.locator(".interior-exit").getAttribute("disabled"), "");
  await finish();
  await hidden();
  state = await save();
  assert.equal(state.scene, "city");
  assert.equal(state.x, 281);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: original cafe/barista PNGs, Space typing, all TXT branches and stop returns, gated purchases/recovery, ESC cancellation, farewell exit, save reload and narrow screen; no JS errors",
  );
} finally {
  await browser?.close();
  if (backup) await writeFile(file, backup);
  else
    await unlink(file).catch((e) => {
      if (e.code !== "ENOENT") throw e;
    });
}
