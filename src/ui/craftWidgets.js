import { doughTypes } from "../recipeBook.js";
import { names } from "../inventory.js";
export const families = Object.keys(doughTypes);
export function familyFor(id) {
  return (
    families.find((type) =>
      Object.values(doughTypes[type].finishes).some((f) => f.id === id),
    ) || "bread"
  );
}
export function foodIcon(idOrFamily) {
  const family = families.includes(idOrFamily)
    ? idOrFamily
    : familyFor(idOrFamily);
  return `assets/ui/${family}.svg`;
}
export function familyTabs(selected, attribute = "craft-tab") {
  return `<nav class="craft-tabs" role="tablist" aria-label="제품 종류">${families.map((type) => `<button type="button" role="tab" data-${attribute}="${type}" aria-selected="${type === selected}" tabindex="${type === selected ? 0 : -1}"><img src="${foodIcon(type)}" alt="">${doughTypes[type].name}</button>`).join("")}</nav>`;
}
export function bindFamilyTabs(root, attribute, choose) {
  if (!root) return;
  const buttons = [...root.querySelectorAll(`[data-${attribute}]`)];
  buttons.forEach((b, index) => {
    b.onclick = () => {
      const type = b.getAttribute("data-" + attribute);
      choose(type);
      root
        .querySelector(`[data-${attribute}="${type}"]`)
        ?.focus({ preventScroll: true });
    };
    b.onkeydown = (e) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
      e.preventDefault();
      e.stopPropagation();
      const next =
        e.key === "Home"
          ? 0
          : e.key === "End"
            ? buttons.length - 1
            : (index + (e.key === "ArrowRight" ? 1 : -1) + buttons.length) %
              buttons.length;
      choose(buttons[next].getAttribute("data-" + attribute));
      root
        .querySelector(
          `[data-${attribute}="${buttons[next].getAttribute("data-" + attribute)}"]`,
        )
        ?.focus();
    };
  });
}
export function ingredients(cost, s) {
  return `<div class="ingredient-chips">${
    Object.entries(cost)
      .map(
        ([id, n]) =>
          `<span class="ingredient-chip ${(s.items[id] || 0) < n ? "insufficient" : ""}">${names[id]} <b>${n}</b><small>보유 ${s.items[id] || 0}</small></span>`,
      )
      .join("") || "<span>추가 재료 없음</span>"
  }</div>`;
}
export function stageRibbon(active) {
  return `<ol class="craft-stages">${["재료 준비", "반죽 치대기", "속재료·토핑", "반죽 보관"].map((text, i) => `<li class="${i === active ? "active" : ""}">${text}</li>`).join("")}</ol>`;
}
