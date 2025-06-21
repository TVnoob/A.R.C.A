import { world, system } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { CHEST_DATA_KEY, GROUP_MEMBERS_KEY, RELOAD_INTERVALS_KEY, CHEST_PROB_MAP_KEY } from "../consts.js";
import { resetAllTimerMap } from "./autoreloadrc.js"

let subscribed = false;
export function showCycleSettingGPUI(player) {
    if(subscribed) return;
    subscribed = true;
    system.afterEvents.scriptEventReceive.subscribe((event) => {
    const { id, message, sourceEntity } = event;
    if (id === "system:gr0upl0ad"){
    const probRaw = world.getDynamicProperty(CHEST_PROB_MAP_KEY) ?? "{}";
    const chestRaw = world.getDynamicProperty(CHEST_DATA_KEY) ?? "{}";
    const dataMap = JSON.parse(chestRaw);
    const validIDs = Object.entries(dataMap)
    .filter(([_, d]) => validateChestData(d))
    .map(([id]) => id);

    const chestIDs = Object.keys(dataMap);
    if (chestIDs.length === 0) {
      player.sendMessage("§e📦 登録されたグループがありません。");
      return;
    }

    function validateChestData(data) {
    if (!data || !Array.isArray(data.position) || data.position.length !== 3) return false;
    if (!data.defaultTries || !data.slotCount) return false;
    if (!Array.isArray(data.items)) return false;
    const validItems = data.items.filter(i => i.id && typeof i.chance === "number" && i.chance > 0);
    return validItems.length > 0;
    }

    const groupRaw = world.getDynamicProperty(GROUP_MEMBERS_KEY) ?? "{}";
    const groupMap = JSON.parse(groupRaw);
    const groupEntries = Object.entries(groupMap)
    .filter(([, arr]) => arr.length > 0);
    const groupLabels = groupEntries.map(([g, arr]) => `${g} (${arr.length})`);

    const form = new ModalFormData()
    .title("RootChest グループ周期＆確率設定")
    .dropdown("対象グループを選択", groupLabels)
    .textField("周期（分）", "10")
    .toggle("ほかのチェストを含めて一度カウントをリスタート")
    .toggle("チェストの出現確率＆個数を設定")
    .textField("生成個数上限", "<maxlimit>")
    .textField("各チェストの出現確率(1～100)", "神はサイコロを…")
    .submitButton("§6[設定する]");

  const player = sourceEntity
  form.show(player).then(res => {
    if (res.canceled) return;
    const [gIndex, minText, applyAll, probToggle, cntText, chanceText] = res.formValues;
    const groupName = groupEntries[gIndex][0];
    const chestList = groupMap[groupName];
    const minutes = parseInt(minText);
    if (isNaN(minutes) || minutes <= 0) {
      return player.sendMessage("§c❌ 無効な周期です");
    }

    // 周期マップ保存
    const rawMap = world.getDynamicProperty(RELOAD_INTERVALS_KEY) ?? "{}";
    const reloadMap = JSON.parse(rawMap);
    for (const id of (applyAll ? Object.keys(dataMap) : chestList)) {
      reloadMap[id] = minutes;
    }
    world.setDynamicProperty(RELOAD_INTERVALS_KEY, JSON.stringify(reloadMap));
    const reset_right = res.formValues[2];
    if (reset_right === true) {
    resetAllTimerMap();
    }
    player.sendMessage(`✅ 周期を設定しました(分): ${minutes}`);

    // 確率＆個数設定
    const ramdontoggle = res.formValues[3];
    if (ramdontoggle) {
      const cnt = parseInt(cntText);
      const chance = parseFloat(chanceText);
      if (isNaN(cnt) || cnt < 1 || isNaN(chance) || chance < 1 || chance > 100) {
        return player.sendMessage("§c❌ 個数または確率が無効です");
      }
    const probMap = JSON.parse(world.getDynamicProperty(CHEST_PROB_MAP_KEY) ?? "{}");
    for (const id of chestList) {
      probMap[id] = { count: cnt, chance };
    }
    world.setDynamicProperty(CHEST_PROB_MAP_KEY, JSON.stringify(probMap));
    player.sendMessage(`✅ 確率・個数を設定しました: 個数${cnt}, 確率${chance}%`);
    }
  });
}
});
}