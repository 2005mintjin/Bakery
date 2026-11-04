import { target } from "../exploration.js";
import { isInterior } from "../interior.js";
export function updateHint(g) {
  const o = target(g);
  const hint =
    g.state.scene === "bakery"
      ? "아래 영업·재고 패널에서 주문과 진열 수량을 관리하세요"
      : isInterior(g.state.scene)
        ? "대화·기능 버튼을 선택하세요 · 나가기 버튼으로 실외에 복귀"
        : o
          ? "E · " + o.label
          : g.state.shop.customer
            ? "손님 주문 도착 · 빵집 진열대에서 E"
            : g.state.scene === "bakery"
              ? "창고에서 빵 꺼내기 → 진열 → 개점 → 주문 응대"
              : g.state.scene === "city"
                ? "← 달빛마을 · 오른쪽 길 → 번화가"
                : g.state.scene === "downtown"
                  ? "← 상점가 · 오른쪽 길 → 쉼터 광장 · 건물 내부는 준비 중"
                  : g.state.scene === "downtownEast"
                    ? "← 병원·책방 거리 · 지금은 산책과 주민 대화만 가능해요"
              : g.state.scene === "field"
                ? "← 낚시터 · 밭 아래에서 E · 오른쪽 길 → 마을"
                : g.state.scene === "pond"
                  ? "부두에서 E · 낚시하기 / 오른쪽 길 → 베리 텃밭"
                  : "← 베리 텃밭 · 해봄 소도시 →";
  g.ui.update(
    g.touchControls?.visible ? hint.replace(/\bE\b/g, "조사 버튼") : hint,
  );
}
