export function needsBakeryGuide(s) {
  return s.scene === "bakery" && s.tutorial?.bakeryIntroSeen !== true;
}
export function markBakeryGuideSeen(s) {
  s.tutorial ??= {};
  s.tutorial.bakeryIntroSeen = true;
}
