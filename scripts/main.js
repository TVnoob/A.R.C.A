// main.js
import { registerRootChestKitUI } from "./systems/rcuis/rootchestkitUI";
import { registerRootChestLibraryUI } from "./systems/rcuis/rootchestlib";
import { registerRootChestLoader } from "./systems/rcuis/loadrc.js";
import { startRootChestAutoReload } from "./systems/rcuis/autoreloadrc.js";

startRootChestAutoReload();
registerRootChestLoader();
registerRootChestLibraryUI();
registerRootChestKitUI();