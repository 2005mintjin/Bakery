import { names } from "../../inventory.js";
import { productIds } from "../../recipeBook.js";
import { foodIcon } from "../craftWidgets.js";
export function showInventory(ui) {
  const s = ui.g.state,
    filter = ui.inventoryFilter || "all",
    items = Object.keys(s.items).filter(
      (id) =>
        s.items[id] > 0 &&
        (filter === "all" ||
          (filter === "products" && productIds.includes(id)) ||
          (filter === "seeds" && id === "berrySeeds") ||
          (filter === "materials" &&
            !productIds.includes(id) &&
            id !== "berrySeeds")),
    );
  if (!items.includes(ui.inventoryItem)) ui.inventoryItem = items[0];
  const selected = ui.inventoryItem,
    r = ui.g.data.recipes.find((r) => r.id === selected),
    icon = (id) =>
      productIds.includes(id) ? foodIcon(id) : "assets/ui/ingredient.svg";
  ui.panel(
    `<div class="panel-eyebrow">INVENTORY · 나의 작은 가방</div><h2>나의 가방</h2><nav class="inventory-filters" aria-label="가방 분류">${[
      ["all", "전체"],
      ["materials", "재료"],
      ["products", "완성품"],
      ["seeds", "씨앗"],
    ]
      .map(
        ([key, label]) =>
          `<button data-inventory-filter="${key}" aria-pressed="${key === filter}">${label}</button>`,
      )
      .join(
        "",
      )}</nav><div class="inventory-layout"><div class="inventory-grid">${items.map((id) => `<button class="inventory-slot ${id === selected ? "selected" : ""}" data-item="${id}" aria-label="${names[id]} ${s.items[id]}개"><img src="${icon(id)}" alt=""><b>${s.items[id]}</b><span>${names[id]}</span></button>`).join("") || '<p class="empty-state">이 칸에 보관한 물건이 없어요.</p>'}</div><aside class="item-detail">${selected ? `<img src="${icon(selected)}" alt=""><h3>${names[selected]}</h3><span class="item-kind">${r ? "완성품" : selected === "berrySeeds" ? "씨앗" : "재료"}</span><p>${r ? "따뜻하게 구워 창고와 진열대에 놓을 수 있어요." : selected === "berrySeeds" ? "서쪽 텃밭에 심고 물을 주면 베리가 자라요." : "반죽과 속재료를 준비할 때 사용하는 재료예요."}</p><dl><dt>보유 수량</dt><dd>${s.items[selected]}개</dd>${r ? `<dt>판매가</dt><dd>${r.price}G / 1개</dd>` : ""}</dl>` : "<p>물건을 고르면 자세히 볼 수 있어요.</p>"}</aside></div>`,
  );
  for (const b of ui.overlay.querySelectorAll("[data-inventory-filter]"))
    b.onclick = () => {
      ui.inventoryFilter = b.dataset.inventoryFilter;
      ui.show("inventory");
    };
  for (const b of ui.overlay.querySelectorAll("[data-item]"))
    b.onclick = () => {
      ui.inventoryItem = b.dataset.item;
      ui.show("inventory");
    };
}
