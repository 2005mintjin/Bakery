import { buyItem } from "../../bakery.js";
import { receiveParcel } from "../../shop.js";

export function showParcel(ui) {
  const s = ui.g.state;
  const type = "parcel";
  ui.panel(
    "<h2>달빛 우체국 · 소포 수령</h2><p>마을 조합이 하루 한 번 밀가루 4개와 꿀 1개를 보내옵니다.</p><p>받은 소포: " +
      s.parcels.length +
      "개</p>",
    [
      [
        "소포 받기",
        () => {
          ui.notify(
            receiveParcel(s)
              ? "소포를 받았어요! 재료를 가방에 넣었습니다."
              : "오늘 소포는 이미 받았어요",
          );
          ui.show(type);
        },
      ],
    ],
  );
}

export function showSupplies(ui) {
  const s = ui.g.state;
  const d = ui.g.data;
  ui.panel(
    "<h2>해봄 잡화점 · 재료와 씨앗</h2>" +
      d.storeItems
        .map(
          (item) =>
            `<div class="row"><span>${item.name} · 보유 ${s.items[item.id] || 0}개</span><b>${item.price}G / 1개</b></div>`,
        )
        .join(""),
    d.storeItems.map((item) => [
      item.name + " 1개 구매 · " + item.price + "G",
      () => {
        ui.notify(buyItem(s, item) ? item.name + "을 샀어요" : "돈이 부족해요");
        ui.show("supplies");
      },
    ]),
  );
}
