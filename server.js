import http from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createHandler } from "./server/app.js";
import { gamePort, saveDirectory } from "./src/edition.js";
const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)));
const server = http.createServer(createHandler(root, { saveDirectory }));

server.on("error", (e) => {
  console.error(
    `Server could not start. Port ${gamePort} may already be in use.`,
    e.message,
  );
  process.exitCode = 1;
});
server.listen(gamePort, "127.0.0.1", () =>
  console.log(`Bakery ready: http://127.0.0.1:${gamePort}`),
);
