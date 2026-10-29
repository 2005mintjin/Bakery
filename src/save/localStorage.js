import { validate } from "./validate.js";
export function save(s, storage = localStorage) {
  storage.setItem("little-hearth-v1", JSON.stringify(s));
}
export function load(storage = localStorage) {
  const raw = storage.getItem("little-hearth-v1");
  return raw ? validate(JSON.parse(raw)) : null;
}
