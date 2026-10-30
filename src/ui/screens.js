import { showFishing } from "./screens/fishing.js";
import { showOven } from "../ovenUI.js";
import { showSleep } from "./screens/rest.js";
import { showCafe } from "./screens/cafe.js";
import { showBaking } from "../bakingUI.js";
import { openCustomerDialogue, openStaffDialogue } from "../serviceDialogue.js";
import { showAudio, showMenu } from "./screens/settings.js";
import { showInventory, showJournal } from "./screens/journal.js";
import { showWarehouse, showShop, showShelf } from "./screens/bakery.js";
import { showParcel, showSupplies } from "./screens/services.js";

import {
  showWorkshop,
  showWorkshopMolds,
  showWorkshopOven,
} from "./screens/workshop.js";
import { showBakeryGuide } from "./screens/guide.js";
export const screens = {
  fishing: showFishing,
  bakeryGuide: showBakeryGuide,
  workshop: showWorkshop,
  workshopMolds: showWorkshopMolds,
  workshopOven: showWorkshopOven,
  moldTalk: (ui) => openStaffDialogue(ui.g, "mold"),
  furnaceTalk: (ui) => openStaffDialogue(ui.g, "furnace"),
  sleep: showSleep,
  cafe: showCafe,
  cafeTalk: (ui) => openStaffDialogue(ui.g, "cafe"),
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
  ovenBatch: showOven,
  customerTalk: (ui) => openCustomerDialogue(ui.g),
  postTalk: (ui) => openStaffDialogue(ui.g, "post"),
  storeTalk: (ui) => openStaffDialogue(ui.g, "store"),
};
