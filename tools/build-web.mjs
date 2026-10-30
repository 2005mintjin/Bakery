import { siteSlug, siteUrl } from "../src/brand.js";
import { cp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
export async function buildWeb(outDir = path.join(root, "dist/web")) {
  if (path.resolve(outDir) === path.resolve(root))
    throw Error("Cannot replace repository");
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  for (const dir of ["src", "data", "assets"])
    await cp(path.join(root, dir), path.join(outDir, dir), { recursive: true });
  const html = (await readFile(path.join(root, "index.html"), "utf8")).replace(
    'name="bakery-save-mode" content="server"',
    'name="bakery-save-mode" content="browser"',
  );
  const gameDir = path.join(outDir, siteSlug);
  await mkdir(gameDir, { recursive: true });
  await writeFile(
    path.join(gameDir, "index.html"),
    html.replace(
      "<head>",
      `<head>
    <base href="../">
    <link rel="canonical" href="${siteUrl}">`,
    ),
  );
  await writeFile(
    path.join(outDir, "index.html"),
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=./${siteSlug}/"><meta name="viewport" content="width=device-width,initial-scale=1"><title>펜서 베이커리</title><link rel="canonical" href="${siteUrl}"></head><body><p><a href="./${siteSlug}/">펜서 베이커리 게임 시작</a></p></body></html>`,
  );
  await writeFile(path.join(outDir, ".nojekyll"), "");
  return outDir;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  console.log("Web build: " + (await buildWeb()));
