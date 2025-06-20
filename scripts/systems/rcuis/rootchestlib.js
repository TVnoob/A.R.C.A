// scripts/rcuis/rootchestlib.js
import { world, system } from "@minecraft/server";
import { ModalFormData, ActionFormData } from "@minecraft/server-ui";
import { CHEST_DATA_KEY, isOp } from "../consts.js";
import { GROUP_MEMBERS_KEY } from "../consts.js";

export function registerRootChestLibraryUI() {
  world.beforeEvents.itemUse.subscribe(event => {
    const { source, itemStack } = event;

    if (!itemStack || itemStack.typeId !== "system:rclib") return;

    if (!source || !isOp(source)) {
      source?.sendMessage("§c権限がありません、オペレーターにオペレーター権限を要求してください");
      return;
    }

    system.run(() => {
      if (source.isSneaking) {
        showPurgeUI(source);
      } else {
        showRootChestSelectorUI(source);
      }
    });
  });

  function openLibraryUI(player) {
    const raw = world.getDynamicProperty(CHEST_DATA_KEY) ?? "{}";
    const dataMap = JSON.parse(raw);

    const groupRaw = world.getDynamicProperty(GROUP_MEMBERS_KEY) ?? "{}";
    const groupMap = JSON.parse(groupRaw);

    const chestToGroups = {}; 
    for (const [groupName, ids] of Object.entries(groupMap)) {
      for (const cid of ids) {
        chestToGroups[cid] = chestToGroups[cid] || [];
        chestToGroups[cid].push(groupName);
      }
    }

    const form = new ActionFormData().title("RootChest Library");
    const chestIDs = Object.keys(dataMap);

    if (chestIDs.length === 0) {
      player.sendMessage("§e📦 登録されたRootChestがありません。");
      return;
    }

    for (const chestID of chestIDs) {
      const groups = chestToGroups[chestID] || [];
      const suffix = groups.length > 0 ? ` [${groups.join(",")}]` : "";
      const label = chestID + suffix;
      form.button(label);
    }

    form.show(player).then(res => {
      if (res.canceled) return;
      const selectedID = chestIDs[res.selection];
      const selectedData = dataMap[selectedID];
      if (!validateChestData(selectedData)) {
        player.sendMessage(`§c⚠️ "${selectedID}" はデータが破損しています。`);
        return;
      }
      showChestDetail(player, selectedID, selectedData, dataMap);
    });
  }

  function showRootChestSelectorUI(player) {
    const form = new ActionFormData()
      .title("📦 libを選択")
      .button("📁 グループ管理UIを開く")
      .button("📦 ChestライブラリUIを開く");

    form.show(player).then(res => {
      if (res.canceled) return;

      if (res.selection === 0) {
      system.run(() => {
        try {
          player.runCommand("scriptevent system:gr0upli6")
        } catch (e) {
          console.warn("グループlibが開けなかった!ぴえん", e);
        }
      });
      } else if (res.selection === 1) {
        openLibraryUI(player);
      }
    });
  }

  function showChestDetail(player, chestID, chestData, fullMap) {
    const form = new ModalFormData()
      .title(`RootChest 詳細: ${chestID}`)
      .textField("📍 位置", chestData.position.join(", "))
      .textField("📦 最大スタック数", chestData.defaultTries.toString())
      .textField("🎯 有効スロット数", chestData.slotCount.toString());

    const itemLines = chestData.items.map(i => `${i.id} (${i.chance}%)`);
    form.textField("🎁 アイテム", itemLines.join(" / "));

    form.toggle("❌ 削除する");

    form.show(player).then(res => {
      if (res.canceled) return;

      const shouldDelete = res.formValues[4];
      if (shouldDelete) {
        delete fullMap[chestID];
        world.setDynamicProperty(CHEST_DATA_KEY, JSON.stringify(fullMap));
        player.sendMessage(`§a✅ RootChest "${chestID}" を削除しました。`);
      }
    });
  }

function showPurgeUI(player) {
  const raw = world.getDynamicProperty(CHEST_DATA_KEY) ?? "{}";
  const dataMap = JSON.parse(raw);

  const chestIDs = Object.keys(dataMap);
  if (chestIDs.length === 0) {
    player.sendMessage("§e📦 削除可能なchestIDが存在しません。");
    return;
  }

  const form = new ModalFormData()
    .title("ID一掃プロトコルUI")
    .toggle("🛑 一斉削除を行い、責任を負う");

  for (const id of chestIDs) {
    form.toggle(`❌ 削除対象: ${id}`);
  }

  form.show(player).then(res => {
    if (res.canceled) return;

    const responsibility = res.formValues[0];
    const toggles = res.formValues.slice(1);

    const idsToDelete = chestIDs.filter((id, idx) => toggles[idx]);

    if (!responsibility) {
      player.sendMessage("§c⛔ 責任者表明がされていません。削除できません。");
      return;
    }

    if (idsToDelete.length === 0) {
      player.sendMessage("§7⚠️ 削除対象が選択されていません。");
      return;
    }

    for (const id of idsToDelete) {
      delete dataMap[id];
    }

    world.setDynamicProperty(CHEST_DATA_KEY, JSON.stringify(dataMap));

    const message = `§e⚠️ ${player.name}が責任を負うことを承認したうえで${idsToDelete.length}件のRootChestを削除しました。`;
    for (const p of world.getPlayers()) {
      p.sendMessage(message);
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
}
