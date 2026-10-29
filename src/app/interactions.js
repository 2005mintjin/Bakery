import { target } from "../exploration.js";
import { showGarden } from "../garden.js";
import { enterBuilding } from "../sceneManager.js";
import { talk } from "../dialogue.js";
export function interact(g) {
  const o = target(g);
  if (!o) return;
  if (o.plot !== undefined) {
    showGarden(g.ui, o.plot);
    return;
  }
  if (o.door) {
    enterBuilding(g.state, o.door);
    g.keys.clear();
    return;
  }
  if (o.npc) {
    if (o.npc.line)
      g.ui.say({ name: o.npc.name, portrait: "jun" }, [o.npc.line]);
    else talk(g, o.npc);
  } else if (o.type === "berry") {
    const s = g.state,
      now = s.day * 1440 + s.minutes;
    if (now < s.harvestAt)
      g.ui.notify("열매가 다시 익고 있어요. 잠시 뒤 돌아오세요.");
    else {
      s.items.berry += 6;
      s.harvestAt = now + 30;
      g.ui.notify("베리 6개를 모았어요");
    }
  } else g.ui.show(o.type);
}
