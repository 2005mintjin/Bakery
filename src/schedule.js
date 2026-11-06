// Static schedules are configured from JSON; all live time remains in game.state.
let config = { facilities: {}, residents: [] };
export const weekday = (s) => (Math.floor(s.day) - 1) % 7;
export const weekdayName = (s) => ["월", "화", "수", "목", "금", "토", "일"][weekday(s)];
export function configureSchedule(data) { config = data; }
export function facilityOpen(s, scene) {
  const hours = config.facilities[scene];
  return !hours || (weekday(s) !== 6 && s.minutes >= hours.open && s.minutes < hours.close);
}
export function closedMessage(s, scene) {
  const h = config.facilities[scene];
  if (!h) return "지금은 이용할 수 없어요.";
  return weekday(s) === 6
    ? `${h.name}은 일요일 휴무예요. 직원들은 마을에서 쉬고 있어요.`
    : `${h.name} 영업시간은 ${String(h.open / 60).padStart(2,"0")}:00~${h.close / 60}:00예요. 직원들은 퇴근했어요.`;
}
export function scheduledFacility(scene) { return !!config.facilities[scene]; }
export function canVisitBakery(s, person) {
  return !person.workplace || !config.facilities[person.workplace] || !facilityOpen(s, person.workplace);
}
export function buildOffDutyActors(data) {
  return (data.staffSchedule?.residents || []).map((entry) => {
    const source = data.customers.find((c) => c.portrait === entry.portrait) || data.civicActors[entry.portrait];
    const actor = { ...source, ...entry, spriteHeight: 74, offDuty: true };
    if (source.dialogueUsesSprite) {
      actor.portraitAsset = source.spriteAsset;
      actor.portraitBounds = source.spriteBounds;
      actor.portraitClip = source.spriteClip;
    }
    return actor;
  });
}
export function offDutyResidents(g) {
  return (g.data.offDutyActors || []).filter((npc) =>
    npc.scene === g.state.scene && !facilityOpen(g.state, npc.workplace) &&
    g.state.shop?.customer?.portrait !== npc.portrait);
}
