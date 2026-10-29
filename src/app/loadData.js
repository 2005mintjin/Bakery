import { validateStaffStories } from "../staffStory.js";
export async function loadGameData() {
  const data = {};
  for (const key of [
    "npcs",
    "quests",
    "recipes",
    "dialogues",
    "city",
    "playerAtlas",
    "playerAnimations",
    "worldMaps",
    "interiorBackgrounds",
    "music",
    "storeItems",
    "customers",
    "serviceDialogues",
    "staffStories",
  ]) {
    const r = await fetch(`data/${key}.json`);
    if (!r.ok) throw Error(key);
    data[key] = await r.json();
  }
  validateStaffStories(data.staffStories);
  return data;
}
