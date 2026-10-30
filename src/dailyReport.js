import { productIds } from "./recipeBook.js";
// A working day runs from 06:00 to the following 06:00, including late-night sales.
export function workDay(s) {
  return Math.max(1, s.day - (s.minutes < 360 ? 1 : 0));
}
export function emptyLedger(day) {
  return { day, sales: 0, rewards: 0, expenses: 0, customers: 0, sold: {} };
}
function ledger(s) {
  if (s.dailyLedger?.day !== workDay(s))
    s.dailyLedger = emptyLedger(workDay(s));
  return s.dailyLedger;
}
export function recordSale(s, id, quantity, amount, order = true) {
  if (
    !productIds.includes(id) ||
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    !Number.isFinite(amount) ||
    amount < 0
  )
    return;
  const day = ledger(s);
  day.sales += amount;
  day.sold[id] = (day.sold[id] || 0) + quantity;
  if (order) day.customers++;
}
export function recordExpense(s, amount) {
  if (Number.isFinite(amount) && amount > 0) ledger(s).expenses += amount;
}
export function recordReward(s, amount) {
  if (Number.isFinite(amount) && amount > 0) ledger(s).rewards += amount;
}
export function dayReport(s) {
  return structuredClone(
    s.dailyLedger?.day === workDay(s) ? s.dailyLedger : emptyLedger(workDay(s)),
  );
}
