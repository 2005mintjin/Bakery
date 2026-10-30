import { webSavePrefix } from "../src/edition.js";
// Test real MP3 decoding and dialogue synchronization without touching personal saves.
import assert from "node:assert/strict";
import http from "node:http";
import { buildWeb } from "./build-web.mjs";
import { staticFiles } from "../server/staticFiles.js";
import { fresh } from "../src/saveSystem.js";
const { chromium } = await import(
  process.env.BAKERY_PLAYWRIGHT_MODULE || "playwright"
);
const root = await buildWeb(),
  server = http.createServer(async (req, res) => {
    try {
      const name = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      if (!name.startsWith("/Bakery/")) throw Error("path");
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
  const p = await browser.newPage(),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  const s = fresh();
  s.scene = "post";
  await p.addInitScript(
    ({ state, key }) => {
      localStorage.setItem(key, JSON.stringify(state));
      window.sampleStarts = [];
      const create = AudioContext.prototype.createBufferSource;
      AudioContext.prototype.createBufferSource = function () {
        const node = create.call(this),
          start = node.start.bind(node);
        node.start = (...args) => {
          const voices = window.voiceUI?.g.voices;
          const key = voices
            ? [...voices.buffers].find(([, v]) => v.buffer === node.buffer)?.[0]
            : null;
          window.sampleStarts.push({ key, offset: args[1], duration: args[2] });
          return start(...args);
        };
        return node;
      };
    },
    { state: s, key: webSavePrefix + "/Bakery/1" },
  );
  await p.goto(`http://127.0.0.1:${server.address().port}/Bakery/`);
  await p.getByRole("button", { name: /^1번 ·/ }).waitFor();
  await p.evaluate(async () => {
    const { UI } = await import("./src/ui.js");
    for (const key of ["panel", "close"]) {
      const original = UI.prototype[key];
      UI.prototype[key] = function (...args) {
        window.voiceUI = this;
        return original.apply(this, args);
      };
    }
  });
  await p.getByRole("button", { name: /^1번 ·/ }).click();
  await p.locator("#overlay").waitFor({ state: "hidden" });
  await p.waitForFunction(() => window.voiceUI.g.voices.buffers.size === 9);
  const decoded = await p.evaluate(() =>
    ["post-clerk", "soma", "crematory"].map((key) => {
      const e = window.voiceUI.g.voices.buffers.get(key),
        samples = e.buffer.getChannelData(0);
      let peak = 0;
      for (const n of samples) peak = Math.max(peak, Math.abs(n));
      return {
        key,
        duration: e.buffer.duration,
        audible: e.end - e.start,
        peak,
      };
    }),
  );
  assert.ok(decoded.every((e) => e.audible > 0 && e.peak > 0.001));
  const ready = () =>
    p.waitForFunction(
      () =>
        document.querySelector("#typed-dialogue")?.getAttribute("aria-busy") ===
        "false",
    );
  const close = () => p.keyboard.press("Escape");
  async function verify(key) {
    await ready();
    const result = await p.evaluate(() => ({
      text: document.querySelector("#typed-dialogue").textContent,
      starts: window.sampleStarts,
    }));
    assert.equal(
      result.starts.length,
      [...result.text].filter((c) => /[\p{L}\p{N}]/u.test(c)).length,
    );
    assert.ok(
      result.starts.every(
        (e) => e.key === key && e.duration > 0 && e.duration <= 0.028,
      ),
    );
  }
  for (const [scene, spot, key] of [
    ["post", ".spot-postTalk", "post-clerk"],
    ["workshop", ".spot-moldTalk", "soma"],
    ["workshop", ".spot-furnaceTalk", "crematory"],
  ]) {
    await p.evaluate((scene) => {
      window.voiceUI.g.state.scene = scene;
      window.sampleStarts = [];
    }, scene);
    await p.locator(spot).click();
    await verify(key);
    await close();
    assert.equal(
      await p.evaluate(() => window.voiceUI.g.voices.active.size),
      0,
    );
  }
  for (const key of ["post-clerk", "soma", "crematory"]) {
    await p.evaluate((key) => {
      const g = window.voiceUI.g,
        c = g.data.customers.find((c) => c.portrait === key);
      g.state.scene = "bakery";
      g.state.shop.open = false;
      g.state.shop.customer = {
        name: c.name,
        portrait: key,
        bread: "loaf",
        quantity: 2,
        phase: "waiting",
        arrival: 1.2,
      };
      window.sampleStarts = [];
    }, key);
    await p.locator(".spot-customerTalk").click();
    await verify(key);
    await close();
  }
  const synthetic = (text, extra = {}) =>
    p.evaluate(
      ({ text, extra }) => {
        window.sampleStarts = [];
        window.voiceUI.say(
          { name: "소마", portraitAsset: "assets/characters/clerks/soma.png" },
          [{ text, ...extra }],
        );
      },
      { text, extra },
    );
  for (const page of [
    { text: ".... …!? " },
    { text: "고개를 돌린다.", kind: "narration" },
    { text: "설명하는 문장.", speaker: "나레이터" },
  ]) {
    const { text, ...extra } = page;
    await synthetic(text, extra);
    await ready();
    assert.equal(await p.evaluate(() => window.sampleStarts.length), 0);
    await close();
  }
  await synthetic("아아아아아아아아아아아아아아아아아아아아");
  await p.waitForTimeout(90);
  const before = await p.evaluate(() => window.sampleStarts.length);
  assert.ok(before > 0);
  await p.evaluate(() =>
    document.addEventListener(
      "keydown",
      (e) => {
        if (e.code === "Space") window.skipAt = window.sampleStarts.length;
      },
      { capture: true, once: true },
    ),
  );
  await p.keyboard.press("Space");
  await p.waitForTimeout(120);
  assert.equal(
    await p.evaluate(() => window.sampleStarts.length),
    await p.evaluate(() => window.skipAt),
  );
  assert.equal(await p.evaluate(() => window.voiceUI.g.voices.active.size), 0);
  await close();
  await synthetic("아아아아아아아아아아아아아아아아아아아아");
  await p.waitForTimeout(90);
  await close();
  const stopped = await p.evaluate(() => window.sampleStarts.length);
  await p.waitForTimeout(120);
  assert.equal(await p.evaluate(() => window.sampleStarts.length), stopped);
  assert.equal(await p.evaluate(() => window.voiceUI.g.voices.active.size), 0);
  await p.evaluate(() => window.voiceUI.g.music.setMuted(true));
  await synthetic("안녕하세요");
  await ready();
  assert.equal(await p.evaluate(() => window.sampleStarts.length), 0);
  await close();
  assert.deepEqual(errors, []);
  console.log(JSON.stringify(decoded));
  console.log(
    "PASS: 3 supplied MP3s decode, real staff and bakery dialogues use correct samples per letter, punctuation/narration silent, skip/ESC/mute stop audio; isolated test context.",
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
