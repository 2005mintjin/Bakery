export function drawCharacter(renderer, x, y, color, walking, t) {
  const bob = walking ? Math.sin(t * 12) * 2 : 0;
  y += bob;
  renderer.r(x - 11, y + 1, 24, 6, "#334d4533");
  renderer.r(
    x - 8,
    y - 10,
    7,
    14 + (walking ? Math.sin(t * 12) * 3 : 0),
    "#4a5147",
  );
  renderer.r(
    x + 2,
    y - 10,
    7,
    14 - (walking ? Math.sin(t * 12) * 3 : 0),
    "#4a5147",
  );
  renderer.r(x - 12, y - 32, 24, 24, color);
  renderer.r(x - 15, y - 27, 5, 16, "#e5bd95");
  renderer.r(x + 11, y - 27, 5, 16, "#e5bd95");
  renderer.r(x - 10, y - 49, 20, 21, "#eac6a1");
  renderer.r(x - 12, y - 51, 24, 9, "#5d4c3d");
  renderer.r(x - 12, y - 45, 5, 11, "#5d4c3d");
  renderer.r(x - 5, y - 39, 3, 3, "#3e4540");
  renderer.r(x + 4, y - 39, 3, 3, "#3e4540");
  renderer.r(x - 8, y - 20, 16, 10, "#f3e3bb");
}
