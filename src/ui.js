import { presentDialogue } from "./dialogueView.js";
import { hasStaffAccess, openStaffDialogue } from "./serviceDialogue.js";
import { screens } from "./ui/screens.js";
import { updateHud } from "./ui/hud.js";
export class UI {
  constructor(g) {
    this.g = g;
    this.overlay = document.querySelector("#overlay");
    this.timer = 0;
  }
  get open() {
    return !this.overlay.hidden;
  }
  say(actor, pages, actions = [], options = {}) {
    return presentDialogue(this, actor, pages, actions, options);
  }
  close() {
    if (!this.g.started) return;
    this.dialogueController?.dispose();
    this.dialogueController = null;
    this.overlay.hidden = true;
    this.currentPanel = null;
    this.serviceAccess = null;
    this.g.keys.clear();
  }
  notify(t) {
    document.querySelector("#toast").textContent = t;
    clearTimeout(this.timer);
    this.timer = setTimeout(
      () => (document.querySelector("#toast").textContent = ""),
      3500,
    );
  }
  panel(html, actions = []) {
    this.dialogueController?.dispose();
    this.dialogueController = null;
    this.g.keys.clear();
    this.overlay.hidden = false;
    this.overlay.innerHTML =
      '<section class="panel">' +
      html +
      '<div class="actions panel-actions"></div></section>';
    for (const [label, fn] of [
      ...actions,
      ...(this.g.started ? [["닫기 · ESC", () => this.close()]] : []),
    ]) {
      const b = document.createElement("button");
      b.textContent = label;
      if (label === "닫기 · ESC") b.classList.add("panel-close");
      b.onclick = fn;
      this.overlay.querySelector(".panel-actions").append(b);
    }
    this.overlay.querySelector("button")?.focus();
  }
  show(type) {
    if (!["parcel", "supplies", "cafe"].includes(type))
      this.serviceAccess = null;
    if (["parcel", "supplies", "cafe"].includes(type)) {
      const scene =
        type === "parcel" ? "post" : type === "supplies" ? "store" : "cafe";
      if (!hasStaffAccess(this.g, type)) {
        openStaffDialogue(this.g, scene);
        return;
      }
    }
    this.currentPanel = type;
    screens[type]?.(this);
  }
  update(hint) {
    updateHud(this, hint);
  }
}
