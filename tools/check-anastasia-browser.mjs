// Isolated browser/static server. Never reads or writes personal save files.
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
  const s = Object.assign(fresh(), { x: 235, y: 350 });
  s.tutorial.bakeryIntroSeen = true;
  delete s.anastasia;
  await p.addInitScript(
    ({ state, key }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(state));
      window.voiceStarts = [];
      const create = AudioContext.prototype.createBufferSource;
      AudioContext.prototype.createBufferSource = function () {
        const node = create.call(this),
          start = node.start.bind(node);
        node.start = (...args) => {
          const voices = window.testUI?.g.voices;
          const key = voices
            ? [...voices.buffers].find(
                ([, entry]) => entry.buffer === node.buffer,
              )?.[0]
            : null;
          window.voiceStarts.push({ key, offset: args[1], duration: args[2] });
          return start(...args);
        };
        return node;
      };
    },
    { state: s, key: webSavePrefix + "/Bakery/1" },
  );
  const address = `http://127.0.0.1:${server.address().port}/Bakery/`;
  async function install() {
    await p.evaluate(async () => {
      const { UI } = await import("./src/ui.js"),
        { Renderer } = await import("./src/renderer.js");
      for (const name of ["panel", "close"]) {
        const original = UI.prototype[name];
        UI.prototype[name] = function (...args) {
          window.testUI = this;
          return original.apply(this, args);
        };
      }
      const draw = Renderer.prototype.draw;
      Renderer.prototype.draw = function (...args) {
        window.testRenderer = this;
        return draw.apply(this, args);
      };
    });
  }
  const click = (name) =>
    p.locator("#overlay").getByRole("button", { name, exact: true }).click();
  const talk = async () => {
    await p.keyboard.press("e");
    await p
      .locator("#dialogue-speaker")
      .filter({ hasText: "아나스타샤" })
      .waitFor();
  };
  await p.goto(address);
  await p.getByRole("button", { name: /^1번 ·/ }).waitFor();
  await install();
  await p.getByRole("button", { name: /^1번 ·/ }).click();
  await p.locator("#overlay").waitFor({ state: "hidden" });
  await p.waitForFunction(
    () => window.testUI.g.voices.buffers.has("anastasia"),
    null,
    { timeout: 5000 },
  );
  assert.ok(
    await p.evaluate(() =>
      window.testRenderer.residentArt
        .get("mira")
        .src.endsWith("anastasia-sd.png"),
    ),
  );
  await talk();
  await p.waitForTimeout(220);
  assert.ok(
    await p.evaluate(() =>
      window.voiceStarts.some((s) => s.key === "anastasia" && s.duration > 0),
    ),
  );
  await p.locator(".dialogue-portrait img").evaluate((img) => img.decode());
  assert.match(
    await p.locator(".dialogue-portrait img").getAttribute("src"),
    /anastasia-portrait.png$/,
  );
  await advanceDialogue(p);
  await click("네, 맞아요. 무슨 부탁이 있으시죠?");
  await p.keyboard.press("Escape");
  assert.equal(
    await p.evaluate(() => window.testUI.g.state.quests.delivery),
    undefined,
  );
  await talk();
  await advanceDialogue(p);
  await click("네, 맞아요. 무슨 부탁이 있으시죠?");
  await advanceDialogue(p);
  assert.equal(
    await p.evaluate(() => window.testUI.g.state.quests.delivery),
    "active",
  );
  await talk();
  await advanceDialogue(p);
  await click("그럼요.");
  await advanceDialogue(p);
  assert.equal(
    await p.evaluate(() => window.testUI.g.state.quests.delivery),
    "active",
  );
  assert.equal(await p.evaluate(() => window.testUI.g.state.money), 60);
  await p.evaluate(() => (window.testUI.g.state.items.loaf = 1));
  await talk();
  await advanceDialogue(p);
  await click("그럼요.");
  assert.equal(await p.evaluate(() => window.testUI.g.state.items.loaf), 1);
  await advanceDialogue(p);
  assert.equal(
    await p.evaluate(() => window.testUI.g.state.quests.delivery),
    "done",
  );
  assert.equal(await p.evaluate(() => window.testUI.g.state.money), 95);
  await talk();
  await advanceDialogue(p);
  await click("그럼 동생은 지어낸 건가요?");
  await advanceDialogue(p);
  await click("빵을 정말 좋아하시나 보네요.");
  await advanceDialogue(p);
  await click("...그래요.");
  // Next working day's daily quest, item stability and journal.
  await p.evaluate(() => {
    window.testUI.show("menu");
    window.testUI.g.state.day = 2;
    window.testUI.g.state.minutes = 360;
    window.testUI.close();
  });
  await talk();
  await advanceDialogue(p);
  await click("당연하죠, 무슨 빵으로 드릴까요?");
  await advanceDialogue(p);
  const product = await p.evaluate(
    () => window.testUI.g.state.anastasia.daily.product,
  );
  assert.ok(["loaf", "honeybread", "berrybread"].includes(product));
  await p.evaluate(() => window.testUI.show("journal"));
  assert.ok(
    (await p.locator("#overlay").textContent()).includes(
      "아나스타샤의 오늘도 갓 구운 빵",
    ),
  );
  await p.keyboard.press("Escape");
  await p.evaluate(() => window.testUI.show("menu"));
  await click("저장");
  await p.reload();
  await p.getByRole("button", { name: /^1번 ·/ }).waitFor();
  await install();
  await p.getByRole("button", { name: /^1번 ·/ }).click();
  assert.equal(
    await p.evaluate(() => window.testUI.g.state.anastasia.daily.product),
    product,
  );
  await p.evaluate(() => {
    const s = window.testUI.g.state;
    s.items[s.anastasia.daily.product] = 1;
  });
  await talk();
  await advanceDialogue(p);
  await click("당연하죠, 여기 있어요.");
  await advanceDialogue(p);
  assert.equal(
    await p.evaluate(() => window.testUI.g.state.anastasia.daily.status),
    "done",
  );
  const money = await p.evaluate(() => window.testUI.g.state.money);
  await talk();
  await advanceDialogue(p);
  await click("고마워요.");
  await advanceDialogue(p);
  await click("그냥 저희 빵집에서 사 가면 안 될까요?");
  await advanceDialogue(p);
  await click("..그렇군요.");
  assert.equal(await p.evaluate(() => window.testUI.g.state.money), money);
  // Counter SD stays behind foreground; conversation uses the distinct upper-body image.
  await p.evaluate(() => {
    const ui = window.testUI;
    Object.assign(ui.g.state, { scene: "bakery", minutes: 360 });
    ui.g.state.shop.customer = {
      name: "아나스타샤",
      portrait: "mira",
      bread: "loaf",
      quantity: 1,
      phase: "waiting",
      arrival: 1.2,
    };
    ui.g.state.display.loaf = 1;
    window.voiceStarts = [];
  });
  await p.waitForTimeout(60);
  await p
    .locator("canvas")
    .first()
    .screenshot({ path: "/tmp/anastasia-counter.png" });
  assert.equal(
    await p.evaluate(() =>
      window.testRenderer.counterArt
        .get("mira")
        .src.endsWith("anastasia-sd.png"),
    ),
    true,
  );
  const foreground = await p.evaluate(() => {
    const r = window.testRenderer,
      compare = document.createElement("canvas");
    compare.width = 960;
    compare.height = 576;
    const c = compare.getContext("2d");
    c.drawImage(r.bg.bakery, 0, 0, 960, 576);
    const a = r.c.getImageData(2 * 350, 2 * 480, 2 * 250, 2 * 40).data;
    const expected = document.createElement("canvas");
    expected.width = 1920;
    expected.height = 1152;
    const e = expected.getContext("2d");
    e.drawImage(r.bg.bakery, 0, 0);
    const b = e.getImageData(2 * 350, 2 * 480, 2 * 250, 2 * 40).data;
    return a.every((v, i) => v === b[i]);
  });
  assert.ok(foreground);
  await p.evaluate(() => window.testUI.show("customerTalk"));
  await p.waitForTimeout(240);
  await p.locator(".dialogue-portrait img").evaluate((img) => img.decode());
  assert.match(
    await p.locator(".dialogue-portrait img").getAttribute("src"),
    /anastasia-portrait.png$/,
  );
  assert.ok(
    await p.evaluate(() =>
      window.voiceStarts.some((s) => s.key === "anastasia"),
    ),
  );
  await advanceDialogue(p);
  await click("네, 금방 갖다 드릴게요!");
  await advanceDialogue(p);
  await click("대화 마치기");
  await p.evaluate(() => {
    window.voiceStarts = [];
    window.testUI.say(window.testUI.g.data.npcs[0], ["가나."]);
  });
  await p.waitForFunction(
    () => window.testUI.dialogueController.model.phase !== "typing",
  );
  assert.equal(
    await p.evaluate(
      () => window.voiceStarts.filter((s) => s.key === "anastasia").length,
    ),
    2,
  );
  await p.keyboard.press("Escape");
  // Punctuation and narration remain silent; natural letters trigger one source per visible voiced character.
  for (const page of [
    { text: "...." },
    { text: "조용히 생각한다.", kind: "narration" },
  ]) {
    await p.evaluate((page) => {
      window.voiceStarts = [];
      window.testUI.say(window.testUI.g.data.npcs[0], [page]);
    }, page);
    await p.waitForTimeout(220);
    assert.equal(await p.evaluate(() => window.voiceStarts.length), 0);
    await p.keyboard.press("Escape");
  }
  await p.setViewportSize({ width: 390, height: 844 });
  await p.evaluate(() => {
    const g = window.testUI.g;
    g.state.scene = "town";
    g.ui.close();
  });
  await talk();
  await advanceDialogue(p);
  assert.equal(
    await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  );
  await p
    .locator("#overlay .panel")
    .screenshot({ path: "/tmp/anastasia-dialogue-narrow.png" });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: real plaza interaction, original SD/portrait, supplied MP3 decoding and letter voice, all main/daily conversations, quest journal, no early/duplicate rewards, save/reload, bakery visitor SD/foreground/portrait/voice, silent punctuation/narration and narrow dialogue.",
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
