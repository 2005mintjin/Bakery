// Minutes are calendar time; night continues through midnight and dawn clears by 06:00.
const keys = [
  [0, 0.02, 0.58],
  [300, 0.02, 0.58],
  [360, 0, 0],
  [960, 0.12, 0],
  [1050, 0.3, 0.12],
  [1140, 0.02, 0.58],
  [1440, 0.02, 0.58],
];
export function daylight(minutes) {
  const minute = ((minutes % 1440) + 1440) % 1440;
  if (minute >= 360 && minute < 960)
    return { warmth: 0, darkness: 0, phase: "낮" };
  const end = keys.findIndex((k) => k[0] > minute),
    a = keys[end - 1],
    b = keys[end];
  const t = (minute - a[0]) / (b[0] - a[0]);
  return {
    warmth: a[1] + (b[1] - a[1]) * t,
    darkness: a[2] + (b[2] - a[2]) * t,
    phase:
      minute >= 1140 || minute < 300
        ? "밤"
        : minute < 360
          ? "새벽"
          : minute >= 960
            ? "노을"
            : "낮",
  };
}
export function drawDaylight(ctx, minutes) {
  const light = daylight(minutes);
  if (light.warmth) {
    ctx.fillStyle = `rgba(255,178,52,${light.warmth})`;
    ctx.fillRect(0, 0, 960, 576);
  }
  if (light.darkness) {
    ctx.fillStyle = `rgba(15,28,65,${light.darkness})`;
    ctx.fillRect(0, 0, 960, 576);
  }
}
