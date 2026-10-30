import { validate } from "./validate.js";
export const maxSaveBytes = 1024 * 1024;
export function parseSave(text) {
  if (new TextEncoder().encode(text).length > maxSaveBytes)
    throw Error("저장 파일이 너무 큽니다");
  return validate(JSON.parse(text));
}
export const serializeSave = (state) =>
  JSON.stringify(validate(state), null, 2);
