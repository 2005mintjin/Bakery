export function spriteFrame(
  atlas,
  width,
  height,
  walking,
  t,
  direction = "down",
) {
  const row = walking ? atlas.walk : atlas.idle,
    scaleX = width / atlas.referenceSize[0],
    scaleY = height / atlas.referenceSize[1];
  const col = walking
    ? Math.floor(t * row.fps) % row.columns
    : (row.directions[direction] ?? row.directions.down);
  return {
    x: (col * width) / row.columns,
    y: row.y * scaleY,
    w: width / row.columns,
    h: row.height * scaleY,
    flip: walking && direction === "left",
  };
}
// New bundled assets use explicit frames, so irregular source spacing cannot bleed.
export function animationFrame(config, walking, time, direction = "down") {
  const group = walking ? config.walk : config.idle;
  const frames = group.frames[direction] || group.frames.down;
  const index = walking
    ? Math.floor(Math.max(0, time) * group.fps) % frames.length
    : 0;
  return { ...frames[index], asset: group.asset, scale: group.scale, index };
}
export function spriteDrawRect(frame, x, y) {
  const base = (70 / 205) * (frame.scale ?? 1),
    sx = base * (frame.scaleX ?? 1),
    sy = base * (frame.scaleY ?? 1);
  return {
    x: Math.round(x - frame.anchorX * sx),
    y: Math.round(y - frame.anchorY * sy + 3),
    w: frame.w * sx,
    h: frame.h * sy,
  };
}
function imageFrom(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(Error("이미지 로딩 실패"));
    image.src = src;
  });
}
export class PlayerSprite {
  constructor(atlas, animations) {
    this.atlas = atlas;
    this.animations = animations;
    this.images = new Map();
    this.startTime = 0;
    this.lastAction = null;
    this.lastDirection = null;
    this.loading = this.loadDefault();
  }
  async loadDefault() {
    await Promise.all(
      [this.animations.idle.asset, this.animations.walk.asset].map(
        async (asset) => {
          this.images.set(asset, await imageFrom(asset));
        },
      ),
    );
  }
  draw(c, x, y, walking, t, direction = "down") {
    if (this.lastAction !== walking || this.lastDirection !== direction) {
      this.startTime = t;
      this.lastAction = walking;
      this.lastDirection = direction;
    }
    const elapsed = t - this.startTime;
    const f = animationFrame(this.animations, walking, elapsed, direction),
      image = this.images.get(f.asset);
    if (!image) return false;
    const rect = spriteDrawRect(f, x, y);
    c.save();
    if (f.flip) {
      c.translate(2 * x, 0);
      c.scale(-1, 1);
    }
    c.drawImage(image, f.x, f.y, f.w, f.h, rect.x, rect.y, rect.w, rect.h);
    c.restore();
    return true;
  }
}
