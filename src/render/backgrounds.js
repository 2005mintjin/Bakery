import { drawGardenBase } from "../gardenArt.js";
import { drawScenery } from "../scenery.js";
import { isInterior } from "../interior.js";
import { drawInterior } from "../interiorArt.js";
const C = { grass: "#99c865", dark: "#4f8c54", path: "#ead29a" };
// Image backgrounds first; procedural art remains available as a fallback.
export function house(renderer, x, y, w, name, roof) {
  renderer.r(x + 5, y + 125, w, 18, "#648052");
  renderer.r(x, y, w, 130, "#e6d3a4");
  renderer.r(x, y + 106, w, 18, "#ba956c");
  for (let yy = y + 18; yy < y + 104; yy += 12) {
    renderer.r(x + 3, yy, w - 6, 1, "#cfb887");
  }
  renderer.r(x + 6, y + 16, 6, 90, "#f6e6ba");
  renderer.r(x + w - 12, y + 16, 6, 90, "#b89967");
  renderer.r(x - 15, y - 15, w + 30, 28, roof);
  renderer.r(x + w - 54, y - 79, 20, 30, "#a1876a");
  renderer.r(x + w - 57, y - 81, 26, 6, "#d0b18a");
  for (let row = 0; row < 4; row++) {
    renderer.r(
      x - 15 + row * 7,
      y - 65 + row * 13,
      w + 30 - row * 14,
      15,
      roof,
    );
    for (let xx = x + (row % 2) * 13; xx < x + w; xx += 18) {
      renderer.r(xx, y - 61 + row * 13, 14, 2, "#ffffff30");
      renderer.r(xx + 13, y - 59 + row * 13, 2, 9, "#533b3b25");
    }
  }
  for (const xx of [x + 26, x + w - 62]) {
    renderer.r(xx, y + 34, 38, 42, "#816443");
    renderer.r(xx + 4, y + 38, 30, 31, "#9ebeb4");
    renderer.r(xx + 18, y + 38, 3, 32, "#efdfb2");
    renderer.r(xx, y + 77, 42, 7, "#96754e");
    for (let i = 0; i < 4; i++) {
      renderer.r(xx + 4 + i * 9, y + 73, 5, 6, "#b96d78");
    }
  }
  renderer.r(x + w / 2 - 20, y + 66, 40, 64, "#785c43");
  renderer.r(x + w / 2 - 14, y + 72, 28, 29, "#b9c2a0");
  renderer.r(x + w / 2 + 9, y + 108, 4, 4, "#e5c37c");
  renderer.r(x + w / 2 - 48, y + 11, 96, 21, "#f4e8c5");
  renderer.text(name, x + w / 2, y + 26, "#68523c", 12);
}
export function drawBackground(renderer, scene) {
  if (scene === "field") {
    const image = renderer.scenery.get(renderer.maps.field?.asset);
    if (image) drawScenery(renderer.c, image);
    else drawGardenBase(renderer);
    return;
  }
  const sceneImage = renderer.scenery.get(renderer.maps[scene]?.asset);
  if (sceneImage) {
    drawScenery(renderer.c, sceneImage);
    return;
  }
  if (isInterior(scene)) {
    drawInterior(renderer, scene);
    return;
  }
  if (scene === "city") {
    cityBackground(renderer);
    return;
  }
  if (scene === "post") {
    postBackground(renderer);
    return;
  }
  if (scene === "town") {
    renderer.r(0, 0, 960, 576, C.grass);
    let seed = 91;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 1500; i++) {
      const x = rand() * 960,
        y = rand() * 576;
      renderer.r(x, y, 2, 3, i % 3 ? "#b0d77c" : "#83b85b");
    }
    renderer.r(335, 0, 290, 576, C.path);
    renderer.r(0, 275, 960, 125, C.path);
    renderer.r(175, 235, 66, 90, C.path);
    for (let i = 0; i < 350; i++) {
      const x = rand() * 960,
        y = rand() * 576;
      if ((x > 335 && x < 625) || (y > 275 && y < 400))
        renderer.r(x, y, 5, 2, "#c5b68c");
    }
    house(renderer, 80, 130, 250, "작은 화덕", "#a4664f");
    house(renderer, 655, 130, 225, "달빛 우체국", "#7eabc1");
    renderer.r(435, 278, 90, 67, "#9d9e86");
    renderer.r(443, 285, 74, 45, "#7da5a0");
    renderer.r(449, 288, 62, 31, "#9ec3b2");
    renderer.r(471, 262, 18, 40, "#d7d2b2");
    renderer.r(458, 259, 44, 10, "#e4dec3");
    renderer.r(476, 272, 7, 15, "#a7d9ca");
    renderer.text("달빛마을", 480, 90, "#6e7755", 16);
    gardenDetails(renderer);
    for (const [x, y] of [
      [30, 115],
      [380, 135],
      [600, 130],
      [925, 140],
      [35, 490],
      [305, 515],
      [650, 530],
      [930, 550],
    ])
      renderer.tree(x, y);
    for (const [x, y] of [
      [70, 380],
      [790, 435],
    ]) {
      renderer.r(x, y, 95, 13, "#98774e");
      renderer.r(x, y + 18, 95, 9, "#b28a59");
      renderer.r(x + 8, y + 27, 7, 13, "#715c43");
      renderer.r(x + 80, y + 27, 7, 13, "#715c43");
    }
    for (let i = 0; i < 7; i++) {
      renderer.r(820 + i * 11, 310 + (i % 2) * 10, 20, 22, "#567c4e");
      renderer.r(825 + i * 11, 313 + (i % 2) * 10, 4, 4, "#bc6680");
    }
    for (let i = 0; i < 34; i++) {
      const x = 40 + rand() * 880,
        y = 420 + rand() * 140;
      renderer.r(x, y, 2, 7, "#64824a");
      renderer.r(x - 2, y - 2, 6, 4, i % 2 ? "#e8dba1" : "#d09b9b");
    }
  } else {
    renderer.r(0, 0, 960, 576, "#b38c60");
    for (let y = 0; y < 576; y += 32) {
      renderer.r(0, y, 960, 2, "#93704d");
      for (let x = y % 64 ? 0 : 48; x < 960; x += 96)
        renderer.r(x, y, 2, 32, "#a17a53");
    }
    renderer.r(0, 0, 960, 65, "#e2c99e");
    renderer.r(0, 60, 960, 10, "#886748");
    renderer.r(0, 0, 25, 576, "#765d43");
    renderer.r(935, 0, 25, 576, "#765d43");
    renderer.r(0, 555, 420, 21, "#765d43");
    renderer.r(540, 555, 420, 21, "#765d43");
    renderer.r(420, 530, 120, 46, "#d8bf91");
    renderer.text("광장으로 ↓", 480, 551, "#775d43");
    renderer.r(75, 70, 170, 105, "#84796b");
    renderer.r(88, 88, 145, 74, "#c0aa85");
    renderer.r(118, 104, 85, 58, "#493e32");
    renderer.r(130, 132, 15, 24, "#e39247");
    renderer.r(153, 123, 20, 33, "#f1c46e");
    renderer.r(179, 136, 12, 20, "#de733b");
    renderer.r(350, 75, 240, 100, "#956a47");
    renderer.r(356, 81, 228, 63, "#b9ccc0");
    for (let i = 0; i < 6; i++) {
      renderer.r(370 + i * 34, 115, 25, 16, "#daaa60");
      renderer.r(376 + i * 34, 113, 4, 10, "#f6d596");
    }
    renderer.text("오늘의 빵", 470, 162);
    renderer.r(700, 80, 160, 95, "#a58355");
    renderer.r(712, 94, 60, 55, "#ebd7a2");
    renderer.text("밀", 741, 127, "#8e7450", 20);
    renderer.r(790, 105, 42, 45, "#c79c54");
    renderer.text("꿀", 811, 134, "#765537");
    renderer.r(95, 310, 200, 80, "#8e6545");
    renderer.r(90, 305, 210, 12, "#c99e67");
    renderer.r(670, 305, 170, 90, "#a68157");
    renderer.r(680, 315, 150, 65, "#d4b780");
    renderer.text("빵 창고", 755, 360, "#715434", 15);
    renderer.text("영업 안내판", 195, 347, "#fff1c5", 14);
    renderer.text("작은 화덕 · 편히 쉬어가세요", 475, 42, "#745a41", 18);
    renderer.r(370, 350, 220, 115, "#b98772");
    for (let i = 0; i < 8; i++)
      renderer.r(376 + i * 27, 357, 14, 100, "#c69b80");
  }
}
export function gardenDetails(renderer) {
  renderer.r(23, 520, 180, 7, "#f2dfad");
  for (let x = 25; x < 205; x += 18) {
    renderer.r(x, 506, 7, 35, "#b28b52");
    renderer.r(x + 1, 506, 4, 30, "#f2dfad");
  }
  for (let i = 0; i < 42; i++) {
    let x = 45 + ((i * 67) % 860),
      y = 440 + ((i * 29) % 125);
    renderer.r(x, y, 2, 9, "#5c9b50");
    renderer.r(
      x - 3,
      y - 3,
      8,
      6,
      ["#fff1ae", "#f5a6b2", "#c2aff1", "#fff4d5"][i % 4],
    );
    renderer.r(x, y - 1, 2, 2, "#efc962");
  }
  renderer.r(760, 253, 16, 23, "#527b87");
  renderer.r(757, 250, 22, 8, "#7ca8b4");
  renderer.text("✉", 768, 267, "#fff3c6", 12);
  renderer.r(888, 363, 60, 22, "#9a7247");
  renderer.text("소도시 →", 918, 378, "#fff3d3", 10);
  for (const x of [350, 605]) {
    renderer.r(x, 399, 5, 56, "#796546");
    renderer.r(x - 5, 390, 15, 17, "#fff0ab");
    renderer.r(x - 8, 387, 21, 4, "#6b7757");
  }
  // Fine roof, wall and paving details keep the expanded palette readable.
  for (let x = 90; x < 325; x += 18) {
    renderer.r(x, 236, 10, 2, "#d2b88a");
    renderer.r(x, 247, 10, 2, "#d2b88a");
  }
  for (let y = 410; y < 560; y += 20)
    for (let x = 355; x < 615; x += 27) {
      renderer.r(x + (y % 40 ? 10 : 0), y, 19, 12, "#e2c897");
      renderer.r(x + 2 + (y % 40 ? 10 : 0), y + 2, 15, 2, "#f5dfae");
    }
}
export function cityBackground(renderer) {
  renderer.r(0, 0, 960, 576, "#a5cf78");
  renderer.r(0, 275, 960, 125, "#ecd6a3");
  renderer.r(345, 0, 260, 576, "#ecd6a3");
  for (let y = 282; y < 395; y += 20)
    for (let x = 5; x < 960; x += 30) {
      renderer.r(x + (y % 40 ? 12 : 0), y, 23, 14, "#dfc48f");
      renderer.r(x + 2 + (y % 40 ? 12 : 0), y + 2, 19, 2, "#f7e2b6");
    }
  for (const b of renderer.city.buildings)
    house(renderer, b.x, b.y, b.w, b.name, b.roof);
  for (const [x, y] of [
    [30, 170],
    [320, 120],
    [620, 130],
    [930, 155],
    [42, 500],
    [570, 535],
  ])
    renderer.tree(x, y);
  renderer.text("← 달빛마을", 70, 350, "#74684f", 13);
  renderer.text("해봄 소도시", 480, 45, "#4e7953", 18);
  for (let i = 0; i < 22; i++) {
    const x = 30 + ((i * 71) % 900),
      y = 420 + ((i * 31) % 140);
    renderer.r(x, y, 4, 6, "#e6a4b0");
  }
}
export function postBackground(renderer) {
  renderer.r(0, 0, 960, 576, "#c9ae82");
  for (let y = 70; y < 576; y += 28) {
    renderer.r(0, y, 960, 2, "#b69b75");
    for (let x = 0; x < 960; x += 70)
      renderer.r(x + (y % 56 ? 30 : 0), y, 2, 28, "#bda17a");
  }
  renderer.r(0, 0, 960, 66, "#d8e7d6");
  renderer.r(0, 60, 960, 10, "#7e9d8a");
  renderer.text("달빛 우체국 · 마음을 전합니다", 480, 40, "#527563", 20);
  renderer.r(0, 0, 25, 576, "#79947b");
  renderer.r(935, 0, 25, 576, "#79947b");
  renderer.r(0, 555, 420, 21, "#79947b");
  renderer.r(540, 555, 420, 21, "#79947b");
  renderer.text("광장으로 ↓", 480, 550, "#6e795c");
  renderer.r(110, 80, 300, 110, "#8b967c");
  for (let y = 90; y < 180; y += 26)
    for (let x = 120; x < 400; x += 40) {
      renderer.r(x, y, 33, 20, "#e6cf9d");
      renderer.r(x + 12, y + 9, 8, 2, "#8d795b");
    }
  renderer.r(580, 90, 260, 100, "#b08756");
  for (let i = 0; i < 5; i++) {
    renderer.r(595 + i * 46, 105, 38, 44, "#dcb77a");
    renderer.r(611 + i * 46, 105, 5, 44, "#f5dfa7");
  }
  renderer.text("소포 수령 창구", 710, 180, "#fff0cc", 15);
  renderer.r(160, 310, 200, 100, "#a5825c");
  renderer.r(170, 320, 180, 75, "#ecd9aa");
  renderer.text("마을 소식", 260, 350, "#796248", 16);
}
