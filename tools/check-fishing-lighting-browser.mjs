// Isolated static host/browser storage; never reads personal saves.
import assert from "node:assert/strict";
import http from "node:http";
import { writeFileSync } from "node:fs";
import { buildWeb } from "./build-web.mjs";
import { staticFiles } from "../server/staticFiles.js";
import { fresh } from "../src/saveSystem.js";
import { webSavePrefix } from "../src/edition.js";
const { chromium } = await import(
  process.env.BAKERY_PLAYWRIGHT_MODULE || "playwright"
);
const root = await buildWeb();
const server = http.createServer(async (req, res) => {
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
  const s = Object.assign(fresh(), { scene: "field", x: 48, y: 310 });
  s.tutorial.bakeryIntroSeen = true;
  await p.addInitScript(
    ({ state, key }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(state));
    },
    { state: s, key: webSavePrefix + "/Bakery/1" },
  );
  await p.goto(`http://127.0.0.1:${server.address().port}/Bakery/`);
  await p.getByRole("button", { name: /^1번 ·/ }).waitFor();
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
  await p.getByRole("button", { name: /^1번 ·/ }).click();
  await p.locator("#overlay").waitFor({ state: "hidden" });
  await p.keyboard.down("a");
  await p.waitForFunction(() => window.testUI.g.state.scene === "pond");
  await p.keyboard.up("a");
  assert.equal(await p.evaluate(() => window.testUI.g.state.scene), "pond");
  await p.keyboard.down("a");
  await p.waitForFunction(() => window.testUI.g.state.x < 590);
  await p.keyboard.up("a");
  await p.keyboard.press("e");
  await p.getByRole("heading", { name: "서쪽 호숫가 · 낚시" }).waitFor();
  await p.getByRole("button", { name: "낚싯대 던지기", exact: true }).click();
  await p.keyboard.press("Space");
  await p.getByRole("status").filter({ hasText: "조금 빨랐어요" }).waitFor();
  assert.equal(await p.evaluate(() => window.testUI.g.state.items.fish), 0);
  for (let i = 1; i <= 2; i++) {
    await p.getByRole("button", { name: "낚싯대 던지기", exact: true }).click();
    await p
      .getByRole("status")
      .filter({ hasText: "물고기가 물었어요" })
      .waitFor();
    if (i === 1) await p.keyboard.press("Space");
    else
      await p
        .getByRole("button", { name: "낚아채기 · Space", exact: true })
        .click();
    await p
      .getByRole("status")
      .filter({ hasText: "생선 1마리를 잡았어요" })
      .waitFor();
    assert.equal(await p.evaluate(() => window.testUI.g.state.items.fish), i);
  }
  await p.keyboard.press("Escape");
  assert.equal(await p.evaluate(() => window.testUI.g.state.fishing), null);
  // Roundtrip real browser save, including new scene and caught fish.
  await p.evaluate(async () => {
    const { saveSlot, loadSlot } = await import("./src/saveSystem.js");
    const g = window.testUI.g;
    await saveSlot(2, g.state);
    g.state = await loadSlot(2);
  });
  assert.equal(await p.evaluate(() => window.testUI.g.state.items.fish), 2);
  await p.keyboard.down("d");
  await p.waitForFunction(() => window.testUI.g.state.scene === "field");
  await p.keyboard.up("d");
  await p.evaluate(() => {
    const ui = window.testUI;
    ui.panel("<h2>조명 검사</h2>");
    ui.g.state.scene = "bakery";
  });
  async function sample(scene, time) {
    return p.evaluate(
      async ({ scene, time }) => {
        const ui = window.testUI;
        ui.g.state.scene = scene;
        ui.g.state.minutes = time;
        await new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        );
        const c = document.querySelector("canvas").getContext("2d"),
          data = c.getImageData(0, 0, 1920, 1152).data;
        let sum = 0;
        for (let i = 0; i < data.length; i += 4)
          sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
        return sum / (data.length / 4);
      },
      { scene, time },
    );
  }
  const results = {};
  for (const scene of [
    "bakery",
    "bakeryKitchen",
    "post",
    "store",
    "cafe",
    "workshop",
    "town",
    "city",
    "pond",
  ]) {
    const day = await sample(scene, 360),
      sunset = await sample(scene, 1050),
      night = await sample(scene, 1140);
    assert.ok(day > night + 4, `${scene} gets darker: ${day} vs ${night}`);
    assert.ok(sunset > night, `${scene} sunset brighter than night`);
    results[scene] = {
      day: Math.round(day),
      sunset: Math.round(sunset),
      night: Math.round(night),
    };
  }
  // Lamps brighten their actual background locations after the night overlay.
  const lamps = await p.evaluate(async () => {
    const { drawSceneLighting } = await import("./src/render/lighting.js");
    const r = window.testRenderer,
      results = [];
    for (const scene of ["bakery", "town", "city", "pond"]) {
      const canvas = document.createElement("canvas");
      canvas.width = 960;
      canvas.height = 576;
      const c = canvas.getContext("2d");
      const config = r.lighting[scene],
        [x, y] = config.lamps[0];
      const draw = (lighting) => {
        c.clearRect(0, 0, 960, 576);
        c.drawImage(r.bg[scene], 0, 0, 960, 576);
        drawSceneLighting({ c, lighting }, scene, 1140);
        return [...c.getImageData(x, y, 1, 1).data]
          .slice(0, 3)
          .reduce((a, b) => a + b, 0);
      };
      results.push({
        scene,
        on: draw(r.lighting),
        off: draw({ [scene]: { ...config, lamps: [] } }),
      });
    }
    return results;
  });
  for (const lamp of lamps)
    assert.ok(
      lamp.on > lamp.off + (lamp.scene === "bakery" ? 20 : 50),
      `${lamp.scene} lamp lights`,
    );
  await sample("bakery", 1140);
  writeFileSync(
    "/tmp/bakery-night.png",
    Buffer.from(
      await p.evaluate(
        () => document.querySelector("canvas").toDataURL().split(",")[1],
      ),
      "base64",
    ),
  );
  await p.evaluate(() => {
    window.testUI.close();
    Object.assign(window.testUI.g.state, {
      scene: "pond",
      minutes: 1000,
      x: 574,
      y: 318,
    });
  });
  await p.waitForTimeout(100);
  await p.locator("canvas").first().screenshot({ path: "/tmp/pond-day.png" });
  await p.setViewportSize({ width: 640, height: 800 });
  await p.keyboard.press("e");
  await p.getByRole("heading", { name: "서쪽 호숫가 · 낚시" }).waitFor();
  assert.equal(
    await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  );
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      { passed: true, lighting: results, lamps, fish: 2, narrowScreen: true },
      null,
      2,
    ),
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
