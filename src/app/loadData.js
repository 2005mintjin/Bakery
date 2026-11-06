import { validateCivicStories } from "../civicStory.js";
import { validateTownStories } from "../townStory.js";
import { validateStaffStories } from "../staffStory.js";
export async function loadGameData() {
  const data = {};
  for (const key of [
    "npcs",
    "civicActors",
    "civicStories",
    "quests",
    "recipes",
    "dialogues",
    "city",
    "charlotte",
    "staffSchedule",
    "downtown",
    "playerAtlas",
    "playerAnimations",
    "worldMaps",
    "interiorBackgrounds",
    "music",
    "storeItems",
    "customers",
    "serviceDialogues",
    "staffStories",
    "townStories",
    "cafeItems",
    "voices",
    "tutorial",
    "lighting",
    "restScene",
  ]) {
    const r = await fetch(`data/${key}.json`);
    if (!r.ok) throw Error(key);
    data[key] = await r.json();
  }
  validateCivicStories(data.civicStories);
  validateStaffStories(data.staffStories);
  validateTownStories(data.townStories);
  return data;
}
