import { bakeSeconds } from "../baking.js";
import { daylight } from "../render/daylight.js";
export function updateHud(ui, hint) {
  const s = ui.g.state;
  if (ui.currentPanel === "ovenBatch" && s.oven?.phase === "baking") {
    const progress = ui.overlay.querySelector("#bake-progress"),
      label = ui.overlay.querySelector("#bake-seconds");
    if (progress) progress.value = s.oven.seconds;
    if (label)
      label.textContent =
        "완성까지 " +
        Math.max(0, Math.ceil(bakeSeconds - s.oven.seconds)) +
        "초";
  }
  document.querySelector("#status").textContent =
    `${s.day}일째 · ${String(Math.floor(s.minutes / 60)).padStart(2, "0")}:${String(Math.floor(s.minutes % 60)).padStart(2, "0")}　${daylight(s.minutes).phase}　${s.money} G · 기력 ${s.stamina}/100`;
  document.querySelector("#location").textContent = {
    town: "❀ 달빛마을 · 사거리",
    bakery: "♨ 작은 화덕 · 빵집",
    post: "✉ 달빛 우체국",
    bakeryKitchen: "♨ 작은 화덕 · 작업실",
    store: "✦ 해봄 잡화점",
    cafe: "☕ 햇살 카페",
    city: "❀ 해봄 소도시 · 상점 거리",
    field: "❀ 서쪽 베리 텃밭",
  }[s.scene];
  document.querySelector("#hint").textContent = hint;
}
