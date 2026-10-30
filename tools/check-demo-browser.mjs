// Isolated HTTP save fixture: never deletes or writes a real user's saves.
import assert from "node:assert/strict";
import http from "node:http";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  readdir,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHandler } from "../server/app.js";
import { staticFiles } from "../server/staticFiles.js";
import { fresh } from "../src/saveSystem.js";
const { chromium } = await import(
  process.env.BAKERY_PLAYWRIGHT_MODULE || "playwright"
);
const root = path.resolve(fileURLToPath(new URL("../", import.meta.url))),
  temp = await mkdtemp(path.join(tmpdir(), "bakery-demo-ui-")),
  saveDir = path.join(temp, "saves-demo");
await mkdir(saveDir);
await mkdir(path.join(temp, "saves"));
await writeFile(path.join(temp, "saves/slot-1.json"), "production sentinel");
const state = fresh();
Object.assign(state, { scene: "bakeryKitchen", money: 888 });
state.items.water = 20;
state.items.salt = 20;
state.items.flour = 30;
state.items.sugar = 20;
state.items.butter = 20;
state.equipment.pieMold = true;
state.equipment.cookieMold = true;
await writeFile(path.join(saveDir, "slot-1.json"), JSON.stringify(state));
await writeFile(path.join(saveDir, "slot-2.json"), "corrupt");
await writeFile(
  path.join(saveDir, "slot-3.json"),
  JSON.stringify({ ...state, money: 333 }),
);
const api = createHandler(temp, { saveDirectory: "saves-demo" }),
  requests = [];
const server = http.createServer(async (req, res) => {
  requests.push(req.url);
  if (req.url.startsWith("/api/")) return api(req, res);
  try {
    await staticFiles(
      req,
      res,
      new URL(req.url, "http://localhost").pathname,
      root,
    );
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
  await p.addInitScript(() =>
    localStorage.setItem("hearth-custom-sheet-enabled-v2", "yes"),
  );
  await p.goto(`http://127.0.0.1:${server.address().port}`);
  await p.getByRole("button", { name: /^1번 ·/ }).waitFor();
  await p.evaluate(async () => {
    const { UI } = await import("/src/ui.js");
    for (const key of ["panel", "close"]) {
      const original = UI.prototype[key];
      UI.prototype[key] = function (...args) {
        window.demoUI = this;
        return original.apply(this, args);
      };
    }
  });
  const choose = (name) => p.getByRole("button", { name, exact: true }).click();
  await choose("세이브 삭제");
  await choose("2번 세이브 삭제 · 손상된 파일");
  await choose("취소");
  assert.equal(
    await readFile(path.join(saveDir, "slot-2.json"), "utf8"),
    "corrupt",
  );
  await choose("2번 세이브 삭제 · 손상된 파일");
  await choose("삭제하기");
  await p.getByRole("button", { name: /^2번 · 새로운 이야기/ }).waitFor();
  await p.getByRole("button", { name: /^1번 ·/ }).click();
  await p.locator("#overlay").waitFor({ state: "hidden" });
  assert.equal(await p.locator(".demo-badge").textContent(), "DEMO · 테스트판");
  await p.locator('[data-panel="oven"]').click();
  assert.ok(
    await p
      .locator(".ingredient-chip")
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize) >= 16),
  );
  assert.ok(
    await p
      .locator(".panel-actions button")
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize) >= 16),
  );
  for (const selector of [
    ".panel .panel-eyebrow",
    ".cards p",
    ".side-menu button kbd",
  ]) {
    assert.ok(
      await p
        .locator(selector)
        .first()
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize) >= 14),
    );
  }
  await p.screenshot({
    path: "/tmp/bakery-demo-workbench.png",
    fullPage: true,
  });
  await choose("닫기 · ESC");
  await p.keyboard.press("Escape");
  assert.match(await p.locator(".panel").textContent(), /saves-demo/);
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
    await p.evaluate(() => typeof window.demoUI.g.sprite.pick),
    "undefined",
  );
  assert.equal(
    await p.evaluate(() => typeof window.demoUI.g.sprite.custom),
    "undefined",
  );
  await choose("세이브 삭제");
  await choose("3번 세이브 삭제");
  await choose("삭제하기");
  assert.equal(await p.evaluate(() => window.demoUI.g.started), true);
  assert.equal(await p.evaluate(() => window.demoUI.g.slot), 1);
  await assert.rejects(readFile(path.join(saveDir, "slot-3.json")), {
    code: "ENOENT",
  });
  await choose("뒤로");
  await choose("저장");
  await p.locator("#overlay").waitFor({ state: "hidden" });
  assert.equal(
    JSON.parse(await readFile(path.join(saveDir, "slot-1.json"))).money,
    888,
  );
  // Larger text stays inside scrollable panels at smaller desktop and narrow widths.
  for (const width of [1024, 540, 390]) {
    await p.setViewportSize({ width, height: 900 });
    await p.locator('[data-panel="oven"]').click();
    assert.ok(
      await p.evaluate(() => {
        const panel = document.querySelector(".panel"),
          b = panel.getBoundingClientRect();
        return (
          panel.scrollWidth <= panel.clientWidth &&
          b.left >= 0 &&
          b.right <= innerWidth &&
          document.documentElement.scrollWidth <= innerWidth
        );
      }),
    );
    await p.getByRole("tab", { name: "파이", exact: true }).click();
    await choose("파이 반죽 시작");
    const before = await p.evaluate(
      () => window.demoUI.g.state.baking?.progress || 0,
    );
    await p.locator("#dough").scrollIntoViewIfNeeded();
    const box = await p.locator("#dough").boundingBox();
    await p.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5);
    await p.mouse.down();
    await p.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.5, {
      steps: 8,
    });
    await p.mouse.up();
    assert.ok(
      (await p.evaluate(() => window.demoUI.g.state.baking.progress)) > before,
    );
    await choose("닫기 · ESC");
    await p.evaluate(() => {
      window.demoUI.g.state.baking = null;
    });
  }
  await p.setViewportSize({ width: 1366, height: 1000 });
  await p.evaluate(() =>
    window.demoUI.say({ name: "미라", portrait: "mira" }, [
      "글자를 크게 표시하는 대화 화면입니다.",
    ]),
  );
  assert.ok(
    await p
      .locator("#typed-dialogue")
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize) >= 20),
  );
  await p.keyboard.press("Space");
  await p.screenshot({ path: "/tmp/bakery-demo-dialogue.png" });
  await p.keyboard.press("Escape");
  await p.keyboard.press("Escape");
  await choose("세이브 삭제");
  await choose("1번 세이브 삭제");
  await choose("삭제하기");
  await p
    .getByRole("button", { name: "1번 · 새로운 이야기", exact: true })
    .waitFor();
  assert.equal(await p.evaluate(() => window.demoUI.g.started), false);
  assert.deepEqual(await readdir(saveDir), []);
  assert.equal(
    await readFile(path.join(temp, "saves/slot-1.json"), "utf8"),
    "production sentinel",
  );
  assert.equal(
    requests.some((url) => url.startsWith("/api/player-sheet")),
    false,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: demo file isolation, delete cancel/corrupt/other/active slots, no image override even with legacy flags, enlarged text, 1024/540/390 layouts and scaled kneading.",
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
  await rm(temp, { recursive: true, force: true });
}
