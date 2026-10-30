import { slots, saveSlot } from "../saveSystem.js";
import { parseSave, serializeSave, maxSaveBytes } from "../save/transfer.js";
export function exportSave(ui) {
  try {
    const blob = new Blob([serializeSave(ui.g.state)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `little-hearth-slot-${ui.g.slot}-day-${ui.g.state.day}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    ui.notify("현재 진행을 세이브 파일로 내보냈어요.");
  } catch {
    ui.notify("세이브를 내보내지 못했어요.");
  }
}
export function importSave(ui, done) {
  const cancel = () => (ui.g.started ? ui.show("menu") : done());
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    try {
      if (file.size > maxSaveBytes) throw Error("size");
      const state = parseSave(await file.text()),
        list = await slots();
      const write = async (id) => {
        try {
          await saveSlot(id, state);
          ui.notify("세이브를 가져왔어요. 슬롯을 골라 이어서 시작하세요.");
          await done();
        } catch {
          ui.notify(
            "저장 실패: 브라우저 저장 허용 또는 서버 상태를 확인해 주세요.",
          );
        }
      };
      ui.panel(
        `<h2>세이브를 어디에 가져올까요?</h2><p>${state.day}일째 · ${state.money}G</p><p>가져오면 타이틀로 돌아갑니다. 현재 진행은 먼저 내보내거나 저장해 주세요.</p>`,
        list.map((slot) => [
          `${slot.id}번에 가져오기 · ${slot.empty ? "빈 슬롯" : slot.corrupt ? "손상된 저장 있음" : "기존 저장 있음"}`,
          () => {
            if (slot.empty) {
              write(slot.id);
              return;
            }
            ui.panel(
              `<h2>${slot.id}번 저장을 덮어쓸까요?</h2><p>기존 저장을 바꿉니다. 필요한 세이브는 먼저 파일로 내보내 주세요.</p>`,
              [
                ["덮어쓰고 가져오기", () => write(slot.id)],
                ["취소", cancel],
              ],
            );
          },
        ]),
      );
      if (!ui.g.started) {
        const b = document.createElement("button");
        b.textContent = "취소 · 타이틀";
        b.onclick = done;
        ui.overlay.querySelector(".panel-actions").append(b);
      }
    } catch {
      ui.notify("유효한 게임 세이브 JSON 파일(1MB 이하)을 선택해 주세요.");
    }
  };
  input.click();
}
