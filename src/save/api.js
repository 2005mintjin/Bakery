import { validate } from "./validate.js";
async function request(path, options) {
  const r = await fetch("/api/saves" + path, options);
  if (!r.ok) throw Error("세이브 파일을 읽거나 쓸 수 없습니다");
  return r.json();
}
export const slots = () => request("");
export const loadSlot = (id) => request("/" + id).then(validate);
export const saveSlot = (id, s) =>
  request("/" + id, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(validate(s)),
  });
