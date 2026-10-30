// Self-contained host and isolated browser storage; no personal saves.
import assert from "node:assert/strict";
import http from "node:http";
import { buildWeb } from "./build-web.mjs";
import { staticFiles } from "../server/staticFiles.js";
import { fresh } from "../src/saveSystem.js";
import { webSavePrefix } from "../src/edition.js";
import { advanceDialogue } from "./browser-dialogue.mjs";
const { chromium } = await import(
  process.env.BAKERY_PLAYWRIGHT_MODULE || "playwright"
);
const root = await buildWeb();
const server = http.createServer(async (req, res) => {
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
  const p = await browser.newPage({ viewport: { width: 1366, height: 1000 } }),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  const s = Object.assign(fresh(), {
    scene: "bakery",
    minutes: 1320,
    money: 1000,
    stamina: 20,
  });
  s.tutorial.bakeryIntroSeen = true;
  s.display.loaf = 2;
  s.shop.customer = {
    name: "미라",
    portrait: "mira",
    bread: "loaf",
    quantity: 2,
    phase: "waiting",
    arrival: 1.2,
  };
  delete s.dailyLedger;
  delete s.lastNight;
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
      for (const name of ["panel", "close"]) {
        const original = UI.prototype[name];
        UI.prototype[name] = function (...args) {
          window.testUI = this;
          return original.apply(this, args);
        };
      }
    });
  }
  const click = (name) =>
    p.locator("#overlay").getByRole("button", { name, exact: true }).click();
  await p.goto(address);
  await p.getByRole("button", { name: /^1번 ·/ }).waitFor();
  await install();
  await p.getByRole("button", { name: /^1번 ·/ }).click();
  await p.locator("#overlay").waitFor({ state: "hidden" });
  await p.evaluate(() => window.testUI.show("customerTalk"));
  await advanceDialogue(p);
  await click("네, 금방 갖다 드릴게요!");
  await advanceDialogue(p);
  await click("대화 마치기");
  assert.equal(
    await p.evaluate(() => window.testUI.g.state.dailyLedger.sales),
    32,
  );
  await p.evaluate(() => {
    const ui = window.testUI;
    ui.g.state.scene = "store";
    ui.serviceAccess = "store";
    ui.show("supplies");
  });
  await click("밀가루 1개 구매 · 2G");
  assert.equal(
    await p.evaluate(() => window.testUI.g.state.dailyLedger.expenses),
    2,
  );
  await p.evaluate(() => {
    const ui = window.testUI;
    ui.g.state.scene = "bakery";
    ui.show("shop");
    ui.g.state.minutes = 1320;
    ui.g.state.stamina = 20;
  });
  await click("가게 닫고 퇴근하기");
  await p
    .getByRole("heading", { name: "펜서 베이커리 · 다락방에서 쉬기" })
    .waitFor();
  await p.keyboard.press("Escape");
  assert.equal(await p.evaluate(() => window.testUI.g.state.lastNight), null);
  await p.evaluate(() => {
    window.testUI.show("sleep");
    window.testUI.g.state.minutes = 1320;
  });
  await click("잠자기 · 오전 6시에 기상");
  await p.getByRole("heading", { name: "1일째 · 하루 결산" }).waitFor();
  const pic = p.locator(".sleep-picture img");
  await pic.evaluate((img) => img.decode());
  assert.deepEqual(
    await pic.evaluate((img) => [img.naturalWidth, img.naturalHeight]),
    [1536, 1024],
  );
  assert.match(await pic.getAttribute("src"), /fencer-sleeping.png$/);
  assert.equal(await p.locator('[data-night="sales"]').textContent(), "32 G");
  assert.equal(
    await p.locator('[data-night="expenses"]').textContent(),
    "−2 G",
  );
  assert.equal(await p.locator('[data-night="net"]').textContent(), "+30 G");
  assert.equal(await p.evaluate(() => window.testUI.g.state.day), 2);
  assert.equal(await p.evaluate(() => window.testUI.g.state.minutes), 360);
  assert.equal(await p.evaluate(() => window.testUI.g.state.stamina), 100);
  assert.match(await p.locator(".night-rest").textContent(), /기력 \+80/);
  const snapshot = await p.evaluate(() =>
    structuredClone(window.testUI.g.state),
  );
  await p.waitForTimeout(400);
  assert.deepEqual(await p.evaluate(() => window.testUI.g.state), snapshot);
  await p
    .locator(".night-panel")
    .screenshot({ path: "/tmp/fencer-night-report.png" });
  await click("아침 맞이하기 · 오전 6시");
  await p.locator("#overlay").waitFor({ state: "hidden" });
  await p.evaluate(() => window.testUI.show("menu"));
  await click("지난 결산 보기");
  assert.equal(await p.evaluate(() => window.testUI.g.state.day), 2);
  assert.equal(await p.evaluate(() => window.testUI.g.state.money), 1030);
  await p.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  );
  assert.equal(
    await p
      .locator(".night-panel")
      .evaluate((el) => el.scrollWidth > el.clientWidth),
    false,
  );
  await p
    .locator(".night-panel")
    .screenshot({ path: "/tmp/fencer-night-report-narrow.png" });
  await p.keyboard.press("Escape");
  await p.evaluate(() => window.testUI.show("menu"));
  await click("저장");
  await p.reload();
  await p.getByRole("button", { name: /^1번 ·/ }).waitFor();
  await install();
  await p.getByRole("button", { name: /^1번 ·/ }).click();
  await p.evaluate(() => window.testUI.show("menu"));
  await click("지난 결산 보기");
  await p.getByRole("heading", { name: "1일째 · 하루 결산" }).waitFor();
  assert.equal(await p.locator('[data-night="net"]').textContent(), "+30 G");
  assert.equal(
    await p.evaluate(() => window.testUI.g.state.dailyLedger.sales),
    0,
  );
  assert.equal(await p.evaluate(() => window.testUI.g.state.day), 2);
  await p.keyboard.press("Escape");
  // Next night has no duplicate income or expense.
  await p.evaluate(() => {
    window.testUI.show("sleep");
    window.testUI.g.state.minutes = 1380;
    window.testUI.g.state.stamina = 0;
  });
  await click("잠자기 · 오전 6시에 기상");
  await p.getByRole("heading", { name: "2일째 · 하루 결산" }).waitFor();
  assert.equal(await p.locator('[data-night="sales"]').textContent(), "0 G");
  assert.equal(await p.locator('[data-night="expenses"]').textContent(), "0 G");
  assert.equal(await p.evaluate(() => window.testUI.g.state.stamina), 87);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: real sale/purchase, old-save migration, retirement cancellation, supplied sleeping image, daily totals, paused report, wake-up, narrow layout, save/reload/reopen and next-day reset/late-sleep recovery.",
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
