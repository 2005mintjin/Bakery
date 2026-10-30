// Slot 3 is temporary and restored byte-for-byte. Run sequentially with save checks.
import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
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
  const p = await browser.newPage({ viewport: { width: 1280, height: 1000 } }),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.addInitScript(() => {
    window.voiceStarts = [];
    const original = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function () {
      const node = original.call(this),
        start = node.start.bind(node);
      node.start = (...args) => {
        window.voiceStarts.push({
          time: args[0],
          offset: args[1],
          duration: args[2],
          bufferDuration: node.buffer.duration,
        });
        return start(...args);
      };
      return node;
    };
  });
  await p.goto("http://127.0.0.1:5173");
  const initial = await p.evaluate(async () => {
    const { fresh } = await import("/src/saveSystem.js");
    return fresh();
  });
  initial.scene = "cafe";
  await writeFile(file, JSON.stringify(initial));
  await p.reload();
  await p.evaluate(async () => {
    const { UI } = await import("/src/ui.js"),
      { DialogueVoice } = await import("/src/dialogueVoice.js");
    const say = UI.prototype.say,
      type = DialogueVoice.prototype.type,
      unlock = DialogueVoice.prototype.unlock;
    window.voiceKeys = [];
    UI.prototype.say = function (...args) {
      window.voiceUi = this;
      return say.apply(this, args);
    };
    DialogueVoice.prototype.unlock = function () {
      window.voiceEngine = this;
      return unlock.call(this);
    };
    DialogueVoice.prototype.type = function (session, keys, interval) {
      window.voiceKeys.push(...keys.filter(Boolean));
      return type.call(this, session, keys, interval);
    };
  });
  await p.getByRole("button", { name: /3번/ }).click();
  await p.locator("#overlay").waitFor({ state: "hidden" });
  await p
    .waitForFunction(() => window.voiceEngine?.buffers.size === 7, null, {
      timeout: 5000,
    })
    .catch(async () => {
      throw Error(
        JSON.stringify(
          await p.evaluate(() => ({
            engine: !!window.voiceEngine,
            keys: window.voiceEngine
              ? [...window.voiceEngine.buffers.keys()]
              : [],
            context: window.voiceEngine?.getContext()?.state,
            toast: document.querySelector("#toast")?.textContent,
          })),
        ),
      );
    });
  const decoded = await p.evaluate(() =>
    Array.from(window.voiceEngine.buffers, ([key, entry]) => ({
      key,
      length: entry.end - entry.start,
      peak: Math.max(...entry.buffer.getChannelData(0).map(Math.abs)),
    })),
  );
  assert.equal(decoded.length, 7);
  assert.ok(decoded.every((x) => x.length > 0 && x.peak > 0.01));
  async function ready() {
    await p.waitForFunction(
      () =>
        document.querySelector("#typed-dialogue")?.getAttribute("aria-busy") ===
        "false",
    );
  }
  async function starts() {
    return p.evaluate(() => window.voiceStarts.length);
  }
  async function synthetic(
    pages,
    actor = {
      name: "데셰네",
      portraitAsset: "assets/characters/clerks/barista.png",
    },
  ) {
    await p.evaluate(
      ({ pages, actor }) => {
        window.voiceKeys = [];
        window.voiceUi.say(actor, pages);
      },
      { pages, actor },
    );
  }
  await p.locator(".spot-cafeTalk").click();
  await ready();
  assert.deepEqual(
    await p.evaluate(() => window.voiceKeys),
    Array(5).fill("barista"),
  );
  assert.equal(await starts(), 5);
  await p.keyboard.press("Space");
  await p.getByRole("button", { name: "말 걸어보기", exact: true }).click();
  await ready();
  await p.keyboard.press("Space");
  await p
    .getByRole("button", { name: "말 없이 바라보기.", exact: true })
    .click();
  await ready();
  await p.keyboard.press("Space");
  const beforeDots = await starts();
  await p.getByRole("button", { name: "계속 바라보기.", exact: true }).click();
  await ready();
  assert.equal(await p.locator("#typed-dialogue").textContent(), "...");
  assert.equal(await starts(), beforeDots);
  await synthetic([
    { text: "고개를 돌리고 시선을 피한다.", kind: "narration" },
  ]);
  await ready();
  assert.equal(await starts(), beforeDots);
  await synthetic([{ text: "이 부분은 해설이다.", speaker: "나레이터" }]);
  await ready();
  assert.equal(await starts(), beforeDots);
  await synthetic([".... …!? \n"]);
  await ready();
  assert.equal(await starts(), beforeDots);
  const grouped = await p.evaluate(async () => {
    const { voicePlan } = await import("/src/dialogueVoice.js"),
      page = window.voiceUi.g.data.staffStories.store.nodes.welcome.pages[0],
      actor = {
        name: "고양이 세 자매",
        portraitAsset: "assets/characters/clerks/cat-sisters.png",
      };
    window.voiceKeys = [];
    window.voiceUi.say(actor, [page]);
    return voicePlan(page, actor, window.voiceEngine.config).filter(Boolean);
  });
  await ready();
  assert.deepEqual(await p.evaluate(() => window.voiceKeys), grouped);
  assert.ok(
    grouped.includes("arien") &&
      grouped.includes("sasha") &&
      grouped.includes("erina"),
  );
  for (const [name, key] of [
    ["마리아", "maria"],
    ["이시도로", "isidoro"],
    ["하나", "post-clerk"],
    ["데셰네", "barista"],
    ["아리엔", "arien"],
    ["사샤", "sasha"],
    ["에리나", "erina"],
  ]) {
    const before = await starts();
    await synthetic(["가나"], {
      name,
      portraitAsset: "assets/characters/clerks/barista.png",
    });
    await ready();
    assert.deepEqual(await p.evaluate(() => window.voiceKeys), [key, key]);
    assert.equal(await starts(), before + 2);
  }
  await synthetic(["가".repeat(500)]);
  await p.waitForTimeout(50);
  await p.keyboard.press("Space");
  const skipped = await starts();
  await p.waitForTimeout(120);
  assert.equal(await starts(), skipped);
  assert.equal(await p.evaluate(() => window.voiceEngine.active.size), 0);
  await synthetic(["가".repeat(500)]);
  await p.waitForTimeout(50);
  await p.keyboard.press("Escape");
  await p.locator("#overlay").waitFor({ state: "hidden" });
  const closed = await starts();
  await p.waitForTimeout(120);
  assert.equal(await starts(), closed);
  assert.equal(await p.evaluate(() => window.voiceEngine.active.size), 0);
  await p.evaluate(() => window.voiceUi.g.music.setMuted(true));
  await synthetic(["안녕하세요"]);
  await ready();
  assert.equal(await starts(), closed);
  await p.evaluate(() => window.voiceUi.g.music.setMuted(false));
  await p.evaluate(() => window.voiceEngine.getContext().suspend());
  await synthetic(["안녕하세요"]);
  await ready();
  assert.equal(await starts(), closed);
  await p.evaluate(() => window.voiceEngine.getContext().resume());
  await synthetic(["가".repeat(500)]);
  await p.waitForTimeout(50);
  await p.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      value: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  assert.equal(await p.evaluate(() => window.voiceEngine.active.size), 0);
  const hidden = await starts();
  await p.waitForTimeout(100);
  assert.equal(await starts(), hidden);
  await p.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event("visibilitychange"));
    window.voiceUi.close();
  });
  const clips = await p.evaluate(() => window.voiceStarts);
  assert.ok(
    clips.every((c) => c.duration > 0 && c.duration <= 0.028 && c.offset >= 0),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: all 7 MP3s decode to nonzero PCM, each typed letter starts a real Web Audio clip, speaker switching, silence for dots/labels/narration, instant reveal/ESC/mute/hidden/suspended stop without bursts; no JS errors",
  );
} finally {
  await browser?.close();
  if (backup) await writeFile(file, backup);
  else
    await unlink(file).catch((e) => {
      if (e.code !== "ENOENT") throw e;
    });
}
