// Actual touch events on an isolated static host and separate browser saves.
import assert from "node:assert/strict";
import http from "node:http";
import { buildWeb } from "./build-web.mjs";
import { staticFiles } from "../server/staticFiles.js";
import { fresh } from "../src/saveSystem.js";
import { webSavePrefix } from "../src/edition.js";
const { chromium } = await import(
  process.env.BAKERY_PLAYWRIGHT_MODULE || "playwright"
);
const root = await buildWeb(),
  server = http.createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      if (!path.startsWith("/Bakery/")) throw Error("path");
      await staticFiles(req, res, path.slice("/Bakery".length), root);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
await new Promise((r) => server.listen(0, "127.0.0.1", r));
let browser;
try {
  browser = await chromium.launch({
    executablePath: process.env.BAKERY_BROWSER,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  const p = await context.newPage();
  p.setDefaultTimeout(10000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  const s = Object.assign(fresh(), { x: 480, y: 310 });
  s.tutorial.bakeryIntroSeen = true;
  await p.addInitScript(
    ({ state, key }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(state));
    },
    { state: s, key: webSavePrefix + "/Bakery/1" },
  );
  const address = `http://127.0.0.1:${server.address().port}/Bakery/`;
  async function install() {
    await p.evaluate(async () => {
      const { UI } = await import("./src/ui.js");
      for (const key of ["panel", "close"]) {
        const original = UI.prototype[key];
        UI.prototype[key] = function (...args) {
          window.mobileUI = this;
          return original.apply(this, args);
        };
      }
    });
  }
  const choose = (name) =>
    p.locator("#overlay").getByRole("button", { name, exact: true }).tap();
  const close = () => choose("닫기 · ESC");
  async function advance() {
    for (let i = 0; i < 24; i++) {
      const next = p.locator("#dialogue-next");
      if (!(await next.isVisible())) return;
      await next.tap();
      await p.waitForTimeout(20);
    }
    throw Error("dialogue too long");
  }
  const cdp = await context.newCDPSession(p);
  async function point(selector) {
    const b = await p.locator(selector).boundingBox();
    assert.ok(b, selector);
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  }
  const touch = (type, points = []) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: points.map((p, i) => ({
        id: i + 1,
        radiusX: 2,
        radiusY: 2,
        ...p,
      })),
    });
  async function visiblePlay() {
    assert.equal(
      await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    for (const sel of ["#world", ".touch-dpad"]) {
      const b = await p.locator(sel).boundingBox();
      assert.ok(
        b.y >= 0 && b.y + b.height <= p.viewportSize().height + 1,
        `${sel} fits ${JSON.stringify(b)}`,
      );
    }
  }
  await p.goto(address);
  await p.getByRole("button", { name: /^1번 ·/ }).waitFor();
  await install();
  await p.getByRole("button", { name: /^1번 ·/ }).tap();
  await p.locator("#overlay").waitFor({ state: "hidden" });
  await p.evaluate(() => scrollTo(0, 0));
  await visiblePlay();
  const right = await point('[data-move="d"]'),
    up = await point('[data-move="w"]');
  const before = await p.evaluate(() => ({
    x: window.mobileUI.g.state.x,
    y: window.mobileUI.g.state.y,
  }));
  await touch("touchStart", [right, up]);
  await p.waitForTimeout(220);
  await touch("touchEnd");
  const moved = await p.evaluate(() => ({
    x: window.mobileUI.g.state.x,
    y: window.mobileUI.g.state.y,
  }));
  assert.ok(moved.x > before.x + 8 && moved.y < before.y - 8);
  await p.waitForTimeout(100);
  assert.deepEqual(
    await p.evaluate(() => ({
      x: window.mobileUI.g.state.x,
      y: window.mobileUI.g.state.y,
    })),
    moved,
  );
  await touch("touchStart", [right]);
  await p.waitForTimeout(100);
  await touch("touchCancel");
  await p.waitForTimeout(70);
  assert.equal(await p.evaluate(() => window.mobileUI.g.touchKeys.size), 0);
  await touch("touchStart", [up]);
  await p.waitForTimeout(50);
  await p.evaluate(() => window.mobileUI.show("menu"));
  await p.waitForTimeout(70);
  assert.equal(await p.evaluate(() => window.mobileUI.g.touchKeys.size), 0);
  await touch("touchEnd");
  await close();
  // Rotation cancels a held move and keeps the world and buttons on screen.
  await touch("touchStart", [await point('[data-move="d"]')]);
  await p.setViewportSize({ width: 844, height: 390 });
  await p.waitForTimeout(100);
  await touch("touchEnd");
  assert.equal(await p.evaluate(() => window.mobileUI.g.touchKeys.size), 0);
  await p.evaluate(() => scrollTo(0, 0));
  await visiblePlay();
  await p.screenshot({ path: "/tmp/mobile-landscape.png" });
  await p.setViewportSize({ width: 390, height: 844 });
  await p.evaluate(() => {
    const g = window.mobileUI.g;
    Object.assign(g.state, { scene: "town", x: 235, y: 350 });
  });
  await p.waitForTimeout(70);
  await p.locator("[data-touch-interact]").tap();
  await p
    .locator("#dialogue-speaker")
    .filter({ hasText: "아나스타샤" })
    .waitFor();
  await advance();
  await choose("..네, 그럼 이만.");
  // Enter via the screen's interaction button, then use indoor touch buttons.
  await p.evaluate(() => {
    Object.assign(window.mobileUI.g.state, { x: 277, y: 275 });
  });
  await p.waitForTimeout(70);
  await p.locator("[data-touch-interact]").tap();
  await p.waitForFunction(() => window.mobileUI.g.state.scene === "bakery");
  await p.locator("#interior-actions .room-arrow").tap();
  await p.waitForFunction(
    () => window.mobileUI.g.state.scene === "bakeryKitchen",
  );
  await p.locator(".spot-oven").tap();
  await choose("재료 섞어 반죽 시작");
  await p.getByRole("heading", { name: "반죽 치대기", exact: true }).waitFor();
  await p.locator("#dough").scrollIntoViewIfNeeded();
  const d = await p.locator("#dough").boundingBox(),
    y = d.y + d.height * 0.5,
    left = d.x + d.width * 0.28,
    far = d.x + d.width * 0.72;
  const initialScroll = await p.evaluate(
    () => document.querySelector("#overlay .panel").scrollTop,
  );
  await touch("touchStart", [{ x: left, y }]);
  await touch("touchMove", [{ x: far, y }]);
  await touch("touchCancel");
  const partial = await p.evaluate(
    () => window.mobileUI.g.state.baking.progress,
  );
  assert.ok(partial > 0 && partial < 100);
  await p.waitForTimeout(60);
  assert.equal(
    await p.evaluate(() => window.mobileUI.g.state.baking.progress),
    partial,
  );
  assert.equal(
    await p.evaluate(() => document.querySelector("#overlay .panel").scrollTop),
    initialScroll,
  );
  await touch("touchStart", [{ x: left, y }]);
  for (let i = 0; i < 24; i++) {
    await touch("touchMove", [{ x: i % 2 ? left : far, y }]);
    await p.waitForTimeout(20);
    if (
      await p
        .getByRole("heading", { name: "토핑 선택", exact: true })
        .isVisible()
    )
      break;
  }
  await touch("touchEnd");
  await p.getByRole("heading", { name: "토핑 선택", exact: true }).waitFor();
  assert.equal(await p.evaluate(() => window.mobileUI.g.state.stamina), 90);
  await p.locator('[data-finish="none"]').tap();
  assert.equal(await p.evaluate(() => window.mobileUI.g.state.doughs.loaf), 1);
  await close();
  // Oven setup and ordinary inventory remain touch-accessible.
  await p.locator(".spot-ovenBatch").tap();
  await choose("선택한 반죽 굽기");
  assert.equal(
    await p.evaluate(() => window.mobileUI.g.state.oven.phase),
    "baking",
  );
  await close();
  await p.locator('#touch-controls [data-panel="inventory"]').tap();
  await p.getByRole("heading", { name: /가방/ }).waitFor();
  await close();
  await p.setViewportSize({ width: 844, height: 390 });
  await p.evaluate(() => scrollTo(0, 0));
  await p.waitForTimeout(70);
  assert.equal(
    await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  );
  await p.screenshot({ path: "/tmp/mobile-kitchen-landscape.png" });
  // Touch fishing and result, without E or Space.
  await p.setViewportSize({ width: 390, height: 844 });
  await p.evaluate(() => {
    const g = window.mobileUI.g;
    Object.assign(g.state, { scene: "pond", x: 591, y: 287 });
  });
  await p.waitForTimeout(70);
  await p.locator("[data-touch-interact]").tap();
  await choose("낚싯대 던지기");
  await p
    .getByRole("status")
    .filter({ hasText: "물고기가 물었어요" })
    .waitFor();
  await choose("낚아채기 · Space");
  assert.equal(await p.evaluate(() => window.mobileUI.g.state.items.fish), 1);
  await close();
  // Retirement/night report and browser save using only screen menus.
  await p.evaluate(() => {
    const g = window.mobileUI.g;
    Object.assign(g.state, { scene: "bakery", minutes: 1320 });
  });
  await p.waitForTimeout(70);
  await p.locator("#bakery-console .spot-shop").tap();
  await choose("가게 닫고 퇴근하기");
  await choose("잠자기 · 오전 6시에 기상");
  await p.getByRole("heading", { name: "1일째 · 하루 결산" }).waitFor();
  await choose("아침 맞이하기 · 오전 6시");
  await p.locator('#touch-controls [data-panel="menu"]').tap();
  await choose("저장");
  const money = await p.evaluate(() => window.mobileUI.g.state.money);
  await p.reload();
  await p.getByRole("button", { name: /^1번 ·/ }).waitFor();
  await install();
  await p.getByRole("button", { name: /^1번 ·/ }).tap();
  assert.equal(await p.evaluate(() => window.mobileUI.g.state.items.fish), 1);
  assert.equal(await p.evaluate(() => window.mobileUI.g.state.money), money);
  assert.equal(await p.evaluate(() => window.mobileUI.g.state.day), 2);
  assert.equal(
    await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  );
  await p.screenshot({ path: "/tmp/mobile-bakery-portrait.png" });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: mobile portrait/landscape layout, multi-touch movement, release/cancel/menu/rotation reset, NPC and indoor actions, real touch kneading, oven, inventory, fishing, retirement/night report and browser save/reload.",
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
