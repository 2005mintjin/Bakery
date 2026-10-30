import { recordExpense } from "./dailyReport.js";
import { doughTypes, productIds } from "./recipeBook.js";
// Prices and upgrade tiers are centralized; screens call these rules directly.
export const workshopGoods = {
  pieMold: {
    name: "파이 틀",
    price: 150,
    description: "파이 반죽과 파이 굽기를 해금해요.",
  },
  cookieMold: {
    name: "쿠키 틀",
    price: 120,
    description: "쿠키 반죽과 쿠키 굽기를 해금해요.",
  },
};
export const capacityPrices = [250, 500],
  speedPrices = [200, 400];
export const freshEquipment = () => ({
  pieMold: false,
  cookieMold: false,
  capacityLevel: 0,
  speedLevel: 0,
});
export function canMake(s, type) {
  return (
    type === "bread" ||
    (type === "pie" && s.equipment?.pieMold === true) ||
    (type === "cookie" && s.equipment?.cookieMold === true)
  );
}
export function canBake(s, id) {
  return Object.entries(doughTypes).some(
    ([type, d]) =>
      canMake(s, type) && Object.values(d.finishes).some((f) => f.id === id),
  );
}
export const availableProducts = (s) =>
  productIds.filter((id) => canBake(s, id));
export const ovenLimit = (s) => 6 + 3 * (s.equipment?.capacityLevel || 0);
export const ovenDuration = (s) => [60, 45, 30][s.equipment?.speedLevel || 0];
export function buyEquipment(s, id) {
  if (
    !Object.hasOwn(workshopGoods, id) ||
    s.equipment[id] ||
    s.money < workshopGoods[id].price
  )
    return false;
  s.money -= workshopGoods[id].price;
  recordExpense(s, workshopGoods[id].price);
  s.equipment[id] = true;
  return true;
}
export function upgradeOven(s, kind) {
  const prices =
      kind === "capacity"
        ? capacityPrices
        : kind === "speed"
          ? speedPrices
          : null,
    key = kind + "Level";
  if (
    !prices ||
    s.oven ||
    s.equipment[key] >= prices.length ||
    s.money < prices[s.equipment[key]]
  )
    return false;
  s.money -= prices[s.equipment[key]];
  recordExpense(s, prices[s.equipment[key]]);
  s.equipment[key]++;
  return true;
}
