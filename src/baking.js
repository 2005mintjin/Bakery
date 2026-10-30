import { doughStaminaCost } from "./stamina.js";
import { spend } from "./inventory.js";
export const baseDough = { flour: 2, yeast: 1, salt: 1 };
export const toppings = { none: {}, honey: { honey: 1 }, berry: { berry: 2 } };
export const breadForTopping = {
  none: "loaf",
  honey: "honeybread",
  berry: "berrybread",
};
export const breadIds = Object.values(breadForTopping);
export const bakeSeconds = 60;
export const ovenCapacity = 6;
export function beginDough(s) {
  if (s.baking || s.stamina < doughStaminaCost || !spend(s, baseDough))
    return false;
  s.stamina -= doughStaminaCost;
  s.baking = { phase: "kneading", progress: 0, topping: null, seconds: 0 };
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
  if (
    s.baking?.phase !== "topping" ||
    !Object.hasOwn(toppings, type) ||
    !spend(s, toppings[type])
  )
    return false;
  s.doughs[breadForTopping[type]]++;
  s.baking = null;
  return true;
}
export function nextBatch(s) {
  let remaining = ovenCapacity;
  return Object.fromEntries(
    breadIds.map((id) => {
      const amount = Math.min(s.doughs[id], remaining);
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
        n > s.doughs[id],
    )
  )
    return false;
  const batch = Object.fromEntries(
    breadIds.map((id) => [id, selection[id] || 0]),
  );
  const total = Object.values(batch).reduce((a, b) => a + b, 0);
  if (total < 1 || total > ovenCapacity) return false;
  for (const id of breadIds) s.doughs[id] -= batch[id];
  s.oven = { phase: "baking", batch, seconds: 0 };
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
  for (const id of breadIds)
    s.warehouse[id] = (s.warehouse[id] || 0) + (batch[id] || 0);
  s.oven = null;
  return batch;
}
