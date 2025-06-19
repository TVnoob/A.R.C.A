// scripts/autoreloadrc.js
import { world, system, ItemStack } from "@minecraft/server";
import { CHEST_DATA_KEY } from "../consts.js";
const RELOAD_INTERVALS_KEY = "rootchest_reload_intervals";

// 1秒 = 20tick（runInterval を毎秒に設定）
let timerMap = {};

export function startRootChestAutoReload() {
  system.runInterval(() => {
    const rawData = world.getDynamicProperty(CHEST_DATA_KEY) ?? "{}";
    const rawIntervals = world.getDynamicProperty(RELOAD_INTERVALS_KEY) ?? "{}";

    const chestMap = JSON.parse(rawData);
    const intervalMap = JSON.parse(rawIntervals);

    for (const [chestID, intervalMin] of Object.entries(intervalMap)) {
      const data = chestMap[chestID];
      if (!validateChestData(data)) continue;

      timerMap[chestID] = (timerMap[chestID] ?? 0) + 1; // 毎秒加算

      if (timerMap[chestID] >= intervalMin * 60) { // 分単位 → 秒換算
        timerMap[chestID] = 0;
        placeRootChest(data);
        console.warn(`⏱️ RootChest "${chestID}" 再生成完了`);
      }
    }
  }, 20); // 毎秒（20tick）
}

function placeRootChest(data, player) {
  const { position, defaultTries, slotCount, items } = data;
  const blockLoc = {
    x: Math.floor(position[0]),
    y: Math.floor(position[1]),
    z: Math.floor(position[2])
  };

  const block = world.getDimension("overworld").getBlock(blockLoc);
  if (!block) {
    player.sendMessage("§c❌ チェストを配置できるブロックが見つかりません。");
    return;
  }

  block.setType("minecraft:chest");
  const inv = block.getComponent("minecraft:inventory");
  if (!inv) {
    player.sendMessage("§c❌ チェストのインベントリにアクセスできません。");
    return;
  }

  let slotIndex = 0;

  for (const item of items) {
    if (slotIndex >= slotCount) break;

    const tries = item.useDefaultTries ? defaultTries : item.customTries;
    let count = 0;

    for (let i = 0; i < tries; i++) {
      if (Math.random() * 100 < item.chance) count++;
    }

    if (count > 0) {
      try {
        inv.container.setItem(slotIndex++, new ItemStack(item.id, count));
      } catch (e) {
        console.warn(`⚠️ アイテム挿入エラー (${item.id}): ${e}`);
      }
    }
  }
}


function validateChestData(data) {
  if (!data || !Array.isArray(data.position) || data.position.length !== 3) return false;
  if (!data.defaultTries || !data.slotCount) return false;
  if (!Array.isArray(data.items)) return false;
  const validItems = data.items.filter(i => i.id && typeof i.chance === "number" && i.chance > 0);
  return validItems.length > 0;
}

export function resetAllTimerMap() {
  system.afterEvents.scriptEventReceive.subscribe((event) => {
  const { id, message } = event;
    if (id === "lc:rset") {
      for (const id in timerMap) {
        timerMap[id] = 0;
      }
    }
  });
}
