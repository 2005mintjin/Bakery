// Stable entry point: preserve imports and save compatibility across patches.
export { fresh } from "./save/defaultState.js";
export { validate } from "./save/validate.js";
export { save, load } from "./save/localStorage.js";
export { slots, loadSlot, saveSlot, deleteSlot } from "./save/api.js";
