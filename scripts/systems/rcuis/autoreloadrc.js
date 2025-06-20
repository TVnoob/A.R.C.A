// scripts/autoreloadrc.js
import { world, system, ItemStack } from "@minecraft/server";
import { CHEST_DATA_KEY, RELOAD_INTERVALS_KEY, GROUP_MEMBERS_KEY, GROUP_SETTINGS_KEY } from "../consts.js";

// 1秒 = 20tick（runInterval を毎秒に設定）
let timerMap = {};
let groupTimerMap = {};

export function startRootChestAutoReload() {
  system.runInterval(() => {
    const rawData = world.getDynamicProperty(CHEST_DATA_KEY) ?? "{}";
    const rawIntervals = world.getDynamicProperty(RELOAD_INTERVALS_KEY) ?? "{}";
    const rawGroups = world.getDynamicProperty(GROUP_MEMBERS_KEY) ?? "{}";
    const rawGroupSettings = world.getDynamicProperty(GROUP_SETTINGS_KEY) ?? "{}";

    const chestMap = JSON.parse(rawData);
    const intervalMap = JSON.parse(rawIntervals);
    const groupMap = JSON.parse(rawGroups);
    const groupSettings = JSON.parse(rawGroupSettings);

    // 📦 単一チェスト再生成
    for (const [chestID, intervalMin] of Object.entries(intervalMap)) {
      const data = chestMap[chestID];
      if (!validateChestData(data)) continue;

      timerMap[chestID] = (timerMap[chestID] || 0) + 1;
      if (timerMap[chestID] >= intervalMin * 60) {
        timerMap[chestID] = 0;
        placeRootChest(data);
        console.warn(`⏱️ [Single] RootChest "${chestID}" 再生成完了`);
      }
    }

    // 🧩 グループチェスト再生成
    for (const [grp, members] of Object.entries(groupMap)) {
      const settings = groupSettings[grp];
      if (!settings) continue;

      const { interval, chance = 100, count = 1 } = settings;
      groupTimerMap[grp] = (groupTimerMap[grp] || 0) + 1;

      if (groupTimerMap[grp] >= interval * 60) {
        groupTimerMap[grp] = 0;

        if (Math.random() * 100 < chance) {
          const validIDs = members.filter(id => validateChestData(chestMap[id]));
          const shuffle = validIDs.sort(() => .5 - Math.random());
          const pick = shuffle.slice(0, Math.min(count, shuffle.length));

          for (const id of pick) {
            placeRootChest(chestMap[id]);
            console.warn(`⏱️ [Group:${grp}] "${id}" を再生成しました`);
          }
        }
      }
    }

  }, 20);
}


function placeRootChest(data) {
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


export function registerAutoReloadEvents() {
  // 全チェスト再リセット
  system.afterEvents.scriptEventReceive.subscribe(event => {
    if (event.id === "lc:rset") {
      for (const k in timerMap) timerMap[k] = 0;
      for (const key in groupTimerMap) groupTimerMap[key] = 0;
      console.warn("[AutoReload] 全チェストのリセットを実行しました");
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

export function resetAllTimerMap() {
  system.run(() => world.sendMessage("lc:rset"));
  console.warn("scriptevent lc:rset was success!")
}
