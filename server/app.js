import { playerSheet } from "./routes/playerSheet.js";
import { saves } from "./routes/saves.js";
import { staticFiles } from "./staticFiles.js";
import { createStorage } from "./storage.js";
export function createHandler(root) {
  const storage = createStorage(root);
  return async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      const name = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      if (name === "/api/player-sheet")
        return await playerSheet(req, res, storage);
      if (name.startsWith("/api/saves"))
        return await saves(req, res, name, storage);
      return await staticFiles(req, res, name, root);
    } catch {
      res.writeHead(400);
      res.end("Request failed");
    }
  };
}
