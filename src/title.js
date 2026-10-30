import { repairPosition } from "./sceneManager.js";
import { fresh, slots, saveSlot, loadSlot, load } from "./saveSystem.js";
import { browserMode, saveLocation } from "./save/mode.js";
import { importSave } from "./ui/saveTransfer.js";
import { showSaveDelete } from "./ui/saveDelete.js";
import { demoEdition } from "./edition.js";
export async function title(g) {
  g.started = false;
  g.music?.stop();
  g.ui.panel("<h2>펜서 베이커리</h2><p>세이브 파일을 찾고 있어요…</p>");
  try {
    const list = await slots();
    const actions = list.map((slot) => [
      `${slot.id}번 · ${slot.empty ? "새로운 이야기" : slot.corrupt ? "손상된 파일 (복원 필요)" : `${slot.day}일째 / ${slot.money}G`}`,
      async () => {
        if (slot.corrupt) {
          g.ui.notify("세이브 파일 가져오기로 백업을 복원해 주세요.");
          return;
        }
        g.music?.start(slot.scene || "town");
        try {
          const s = slot.empty ? fresh() : await loadSlot(slot.id);
          if (slot.empty) await saveSlot(slot.id, s);
          g.state = repairPosition(s);
          g.slot = slot.id;
          g.started = true;
          g.ui.close();
          if (slot.empty)
            g.ui.panel(
              "<h2>달빛마을로 온 편지</h2><p>할아버지의 빵집 펜서 베이커리를 물려받은 당신.<br>낯선 골목에도, 오늘은 고소한 빵 냄새가 피어납니다.<br>주민들의 이야기를 듣고 당신만의 하루를 만들어 보세요.</p>",
              [["나의 첫 아침 시작", () => g.ui.close()]],
            );
        } catch {
          g.music?.stop();
          g.ui.notify("세이브 파일을 열 수 없어요");
        }
      },
    ]);
    actions.push(["세이브 삭제", () => showSaveDelete(g.ui, () => title(g))]);
    actions.push([
      "세이브 파일 가져오기",
      () => importSave(g.ui, () => title(g)),
    ]);
    actions.push([
      "이전 브라우저 저장을 빈 슬롯으로 옮기기",
      async () => {
        try {
          const old = load(),
            empty = list.find((x) => x.empty);
          if (!old || !empty) {
            g.ui.notify("이전 저장 또는 빈 슬롯이 없어요");
            return;
          }
          await saveSlot(empty.id, old);
          await title(g);
        } catch {
          g.ui.notify("이전 저장을 옮길 수 없어요");
        }
      },
    ]);
    g.ui.panel(
      `<div class="title-mark">✦</div><span class="eyebrow">FENCER BAKERY · SECOND CHAPTER</span><h2>펜서 베이커리${demoEdition ? " · 데모" : ""}</h2><p>빵 한 조각, 새로운 이웃, 그리고 당신의 이야기.</p><p class="muted">세이브를 골라 시작하세요. ${saveLocation()}</p>`,
      actions,
    );
  } catch {
    g.ui.panel(
      browserMode
        ? "<h2>브라우저 저장을 사용할 수 없어요</h2><p>이 사이트의 저장소 접근을 허용하고 다시 시도하세요. 시크릿 모드나 저장 공간 부족 여부도 확인해 주세요.</p>"
        : "<h2>게임 서버가 필요해요</h2><p>파일 세이브를 사용하려면 최신 게임 폴더의 launch.bat 또는 npm start로 실행해 주세요.</p>",
      [["다시 확인", () => title(g)]],
    );
  }
}
