# 異界迷城 MUD

瀏覽器端單人文字 RPG，以終端機風格介面呈現，支援自動戰鬥、職業轉換、地城探索、轉生系統等完整 RPG 玩法。

## 快速開始

```bash
npm install
npm run dev      # 開發伺服器（預設 http://localhost:5173）
npm run build    # 建置正式版本
npm run preview  # 預覽建置結果
```

## 技術棧

| 項目 | 技術 |
|------|------|
| 語言 | TypeScript 5 |
| 建構工具 | Vite 5 |
| 大數運算 | Decimal.js |
| 存檔儲存 | Dexie (IndexedDB) |

## 遊戲系統

- **戰鬥** — 自動回合制，支援暴擊、閃避、物理/魔法傷害
- **職業** — 4 個 Tier 1 基礎職業（戰士、法師、盜賊、牧師）及多個高階職業
- **裝備** — 7 種稀有度（Common → Transcendent），隨機詞綴生成
- **地城** — 程序生成樓層，含迷你地圖，難度隨層數提升
- **同伴** — 最多 4 位同伴，分享 30% 經驗值
- **城鎮** — 商店（30 分鐘刷新）、客棧（20 金幣全額恢復）、NPC 任務
- **轉生** — 達到解鎖等級後可重生，取得靈魂碎片強化轉生樹
- **離線進度** — 離線最長 24 小時，以 50% 效率計算進度

## 專案結構

```
src/
├── core/          # 基礎工具（大數、事件匯流排、公式、亂數、計時器）
├── types/         # TypeScript 型別定義
├── systems/       # 遊戲系統
│   ├── adventure/ # 冒險模式
│   ├── combat/    # 戰鬥公式與邏輯
│   ├── companion/ # 同伴系統
│   ├── dungeon/   # 地城生成與迷你地圖
│   ├── equipment/ # 裝備資料與物品生成
│   ├── inventory/ # 庫存與戰利品
│   ├── job/       # 職業資料與轉職邏輯
│   ├── monster/   # 怪物資料
│   ├── npc/       # NPC 與任務系統
│   ├── player/    # 玩家狀態與屬性計算
│   ├── prestige/  # 轉生資料與節點購買
│   └── town/      # 城鎮資料與 NPC
├── ui/
│   ├── commands/  # 指令註冊表（CommandRegistry）
│   └── terminal/  # 終端機 UI（顏色解析、輸出緩衝）
├── save/          # 存檔管理（Dexie）
├── game.ts        # GameEngine 主迴圈
└── main.ts        # 進入點
```

## 指令列表

在遊戲終端機輸入 `help` 查看所有可用指令。常用指令：

| 指令 | 說明 |
|------|------|
| `status` / `st` | 查看角色狀態 |
| `changejob <職業ID>` | 轉換職業 |
| `dungeon` | 進入地城 |
| `inn` / `rest` | 在客棧休息（20 金幣） |
| `shop` | 開啟商店 |
| `prestige` | 查看轉生面板 |
| `buytier <節點ID>` | 購買轉生升級 |
| `save` / `load` | 手動存檔 / 讀檔 |

## 存檔

存檔自動每分鐘儲存一次至瀏覽器 IndexedDB，也可輸入 `save` 手動觸發。
