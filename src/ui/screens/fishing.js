import {
  castLine,
  reelLine,
  nearFishingSpot,
  fishingRules,
} from "../../fishing.js";
export function showFishing(ui) {
  const s = ui.g.state;
  if (!nearFishingSpot(s)) {
    ui.notify("호숫가 부두 끝에서 낚시해 주세요.");
    return;
  }
  const phase = s.fishing?.phase;
  const active = ["waiting", "bite"].includes(phase);
  const messages = {
    waiting: "찌가 움직일 때까지 기다려 주세요…",
    bite: "물고기가 물었어요! 지금 낚아채세요!",
    caught: "생선 1마리를 잡았어요! 재료 가방에 넣었어요.",
    early: "조금 빨랐어요. 찌가 움직인 뒤 낚아채세요.",
    missed: "물고기가 달아났어요. 다시 도전해 볼까요?",
  };
  ui.panel(
    `<h2>서쪽 호숫가 · 낚시</h2><div class="fishing-water ${phase === "bite" ? "has-bite" : ""}" aria-hidden="true"><span>〰</span><b>🎣</b><span>〰</span></div><p role="status">${messages[phase] || "공용 낚싯대를 사용해 물고기를 잡아 보세요."}</p><p>가진 생선 ${s.items.fish}마리 · 기력 ${s.stamina}/100</p><p>한 번 던질 때 기력 ${fishingRules.stamina} · 게임 시간 ${fishingRules.minutes}분 소모<br>입질이 오면 ${fishingRules.biteSeconds}초 안에 버튼 또는 스페이스 바!<br>생선 2마리로 생선파이 속을 만들 수 있어요. 파이 틀은 공방에서 구매해요.</p><p>닫으면 현재 낚시는 취소돼요. 소모한 기력은 돌아오지 않아요.</p>`,
    [
      [
        active ? "낚아채기 · Space" : "낚싯대 던지기",
        () => {
          if (active) reelLine(s);
          else {
            const result = castLine(s);
            if (result !== "cast")
              ui.notify(
                result === "tired"
                  ? "낚시할 기력이 부족해요. 휴식을 취해 주세요."
                  : "부두 끝에서 다시 시도해 주세요.",
              );
          }
          ui.show("fishing");
        },
      ],
    ],
  );
  const tabHandler = ui.overlay.onkeydown;
  ui.overlay.onkeydown = (e) => {
    tabHandler?.(e);
    if (e.code !== "Space" || e.target.classList.contains("panel-close"))
      return;
    e.preventDefault();
    e.stopPropagation();
    if (!e.repeat) ui.overlay.querySelector(".panel-actions button")?.click();
  };
}
