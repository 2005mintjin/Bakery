// A disposable UI session: no audio playback state is written to the save file.
export function playPerformance(g, actor, song, onComplete, createAudio = () => new Audio()) {
  const ui = g.ui, state = g.state, scene = state.scene;
  let disposed = false, finished = false, audio;
  const valid = () => g.state === state && state.scene === scene;
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    document.removeEventListener("visibilitychange", visibility);
    if (audio) {
      audio.onended = null; audio.onerror = null;
      audio.pause(); audio.removeAttribute("src"); audio.load(); audio.remove();
    }
    g.music.holdForPerformance(false);
    if (ui.currentPanel === "charlottePerformance") ui.currentPanel = null;
  };
  const finish = () => {
    if (finished || disposed) return;
    finished = true;
    cleanup();
    if (valid()) onComplete(); else ui.close();
  };
  const play = () => {
    if (disposed || !valid() || document.hidden) return;
    Promise.resolve(audio.play()).catch(() => {
      if (!disposed) {
        ui.notify("연주를 재생하지 못했어요. 다시 재생하거나 건너뛰어 주세요.");
        ui.overlay.querySelector("[data-performance-status]").textContent = "재생이 멈췄어요. 다시 재생 버튼을 눌러 주세요.";
      }
    });
  };
  function visibility() {
    if (disposed) return;
    if (document.hidden) audio.pause(); else play();
  }
  ui.panel(
    `<h2>샬롯의 연주</h2><div class="portrait-scene indoor dialogue-portrait"><img src="${actor.portraitAsset}" alt="샬롯"></div><p data-performance-status>우쿨렐레 연주를 듣고 있어요.</p><p>스페이스 바 또는 건너뛰기 버튼으로 연주를 마칠 수 있어요. ESC로 대화를 취소할 수 있어요.</p>`,
    [["연주 건너뛰기 · Space", finish], ["다시 재생", () => { if (audio.error) audio.load(); audio.currentTime = 0; play(); }]],
  );
  ui.overlay.querySelector(".panel").classList.add("dialogue-panel");
  ui.currentPanel = "charlottePerformance";
  audio = createAudio();
  audio.id = "charlotte-performance";
  audio.preload = "auto";
  audio.src = song.asset;
  audio.volume = g.music.volume;
  audio.muted = g.music.muted;
  audio.hidden = true;
  audio.onended = finish;
  audio.onerror = () => {
    if (!disposed) {
      ui.notify("연주 파일을 읽지 못했어요. 다시 재생하거나 건너뛰어 주세요.");
      ui.overlay.querySelector("[data-performance-status]").textContent = "연주 파일을 읽지 못했어요.";
    }
  };
  ui.overlay.append(audio);
  g.voices?.silence();
  g.music.holdForPerformance(true);
  ui.dialogueController = {
    dispose: cleanup,
    handleKey(e) {
      if (e.code !== "Space" && e.key !== " ") return false;
      e.preventDefault();
      if (!e.repeat) finish();
      return true;
    },
  };
  document.addEventListener("visibilitychange", visibility);
  play();
  return { finish, cleanup };
}
