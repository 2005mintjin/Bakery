import { clinicState } from "./clinicQuests.js";
import { offDutyResidents } from "./schedule.js";
import { anastasiaStatus } from "./anastasiaQuests.js";
export function residentQuestStatus(s, npc) {
  if (npc.story === "mikhail")
    return clinicState(s).gift === "wrapped" ? "active" : "done";
  return npc.id === "mira" ? anastasiaStatus(s) : s.quests[npc.quest];
}
export function residents(g) {
  const base = g.state.scene === "town"
    ? g.data.npcs
    : g.state.scene === "city"
      ? g.data.city.residents
      : g.data.downtown?.[g.state.scene]?.residents || [];
  return [...base, ...offDutyResidents(g)];
}
export function nearby(s, npcs) {
  return npcs.find((n) => Math.hypot(s.x - n.x, s.y - n.y) < 64);
}
