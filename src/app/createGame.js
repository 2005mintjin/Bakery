import { DialogueVoice } from "../dialogueVoice.js";
import { loadResidentArt } from "../residentArt.js";
import { loadStaffArt } from "../staffArt.js";
import { gardenAssets } from "../gardenArt.js";
import { loadCounterArt } from "../counterArt.js";
import { Effects } from "../effects.js";
import { Music } from "../audio.js";
import { Interior } from "../interior.js";
import { configureWorld } from "../sceneManager.js";
import { loadScenery } from "../scenery.js";
import { PlayerSprite } from "../playerSprite.js";
import { fresh } from "../saveSystem.js";
import { UI } from "../ui.js";
import { Renderer } from "../renderer.js";
export async function createGame(data) {
  const g = { state: fresh(), keys: new Set(), data };
  g.ui = new UI(g);
  g.music = new Music(data.music, {
    onError: (message) => g.ui.notify(message),
  });
  g.music.audio.id = "background-music";
  g.music.audio.hidden = true;
  document.body.append(g.music.audio);
  g.fx = new Effects(g.music);
  g.voices = new DialogueVoice(data.voices, g.music, {
    getContext: () => g.fx.context,
    onError: (message) => g.ui.notify(message),
  });

  configureWorld(data.worldMaps);
  const backgrounds = { ...data.worldMaps, ...data.interiorBackgrounds };
  const [scenery, counterArt, gardenSprites, staffArt, residentArt] =
    await Promise.all([
      loadScenery(backgrounds),
      loadCounterArt([
        ...data.npcs,
        ...data.customers.map((c) => ({ ...c, id: c.portrait })),
      ]),
      loadScenery(gardenAssets),
      loadStaffArt(data.serviceDialogues.staff),
      loadResidentArt(data.npcs),
    ]);
  const renderer = new Renderer(
    document.querySelector("canvas"),
    data.city,
    scenery,
    backgrounds,
    counterArt,
  );
  renderer.gardenSprites = gardenSprites;
  renderer.staffArt = staffArt;
  renderer.residentArt = residentArt;
  g.interior = new Interior(g);
  g.sprite = new PlayerSprite(data.playerAtlas, data.playerAnimations);
  g.sprite.loading.catch(() =>
    g.ui.notify("캐릭터 이미지를 불러오지 못했어요. 새로고침해 주세요."),
  );
  g.spritePicker = () => g.sprite.pick(g.ui);
  return { game: g, renderer };
}
