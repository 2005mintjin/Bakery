// Optional integration check. Slot 3 is temporarily used, then restored byte-for-byte.
const { chromium } = await import(
  process.env.BAKERY_PLAYWRIGHT_MODULE || "playwright"
);
import { advanceDialogue } from "./browser-dialogue.mjs";
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
  const initial = await p.evaluate(async () => {
    const { fresh } = await import("/src/saveSystem.js");
    return fresh();
  });
  initial.version = 3;
  delete initial.dialogueVisits;
  initial.scene = "post";
  await writeFile(file, JSON.stringify(initial));
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
  async function setState(s) {
    assert.equal(
      (
        await p.request.put("http://127.0.0.1:5173/api/saves/3", { data: s })
      ).status(),
      200,
    );
    await p.keyboard.press("Escape");
    await p.getByRole("button", { name: "불러오기", exact: true }).click();
    await hidden();
  }
  async function choose(label) {
    await p.getByRole("button", { name: label, exact: true }).click();
  }
  async function reveal() {
    if (
      (await p.locator("#typed-dialogue").getAttribute("aria-busy")) === "true"
    )
      await p.keyboard.press("Space");
  }
  await p.screenshot({
    path: path.join(tmpdir(), "hearth-post-new-interior.png"),
  });
  await p.locator(".spot-postTalk").click();
  await p.waitForTimeout(70);
  const partial = await p.locator("#typed-dialogue").textContent();
  assert.ok(
    partial.length > 0 && partial.length < "안녕, 오늘도 소포가 왔던데?".length,
  );
  assert.equal(await p.locator(".dialogue-choice").count(), 0);
  await reveal();
  assert.equal(
    await p.locator("#typed-dialogue").textContent(),
    "안녕, 오늘도 소포가 왔던데?",
  );
  assert.equal(await p.locator(".dialogue-choice").count(), 0);
  await p.keyboard.press("Space");
  await choose("네, 서명할게요.");
  await close();
  let s = await save();
  assert.equal(s.version, 4);
  assert.equal(s.parcelDay, 0);
  await p.locator(".spot-postTalk").click();
  await advanceDialogue(p);
  await choose("네, 서명할게요.");
  await advanceDialogue(p);
  await hidden();
  s = await save();
  assert.equal(s.parcelDay, s.day);
  assert.equal(s.items.flour, 16);
  assert.equal(s.dialogueVisits.postDay, s.day);
  await p.locator(".spot-postTalk").click();
  await advanceDialogue(p);
  assert.equal(
    await p
      .getByRole("button", { name: "네, 서명할게요.", exact: true })
      .count(),
    0,
  );
  await choose("잡담하기.");
  await advanceDialogue(p);
  await choose("오늘도 예쁘시네요.");
  await reveal();
  assert.ok(
    (await p.locator("#typed-dialogue").textContent()).includes("너밖에 없는"),
  );
  assert.ok(
    (await p.locator("#dialogue-page").textContent()).includes("1 / 2"),
  );
  await p.keyboard.press("Space");
  assert.ok(
    (await p.locator("#dialogue-page").textContent()).includes("2 / 2"),
  );
  await reveal();
  assert.ok(
    (await p.locator("#typed-dialogue").textContent()).includes("애인한테나"),
  );
  await p.keyboard.press("Space");
  await choose("저희 누나한테 편지는 안 오나요?");
  await advanceDialogue(p);
  await choose("아무것도 아니에요.");
  await advanceDialogue(p);
  await hidden();
  s = await save();
  assert.equal(s.scene, "town");
  assert.equal(s.items.flour, 16);
  s.scene = "store";
  s.x = 480;
  s.y = 500;
  await setState(s);
  await p.screenshot({
    path: path.join(tmpdir(), "hearth-store-new-interior.png"),
  });
  await p.locator(".spot-storeTalk").click();
  await reveal();
  const greeting = await p.locator("#typed-dialogue").textContent();
  for (const line of ["어서오세요!", "안녕하세요...", "... 하세요."])
    assert.ok(greeting.includes(line));
  assert.ok(
    (await p.locator("#dialogue-page").textContent()).includes("1 / 1"),
  );
  await p.keyboard.press("Space");
  await p.screenshot({
    path: path.join(tmpdir(), "hearth-sisters-dialogue.png"),
  });
  assert.equal(
    await p
      .locator(".dialogue-portrait img")
      .evaluate((img) => img.naturalWidth),
    1672,
  );
  await choose("말을 걸어본다.");
  await advanceDialogue(p);
  await choose("부모님은 어디 계시니?");
  await advanceDialogue(p);
  await choose("너네 서로 알아볼 수 있겠어?");
  await advanceDialogue(p);
  await choose("에리나한테 말을 걸어본다.");
  await advanceDialogue(p);
  await choose("에리나한테 말을 걸어본다.");
  for (let i = 1; i <= 4; i++) {
    await reveal();
    assert.ok(
      (await p.locator("#dialogue-page").textContent()).includes(i + " / 4"),
    );
    assert.equal(await p.locator(".dialogue-choice").count(), 0);
    await p.keyboard.press("Space");
  }
  await choose("에리나한테 말을 걸어본다.");
  await advanceDialogue(p);
  await choose("에리나를 쓰다듬는다.");
  await advanceDialogue(p);
  await choose("상점을 둘러본다.");
  await choose("소금 1개 구매 · 1G");
  await close();
  s = await save();
  assert.equal(s.money, 59);
  assert.equal(s.items.salt, 7);
  s.scene = "bakery";
  s.shop.customer = {
    name: "미라",
    portrait: "mira",
    bread: "loaf",
    phase: "waiting",
    arrival: 1.2,
  };
  s.display.loaf = 1;
  await setState(s);
  await p.locator(".spot-customerTalk").click();
  assert.equal(await p.locator(".dialogue-choice").count(), 0);
  await advanceDialogue(p);
  await choose("네, 금방 갖다 드릴게요!");
  await advanceDialogue(p);
  await choose("대화 마치기");
  await hidden();
  s = await save();
  assert.equal(s.money, 75);
  assert.equal(s.display.loaf, 0);
  s.scene = "town";
  s.x = 235;
  s.y = 350;
  await setState(s);
  await p.keyboard.press("e");
  await advanceDialogue(p);
  await choose("이야기를 더 듣는다");
  await advanceDialogue(p);
  await choose("제가 도울게요");
  await close();
  s = await save();
  assert.equal(s.quests.delivery, "active");
  await p.setViewportSize({ width: 540, height: 850 });
  s.scene = "store";
  await setState(s);
  await p.locator(".spot-storeTalk").click();
  await advanceDialogue(p);
  await choose("상점 떠나기");
  await hidden();
  s = await save();
  assert.equal(s.scene, "city");
  assert.deepEqual(errors, []);
  console.log(
    "PASS: original clerk/sisters art, partial typing, Space reveal vs advance, grouped speech, postal receipt/revisit/chat/exit, every sisters branch, purchase gating, customer sale, town quest, v3 migration, narrow screen; no JS errors",
  );
} finally {
  await browser?.close();
  if (backup) await writeFile(file, backup);
  else
    await unlink(file).catch((e) => {
      if (e.code !== "ENOENT") throw e;
    });
}
