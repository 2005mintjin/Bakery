import { closeShop } from "../../wellbeing.js";
import { availableProducts } from "../../equipment.js";
import { setSaleMenu, saleProducts } from "../../shop.js";
import { names } from "../../inventory.js";
import { foodIcon } from "../craftWidgets.js";
export { showWarehouse } from "./warehouse.js";
export function showShop(ui) {
  const s = ui.g.state,
    menu = saleProducts(s);
  ui.panel(
    `<div class="panel-eyebrow">TODAY'S MENU · 오늘 굽는 것들</div><h2>펜서 베이커리 영업 안내</h2><p>손님은 선택한 메뉴 중에서 1~3개를 주문해요. 진열 재고와 별개로 오늘 팔 제품을 골라 주세요.</p><div class="sale-menu">${availableProducts(
      s,
    )
      .map(
        (id) =>
          `<label><input type="checkbox" data-sale="${id}" ${menu.includes(id) ? "checked" : ""}><img src="${foodIcon(id)}" alt=""><span>${names[id]}<small>진열 ${s.display[id] || 0}개</small></span></label>`,
      )
      .join(
        "",
      )}</div><p class="muted">최소 한 종류를 선택해야 해요. 메뉴 변경은 다음 손님부터 적용되며 기다리는 손님의 주문은 유지됩니다. 파이·쿠키는 공방 도구를 구매하면 목록에 추가돼요.</p>`,
    [
      [
        "판매 메뉴 적용",
        () => {
          if (!apply()) return;
          ui.notify("오늘의 판매 메뉴를 저장했어요.");
          ui.show("shop");
        },
      ],
      [
        s.shop.open ? "폐점하기" : "개점하기",
        () => {
          if (!s.shop.open && !apply()) return;
          s.shop.open = !s.shop.open;
          s.shop.elapsed = 0;
          if (!s.shop.open) closeShop(s);
          ui.close();
          ui.notify(s.shop.open ? "문을 열었어요!" : "오늘 영업을 마쳤어요");
        },
      ],
      [
        "가게 닫고 퇴근하기",
        () => {
          closeShop(s);
          ui.show("sleep");
        },
      ],
    ],
  );
  function apply() {
    const ids = [...ui.overlay.querySelectorAll("[data-sale]:checked")].map(
      (b) => b.dataset.sale,
    );
    if (!setSaleMenu(s, ids)) {
      ui.notify("판매할 제품을 한 종류 이상 선택해 주세요.");
      return false;
    }
    return true;
  }
}
export { showShelf } from "./shelf.js";
