import { knead } from "./baking.js";
import { showWorkbench, showToppings } from "./ui/workbench.js";
import { stageRibbon } from "./ui/craftWidgets.js";
export function showBaking(ui) {
  const s = ui.g.state,
    b = s.baking;
  if (!b) {
    showWorkbench(ui);
    return;
  }
  ui.workbenchTab = b.type || "bread";
  if (b.phase === "topping") {
    showToppings(ui);
    return;
  }
  ui.panel(
    `<div class="panel-eyebrow">작업실 · 손끝으로 만드는 한 조각</div><h2>반죽 치대기</h2>${stageRibbon(1)}<p>반죽 위에서 마우스를 누른 채 좌우로 문질러 주세요.</p><canvas id="dough" width="520" height="230" aria-label="마우스로 드래그하여 반죽하기"></canvas><progress id="knead-progress" max="100" value="${b.progress}"></progress><p id="knead-label">반죽 ${Math.floor(b.progress)}%</p><p class="muted">닫아도 진행도와 사용한 재료가 유지됩니다.</p>`,
  );
  attachDough(ui);
}
function attachDough(ui) {
  const canvas = ui.overlay.querySelector("#dough"),
    c = canvas.getContext("2d");
  let previous = null;
  const point = (e) => {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) * 520) / r.width,
      y: ((e.clientY - r.top) * 230) / r.height,
    };
  };
  const paint = () => {
    const progress = ui.g.state.baking.progress;
    c.fillStyle = "#b89263";
    c.fillRect(0, 0, 520, 230);
    for (let y = 10; y < 230; y += 22) {
      c.fillStyle = "#a47d53";
      c.fillRect(0, y, 520, 2);
    }
    c.fillStyle = "#f2e4bf";
    c.beginPath();
    c.ellipse(
      260,
      118,
      100 + progress * 0.2,
      57 - progress * 0.1,
      0,
      0,
      Math.PI * 2,
    );
    c.fill();
    c.strokeStyle = "#d1b97e";
    c.lineWidth = 4;
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.arc(230 + i * 25, 113, 13, 0, Math.PI);
      c.stroke();
    }
    c.fillStyle = "#fff2d0";
    for (let i = 0; i < 24; i++)
      c.fillRect(110 + ((i * 53) % 300), 45 + ((i * 31) % 145), 2, 2);
    if (previous) {
      c.fillStyle = "#d2ab81";
      c.fillRect(previous.x - 12, previous.y - 8, 24, 16);
    }
  };
  canvas.onpointerdown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    previous = point(e);
    canvas.setPointerCapture(e.pointerId);
    paint();
  };
  canvas.onpointermove = (e) => {
    if (!previous || !(e.buttons & 1)) {
      previous = null;
      return;
    }
    const p = point(e),
      distance = Math.hypot(p.x - previous.x, p.y - previous.y);
    if (Math.abs(p.x - 260) < 155 && Math.abs(p.y - 118) < 90)
      knead(ui.g.state, distance);
    previous = p;
    if (ui.g.state.baking.phase === "topping") {
      previous = null;
      if (canvas.hasPointerCapture(e.pointerId))
        canvas.releasePointerCapture(e.pointerId);
      ui.show("oven");
      return;
    }
    paint();
    ui.overlay.querySelector("#knead-progress").value =
      ui.g.state.baking.progress;
    ui.overlay.querySelector("#knead-label").textContent =
      "반죽 " + Math.floor(ui.g.state.baking.progress) + "%";
  };
  canvas.onlostpointercapture = () => {
    previous = null;
    if (ui.g.state.baking?.phase === "kneading") paint();
  };
  canvas.onpointerup = canvas.onpointercancel = (e) => {
    previous = null;
    if (canvas.hasPointerCapture(e.pointerId))
      canvas.releasePointerCapture(e.pointerId);
    paint();
  };
  paint();
}
