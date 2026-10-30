import { saveDirectory } from "../edition.js";
// Static publishing explicitly sets this meta tag; server failures never switch storage silently.
export const browserMode =
  globalThis.document?.querySelector('meta[name="bakery-save-mode"]')
    ?.content === "browser";
export const saveLocation = () =>
  browserMode
    ? "이 브라우저에 저장됩니다. 다른 기기로 옮기려면 세이브를 내보내세요."
    : `게임 폴더 ${saveDirectory}에 저장됩니다.`;
