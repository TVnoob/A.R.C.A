// main.js
import { registerRootChestKitUI } from "./systems/rcuis/rootchestkitUI.js";
import { registerRootChestLibraryUI } from "./systems/rcuis/rootchestlib.js";
import { registerRootChestLoader } from "./systems/rcuis/loadrc.js";
import { startRootChestAutoReload, registerAutoReloadEvents } from "./systems/rcuis/autoreloadrc.js";
import { showGroupEditorUI } from "./systems/rcuis/groupManager.js"
import { showCycleSettingGPUI } from "./systems/rcuis/gpload.js"
import { registerGroupManualUI } from "./systems/rcuis/groupManualC.js"

startRootChestAutoReload();
registerRootChestLoader();
registerRootChestLibraryUI();
registerRootChestKitUI();
showGroupEditorUI();
showCycleSettingGPUI();
registerAutoReloadEvents();
registerGroupManualUI();