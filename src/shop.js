import { productIds } from "./recipeBook.js";
import { spend } from "./inventory.js";
import { availableProducts } from "./equipment.js";
export const breadIds = productIds;
export function ensureShop(s) {
  s.warehouse ??= { loaf: 0, honeybread: 0, berrybread: 0 };
  s.shop ??= { open: false, elapsed: 0, customer: null, sequence: 0 };
  s.parcels ??= [];
  s.parcelDay ??= 0;
  return s;
}
export function storeBread(s, id) {
  ensureShop(s);
  if (!breadIds.includes(id) || !spend(s, { [id]: 1 })) return false;
  s.warehouse[id] = (s.warehouse[id] || 0) + 1;
  return true;
}
export function takeBread(s, id) {
  ensureShop(s);
  if (!breadIds.includes(id) || !(s.warehouse[id] > 0)) return false;
  s.warehouse[id]--;
  s.items[id] = (s.items[id] || 0) + 1;
  return true;
}
export function chooseOrder(
  person,
  random = Math.random,
  available = breadIds,
) {
  if (!available.length) return null;
  const weights = available.map((id) => person.preferences?.[id] || 1),
    total = weights.reduce((a, b) => a + b, 0);
  let choice = Math.max(0, Math.min(0.999999, random())) * total;
  for (let i = 0; i < available.length; i++) {
    choice -= weights[i];
    if (choice < 0) return available[i];
  }
  return available.at(-1);
}
export function tickShop(s, dt, customers = [], random = Math.random) {
  ensureShop(s);
  if (!s.shop.open) return false;
  if (s.shop.customer) {
    const c = s.shop.customer;
    if (c.phase === "knocking") {
      c.arrival = Math.min(1.2, c.arrival + dt);
      if (c.arrival >= 1.2) c.phase = "waiting";
    }
    return false;
  }
  const menu = saleProducts(s);
  if (!menu.length) return false;
  s.shop.elapsed += dt;
  if (s.shop.elapsed < 12) return false;
  s.shop.elapsed = 0;
  const i = s.shop.sequence++,
    person = customers[i % Math.max(1, customers.length)] || {
      name: ["미라", "이시도로", "마리아"][i % 3],
      portrait: ["mira", "jun", "sora"][i % 3],
    };
  s.shop.customer = {
    name: person.name,
    portrait: person.portrait,
    bread: chooseOrder(person, random, menu),
    quantity: 1 + Math.min(2, Math.floor(Math.max(0, random()) * 3)),
    phase: "knocking",
    arrival: 0,
  };
  return true;
}
export function serve(s, recipes) {
  const c = s.shop?.customer;
  const quantity = c?.quantity ?? 1;
  if (
    !c ||
    c.phase !== "waiting" ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 3 ||
    !(s.display[c.bread] >= quantity)
  )
    return false;
  const recipe = recipes.find((r) => r.id === c.bread);
  if (!recipe) return false;
  s.display[c.bread] -= quantity;
  s.money += recipe.price * quantity;
  s.revenue += recipe.price * quantity;
  s.shop.customer = null;
  return true;
}
export function receiveParcel(s) {
  ensureShop(s);
  if (s.parcelDay === s.day) return false;
  s.parcelDay = s.day;
  s.items.flour += 4;
  s.items.honey += 1;
  s.parcels.push({ day: s.day, label: "마을 조합의 작은 선물" });
  return true;
}

export function saleProducts(s) {
  const available = availableProducts(s);
  return (s.shop.menu || available).filter((id) => available.includes(id));
}
export function setSaleMenu(s, ids) {
  if (
    !Array.isArray(ids) ||
    !ids.length ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !availableProducts(s).includes(id))
  )
    return false;
  s.shop.menu = [...ids];
  return true;
}
