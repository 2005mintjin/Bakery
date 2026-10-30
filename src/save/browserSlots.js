import { validate } from "./validate.js";
export function createBrowserSlots(
  storage,
  namespace = "little-hearth:web:/Bakery/",
) {
  const key = (id) => {
    if (![1, 2, 3].includes(Number(id))) throw Error("잘못된 저장 슬롯");
    return namespace + Number(id);
  };
  const loadSlot = async (id) => {
    const raw = storage.getItem(key(id));
    if (raw === null) throw Error("빈 저장 슬롯");
    return validate(JSON.parse(raw));
  };
  return {
    loadSlot,
    async deleteSlot(id) {
      storage.removeItem(key(id));
      return { deleted: true };
    },
    async saveSlot(id, state) {
      const text = JSON.stringify(validate(state));
      storage.setItem(key(id), text);
      return { ok: true };
    },
    async slots() {
      const result = [];
      for (let id = 1; id <= 3; id++) {
        const raw = storage.getItem(key(id));
        if (raw === null) {
          result.push({ id, empty: true });
          continue;
        }
        try {
          const s = validate(JSON.parse(raw));
          result.push({ id, day: s.day, money: s.money, scene: s.scene });
        } catch {
          result.push({ id, empty: false, corrupt: true });
        }
      }
      return result;
    },
  };
}
