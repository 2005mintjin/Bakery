import { drawDaylight } from "./render/daylight.js";
import { drawResident } from "./residentArt.js";
import { drawStaff } from "./staffArt.js";
import { drawCounter } from "./counterArt.js";
import { drawGarden } from "./gardenArt.js";
import { isInterior } from "./interior.js";
import { residents } from "./npc.js";
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
    canvas.width = 1920;
    canvas.height = 1152;
    this.c = canvas.getContext("2d");
    this.c.setTransform(2, 0, 0, 2, 0, 0);
    this.c.imageSmoothingEnabled = false;
    this.bg = {};
    for (const scene of [
      "town",
      "bakery",
      "bakeryKitchen",
      "post",
      "city",
      "store",
      "field",
      "cafe",
    ]) {
      const b = document.createElement("canvas");
      b.width = 1920;
      b.height = 1152;
      const old = this.c;
      this.c = b.getContext("2d");
      this.c.setTransform(2, 0, 0, 2, 0, 0);
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
      return;
    }
    if (s.scene === "field") drawGarden(this, s);
    const actors = [
      { ...s, color: "#c48b59", player: true },
      ...residents(g),
    ].sort((a, b) => a.y - b.y);
    for (const a of actors) {
      if (!(
        (a.player &&
          g.sprite?.draw(this.c, a.x, a.y, walking, t, g.direction)) ||
        (!a.player && drawResident(this, a))
      ))
        drawCharacter(this, a.x, a.y, a.color, false, t);
      if (!a.player) {
        this.text(a.name, a.x, a.y - (a.spriteHeight || 53) - 8, "#fff8dc");
        if (a.quest && s.quests[a.quest] !== "done")
          this.text(
            s.quests[a.quest] === "active" ? "⋯" : "!",
            a.x,
            a.y - (a.spriteHeight || 53) - 25,
            "#fff4b3",
            18,
          );
      }
    }
    drawDaylight(this.c, s.minutes);
  }
}
