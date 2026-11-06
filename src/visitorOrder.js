// Stable IDs are shared with save validation; the visitor art and speech stay in JSON.
export const customerPortraits = [
  "mira", "jun", "sora", "post-clerk", "arien", "sasha", "erina",
  "barista", "soma", "crematory", "hendel", "adel", "martin", "charlotte",
  "konstanze", "valeria", "catherine", "mikhail",
];
function shuffled(ids, random) {
  const result = [...ids];
  for (let i = 0; i < result.length - 1; i++) {
    const j = i + Math.floor(random() * (result.length - i));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function nextVisitor(s, customers, random = Math.random, eligible = () => true) {
  const byId = new Map(customers.map((person) => [person.portrait, person]));
  const shop = s.shop;
  shop.visitorQueue = (shop.visitorQueue || []).filter((id) => byId.has(id));
  if (!shop.visitorQueue.length) {
    shop.visitorQueue = shuffled([...byId.keys()], random);
    // Each cycle still contains everybody, without a back-to-back visit at its edge.
    if (shop.visitorQueue.length > 1 && shop.visitorQueue[0] === shop.lastVisitor) {
      const j = 1 + Math.floor(random() * (shop.visitorQueue.length - 1));
      [shop.visitorQueue[0], shop.visitorQueue[j]] = [shop.visitorQueue[j], shop.visitorQueue[0]];
    }
  }
  const fullCycle = shop.visitorQueue.length === byId.size;
  const index = shop.visitorQueue.findIndex((id) => eligible(byId.get(id)) &&
    (!fullCycle || byId.size === 1 || id !== shop.lastVisitor));
  if (index < 0) return null;
  const [id] = shop.visitorQueue.splice(index, 1);
  shop.lastVisitor = id;
  return byId.get(id);
}
