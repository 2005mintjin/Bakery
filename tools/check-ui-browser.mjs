// Uses only temporary slot 3; restores it even if assertions fail. Run sequentially.
import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { productCounts } from "../src/recipeBook.js";
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
  const p = await browser.newPage({ viewport: { width: 1440, height: 1080 } }),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto("http://127.0.0.1:5173");
  const s = await p.evaluate(async () => {
    const { fresh } = await import("/src/saveSystem.js");
    return fresh();
  });
  s.scene = "bakeryKitchen";
  s.doughs = { ...productCounts(), loaf: 3, berrypie: 3, cookie: 3 };
  s.items.water = 20;
  s.items.flour = 20;
  s.items.salt = 20;
  s.items.sugar = 20;
  s.items.butter = 20;
  await writeFile(file, JSON.stringify(s));
  await p.reload();
  await p.evaluate(async () => {
    const { UI } = await import("/src/ui.js");
    const orig = UI.prototype.panel;
    UI.prototype.panel = function (...a) {
      window.uiTest = this;
      return orig.apply(this, a);
    };
  });
  await p.getByRole("button", { name: /3번/ }).click();
  await p.locator("#overlay").waitFor({ state: "hidden" });
  const choose = (label) =>
    p.getByRole("button", { name: label, exact: true }).click();
  const close = () => choose("닫기 · ESC");
  await p.locator('[data-panel="oven"]').click();
  assert.equal(await p.locator(".recipe-preview>span").count(), 3);
  const before = await p.evaluate(() =>
    JSON.stringify(window.uiTest.g.state.items),
  );
  await p.getByRole("tab", { name: "파이", exact: true }).click();
  assert.equal(
    await p.evaluate(() =>
      document.activeElement.getAttribute("aria-selected"),
    ),
    "true",
  );
  await p.getByRole("tab", { name: "파이", exact: true }).press("ArrowRight");
  assert.equal(
    await p
      .getByRole("tab", { name: "쿠키", exact: true })
      .getAttribute("aria-selected"),
    "true",
  );
  assert.equal(
    await p.evaluate(() => JSON.stringify(window.uiTest.g.state.items)),
    before,
  );
  await p.getByRole("tab", { name: "쿠키", exact: true }).press("Shift+Tab");
  assert.equal(
    await p.evaluate(() => document.activeElement.textContent),
    "닫기 · ESC",
  );
  await p.keyboard.press("Tab");
  assert.equal(
    await p.evaluate(() =>
      document.activeElement.getAttribute("aria-selected"),
    ),
    "true",
  );
  await p.screenshot({ path: "/tmp/bakery-ui-workbench.png", fullPage: true });
  await close();
  await p.locator('[data-panel="ovenBatch"]').click();
  await choose("선택 초기화");
  await p.locator("#batch-loaf").fill("2");
  await p.getByRole("tab", { name: "파이", exact: true }).click();
  await p.locator("#batch-berrypie").fill("2");
  await p.getByRole("tab", { name: "쿠키", exact: true }).click();
  await p.locator("#batch-cookie").fill("3");
  assert.equal(
    await p
      .getByRole("button", { name: "선택한 반죽 굽기", exact: true })
      .isDisabled(),
    true,
  );
  await p.locator("#batch-cookie").fill("2");
  assert.match(
    await p.locator("#oven-basket").textContent(),
    /밀빵 2개.*베리 파이 2개.*버터 쿠키 2개/,
  );
  await p.getByRole("tab", { name: "빵", exact: true }).click();
  assert.equal(await p.locator("#batch-loaf").inputValue(), "2");
  await choose("선택한 반죽 굽기");
  assert.deepEqual(
    await p.evaluate(() =>
      Object.values(window.uiTest.g.state.oven.batch).reduce(
        (a, b) => a + b,
        0,
      ),
    ),
    6,
  );
  await close();
  await p.evaluate(async () => {
    const { tickBaking, collectBread } = await import("/src/baking.js");
    tickBaking(window.uiTest.g.state, 60);
    collectBread(window.uiTest.g.state);
  });
  await p.locator('[data-panel="warehouse"]').click();
  await p.getByRole("tab", { name: "파이", exact: true }).click();
  await p.locator('[data-take="berrypie"]').click();
  assert.equal(await p.evaluate(() => window.uiTest.g.state.items.berrypie), 1);
  await close();
  await p.locator('[data-panel="inventory"]').click();
  await choose("완성품");
  await p.locator('[data-item="berrypie"]').click();
  assert.match(await p.locator(".item-detail").textContent(), /베리 파이/);
  await close();
  await p.screenshot({ path: "/tmp/bakery-ui-desktop.png", fullPage: true });
  await p.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    true,
  );
  await p.locator('[data-panel="oven"]').click();
  assert.equal(
    await p.evaluate(() => {
      const el = document.querySelector(".panel"),
        b = el.getBoundingClientRect();
      return (
        el.scrollWidth <= el.clientWidth && b.left >= 0 && b.right <= innerWidth
      );
    }),
    true,
  );
  await p.screenshot({ path: "/tmp/bakery-ui-mobile.png", fullPage: true });
  await p.getByRole("tab", { name: "파이", exact: true }).click();
  await choose("파이 반죽 시작");
  for (let i = 0; i < 8 && (await p.locator("#dough").count()); i++) {
    await p.locator("#dough").scrollIntoViewIfNeeded();
    const b = await p.locator("#dough").boundingBox();
    await p.mouse.move(b.x + b.width * 0.3, b.y + b.height * 0.5);
    await p.mouse.down();
    await p.mouse.move(b.x + b.width * 0.7, b.y + b.height * 0.5, {
      steps: 10,
    });
    if (await p.locator("#dough").count())
      await p.mouse.move(b.x + b.width * 0.3, b.y + b.height * 0.5, {
        steps: 10,
      });
    await p.mouse.up();
  }
  await p.getByRole("heading", { name: "토핑 선택", exact: true }).waitFor();
  assert.equal(await p.locator("[data-finish]").count(), 3);
  await p.screenshot({ path: "/tmp/bakery-ui-toppings.png", fullPage: true });
  assert.deepEqual(errors, []);
  console.log(
    "UI browser passed: category tabs, keyboard, mixed tray 6/7, bake/warehouse, inventory, narrow layout and mouse kneading.",
  );
} finally {
  await browser?.close();
  if (backup) await writeFile(file, backup);
  else
    await unlink(file).catch((e) => {
      if (e.code !== "ENOENT") throw e;
    });
}
