import { doughStaminaCost } from "./stamina.js";
import { names } from "./inventory.js";
import { baseDough, beginDough, knead, addTopping } from "./baking.js";
export function showBaking(ui) {
  const s = ui.g.state,
    b = s.baking;
  if (!b) {
    ui.panel(
      "<h2>작은 화덕 · 반죽 준비</h2><p>밀가루 2 + 이스트 1 + 소금 1로 기본 반죽을 만듭니다.</p><p>" +
        Object.keys(baseDough)
          .map((k) => `${names[k]} ${s.items[k]}`)
          .join(" / ") +
        `</p><p>반죽 1회에 기력 ${doughStaminaCost} 소모 · 현재 ${s.stamina}</p><p>완성한 반죽은 창고에 모아 두고 오븐에서 최대 6개씩 구울 수 있어요.</p>`,
      [
        [
          "재료 섞어 반죽 시작",
          () => {
            if (!beginDough(s))
              ui.notify(
                s.stamina < doughStaminaCost
                  ? "기력이 부족해요. 잠을 자거나 카페에서 쉬어 주세요."
                  : "밀가루·이스트·소금이 부족해요",
              );
            ui.show("oven");
          },
        ],
        ["오븐 관리 · 최대 6개 굽기", () => ui.show("ovenBatch")],
        ["반죽·빵 창고 확인", () => ui.show("warehouse")],
      ],
    );
    return;
  }
  if (b.phase === "kneading") {
    ui.panel(
      '<h2>반죽 치대기</h2><p>반죽 위에서 마우스를 누른 채 좌우로 여러 번 문질러 주세요.</p><canvas id="dough" width="520" height="230" aria-label="마우스로 드래그하여 반죽하기"></canvas><progress id="knead-progress" max="100" value="' +
        b.progress +
        '"></progress><p id="knead-label">반죽 ' +
        Math.floor(b.progress) +
        '%</p><p class="muted">닫아도 반죽과 사용한 재료는 유지됩니다. 메뉴에서 저장할 수 있어요.</p>',
    );
    attachDough(ui);
    return;
  }
  if (b.phase === "topping") {
    ui.panel(
      "<h2>토핑 선택</h2><p>기본 반죽 완성! 토핑은 한 가지만 넣습니다.</p><p>꿀 " +
        s.items.honey +
        " / 베리 " +
        s.items.berry +
        "</p>",
      [
        ["아무것도 넣지 않기 · 밀빵", () => choose("none")],
        ["꿀 1개 넣기 · 꿀빵", () => choose("honey")],
        ["베리 2개 넣기 · 베리빵", () => choose("berry")],
      ],
    );
    return;
  }
  function choose(type) {
    if (!addTopping(s, type)) ui.notify("토핑 재료가 부족해요");
    else
      ui.notify(
        "완성한 반죽을 창고에 보관했어요. 다음 반죽을 만들거나 오븐에 넣어 주세요.",
      );
    ui.show("oven");
  }
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
