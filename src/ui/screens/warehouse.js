import { ovenLimit } from "../../equipment.js";
import { doughTypes } from "../../recipeBook.js";
import { names } from "../../inventory.js";
import { takeBread, storeBread } from "../../shop.js";
import { familyTabs, bindFamilyTabs, foodIcon } from "../craftWidgets.js";
export function showWarehouse(ui) {
  const s = ui.g.state,
    type = ui.warehouseTab || "bread",
    ids = Object.values(doughTypes[type].finishes).map((f) => f.id),
    total = (record) => Object.values(record).reduce((a, b) => a + b, 0);
  ui.panel(
    `<div class="panel-eyebrow">PANTRY · 한 조각씩 차곡차곡</div><h2>빵 창고</h2><div class="stock-overview"><span>준비 반죽 <b>${total(s.doughs)}</b></span><span>구운 제품 <b>${total(s.warehouse)}</b></span><span>오븐 <b>${s.oven ? total(s.oven.batch) : 0}/${ovenLimit(s)}</b></span></div>${familyTabs(type, "warehouse-tab")}<div class="recipe-grid">${ids.map((id) => `<article class="recipe-card"><img src="${foodIcon(id)}" alt=""><h3>${names[id]}</h3><p>${names[id]} · 준비 반죽 ${s.doughs[id]}개</p><dl class="stock-counts"><div><dt>구운 재고</dt><dd>${s.warehouse[id]}</dd></div><div><dt>가방</dt><dd>${s.items[id]}</dd></div></dl><div class="card-actions"><button data-take="${id}">${names[id]} 꺼내기</button><button data-store="${id}">${names[id]} 보관</button></div></article>`).join("")}</div><p class="muted">작업 중인 반죽 ${s.baking ? 1 : 0}개 · 구운 제품을 가방에 꺼낸 뒤 진열하세요.</p>`,
    [["오븐 관리", () => ui.show("ovenBatch")]],
  );
  bindFamilyTabs(ui.overlay, "warehouse-tab", (type) => {
    ui.warehouseTab = type;
    ui.show("warehouse");
  });
  if (!ui.overlay) return;
  for (const b of ui.overlay.querySelectorAll("[data-take]"))
    b.onclick = () => {
      ui.notify(
        takeBread(s, b.dataset.take)
          ? "가방에 담았어요"
          : "창고에 제품이 없어요",
      );
      ui.show("warehouse");
    };
  for (const b of ui.overlay.querySelectorAll("[data-store]"))
    b.onclick = () => {
      ui.notify(
        storeBread(s, b.dataset.store)
          ? "창고에 넣었어요"
          : "가방에 제품이 없어요",
      );
      ui.show("warehouse");
    };
}
