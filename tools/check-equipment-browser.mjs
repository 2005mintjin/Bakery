// Temporary slot 3 is restored byte-for-byte; run save tests sequentially.
import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
const { chromium } = await import(
  process.env.BAKERY_PLAYWRIGHT_MODULE || "playwright"
);
const file = new URL("../saves/slot-3.json", import.meta.url);
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
  initial.money = 2000;
  initial.items.flour = 30;
  initial.items.water = 10;
  initial.items.salt = 10;
  initial.items.sugar = 10;
  initial.items.butter = 10;
  await writeFile(file, JSON.stringify(initial));
  await p.reload();
  await p.evaluate(async () => {
    const { UI } = await import("/src/ui.js"),
      orig = UI.prototype.panel;
    UI.prototype.panel = function (...args) {
      window.equipmentUI = this;
      return orig.apply(this, args);
    };
  });
  await p.getByRole("button", { name: /3번/ }).click();
  await p.locator("#overlay").waitFor({ state: "hidden" });
  const choose = (name) => p.getByRole("button", { name, exact: true }).click();
  const close = () => choose("닫기 · ESC");
  await p.locator('[data-panel="oven"]').click();
  await p.getByRole("tab", { name: "파이", exact: true }).click();
  assert.equal(
    await p
      .getByRole("button", { name: "파이 반죽 시작", exact: true })
      .isDisabled(),
    true,
  );
  assert.match(await p.locator(".lock-notice").textContent(), /공방/);
  await close();
  // Walk through the real city door instead of opening the workshop panel remotely.
  await p.evaluate(() =>
    Object.assign(window.equipmentUI.g.state, {
      scene: "city",
      x: 750,
      y: 548,
    }),
  );
  await p.keyboard.down("ArrowUp");
  await p.waitForFunction(
    () => window.equipmentUI.g.state.scene === "workshop",
  );
  await p.keyboard.up("ArrowUp");
  await p.locator(".spot-workshop").click();
  await choose("파이 틀 구매 · 150G");
  await choose("쿠키 틀 구매 · 120G");
  await choose("용량 확장 · 250G");
  await choose("화력 개선 · 200G");
  assert.equal(await p.evaluate(() => window.equipmentUI.g.state.money), 1280);
  await p.screenshot({ path: "/tmp/bakery-workshop.png", fullPage: true });
  await close();
  await p.locator(".interior-exit").click();
  assert.equal(
    await p.evaluate(() => window.equipmentUI.g.state.scene),
    "city",
  );
  await p.evaluate(() =>
    Object.assign(window.equipmentUI.g.state, { scene: "bakeryKitchen" }),
  );
  await p.locator('[data-panel="oven"]').click();
  await p.getByRole("tab", { name: "파이", exact: true }).click();
  assert.equal(
    await p
      .getByRole("button", { name: "파이 반죽 시작", exact: true })
      .isDisabled(),
    false,
  );
  await choose("파이 반죽 시작");
  assert.equal(
    await p.evaluate(() => window.equipmentUI.g.state.baking.type),
    "pie",
  );
  await close();
  // Prepare an available queue; timer completion itself is exercised by the unit tests.
  await p.evaluate(() => {
    const s = window.equipmentUI.g.state;
    s.baking = null;
    s.doughs.loaf = 9;
  });
  await p.locator('[data-panel="ovenBatch"]').click();
  assert.match(await p.locator(".panel").textContent(), /최대 9개/);
  assert.match(await p.locator(".panel").textContent(), /45초/);
  await choose("선택한 반죽 굽기");
  assert.equal(await p.locator("#bake-progress").getAttribute("max"), "45");
  await close();
  // Save and reload the upgraded in-flight batch through the real server API/UI.
  await p.keyboard.press("Escape");
  await choose("저장");
  await p.locator("#overlay").waitFor({ state: "hidden" });
  await p.keyboard.press("Escape");
  await choose("불러오기");
  await p.locator("#overlay").waitFor({ state: "hidden" });
  assert.equal(
    await p.evaluate(() => window.equipmentUI.g.state.equipment.capacityLevel),
    1,
  );
  assert.equal(
    await p.evaluate(() => window.equipmentUI.g.state.oven.batch.loaf),
    9,
  );
  assert.equal(
    await p.evaluate(() => window.equipmentUI.g.state.oven.duration),
    45,
  );
  await p.evaluate(async () => {
    const { tickBaking, collectBread } = await import("/src/baking.js");
    const s = window.equipmentUI.g.state;
    tickBaking(s, 45);
    collectBread(s);
    s.scene = "bakery";
  });
  await p.locator(".spot-shop").click();
  assert.equal(await p.locator("[data-sale]").count(), 9);
  for (const box of await p.locator("[data-sale]").all()) await box.uncheck();
  await choose("개점하기");
  assert.equal(
    await p.evaluate(() => window.equipmentUI.g.state.shop.open),
    false,
  );
  await p.locator('[data-sale="honeybread"]').focus();
  await p.keyboard.press("Space");
  assert.equal(await p.locator('[data-sale="honeybread"]').isChecked(), true);
  await choose("개점하기");
  await p.evaluate(async () => {
    const { tickShop } = await import("/src/shop.js");
    const g = window.equipmentUI.g;
    tickShop(g.state, 12, g.data.customers, () => 0.9);
    tickShop(g.state, 1.2, g.data.customers, () => 0.9);
  });
  assert.equal(
    await p.evaluate(() => window.equipmentUI.g.state.shop.customer.bread),
    "honeybread",
  );
  // Every supplied visitor must be occluded by the actual stocked background below y=456.
  const mask = await p.evaluate(async () => {
    const { drawScenery } = await import("/src/scenery.js");
    const image = new Image();
    image.src = "/assets/backgrounds/interiors/stocked-bakery.png";
    await image.decode();
    const bg = document.createElement("canvas");
    bg.width = 1920;
    bg.height = 1152;
    const c = bg.getContext("2d");
    c.setTransform(2, 0, 0, 2, 0, 0);
    c.imageSmoothingEnabled = false;
    drawScenery(c, image);
    const actual = document.querySelector("#world").getContext("2d"),
      g = window.equipmentUI.g;
    const results = [];
    for (const person of g.data.customers) {
      g.state.shop.customer = {
        name: person.name,
        portrait: person.portrait,
        bread: "honeybread",
        quantity: 1,
        phase: "waiting",
        arrival: 1.2,
      };
      await new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(r)),
      );
      const a = actual.getImageData(720, 920, 480, 150).data,
        b = c.getImageData(720, 920, 480, 150).data;
      results.push([...a].every((v, i) => v === b[i]));
    }
    return results;
  });
  assert.ok(mask.every(Boolean));
  await p.screenshot({ path: "/tmp/bakery-counter-fixed.png" });
  await p.locator(".spot-shop").click();
  assert.equal(await p.locator('[data-sale="honeybread"]').isChecked(), true);
  await p.screenshot({ path: "/tmp/bakery-sale-menu.png" });
  await close();
  assert.match(
    await p.locator("h1").evaluate((el) => getComputedStyle(el).fontFamily),
    /휴먼편지체/,
  );
  assert.doesNotMatch(
    await p.locator("h1").evaluate((el) => getComputedStyle(el).fontFamily),
    /Gungsuh|Georgia/,
  );
  await p.setViewportSize({ width: 390, height: 844 });
  await p.locator(".spot-shop").click();
  assert.equal(
    await p.evaluate(() => {
      const el = document.querySelector(".panel"),
        b = el.getBoundingClientRect();
      return (
        b.left >= 0 && b.right <= innerWidth && el.scrollWidth <= el.clientWidth
      );
    }),
    true,
  );
  await close();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: molds/locks, real workshop entry/exit, upgrade prices and 9/45 oven, save/reload, sale menu restricted orders, 8 visitor foreground masks, font and narrow layout.",
  );
} finally {
  await browser?.close();
  if (backup) await writeFile(file, backup);
  else
    await unlink(file).catch((e) => {
      if (e.code !== "ENOENT") throw e;
    });
}
