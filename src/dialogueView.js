import { DialogueSequence } from "./dialogueSequence.js";
function escape(text) {
  return String(text).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
export function presentDialogue(ui, actor, pages, actions = [], options = {}) {
  const model = new DialogueSequence(pages, {
    hasChoices: actions.length > 0,
    immediateChoices: options.immediateChoices,
  });
  const asset =
    actor.portraitAsset || "assets/characters/" + actor.portrait + ".svg";
  const chips = (options.speakers || [])
    .map(
      (name) =>
        `<span class="speaker-chip" data-speaker="${escape(name)}">${escape(name)}</span>`,
    )
    .join("");
  ui.panel(
    `<div class="portrait-scene indoor dialogue-portrait"><img src="${escape(asset)}" alt="${escape(actor.name)}"></div><div class="speaker-chips">${chips}</div><h2><span id="dialogue-speaker"></span> <small class="muted">${escape(options.role || actor.role || "")}</small></h2><div id="typed-dialogue" class="dialogue-text" aria-live="polite"></div><div class="dialogue-next-row"><span id="dialogue-page" class="muted"></span><button id="dialogue-next" type="button" aria-label="다음">다음 <kbd>SPACE</kbd></button></div><div id="dialogue-choices" class="actions" hidden></div>`,
    [],
  );
  const root = ui.overlay,
    body = root.querySelector("#typed-dialogue"),
    speaker = root.querySelector("#dialogue-speaker"),
    next = root.querySelector("#dialogue-next"),
    choices = root.querySelector("#dialogue-choices"),
    counter = root.querySelector("#dialogue-page");
  let frame,
    last = performance.now(),
    disposed = false,
    choicesShown = false;
  const controller = {
    model,
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
    },
    advance() {
      if (disposed) return;
      model.advance();
      render();
    },
    handleKey(event) {
      const key = event.key.toLowerCase(),
        target = event.target;
      if (![" ", "e", "enter"].includes(key)) return false;
      if (target.closest?.(".panel-close") && key !== "e") {
        event.preventDefault();
        target.closest(".panel-close").click();
        return true;
      }
      if (model.phase === "choices") {
        if (key === " ") {
          event.preventDefault();
          target.closest?.(".dialogue-choice")?.click();
          return true;
        }
        if (key === "e") {
          event.preventDefault();
          return true;
        }
        return false;
      }
      event.preventDefault();
      controller.advance();
      return true;
    },
  };
  function invoke(fn) {
    controller.dispose();
    if (ui.dialogueController === controller) ui.dialogueController = null;
    fn();
  }
  function render() {
    if (disposed) return;
    if (body.textContent !== model.text) body.textContent = model.text;
    const busy = String(model.phase === "typing");
    if (body.getAttribute("aria-busy") !== busy)
      body.setAttribute("aria-busy", busy);
    body.classList.toggle("narration", model.page.kind === "narration");
    speaker.textContent = model.page.speaker || actor.name;
    counter.textContent =
      model.phase === "choices"
        ? "선택지를 골라 주세요"
        : model.index +
          1 +
          " / " +
          model.pages.length +
          " · " +
          (model.phase === "typing"
            ? "출력 중 · 다음을 누르면 전체 표시"
            : "스페이스 / 다음으로 진행");
    for (const chip of root.querySelectorAll(".speaker-chip"))
      chip.classList.toggle(
        "active",
        model.page.activeSpeaker === chip.dataset.speaker ||
          model.page.activeSpeaker === "all",
      );
    if (model.phase === "finished") {
      invoke(options.onComplete || (() => ui.close()));
      return;
    }
    next.hidden = model.phase === "choices";
    choices.hidden = model.phase !== "choices";
    if (model.phase === "choices" && !choicesShown) {
      choicesShown = true;
      for (const [label, fn] of actions) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "dialogue-choice";
        button.textContent = label;
        button.onclick = () => invoke(fn);
        choices.append(button);
      }
      choices.querySelector("button")?.focus();
    }
  }
  next.onclick = () => controller.advance();
  ui.dialogueController = controller;
  render();
  if (!disposed && model.phase !== "choices") next.focus();
  function animate(now) {
    if (disposed) return;
    const dt = Math.min(now - last, 100);
    last = now;
    if (!document.hidden) model.tick(dt);
    render();
    if (!disposed) frame = requestAnimationFrame(animate);
  }
  if (!disposed) frame = requestAnimationFrame(animate);
  return controller;
}
