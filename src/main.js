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
    "게임 데이터를 읽지 못했습니다. npm start로 실행해 주세요.";
  console.error(e);
});
