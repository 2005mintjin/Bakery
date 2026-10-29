// Slot 3 is temporary; always restore the player's original bytes. Run sequentially.
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
  const page = await browser.newPage({
      viewport: { width: 1280, height: 1000 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:5173");
  const state = await page.evaluate(async () => {
    const { fresh } = await import("/src/saveSystem.js");
    return fresh();
  });
  state.x = 820;
  state.y = 310;
  state.items.honeybread = 1;
  state.items.berry = 3;
  async function setState(s) {
    await writeFile(file, JSON.stringify(s));
    await page.reload();
    await page.getByRole("button", { name: /3번/ }).click();
    await hidden();
  }
  async function hidden() {
    await page.locator("#overlay").waitFor({ state: "hidden" });
  }
  async function choose(label) {
    await page.getByRole("button", { name: label, exact: true }).click();
  }
  async function save() {
    await page.keyboard.press("Escape");
    await choose("저장");
    await hidden();
    return page.evaluate(
      async () => await (await fetch("/api/saves/3")).json(),
    );
  }
  async function talk() {
    await page.keyboard.press("e");
    await page.locator("#typed-dialogue").waitFor();
  }
  async function portrait(name, asset) {
    assert.equal(
      await page.locator(".dialogue-portrait img").getAttribute("src"),
      asset,
    );
    await page
      .locator(".dialogue-portrait img")
      .evaluate((img) => img.decode());
    assert.equal(
      await page.locator(".dialogue-portrait img").getAttribute("alt"),
      name,
    );
  }
  await setState(state);
  await page.screenshot({ path: "/tmp/hearth-new-residents.png" });
  await talk();
  await portrait("마리아", "assets/characters/residents/maria-portrait.png");
  await page.keyboard.press("Space");
  assert.match(
    await page.locator("#typed-dialogue").textContent(),
    /안녕, 오랜만에/,
  );
  await advanceDialogue(page);
  await choose("혹시 좋아하는 빵이 있나요?");
  await page.keyboard.press("Escape");
  await hidden();
  let s = await save();
  assert.equal(s.quests.friend, undefined);
  await talk();
  await advanceDialogue(page);
  await choose("혹시 좋아하는 빵이 있나요?");
  await advanceDialogue(page);
  await hidden();
  s = await save();
  assert.equal(s.quests.friend, "active");
  await talk();
  await advanceDialogue(page);
  await choose("아쉽게도 없네요.");
  await hidden();
  s = await save();
  assert.equal(s.quests.friend, undefined);
  await talk();
  await advanceDialogue(page);
  await choose("혹시 좋아하는 빵이 있나요?");
  await advanceDialogue(page);
  await hidden();
  await talk();
  await advanceDialogue(page);
  await choose("여기 있어요.");
  await advanceDialogue(page);
  await hidden();
  s = await save();
  assert.equal(s.quests.friend, "done");
  assert.equal(s.items.honeybread, 0);
  assert.equal(s.money, 80);
  await talk();
  await advanceDialogue(page);
  await choose("요즘 어떻게 지내시나요?");
  await advanceDialogue(page);
  await choose("그럼 입양은 어때요?");
  await advanceDialogue(page);
  await hidden();
  s.x = 690;
  s.y = 340;
  await setState(s);
  await talk();
  await portrait(
    "이시도로",
    "assets/characters/residents/isidoro-portrait.png",
  );
  await advanceDialogue(page);
  await choose("아직 아무것도 안 심었는걸요.");
  await advanceDialogue(page);
  await hidden();
  await talk();
  await advanceDialogue(page);
  await choose("베리 여기 있어요.");
  await advanceDialogue(page);
  await hidden();
  s = await save();
  assert.equal(s.quests.berries, "done");
  assert.equal(s.items.berry, 0);
  assert.equal(s.money, 100);
  await talk();
  await advanceDialogue(page);
  await choose("씨앗 더 없나요?");
  await advanceDialogue(page);
  await hidden();
  s = await save();
  await setState(s);
  await talk();
  await advanceDialogue(page);
  assert.ok(
    await page
      .getByRole("button", { name: "그럼요.", exact: true })
      .isVisible(),
  );
  await page.keyboard.press("Escape");
  await hidden();
  const art = await page.evaluate(async () => {
    const { loadResidentArt, drawResident } =
      await import("/src/residentArt.js");
    const npcs = await (await fetch("/data/npcs.json")).json(),
      images = await loadResidentArt(npcs),
      canvas = document.createElement("canvas");
    canvas.width = 960;
    canvas.height = 576;
    const ctx = canvas.getContext("2d");
    return npcs
      .filter((n) => n.spriteAsset)
      .map((n) => {
        ctx.clearRect(0, 0, 960, 576);
        drawResident({ c: ctx, residentArt: images, oval() {} }, n);
        const pixels = ctx.getImageData(n.x - 50, n.y - 70, 100, 80).data;
        return {
          name: n.name,
          visible: Array.from(pixels).filter((v, i) => i % 4 === 3 && v > 0)
            .length,
        };
      });
  });
  for (const a of art) assert.ok(a.visible > 500, a.name + " SD invisible");
  await page.setViewportSize({ width: 600, height: 900 });
  await talk();
  await portrait(
    "이시도로",
    "assets/characters/residents/isidoro-portrait.png",
  );
  await advanceDialogue(page);
  const bounds = await page.locator(".dialogue-choice").first().boundingBox();
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 600);
  await choose("그럼요.");
  await advanceDialogue(page);
  await hidden();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: both original SD/portrait pairs, Space typing, Maria accept/cancel/turn-in/chat, Isidoro farming/turn-in/seeds, save reload, pixel visibility, narrow screen; no JS errors",
  );
} finally {
  await browser?.close();
  if (backup) await writeFile(file, backup);
  else
    await unlink(file).catch((e) => {
      if (e.code !== "ENOENT") throw e;
    });
}
