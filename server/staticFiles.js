import { readFile } from "node:fs/promises";
import path from "node:path";
import { byteRange } from "../src/httpRange.js";
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".mp3": "audio/mpeg",
};
export async function staticFiles(req, res, name, root) {
  if (req.method !== "GET") {
    res.writeHead(405);
    return res.end();
  }
  const parts = name.split("/");
  if (
    parts.some((s) => s.startsWith(".")) ||
    parts.includes("saves") ||
    parts.includes("saves-demo")
  )
    throw Error("private");
  const file = path.resolve(
    root,
    "." + (name.endsWith("/") ? name + "index.html" : name),
  );
  if (!file.startsWith(root + path.sep)) throw Error("path");
  res.setHeader(
    "Content-Type",
    types[path.extname(file)] || "application/octet-stream",
  );
  const content = await readFile(file);
  if (path.extname(file) === ".mp3") {
    res.setHeader("Accept-Ranges", "bytes");
    const range = byteRange(req.headers.range, content.length);
    if (range?.invalid) {
      res.writeHead(416, { "Content-Range": "bytes */" + content.length });
      return res.end();
    }
    if (range) {
      res.writeHead(206, {
        "Content-Range": `bytes ${range.start}-${range.end}/${content.length}`,
        "Content-Length": range.end - range.start + 1,
      });
      return res.end(content.subarray(range.start, range.end + 1));
    }
  }
  res.setHeader("Content-Length", content.length);
  res.end(content);
}
