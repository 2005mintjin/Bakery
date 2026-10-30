export const counterLayout = {
  frontY: 490,
  customer: { x: 288, y: 230, width: 384 },
  sdCustomer: { centerX: 480, y: 230, height: 300 },
};
export async function loadCounterArt(actors = []) {
  const images = new Map();
  const unique = new Map([
    ["mira", { id: "mira" }],
    ["jun", { id: "jun" }],
    ["sora", { id: "sora" }],
    ...actors.map((a) => [a.id || a.portrait, a]),
  ]);
  await Promise.all(
    [...unique].map(
      ([id, actor]) =>
        new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => {
            image.sdBounds = actor.spriteAsset
              ? actor.spriteBounds || [0, 0, image.width, image.height]
              : null;
            images.set(id, image);
            resolve();
          };
          image.onerror = reject;
          image.src = actor.spriteAsset || `assets/characters/${id}.svg`;
        }),
    ),
  );
  return images;
}
export function drawCounter(r, s) {
  if (s.shop.customer?.phase !== "waiting") return;
  const img = r.counterArt?.get(s.shop.customer.portrait);
  if (!img) return;
  if (img.sdBounds) {
    const [sx, sy, sw, sh] = img.sdBounds,
      p = counterLayout.sdCustomer,
      w = (p.height * sw) / sh;
    r.c.drawImage(img, sx, sy, sw, sh, p.centerX - w / 2, p.y, w, p.height);
  } else {
    const p = counterLayout.customer;
    r.c.drawImage(
      img,
      0,
      img.height * 0.14,
      img.width,
      img.height * 0.62,
      p.x,
      p.y,
      p.width,
      (p.width * img.height * 0.62) / img.width,
    );
  }
  r.c.save();
  r.c.beginPath();
  r.c.rect(0, counterLayout.frontY, 960, 576 - counterLayout.frontY);
  r.c.clip();
  r.c.drawImage(r.bg.bakery, 0, 0, 960, 576);
  r.c.restore();
}
