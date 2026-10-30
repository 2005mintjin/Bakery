import { advanceClock } from "./wellbeing.js";
export const fishingRules = {
  x: 574,
  y: 318,
  radius: 75,
  stamina: 3,
  minutes: 8,
  waitMin: 2,
  waitMax: 4,
  biteSeconds: 2.5,
};
export function nearFishingSpot(s) {
  return (
    s.scene === "pond" &&
    Math.hypot(s.x - fishingRules.x, s.y - fishingRules.y) < fishingRules.radius
  );
}
export function castLine(s, random = Math.random) {
  if (!nearFishingSpot(s)) return "location";
  if (["waiting", "bite"].includes(s.fishing?.phase)) return "busy";
  if (s.stamina < fishingRules.stamina) return "tired";
  const roll = random();
  if (!Number.isFinite(roll) || roll < 0 || roll > 1) return "invalid";
  s.stamina -= fishingRules.stamina;
  advanceClock(s, fishingRules.minutes);
  s.fishing = {
    phase: "waiting",
    elapsed: 0,
    waitFor:
      fishingRules.waitMin +
      roll * (fishingRules.waitMax - fishingRules.waitMin),
  };
  return "cast";
}
export function tickFishing(s, seconds) {
  const f = s.fishing;
  if (
    !f ||
    !["waiting", "bite"].includes(f.phase) ||
    !Number.isFinite(seconds) ||
    seconds <= 0
  )
    return false;
  f.elapsed += seconds;
  if (f.phase === "waiting" && f.elapsed >= f.waitFor) {
    f.phase = "bite";
    f.elapsed = 0;
    return true;
  }
  if (f.phase === "bite" && f.elapsed >= fishingRules.biteSeconds) {
    f.phase = "missed";
    f.elapsed = 0;
    return true;
  }
  return false;
}
export function reelLine(s) {
  if (!s.fishing || !nearFishingSpot(s)) return false;
  if (s.fishing.phase === "waiting") {
    s.fishing.phase = "early";
    return false;
  }
  if (s.fishing.phase !== "bite") return false;
  s.fishing.phase = "caught";
  s.items.fish = (s.items.fish || 0) + 1;
  return true;
}
export function cancelFishing(s) {
  s.fishing = null;
}
