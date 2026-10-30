// SD sprites use the original PNG alpha bounds and a shared foot anchor.
export async function loadResidentArt(npcs) {
  const art = new Map();
  await Promise.all(
    npcs
      .filter((n) => n.spriteAsset)
      .map(
        (n) =>
          new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
              art.set(n.id, image);
              resolve();
            };
            image.onerror = () =>
              reject(Error("주민 이미지를 읽지 못했습니다: " + n.spriteAsset));
            image.src = n.spriteAsset;
          }),
      ),
  );
  return art;
}
export function drawResident(r, npc) {
  const image = r.residentArt?.get(npc.id);
  if (!image) return false;
  const [sx, sy, sw, sh] = npc.spriteBounds || [
    0,
    0,
    image.width,
    image.height,
  ];
  const h = npc.spriteHeight || 64,
    w = (h * sw) / sh;
  r.oval(npc.x - 15, npc.y - 3, 30, 8, "#334d4533");
  r.c.drawImage(image, sx, sy, sw, sh, npc.x - w / 2, npc.y - h, w, h);
  return true;
}
