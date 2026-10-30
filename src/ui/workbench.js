import { doughTypes } from "../recipeBook.js";
import { doughStaminaCost } from "../stamina.js";
import { names } from "../inventory.js";
import { beginDough, addTopping } from "../baking.js";
import {
  familyTabs,
  bindFamilyTabs,
  foodIcon,
  ingredients,
  stageRibbon,
} from "./craftWidgets.js";
export function showWorkbench(ui) {
  const s = ui.g.state,
    type = ui.workbenchTab || "bread",
    d = doughTypes[type];
  ui.panel(
    `<div class="panel-eyebrow">LITTLE HEARTH · RECIPE BOOK</div><h2>작업실 · 레시피북</h2>${familyTabs(type)}${stageRibbon(0)}<section class="workbench-layout"><div class="recipe-illustration"><img src="${foodIcon(type)}" alt="${d.name}"><span>오늘의 작은 정성</span><h3>${d.name} 반죽</h3><p>한 번에 반죽 1개<br>완성한 반죽은 창고에 보관해요.</p></div><div class="recipe-preparation"><h3>필요한 재료</h3>${ingredients(d.cost, s)}<div class="energy-note">소모 기력 <b>${doughStaminaCost}</b> / 현재 <b>${s.stamina}</b></div><h3>이 반죽으로 만들어요</h3><div class="recipe-preview">${Object.values(
      d.finishes,
    )
      .map(
        (f) =>
          `<span>${names[f.id]}<small>준비 ${s.doughs[f.id]}개</small></span>`,
      )
      .join("")}</div></div></section>`,
    [
      [
        type === "bread" ? "재료 섞어 반죽 시작" : d.name + " 반죽 시작",
        () => {
          if (!beginDough(s, type))
            ui.notify(
              s.stamina < doughStaminaCost
                ? "기력이 부족해요."
                : "반죽 재료가 부족해요. 잡화점에서 구매해 주세요.",
            );
          ui.show("oven");
        },
      ],
      ["오븐 관리 · 최대 6개 굽기", () => ui.show("ovenBatch")],
      ["반죽·빵 창고 확인", () => ui.show("warehouse")],
    ],
  );
  bindFamilyTabs(ui.overlay, "craft-tab", (type) => {
    ui.workbenchTab = type;
    ui.show("oven");
  });
}
export function showToppings(ui) {
  const s = ui.g.state,
    type = s.baking.type || "bread",
    d = doughTypes[type];
  ui.workbenchTab = type;
  ui.panel(
    `<div class="panel-eyebrow">${d.name} 반죽 · 마지막 손길</div><h2>토핑 선택</h2>${stageRibbon(2)}<p>속재료나 토핑 하나를 골라 반죽을 마무리하세요.</p><div class="recipe-grid">${Object.entries(
      d.finishes,
    )
      .map(
        ([key, f]) =>
          `<article class="recipe-card"><img src="${foodIcon(type)}" alt=""><h3>${names[f.id]}</h3>${ingredients(f.cost, s)}<button data-finish="${key}">${f.name}</button></article>`,
      )
      .join("")}</div>`,
  );
  for (const b of ui.overlay.querySelectorAll("[data-finish]"))
    b.onclick = () => {
      if (!addTopping(s, b.dataset.finish)) ui.notify("토핑 재료가 부족해요");
      else ui.notify("완성한 반죽을 창고에 보관했어요.");
      ui.show("oven");
    };
}
