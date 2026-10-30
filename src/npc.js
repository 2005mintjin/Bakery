export function residents(g) {
  return g.state.scene === "town"
    ? g.data.npcs
    : g.state.scene === "city"
      ? g.data.city.residents
      : [];
}
export function nearby(s, npcs) {
  return npcs.find((n) => Math.hypot(s.x - n.x, s.y - n.y) < 64);
}
