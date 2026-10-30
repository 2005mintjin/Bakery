import { demoEdition } from "../edition.js";
import { validate } from "./validate.js";
import { browserMode } from "./mode.js";
import { createBrowserSlots } from "./browserSlots.js";
let webStore;
const browserStore = () =>
  (webStore ??= createBrowserSlots(
    globalThis.localStorage,
    (demoEdition ? "little-hearth:demo:web:" : "little-hearth:web:") +
      new URL("./", globalThis.location.href).pathname,
  ));
async function request(path, options) {
  const r = await fetch("/api/saves" + path, options);
  if (!r.ok) throw Error("세이브 파일을 읽거나 쓸 수 없습니다");
  return r.json();
}
export const slots = async () =>
  browserMode ? browserStore().slots() : request("");
export const loadSlot = async (id) =>
  browserMode ? browserStore().loadSlot(id) : request("/" + id).then(validate);
export const saveSlot = async (id, s) =>
  browserMode
    ? browserStore().saveSlot(id, s)
    : request("/" + id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validate(s)),
      });

export const deleteSlot = async (id) =>
  browserMode
    ? browserStore().deleteSlot(id)
    : request("/" + id, { method: "DELETE" });
