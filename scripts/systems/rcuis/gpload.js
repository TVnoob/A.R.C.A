import { world, system } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { CHEST_DATA_KEY, CHEST_GROUPS_KEY, RELOAD_INTERVALS_KEY } from "../consts.js";
import { resetAllTimerMap } from "./autoreloadrc.js"
import { CHEST_PROB_MAP_KEY } from "../consts.js";

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

  const groupRaw = world.getDynamicProperty(CHEST_GROUPS_KEY) ?? "{}";
  const groupMap = JSON.parse(groupRaw);
  const groupEntries = Object.entries(groupMap)
    .filter(([, arr]) => arr.length > 0);
  const groupLabels = groupEntries.map(([g, arr]) => `${g} (${arr.length})`);

  const form = new ModalFormData()
    .title("RootChest グループ周期＆確率設定")
    .dropdown("対象グループを選択", groupLabels)
    .textField("周期（分）", "10")
    .toggle("一括適用")
    .toggle("チェストの出現確率＆個数を設定")
    .textField("生成個数", "1")
    .textField("出現確率(1～100)", "50");

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
    resetAllTimerMap();
    player.sendMessage(`✅ 周期を設定しました(分): ${minutes}`);

    // 確率＆個数設定
    if (probToggle) {
      const cnt = parseInt(cntText);
      const chance = parseFloat(chanceText);
      if (isNaN(cnt) || cnt < 1 || isNaN(chance) || chance < 1 || chance > 100) {
        return player.sendMessage("§c❌ 個数または確率が無効です");
      }
      // 保存用キー例: "rootchest_prob_map"
      const probRaw = world.getDynamicProperty("rootchest_prob_map") ?? "{}";
      const probMap = JSON.parse(probRaw);
      for (const id of chestList) {
        probMap[id] = { count: cnt, chance };
      }
      world.setDynamicProperty("rootchest_prob_map", JSON.stringify(probMap));
      player.sendMessage(`✅ 確率・個数を設定しました: 個数${cnt}, 確率${chance}%`);
    }
  });
}
});
}