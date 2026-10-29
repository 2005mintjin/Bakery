import { title } from "../../title.js";
import { saveSlot, loadSlot } from "../../saveSystem.js";
import { repairPosition } from "../../sceneManager.js";

export function showAudio(ui) {
  const s = ui.g.state;
  {
    const music = ui.g.music;
    ui.panel(
      '<h2>배경음악</h2><p id="music-title"></p><label class="volume-label">음량 <input id="music-volume" aria-label="배경음악 음량" type="range" min="0" max="100" step="1"><output id="music-value"></output></label><p class="muted">마을: Sunlight on Cobblestones / 빵집: Midnight at the Parlour<br>판매실과 작업실 사이에서는 같은 곡이 이어집니다.</p>',
      [
        [
          music.muted ? "음소거 해제" : "음소거",
          () => {
            music.setMuted(!music.muted);
            ui.show("audio");
          },
        ],
        [
          "음악 재생",
          () => {
            music.start(s.scene);
            ui.notify(
              ui.g.started
                ? "음악을 재생합니다"
                : "타이틀 미리듣기 · 게임을 시작하면 장소에 맞춰 바뀝니다",
            );
          },
        ],
      ],
    );
    ui.overlay.querySelector("#music-title").textContent = music.title;
    const slider = ui.overlay.querySelector("#music-volume"),
      output = ui.overlay.querySelector("#music-value");
    slider.value = Math.round(music.volume * 100);
    output.textContent = slider.value + "%";
    slider.oninput = () => {
      music.setVolume(Number(slider.value) / 100);
      output.textContent = slider.value + "%";
    };
    if (!ui.g.started) {
      const b = document.createElement("button");
      b.textContent = "타이틀로 돌아가기";
      b.onclick = () => title(ui.g);
      ui.overlay.querySelector(".panel-actions").append(b);
    }
  }
}

export function showMenu(ui) {
  const s = ui.g.state;
  ui.panel(
    "<h2>잠깐 쉬어가기</h2><p>현재 세이브 " +
      ui.g.slot +
      " · 게임 폴더 saves에 저장됩니다.</p>",
    [
      [
        "저장",
        async () => {
          try {
            await saveSlot(ui.g.slot, s);
            ui.notify("파일에 저장했어요");
            ui.close();
          } catch {
            ui.notify("저장 실패: 서버와 폴더 쓰기 권한을 확인하세요");
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
      ["퇴근·잠자기", () => ui.show("sleep")],
      ["음악 설정", () => ui.show("audio")],
      ["플레이어 이미지 불러오기", () => ui.g.spritePicker()],
      [
        "기본 캐릭터로 복원",
        () => {
          ui.g.sprite.useDefault();
          ui.notify("첨부 원본 캐릭터로 복원했어요");
          ui.close();
        },
      ],
    ],
  );
}
