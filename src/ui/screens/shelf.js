import { display, undisplay } from "../../bakery.js";
export function showShelf(ui) {
  const s = ui.g.state;
  ui.panel(
    '<h2>진열·재고 관리</h2><p>창고에서 꺼낸 제품을 진열하세요. 실제 주문 수량은 진열 재고에서 판매됩니다.</p><div id="shelf-list"></div>',
  );
  const list = ui.overlay.querySelector("#shelf-list");
  for (const recipe of ui.g.data.recipes) {
    const row = document.createElement("div");
    row.className = "shelf-row";
    const label = document.createElement("span");
    label.textContent = `${recipe.name} · 가방 ${s.items[recipe.id] || 0} / 진열 ${s.display[recipe.id] || 0} / 창고 ${s.warehouse[recipe.id] || 0}`;
    const count = document.createElement("input");
    count.type = "number";
    count.min = "1";
    count.max = "99";
    count.step = "1";
    count.value = "1";
    count.setAttribute("aria-label", recipe.name + " 이동 개수");
    row.append(label, count);
    for (const [text, fn] of [
      ["진열", display],
      ["회수", undisplay],
    ]) {
      const b = document.createElement("button");
      b.textContent = recipe.name + " " + text;
      b.onclick = () => {
        const ok = fn(s, recipe.id, Number(count.value));
        ui.notify(
          ok ? "재고를 옮겼어요" : "수량이 부족하거나 개수가 올바르지 않아요",
        );
        ui.show("shelf");
      };
      row.append(b);
    }
    list.append(row);
  }
}
