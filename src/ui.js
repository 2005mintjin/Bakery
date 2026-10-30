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
      '<section class="panel" role="dialog" aria-modal="true">' +
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
    const heading = this.overlay.querySelector("h2");
    if (heading) {
      heading.id = "panel-heading";
      this.overlay
        .querySelector(".panel")
        .setAttribute("aria-labelledby", "panel-heading");
    }
    this.overlay.onkeydown = (e) => {
      if (e.key !== "Tab") return;
      const focusable = [
        ...this.overlay.querySelectorAll(
          'button:not(:disabled):not([tabindex="-1"]),input:not(:disabled),select:not(:disabled),[tabindex="0"]',
        ),
      ].filter((el) => !el.hidden && el.getClientRects().length);
      if (!focusable.length) return;
      if (e.shiftKey && document.activeElement === focusable[0]) {
        e.preventDefault();
        focusable.at(-1).focus();
      } else if (!e.shiftKey && document.activeElement === focusable.at(-1)) {
        e.preventDefault();
        focusable[0].focus();
      }
    };
    (
      this.overlay.querySelector('[role="tab"][aria-selected="true"]') ||
      this.overlay.querySelector("button")
    )?.focus({ preventScroll: true });
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
