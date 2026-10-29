import http from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createHandler } from "./server/app.js";
const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)));
const server = http.createServer(createHandler(root));

server.on("error", (e) => {
  console.error(
    "Server could not start. Port 5173 may already be in use.",
    e.message,
  );
  process.exitCode = 1;
});
server.listen(5173, "127.0.0.1", () =>
  console.log("Bakery ready: http://127.0.0.1:5173"),
);
