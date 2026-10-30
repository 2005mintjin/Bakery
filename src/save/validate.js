import { validateBakingState } from "./bakingState.js";
import { fresh } from "./defaultState.js";
const nonnegative = (x) => Number.isFinite(x) && x >= 0;
export function validate(input) {
  const s = structuredClone(input),
    base = fresh();
  if (
    ![1, 2, 3, 4, 5, 6].includes(s.version) ||
    ![
      "town",
      "bakery",
      "bakeryKitchen",
      "post",
      "city",
      "store",
      "field",
      "cafe",
    ].includes(s.scene)
  )
    throw Error("지원하지 않는 저장 파일");
  for (const k of ["money", "revenue", "day", "minutes", "x", "y", "harvestAt"])
    if (!nonnegative(s[k])) throw Error("손상된 저장 파일");
  if (s.x > 960 || s.y > 576 || s.minutes >= 1440 || s.day < 1)
    throw Error("잘못된 위치 또는 시간");
  for (const k of [
    "items",
    "display",
    "affinity",
    ...(s.version >= 2 ? ["warehouse"] : []),
  ]) {
    if (!s[k] || typeof s[k] !== "object" || Array.isArray(s[k]))
      throw Error("손상된 저장 파일");
    for (const v of Object.values(s[k]))
      if (!nonnegative(v)) throw Error("손상된 저장 파일");
  }
  if (
    !s.quests ||
    Object.values(s.quests).some((v) => !["active", "done"].includes(v))
  )
    throw Error("손상된 퀘스트");
  if (s.version >= 2) {
    const shop = s.shop;
    if (
      !shop ||
      typeof shop.open !== "boolean" ||
      !nonnegative(shop.elapsed) ||
      !Number.isInteger(shop.sequence) ||
      shop.sequence < 0
    )
      throw Error("손상된 상점");
    if (
      shop.customer &&
      (!["loaf", "honeybread", "berrybread"].includes(shop.customer.bread) ||
        typeof shop.customer.name !== "string")
    )
      throw Error("손상된 주문");
    if (
      !Array.isArray(s.parcels) ||
      s.parcels.some(
        (p) => !Number.isInteger(p.day) || typeof p.label !== "string",
      ) ||
      !Number.isInteger(s.parcelDay) ||
      s.parcelDay < 0
    )
      throw Error("손상된 소포");
  }
  if (s.version >= 3) {
    const customer = s.shop.customer;
    if (
      customer &&
      (!["knocking", "waiting"].includes(customer.phase) ||
        !nonnegative(customer.arrival) ||
        !["mira", "jun", "sora"].includes(customer.portrait))
    )
      throw Error("손상된 손님");
    if (
      !Array.isArray(s.garden) ||
      s.garden.length !== 6 ||
      s.garden.some(
        (p) =>
          p !== null &&
          (!p ||
            !nonnegative(p.plantedAt) ||
            (p.wateredAt !== null &&
              (!nonnegative(p.wateredAt) || p.wateredAt < p.plantedAt))),
      )
    )
      throw Error("손상된 텃밭");
  } else {
    s.garden = base.garden;
    s.baking = null;
    if (s.shop?.customer)
      s.shop.customer = {
        ...s.shop.customer,
        portrait: "mira",
        phase: "waiting",
        arrival: 1.2,
      };
  }
  if (s.version >= 4) {
    if (
      !s.dialogueVisits ||
      !Number.isInteger(s.dialogueVisits.postDay) ||
      s.dialogueVisits.postDay < 0
    )
      throw Error("손상된 대화 방문 기록");
  } else s.dialogueVisits = { postDay: 0 };
  if (s.version < 5) s.stamina = base.stamina;
  else if (!nonnegative(s.stamina) || s.stamina > 100)
    throw Error("손상된 기력");
  validateBakingState(s);
  return {
    ...base,
    ...s,
    version: 6,
    items: { ...base.items, ...s.items },
    warehouse: { ...base.warehouse, ...s.warehouse },
  };
}
