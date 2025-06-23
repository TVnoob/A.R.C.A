import { world, system } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { CHEST_DATA_KEY, GROUP_MEMBERS_KEY, CHEST_PROB_MAP_KEY } from "../consts.js";
import { placeRootChest } from "./autoreloadrc.js"; // 再利用できるよう export が必要

const MANUAL_EVENT_ID = "system:gmanual";

export function registerGroupManualUI() {
  // UI呼び出し: プレイヤーがアイテムなどで使用
  system.afterEvents.scriptEventReceive.subscribe((event) => {
    const { id, sourceEntity } = event;
    if (id === "system:8r0upmanua10pen"){
    showManualGroupControlUI(sourceEntity);
    }

  if (event.id === MANUAL_EVENT_ID) {
    const { sourceEntity: player, message = "" } = event;
    const [genGroup, stopGroup, delGroup] = message.split("|").map(s => s.trim());
  
    const rawGroup = world.getDynamicProperty(GROUP_MEMBERS_KEY) ?? "{}";
    const groupMap = JSON.parse(rawGroup);
    const rawChest = world.getDynamicProperty(CHEST_DATA_KEY) ?? "{}";
    const chestMap = JSON.parse(rawChest);
    const probRaw = world.getDynamicProperty(CHEST_PROB_MAP_KEY) ?? "{}";
    const probMap = JSON.parse(probRaw);
  
    const valid = (id) => id && id.toLowerCase() !== "none" && groupMap[id];
  
    if (valid(genGroup)) {
      groupMap[genGroup].forEach(cid => {
        if (chestMap[cid]) placeRootChest(chestMap[cid]);
      });
      player?.sendMessage(`§a✅ グループ "${genGroup}" を手動生成しました`);
    }
  
    if (valid(stopGroup) && probMap[stopGroup]) {
      delete probMap[stopGroup];
      world.setDynamicProperty(CHEST_PROB_MAP_KEY, JSON.stringify(probMap));
      player?.sendMessage(`§6⏹ グループ "${stopGroup}" を再生成対象から除外しました`);
    }
  
    if (valid(delGroup)) {
      delete groupMap[delGroup];
      world.setDynamicProperty(GROUP_MEMBERS_KEY, JSON.stringify(groupMap));
      player?.sendMessage(`§c🗑️ グループ "${delGroup}" を削除しました`);
    }
  }
  });
}

function showManualGroupControlUI(player) {
  const raw = world.getDynamicProperty(GROUP_MEMBERS_KEY) ?? "{}";
  const groupMap = JSON.parse(raw);
  const groupNames = Object.keys(groupMap);

  if (groupNames.length === 0) {
    player.sendMessage("§c⛔ 登録されたグループがありません");
    return;
  }

  const form = new ModalFormData()
    .title("手動制御グループUI")
    .dropdown("グループ一覧", groupNames)
    .textField("生成するグループ名", "<ここにグループ名を入力>")
    .textField("自動読み込みの対象から外すグループ名", "<ここにグループ名を入力>")
    .textField("グループ名を削除", "<ここにグループ名を入力>")
    .submitButton("§s[加えた変更を適応する]");

  form.show(player).then(res => {
    if (res.canceled) return;
    const [index, toGen, toRemove, toDelete] = res.formValues;

    const rawChest = world.getDynamicProperty(CHEST_DATA_KEY) ?? "{}";
    const chestMap = JSON.parse(rawChest);
    const groupRaw = world.getDynamicProperty(GROUP_MEMBERS_KEY) ?? "{}";
    const groupMap = JSON.parse(groupRaw);
    const probRaw = world.getDynamicProperty(CHEST_PROB_MAP_KEY) ?? "{}";
    const probMap = JSON.parse(probRaw);

    const genGroup = (res.formValues[1] ?? "").trim();
    const delGroup = (res.formValues[2] ?? "").trim();
    const delEntireGroup = (res.formValues[3] ?? "").trim();

    if (genGroup && groupMap[genGroup]) {
      groupMap[genGroup].forEach(cid => {
        if (chestMap[cid]) placeRootChest(chestMap[cid]);
      });
      player.sendMessage(`§a✅ グループ "${genGroup}" を手動生成しました`);
    }

    if (probMap[stopGroup]) {
      delete probMap[stopGroup]; // グループ単位で削除
      world.setDynamicProperty(CHEST_PROB_MAP_KEY, JSON.stringify(probMap));
      player?.sendMessage(`§6 グループ "${stopGroup}" を再生成対象から除外しました`);
    } else {
      player?.sendMessage(`§7 グループ "${stopGroup}" は再生成リストに存在していません`);
    }

    if (delEntireGroup && groupMap[delEntireGroup]) {
      delete groupMap[delEntireGroup];
      world.setDynamicProperty(GROUP_MEMBERS_KEY, JSON.stringify(groupMap));
      player.sendMessage(`§c🗑️ グループ "${delEntireGroup}" を削除しました`);
    }
  });
}
