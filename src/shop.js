import { spend } from "./inventory.js";
export const breadIds = ["loaf", "honeybread", "berrybread"];
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
  s.warehouse[id]++;
  return true;
}
export function takeBread(s, id) {
  ensureShop(s);
  if (!breadIds.includes(id) || !(s.warehouse[id] > 0)) return false;
  s.warehouse[id]--;
  s.items[id] = (s.items[id] || 0) + 1;
  return true;
}
export function tickShop(s, dt, customers = []) {
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
  s.shop.elapsed += dt;
  if (s.shop.elapsed < 12) return false;
  s.shop.elapsed = 0;
  const i = s.shop.sequence++,
    person = customers[i % Math.max(1, customers.length)] || {
      name: ["미라", "준", "소라"][i % 3],
      portrait: ["mira", "jun", "sora"][i % 3],
    };
  s.shop.customer = {
    name: person.name,
    portrait: person.portrait,
    bread: breadIds[i % 3],
    phase: "knocking",
    arrival: 0,
  };
  return true;
}
export function serve(s, recipes) {
  const c = s.shop?.customer;
  if (!c || c.phase !== "waiting" || !(s.display[c.bread] > 0)) return false;
  const recipe = recipes.find((r) => r.id === c.bread);
  if (!recipe) return false;
  s.display[c.bread]--;
  s.money += recipe.price;
  s.revenue += recipe.price;
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
