import { fishTypes, fishCounts } from "../../fishStock.js";
import { sellFish } from "../../fishMarket.js";
import { guildSupplies, syncGuild } from "../../guild.js";
import { names } from "../../inventory.js";
import { buyItem } from "../../bakery.js";
import { receiveParcel } from "../../shop.js";

export function showParcel(ui) {
  const s = ui.g.state;
  const type = "parcel";
  ui.panel(
    `<h2>달빛 우체국 · 소포 수령</h2><p>마을 조합이 하루 한 번 지원품을 보내옵니다. 현재 ${syncGuild(s).grade}등급: ${Object.entries(guildSupplies(s)).map(([id, n]) => `${names[id] || id} ${n}개`).join(", ")}</p><p>받은 소포: ` +
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
    [["생선 팔기 · 크기별 매입", () => ui.show("fishMarket")], ...d.storeItems.map((item) => [
      item.name + " 1개 구매 · " + item.price + "G",
      () => {
        ui.notify(buyItem(s, item) ? item.name + "을 샀어요" : "돈이 부족해요");
        ui.show("supplies");
      },
    ])],
  );
}


export function showFishMarket(ui) {
  const s = ui.g.state, counts = fishCounts(s);
  ui.panel(
    "<h2>잡화점 · 생선 매입</h2><p>대 24G · 중 12G · 소 6G. 기존 생선은 12G에 매입해요.</p>" +
    Object.entries(fishTypes).map(([size, type]) => `<div class="row"><span>${type.name} · ${counts[size]}마리</span><b>${type.price}G / 마리</b></div>`).join("") +
    "<p>생선파이에 쓸 생선은 남겨 두세요. 요리할 때는 기존 생선, 소형, 중형, 대형 순서로 사용해요.</p>",
    Object.entries(fishTypes).filter(([size]) => counts[size] > 0).flatMap(([size, type]) => [1, counts[size]].filter((n,i,a) => a.indexOf(n) === i).map((quantity) => [
      `${type.name} ${quantity}마리 판매 · ${type.price * quantity}G`,
      () => {
        const earned = sellFish(s, size, quantity);
        ui.notify(earned ? `${type.name} 판매 · +${earned}G` : "생선이 부족하거나 영업시간이 아니에요.");
        ui.show("fishMarket");
      },
    ])),
  );
}
