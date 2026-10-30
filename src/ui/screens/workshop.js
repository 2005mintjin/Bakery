import {
  workshopGoods,
  buyEquipment,
  capacityPrices,
  speedPrices,
  ovenLimit,
  ovenDuration,
  upgradeOven,
} from "../../equipment.js";
export function showWorkshop(ui) {
  const s = ui.g.state,
    e = s.equipment;
  ui.panel(
    `<div class="panel-eyebrow">WORKSHOP · 오래 쓸 도구를 만들어요</div><h2>해봄 공방</h2><p>소지금 <b>${s.money}G</b> · 오븐 ${ovenLimit(s)}개 / ${ovenDuration(s)}초</p><div class="recipe-grid workshop-goods">${Object.entries(
      workshopGoods,
    )
      .map(
        ([id, item]) =>
          `<article class="recipe-card"><img src="assets/ui/${id === "pieMold" ? "pie" : "cookie"}.svg" alt=""><h3>${item.name}</h3><p>${item.description}</p><button data-tool="${id}" ${e[id] || s.money < item.price ? "disabled" : ""}>${e[id] ? "보유 중" : `${item.name} 구매 · ${item.price}G`}</button></article>`,
      )
      .join(
        "",
      )}</div><h3>오븐 개량</h3><p>용량과 속도는 각각 2단계까지 개선할 수 있어요. 굽거나 건조한 제품을 먼저 꺼내 주세요.</p><div class="recipe-grid workshop-upgrades">${[
      [
        "capacity",
        "용량 확장",
        capacityPrices,
        "capacityLevel",
        `${ovenLimit(s) + 3}개`,
      ],
      [
        "speed",
        "화력 개선",
        speedPrices,
        "speedLevel",
        `${ovenDuration(s) - 15}초`,
      ],
    ]
      .map(
        ([kind, label, prices, key, next]) =>
          `<article class="recipe-card"><h3>${label}</h3><p>현재 ${e[key]}/2단계${e[key] < 2 ? ` · 다음 ${next}` : " · 최대 단계"}</p><button data-upgrade="${kind}" ${e[key] >= 2 || s.oven || s.money < prices[e[key]] ? "disabled" : ""}>${e[key] >= 2 ? "개량 완료" : `${label} · ${prices[e[key]]}G`}</button></article>`,
      )
      .join(
        "",
      )}</div>${s.oven ? '<p class="lock-notice">오븐 작업을 마치고 제품을 꺼내면 개량할 수 있어요.</p>' : ""}`,
  );
  for (const b of ui.overlay.querySelectorAll("[data-tool]"))
    b.onclick = () => {
      ui.notify(
        buyEquipment(s, b.dataset.tool)
          ? "새 도구를 마련했어요! 판매 메뉴에서도 새 제품을 선택할 수 있어요."
          : "구매할 수 없어요.",
      );
      ui.show("workshop");
    };
  for (const b of ui.overlay.querySelectorAll("[data-upgrade]"))
    b.onclick = () => {
      ui.notify(
        upgradeOven(s, b.dataset.upgrade)
          ? "오븐 개량을 마쳤어요!"
          : "오븐 상태와 소지금을 확인해 주세요.",
      );
      ui.show("workshop");
    };
}
