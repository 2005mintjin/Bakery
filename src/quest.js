import { recordReward } from "./dailyReport.js";
import { spend } from "./inventory.js";
export function accept(s, q) {
  if (s.quests[q.id]) return false;
  s.quests[q.id] = "active";
  return true;
}
export function complete(s, q) {
  if (s.quests[q.id] !== "active") return false;
  if (q.item && !spend(s, { [q.item]: q.count })) return false;
  s.quests[q.id] = "done";
  s.money += q.reward;
  recordReward(s, q.reward);
  return true;
}
