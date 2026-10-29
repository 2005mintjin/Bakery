import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { body } from "../http.js";
export async function playerSheet(req, res, { saveDir, atomicWrite }) {
  if (req.method === "GET") {
    try {
      res.setHeader("Content-Type", "image/png");
      return res.end(await readFile(path.join(saveDir, "player-sheet.png")));
    } catch {
      res.setHeader("Content-Type", "application/json");
      return res.end("null");
    }
  }
  if (req.method !== "PUT") {
    res.writeHead(405);
    return res.end();
  }
  if (
    req.headers.origin &&
    !["http://127.0.0.1:5173", "http://localhost:5173"].includes(
      req.headers.origin,
    )
  ) {
    res.writeHead(403);
    return res.end();
  }
  const { data } = await body(req, 12 * 1024 * 1024);
  if (typeof data !== "string" || !data.startsWith("data:image/png;base64,"))
    throw Error("PNG required");
  const bytes = Buffer.from(data.slice(22), "base64");
  if (
    bytes.length > 8 * 1024 * 1024 ||
    !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    throw Error("Invalid PNG");
  await mkdir(saveDir, { recursive: true });
  await atomicWrite(path.join(saveDir, "player-sheet.png"), bytes);
  res.setHeader("Content-Type", "application/json");
  return res.end('{"saved":true}');
}
