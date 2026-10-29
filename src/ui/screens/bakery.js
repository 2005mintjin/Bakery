import { names } from "../../inventory.js";
import { display } from "../../bakery.js";
import { takeBread, storeBread } from "../../shop.js";

export function showWarehouse(ui) {
  const s = ui.g.state;
  const d = ui.g.data;
  const type = "warehouse";
  ui.panel(
    "<h2>빵 창고</h2><p>구운 빵은 창고에 보관됩니다. 먼저 꺼낸 뒤 진열하세요.</p>" +
      d.recipes
        .map(
          (r) =>
            `<p>${r.name} · 창고 ${s.warehouse[r.id]} / 가방 ${s.items[r.id]}</p>`,
        )
        .join(""),
    d.recipes.flatMap((r) => [
      [
        r.name + " 꺼내기",
        () => {
          ui.notify(
            takeBread(s, r.id) ? "가방에 담았어요" : "창고에 빵이 없어요",
          );
          ui.show(type);
        },
      ],
      [
        r.name + " 보관",
        () => {
          ui.notify(
            storeBread(s, r.id) ? "창고에 넣었어요" : "가방에 빵이 없어요",
          );
          ui.show(type);
        },
      ],
    ]),
  );
}

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
          if (!s.shop.open) s.shop.customer = null;
          ui.close();
          ui.notify(s.shop.open ? "문을 열었어요!" : "오늘 영업을 마쳤어요");
        },
      ],
    ],
  );
}

export function showShelf(ui) {
  const s = ui.g.state;
  const d = ui.g.data;
  const type = "shelf";
  ui.panel(
    "<h2>빵 진열대</h2><p>" +
      (s.shop.customer
        ? s.shop.customer.name + "의 주문: " + names[s.shop.customer.bread]
        : s.shop.open
          ? "손님을 기다리고 있어요."
          : "영업 안내판에서 먼저 개점하세요.") +
      "</p>" +
      d.recipes
        .map(
          (r) =>
            `<p>${r.name}: 가방 ${s.items[r.id]} / 진열 ${s.display[r.id] || 0}</p>`,
        )
        .join("") +
      `<p>누적 수익 ${s.revenue}G</p>`,
    [
      ...d.recipes.map((r) => [
        r.name + " 진열",
        () => {
          ui.notify(
            display(s, r.id) ? "진열했어요" : "창고에서 빵을 먼저 꺼내세요",
          );
          ui.show(type);
        },
      ]),
      ...(s.shop.customer?.phase === "waiting"
        ? [["손님과 대화하기", () => ui.show("customerTalk")]]
        : []),
    ],
  );
}
