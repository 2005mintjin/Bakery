import { dailyQuestEntry } from "../../anastasiaQuests.js";
export { showInventory } from "./inventory.js";

export function showJournal(ui) {
  const s = ui.g.state;
  const d = ui.g.data;
  ui.panel(
    "<h2>부탁 수첩</h2>" +
      [...d.quests, ...dailyQuestEntry(s, d.recipes)]
        .map(
          (q) =>
            `<div class="row"><div><b>${q.name}</b><p>${q.description}</p></div><span>${(q.status || s.quests[q.id]) === "done" ? "완료 ✓" : (q.status || s.quests[q.id]) === "active" ? "진행 중" : "주민과 대화"}</span></div>`,
        )
        .join(""),
  );
}
