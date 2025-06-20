import { PlayerPermissionLevel } from "@minecraft/server";

// import { <consts> } from "../consts.js";

export const CHEST_DATA_KEY = "rootchest_data_map";
export const RELOAD_INTERVALS_KEY = "rootchest_reload_intervals";

export function isOp(player) {
  return player?.playerPermissionLevel === PlayerPermissionLevel.Operator;
}