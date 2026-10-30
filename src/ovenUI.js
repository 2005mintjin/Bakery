import { ovenLimit, ovenDuration } from "./equipment.js";
import {
  breadIds,
  nextBatch,
  putInOven,
  collectBread,
  dryBerries,
} from "./baking.js";
import { doughTypes } from "./recipeBook.js";
import { names } from "./inventory.js";
import { familyTabs, bindFamilyTabs, foodIcon } from "./ui/craftWidgets.js";
export function showOven(ui, { preserveDraft = false } = {}) {
  const s = ui.g.state,
    ovenCapacity = ovenLimit(s),
    duration = s.oven?.duration ?? ovenDuration(s),
    oven = s.oven,
    back = ["반죽 만들기로 돌아가기", () => ui.show("oven")];
  if (oven) {
    ui.ovenDraft = null;
    const drying = oven.kind === "drying",
      ready = oven.phase === "ready",
      amount = Object.values(oven.batch).reduce((a, b) => a + b, 0);
    ui.panel(
      `<div class="panel-eyebrow">OVEN · 따뜻하게 기다리는 시간</div><h2>${ready ? (drying ? "베리 건조 완료!" : "빵 굽기 완료!") : drying ? "베리 건조 중" : "오븐에서 굽는 중"} · ${amount}/${ovenCapacity}개</h2><div class="oven-status"><span class="oven-seal">${ready ? "✦" : "◷"}</span><div><strong>${ready ? "한 판이 완성되었어요" : "오븐이 일하고 있어요"}</strong><p>${ready ? "완성한 제품을 꺼내 다음 판을 준비하세요." : "굽는 동안 다음 반죽을 준비할 수 있어요."}</p></div></div><div class="batch-products">${Object.entries(
        oven.batch,
      )
        .filter(([, n]) => n)
        .map(
          ([id, n]) =>
            `<span><img src="${drying ? "assets/ui/ingredient.svg" : foodIcon(id)}" alt="">${names[id]} <b>${n}개</b></span>`,
        )
        .join(
          "",
        )}</div>${ready ? "" : `<progress id="bake-progress" max="${duration}" value="${oven.seconds}"></progress><p id="bake-seconds">완성까지 ${Math.ceil(duration - oven.seconds)}초</p><small class="muted">다른 탭에서는 굽기가 멈춥니다.</small>`}`,
      [
        ...(ready
          ? [
              [
                drying ? "말린 베리 꺼내기" : "완성한 빵 모두 꺼내기",
                () => {
                  if (collectBread(s))
                    ui.notify(
                      drying
                        ? "말린 베리를 가방에 보관했어요"
                        : "완성한 빵을 창고에 보관했어요",
                    );
                  ui.show("ovenBatch");
                },
              ],
            ]
          : []),
        back,
      ],
    );
    return;
  }
  if (!preserveDraft || !ui.ovenDraft || ui.ovenDraftState !== s) {
    ui.ovenDraft = nextBatch(s);
    ui.ovenDraftState = s;
  }
  const draft = ui.ovenDraft,
    type = ui.ovenTab || "bread",
    ids = Object.values(doughTypes[type].finishes).map((f) => f.id);
  ui.panel(
    `<div class="panel-eyebrow">BAKING TRAY · 한 판의 준비</div><h2>오븐 · 한 번에 최대 ${ovenCapacity}개</h2><p>종류를 섞어 한 판을 만들어요. 굽는 시간은 ${duration}초입니다.</p>${familyTabs(type, "oven-tab")}<div class="recipe-grid">${ids.map((id) => `<article class="recipe-card compact"><img src="${foodIcon(id)}" alt=""><h3>${names[id]}</h3><p>준비 반죽 ${s.doughs[id]}개</p><label class="quantity-field" for="batch-${id}">담을 수량 <input id="batch-${id}" data-dough="${id}" aria-label="${names[id]} 굽는 개수" type="number" min="0" max="${Math.min(s.doughs[id], ovenCapacity)}" step="1" value="${draft[id] || 0}"></label></article>`).join("")}</div><section class="tray-summary" aria-label="이번 판에 담은 반죽"><b>이번 판</b><div id="oven-basket"></div><strong id="batch-size"></strong></section>`,
    [
      [
        "선택한 반죽 굽기",
        () => {
          if (!putInOven(s, draft)) {
            ui.notify(`준비된 반죽을 1~${ovenCapacity}개 선택해 주세요`);
            return;
          }
          ui.ovenDraft = null;
          ui.show("ovenBatch");
        },
      ],
      [
        "선택 초기화",
        () => {
          ui.ovenDraft = Object.fromEntries(breadIds.map((id) => [id, 0]));
          showOven(ui, { preserveDraft: true });
        },
      ],
      ["베리 말리기", () => showDrying(ui)],
      back,
    ],
  );
  const button = ui.overlay.querySelector(".panel-actions button");
  function update() {
    const total = Object.values(draft).reduce((a, b) => a + b, 0),
      valid =
        Number.isSafeInteger(total) &&
        total > 0 &&
        total <= ovenCapacity &&
        breadIds.every(
          (id) =>
            Number.isSafeInteger(draft[id]) &&
            draft[id] >= 0 &&
            draft[id] <= s.doughs[id],
        );
    ui.overlay.querySelector("#batch-size").textContent =
      `선택 ${Number.isFinite(total) ? total : 0}/${ovenCapacity}개`;
    ui.overlay.querySelector("#oven-basket").textContent =
      Object.entries(draft)
        .filter(([, n]) => n > 0)
        .map(([id, n]) => `${names[id]} ${n}개`)
        .join(" · ") || "아직 담은 반죽이 없어요";
    button.disabled = !valid;
  }
  for (const input of ui.overlay.querySelectorAll("[data-dough]"))
    input.oninput = () => {
      draft[input.dataset.dough] = Number(input.value);
      update();
    };
  bindFamilyTabs(ui.overlay, "oven-tab", (type) => {
    ui.ovenTab = type;
    showOven(ui, { preserveDraft: true });
  });
  update();
}
export function showDrying(ui) {
  const s = ui.g.state,
    ovenCapacity = ovenLimit(s),
    duration = ovenDuration(s);
  if (s.oven) {
    ui.notify("현재 오븐 작업을 마치고 꺼내 주세요.");
    ui.show("ovenBatch");
    return;
  }
  ui.panel(
    `<div class="panel-eyebrow">PANTRY · 천천히 말린 달콤함</div><h2>오븐에서 베리 말리기</h2><section class="drying-card"><img src="assets/ui/ingredient.svg" alt=""><div><h3>생베리 2개 → 말린 베리 1개</h3><p>${duration}초 동안 1~${ovenCapacity}묶음을 건조해요.<br>현재 생베리 <b>${s.items.berry}개</b></p><label class="quantity-field">묶음 수 <input id="dry-count" type="number" min="1" max="${ovenCapacity}" value="1" aria-label="베리 건조 묶음 수"></label></div></section>`,
    [
      [
        "건조 시작",
        () => {
          if (
            !dryBerries(s, Number(ui.overlay.querySelector("#dry-count").value))
          ) {
            ui.notify(
              `빈 오븐과 베리가 필요해요. 1~${ovenCapacity}묶음을 선택하세요.`,
            );
            return;
          }
          ui.ovenDraft = null;
          ui.show("ovenBatch");
        },
      ],
      ["오븐 관리로 돌아가기", () => ui.show("ovenBatch")],
    ],
  );
}
