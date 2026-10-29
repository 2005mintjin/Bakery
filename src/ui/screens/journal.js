import { names } from "../../inventory.js";

export function showInventory(ui) {
  const s = ui.g.state;
  ui.panel(
    "<h2>나의 가방</h2>" +
      Object.entries(s.items)
        .map(
          ([k, v]) =>
            `<div class="row"><span>${names[k]}</span><b>${v}개</b></div>`,
        )
        .join(""),
  );
}

export function showJournal(ui) {
  const s = ui.g.state;
  const d = ui.g.data;
  ui.panel(
    "<h2>부탁 수첩</h2>" +
      d.quests
        .map(
          (q) =>
            `<div class="row"><div><b>${q.name}</b><p>${q.description}</p></div><span>${s.quests[q.id] === "done" ? "완료 ✓" : s.quests[q.id] === "active" ? "진행 중" : "주민과 대화"}</span></div>`,
        )
        .join(""),
  );
}
