import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHandler } from "../server/app.js";
import { fresh } from "../src/saveSystem.js";

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), "bakery-http-"));
  const server = http.createServer(createHandler(root));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  return { root, request: (url, options) => fetch(base + url, options) };
}
const put = (state) => ({
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(state),
});

test("file save routes retain three slots, validation, metadata and atomic updates", async (t) => {
  const { root, request } = await fixture(t);
  assert.deepEqual(
    await (await request("/api/saves")).json(),
    [1, 2, 3].map((id) => ({ id, empty: true, corrupt: false })),
  );
  const s = fresh();
  s.money = 127;
  s.quests = { delivery: "active" };
  assert.equal((await request("/api/saves/2", put(s))).status, 200);
  assert.deepEqual(await (await request("/api/saves/2")).json(), s);
  assert.deepEqual((await (await request("/api/saves")).json())[1], {
    id: 2,
    day: 1,
    money: 127,
    scene: "town",
  });
  assert.equal(
    (await request("/api/saves/2", put({ ...s, money: -1 }))).status,
    400,
  );
  assert.deepEqual(
    JSON.parse(await readFile(path.join(root, "saves/slot-2.json"), "utf8")),
    s,
  );
  const updates = [200, 201, 202].map((money) =>
    request("/api/saves/2", put({ ...s, money })),
  );
  for (const response of await Promise.all(updates))
    assert.equal(response.status, 200);
  assert.ok(
    [200, 201, 202].includes(
      (await (await request("/api/saves/2")).json()).money,
    ),
  );
});

test("server keeps origin, private file, route and method restrictions", async (t) => {
  const { request } = await fixture(t);
  assert.equal(
    (
      await request("/api/saves/1", {
        ...put(fresh()),
        headers: { Origin: "https://example.com" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request("/api/player-sheet", {
        method: "PUT",
        headers: { Origin: "https://example.com" },
      })
    ).status,
    404,
  );
  assert.equal((await request("/api/saves/4")).status, 404);
  assert.equal((await request("/saves/slot-1.json")).status, 400);
  assert.equal((await request("/.git/config")).status, 400);
  assert.equal((await request("/", { method: "POST" })).status, 405);
});

test("static modules and MP3 ranges retain content types and byte boundaries", async (t) => {
  const { root, request } = await fixture(t);
  await writeFile(path.join(root, "index.html"), "<title>Bakery</title>");
  await writeFile(path.join(root, "module.js"), "export const value=1;");
  await writeFile(path.join(root, "music.mp3"), Buffer.from("0123456789"));
  assert.match(await (await request("/")).text(), /Bakery/);
  assert.match(
    (await request("/module.js")).headers.get("Content-Type"),
    /javascript/,
  );
  const range = await request("/music.mp3", {
    headers: { Range: "bytes=2-5" },
  });
  assert.equal(range.status, 206);
  assert.equal(range.headers.get("Content-Range"), "bytes 2-5/10");
  assert.equal(await range.text(), "2345");
  assert.equal(
    (await request("/music.mp3", { headers: { Range: "bytes=99-" } })).status,
    416,
  );
});

test("retired player sheet API never loads or changes stored images", async (t) => {
  const { root, request } = await fixture(t);
  for (const method of ["GET", "PUT", "DELETE"]) {
    assert.equal((await request("/api/player-sheet", { method })).status, 404);
  }
});
test("save deletion is scoped, idempotent and serialized with pending writes", async (t) => {
  const { root, request } = await fixture(t);
  const s = fresh();
  await request("/api/saves/1", put(s));
  await request("/api/saves/2", put({ ...s, money: 222 }));
  assert.equal(
    (
      await request("/api/saves/1", {
        method: "DELETE",
        headers: { Origin: "https://example.com" },
      })
    ).status,
    403,
  );
  assert.equal(
    (await request("/api/saves/4", { method: "DELETE" })).status,
    404,
  );
  assert.equal(
    (await request("/api/saves/1", { method: "DELETE" })).status,
    200,
  );
  assert.equal((await (await request("/api/saves")).json())[0].empty, true);
  assert.equal((await (await request("/api/saves/2")).json()).money, 222);
  assert.equal(
    (await request("/api/saves/1", { method: "DELETE" })).status,
    200,
  );
  await writeFile(path.join(root, "saves/slot-3.json"), "bad");
  assert.equal(
    (await request("/api/saves/3", { method: "DELETE" })).status,
    200,
  );
  const { createStorage } = await import("../server/storage.js");
  const storage = createStorage(root);
  await Promise.all([
    storage.atomicWrite(
      path.join(root, "saves/slot-1.json"),
      JSON.stringify(s),
    ),
    storage.removeSave(path.join(root, "saves/slot-1.json")),
  ]);
  await assert.rejects(readFile(path.join(root, "saves/slot-1.json")), {
    code: "ENOENT",
  });
});
