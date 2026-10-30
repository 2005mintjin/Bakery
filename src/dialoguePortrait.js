import { drawSpriteRegion } from "./spriteRegion.js";
// Optional source bounds let a customer reuse exactly the SD shown at the counter.
export function drawDialoguePortrait(root, asset, bounds, clip) {
  if (!bounds) return;
  const canvas = root.querySelector(".dialogue-sprite");
  if (!canvas) return;
  const [x, y, w, h] = bounds;
  canvas.width = w;
  canvas.height = h;
  const image = new Image();
  image.onload = () => {
    if (!canvas.isConnected) return;
    const c = canvas.getContext("2d");
    c.clearRect(0, 0, w, h);
    drawSpriteRegion(c, image, bounds, clip, 0, 0, w, h);
    canvas.dataset.ready = "true";
  };
  image.onerror = () => {
    if (canvas.isConnected) {
      canvas.dataset.ready = "error";
      canvas.setAttribute("aria-label", "캐릭터 이미지를 불러오지 못했어요");
    }
  };
  image.src = asset;
}
