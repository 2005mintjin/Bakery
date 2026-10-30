import { names } from "../../inventory.js";
import { maxStamina } from "../../wellbeing.js";
export function showNightReport(ui) {
  const report = ui.g.state.lastNight;
  if (!report) {
    ui.panel(
      "<h2>하루 결산</h2><p>퇴근 후 잠자리에 들면 오늘의 결산을 볼 수 있어요.</p>",
    );
    return;
  }
  const count = Object.values(report.sold).reduce((a, b) => a + b, 0);
  const net = report.sales + report.rewards - report.expenses;
  const art = ui.g.data.restScene;
  ui.panel(
    `<div class="panel-eyebrow">GOOD NIGHT · 펜서의 하루</div><h2>${report.day}일째 · 하루 결산</h2><div class="night-report"><figure class="sleep-picture"><img src="${art.asset}" alt="${art.alt}"><figcaption>오늘도 수고했어요, 펜서. 좋은 꿈 꾸세요.</figcaption></figure><div class="night-totals"><dl><div><dt>빵 판매 수익</dt><dd data-night="sales">${report.sales} G</dd></div><div><dt>퀘스트 보상</dt><dd>${report.rewards} G</dd></div><div><dt>구입·개량 지출</dt><dd data-night="expenses">${report.expenses ? "−" : ""}${report.expenses} G</dd></div><div class="night-net"><dt>오늘의 수입 − 지출</dt><dd data-night="net">${net > 0 ? "+" : ""}${net} G</dd></div><div><dt>판매 수량 · 응대한 손님</dt><dd>${count}개 · ${report.customers}명</dd></div><div><dt>마감 소지금</dt><dd>${report.money} G</dd></div></dl><h3>오늘 판매한 빵</h3><ul class="night-products">${
      Object.entries(report.sold)
        .filter(([, n]) => n > 0)
        .map(([id, n]) => `<li><span>${names[id]}</span><b>${n}개</b></li>`)
        .join("") || "<li>오늘은 판매한 빵이 없어요.</li>"
    }</ul><p class="night-rest">${(report.rest.duration / 60).toFixed(1)}시간 수면 · 기력 +${report.rest.recovered}<br>기상 시 기력 ${report.rest.stamina}/${maxStamina} · ${report.wakeDay}일째 오전 6시</p></div></div>`,
    [
      [
        "아침 맞이하기 · 오전 6시",
        () => {
          ui.close();
          ui.notify("좋은 아침이에요! 오늘도 따뜻한 빵을 구워 볼까요?");
        },
      ],
    ],
  );
  ui.overlay.querySelector(".panel")?.classList.add("night-panel");
}
