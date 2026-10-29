import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { body } from "../http.js";
import { validate } from "../../src/saveSystem.js";
export async function saves(req, res, name, { saveDir, atomicWrite }) {
  res.setHeader("Content-Type", "application/json");
  if (
    req.headers.origin &&
    !["http://127.0.0.1:5173", "http://localhost:5173"].includes(
      req.headers.origin,
    )
  ) {
    res.writeHead(403);
    return res.end("{}");
  }
  const match = name.match(/^\/api\/saves(?:\/([123]))?$/);
  if (!match) {
    res.writeHead(404);
    return res.end("{}");
  }
  const id = match[1];
  await mkdir(saveDir, { recursive: true });
  if (!id && req.method === "GET") {
    const list = [];
    for (let i = 1; i <= 3; i++) {
      try {
        const s = validate(
          JSON.parse(
            await readFile(path.join(saveDir, `slot-${i}.json`), "utf8"),
          ),
        );
        list.push({ id: i, day: s.day, money: s.money, scene: s.scene });
      } catch (e) {
        list.push({
          id: i,
          empty: e.code === "ENOENT",
          corrupt: e.code !== "ENOENT",
        });
      }
    }
    return res.end(JSON.stringify(list));
  }
  if (id && req.method === "GET")
    return res.end(
      JSON.stringify(
        validate(
          JSON.parse(
            await readFile(path.join(saveDir, `slot-${id}.json`), "utf8"),
          ),
        ),
      ),
    );
  if (id && req.method === "PUT") {
    const s = validate(await body(req));
    await atomicWrite(
      path.join(saveDir, `slot-${id}.json`),
      JSON.stringify(s, null, 2),
    );
    return res.end('{"saved":true}');
  }
  res.writeHead(405);
  return res.end("{}");
}
