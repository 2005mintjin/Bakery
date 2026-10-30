import { fishingRules } from "../fishing.js";
export function validateFishingState(s) {
  if (s.fishing == null) {
    s.fishing = null;
    return;
  }
  const f = s.fishing;
  if (
    s.scene !== "pond" ||
    !["waiting", "bite", "caught", "early", "missed"].includes(f.phase) ||
    !Number.isFinite(f.elapsed) ||
    f.elapsed < 0 ||
    f.elapsed > fishingRules.waitMax + fishingRules.biteSeconds ||
    !Number.isFinite(f.waitFor) ||
    f.waitFor < fishingRules.waitMin ||
    f.waitFor > fishingRules.waitMax
  )
    throw Error("손상된 낚시 기록");
}
