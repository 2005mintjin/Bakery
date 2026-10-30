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
  await writeFile(path.join(outDir, "index.html"), html);
  await writeFile(path.join(outDir, ".nojekyll"), "");
  return outDir;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  console.log("Web build: " + (await buildWeb()));
