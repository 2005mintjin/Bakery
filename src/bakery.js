import { productIds } from "./recipeBook.js";
import { spend } from "./inventory.js";
export function display(s, id, quantity = 1) {
  if (
    !productIds.includes(id) ||
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    !spend(s, { [id]: quantity })
  )
    return false;
  s.display[id] = (s.display[id] || 0) + quantity;
  return true;
}
export function sell(s, recipes) {
  let total = 0;
  for (const r of recipes) {
    total += (s.display[r.id] || 0) * r.price;
    s.display[r.id] = 0;
  }
  s.money += total;
  s.revenue += total;
  return total;
}
export function buyItem(s, item) {
  if (!item || s.money < item.price) return false;
  s.money -= item.price;
  s.items[item.id] = (s.items[item.id] || 0) + item.quantity;
  return true;
}

export function undisplay(s, id, quantity = 1) {
  if (
    !productIds.includes(id) ||
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    !(s.display[id] >= quantity)
  )
    return false;
  s.display[id] -= quantity;
  s.items[id] = (s.items[id] || 0) + quantity;
  return true;
}
