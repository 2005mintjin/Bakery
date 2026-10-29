import { buyRefreshment, maxStamina } from "../../wellbeing.js";
export function showCafe(ui) {
  const s = ui.g.state;
  if (s.scene !== "cafe") {
    ui.notify("소도시 카페에 들어가 주세요.");
    return;
  }
  ui.panel(
    `<h2>햇살 카페 · 잠깐의 여유</h2><p>커피와 디저트는 구매 즉시 먹고 기력을 회복해요.</p><p>기력 ${s.stamina}/${maxStamina} · 소지금 ${s.money}G</p>` +
      ui.g.data.cafeItems
        .map(
          (item) =>
            `<div class="row"><span>${item.name} · 기력 +${item.stamina}</span><b>${item.price}G</b></div>`,
        )
        .join(""),
    ui.g.data.cafeItems.map((item) => [
      `${item.name} · ${item.price}G`,
      () => {
        const before = s.stamina,
          result = buyRefreshment(s, item);
        ui.notify(
          result === "bought"
            ? `${item.name}을 즐겼어요 · 기력 +${s.stamina - before}`
            : result === "full"
              ? "이미 기력이 가득해요."
              : result === "poor"
                ? "돈이 부족해요."
                : "메뉴를 확인해 주세요.",
        );
        ui.show("cafe");
      },
    ]),
  );
}
