import { showSleep } from "./screens/rest.js";
import { showCafe } from "./screens/cafe.js";
import { showBaking } from "../bakingUI.js";
import { openCustomerDialogue, openStaffDialogue } from "../serviceDialogue.js";
import { showAudio, showMenu } from "./screens/settings.js";
import { showInventory, showJournal } from "./screens/journal.js";
import { showWarehouse, showShop, showShelf } from "./screens/bakery.js";
import { showParcel, showSupplies } from "./screens/services.js";

export const screens = {
  sleep: showSleep,
  cafe: showCafe,
  audio: showAudio,
  menu: showMenu,
  inventory: showInventory,
  journal: showJournal,
  warehouse: showWarehouse,
  shop: showShop,
  shelf: showShelf,
  parcel: showParcel,
  supplies: showSupplies,
  oven: showBaking,
  customerTalk: (ui) => openCustomerDialogue(ui.g),
  postTalk: (ui) => openStaffDialogue(ui.g, "post"),
  storeTalk: (ui) => openStaffDialogue(ui.g, "store"),
};
