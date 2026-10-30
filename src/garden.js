export const plotCount = 6,
  growthMinutes = 120,
  berryYield = 8;
export const plotPositions = Array.from({ length: plotCount }, (_, i) => ({
  x: [228, 471, 719][i % 3],
  y: i < 3 ? 166 : 409,
}));
export const gameMinutes = (s) => s.day * 1440 + s.minutes;
export function plant(s, index) {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= plotCount ||
    s.garden[index] ||
    s.items.berrySeeds < 1
  )
    return false;
  s.items.berrySeeds--;
  s.garden[index] = { plantedAt: gameMinutes(s), wateredAt: null };
  return true;
}
export function water(s, index) {
  const p = s.garden[index];
  if (!p || p.wateredAt !== null) return false;
  p.wateredAt = gameMinutes(s);
  return true;
}
export function cropStage(s, index) {
  const p = s.garden[index];
  return !p
    ? "empty"
    : p.wateredAt === null
      ? "dry"
      : gameMinutes(s) - p.wateredAt >= growthMinutes
        ? "ripe"
        : "growing";
}
export function harvest(s, index) {
  if (cropStage(s, index) !== "ripe") return false;
  s.items.berry += berryYield;
  s.garden[index] = null;
  return true;
}
export function showGarden(ui, index) {
  const s = ui.g.state,
    stage = cropStage(s, index),
    labels = {
      empty: "빈 밭",
      dry: "씨앗 · 물이 필요해요",
      growing: "자라는 중",
      ripe: "수확 가능",
    };
  ui.panel(
    "<h2>베리 텃밭 · " +
      (index + 1) +
      "번 밭</h2><p>" +
      labels[stage] +
      "</p><p>씨앗 " +
      s.items.berrySeeds +
      "개 · 베리 " +
      s.items.berry +
      "개</p><p>씨앗을 심고 물을 주면 게임 시간 2시간 후 베리 8개를 수확합니다.</p>",
    [
      [
        stage === "empty"
          ? "씨앗 심기"
          : stage === "dry"
            ? "물 주기"
            : stage === "ripe"
              ? "베리 수확"
              : "성장 상태 확인",
        () => {
          const ok =
            stage === "empty"
              ? plant(s, index)
              : stage === "dry"
                ? water(s, index)
                : stage === "ripe"
                  ? harvest(s, index)
                  : false;
          if (!ok)
            ui.notify(
              stage === "growing"
                ? "조금 더 기다려 주세요. 빵집에서 잠을 자고 다음 날 수확해도 좋아요."
                : "씨앗이 부족하거나 아직 수확할 수 없어요",
            );
          showGarden(ui, index);
        },
      ],
    ],
  );
}
