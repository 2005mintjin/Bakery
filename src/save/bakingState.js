import { doughTypes } from "../recipeBook.js";
import { breadIds, breadForTopping, bakeSeconds } from "../baking.js";
import { ovenLimit } from "../equipment.js";
const nonnegative = (x) => Number.isFinite(x) && x >= 0;
function legacyDough(b) {
  if (b === null) return;
  if (
    !b ||
    !["kneading", "topping", "shaped", "baking", "ready"].includes(b.phase) ||
    !nonnegative(b.progress) ||
    b.progress > 100 ||
    !nonnegative(b.seconds) ||
    b.seconds > 5 ||
    ![null, "none", "honey", "berry"].includes(b.topping)
  )
    throw Error("손상된 반죽");
  if (
    (["kneading", "topping"].includes(b.phase) && b.topping !== null) ||
    (["shaped", "baking", "ready"].includes(b.phase) &&
      (b.progress !== 100 || b.topping === null)) ||
    (b.phase === "ready" && b.seconds !== 5) ||
    (b.phase === "kneading" && b.progress >= 100) ||
    (b.phase === "topping" && b.progress !== 100)
  )
    throw Error("손상된 제빵 단계");
}
function counts(value, allKeys = false) {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.entries(value).every(
      ([id, n]) => breadIds.includes(id) && Number.isSafeInteger(n) && n >= 0,
    ) &&
    (!allKeys || breadIds.every((id) => Object.hasOwn(value, id)))
  );
}
export function validateBakingState(s) {
  if (
    s.version < 7 &&
    s.baking &&
    ["kneading", "topping"].includes(s.baking.phase)
  )
    s.baking.type = "bread";
  if (s.version === 6) {
    if (
      !counts(s.doughs) ||
      !["loaf", "honeybread", "berrybread"].every((id) =>
        Object.hasOwn(s.doughs, id),
      )
    )
      throw Error("손상된 반죽 창고");
    s.doughs = {
      ...Object.fromEntries(breadIds.map((id) => [id, 0])),
      ...s.doughs,
    };
    if (s.oven) s.oven.kind = "baking";
  }
  if (s.version < 6) {
    legacyDough(s.baking);
    s.doughs = Object.fromEntries(breadIds.map((id) => [id, 0]));
    s.oven = null;
    const b = s.baking;
    if (b && ["shaped", "baking", "ready"].includes(b.phase)) {
      const id = breadForTopping[b.topping];
      if (b.phase === "shaped") s.doughs[id]++;
      else
        s.oven = {
          phase: b.phase,
          kind: "baking",
          batch: Object.fromEntries(
            breadIds.map((key) => [key, key === id ? 1 : 0]),
          ),
          duration: bakeSeconds,
          seconds:
            b.phase === "ready" ? bakeSeconds : (b.seconds / 5) * bakeSeconds,
        };
      // A legacy timer at its limit is already finished; never lose its bread.
      if (s.oven?.seconds === bakeSeconds) s.oven.phase = "ready";
      s.baking = null;
    }
    return;
  }
  const b = s.baking;
  if (
    b !== null &&
    (!b ||
      !["kneading", "topping"].includes(b.phase) ||
      !Object.hasOwn(doughTypes, b.type) ||
      !nonnegative(b.progress) ||
      b.progress > 100 ||
      b.topping !== null ||
      b.seconds !== 0 ||
      (b.phase === "kneading" ? b.progress >= 100 : b.progress !== 100))
  )
    throw Error("손상된 반죽");
  if (!counts(s.doughs, true)) throw Error("손상된 반죽 창고");
  const oven = s.oven;
  if (oven !== null) {
    if (
      !oven ||
      !["baking", "ready"].includes(oven.phase) ||
      !(oven.kind === "drying"
        ? oven.batch &&
          Object.keys(oven.batch).length === 1 &&
          Number.isSafeInteger(oven.batch.driedberry) &&
          oven.batch.driedberry > 0
        : oven.kind === "baking" && counts(oven.batch)) ||
      !nonnegative(oven.seconds) ||
      ![30, 45, 60].includes(oven.duration) ||
      oven.seconds > oven.duration
    )
      throw Error("손상된 오븐");
    const total = Object.values(oven.batch).reduce((a, b) => a + b, 0);
    if (
      total < 1 ||
      total > ovenLimit(s) ||
      (oven.phase === "ready"
        ? oven.seconds !== oven.duration
        : oven.seconds >= oven.duration)
    )
      throw Error("잘못된 오븐 상태");
  }
}
