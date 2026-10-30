import { daylight, drawDaylight } from "./daylight.js";
import { isInterior } from "../interior.js";
export function lampPower(minutes) {
  const m = ((minutes % 1440) + 1440) % 1440;
  return m >= 1140 || m < 300 ? 1 : m < 360 ? (360 - m) / 60 : 0;
}
function polygon(c, points) {
  c.moveTo(...points[0]);
  for (const p of points.slice(1)) c.lineTo(...p);
  c.closePath();
}
export function drawSceneLighting(r, scene, minutes) {
  const c = r.c,
    room = isInterior(scene),
    light = daylight(minutes);
  const config = r.lighting?.[scene] || {},
    windows = config.windows || [];
  c.save();
  if (!room) drawDaylight(c, minutes);
  else {
    if (light.warmth) {
      c.fillStyle = `rgba(255,164,61,${light.warmth})`;
      c.fillRect(0, 0, 960, 576);
    }
    if (light.darkness) {
      c.fillStyle = `rgba(13,24,54,${light.darkness * 0.78})`;
      c.fillRect(0, 0, 960, 576);
      c.fillStyle = `rgba(12,24,65,${Math.min(0.86, light.darkness * 1.45)})`;
      for (const points of windows) {
        c.beginPath();
        polygon(c, points);
        c.fill();
      }
    }
  }
  const power = lampPower(minutes),
    glowPower = power * (room ? 0.7 : 1);
  if (power) {
    // Keep the view through the windows dark while warm lamps illuminate the room.
    if (room && windows.length) {
      c.beginPath();
      c.rect(0, 0, 960, 576);
      for (const points of windows) polygon(c, points);
      c.clip("evenodd");
    }
    c.globalCompositeOperation = "screen";
    for (const [x, y, radius] of config.lamps || []) {
      const glow = c.createRadialGradient(x, y, 2, x, y, radius);
      glow.addColorStop(0, `rgba(255,211,120,${0.63 * glowPower})`);
      glow.addColorStop(0.25, `rgba(255,178,67,${0.28 * glowPower})`);
      glow.addColorStop(1, "rgba(255,150,45,0)");
      c.fillStyle = glow;
      c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      if (!room) {
        c.fillStyle = `rgba(255,238,173,${0.9 * power})`;
        c.fillRect(x - 3, y - 3, 6, 6);
      }
    }
  }
  c.restore();
}
