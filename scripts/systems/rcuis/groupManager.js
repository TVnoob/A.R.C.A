import { world, system } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { CHEST_DATA_KEY, GROUP_MEMBERS_KEY } from "../consts.js";

let subscribed = false;
// グループ編集UI
export function showGroupEditorUI(player) {
    if(subscribed) return;
    subscribed = true;
    system.afterEvents.scriptEventReceive.subscribe((event) => {
    const { id, message, sourceEntity } = event;
    if (id === "system:gr0upli6"){
    const chestRaw = world.getDynamicProperty(CHEST_DATA_KEY) ?? "{}";
    const groupRaw = world.getDynamicProperty(GROUP_MEMBERS_KEY) ?? "{}";

    const chestMap = JSON.parse(chestRaw);
    const groupMap = JSON.parse(groupRaw);

    const chestIDs = Object.keys(chestMap);
    const GroupIDs = Object.keys(groupMap);
    const player = sourceEntity

    const groupMapant = GroupIDs.map(([g, arr]) => `${g} (${arr.length})`);
    const form = new ModalFormData()
        .title("📦 グループ作成 / 編集")
        .toggle("🛠 既存グループを編集する")
        .textField("グループ名を入力", "例: group1")
        .dropdown("追加 / 削除する chestID", chestIDs, { defaultValueIndex: 0 })
        .submitButton("§s[加えた変更を適応する]");


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
        world.setDynamicProperty(GROUP_MEMBERS_KEY, JSON.stringify(groupMap));
        player.sendMessage(`§a✅ グループ "${groupName}" を更新しました。`);
    }).catch(err => {
        console.warn(`[GroupUI] UIエラー: ${err}`);
        player.sendMessage("§c⚠️ グループUIの表示に失敗しました。");
    });
    }
    });
}
