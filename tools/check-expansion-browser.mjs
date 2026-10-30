// Uses slot 3 temporarily and restores its original bytes; run save checks sequentially.
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
  const p = await browser.newPage({ viewport: { width: 1280, height: 1100 } }),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto("http://127.0.0.1:5173");
  const initial = await p.evaluate(async () => {
    const { fresh } = await import("/src/saveSystem.js");
    return fresh();
  });
  initial.scene = "store";
  initial.money = 1000;
  initial.equipment.pieMold = true;
  initial.equipment.cookieMold = true;
  initial.items.chococookie = 2;
  for (const key of [
    "flour",
    "water",
    "salt",
    "sugar",
    "butter",
    "meat",
    "fish",
    "chocolate",
    "berry",
  ])
    initial.items[key] = 20;
  await writeFile(file, JSON.stringify(initial));
  await p.reload();
  await p.evaluate(async () => {
    const { UI } = await import("/src/ui.js"),
      panel = UI.prototype.panel;
    UI.prototype.panel = function (...a) {
      window.expansionGame = this.g;
      return panel.apply(this, a);
    };
  });
  await p.getByRole("button", { name: /3번/ }).click();
  async function hidden() {
    await p.locator("#overlay").waitFor({ state: "hidden" });
  }
  async function choose(name) {
    await p.getByRole("button", { name, exact: true }).click();
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
  async function load(s) {
    assert.equal(
      (
        await p.request.put("http://127.0.0.1:5173/api/saves/3", { data: s })
      ).status(),
      200,
    );
    await p.keyboard.press("Escape");
    await choose("불러오기");
    await hidden();
  }
  async function relocate(scene) {
    const s = await save();
    s.scene = scene;
    s.x = 480;
    s.y = 500;
    await load(s);
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
  async function prepare(type, finish) {
    await p.locator(".spot-oven").click();
    await p
      .getByRole("tab", { name: type === "bread" ? "빵" : type, exact: true })
      .click();
    await choose(
      type === "bread" ? "재료 섞어 반죽 시작" : type + " 반죽 시작",
    );
    for (let i = 0; i < 8 && (await p.locator("#dough").count()); i++)
      await cycle();
    await choose(finish);
    await close();
  }
  await hidden();
  await p.locator(".spot-storeTalk").click();
  await advanceDialogue(p);
  await choose("상점을 둘러본다.");
  for (const [name, price] of [
    ["물", 1],
    ["설탕", 2],
    ["버터", 4],
    ["고기", 6],
    ["생선", 5],
    ["초콜릿", 5],
  ])
    await choose(`${name} 1개 구매 · ${price}G`);
  await close();
  let s = await save();
  assert.equal(s.money, 977);
  await relocate("bakeryKitchen");
  await p.locator(".spot-ovenBatch").click();
  await choose("베리 말리기");
  await p.locator("#dry-count").fill("1");
  const dryStarted = Date.now();
  await choose("건조 시작");
  assert.match(await p.locator(".panel").textContent(), /베리 건조 중/);
  await close();
  for (const [type, finish] of [
    ["파이", "베리 2개 + 설탕 1개 · 베리 파이"],
    ["파이", "고기 2개 · 미트파이"],
    ["파이", "생선 2개 · 생선파이"],
    ["쿠키", "토핑 없이 · 버터 쿠키"],
    ["쿠키", "초콜릿 1개 · 초콜릿 쿠키"],
  ])
    await prepare(type, finish);
  s = await save();
  assert.equal(s.doughs.berrypie, 1);
  assert.equal(s.doughs.meatpie, 1);
  assert.equal(s.doughs.cookie, 1);
  assert.equal(s.oven.kind, "drying");
  const visitors = await p.evaluate(() => window.expansionGame.data.customers);
  for (let index = 0; index < visitors.length; index++) {
    s = await save();
    s.scene = "bakery";
    s.shop = { open: true, elapsed: 11.99, customer: null, sequence: index };
    await load(s);
    await p.waitForFunction(
      () => window.expansionGame.state.shop.customer?.phase === "waiting",
    );
    const order = await p.evaluate(
      () => window.expansionGame.state.shop.customer,
    );
    assert.equal(order.portrait, visitors[index].portrait);
    assert.ok(order.quantity >= 1 && order.quantity <= 3);
    assert.match(
      await p.locator("[data-order]").textContent(),
      new RegExp(String(order.quantity) + "개"),
    );
    if (index === 3 || index === 4 || index === 7)
      await p.screenshot({
        path: `/tmp/hearth-new-visitor-${order.portrait}.png`,
        fullPage: true,
      });
    await p.locator(".spot-customerTalk").click();
    const img = p.locator(".dialogue-portrait img");
    await img.evaluate((i) => i.decode());
    assert.equal(await img.getAttribute("src"), visitors[index].portraitAsset);
    await advanceDialogue(p);
    await choose("오늘 그 빵은 더 못 팔아요.");
    await close();
  }
  s = await save();
  s.shop.open = false;
  s.scene = "bakeryKitchen";
  await load(s);
  await p.waitForFunction(
    () => window.expansionGame.state.oven.phase === "ready",
    null,
    { timeout: 75000 },
  );
  assert.ok(Date.now() - dryStarted >= 59000);
  await p.locator(".spot-ovenBatch").click();
  await choose("말린 베리 꺼내기");
  await close();
  s = await save();
  assert.equal(s.items.driedberry, 1);
  assert.equal(s.warehouse.driedberry, undefined);
  await prepare("쿠키", "말린 베리 1개 · 말린 베리 쿠키");
  s = await save();
  assert.equal(s.items.driedberry, 0);
  assert.equal(s.doughs.berrycookie, 1);
  assert.equal(s.stamina, 40);
  await p.locator(".spot-ovenBatch").click();
  await choose("선택한 반죽 굽기");
  await close();
  s = await save();
  assert.equal(
    Object.values(s.oven.batch).reduce((a, b) => a + b, 0),
    6,
  );
  const seconds = s.oven.seconds;
  await load(s);
  s = await save();
  assert.ok(s.oven.seconds >= seconds);
  s.minutes = 1320;
  await load(s);
  await p.keyboard.press("Escape");
  await choose("퇴근·잠자기");
  await choose("잠자기 · 오전 6시에 기상");
  await hidden();
  await p.locator(".room-arrow").click();
  await p.locator(".spot-ovenBatch").click();
  await choose("완성한 빵 모두 꺼내기");
  await close();
  s = await save();
  for (const id of [
    "berrypie",
    "meatpie",
    "fishpie",
    "cookie",
    "berrycookie",
    "chococookie",
  ])
    assert.equal(s.warehouse[id], 1);
  await p.locator(".spot-warehouse").click();
  await p.getByRole("tab", { name: "쿠키", exact: true }).click();
  await choose("초콜릿 쿠키 꺼내기");
  await close();
  await p.locator(".room-arrow").click();
  await p.locator(".spot-shelf").click();
  const row = p.locator(".shelf-row").filter({
    has: p.getByRole("button", { name: "초콜릿 쿠키 진열", exact: true }),
  });
  await row.locator("input").fill("3");
  await choose("초콜릿 쿠키 진열");
  await close();
  s = await save();
  assert.equal(s.display.chococookie, 3);
  assert.equal(s.items.chococookie, 0);
  const beforeMoney = s.money;
  s.shop = {
    ...s.shop,
    open: true,
    customer: {
      name: "아리엔",
      portrait: "arien",
      bread: "chococookie",
      quantity: 3,
      phase: "waiting",
      arrival: 1.2,
    },
  };
  await load(s);
  await p.locator(".spot-customerTalk").click();
  await advanceDialogue(p);
  assert.match(
    await p.locator("#typed-dialogue").textContent(),
    /초콜릿 쿠키 3개/,
  );
  await choose("네, 금방 갖다 드릴게요!");
  await close();
  s = await save();
  assert.equal(s.display.chococookie, 0);
  assert.equal(s.money, beforeMoney + 84);
  await p.screenshot({
    path: "/tmp/hearth-stocked-bakery-console.png",
    fullPage: true,
  });
  await p.setViewportSize({ width: 540, height: 900 });
  await p.locator(".spot-shelf").click();
  const panel = await p.locator(".panel").boundingBox();
  assert.ok(panel.x >= 0 && panel.x + panel.width <= 540);
  await close();
  await p.locator(".spot-shop").click();
  await close();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: new ingredients, all 6 pastries by real kneading, actual 60-second berry drying, shared oven/save/reload/sleep, all 8 visiting profiles and portraits, random 1-3 orders, three-piece sale, stocked background and responsive real-stock console; no JS errors",
  );
} finally {
  await browser?.close();
  if (backup) await writeFile(file, backup);
  else
    await unlink(file).catch((e) => {
      if (e.code !== "ENOENT") throw e;
    });
}
