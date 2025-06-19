// main.js
import { registerRootChestKitUI } from "./systems/rcuis/rootchestkitUI.js";
import { registerRootChestLibraryUI } from "./systems/rcuis/rootchestlib.js";
import { registerRootChestLoader } from "./systems/rcuis/loadrc.js";
import { startRootChestAutoReload } from "./systems/rcuis/autoreloadrc.js";
import { showGroupEditorUI } from "./systems/rcuis/groupManager.js"

startRootChestAutoReload();
registerRootChestLoader();
registerRootChestLibraryUI();
registerRootChestKitUI();
showGroupEditorUI();