import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fresh } from "../src/saveSystem.js";
import { createBrowserSlots } from "../src/save/browserSlots.js";
import {
  parseSave,
  serializeSave,
  maxSaveBytes,
} from "../src/save/transfer.js";
import { buildWeb } from "../tools/build-web.mjs";
function memory() {
  const data = new Map();
  return {
    data,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, v),
    removeItem: (k) => data.delete(k),
  };
}
test("web slots isolate games/slots and persist all v8 progression, without overwriting legacy storage", async () => {
  const storage = memory(),
    a = createBrowserSlots(storage, "a:"),
    b = createBrowserSlots(storage, "b:");
  storage.setItem("little-hearth-v1", "legacy");
  assert.deepEqual(
    await a.slots(),
    [1, 2, 3].map((id) => ({ id, empty: true })),
  );
  const s = fresh();
  s.money = 777;
  s.equipment.pieMold = true;
  s.equipment.capacityLevel = 1;
  s.equipment.speedLevel = 1;
  s.shop.menu = ["berrypie"];
  s.oven = {
    phase: "baking",
    kind: "baking",
    batch: { loaf: 9 },
    seconds: 12,
    duration: 45,
  };
  await a.saveSlot(2, s);
  assert.deepEqual(await a.loadSlot(2), s);
  assert.equal((await a.slots())[1].money, 777);
  assert.equal((await b.slots())[1].empty, true);
  assert.equal(storage.getItem("little-hearth-v1"), "legacy");
  s.money = 0;
  assert.equal((await a.loadSlot(2)).money, 777);
  await assert.rejects(a.loadSlot(0));
  await assert.rejects(a.saveSlot(4, fresh()));
});
test("web storage surfaces corrupt/full/denied storage without resetting existing saves", async () => {
  const storage = memory(),
    store = createBrowserSlots(storage, "slot:");
  storage.setItem("slot:1", "corrupt");
  await store.saveSlot(2, fresh());
  assert.deepEqual((await store.slots())[0], {
    id: 1,
    empty: false,
    corrupt: true,
  });
  await assert.rejects(store.loadSlot(1));
  assert.equal(storage.getItem("slot:1"), "corrupt");
  const before = storage.getItem("slot:2");
  await assert.rejects(store.saveSlot(2, { ...fresh(), version: 999 }));
  assert.equal(storage.getItem("slot:2"), before);
  storage.setItem = () => {
    throw Error("quota");
  };
  await assert.rejects(store.saveSlot(2, { ...fresh(), money: 100 }));
  assert.equal(storage.getItem("slot:2"), before);
  const denied = createBrowserSlots({
    getItem() {
      throw Error("denied");
    },
  });
  await assert.rejects(denied.slots());
});
test("portable JSON transfers roundtrip progress, migrate v7 and reject bad or oversized files", () => {
  const s = fresh();
  s.money = 500;
  s.doughs.loaf = 5;
  assert.deepEqual(parseSave(serializeSave(s)), s);
  const old = { ...s, version: 7 };
  delete old.equipment;
  delete old.shop.menu;
  assert.equal(parseSave(JSON.stringify(old)).version, 8);
  for (const text of [
    "bad",
    "{}",
    JSON.stringify({ ...s, version: 999 }),
    " ".repeat(maxSaveBytes + 1),
  ])
    assert.throws(() => parseSave(text));
});
test("static build includes game assets and browser mode, and excludes local saves/server/dev files", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "bakery-web-test-"));
  try {
    const out = await buildWeb(path.join(dir, "site"));
    const entries = await readdir(out);
    assert.deepEqual(entries.sort(), [
      ".nojekyll",
      "assets",
      "data",
      "index.html",
      "src",
    ]);
    assert.match(
      await readFile(path.join(out, "index.html"), "utf8"),
      /name="bakery-save-mode" content="browser"/,
    );
    assert.match(
      await readFile(new URL("../index.html", import.meta.url), "utf8"),
      /name="bakery-save-mode" content="server"/,
    );
    assert.ok(
      (
        await readFile(
          path.join(out, "assets/backgrounds/interiors/stocked-bakery.png"),
        )
      ).length > 1000,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("web deletion removes exactly the chosen slot, including corruption, without touching legacy or other games", async () => {
  const storage = memory(),
    store = createBrowserSlots(storage, "demo:");
  await store.saveSlot(1, fresh());
  await store.saveSlot(2, { ...fresh(), money: 222 });
  storage.setItem("little-hearth-v1", "legacy");
  storage.setItem("other:1", "other");
  await store.deleteSlot(1);
  assert.equal((await store.slots())[0].empty, true);
  assert.equal((await store.loadSlot(2)).money, 222);
  await store.deleteSlot(1);
  await assert.rejects(store.deleteSlot(4));
  storage.setItem("demo:3", "bad");
  await store.deleteSlot(3);
  assert.equal((await store.slots())[2].empty, true);
  assert.equal(storage.getItem("little-hearth-v1"), "legacy");
  assert.equal(storage.getItem("other:1"), "other");
});
