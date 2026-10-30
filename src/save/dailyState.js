import { productIds } from "../recipeBook.js";
const count = (v) => Number.isSafeInteger(v) && v >= 0;
const money = (v) => Number.isFinite(v) && v >= 0;
function validLedger(v, day) {
  return (
    v &&
    !Array.isArray(v) &&
    Number.isSafeInteger(v.day) &&
    v.day >= 1 &&
    v.day <= day &&
    [v.sales, v.rewards, v.expenses].every(money) &&
    count(v.customers) &&
    v.sold &&
    !Array.isArray(v.sold) &&
    typeof v.sold === "object" &&
    Object.entries(v.sold).every(
      ([id, n]) => productIds.includes(id) && count(n),
    )
  );
}
export function validateDailyState(s) {
  if (s.dailyLedger == null) s.dailyLedger = null;
  else if (!validLedger(s.dailyLedger, s.day))
    throw Error("손상된 일일 거래 기록");
  if (s.lastNight == null) {
    s.lastNight = null;
    return;
  }
  const n = s.lastNight,
    rest = n.rest;
  if (
    !validLedger(n, s.day) ||
    !money(n.money) ||
    !Number.isSafeInteger(n.wakeDay) ||
    n.wakeDay < n.day ||
    n.wakeDay > s.day ||
    !rest ||
    !Number.isFinite(rest.duration) ||
    rest.duration <= 0 ||
    rest.duration > 1440 ||
    !money(rest.recovered) ||
    rest.recovered > 100 ||
    !money(rest.stamina) ||
    rest.stamina > 100 ||
    rest.recovered > rest.stamina
  )
    throw Error("손상된 수면 결산");
}
