# Develop branch
- Dev V1.0.0
# commands
### /scriptevent lc:rset
- 全チェストを強制的に一からスタート
#### /scriptevent system:gmanual <グループ1>|<グループ2>|<グループ3>
- グループ1: 手動生成するグループ名
- グループ2: 再生成除外するグループ名
- グループ3: 削除するグループ
- 対象でない項目には none を入れる
- 例: もし手動生成のみを実行したい場合
- /scriptevent system:gmanual <グループ1>|none|none
