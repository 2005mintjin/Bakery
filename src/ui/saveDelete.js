import { slots, deleteSlot } from "../saveSystem.js";
export async function showSaveDelete(ui, done) {
  const back = () => (ui.g.started ? ui.show("menu") : done());
  try {
    const list = await slots(),
      used = list.filter((s) => !s.empty);
    ui.panel(
      "<h2>세이브 삭제</h2><p>삭제할 슬롯을 선택하세요. 다른 슬롯과 내보낸 백업 파일은 유지됩니다.</p>" +
        (!used.length ? "<p>삭제할 세이브가 없어요.</p>" : ""),
      [
        ...used.map((slot) => [
          `${slot.id}번 세이브 삭제${slot.corrupt ? " · 손상된 파일" : ""}`,
          () => {
            ui.panel(
              `<h2>${slot.id}번 세이브를 삭제할까요?</h2><p>이 슬롯의 저장을 지우고 빈 슬롯으로 바꿉니다. 삭제한 저장은 되돌릴 수 없습니다.</p>${ui.g.started && ui.g.slot === slot.id ? "<p>현재 플레이 중인 슬롯입니다. 삭제 후 타이틀로 돌아갑니다.</p>" : ""}`,
              [
                [
                  "삭제하기",
                  async () => {
                    try {
                      await deleteSlot(slot.id);
                      ui.notify(`${slot.id}번 세이브를 삭제했어요.`);
                      if (ui.g.started && ui.g.slot !== slot.id)
                        await showSaveDelete(ui, done);
                      else await done();
                    } catch {
                      ui.notify(
                        "삭제하지 못했어요. 저장소 접근 권한을 확인해 주세요.",
                      );
                    }
                  },
                ],
                ["취소", () => showSaveDelete(ui, done)],
              ],
            );
          },
        ]),
        ["뒤로", back],
      ],
    );
  } catch {
    ui.notify("세이브 목록을 읽지 못했어요.");
  }
}
