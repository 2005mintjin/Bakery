import { recordExpense } from "./dailyReport.js";
import { tickBaking, bakeSeconds } from "./baking.js";
import { maxStamina } from "./stamina.js";
export { maxStamina, doughStaminaCost } from "./stamina.js";
export const wakeMinute = 6 * 60;
export const fullSleepMinutes = 8 * 60;
export function advanceClock(s, minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return;
  const total = s.minutes + minutes;
  s.day += Math.floor(total / 1440);
  s.minutes = total % 1440;
}
export function closeShop(s) {
  s.shop.open = false;
  s.shop.elapsed = 0;
  s.shop.customer = null;
}
export function sleepPreview(s) {
  const duration =
    s.minutes < wakeMinute
      ? wakeMinute - s.minutes
      : 1440 - s.minutes + wakeMinute;
  const capacity = Math.floor(
    maxStamina * Math.min(1, duration / fullSleepMinutes),
  );
  const recovered = Math.min(maxStamina - s.stamina, capacity);
  return { duration, recovered, stamina: s.stamina + recovered };
}
export function sleepUntilMorning(s) {
  const result = sleepPreview(s);
  closeShop(s);
  advanceClock(s, result.duration);
  s.stamina = result.stamina;
  // An overnight bake finishes, but bread still needs collecting from the oven.
  tickBaking(s, bakeSeconds);
  s.scene = "bakery";
  s.x = 480;
  s.y = 500;
  return result;
}
export function buyRefreshment(s, item) {
  if (
    !item ||
    !Number.isFinite(item.price) ||
    item.price < 0 ||
    !Number.isFinite(item.stamina) ||
    item.stamina <= 0
  )
    return "invalid";
  if (s.stamina >= maxStamina) return "full";
  if (s.money < item.price) return "poor";
  s.money -= item.price;
  recordExpense(s, item.price);
  s.stamina = Math.min(maxStamina, s.stamina + item.stamina);
  return "bought";
}
