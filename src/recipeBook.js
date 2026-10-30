// Stable product IDs are also used to migrate old saves. Prices/dialogue metadata live in JSON.
export const productIds = [
  "loaf",
  "honeybread",
  "berrybread",
  "berrypie",
  "meatpie",
  "fishpie",
  "cookie",
  "berrycookie",
  "chococookie",
];
export const doughTypes = {
  bread: {
    name: "빵",
    cost: { flour: 2, yeast: 1, salt: 1 },
    finishes: {
      none: { id: "loaf", name: "아무것도 넣지 않기 · 밀빵", cost: {} },
      honey: {
        id: "honeybread",
        name: "꿀 1개 넣기 · 꿀빵",
        cost: { honey: 1 },
      },
      berry: {
        id: "berrybread",
        name: "베리 2개 넣기 · 베리빵",
        cost: { berry: 2 },
      },
    },
  },
  pie: {
    name: "파이",
    cost: { flour: 2, water: 1, salt: 1 },
    finishes: {
      berry: {
        id: "berrypie",
        name: "베리 2개 + 설탕 1개 · 베리 파이",
        cost: { berry: 2, sugar: 1 },
      },
      meat: { id: "meatpie", name: "고기 2개 · 미트파이", cost: { meat: 2 } },
      fish: { id: "fishpie", name: "생선 2개 · 생선파이", cost: { fish: 2 } },
    },
  },
  cookie: {
    name: "쿠키",
    cost: { flour: 1, sugar: 1, butter: 1 },
    finishes: {
      none: { id: "cookie", name: "토핑 없이 · 버터 쿠키", cost: {} },
      driedberry: {
        id: "berrycookie",
        name: "말린 베리 1개 · 말린 베리 쿠키",
        cost: { driedberry: 1 },
      },
      chocolate: {
        id: "chococookie",
        name: "초콜릿 1개 · 초콜릿 쿠키",
        cost: { chocolate: 1 },
      },
    },
  },
};
export const productCounts = () =>
  Object.fromEntries(productIds.map((id) => [id, 0]));
