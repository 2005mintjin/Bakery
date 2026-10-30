import { isInterior } from "../interior.js";
import { interact } from "./interactions.js";
export function bindInput(g) {
  const unlockAudio = () => {
    g.fx.unlock();
    g.voices?.unlock();
  };
  document.addEventListener("pointerdown", unlockAudio, {
    capture: true,
  });
  document.addEventListener("keydown", unlockAudio, { capture: true });
  document.querySelectorAll("[data-panel]").forEach(
    (b) =>
      (b.onclick = () => {
        if (g.started || b.dataset.panel === "audio")
          g.ui.show(b.dataset.panel);
      }),
  );
  addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    const editing =
      e.target instanceof Element &&
      e.target.matches('input,select,textarea,[contenteditable="true"]');
    if (
      !editing &&
      ["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)
    )
      e.preventDefault();
    if (e.repeat) return;
    if (!g.started) return;
    if (k === "escape") {
      if (g.ui.open) g.ui.close();
      else g.ui.show("menu");
      return;
    }
    if (editing) return;
    if (g.ui.open) {
      if (g.ui.dialogueController?.handleKey(e)) return;
      if ((k === "e" || k === " ") && e.target.tagName !== "BUTTON")
        document.querySelector("#overlay button")?.click();
      return;
    }
    if (["a", "arrowleft"].includes(k)) g.direction = "left";
    if (["d", "arrowright"].includes(k)) g.direction = "right";
    if (["w", "arrowup"].includes(k)) g.direction = "up";
    if (["s", "arrowdown"].includes(k)) g.direction = "down";
    if (k === "e" && !isInterior(g.state.scene)) interact(g);
    else if (k === "i") g.ui.show("inventory");
    else if (k === "j") g.ui.show("journal");
    else g.keys.add(k);
  });
  addEventListener("keyup", (e) => g.keys.delete(e.key.toLowerCase()));
  addEventListener("blur", () => g.keys.clear());
  document.addEventListener("visibilitychange", () => {
    g.keys.clear();
    if (document.hidden) g.voices?.silence();
    g.music.setSuspended(document.hidden);
  });
}
