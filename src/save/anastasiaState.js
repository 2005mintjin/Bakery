import { productIds } from "../recipeBook.js";
import { workDay } from "../dailyReport.js";
export function validateAnastasiaState(s) {
  const day = workDay(s);
  if (s.anastasia === undefined)
    s.anastasia = {
      introDay: s.quests.delivery === "done" ? day : null,
      daily: null,
    };
  const a = s.anastasia;
  if (
    !a ||
    Array.isArray(a) ||
    typeof a !== "object" ||
    !(
      a.introDay === null ||
      (Number.isSafeInteger(a.introDay) && a.introDay >= 1 && a.introDay <= day)
    ) ||
    (a.introDay !== null && s.quests.delivery !== "done")
  )
    throw Error("손상된 아나스타샤 부탁 기록");
  if (a.daily !== null) {
    const d = a.daily;
    if (
      !d ||
      Array.isArray(d) ||
      a.introDay === null ||
      !Number.isSafeInteger(d.day) ||
      d.day <= a.introDay ||
      d.day > day ||
      !productIds.includes(d.product) ||
      !["active", "done", "cancelled"].includes(d.status)
    )
      throw Error("손상된 아나스타샤 일일 부탁");
  }
}
