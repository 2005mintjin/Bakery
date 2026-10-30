import { writeFile, rename, unlink } from "node:fs/promises";
import path from "node:path";
// One queue per server serializes save and sprite writes, including failed jobs.
export function createStorage(root, { saveDirectory = "saves" } = {}) {
  const saveDir = path.join(root, saveDirectory);
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
  function removeSave(dest) {
    const job = writes
      .catch(() => {})
      .then(async () => {
        try {
          await unlink(dest);
        } catch (e) {
          if (e.code !== "ENOENT") throw e;
        }
      });
    writes = job;
    return job;
  }
  return { saveDir, atomicWrite, removeSave };
}
