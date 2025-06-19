// scripts/rootchestkitUI.js
import { world, system } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { CHEST_DATA_KEY, isOp } from "../consts.js";

const CHEST_ID_COUNT_KEY = "rootchest_id_counter";

export function registerRootChestKitUI() {
  world.beforeEvents.itemUse.subscribe(event => {
    const { source, itemStack } = event;

    if (!itemStack || itemStack.typeId !== "system:rcck") return;

    if (!source || !isOp(source)) {
      source?.sendMessage("§c権限がありません、オペレーターにオペレーター権限を要求してください");
      return;
    }

    system.run(() => showRootChestForm(source));
  });

  function showRootChestForm(player) {
    const form = new ModalFormData()
      .title("RootChest 作成ツール")
      .toggle("📍 プレイヤーの位置を使用する")
      .textField("X座標", "")
      .textField("Y座標", "")
      .textField("Z座標", "")
      .textField("デフォルト生成試行回数（1～64）", "60")
      .textField("有効スロット数 (1～27)", "5");

    for (let i = 0; i < 27; i++) {
      form
        .textField(`アイテムID${i + 1}`, "")
        .textField(`生成確率[%]${i + 1}（1～100）`, "")
        .toggle(`デフォルトの試行回数を使用（${i + 1}）`,{defaultValue: true})
        .textField(`個別にこのアイテムの試行回数を割り当て（${i + 1}）`, "");
    }

    form.show(player).then(res => {
      if (res.canceled) return;

      const usePlayerPos = res.formValues[0];
      const pos = usePlayerPos
        ? [Math.floor(player.location.x), Math.floor(player.location.y), Math.floor(player.location.z)]
        : [res.formValues[1], res.formValues[2], res.formValues[3]].map(v => parseInt(v) || 0);

      const defaultTries = Math.min(Math.max(parseInt(res.formValues[4]) || 1, 1), 64);
      const slotCount = Math.min(Math.max(parseInt(res.formValues[5]) || 1, 1), 27);

      const items = [];
      for (let i = 0; i < 27; i++) {
        const id = res.formValues[6 + i * 4].trim();
        const chance = parseFloat(res.formValues[7 + i * 4]);
        const useDefault = !!res.formValues[8 + i * 4];
        const customTriesRaw = res.formValues[9 + i * 4];
        const customTries = parseInt(customTriesRaw);

        if (
          id &&
          !isNaN(chance) &&
          chance >= 1 &&
          chance <= 100 &&
          (useDefault || (!isNaN(customTries) && customTries > 0))
        ) {
          const entry = { id, chance, useDefaultTries: useDefault };
          if (!useDefault) entry.customTries = customTries;
          items.push(entry);
        }
      }

      if (items.length === 0) {
        player.sendMessage("§c⚠️ 有効なアイテムが1つも入力されていません。");
        return;
      }

      const chestID = generateNextChestID();
      const raw = world.getDynamicProperty(CHEST_DATA_KEY) ?? "{}";
      const map = JSON.parse(raw);

      map[chestID] = {
        position: pos,
        defaultTries,
        slotCount,
        items
      };

      world.setDynamicProperty(CHEST_DATA_KEY, JSON.stringify(map));
      player.sendMessage(`§a✅ RootChest "${chestID}" を登録しました。`);
    }).catch(e => {
      console.warn(`⚠️ RootChest作成UIエラー: ${e}`);
      player.sendMessage("§c⛔ UI構築中にエラーが発生しました。");
    });
  }

  function generateNextChestID() {
    const currentHex = world.getDynamicProperty(CHEST_ID_COUNT_KEY) ?? "0";
    const next = parseInt(currentHex, 16) + 1;
    const nextHex = next.toString(16).toUpperCase();
    world.setDynamicProperty(CHEST_ID_COUNT_KEY, nextHex);
    return `RC_${nextHex}`;
  }
}

