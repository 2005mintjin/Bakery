import { target } from "../exploration.js";
import { isInterior } from "../interior.js";
export function updateHint(g) {
  const o = target(g);
  g.ui.update(
    isInterior(g.state.scene)
      ? "원하는 물건을 클릭하세요 · 나가기 버튼으로 광장에 복귀"
      : o
        ? "E · " + o.label
        : g.state.shop.customer
          ? "손님 주문 도착 · 빵집 진열대에서 E"
          : g.state.scene === "bakery"
            ? "창고에서 빵 꺼내기 → 진열 → 개점 → 주문 응대"
            : g.state.scene === "field"
              ? "밭 아래에서 E · 씨앗 심기 → 물 주기 → 수확 / 오른쪽 길 → 마을"
              : "← 베리 텃밭 · 해봄 소도시 →",
  );
}
