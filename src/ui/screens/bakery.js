import { closeShop } from "../../wellbeing.js";

export { showWarehouse } from "./warehouse.js";

export function showShop(ui) {
  const s = ui.g.state;
  ui.panel(
    "<h2>작은 화덕 영업 안내</h2><p>개점하면 플레이 시간 12초마다 손님 한 명이 옵니다. 주문은 진열대에서 응대하세요. 메뉴에서는 시간이 멈춥니다.</p>",
    [
      [
        s.shop.open ? "폐점하기" : "개점하기",
        () => {
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
}

export { showShelf } from "./shelf.js";
