import { movementKeys } from "../inputDirections.js";
import { tickFishing } from "../fishing.js";
import { advanceClock } from "../wellbeing.js";
import { move } from "../player.js";
import { transition } from "../sceneManager.js";
import { residents } from "../npc.js";
import { isInterior } from "../interior.js";
import { tickShop } from "../shop.js";
import { tickBaking } from "../baking.js";
import { updateHint } from "../ui/hints.js";
export function startGameLoop(g, renderer) {
  const data = g.data;
  let prev = performance.now();
  function frame(now) {
    const dt = Math.min((now - prev) / 1000, 0.05);
    prev = now;
    let walking = false;
    g.touchControls?.update();
    if (g.started && !g.ui.open && !document.hidden) {
      if (!isInterior(g.state.scene)) {
        walking = move(
          g.state,
          movementKeys(g.keys, g.touchKeys),
          dt,
          residents(g),
        );
        transition(g.state);
      }
      const previousCustomerPhase = g.state.shop.customer?.phase;
      if (tickShop(g.state, dt, data.customers)) {
        g.fx.knock();
        g.ui.notify("똑똑! 손님이 문을 두드려요. 카운터로 오고 있어요.");
      }
      if (
        previousCustomerPhase === "knocking" &&
        g.state.shop.customer?.phase === "waiting"
      )
        g.ui.notify("손님이 카운터 앞에 왔어요. 주문을 확인하세요.");
      advanceClock(g.state, dt * 2);
    }
    if (g.started && !document.hidden && tickBaking(g.state, dt)) {
      g.ui.notify(
        g.state.oven.kind === "drying"
          ? "베리가 다 말랐어요! 오븐에서 꺼내 주세요."
          : "빵이 다 구워졌어요! 작업실에서 꺼내 주세요.",
      );
      if (g.ui.open && g.ui.currentPanel === "ovenBatch")
        g.ui.show("ovenBatch");
    }
    if (
      g.started &&
      !document.hidden &&
      g.ui.open &&
      g.ui.currentPanel === "fishing" &&
      tickFishing(g.state, dt)
    )
      g.ui.show("fishing");
    if (g.started) g.music.update(g.state.scene);
    renderer.draw(g, walking, now / 1000);
    g.interior.update();
    updateHint(g);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
