import { markBakeryGuideSeen } from "../../tutorial.js";
const escape = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function showBakeryGuide(ui, page = 0) {
  const guide = ui.g.data.tutorial,
    step = guide.steps[page];
  markBakeryGuideSeen(ui.g.state);
  ui.panel(
    `<div class="panel-eyebrow">FENCER BAKERY · 처음 오신 사장님께</div><h2>${escape(guide.title)}</h2><section class="bakery-guide"><img src="assets/ui/${escape(step.icon)}.svg" alt=""><div><p class="guide-page">${page + 1} / ${guide.steps.length}</p><h3>${escape(step.title)}</h3><ol>${step.lines.map((line) => `<li>${escape(line)}</li>`).join("")}</ol></div></section><p class="muted">게임 시계는 안내를 읽는 동안 잠시 멈춰요. ESC로 닫고 나중에 다시 읽어도 괜찮아요.</p>`,
    [
      ...(page > 0 ? [["이전 안내", () => showBakeryGuide(ui, page - 1)]] : []),
      page < guide.steps.length - 1
        ? ["다음 안내", () => showBakeryGuide(ui, page + 1)]
        : ["빵집 시작하기", () => ui.close()],
    ],
  );
}
