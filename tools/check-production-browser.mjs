import { advanceDialogue } from "./browser-dialogue.mjs";
// Optional integration check. Uses slot 3 temporarily and restores its original bytes.
// Run against a local npm start server while nobody is playing in slot 3.
const { chromium } = await import(
  process.env.BAKERY_PLAYWRIGHT_MODULE || "playwright"
);
import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";
const file = fileURLToPath(new URL("../saves/slot-3.json", import.meta.url));
let backup;
try {
  backup = await readFile(file);
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
let browser;
try {
  browser = await chromium.launch({
    ...(process.env.BAKERY_BROWSER
      ? { executablePath: process.env.BAKERY_BROWSER }
      : {}),
    args: ["--no-sandbox"],
  });
  const p = await browser.newPage({ viewport: { width: 1280, height: 1000 } }),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto("http://127.0.0.1:5173");
  const s = await p.evaluate(async () => {
    const { fresh } = await import("/src/saveSystem.js");
    return fresh();
  });
  s.version = 2;
  s.scene = "bakeryKitchen";
  s.money = 100;
  s.items.berry = 4;
  delete s.baking;
  delete s.garden;
  delete s.items.yeast;
  delete s.items.salt;
  delete s.items.berrySeeds;
  await writeFile(file, JSON.stringify(s));
  await p.reload();
  await p.getByRole("button", { name: /3번/ }).click();
  await hidden();
  async function hidden() {
    await p.locator("#overlay").waitFor({ state: "hidden" });
  }
  async function close() {
    await p.getByRole("button", { name: "닫기 · ESC", exact: true }).click();
    await hidden();
  }
  async function save() {
    await p.keyboard.press("Escape");
    await p.getByRole("button", { name: "저장", exact: true }).click();
    await hidden();
    return (await p.request.get("http://127.0.0.1:5173/api/saves/3")).json();
  }
  async function relocate(scene, x, y) {
    const state = await save();
    state.scene = scene;
    state.x = x;
    state.y = y;
    assert.equal(
      (
        await p.request.put("http://127.0.0.1:5173/api/saves/3", {
          data: state,
        })
      ).status(),
      200,
    );
    await p.keyboard.press("Escape");
    await p.getByRole("button", { name: "불러오기", exact: true }).click();
    await hidden();
  }
  async function kneadOneCycle() {
    const box = await p.locator("#dough").boundingBox();
    await p.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.51);
    await p.mouse.down();
    await p.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.51, {
      steps: 10,
    });
    if (await p.locator("#dough").count())
      await p.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.51, {
        steps: 10,
      });
    await p.mouse.up();
  }
  async function finishKneading() {
    for (let i = 0; i < 8 && (await p.locator("#dough").count()); i++)
      await kneadOneCycle();
    await p.getByRole("heading", { name: "토핑 선택", exact: true }).waitFor();
  }
  async function prepareDough(topping) {
    await p.locator(".spot-oven").click();
    await p
      .getByRole("button", { name: "재료 섞어 반죽 시작", exact: true })
      .click();
    await finishKneading();
    await p.getByRole("button", { name: topping, exact: true }).click();
    await close();
  }
  // Save/reload a partially kneaded dough before completing the first bread.
  await p.locator(".spot-oven").click();
  await p
    .getByRole("button", { name: "재료 섞어 반죽 시작", exact: true })
    .click();
  await kneadOneCycle();
  await close();
  let state = await save();
  assert.equal(state.version, 7);
  assert.equal(state.baking.phase, "kneading");
  assert.ok(state.baking.progress > 0 && state.baking.progress < 100);
  await p.keyboard.press("Escape");
  await p.getByRole("button", { name: "불러오기", exact: true }).click();
  await hidden();
  await p.locator(".spot-oven").click();
  await finishKneading();
  await p
    .getByRole("button", { name: "아무것도 넣지 않기 · 밀빵", exact: true })
    .click();
  await close();
  await prepareDough("꿀 1개 넣기 · 꿀빵");
  await prepareDough("베리 2개 넣기 · 베리빵");
  await p.locator(".spot-ovenBatch").click();
  await p
    .getByRole("button", { name: "선택한 반죽 굽기", exact: true })
    .click();
  await p
    .getByRole("button", { name: "완성한 빵 모두 꺼내기", exact: true })
    .waitFor({ timeout: 75000 });
  await p
    .getByRole("button", { name: "완성한 빵 모두 꺼내기", exact: true })
    .click();
  await close();
  state = await save();
  assert.equal(state.warehouse.loaf, 1);
  assert.equal(state.warehouse.honeybread, 1);
  assert.equal(state.warehouse.berrybread, 1);
  await p.locator(".spot-warehouse").click();
  for (const name of ["밀빵", "꿀빵", "베리빵"])
    await p
      .getByRole("button", { name: name + " 꺼내기", exact: true })
      .click();
  await close();
  await p.locator(".room-arrow").click();
  await p.locator(".spot-shelf").click();
  for (const name of ["밀빵", "꿀빵", "베리빵"])
    await p.getByRole("button", { name: name + " 진열", exact: true }).click();
  await close();
  await p.screenshot({
    path: path.join(tmpdir(), "hearth-displayed-breads.png"),
  });
  await p.locator(".spot-shop").click();
  await p.getByRole("button", { name: "개점하기", exact: true }).click();
  await hidden();
  await p
    .getByText("똑똑! 손님이 문을 두드려요. 카운터로 오고 있어요.", {
      exact: true,
    })
    .waitFor();
  await p.waitForTimeout(1400);
  // Keep this broad production check deterministic; randomized selection is tested separately.
  state = await save();
  state.shop.customer.bread = "loaf";
  state.shop.customer.quantity = 1;
  await p.request.put("http://127.0.0.1:5173/api/saves/3", { data: state });
  await p.keyboard.press("Escape");
  await p.getByRole("button", { name: "불러오기", exact: true }).click();
  await hidden();

  await p.screenshot({
    path: path.join(tmpdir(), "hearth-large-customer.png"),
  });
  await p.locator(".spot-customerTalk").click();
  await advanceDialogue(p);
  await p
    .getByRole("button", { name: "네, 금방 갖다 드릴게요!", exact: true })
    .click();
  await close();
  state = await save();
  assert.equal(state.money, 116);
  assert.equal(state.display.loaf, 0);
  await relocate("city", 728, 248);
  await p.keyboard.press("e");
  await p.locator(".spot-storeTalk").click();
  await advanceDialogue(p);
  await p
    .getByRole("button", { name: "상점을 둘러본다.", exact: true })
    .click();
  for (const [name, price] of [
    ["밀가루", 2],
    ["소금", 1],
    ["이스트", 3],
    ["꿀", 5],
    ["베리 씨앗", 8],
  ])
    await p
      .getByRole("button", {
        name: name + " 1개 구매 · " + price + "G",
        exact: true,
      })
      .click();
  await close();
  state = await save();
  assert.equal(state.money, 97);
  await relocate("town", 50, 310);
  await p.keyboard.down("a");
  await p.waitForTimeout(180);
  await p.keyboard.up("a");
  state = await save();
  assert.equal(state.scene, "field");
  await relocate("field", 685, 310);
  await p.keyboard.press("e");
  await p
    .getByRole("heading", { name: "베리 텃밭 · 3번 밭", exact: true })
    .waitFor();
  await p.getByRole("button", { name: "씨앗 심기", exact: true }).click();
  await p.getByRole("button", { name: "물 주기", exact: true }).click();
  await close();
  state = await save();
  assert.ok(state.garden[2].wateredAt !== null);
  const berry = state.items.berry;
  await p.screenshot({ path: path.join(tmpdir(), "hearth-berry-field.png") });
  const fieldPosition = { x: state.x, y: state.y };
  await relocate("bakery", 480, 500);
  await p.locator(".spot-shop").click();
  await p
    .getByRole("button", { name: "가게 닫고 퇴근하기", exact: true })
    .click();
  await p
    .getByRole("button", { name: "잠자기 · 오전 6시에 기상", exact: true })
    .click();
  await hidden();
  await relocate("field", fieldPosition.x, fieldPosition.y);
  await p.keyboard.press("e");
  await p.getByRole("button", { name: "베리 수확", exact: true }).click();
  await close();
  state = await save();
  assert.equal(state.items.berry, berry + 8);
  assert.equal(state.garden[2], null);
  await relocate("bakeryKitchen", 480, 500);
  await p.setViewportSize({ width: 540, height: 850 });
  await p.locator(".spot-oven").click();
  await p
    .getByRole("button", { name: "재료 섞어 반죽 시작", exact: true })
    .click();
  await kneadOneCycle();
  await close();
  state = await save();
  assert.ok(state.baking.progress > 0);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: v2 migration, real mouse kneading and partial save/load, all 3 breads, display art, knock and upper-body customer, sale, individual purchases, western portal, planting/watering/next-day harvest, narrow-screen kneading; no JS errors",
  );
} finally {
  await browser?.close();
  if (backup) await writeFile(file, backup);
  else
    await unlink(file).catch((e) => {
      if (e.code !== "ENOENT") throw e;
    });
}
