import { demoEdition } from "../src/edition.js";
if (demoEdition)
  throw Error(
    "데모판은 정식 사이트에 배포하지 않습니다. 검토 후 정식 버전에서 배포하세요.",
  );
// Publish only the static build using a temporary index; preserve the working branch/index.
import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildWeb } from "./build-web.mjs";
const root = fileURLToPath(new URL("../", import.meta.url)),
  out = await buildWeb(),
  temp = await mkdtemp(path.join(tmpdir(), "bakery-pages-"));
const git = (args, options = {}) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8", ...options }).trim();
try {
  const revision = git(["rev-parse", "--short", "HEAD"]);
  const remote = git(["ls-remote", "origin", "refs/heads/gh-pages"]);
  let parent;
  if (remote) {
    git(["fetch", "origin", "gh-pages"]);
    parent = git(["rev-parse", "FETCH_HEAD"]);
  }
  const env = { ...process.env, GIT_INDEX_FILE: path.join(temp, "index") };
  const staged = (args) =>
    git(
      ["--git-dir=" + path.join(root, ".git"), "--work-tree=" + out, ...args],
      { cwd: out, env },
    );
  staged(["read-tree", "--empty"]);
  staged(["add", "--all", "--force", "--", "."]);
  const tree = staged(["write-tree"]);
  const commit = staged([
    "commit-tree",
    tree,
    ...(parent ? ["-p", parent] : []),
    "-m",
    "Publish web game from " + revision,
  ]);
  git(["push", "origin", commit + ":refs/heads/gh-pages"], {
    stdio: ["ignore", "pipe", "inherit"],
  });
  console.log(
    "Published gh-pages from " +
      revision +
      "\nSite: https://2005mintjin.github.io/Bakery/",
  );
} finally {
  await rm(temp, { recursive: true, force: true });
}
