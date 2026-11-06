// Frames are composited directly from the original GIF, preserving its timing/anchor.
export function residentFrame(animation, seconds = 0, reducedMotion = false) {
  if (!animation || reducedMotion) return 0;
  const total = animation.durations.reduce((sum, ms) => sum + ms, 0);
  let elapsed = ((Math.max(0, seconds) * 1000) % total);
  for (let i = 0; i < animation.durations.length; i++) {
    if (elapsed < animation.durations[i]) return i;
    elapsed -= animation.durations[i];
  }
  return 0;
}
