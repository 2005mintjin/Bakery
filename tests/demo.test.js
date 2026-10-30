import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { demoEdition, gamePort, saveDirectory } from "../src/edition.js";
test("demo launchers use a separate port and preserve Windows ASCII/CRLF format", async () => {
  assert.equal(demoEdition, true);
  assert.equal(gamePort, 5174);
  assert.equal(saveDirectory, "saves-demo");
  for (const name of ["launch.bat", "게임 실행.bat"]) {
    const bytes = await readFile(new URL("../" + name, import.meta.url));
    assert.ok([...bytes].every((b) => b < 128));
    assert.equal(bytes.toString().replace(/\r\n/g, "").includes("\n"), false);
    assert.match(bytes.toString(), /127\.0\.0\.1:5174/);
    assert.doesNotMatch(bytes.toString(), /127\.0\.0\.1:5173/);
  }
});
test("demo refuses the production publishing command before running Git/network operations", () => {
  assert.throws(
    () =>
      execFileSync(process.execPath, ["tools/publish-web.mjs"], {
        cwd: new URL("../", import.meta.url),
        stdio: "pipe",
      }),
    (e) =>
      e.status === 1 &&
      e.stderr.toString().includes("데모판은 정식 사이트에 배포하지 않습니다"),
  );
});
