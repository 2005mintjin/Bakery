import { recordReward } from "./dailyReport.js";

export const freshClinic = () => ({ bread: "none", gift: "none", report: null });
export function clinicState(s) {
  return (s.clinic ??= freshClinic());
}
export function canClinicAction(s, action) {
  const c = clinicState(s);
  return {
    acceptBread: c.bread === "none",
    deliverBread: c.bread === "active" && s.items.loaf >= 3,
    acceptGift: c.gift === "none",
    wrapGift: c.gift === "baking" && s.items.berrybread >= 1,
    deliverGift: c.gift === "wrapped",
    reportThanks: c.gift === "delivered",
    reportAnnoyed: c.gift === "delivered",
  }[action] === true;
}
export function clinicAction(s, action, reward = 60) {
  if (!canClinicAction(s, action) || !Number.isSafeInteger(reward) || reward < 0) return false;
  const c = clinicState(s);
  if (action === "acceptBread") {
    c.bread = "active";
    s.quests.clinicBread = "active";
  } else if (action === "deliverBread") {
    s.items.loaf -= 3;
    s.money += reward;
    recordReward(s, reward);
    c.bread = "done";
    s.quests.clinicBread = "done";
    s.affinity.konstanze = (s.affinity.konstanze || 0) + 1;
  } else if (action === "acceptGift") {
    c.gift = "baking";
    s.quests.clinicGift = "active";
  } else if (action === "wrapGift") {
    // The sealed gift is quest cargo, separate from sellable bread inventory.
    s.items.berrybread--;
    c.gift = "wrapped";
    s.quests.clinicDelivery = "active";
  } else if (action === "deliverGift") {
    c.gift = "delivered";
    s.quests.clinicDelivery = "done";
    s.affinity.mikhail = (s.affinity.mikhail || 0) + 1;
  } else {
    c.gift = "done";
    c.report = action === "reportThanks" ? "thanks" : "annoyed";
    s.quests.clinicGift = "done";
    s.affinity.catherine = (s.affinity.catherine || 0) + 1;
  }
  return true;
}
export function clinicJournal(s) {
  const c = clinicState(s);
  const text = {
    baking: "가방에 든 베리 빵 1개를 의원의 캐서린에게 맡기세요.",
    wrapped: "리본으로 포장한 선물을 번화가의 미하일에게 전하세요. 빵은 이미 포장했으니 더 준비할 필요 없어요.",
    delivered: "미하일에게 선물을 전했어요. 의원의 캐서린에게 돌아가 답을 전하세요.",
  }[c.gift];
  return text ? { clinicGift: text } : {};
}
export function validateClinicState(s) {
  if (s.clinic === undefined) s.clinic = freshClinic();
  const c = s.clinic;
  if (!c || Array.isArray(c) || typeof c !== "object" ||
      !["none", "active", "done"].includes(c.bread) ||
      !["none", "baking", "wrapped", "delivered", "done"].includes(c.gift) ||
      (c.gift === "done" ? !["thanks", "annoyed"].includes(c.report) : c.report !== null))
    throw Error("손상된 의원 기록");
  const delivery = c.gift === "wrapped" ? "active" : ["delivered", "done"].includes(c.gift) ? "done" : "none";
  for (const [id, phase] of [["clinicBread", c.bread], ["clinicGift", c.gift], ["clinicDelivery", delivery]]) {
    const expected = phase === "none" ? undefined : phase === "done" ? "done" : "active";
    if (s.quests[id] !== expected) throw Error("손상된 의원 부탁 기록");
  }
}
