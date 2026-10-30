// Self-contained static host and isolated storage; no real saves are read or changed.
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
  const p = await browser.newPage({ viewport: { width: 1366, height: 1000 } }),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  const old = fresh();
  Object.assign(old, { x: 277, y: 275 });
  delete old.tutorial;
  await p.addInitScript(
    ({ state, key }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(state));
    },
    { state: old, key: webSavePrefix + "/Bakery/1" },
  );
  const address = `http://127.0.0.1:${server.address().port}/Bakery/`;
  async function install() {
    await p.evaluate(async () => {
      const { UI } = await import("./src/ui.js"),
        { DialogueVoice } = await import("./src/dialogueVoice.js");
      for (const key of ["panel", "close"]) {
        const original = UI.prototype[key];
        UI.prototype[key] = function (...args) {
          window.guideUI = this;
          return original.apply(this, args);
        };
      }
      const type = DialogueVoice.prototype.type;
      window.spokenKeys = [];
      DialogueVoice.prototype.type = function (session, keys, ...rest) {
        window.spokenKeys.push(...keys.filter(Boolean));
        return type.call(this, session, keys, ...rest);
      };
    });
  }
  const choose = (name) =>
    p.locator("#overlay").getByRole("button", { name, exact: true }).click();
  const start = async () => {
    await p.getByRole("button", { name: /^1번 ·/ }).click();
    await p.locator("#overlay").waitFor({ state: "hidden" });
  };
  await p.goto(address);
  await p.getByRole("button", { name: /^1번 ·/ }).waitFor();
  await install();
  await start();
  assert.equal(
    await p.evaluate(() => window.guideUI.g.state.tutorial.bakeryIntroSeen),
    false,
  );
  await p.keyboard.press("e");
  await p
    .getByRole("heading", { name: "빵집 이용 안내", exact: true })
    .waitFor();
  assert.equal(await p.evaluate(() => window.guideUI.g.state.scene), "bakery");
  assert.equal(
    await p.evaluate(() => window.guideUI.g.state.tutorial.bakeryIntroSeen),
    true,
  );
  const paused = await p.evaluate(() => ({
    minutes: window.guideUI.g.state.minutes,
    money: window.guideUI.g.state.money,
    stamina: window.guideUI.g.state.stamina,
    items: JSON.stringify(window.guideUI.g.state.items),
  }));
  await p.waitForTimeout(150);
  assert.equal(
    await p.evaluate(() => window.guideUI.g.state.minutes),
    paused.minutes,
  );
  await choose("다음 안내");
  await choose("이전 안내");
  assert.match(await p.locator(".guide-page").textContent(), /1 \/ 4/);
  for (let i = 0; i < 3; i++) await choose("다음 안내");
  await p.screenshot({ path: "/tmp/fencer-guide-desktop.png" });
  await choose("빵집 시작하기");
  assert.equal(
    await p.evaluate(() => window.guideUI.g.state.money),
    paused.money,
  );
  assert.equal(
    await p.evaluate(() => window.guideUI.g.state.stamina),
    paused.stamina,
  );
  assert.equal(
    await p.evaluate(() => JSON.stringify(window.guideUI.g.state.items)),
    paused.items,
  );
  await p.locator(".interior-exit").click();
  await p.waitForFunction(() => window.guideUI.g.state.scene === "town");
  await p.keyboard.press("e");
  await p.waitForFunction(() => window.guideUI.g.state.scene === "bakery");
  await p.waitForTimeout(90);
  assert.equal(await p.locator("#overlay").isVisible(), false);
  await p.keyboard.press("Escape");
  await choose("빵집 이용 안내");
  await p.keyboard.press("Escape");
  await p.waitForTimeout(90);
  assert.equal(await p.locator("#overlay").isVisible(), false);
  await p.keyboard.press("Escape");
  await choose("저장");
  await p.locator("#overlay").waitFor({ state: "hidden" });
  await p.reload();
  await p.getByRole("button", { name: /^1번 ·/ }).waitFor();
  await install();
  await start();
  await p.waitForTimeout(90);
  assert.equal(await p.locator("#overlay").isVisible(), false);
  assert.equal(
    await p.evaluate(() => window.guideUI.g.state.tutorial.bakeryIntroSeen),
    true,
  );
  await p.waitForFunction(() => window.guideUI.g.voices.buffers.size === 9);
  async function cropEqualsSource() {
    await p.locator('.dialogue-sprite[data-ready="true"]').waitFor();
    return p.evaluate(async () => {
      const c = window.guideUI.g.state.shop.customer,
        person = window.guideUI.g.data.customers.find(
          (p) =>
            p.portrait === c?.portrait ||
            p.name === document.querySelector("#dialogue-speaker").textContent,
        ),
        [x, y, w, h] = person.spriteBounds,
        img = new Image();
      img.src = person.spriteAsset;
      await img.decode();
      const reference = document.createElement("canvas");
      reference.width = w;
      reference.height = h;
      const rc = reference.getContext("2d");
      if (person.spriteClip) {
        rc.beginPath();
        person.spriteClip.forEach(([px, py], i) => {
          if (i) rc.lineTo(px, py);
          else rc.moveTo(px, py);
        });
        rc.closePath();
        rc.clip();
      }
      rc.drawImage(img, x, y, w, h, 0, 0, w, h);
      const actual = document.querySelector(".dialogue-sprite");
      return (
        actual.width === w &&
        actual.height === h &&
        actual.toDataURL() === reference.toDataURL()
      );
    });
  }
  for (const id of ["arien", "sasha", "erina"]) {
    await p.evaluate((id) => {
      const g = window.guideUI.g,
        person = g.data.customers.find((p) => p.portrait === id);
      g.state.shop.open = false;
      g.state.shop.customer = {
        name: person.name,
        portrait: id,
        bread: "loaf",
        quantity: 2,
        phase: "waiting",
        arrival: 1.2,
      };
      g.state.display.loaf = id === "sasha" ? 0 : 2;
      window.spokenKeys = [];
    }, id);
    await p.locator(".spot-customerTalk").click();
    assert.ok(await cropEqualsSource());
    assert.equal(await p.locator(".dialogue-portrait img").count(), 0);
    await p.waitForFunction(
      () =>
        document.querySelector("#typed-dialogue").getAttribute("aria-busy") ===
        "false",
    );
    assert.ok(
      await p.evaluate(
        (id) =>
          window.spokenKeys.length > 0 &&
          window.spokenKeys.every((k) => k === id),
        id,
      ),
    );
    await advanceDialogue(p);
    await p.screenshot({ path: `/tmp/fencer-sister-${id}.png` });
    if (id === "arien") {
      await choose("네, 금방 갖다 드릴게요!");
      assert.ok(await cropEqualsSource());
      await advanceDialogue(p);
      await choose("대화 마치기");
    } else if (id === "sasha") {
      await choose("네, 금방 갖다 드릴게요!");
      assert.ok(await cropEqualsSource());
      await advanceDialogue(p);
      await choose("아직 빵이 준비가 안 됐네요.");
    } else {
      await choose("오늘 그 빵은 더 못 팔아요.");
      assert.ok(await cropEqualsSource());
      await advanceDialogue(p);
      await choose("안녕히 가세요.");
    }
  }
  await p.evaluate(() => {
    window.guideUI.g.state.scene = "store";
    window.spokenKeys = [];
  });
  await p.locator(".spot-storeTalk").click();
  await p.waitForFunction(
    () =>
      document.querySelector("#typed-dialogue").getAttribute("aria-busy") ===
      "false",
  );
  assert.match(
    await p.locator(".dialogue-portrait img").getAttribute("src"),
    /cat-sisters.png$/,
  );
  assert.equal(await p.locator(".dialogue-sprite").count(), 0);
  for (const id of ["arien", "sasha", "erina"])
    assert.ok(await p.evaluate((id) => window.spokenKeys.includes(id), id));
  await p.keyboard.press("Escape");
  await p.evaluate(() => (window.guideUI.g.state.scene = "bakery"));
  await p.setViewportSize({ width: 390, height: 844 });
  await p.locator(".spot-bakeryGuide").click();
  assert.ok(
    await p.evaluate(() => {
      const e = document.querySelector(".panel"),
        b = e.getBoundingClientRect();
      return (
        e.scrollWidth <= e.clientWidth && b.left >= 0 && b.right <= innerWidth
      );
    }),
  );
  await p.screenshot({ path: "/tmp/fencer-guide-narrow.png" });
  await p.keyboard.press("Escape");
  assert.deepEqual(errors, []);
  console.log(
    "PASS: first real bakery entry guide, paused clock/resources, navigation/ESC/reentry/save/reload/reopen, exact sister SD crops on order/thanks/missing/decline and individual voices, unchanged grouped store art/voices, narrow guide.",
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
