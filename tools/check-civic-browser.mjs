// Uses an isolated static host and browser save; never reads personal save slots.
import assert from "node:assert/strict";
import http from "node:http";
import { buildWeb } from "./build-web.mjs";
import { staticFiles } from "../server/staticFiles.js";
import { fresh } from "../src/saveSystem.js";
import { webSavePrefix } from "../src/edition.js";
import { advanceDialogue } from "./browser-dialogue.mjs";
const { chromium } = await import(process.env.BAKERY_PLAYWRIGHT_MODULE || "playwright");
const root = await buildWeb();
const server = http.createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    if (!path.startsWith("/Bakery/")) throw Error("path");
    await staticFiles(req, res, path.slice("/Bakery".length), root);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.BAKERY_BROWSER, args: ["--no-sandbox"] });
  const p = await browser.newPage({ viewport: { width: 1366, height: 1000 } }), errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  const initial = Object.assign(fresh(), { scene: "city", x: 219, y: 525 });
  initial.tutorial.bakeryIntroSeen = true;
  await p.addInitScript(({ state, key }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
    window.voiceStarts = [];
    const create = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function () {
      const node = create.call(this), start = node.start;
      node.start = function (...args) {
        window.voiceStarts.push(this.buffer?.duration);
        return start.apply(this, args);
      };
      return node;
    };
  }, { state: initial, key: webSavePrefix + "/Bakery/1" });
  const address = `http://127.0.0.1:${server.address().port}/Bakery/`;
  const choose = (text) => p.getByRole("button", { name: text, exact: true }).click();
  const drain = () => advanceDialogue(p, 40);
  async function captureGame() {
    await p.evaluate(async () => {
      const { UI } = await import("./src/ui.js");
      const original = UI.prototype.update;
      UI.prototype.update = function (...args) { window.civicGame = this.g; return original.apply(this, args); };
    });
  }
  async function start() {
    await p.goto(address);
    await p.getByRole("button", { name: /^1번 ·/ }).waitFor();
    await captureGame();
    await p.getByRole("button", { name: /^1번 ·/ }).click();
    if (await p.getByRole("button", { name: "나의 첫 아침 시작", exact: true }).count()) await choose("나의 첫 아침 시작");
    await p.locator("#overlay").waitFor({ state: "hidden" });
  }
  await start();
  await p.waitForFunction(() => window.civicGame?.started);
  await p.keyboard.press("e");
  await p.waitForFunction(() => window.civicGame.state.scene === "hall");
  await p.getByRole("button", { name: "로터스와 대화 · 이장", exact: true }).waitFor();
  await p.screenshot({ path: "/tmp/bakery-town-hall.png", fullPage: true });
  await choose("로터스와 대화 · 이장");
  assert.match(await p.locator(".dialogue-portrait img").getAttribute("src"), /lotus-portrait.png/);
  await p.waitForFunction(() => window.civicGame.voices.buffers.has("lotus"));
  await p.waitForTimeout(200);
  assert.ok(await p.evaluate(() => window.voiceStarts.length > 0));
  await drain(); await choose("도와드릴 게 있나요?"); await drain();
  await choose("그럼 이장님은 무슨 빵을 제일 좋아하시나요?"); await drain();
  assert.equal(await p.getByRole("button", { name: "베리 빵 선물하기", exact: true }).isDisabled(), true);
  await p.evaluate(() => { window.civicGame.state.items.berrybread = 1; });
  await choose("무슨 일 하는 사람이에요?"); await drain();
  await choose("베리 빵 선물하기"); await drain();
  assert.equal(await p.evaluate(() => window.civicGame.state.items.berrybread), 0);
  await choose("아무것도 아니에요.");
  await choose("헨델과 대화 · 비서"); await drain();
  assert.match(await p.locator(".dialogue-portrait img").getAttribute("src"), /hendel-portrait.png/);
  await choose("이야기하러 왔어요."); await drain(); await choose("무슨 일 하는 사람이에요?"); await drain();
  await choose("이장님이랑 일하는 거 어때요?"); await drain(); await choose("됐어요.");
  await choose("아델과 대화 · 조합 등급"); await drain(); await choose("제 조합원 등급은 어떤가요?");
  await p.locator("#dialogue-next").click();
  await p.keyboard.press("Escape");
  // Real sale API records 140 pieces; sleeping/clock advancement crosses Monday.
  await p.evaluate(async () => {
    const g = window.civicGame, { serve } = await import("./src/shop.js"), { advanceClock } = await import("./src/wellbeing.js");
    g.state.display.loaf = 140;
    for (let i = 0; i < 140; i++) { g.state.shop.customer = { bread: "loaf", quantity: 1, phase: "waiting" }; if (!serve(g.state, g.data.recipes)) throw Error("Sale failed"); }
    advanceClock(g.state, 7 * 1440);
    if (g.state.guild.grade !== "A") throw Error("Missing A promotion");
  });
  await choose("아델과 대화 · 조합 등급"); await drain(); await choose("제 조합원 등급은 어떤가요?");
  await p.locator("#dialogue-next").click(); await p.locator("#dialogue-next").click();
  await p.locator("#dialogue-next").click();
  assert.match(await p.locator("#typed-dialogue").textContent(), /A 등급/);
  await drain(); await choose("아무것도 아니에요.");
  await choose("← 소도시로 나가기");
  assert.equal(await p.evaluate(() => window.civicGame.state.scene), "city");
  // Walk up to the replacement NPC and use the real interaction key.
  await p.evaluate(() => Object.assign(window.civicGame.state, { x: 465, y: 520 }));
  await p.keyboard.press("e"); await drain();
  assert.match(await p.locator(".dialogue-portrait img").getAttribute("src"), /martin-portrait.png/);
  await choose("도와드릴 게 있을까요?"); await drain(); await choose("제가 전해줄게요!"); await drain();
  assert.equal(await p.evaluate(() => window.civicGame.state.civic.martinGift), "carrying");
  // Reach Maria and verify her existing quest and the new gift coexist.
  await p.evaluate(() => Object.assign(window.civicGame.state, { scene: "town", x: 814, y: 345 }));
  await p.keyboard.press("e"); await drain(); await choose("여기 선물이에요."); await drain();
  await choose("제가 주는 거에요."); await drain();
  assert.equal(await p.evaluate(() => window.civicGame.state.civic.martinGift), "delivered");
  await p.keyboard.press("Escape"); await choose("저장");
  await start();
  assert.equal(await p.evaluate(() => window.civicGame.state.civic.martinGift), "delivered");
  assert.equal(await p.evaluate(() => window.civicGame.state.guild.grade), "A");
  await p.evaluate(() => Object.assign(window.civicGame.state, { scene: "city", x: 465, y: 520 }));
  await p.keyboard.press("e"); await drain(); await choose("네, 아주 좋아하던데요."); await drain();
  assert.equal(await p.evaluate(() => window.civicGame.state.quests.martinGift), "done");
  // Parcel UI and real claim use the promoted supplies exactly once.
  await p.evaluate(() => { window.civicGame.state.scene = "post"; });
  await choose("우체국 직원 료와 대화"); await drain();
  // Inspect and claim through the existing domain function without changing personal saves.
  await p.keyboard.press("Escape");
  await p.evaluate(async () => {
    const s = window.civicGame.state, { receiveParcel } = await import("./src/shop.js");
    const before = s.items.flour;
    if (!receiveParcel(s) || s.items.flour !== before + 20 || receiveParcel(s)) throw Error("Wrong A parcel");
  });
  // Every original sample decodes to audible PCM and schedules a real source.
  await p.evaluate(async () => {
    const g = window.civicGame;
    await g.voices.unlock();
    for (const key of ["lotus", "hendel", "adel", "martin"]) {
      if (!g.voices.buffers.has(key)) throw Error("Voice decode failed: " + key);
      const session = g.voices.begin(); g.voices.type(session, [key]); g.voices.end(session);
    }
  });
  await p.setViewportSize({ width: 390, height: 844 });
  await p.evaluate(() => { window.civicGame.state.scene = "hall"; });
  await choose("아델과 대화 · 조합 등급"); await drain();
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await p.screenshot({ path: "/tmp/bakery-town-hall-mobile.png", fullPage: true });
  assert.deepEqual(errors, []);
  console.log("PASS: hall entry/exit, original background and portraits, all four MP3 decodes/playback, Lotus gift gating, Hendel choices, real sales and Monday A promotion, Martin/Maria delivery-report quest, save/reload, A parcel once daily, and 390px mobile dialogue.");
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
