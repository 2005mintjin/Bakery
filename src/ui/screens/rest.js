import {
  sleepPreview,
  sleepUntilMorning,
  maxStamina,
} from "../../wellbeing.js";
export function showSleep(ui) {
  const s = ui.g.state;
  if (!["bakery", "bakeryKitchen"].includes(s.scene)) {
    ui.panel(
      "<h2>오늘의 휴식</h2><p>빵집으로 돌아가 영업 안내판에서 퇴근하거나, 빵집 안에서 이 메뉴를 열어 주세요.</p>",
    );
    return;
  }
  const rest = sleepPreview(s),
    hours = (rest.duration / 60).toFixed(1);
  ui.panel(
    `<h2>작은 화덕 · 다락방에서 쉬기</h2><p>잠자리에 들면 가게가 닫히고 오전 6시에 일어납니다.</p><p>예상 수면 ${hours}시간 · 기력 +${rest.recovered} → ${rest.stamina}/${maxStamina}</p><p class="muted">8시간 자면 충분히 회복합니다. 늦게 잘수록 회복량이 줄어요. 굽는 중인 빵은 아침에 오븐에서 꺼낼 수 있습니다.</p>`,
    [
      [
        "잠자기 · 오전 6시에 기상",
        () => {
          const result = sleepUntilMorning(s);
          ui.close();
          ui.notify(
            `좋은 아침이에요! ${(result.duration / 60).toFixed(1)}시간 수면 · 기력 +${result.recovered}`,
          );
        },
      ],
    ],
  );
}
