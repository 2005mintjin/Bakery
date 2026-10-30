import { loadGameData } from "./app/loadData.js";
import { createGame } from "./app/createGame.js";
import { bindInput } from "./app/input.js";
import { startGameLoop } from "./app/gameLoop.js";
import { title } from "./title.js";
async function boot() {
  const data = await loadGameData();
  const { game, renderer } = await createGame(data);
  title(game);
  bindInput(game);
  startGameLoop(game, renderer);
  game.ui.notify("달빛마을에 오신 것을 환영해요. E로 이웃과 인사해요.");
}

boot().catch((e) => {
  document.querySelector("#hint").textContent =
    "게임 데이터를 읽지 못했습니다. 연결을 확인하고 새로고침해 주세요. PC 버전은 게임 실행.bat으로 시작하세요.";
  const overlay = document.querySelector("#overlay");
  overlay.hidden = false;
  overlay.innerHTML =
    '<section class="panel" role="alert"><h2>마을에 연결하지 못했어요</h2><p>연결을 확인하고 다시 시도해 주세요. PC 버전은 게임 실행.bat으로 시작하세요.</p></section>';
  const retry = document.createElement("button");
  retry.textContent = "다시 불러오기";
  retry.onclick = () => location.reload();
  overlay.querySelector(".panel").append(retry);
  console.error(e);
});
