// Self-contained static host at /Bakery/: no save API and no personal files touched.
import assert from "node:assert/strict";
import http from "node:http";
import { readFile } from "node:fs/promises";
import { buildWeb } from "./build-web.mjs";
import { staticFiles } from "../server/staticFiles.js";
const { chromium } = await import(
  process.env.BAKERY_PLAYWRIGHT_MODULE || "playwright"
);
const root = await buildWeb(),
  api = [],
  bad = [];
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost"),
    name = decodeURIComponent(url.pathname);
  try {
    if (!name.startsWith("/Bakery/")) throw Error("path");
    if (name.includes("/api/")) {
      api.push(name);
      throw Error("api");
    }
    await staticFiles(req, res, name.slice("/Bakery".length), root);
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
  const context = await browser.newContext({ acceptDownloads: true }),
    p = await context.newPage();
  p.on("pageerror", (e) => bad.push(e.message));
  const address = `http://127.0.0.1:${server.address().port}/Bakery/`;
  const install = async () =>
    p.evaluate(async () => {
      const { UI } = await import("./src/ui.js");
      for (const key of ["panel", "close"]) {
        const original = UI.prototype[key];
        UI.prototype[key] = function (...args) {
          window.webUI = this;
          return original.apply(this, args);
        };
      }
    });
  const choose = (name) => p.getByRole("button", { name, exact: true }).click();
  const start = async (id) => {
    await p
      .getByRole("button", { name: new RegExp("^" + id + "번 ·") })
      .click();
    if (
      await p
        .getByRole("button", { name: "나의 첫 아침 시작", exact: true })
        .count()
    )
      await choose("나의 첫 아침 시작");
    await p.locator("#overlay").waitFor({ state: "hidden" });
  };
  const menu = async () => {
    await p.keyboard.press("Escape");
    await p.getByRole("heading", { name: "잠깐 쉬어가기" }).waitFor();
  };
  await p.goto(address);
  await p.getByRole("button", { name: /^1번 ·/ }).waitFor();
  await install();
  await start(1);
  assert.equal(await p.evaluate(() => window.webUI.g.state.version), 8);
  await p.keyboard.down("ArrowRight");
  await p.waitForTimeout(250);
  await p.keyboard.up("ArrowRight");
  assert.ok(await p.evaluate(() => window.webUI.g.state.x > 480));
  await p.evaluate(async () => {
    const s = window.webUI.g.state;
    s.money = 555;
    s.equipment.pieMold = true;
    s.equipment.capacityLevel = 1;
    s.equipment.speedLevel = 1;
    s.shop.menu = ["berrypie"];
    s.scene = "bakeryKitchen";
    s.doughs.loaf = 9;
    const { putInOven } = await import("./src/baking.js");
    putInOven(s, { loaf: 9 });
  });
  await p.locator('[data-panel="ovenBatch"]').click();
  assert.equal(await p.locator("#bake-progress").getAttribute("max"), "45");
  await choose("닫기 · ESC");
  await menu();
  assert.match(await p.locator(".panel").textContent(), /이 브라우저에 저장/);
  await choose("저장");
  await p.locator("#overlay").waitFor({ state: "hidden" });
  const raw = await p.evaluate(() =>
    localStorage.getItem("little-hearth:demo:web:/Bakery/1"),
  );
  assert.equal(JSON.parse(raw).oven.batch.loaf, 9);
  await menu();
  const downloadPromise = p.waitForEvent("download");
  await choose("세이브 파일 내보내기");
  const download = await downloadPromise,
    exported = await readFile(await download.path(), "utf8");
  assert.equal(JSON.parse(exported).money, 555);
  await choose("닫기 · ESC");
  await p.reload();
  await p.getByRole("button", { name: /^1번 ·/ }).waitFor();
  await install();
  await start(1);
  assert.equal(await p.evaluate(() => window.webUI.g.state.money), 555);
  assert.equal(await p.evaluate(() => window.webUI.g.state.oven.duration), 45);
  await menu();
  let picker = p.waitForEvent("filechooser");
  await choose("세이브 파일 가져오기");
  await (
    await picker
  ).setFiles({
    name: "save.json",
    mimeType: "application/json",
    buffer: Buffer.from(exported),
  });
  await p
    .getByRole("button", { name: "2번에 가져오기 · 빈 슬롯", exact: true })
    .click();
  await p.getByRole("button", { name: /^2번 ·/ }).waitFor();
  await start(2);
  assert.equal(await p.evaluate(() => window.webUI.g.state.money), 555);
  // Confirm overwrite is explicit; invalid import never changes an existing slot.
  await menu();
  picker = p.waitForEvent("filechooser");
  await choose("세이브 파일 가져오기");
  await (
    await picker
  ).setFiles({
    name: "save.json",
    mimeType: "application/json",
    buffer: Buffer.from(exported),
  });
  await choose("1번에 가져오기 · 기존 저장 있음");
  await p.getByRole("heading", { name: "1번 저장을 덮어쓸까요?" }).waitFor();
  assert.equal(
    await p.evaluate(() =>
      localStorage.getItem("little-hearth:demo:web:/Bakery/1"),
    ),
    raw,
  );
  await choose("취소");
  assert.equal(await p.evaluate(() => window.webUI.g.started), true);
  await choose("닫기 · ESC");
  await menu();
  picker = p.waitForEvent("filechooser");
  await choose("세이브 파일 가져오기");
  await (
    await picker
  ).setFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from("{}"),
  });
  await p.waitForFunction(() =>
    document.querySelector("#toast").textContent.includes("유효한"),
  );
  assert.equal(
    await p.evaluate(() =>
      localStorage.getItem("little-hearth:demo:web:/Bakery/1"),
    ),
    raw,
  );
  assert.equal(
    await p
      .getByRole("button", { name: "플레이어 이미지 불러오기", exact: true })
      .count(),
    0,
  );
  assert.equal(
    await p
      .getByRole("button", { name: "기본 캐릭터로 복원", exact: true })
      .count(),
    0,
  );
  assert.equal(
    await p.evaluate(() => typeof window.webUI.g.sprite.pick),
    "undefined",
  );
  await choose("세이브 삭제");
  await choose("1번 세이브 삭제");
  await choose("취소");
  assert.equal(
    await p.evaluate(() =>
      localStorage.getItem("little-hearth:demo:web:/Bakery/1"),
    ),
    raw,
  );
  await choose("1번 세이브 삭제");
  await choose("삭제하기");
  assert.equal(
    await p.evaluate(() =>
      localStorage.getItem("little-hearth:demo:web:/Bakery/1"),
    ),
    null,
  );
  assert.equal(await p.evaluate(() => window.webUI.g.slot), 2);
  await choose("2번 세이브 삭제");
  await choose("삭제하기");
  await p
    .getByRole("button", { name: "2번 · 새로운 이야기", exact: true })
    .waitFor();
  await start(2);
  assert.equal(await p.evaluate(() => window.webUI.g.state.money), 60);
  await menu();
  await choose("닫기 · ESC");
  const other = await browser.newContext(),
    guest = await other.newPage();
  await guest.goto(address);
  await guest
    .getByRole("button", { name: "1번 · 새로운 이야기", exact: true })
    .waitFor();
  await other.close();
  assert.equal(
    await p.evaluate(
      () =>
        [...document.images].filter(
          (i) => i.src && (!i.complete || i.naturalWidth === 0),
        ).length,
    ),
    0,
  );
  assert.deepEqual(api, []);
  assert.deepEqual(bad, []);
  await p.screenshot({ path: "/tmp/bakery-web-play.png", fullPage: true });
  console.log(
    "PASS: static /Bakery/ load, movement, upgraded oven, browser save/reload, JSON export/import, overwrite confirmation, invalid import, delete cancel/other/active slot, fixed character and visitor isolation; no save/player API calls or JS errors.",
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
