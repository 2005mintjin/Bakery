import { fishTypes, fishCounts } from "./fishStock.js";
import { facilityOpen } from "./schedule.js";
import { recordFishSale } from "./dailyReport.js";
export function sellFish(s, size, quantity = 1) {
  if (s.scene !== "store" || !facilityOpen(s, "store") ||
      !Object.hasOwn(fishTypes, size) || !Number.isSafeInteger(quantity) || quantity < 1 ||
      fishCounts(s)[size] < quantity) return false;
  if (size !== "legacy") s.fishStock[size] -= quantity;
  s.items.fish -= quantity;
  const earned = fishTypes[size].price * quantity;
  s.money += earned;
  recordFishSale(s, earned);
  return earned;
}
