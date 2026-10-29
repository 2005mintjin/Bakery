import { drawRoom } from "./roomArt.js";
// Frontal first-person interiors. Coordinates stay in the same logical canvas as outdoors.
export function drawInterior(r, scene) {
  if (scene !== "post") {
    drawRoom(r, scene);
    return;
  }
  const c = r.c,
    post = scene === "post";
  const polygon = (points, color) => {
    c.fillStyle = color;
    c.beginPath();
    points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
    c.fill();
  };
  r.r(0, 0, 960, 576, post ? "#d8d9b9" : "#ead3a3");
  r.r(150, 65, 660, 300, post ? "#e8e5c8" : "#f4dfb3");
  polygon(
    [
      [0, 0],
      [150, 65],
      [150, 365],
      [0, 576],
    ],
    post ? "#9aaf9a" : "#c49c70",
  );
  polygon(
    [
      [960, 0],
      [810, 65],
      [810, 365],
      [960, 576],
    ],
    post ? "#a9bba3" : "#d1af81",
  );
  polygon(
    [
      [0, 0],
      [960, 0],
      [810, 65],
      [150, 65],
    ],
    "#80654b",
  );
  polygon(
    [
      [0, 576],
      [150, 365],
      [810, 365],
      [960, 576],
    ],
    "#b3885e",
  );
  for (let y = 390; y < 576; y += 34) r.r(0, y, 960, 2, "#92704f");
  for (const x of [0, 150, 300, 480, 660, 810, 960]) {
    polygon(
      [
        [480 + (x - 480) * 0.68, 365],
        [x, 576],
        [x + 2, 576],
        [482 + (x - 480) * 0.68, 365],
      ],
      "#987650",
    );
  }
  r.r(145, 57, 670, 13, "#735b43");
  r.r(145, 350, 670, 15, "#96764e");
  r.r(464, 63, 5, 42, "#795f40");
  r.r(438, 102, 58, 11, "#8b794b");
  r.r(447, 113, 40, 25, "#fff2b8");
  r.r(454, 117, 25, 17, "#fff8dc");
  // Landscape seen through the front window.
  r.r(355, 155, 190, 125, "#927a51");
  r.r(363, 163, 174, 108, "#b8dfdd");
  r.r(363, 223, 174, 48, "#8bbc70");
  r.r(447, 163, 7, 108, "#f5e4b8");
  r.r(363, 213, 174, 6, "#f5e4b8");
  r.r(346, 276, 208, 12, "#a88051");
  r.text(post ? "달빛 우체국" : "작은 화덕", 450, 92, "#f9eacb", 22);
  if (!post) {
    // Brick oven with warm fire, seen at eye level.
    r.r(65, 193, 220, 210, "#a87855");
    for (let y = 202; y < 397; y += 22)
      for (let x = 70; x < 280; x += 37) {
        r.r(x + (y % 44 ? 12 : 0), y, 30, 17, "#be9270");
        r.r(x + (y % 44 ? 12 : 0), y + 1, 27, 2, "#d3ae84");
      }
    r.r(97, 228, 156, 142, "#6e533f");
    r.r(108, 240, 134, 118, "#453d34");
    r.r(120, 322, 110, 32, "#d9823d");
    r.r(135, 300, 24, 48, "#edaa4d");
    r.r(174, 287, 29, 64, "#ffd17a");
    r.r(213, 309, 12, 42, "#f1bd65");
    r.r(76, 372, 199, 18, "#665642");
    // Tall storage cabinet and side supply sacks.
    r.r(695, 151, 170, 230, "#896241");
    r.r(705, 160, 150, 210, "#b68d58");
    for (let y = 176; y < 360; y += 60) {
      r.r(713, y, 134, 50, "#cfa86c");
      r.r(773, y + 23, 12, 6, "#846438");
    }
    r.r(784, 163, 3, 200, "#8c6946");
    r.r(30, 410, 98, 96, "#d7bc89");
    r.r(40, 417, 77, 8, "#efdcaa");
    r.text("밀가루", 79, 458, "#806a42", 16);
    r.r(127, 450, 35, 50, "#b88842");
    r.r(130, 447, 29, 7, "#e8d39b");
    // Counter and glazed bread showcase in the foreground.
    polygon(
      [
        [295, 338],
        [628, 338],
        [690, 413],
        [251, 413],
      ],
      "#8e7656",
    );
    r.r(260, 414, 420, 136, "#a77648");
    r.r(271, 430, 397, 103, "#bf9159");
    for (let x = 285; x < 660; x += 64) r.r(x, 439, 43, 84, "#cda16a");
    r.r(295, 298, 332, 87, "#8aa7a0");
    r.r(305, 307, 310, 65, "#c4d6bb");
    for (let i = 0; i < 7; i++) {
      r.oval(316 + i * 41, 337, 32, 22, "#c28a42");
      r.oval(319 + i * 41, 334, 25, 17, "#e7b96b");
      r.r(326 + i * 41, 337, 3, 9, "#ffdb93");
    }
    r.r(295, 378, 332, 11, "#e9ce94");
    r.r(184, 94, 102, 62, "#765c42");
    r.r(190, 100, 90, 50, "#496953");
    r.text("OPEN / CLOSE", 235, 126, "#eee9c3", 10);
  } else {
    // Wall of mail slots and parcel shelves, with a frontal service counter.
    r.r(70, 160, 245, 190, "#8a805c");
    for (let y = 170; y < 340; y += 34)
      for (let x = 80; x < 306; x += 44) {
        r.r(x, y, 36, 26, "#dfcf9f");
        r.r(x + 13, y + 13, 9, 2, "#8c7852");
        r.r(x + 4, y + 4, 16, 4, "#f6e8bb");
      }
    r.r(610, 148, 275, 210, "#8c6948");
    for (let y = 160; y < 340; y += 62) {
      r.r(620, y + 49, 255, 9, "#684f37");
      for (let x = 627; x < 870; x += 62) {
        r.r(x, y + 7, 50, 42, "#c79d62");
        r.r(x + 20, y + 7, 8, 42, "#f0d4a1");
        r.r(x + 4, y + 23, 14, 9, "#ede3c4");
      }
    }
    polygon(
      [
        [220, 356],
        [757, 356],
        [839, 438],
        [140, 438],
      ],
      "#b59767",
    );
    r.r(151, 438, 676, 113, "#79947b");
    r.r(168, 451, 640, 85, "#91ab8c");
    r.r(410, 460, 165, 52, "#e6d8ac");
    r.text("PARCEL SERVICE", 492, 491, "#5c765d", 16);
    r.r(635, 356, 94, 62, "#bd925b");
    r.r(673, 356, 12, 62, "#efdcaa");
    r.r(646, 377, 24, 15, "#f2e7c5");
    r.r(220, 381, 120, 8, "#efe4c5");
  }
}
