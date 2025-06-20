import { world, system } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { CHEST_DATA_KEY, GROUP_MEMBERS_KEY } from "../consts.js";
import { placeRootChest } from "./autoreloadrc.js"; // 再利用できるよう export が必要

const MANUAL_EVENT_ID = "system:groupmanual";

export function registerGroupManualUI() {
  // UI呼び出し: プレイヤーがアイテムなどで使用
  system.afterEvents.scriptEventReceive.subscribe((event) => {
    const { id, sourceEntity } = event;
    if (id === "system:8r0upmanua10pen"){
    showManualGroupControlUI(sourceEntity);
    }

    // scriptevent 対応
    if (event.id !== MANUAL_EVENT_ID) return;

    const { sourceEntity: player, message = "" } = event;
    const [genGroup, stopGroup] = message.split("|").map(s => s.trim());

    const rawGroup = world.getDynamicProperty(GROUP_MEMBERS_KEY) ?? "{}";
    const groupMap = JSON.parse(rawGroup);
    const rawChest = world.getDynamicProperty(CHEST_DATA_KEY) ?? "{}";
    const chestMap = JSON.parse(rawChest);

    const valid = (id) => id && groupMap[id];

    if (valid(genGroup)) {
      groupMap[genGroup].forEach(cid => {
        if (chestMap[cid]) placeRootChest(chestMap[cid]);
      });
      player?.sendMessage(`§a✅ グループ "${genGroup}" を手動生成しました`);
    }

    if (valid(stopGroup)) {
      const probRaw = world.getDynamicProperty("rootchest_prob_map") ?? "{}";
      const probMap = JSON.parse(probRaw);
      groupMap[stopGroup].forEach(cid => delete probMap[cid]);
      world.setDynamicProperty("rootchest_prob_map", JSON.stringify(probMap));
      player?.sendMessage(`§6⏹ グループ "${stopGroup}" を再生成対象から除外しました`);
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
    .textField("📦 生成するグループ名", "")
    .textField("🛑 除外するグループ名", "");

  form.show(player).then(res => {
    if (res.canceled) return;
    const [index, toGen, toRemove] = res.formValues;

    const rawChest = world.getDynamicProperty(CHEST_DATA_KEY) ?? "{}";
    const chestMap = JSON.parse(rawChest);
    const groupRaw = world.getDynamicProperty(GROUP_MEMBERS_KEY) ?? "{}";
    const groupMap = JSON.parse(groupRaw);
    const probRaw = world.getDynamicProperty("rootchest_prob_map") ?? "{}";
    const probMap = JSON.parse(probRaw);

    const genGroup = toGen.trim();
    const delGroup = toRemove.trim();

    if (genGroup && groupMap[genGroup]) {
      groupMap[genGroup].forEach(cid => {
        if (chestMap[cid]) placeRootChest(chestMap[cid]);
      });
      player.sendMessage(`§a✅ グループ "${genGroup}" を手動生成しました`);
    }

    if (delGroup && groupMap[delGroup]) {
      groupMap[delGroup].forEach(cid => delete probMap[cid]);
      world.setDynamicProperty("rootchest_prob_map", JSON.stringify(probMap));
      player.sendMessage(`§6⏹ グループ "${delGroup}" を再生成対象から除外しました`);
    }
  });
}
