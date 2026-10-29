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
    this.custom = null;
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
    try {
      if (localStorage.getItem("hearth-custom-sheet-enabled-v2") === "yes")
        await this.trySaved();
    } catch {}
  }
  async trySaved() {
    const r = await fetch("/api/player-sheet");
    if (r.ok && r.headers.get("Content-Type")?.startsWith("image/")) {
      const url = URL.createObjectURL(await r.blob());
      try {
        await this.setSheet(url);
      } finally {
        URL.revokeObjectURL(url);
      }
    }
  }
  async setSheet(src) {
    const image = await imageFrom(src);
    if (image.width < 450 || image.height < 300) throw Error("작은 이미지");
    this.custom = image;
  }
  useDefault() {
    this.custom = null;
    try {
      localStorage.removeItem("hearth-custom-sheet-enabled-v2");
    } catch {}
  }
  pick(ui) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png";
    input.onchange = async () => {
      const f = input.files[0];
      if (!f) return;
      if (f.size > 8 * 1024 * 1024) {
        ui.notify("8MB 이하 PNG를 선택하세요");
        return;
      }
      try {
        const data = await new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result);
          r.onerror = reject;
          r.readAsDataURL(f);
        });
        await this.setSheet(data);
        const r = await fetch("/api/player-sheet", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        });
        if (!r.ok) throw Error("서버 저장 실패");
        try {
          localStorage.setItem("hearth-custom-sheet-enabled-v2", "yes");
        } catch {}
        ui.notify(
          "사용자 지정 시트를 저장했어요. 기본 캐릭터로 복원할 수도 있어요.",
        );
      } catch {
        ui.notify("이미지 읽기 또는 파일 저장에 실패했어요.");
      }
    };
    input.click();
  }
  draw(c, x, y, walking, t, direction = "down") {
    if (this.lastAction !== walking || this.lastDirection !== direction) {
      this.startTime = t;
      this.lastAction = walking;
      this.lastDirection = direction;
    }
    const elapsed = t - this.startTime;
    if (this.custom) {
      const f = spriteFrame(
        this.atlas,
        this.custom.width,
        this.custom.height,
        walking,
        elapsed,
        direction,
      );
      c.save();
      c.translate(Math.round(x), Math.round(y));
      if (f.flip) c.scale(-1, 1);
      const h = 70,
        w = (h * f.w) / f.h;
      c.drawImage(this.custom, f.x, f.y, f.w, f.h, -w / 2, -h + 3, w, h);
      c.restore();
      return true;
    }
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
