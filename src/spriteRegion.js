// Clip overlapping neighbors in a shared sheet without modifying the source image.
export function drawSpriteRegion(c, image, bounds, clip, x, y, width, height) {
  const [sx, sy, sw, sh] = bounds;
  if (clip) {
    c.save();
    c.beginPath();
    clip.forEach(([px, py], i) => {
      const dx = x + (px * width) / sw,
        dy = y + (py * height) / sh;
      if (i) c.lineTo(dx, dy);
      else c.moveTo(dx, dy);
    });
    c.closePath();
    c.clip();
  }
  c.drawImage(image, sx, sy, sw, sh, x, y, width, height);
  if (clip) c.restore();
}
