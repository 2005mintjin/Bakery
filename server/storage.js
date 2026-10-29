import { writeFile, rename } from "node:fs/promises";
import path from "node:path";
// One queue per server serializes save and sprite writes, including failed jobs.
export function createStorage(root) {
  const saveDir = path.join(root, "saves");
  let writes = Promise.resolve();
  function atomicWrite(dest, content) {
    const job = writes
      .catch(() => {})
      .then(async () => {
        await writeFile(dest + ".tmp", content);
        await rename(dest + ".tmp", dest);
      });
    writes = job;
    return job;
  }
  return { saveDir, atomicWrite };
}
