export const names = {
  flour: "밀가루",
  yeast: "이스트",
  salt: "소금",
  berrySeeds: "베리 씨앗",
  honey: "꿀",
  berry: "베리",
  loaf: "밀빵",
  honeybread: "꿀빵",
  berrybread: "베리빵",
  water: "물",
  sugar: "설탕",
  butter: "버터",
  meat: "고기",
  fish: "생선",
  chocolate: "초콜릿",
  driedberry: "말린 베리",
  berrypie: "베리 파이",
  meatpie: "미트파이",
  fishpie: "생선파이",
  cookie: "버터 쿠키",
  berrycookie: "말린 베리 쿠키",
  chococookie: "초콜릿 쿠키",
};
export function has(s, cost) {
  return Object.entries(cost).every(([k, v]) => (s.items[k] || 0) >= v);
}
export function spend(s, cost) {
  if (!has(s, cost)) return false;
  for (const [k, v] of Object.entries(cost)) s.items[k] -= v;
  return true;
}
