import { names } from "./inventory.js";
export class BakeryHud {
  constructor(g) {
    this.g = g;
    this.root = document.createElement("section");
    this.root.id = "bakery-console";
    this.root.hidden = true;
    this.root.innerHTML =
      '<div class="bakery-summary"><b data-shop></b><span data-order></span></div><div class="bakery-stock" aria-label="실제 진열 재고"></div><div class="bakery-controls"></div><small>판매 가능 수량은 진열 재고를 확인하세요.</small>';
    for (const [type, label] of [
      ["shelf", "진열·재고 관리"],
      ["shop", "영업 안내판"],
      ["customerTalk", "손님과 대화하기"],
    ]) {
      const b = document.createElement("button");
      b.className = "spot-" + type;
      b.textContent = label;
      b.onclick = () => {
        if (!g.ui.open) g.ui.show(type);
      };
      this.root.querySelector(".bakery-controls").append(b);
    }
    for (const r of g.data.recipes) {
      const chip = document.createElement("span");
      chip.dataset.stock = r.id;
      this.root.querySelector(".bakery-stock").append(chip);
    }
    document
      .querySelector(".game")
      .insertAdjacentElement("afterend", this.root);
  }
  update() {
    const { g, root } = this,
      s = g.state,
      c = s.shop.customer;
    root.hidden = !g.started || s.scene !== "bakery";
    if (root.hidden) return;
    root.querySelector("[data-shop]").textContent =
      (s.shop.open ? "영업 중" : "준비 중 · 폐점") +
      ` · 누적 수익 ${s.revenue}G`;
    root.querySelector("[data-order]").textContent = c
      ? c.phase === "knocking"
        ? "똑똑! 손님이 오고 있어요"
        : `${c.name} · ${names[c.bread]} ${c.quantity ?? 1}개 주문`
      : "대기 중인 주문이 없어요";
    for (const chip of root.querySelectorAll("[data-stock]")) {
      const text = `${names[chip.dataset.stock]} ${s.display[chip.dataset.stock] || 0}개`;
      if (chip.textContent !== text) chip.textContent = text;
    }
    for (const b of root.querySelectorAll("button")) b.disabled = g.ui.open;
    root.querySelector(".spot-customerTalk").hidden = c?.phase !== "waiting";
  }
}
