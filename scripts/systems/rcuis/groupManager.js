import { world, system } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { CHEST_DATA_KEY } from "../consts.js";

const CHEST_GROUPS_KEY = "rootchest_group_map";

// グループ編集UI
export function showGroupEditorUI(player) {
    system.afterEvents.scriptEventReceive.subscribe((event) => {
    const { id, message, sourceEntity } = event;
    if (id === "system:gr0upli6"){
    const chestRaw = world.getDynamicProperty(CHEST_DATA_KEY) ?? "{}";
    const groupRaw = world.getDynamicProperty(CHEST_GROUPS_KEY) ?? "{}";

    const chestMap = JSON.parse(chestRaw);
    const groupMap = JSON.parse(groupRaw);

    const chestIDs = Object.keys(chestMap);
    if (chestIDs.length === 0) {
        player.sendMessage("§e📦 登録されたChestがありません。");
        return;
    }

    const form = new ModalFormData()
        .title("📦 グループ作成 / 編集")
        .toggle("🛠 既存グループを編集する", false)
        .textField("グループ名を入力", "例: group1")
        .dropdown("追加 / 削除する chestID", chestIDs, { defaultValueIndex: 0 });

    form.show(player).then(res => {
        if (res.canceled) return;

        const isEdit = res.formValues[0];
        const groupName = res.formValues[1].trim();
        const selectedChestID = chestIDs[res.formValues[2]];

        if (!groupName) {
        player.sendMessage("§cグループ名を入力してください。");
        return;
        }

        const group = groupMap[groupName] ?? [];

        if (!isEdit && groupMap[groupName]) {
        player.sendMessage(`§cグループ "${groupName}" は既に存在します。編集トグルをONにしてください。`);
        return;
        }

        const updatedSet = new Set(group);

        if (updatedSet.has(selectedChestID)) {
        updatedSet.delete(selectedChestID);
        player.sendMessage(`§e"${selectedChestID}" をグループ "${groupName}" から削除しました。`);
        } else {
        updatedSet.add(selectedChestID);
        player.sendMessage(`§a"${selectedChestID}" をグループ "${groupName}" に追加しました。`);
        }

        groupMap[groupName] = Array.from(updatedSet);
        world.setDynamicProperty(CHEST_GROUPS_KEY, JSON.stringify(groupMap));
        player.sendMessage(`§a✅ グループ "${groupName}" を更新しました。`);
    }).catch(err => {
        console.warn(`[GroupUI] UIエラー: ${err}`);
        player.sendMessage("§c⚠️ グループUIの表示に失敗しました。");
    });
    }
    });
}
