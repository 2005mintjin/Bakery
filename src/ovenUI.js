import {
  breadIds,
  bakeSeconds,
  ovenCapacity,
  nextBatch,
  putInOven,
  collectBread,
} from "./baking.js";
import { names } from "./inventory.js";
export function showOven(ui) {
  const s = ui.g.state,
    oven = s.oven;
  const back = ["반죽 만들기로 돌아가기", () => ui.show("oven")];
  if (oven) {
    const amount = Object.values(oven.batch).reduce((a, b) => a + b, 0);
    const breads = breadIds
      .filter((id) => oven.batch[id])
      .map(
        (id) =>
          `<p><img class="batch-bread" src="assets/food/${id}.svg" alt="${names[id]}"> ${names[id]} ${oven.batch[id]}개</p>`,
      )
      .join("");
    ui.panel(
      `<h2>${oven.phase === "ready" ? "빵 굽기 완료!" : "오븐에서 굽는 중"} · ${amount}/${ovenCapacity}개</h2>${breads}` +
        (oven.phase === "baking"
          ? `<progress id="bake-progress" max="${bakeSeconds}" value="${oven.seconds}"></progress><p id="bake-seconds">완성까지 ${Math.ceil(bakeSeconds - oven.seconds)}초</p><p>굽는 동안 다음 반죽을 준비할 수 있어요. 다른 탭에서는 멈춥니다.</p>`
          : "<p>완성한 빵을 모두 꺼내면 다음 반죽을 구울 수 있어요.</p>"),
      [
        ...(oven.phase === "ready"
          ? [
              [
                "완성한 빵 모두 꺼내기",
                () => {
                  if (collectBread(s))
                    ui.notify("완성한 빵을 창고에 보관했어요");
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
  const selection = nextBatch(s);
  ui.panel(
    `<h2>오븐 · 한 번에 최대 ${ovenCapacity}개</h2><p>종류를 섞어 담을 수 있어요. 한 판을 굽는 시간은 ${bakeSeconds}초입니다.</p>` +
      breadIds
        .map(
          (id) =>
            `<div class="row"><label for="batch-${id}">${names[id]} · 준비 반죽 ${s.doughs[id]}개</label><input id="batch-${id}" data-dough="${id}" aria-label="${names[id]} 굽는 개수" type="number" min="0" max="${Math.min(s.doughs[id], ovenCapacity)}" step="1" value="${selection[id]}"></div>`,
        )
        .join("") +
      `<p id="batch-size"></p>`,
    [
      [
        "선택한 반죽 굽기",
        () => {
          if (!putInOven(s, readSelection())) {
            ui.notify("준비된 반죽을 1~6개 선택해 주세요");
            return;
          }
          ui.show("ovenBatch");
        },
      ],
      back,
    ],
  );
  function readSelection() {
    return Object.fromEntries(
      [...ui.overlay.querySelectorAll("[data-dough]")].map((input) => [
        input.dataset.dough,
        Number(input.value),
      ]),
    );
  }
  const button = ui.overlay.querySelector(".panel-actions button");
  function update() {
    const batch = readSelection(),
      total = Object.values(batch).reduce((a, b) => a + b, 0);
    const valid =
      Number.isSafeInteger(total) &&
      total > 0 &&
      total <= ovenCapacity &&
      breadIds.every(
        (id) =>
          Number.isSafeInteger(batch[id]) &&
          batch[id] >= 0 &&
          batch[id] <= s.doughs[id],
      );
    ui.overlay.querySelector("#batch-size").textContent =
      `선택 ${Number.isFinite(total) ? total : 0}/${ovenCapacity}개`;
    button.disabled = !valid;
  }
  for (const input of ui.overlay.querySelectorAll("[data-dough]"))
    input.oninput = update;
  update();
}
