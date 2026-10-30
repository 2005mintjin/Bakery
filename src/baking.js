import { productIds, doughTypes } from "./recipeBook.js";
import { doughStaminaCost } from "./stamina.js";
import { spend } from "./inventory.js";
export const baseDough = { flour: 2, yeast: 1, salt: 1 };
export const toppings = { none: {}, honey: { honey: 1 }, berry: { berry: 2 } };
export const breadForTopping = {
  none: "loaf",
  honey: "honeybread",
  berry: "berrybread",
};
export const breadIds = productIds;
export const bakeSeconds = 60;
export const ovenCapacity = 6;
export function beginDough(s, type = "bread") {
  const dough = Object.hasOwn(doughTypes, type) ? doughTypes[type] : null;
  if (!dough) return false;
  if (s.baking || s.stamina < doughStaminaCost || !spend(s, dough.cost))
    return false;
  s.stamina -= doughStaminaCost;
  s.baking = {
    phase: "kneading",
    progress: 0,
    topping: null,
    seconds: 0,
    type,
  };
  return true;
}
export function knead(s, distance) {
  const b = s.baking;
  if (b?.phase !== "kneading" || !Number.isFinite(distance) || distance <= 0)
    return false;
  b.progress = Math.min(100, b.progress + Math.min(distance, 60) / 12);
  if (b.progress === 100) b.phase = "topping";
  return true;
}
export function addTopping(s, type) {
  const finishes = doughTypes[s.baking?.type || "bread"]?.finishes;
  const finish =
    finishes && Object.hasOwn(finishes, type) ? finishes[type] : null;
  if (s.baking?.phase !== "topping" || !finish || !spend(s, finish.cost))
    return false;
  s.doughs[finish.id] = (s.doughs[finish.id] || 0) + 1;
  s.baking = null;
  return true;
}
export function dryBerries(s, quantity) {
  if (
    s.oven ||
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > ovenCapacity ||
    !spend(s, { berry: quantity * 2 })
  )
    return false;
  s.oven = {
    phase: "baking",
    kind: "drying",
    batch: { driedberry: quantity },
    seconds: 0,
  };
  return true;
}
export function nextBatch(s) {
  let remaining = ovenCapacity;
  return Object.fromEntries(
    breadIds.map((id) => {
      const amount = Math.min(s.doughs[id] || 0, remaining);
      remaining -= amount;
      return [id, amount];
    }),
  );
}
export function putInOven(s, selection = nextBatch(s)) {
  if (
    s.oven ||
    !selection ||
    typeof selection !== "object" ||
    Array.isArray(selection)
  )
    return false;
  if (
    Object.entries(selection).some(
      ([id, n]) =>
        !breadIds.includes(id) ||
        !Number.isSafeInteger(n) ||
        n < 0 ||
        n > (s.doughs[id] || 0),
    )
  )
    return false;
  const batch = Object.fromEntries(
    breadIds.map((id) => [id, selection[id] || 0]),
  );
  const total = Object.values(batch).reduce((a, b) => a + b, 0);
  if (total < 1 || total > ovenCapacity) return false;
  for (const id of breadIds) s.doughs[id] = (s.doughs[id] || 0) - batch[id];
  s.oven = { phase: "baking", kind: "baking", batch, seconds: 0 };
  return true;
}
export function tickBaking(s, dt) {
  const oven = s.oven;
  if (oven?.phase !== "baking" || !Number.isFinite(dt) || dt <= 0) return false;
  oven.seconds = Math.min(bakeSeconds, oven.seconds + dt);
  if (oven.seconds >= bakeSeconds) {
    oven.phase = "ready";
    return true;
  }
  return false;
}
export function collectBread(s) {
  if (s.oven?.phase !== "ready") return false;
  const batch = { ...s.oven.batch };
  const target = s.oven.kind === "drying" ? s.items : s.warehouse;
  for (const [id, n] of Object.entries(batch))
    target[id] = (target[id] || 0) + n;
  s.oven = null;
  return batch;
}
