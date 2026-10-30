import { dayReport, emptyLedger, workDay } from "./dailyReport.js";
import { sleepUntilMorning } from "./wellbeing.js";
export function settleNight(s) {
  if (!["bakery", "bakeryKitchen"].includes(s.scene)) return null;
  const report = dayReport(s),
    rest = sleepUntilMorning(s);
  s.lastNight = { ...report, rest, wakeDay: s.day, money: s.money };
  s.dailyLedger = emptyLedger(workDay(s));
  return s.lastNight;
}
