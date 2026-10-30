import { advanceDialogue } from "./browser-dialogue.mjs";
// Uses slot 3 temporarily and restores it byte-for-byte; run sequentially with save checks.
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
  await p.goto("http://127.0.0.1:5173");
  const initial = await p.evaluate(async () => {
    const { fresh } = await import("/src/saveSystem.js");
    return fresh();
  });
  async function hidden() {
    await p.locator("#overlay").waitFor({ state: "hidden" });
  }
  async function choose(label) {
    await p.getByRole("button", { name: label, exact: true }).click();
  }
  async function load(s) {
    await writeFile(file, JSON.stringify(s));
    await p.reload();
    await p.getByRole("button", { name: /3번/ }).click();
    await hidden();
  }
  async function save() {
    await p.keyboard.press("Escape");
    await choose("저장");
    await hidden();
    return (await p.request.get("http://127.0.0.1:5173/api/saves/3")).json();
  }
  async function close() {
    await choose("닫기 · ESC");
    await hidden();
  }
  const lighting = await p.evaluate(async () => {
    const { Renderer } = await import("/src/renderer.js"),
      { loadScenery } = await import("/src/scenery.js"),
      { fresh } = await import("/src/saveSystem.js");
    const maps = await (await fetch("/data/worldMaps.json")).json(),
      interiors = await (await fetch("/data/interiorBackgrounds.json")).json(),
      npcs = await (await fetch("/data/npcs.json")).json(),
      city = await (await fetch("/data/city.json")).json();
    const canvas = document.createElement("canvas"),
      r = new Renderer(
        canvas,
        city,
        await loadScenery({ ...maps, ...interiors }),
        { ...maps, ...interiors },
      ),
      g = { state: fresh(), data: { npcs, city } };
    return [720, 960, 1140, 0, 360].map((minute) => {
      g.state.minutes = minute;
      r.draw(g, false, 0);
      const pixels = r.c.getImageData(0, 0, 1920, 1152).data;
      let red = 0,
        green = 0,
        blue = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        red += pixels[i];
        green += pixels[i + 1];
        blue += pixels[i + 2];
      }
      const count = pixels.length / 4;
      return {
        minute,
        red: red / count,
        green: green / count,
        blue: blue / count,
        lum: (0.2126 * red + 0.7152 * green + 0.0722 * blue) / count,
      };
    });
  });
  assert.ok(
    lighting[1].red / lighting[1].blue > lighting[0].red / lighting[0].blue,
  );
  assert.ok(lighting[2].lum < lighting[0].lum * 0.7);
  assert.ok(Math.abs(lighting[2].lum - lighting[3].lum) < 0.01);
  assert.equal(lighting[0].lum, lighting[4].lum);
  for (const [time, label] of [
    [960, "sunset"],
    [1140, "night"],
  ]) {
    await load({ ...initial, minutes: time, x: 480, y: 310 });
    await p.screenshot({ path: `/tmp/hearth-${label}.png` });
  }
  let s = { ...initial, scene: "bakeryKitchen", stamina: 5 };
  await load(s);
  await p.locator(".spot-oven").click();
  await choose("재료 섞어 반죽 시작");
  assert.equal(await p.locator("#dough").count(), 0);
  assert.match(await p.locator("#toast").textContent(), /기력이 부족/);
  await close();
  s = await save();
  assert.equal(s.stamina, 5);
  assert.equal(s.items.flour, 12);
  assert.equal(s.baking, null);
  s = { ...s, scene: "city", x: 281, y: 270, stamina: 40 };
  await load(s);
  await p.keyboard.press("e");
  await p.locator(".spot-cafeTalk").waitFor();
  await p.locator(".spot-cafeTalk").click();
  await advanceDialogue(p);
  await choose("주문하기");
  await choose("따뜻한 커피 · 8G");
  await choose("베리 케이크 · 12G");
  await close();
  s = await save();
  assert.equal(s.scene, "cafe");
  assert.equal(s.money, 40);
  assert.equal(s.stamina, 80);
  await p.screenshot({ path: "/tmp/hearth-cafe.png" });
  await p.keyboard.press("Escape");
  await choose("불러오기");
  await hidden();
  assert.match(await p.locator("#status").textContent(), /기력 80\/100/);
  await p.setViewportSize({ width: 600, height: 900 });
  await p.locator(".spot-cafeTalk").click();
  await advanceDialogue(p);
  await choose("주문하기");
  const b = await p
    .getByRole("button", { name: "따뜻한 커피 · 8G", exact: true })
    .boundingBox();
  assert.ok(b.x >= 0 && b.x + b.width <= 600);
  await choose("따뜻한 커피 · 8G");
  await choose("따뜻한 커피 · 8G");
  await choose("따뜻한 커피 · 8G");
  assert.match(await p.locator("#toast").textContent(), /기력이 가득/);
  await close();
  s = await save();
  assert.equal(s.stamina, 100);
  assert.equal(s.money, 24);
  await p.locator(".interior-exit").click();
  s = await save();
  assert.equal(s.scene, "city");
  assert.equal(s.x, 281);
  await p.setViewportSize({ width: 1280, height: 1000 });
  s = {
    ...initial,
    scene: "bakery",
    minutes: 120,
    stamina: 20,
    shop: {
      ...initial.shop,
      open: true,
      customer: {
        name: "마리아",
        portrait: "sora",
        bread: "loaf",
        quantity: 1,
        phase: "waiting",
        arrival: 1.2,
      },
    },
  };
  await load(s);
  await p.locator(".spot-shop").click();
  await choose("가게 닫고 퇴근하기");
  assert.match(await p.locator(".panel").textContent(), /오전 6시/);
  await close();
  let cancelled = await save();
  assert.equal(cancelled.shop.open, false);
  assert.equal(cancelled.shop.customer, null);
  assert.equal(cancelled.stamina, 20);
  assert.equal(cancelled.day, 1);
  await p.locator(".spot-shop").click();
  await choose("가게 닫고 퇴근하기");
  const preview = await p.locator(".panel").textContent(),
    expected = Number(preview.match(/→ (\d+)\/100/)[1]);
  await choose("잠자기 · 오전 6시에 기상");
  await hidden();
  s = await save();
  assert.equal(s.day, 1);
  assert.ok(s.minutes >= 360 && s.minutes < 361);
  assert.equal(s.stamina, expected);
  assert.ok(s.stamina >= 69 && s.stamina <= 70);
  s = { ...initial, minutes: 1439.99, stamina: 12 };
  await load(s);
  await p.waitForTimeout(100);
  s = await save();
  assert.equal(s.day, 2);
  assert.ok(s.minutes < 2);
  assert.equal(s.stamina, 12);
  for (const [id, key] of [
    ["sora", "maria"],
    ["jun", "isidoro"],
  ]) {
    s = {
      ...initial,
      scene: "bakery",
      shop: {
        ...initial.shop,
        open: true,
        customer: {
          name: key,
          portrait: id,
          bread: "loaf",
          quantity: 1,
          phase: "waiting",
          arrival: 1.2,
        },
      },
    };
    await load(s);
    const source = await p.evaluate(async (id) => {
      const { loadCounterArt } = await import("/src/counterArt.js"),
        npcs = await (await fetch("/data/npcs.json")).json(),
        art = await loadCounterArt(npcs);
      return art.get(id).src;
    }, id);
    assert.ok(source.endsWith(`${key}-sd.png`));
    await p.screenshot({ path: `/tmp/hearth-${key}-visitor-sd.png` });
    await p.locator(".spot-customerTalk").click();
    const img = p.locator(".dialogue-portrait img");
    await img.evaluate((i) => i.decode());
    assert.ok((await img.getAttribute("src")).endsWith(`${key}-portrait.png`));
    await p.screenshot({ path: `/tmp/hearth-${key}-visitor-portrait.png` });
    await close();
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS: sunset/night/dawn pixels, midnight without rest, low-energy production, cafe door/purchases/limits/save/small screen, retirement/cancel/partial recovery, SD visitors with portrait dialogue; no JS errors",
  );
} finally {
  await browser?.close();
  if (backup) await writeFile(file, backup);
  else
    await unlink(file).catch((e) => {
      if (e.code !== "ENOENT") throw e;
    });
}
