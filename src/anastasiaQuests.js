import { availableProducts } from "./equipment.js";
import { workDay, recordReward } from "./dailyReport.js";
import { complete } from "./quest.js";
import { spend, names } from "./inventory.js";
export function ensureAnastasia(s) {
  s.anastasia ??= { introDay: null, daily: null };
  if (s.quests.delivery === "done" && s.anastasia.introDay === null)
    s.anastasia.introDay = workDay(s);
  return s.anastasia;
}
export function anastasiaStatus(s) {
  if (s.quests.delivery !== "done") return s.quests.delivery;
  const a = s.anastasia,
    today = workDay(s);
  if (a?.introDay == null || a.introDay >= today) return "done";
  return a.daily?.day === today && a.daily.status !== "cancelled"
    ? a.daily.status
    : undefined;
}
export function chooseDailyBread(s, random = Math.random) {
  const ids = availableProducts(s),
    roll = random();
  if (!Number.isFinite(roll) || roll < 0 || roll > 1) return null;
  return ids[Math.min(ids.length - 1, Math.floor(roll * ids.length))] || null;
}
export function acceptDailyBread(s, product) {
  ensureAnastasia(s);
  if (
    s.quests.delivery !== "done" ||
    anastasiaStatus(s) !== undefined ||
    !availableProducts(s).includes(product)
  )
    return false;
  s.anastasia.daily = { day: workDay(s), status: "active", product };
  return true;
}
export function cancelDailyBread(s) {
  if (anastasiaStatus(s) !== "active" || s.quests.delivery !== "done")
    return false;
  s.anastasia.daily.status = "cancelled";
  return true;
}
export function completeFirstBread(s, quest) {
  if (!complete(s, quest)) return false;
  ensureAnastasia(s).introDay = workDay(s);
  s.affinity.mira = (s.affinity.mira || 0) + 1;
  return true;
}
export function completeDailyBread(s, recipes) {
  const a = ensureAnastasia(s),
    request = a.daily;
  if (s.quests.delivery !== "done" || anastasiaStatus(s) !== "active")
    return false;
  const recipe = recipes.find((r) => r.id === request.product);
  if (
    !recipe ||
    !Number.isFinite(recipe.price) ||
    recipe.price < 0 ||
    !spend(s, { [request.product]: 1 })
  )
    return false;
  request.status = "done";
  s.money += recipe.price;
  recordReward(s, recipe.price);
  s.affinity.mira = (s.affinity.mira || 0) + 1;
  return true;
}
export function dailyQuestEntry(s, recipes = []) {
  if (
    s.quests.delivery !== "done" ||
    s.anastasia?.introDay == null ||
    s.anastasia.introDay >= workDay(s)
  )
    return [];
  const status = anastasiaStatus(s),
    request = s.anastasia.daily;
  const product =
    request?.day === workDay(s) && status ? request.product : null;
  const recipe = recipes.find((r) => r.id === product);
  return [
    {
      id: "anastasia-daily",
      name: "아나스타샤의 오늘도 갓 구운 빵",
      status,
      description: product
        ? `아나스타샤에게 가방에 든 ${names[product]} 1개를 전해 주세요. 보상 ${recipe?.price ?? 0}G.`
        : "광장에서 아나스타샤와 이야기하고 오늘의 빵 부탁을 받아 보세요.",
    },
  ];
}
