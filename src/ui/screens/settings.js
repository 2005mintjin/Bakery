import { showSaveDelete } from "../saveDelete.js";
import { title } from "../../title.js";
import { saveSlot, loadSlot } from "../../saveSystem.js";
import { repairPosition } from "../../sceneManager.js";

import { saveLocation, browserMode } from "../../save/mode.js";
import { exportSave, importSave } from "../saveTransfer.js";
export function showAudio(ui) {
  const music = ui.g.music;
  ui.panel(
    '<h2>소리 설정</h2><p id="music-title"></p><label class="volume-label">음악·효과음 <input id="music-volume" aria-label="배경음악 음량" type="range" min="0" max="100" step="1"><output id="music-value"></output></label><label class="volume-label">캐릭터 음성 <input id="voice-volume" aria-label="캐릭터 음성 음량" type="range" min="0" max="100" step="1"><output id="voice-value"></output></label><p class="muted">음악·효과음은 배경음악, 샬롯의 연주와 노크음에 적용됩니다.<br>캐릭터 음성은 대화 목소리에만 적용됩니다. 각각 0%로 조절하면 해당 소리만 꺼집니다.<br>음소거 버튼은 모든 소리를 끕니다.</p>',
    [
      [music.muted ? "음소거 해제" : "음소거", () => {
        music.setMuted(!music.muted);
        ui.g.voices?.silence();
        ui.show("audio");
      }],
      ["음악 재생", () => {
        music.start(ui.g.state.scene);
        ui.notify(ui.g.started ? "음악을 재생합니다" : "타이틀 미리듣기 · 게임을 시작하면 장소에 맞춰 바뀝니다");
      }],
    ],
  );
  ui.overlay.querySelector("#music-title").textContent = music.title;
  for (const [id, volume, setVolume] of [
    ["music", music.volume, value => music.setVolume(value)],
    ["voice", music.voiceVolume, value => music.setVoiceVolume(value)],
  ]) {
    const slider = ui.overlay.querySelector(`#${id}-volume`);
    const output = ui.overlay.querySelector(`#${id}-value`);
    slider.value = Math.round(volume * 100);
    output.textContent = slider.value + "%";
    slider.oninput = () => {
      setVolume(Number(slider.value) / 100);
      if (id === "voice") ui.g.voices?.silence();
      output.textContent = slider.value + "%";
    };
  }
  if (!ui.g.started) {
    const b = document.createElement("button");
    b.textContent = "타이틀로 돌아가기";
    b.onclick = () => title(ui.g);
    ui.overlay.querySelector(".panel-actions").append(b);
  }
}

export function showMenu(ui) {
  const s = ui.g.state;
  ui.panel(
    "<h2>잠깐 쉬어가기</h2><p>현재 세이브 " +
      ui.g.slot +
      " · " +
      saveLocation() +
      "</p>",
    [
      [
        "저장",
        async () => {
          try {
            await saveSlot(ui.g.slot, s);
            ui.notify(
              browserMode ? "이 브라우저에 저장했어요" : "파일에 저장했어요",
            );
            ui.close();
          } catch {
            ui.notify(
              browserMode
                ? "저장 실패: 브라우저 저장 허용과 남은 공간을 확인하세요"
                : "저장 실패: 서버와 폴더 쓰기 권한을 확인하세요",
            );
          }
        },
      ],
      [
        "불러오기",
        async () => {
          try {
            ui.g.state = repairPosition(await loadSlot(ui.g.slot));
            ui.close();
          } catch {
            ui.notify("저장 파일을 읽지 못했어요");
          }
        },
      ],
      [
        "타이틀로 돌아가기",
        () =>
          ui.panel(
            "<h2>타이틀로 돌아갈까요?</h2><p>저장하지 않은 진행은 사라집니다.</p>",
            [["돌아가기", () => title(ui.g)]],
          ),
      ],
      ["세이브 삭제", () => showSaveDelete(ui, () => title(ui.g))],
      ["세이브 파일 내보내기", () => exportSave(ui)],
      ["세이브 파일 가져오기", () => importSave(ui, () => title(ui.g))],
      ["빵집 이용 안내", () => ui.show("bakeryGuide")],
      ["지난 결산 보기", () => ui.show("nightReport")],
      ["퇴근·잠자기", () => ui.show("sleep")],
      ["소리 설정", () => ui.show("audio")],
    ],
  );
}
