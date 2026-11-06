export const fishTypes = {
  large: { name: "대형 생선", price: 24 },
  medium: { name: "중형 생선", price: 12 },
  small: { name: "소형 생선", price: 6 },
  legacy: { name: "기존 생선", price: 12 },
};
export function fishCounts(s) {
  const stock = s.fishStock || { large: 0, medium: 0, small: 0 };
  return { ...stock, legacy: Math.max(0, (s.items.fish || 0) - stock.large - stock.medium - stock.small) };
}
export function consumeFishStock(s, quantity) {
  if (!s.fishStock) return;
  const counts = fishCounts(s);
  let remaining = Math.max(0, quantity - counts.legacy);
  for (const size of ["small", "medium", "large"]) {
    const used = Math.min(remaining, s.fishStock[size]);
    s.fishStock[size] -= used;
    remaining -= used;
  }
}
export function validateFishStock(s) {
  if (s.fishStock === undefined) s.fishStock = { large: 0, medium: 0, small: 0 };
  const f = s.fishStock;
  if (!f || Array.isArray(f) ||
      !["large", "medium", "small"].every((k) => Number.isSafeInteger(f[k]) && f[k] >= 0) ||
      f.large + f.medium + f.small > (s.items.fish || 0)) throw Error("손상된 생선 크기별 재고");
}
