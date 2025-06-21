// scripts/autoreloadrc.js
import { world, system, ItemStack } from "@minecraft/server";
import { CHEST_DATA_KEY, RELOAD_INTERVALS_KEY, GROUP_MEMBERS_KEY, CHEST_PROB_MAP_KEY } from "../consts.js";

// 1秒 = 20tick（runInterval を毎秒に設定）
let timerMap = {};
let groupTimerMap = {};

export function startRootChestAutoReload() {
  system.runInterval(() => {
    const chestRaw = world.getDynamicProperty(CHEST_DATA_KEY) ?? "{}";
    const dataMap = JSON.parse(chestRaw);
    const probRaw = world.getDynamicProperty(CHEST_PROB_MAP_KEY) ?? "{}";
    const probMap = JSON.parse(probRaw);
    const groupRaw = world.getDynamicProperty(GROUP_MEMBERS_KEY) ?? "{}";
    const groupMap = JSON.parse(groupRaw);
    const intervalMap = JSON.parse(world.getDynamicProperty(RELOAD_INTERVALS_KEY) ?? "{}");

    // 📦 単一チェスト再生成
    for (const [chestID, intervalMin] of Object.entries(intervalMap)) {
      const data = dataMap[chestID];
      if (!validateChestData(data)) continue;

      timerMap[chestID] = (timerMap[chestID] || 0) + 1;
      if (timerMap[chestID] >= intervalMin * 60) {
        timerMap[chestID] = 0;
        placeRootChest(data);
        console.warn(`⏱️ [Single] RootChest "${chestID}" 再生成完了`);
      }
    }

    // 🧩 グループチェスト再生成
    for (const [groupName, chestIDs] of Object.entries(groupMap)) {
      if (!Array.isArray(chestIDs) || chestIDs.length === 0) continue;

      // タイマー初期化と進行
      groupTimerMap[groupName] = (groupTimerMap[groupName] ?? 0) + 1;

      // いずれかのチェストから周期を取得（group内の代表ID）
      const refID = chestIDs.find(cid => probMap[cid]);
      if (!refID) continue;

      const config = probMap[refID];
      if (!config || typeof config.count !== "number" || typeof config.chance !== "number") continue;

      const intervalSec = 60 * (world.getDynamicProperty("rootchest_reload_intervals")?.[refID] ?? 10);
      if (groupTimerMap[groupName] < intervalSec) continue;

      groupTimerMap[groupName] = 0;

      // --- 実行: 確率に基づいて最大count個だけ再生成 ---
      let spawnCount = 0;
      for (const cid of chestIDs) {
        if (spawnCount >= config.count) break;
        const data = dataMap[cid];
        if (!validateChestData(data)) continue;

        if (Math.random() * 100 < config.chance) {
          placeRootChest(data);
          spawnCount++;
        }
      }
    }

  }, 20);
}


export function placeRootChest(data) {
  const { position, defaultTries, slotCount, items } = data;
  const blockLoc = { x: Math.floor(position[0]), y: Math.floor(position[1]), z: Math.floor(position[2]) };
  const block = world.getDimension("overworld").getBlock(blockLoc);
  if (!block) return;

  block.setType("minecraft:chest");
  const invComp = block.getComponent("minecraft:inventory");
  if (!invComp) return;

  const container = invComp.container;
  let slotIndex = 0;

  for (const item of items) {
    if (slotIndex >= slotCount) break;
    const tries = item.useDefaultTries ? defaultTries : item.customTries;
    let count = 0;
    for (let i = 0; i < tries; i++) if (Math.random() * 100 < item.chance) count++;
    if (count > 0) {
      try {
        container.setItem(slotIndex++, new ItemStack(item.id, count));
      } catch {}
    }
  }
}

export function registerAutoReloadEvents() {  // 全チェスト再リセット
  system.afterEvents.scriptEventReceive.subscribe(event => {
    const { id, message, sourceEntity } = event; // ﾔｹｸｿの2回目const
    if (id === "lc:rset") {
      for (const k in timerMap) timerMap[k] = 0;
      for (const key in groupTimerMap) groupTimerMap[key] = 0;
      sourceEntity.sendMessage("[AutoReload] 全チェストのリセットを実行しました");
    }
  });
}

function validateChestData(data) {
  if (!data || !Array.isArray(data.position) || data.position.length !== 3) return false;
  if (!data.defaultTries || !data.slotCount) return false;
  if (!Array.isArray(data.items)) return false;
  const validItems = data.items.filter(i => i.id && typeof i.chance === "number" && i.chance > 0);
  return validItems.length > 0;
}

export function resetAllTimerMap() { // 内部スクリプト用
  for (const k in timerMap) timerMap[k] = 0;
  for (const key in groupTimerMap) groupTimerMap[key] = 0;
  console.warn("[AutoReload] 全チェストのリセットを実行しました");
}
