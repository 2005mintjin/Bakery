// Demo stays separate from the published game; promote only after user review.
export const demoEdition = true;
export const gamePort = demoEdition ? 5174 : 5173;
export const saveDirectory = demoEdition ? "saves-demo" : "saves";

export const webSavePrefix = demoEdition
  ? "little-hearth:demo:web:"
  : "little-hearth:web:";
