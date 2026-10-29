// Developer check only; game installation remains dependency-free.
import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const files = ["server.js"];
for (const dir of ["src", "server", "tests", "tools"]) {
  for (const entry of await readdir(
    new URL(dir + "/", new URL("../", import.meta.url)),
    { recursive: true },
  )) {
    if (/\.(js|mjs)$/.test(entry)) files.push(`${dir}/${entry}`);
  }
}
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`${files.length} JavaScript files passed syntax checks.`);
