// scripts/rcuis/loadrc.js
import { world, system, ItemStack } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { resetAllTimerMap } from "./autoreloadrc.js";
import { CHEST_DATA_KEY, isOp } from "../consts.js";

const RELOAD_INTERVALS_KEY = "rootchest_reload_intervals";

export function registerRootChestLoader() {
  world.beforeEvents.itemUse.subscribe(event => {
    const { source, itemStack } = event;

    if (!itemStack || itemStack.typeId !== "system:loadrc") return;

    if (!source || !isOp(source)) {
      source?.sendMessage("§c権限がありません、オペレーターにオペレーター権限を要求してください");
      return;
    }

    system.run(() => {
      if (source.isSneaking) {
        showCycleSettingUI(source);
      } else {
        showLoadUI(source);
      }
    });
  });

  function showCycleSettingUI(player) {
    const raw = world.getDynamicProperty(CHEST_DATA_KEY) ?? "{}";
    const dataMap = JSON.parse(raw);
    const validIDs = Object.entries(dataMap)
      .filter(([_, data]) => validateChestData(data))
      .map(([id]) => id);

    if (validIDs.length === 0) {
      player.sendMessage("§e📦 登録されたRootChestがありません。");
      return;
    }

    const form = new ModalFormData()
      .title("RootChest 再生成周期設定")
      .dropdown("対象chestIDを選択", validIDs)
      .textField("再生成周期（分）", "10")
      .toggle("🌐 全ての生成周期を合わせる"); // 🆕

    form.show(player).then(res => {
      if (res.canceled) return;

      const index = res.formValues[0];
      const minutes = parseInt(res.formValues[1]);
      const applyToAll = res.formValues[2]; // 🆕

      if (isNaN(minutes) || minutes <= 0) {
        player.sendMessage("§c⛔ 無効な周期が入力されました。");
        return;
      }

      const id = validIDs[index];
      const rawMap = world.getDynamicProperty(RELOAD_INTERVALS_KEY) ?? "{}";
      const reloadMap = JSON.parse(rawMap);

      if (applyToAll) {
        for (const id of validIDs) {
          reloadMap[id] = minutes;
        }
        world.setDynamicProperty(RELOAD_INTERVALS_KEY, JSON.stringify(reloadMap));

        resetAllTimerMap();

        // reset timerMap in autoreloadrc.js if needed (not accessible here)
        player.sendMessage(`§a✅ 全${validIDs.length}件の周期を ${minutes}分 に統一しました。`);
      } else {
        reloadMap[id] = minutes;
        world.setDynamicProperty(RELOAD_INTERVALS_KEY, JSON.stringify(reloadMap));
        player.sendMessage(`§a✅ "${id}" の再生成周期を ${minutes}分 に設定しました。`);
      }
    });
  }


  function showLoadUI(player) {
    const raw = world.getDynamicProperty(CHEST_DATA_KEY) ?? "{}";
    const dataMap = JSON.parse(raw);
    const validIDs = Object.entries(dataMap)
      .filter(([_, data]) => validateChestData(data))
      .map(([id]) => id)
      .filter(id => typeof id === "string" && id.trim().length > 0);

    if (validIDs.length === 0) {
      player.sendMessage("§e📦 有効なRootChest IDがありません。");
      return;
    }

    const form = new ModalFormData()
      .title("RootChest ローダー")
      .textField("📥 対象chestIDを入力してください", "")
      .dropdown("📋 有効なchestID一覧", validIDs)
      .textField("🗑️ 自動読み込みの対象から外すchestIDを入力", "");

    form.show(player).then(res => {
      if (res.canceled) return;

      const inputID = (res.formValues[0] ?? "").trim();
      const selectedIndex = typeof res.formValues[1] === "number" ? res.formValues[1] : 0;
      const validID = validIDs[selectedIndex];
      const chosenID = inputID || validID;

      const excludeID = (res.formValues[2] ?? "").trim();

      if (excludeID) {
        const rawMap = world.getDynamicProperty(RELOAD_INTERVALS_KEY) ?? "{}";
        const map = JSON.parse(rawMap);
        if (map[excludeID]) {
          delete map[excludeID];
          world.setDynamicProperty(RELOAD_INTERVALS_KEY, JSON.stringify(map));
          player.sendMessage(`§6📤 "${excludeID}" を自動読み込み対象から除外しました。`);
        } else {
          player.sendMessage(`§7⚠️ "${excludeID}" は現在読み込み対象ではありません。`);
        }
      }

      const chestData = dataMap[chosenID];
      if (!validateChestData(chestData)) {
        player.sendMessage("§c⚠️ 入力されたchestIDが不正です。");
        return;
      }

      placeRootChest(chestData, player);
      player.sendMessage(`§a✅ RootChest "${chosenID}" を生成しました。`);
    });
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
}
