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
        Math.max(
          0,
          Math.ceil((s.oven.duration ?? bakeSeconds) - s.oven.seconds),
        ) +
        "초";
  }
  const time = `${String(Math.floor(s.minutes / 60)).padStart(2, "0")}:${String(Math.floor(s.minutes % 60)).padStart(2, "0")}`;
  const status = document.querySelector("#status"),
    phase = daylight(s.minutes).phase;
  const update = (selector, text) => {
    const el = status.querySelector(selector);
    if (el && el.textContent !== text) el.textContent = text;
  };
  update("[data-day]", `${s.day}일째`);
  update(
    "[data-clock]",
    `${phase === "밤" ? "☾" : phase === "노을" ? "◒" : "☀"} ${time} · ${phase}`,
  );
  update("[data-money]", `◈ ${s.money} G`);
  update("[data-energy]", `기력 ${s.stamina}/100`);
  const meter = status.querySelector("[data-energy-bar]");
  if (meter) meter.value = s.stamina;
  for (const b of document.querySelectorAll("[data-panel]"))
    b.disabled =
      (!ui.g.started && b.dataset.panel !== "audio") ||
      (b.hasAttribute("data-room-required") &&
        !["bakery", "bakeryKitchen"].includes(s.scene));
  document.querySelector("#location").textContent = {
    town: "❀ 달빛마을 · 사거리",
    bakery: "♨ 작은 화덕 · 빵집",
    post: "✉ 달빛 우체국",
    bakeryKitchen: "♨ 작은 화덕 · 작업실",
    store: "✦ 해봄 잡화점",
    cafe: "☕ 햇살 카페",
    workshop: "⚒ 해봄 공방",
    city: "❀ 해봄 소도시 · 상점 거리",
    field: "❀ 서쪽 베리 텃밭",
  }[s.scene];
  document.querySelector("#hint").textContent = hint;
}
