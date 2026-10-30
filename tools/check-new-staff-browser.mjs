// A private browser context and static host; no real player saves are touched.
import assert from "node:assert/strict";
import http from "node:http";
import { buildWeb } from "./build-web.mjs";
import { staticFiles } from "../server/staticFiles.js";
import { fresh } from "../src/saveSystem.js";
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
  const context = await browser.newContext(),
    p = await context.newPage({ viewport: { width: 1366, height: 1000 } }),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  const state = fresh();
  state.scene = "post";
  state.money = 2000;
  await p.addInitScript(
    (s) =>
      localStorage.setItem(
        "little-hearth:demo:web:/Bakery/1",
        JSON.stringify(s),
      ),
    state,
  );
  await p.goto(`http://127.0.0.1:${server.address().port}/Bakery/`);
  await p.getByRole("button", { name: /^1번 ·/ }).waitFor();
  await p.evaluate(async () => {
    const { UI } = await import("./src/ui.js");
    for (const key of ["panel", "close"]) {
      const original = UI.prototype[key];
      UI.prototype[key] = function (...args) {
        window.staffUI = this;
        return original.apply(this, args);
      };
    }
  });
  const choose = (name) => p.getByRole("button", { name, exact: true }).click(),
    advance = () => advanceDialogue(p);
  const relocate = async (scene) => {
    await p.evaluate((s) => {
      window.staffUI.g.state.scene = s;
    }, scene);
    await p.waitForFunction(
      (s) => document.querySelector("#interior-actions").dataset.scene === s,
      scene,
    );
  };
  await p.getByRole("button", { name: /^1번 ·/ }).click();
  await p.locator("#overlay").waitFor({ state: "hidden" });
  await p.locator(".spot-postTalk").click();
  assert.match(
    await p.locator(".dialogue-portrait img").getAttribute("src"),
    /clerks\/ryo.png$/,
  );
  await p.waitForTimeout(90);
  assert.ok(
    await p.evaluate(() => {
      const m = window.staffUI.dialogueController.model;
      return m.count > 0 && m.count < m.letters.length;
    }),
  );
  await advance();
  assert.equal(await p.locator("#dialogue-speaker").textContent(), "료");
  await choose("네, 서명할게요.");
  await advance();
  assert.equal(await p.evaluate(() => window.staffUI.g.state.items.flour), 16);
  await p.locator(".spot-postTalk").click();
  await advance();
  await choose("잡담하기.");
  await advance();
  await choose("오늘도 예쁘시네요.");
  assert.equal(
    await p.evaluate(
      () => window.staffUI.dialogueController.model.pages.length,
    ),
    2,
  );
  await advance();
  await choose("저희 누나한테 편지는 안 오나요?");
  assert.equal(
    await p.evaluate(
      () => window.staffUI.dialogueController.model.pages.length,
    ),
    4,
  );
  await advance();
  await choose("아무것도 아니에요.");
  await advance();
  assert.equal(await p.evaluate(() => window.staffUI.g.state.scene), "town");
  await relocate("post");
  await p.screenshot({ path: "/tmp/bakery-ryo-room.png" });
  await relocate("workshop");
  await p.screenshot({ path: "/tmp/bakery-new-workshop-room.png" });
  await p.locator(".spot-moldTalk").click();
  assert.match(
    await p.locator(".dialogue-portrait img").getAttribute("src"),
    /clerks\/soma.png$/,
  );
  await advance();
  await choose("말 걸기");
  await advance();
  await choose("이시도로 씨한테 밭 빌려줘서 고맙다고 전해줘요.");
  await advance();
  await choose("곰한테 안기면 어떤 느낌이에요?");
  assert.equal(
    await p.evaluate(
      () => window.staffUI.dialogueController.model.pages.length,
    ),
    5,
  );
  await advance();
  await choose("그렇구나.");
  await choose("옷이 되게 얇으시네요.");
  await advance();
  await choose("..됐어요.");
  await advance();
  await choose("제빵용 틀이 필요해서요.");
  assert.equal(await p.locator("[data-upgrade]").count(), 0);
  await choose("파이 틀 구매 · 150G");
  await choose("쿠키 틀 구매 · 120G");
  assert.equal(await p.evaluate(() => window.staffUI.g.state.money), 1730);
  // A mold shop session cannot authorize oven upgrades.
  await p.evaluate(() => window.staffUI.show("workshopOven"));
  assert.equal(await p.locator("[data-upgrade]").count(), 0);
  assert.match(
    await p.locator(".dialogue-portrait img").getAttribute("src"),
    /clerks\/crematory.png$/,
  );
  await advance();
  await choose("말을 걸어본다.");
  await advance();
  await choose("카페는 자주 들르시나요?");
  await advance();
  await choose("옷이 되게 두꺼우시네요.");
  assert.equal(
    await p.evaluate(
      () => window.staffUI.dialogueController.model.pages.length,
    ),
    5,
  );
  await advance();
  await choose("..됐어요.");
  assert.equal(await p.evaluate(() => window.staffUI.g.state.scene), "city");
  await relocate("workshop");
  await p.locator(".spot-furnaceTalk").click();
  await advance();
  await choose("저희 빵집 오븐을 손봐주셨으면 해요.");
  assert.equal(await p.locator("[data-tool]").count(), 0);
  await choose("용량 확장 · 250G");
  await choose("화력 개선 · 200G");
  assert.equal(await p.evaluate(() => window.staffUI.g.state.money), 1280);
  assert.equal(
    await p.evaluate(() => window.staffUI.g.state.equipment.capacityLevel),
    1,
  );
  await choose("닫기 · ESC");
  // Saved new customers render their SDs; dialog uses their separate upper-body art.
  for (const id of ["post-clerk", "soma", "crematory"]) {
    await p.evaluate(async (id) => {
      const g = window.staffUI.g,
        c = g.data.customers.find((c) => c.portrait === id);
      g.state.scene = "bakery";
      g.state.shop.open = false;
      g.state.shop.customer = {
        name: c.name,
        portrait: id,
        bread: "loaf",
        quantity: 2,
        phase: "waiting",
        arrival: 1.2,
      };
      g.state.display.loaf = 2;
      const { saveSlot, loadSlot } = await import("./src/saveSystem.js");
      await saveSlot(1, g.state);
      g.state = await loadSlot(1);
    }, id);
    await p.locator(".spot-customerTalk").waitFor({ state: "visible" });
    const mask = await p.evaluate(async () => {
      const image = new Image();
      image.src = "assets/backgrounds/interiors/stocked-bakery.png";
      await image.decode();
      const bg = document.createElement("canvas");
      bg.width = 1920;
      bg.height = 1152;
      const c = bg.getContext("2d");
      c.setTransform(2, 0, 0, 2, 0, 0);
      c.imageSmoothingEnabled = false;
      const { drawScenery } = await import("./src/scenery.js");
      drawScenery(c, image);
      await new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(r)),
      );
      const actual = document.querySelector("#world").getContext("2d"),
        a = actual.getImageData(720, 920, 480, 150).data,
        b = c.getImageData(720, 920, 480, 150).data;
      return [...a].every((v, i) => v === b[i]);
    });
    assert.ok(mask);
    await p.screenshot({ path: `/tmp/bakery-visitor-${id}.png` });
    await p.locator(".spot-customerTalk").click();
    const expected =
      id === "post-clerk" ? "료" : id === "soma" ? "소마" : "크레마토리";
    await advance();
    assert.equal(await p.locator("#dialogue-speaker").textContent(), expected);
    assert.ok(
      await p
        .locator("#typed-dialogue")
        .textContent()
        .then((t) => t.includes("밀빵") && t.includes("2")),
    );
    const file = id === "post-clerk" ? "ryo" : id;
    assert.match(
      await p.locator(".dialogue-portrait img").getAttribute("src"),
      new RegExp("/clerks/" + file + "\\.png$"),
    );
    if (id === "post-clerk") {
      const before = await p.evaluate(() => window.staffUI.g.state.money);
      await choose("네, 금방 갖다 드릴게요!");
      await advance();
      assert.equal(
        await p.evaluate(() => window.staffUI.g.state.money),
        before + 32,
      );
      await choose("대화 마치기");
    } else if (id === "soma") {
      await choose("아직 빵이 준비가 안 됐네요.");
      assert.equal(
        await p.evaluate(() => window.staffUI.g.state.shop.customer.portrait),
        "soma",
      );
    } else {
      await choose("오늘 그 빵은 더 못 팔아요.");
      await advance();
      await choose("안녕히 가세요.");
      assert.equal(
        await p.evaluate(() => window.staffUI.g.state.shop.customer),
        null,
      );
    }
  }
  await relocate("workshop");
  await p.setViewportSize({ width: 390, height: 844 });
  const furnaceBox = await p.locator(".spot-furnaceTalk").boundingBox(),
    exitBox = await p.locator(".interior-exit").boundingBox();
  assert.ok(furnaceBox.y + furnaceBox.height <= exitBox.y);
  await p.locator(".spot-moldTalk").click();
  await advance();
  await choose("제빵용 틀이 필요해서요.");
  assert.ok(
    await p.evaluate(() => {
      const e = document.querySelector(".panel"),
        b = e.getBoundingClientRect();
      return (
        e.scrollWidth <= e.clientWidth && b.right <= innerWidth && b.left >= 0
      );
    }),
  );
  await choose("닫기 · ESC");
  assert.deepEqual(errors, []);
  console.log(
    "PASS: Ryo parcel/revisit/4-page story, both workshop staff branches and scoped purchases, 3 visitors SD/portrait/save/serve/wait/decline, counter masks, narrow layout; no JS errors.",
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
