// Shared logical-coordinate primitives for sprites, overlays and fallback art.
export class PixelPainter {
  r(x, y, w, h, color) {
    this.c.fillStyle = color;
    this.c.fillRect(Math.round(x), Math.round(y), w, h);
  }
  text(t, x, y, color = "#fff4d4", size = 12) {
    this.c.fillStyle = color;
    this.c.font = `${size}px sans-serif`;
    this.c.textAlign = "center";
    this.c.fillText(t, x, y);
  }
  oval(x, y, w, h, color) {
    for (let yy = 0; yy < h; yy += 4) {
      const half =
        (Math.sqrt(Math.max(0, 1 - ((yy - h / 2) / (h / 2)) ** 2)) * w) / 2;
      this.r(
        x + w / 2 - Math.floor(half / 4) * 4,
        y + yy,
        Math.floor(half / 4) * 8,
        4,
        color,
      );
    }
  }
  tree(x, y) {
    this.oval(x - 35, y + 26, 76, 18, "#598f4c55");
    this.r(x - 8, y - 12, 16, 54, "#795936");
    this.r(x - 5, y - 7, 5, 45, "#a17b43");
    this.r(x - 15, y + 33, 12, 8, "#795936");
    this.r(x + 5, y + 34, 13, 7, "#795936");
    this.oval(x - 42, y - 54, 84, 65, "#397548");
    this.oval(x - 37, y - 65, 72, 65, "#4c9550");
    this.oval(x - 29, y - 70, 60, 55, "#6bb255");
    this.oval(x - 21, y - 66, 42, 34, "#8cc864");
    for (let i = 0; i < 65; i++) {
      const xx = ((i * 37) % 77) - 38,
        yy = ((i * 23) % 67) - 64;
      if ((xx * xx) / 1450 + ((yy + 28) * (yy + 28)) / 1000 < 1)
        this.r(
          x + xx,
          y + yy,
          4 + (i % 3) * 2,
          3,
          ["#92cf6b", "#74b75c", "#4a8a49", "#559d50"][i % 4],
        );
    }
    this.r(x + 5, y + 6, 12, 4, "#465f35");
  }
}
