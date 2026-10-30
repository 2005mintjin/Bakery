import { doughTypes, productIds } from "../recipeBook.js";
import { freshEquipment, availableProducts } from "../equipment.js";
export function validateProgression(s) {
  if (s.version < 8) {
    s.equipment = freshEquipment();
    for (const [type, key] of [
      ["pie", "pieMold"],
      ["cookie", "cookieMold"],
    ]) {
      const ids = Object.values(doughTypes[type].finishes).map((f) => f.id);
      s.equipment[key] =
        s.baking?.type === type ||
        ids.some((id) =>
          [s.items, s.warehouse, s.display, s.doughs, s.oven?.batch].some(
            (record) => (record?.[id] || 0) > 0,
          ),
        );
    }
    if (s.oven) s.oven.duration = 60;
    if (s.shop) s.shop.menu = availableProducts(s);
  } else {
    const e = s.equipment;
    if (
      !e ||
      typeof e.pieMold !== "boolean" ||
      typeof e.cookieMold !== "boolean" ||
      !["capacityLevel", "speedLevel"].every(
        (k) => Number.isInteger(e[k]) && e[k] >= 0 && e[k] <= 2,
      )
    )
      throw Error("손상된 공방 장비");
    const menu = s.shop?.menu;
    if (
      !Array.isArray(menu) ||
      menu.length < 1 ||
      menu.length > productIds.length ||
      new Set(menu).size !== menu.length ||
      menu.some((id) => !availableProducts(s).includes(id))
    )
      throw Error("손상된 판매 메뉴");
  }
}
