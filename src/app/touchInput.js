import { HeldDirections } from "../inputDirections.js";
import { isInterior } from "../interior.js";
import { target } from "../exploration.js";
import { interact } from "./interactions.js";
const facing = { w: "up", a: "left", s: "down", d: "right" };
export function bindTouchInput(g) {
  const root = document.querySelector("#touch-controls"),
    pad = new HeldDirections();
  const media = matchMedia("(any-pointer: coarse), (max-width: 900px)");
  g.touchKeys = pad.keys;
  const buttons = [...root.querySelectorAll("[data-move]")];
  const action = root.querySelector("[data-touch-interact]");
  const canMove = () =>
    g.started && !g.ui.open && !isInterior(g.state.scene) && media.matches;
  function paint() {
    for (const b of buttons)
      b.setAttribute("aria-pressed", String(pad.keys.has(b.dataset.move)));
  }
  function clear() {
    pad.clear();
    paint();
    for (const b of buttons) {
      // Releasing capture also handles browser interruptions and orientation changes.
      for (const id of captures.get(b) || [])
        if (b.hasPointerCapture(id)) b.releasePointerCapture(id);
    }
    captures.clear();
  }
  const captures = new Map();
  root.addEventListener("pointerdown", (e) => {
    const b = e.target.closest("[data-move]");
    if (!b || e.button !== 0 || !canMove()) return;
    e.preventDefault();
    pad.press(e.pointerId, b.dataset.move);
    g.direction = facing[b.dataset.move];
    b.setPointerCapture(e.pointerId);
    if (!captures.has(b)) captures.set(b, new Set());
    captures.get(b).add(e.pointerId);
    paint();
  });
  root.addEventListener("pointermove", (e) => {
    if (!pad.pointers.has(e.pointerId) || !canMove()) return;
    const b = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest("[data-move]");
    if (b && root.contains(b)) {
      pad.press(e.pointerId, b.dataset.move);
      g.direction = facing[b.dataset.move];
      paint();
    }
  });
  function release(e) {
    pad.release(e.pointerId);
    for (const ids of captures.values()) ids.delete(e.pointerId);
    paint();
  }
  for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
    root.addEventListener(name, release);
  root.addEventListener("contextmenu", (e) => {
    if (e.target.closest("[data-move]")) e.preventDefault();
  });
  action.onclick = () => {
    if (canMove() && target(g)) {
      clear();
      interact(g);
    }
  };
  addEventListener("blur", clear);
  addEventListener("resize", clear);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clear();
  });
  media.addEventListener("change", clear);
  return {
    get visible() {
      return media.matches;
    },
    clear,
    update() {
      const indoor = isInterior(g.state.scene),
        blocked = !canMove();
      root.hidden = !g.started;
      root.dataset.outdoors = String(!indoor);
      document.body.classList.toggle("is-playing", !!g.started);
      document.body.classList.toggle("is-interior", indoor && !!g.started);
      if (blocked && pad.pointers.size) clear();
      for (const b of buttons) b.disabled = blocked;
      action.disabled = blocked || !target(g);
    },
  };
}
