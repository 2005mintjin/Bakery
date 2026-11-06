import { drawSceneLighting } from "./render/lighting.js";
import { drawResident } from "./residentArt.js";
import { drawStaff } from "./staffArt.js";
import { drawCounter } from "./counterArt.js";
import { drawGarden } from "./gardenArt.js";
import { isInterior } from "./interior.js";
import { residents, residentQuestStatus } from "./npc.js";
import { PixelPainter } from "./render/pixelPainter.js";
import { drawBackground } from "./render/backgrounds.js";
import { drawCharacter } from "./render/characters.js";
export class Renderer extends PixelPainter {
  constructor(
    canvas,
    city,
    scenery = new Map(),
    maps = {},
    counterArt = new Map(),
  ) {
    super();
    this.counterArt = counterArt;
    this.city = city;
    this.scenery = scenery;
    this.maps = maps;
    canvas.width = 2880;
    canvas.height = 1728;
    this.c = canvas.getContext("2d");
    this.c.setTransform(3, 0, 0, 3, 0, 0);
    this.c.imageSmoothingEnabled = false;
    this.reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");
    this.bg = {};
    for (const scene of [
      "town",
      "bakery",
      "bakeryKitchen",
      "post",
      "city",
      "downtown",
      "downtownEast",
      "store",
      "field",
      "pond",
      "cafe",
      "workshop",
      "hall",
    ]) {
      const b = document.createElement("canvas");
      b.width = canvas.width;
      b.height = canvas.height;
      const old = this.c;
      this.c = b.getContext("2d");
      this.c.setTransform(3, 0, 0, 3, 0, 0);
      this.c.imageSmoothingEnabled = false;
      drawBackground(this, scene);
      this.bg[scene] = b;
      this.c = old;
    }
  }
  draw(g, walking, t) {
    const s = g.state;
    this.c.drawImage(this.bg[s.scene], 0, 0, 960, 576);
    if (isInterior(s.scene)) {
      if (s.scene === "bakery") drawCounter(this, s);
      else if (["post", "store", "cafe"].includes(s.scene))
        drawStaff(this, s, g.data.serviceDialogues.staff[s.scene]);
      drawSceneLighting(this, s.scene, s.minutes);
      return;
    }
    if (s.scene === "field") {
      drawGarden(this, s);
      this.r(6, 269, 130, 34, "#654b32");
      this.text("← 호숫가 낚시터", 71, 291, "#fff2c9", 15);
    }
    if (s.scene === "pond") {
      this.text("낚시터 · E", 615, 214, "#fff2c9", 17);
      this.text("텃밭 →", 883, 275, "#fff2c9", 15);
    }
    const directions = {
      city: [["번화가 →", 879]],
      downtown: [["← 상점가", 76], ["쉼터 광장 →", 873]],
      downtownEast: [["← 병원·책방 거리", 89, 310]],
    }[s.scene] || [];
    for (const [label, x, y = 337] of directions) {
      this.r(x - 70, y, 140, 25, "#483c2cdb");
      this.text(label, x, y + 17, "#fff1c9", 14);
    }
    const actors = [
      { ...s, color: "#c48b59", player: true },
      ...residents(g),
    ].sort((a, b) => a.y - b.y);
    for (const a of actors) {
      if (!(
        (a.player &&
          g.sprite?.draw(this.c, a.x, a.y, walking, t, g.direction)) ||
        (!a.player && drawResident(this, a, t))
      ))
        drawCharacter(this, a.x, a.y, a.color, false, t);
      if (!a.player) {
        this.text(a.name, a.x, a.y - (a.spriteHeight || 53) - 8, "#fff8dc");
        const questStatus = residentQuestStatus(s, a);
        if (a.quest && questStatus !== "done")
          this.text(
            questStatus === "active" ? "⋯" : "!",
            a.x,
            a.y - (a.spriteHeight || 53) - 25,
            "#fff4b3",
            18,
          );
      }
    }
    drawSceneLighting(this, s.scene, s.minutes);
  }
}
