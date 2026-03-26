# 異界迷城 MUD

> 無盡輪迴的傳說從此展開

一款以繁體中文撰寫、可在**手機與瀏覽器**上遊玩的單人 MUD 風格 RPG。
核心機制為**無上限重生系統**（壓力扣米）——數值可無限成長，等級沒有天花板，玩家熱愛看到龐大的數字。

---

## 🖥️ 線上預覽

![遊戲截圖](https://raw.githubusercontent.com/ed100084/mud/main/public/preview.png)

```
╔════════════════════════════════════╗
║        ✦  異界迷城 MUD  ✦           ║
║    無盡輪迴的傳說從此展開              ║
╚════════════════════════════════════╝
```

---

## ✨ 功能特色

### 核心玩法
| 系統 | 說明 |
|------|------|
| 🔄 **無限重生** | 達成條件後重生，保留靈魂碎片與永久加成，數值無限成長 |
| 📈 **大數字系統** | 使用 Decimal.js，傷害/HP/XP 可達天文數字（K→M→B→T→Qa…科學記號） |
| ⚔️ **回合制戰鬥** | 速度排序行動順序，支援爆擊/閃避/狀態異常 |
| 🗺️ **冒險探索** | 多個區域、隨機事件、怪物遭遇 |
| 🏰 **地城系統** | Roguelike 程序生成樓層，含戰鬥/寶箱/商店/休息/謎題/BOSS 房間 |
| 🏙️ **城鎮系統** | 商店、旅店、公會、NPC 對話樹、任務系統 |
| 💼 **5 階職業樹** | 新手→精英→高階→傳說→超越，每職業有獨立等級與精通獎勵 |
| 🐾 **怪物馴服** | 戰鬥中降低怪物 HP 提高馴服機率，組建同伴隊伍 |
| 🎒 **程序裝備** | 7 種稀有度（普通→超越），隨機前綴後綴，附魔系統 |
| 💾 **存檔系統** | localStorage 自動存檔 + 手動存槽 + Base64 跨裝置匯出 |
| 🌙 **離線進度** | 最多計算 24 小時離線的 XP/金幣收益 |

### 重生樹（4 階永久升級）
| 階 | 解鎖 | 代表加成 |
|----|------|---------|
| Tier 1 | 重生 1 次 | 全屬性 +5%/層、起始金幣、XP 需求減少 |
| Tier 2 | 重生 5 次 | 攻擊/防禦倍率、幸運星 |
| Tier 3 | 重生 20 次 | 超越（屬性指數成長）、靈魂同伴 |
| Tier 4 | 重生 100 次 | 無限潛力、虛空行者職業、傳說回聲 |

### 職業樹（5 階）
```
Tier 1：戰士 / 法師 / 盜賊 / 牧師 / 弓箭手 / 商人
Tier 2：劍士 / 巫師 / 刺客 / 祭司 / 獵人 / 武僧 / 吟遊詩人
Tier 3：騎士 / 大魔導士 / 暗影 / 主教 / 御獸師 / 死靈法師
Tier 4：龍騎士 / 魔法宗師 / 幽靈刺客
Tier 5：半神 / 虛空行者 / 永恆者（需重生 100 次）
```

---

## 📱 行動裝置 GUI

情境感知操作面板，無需打字即可完整遊玩：

| 情境 | 顯示內容 |
|------|---------|
| **城鎮** | 探索 / 商店 / 旅館 / NPC 對話 / 地城入口 |
| **戰鬥中** | 敵人 HP 條（動態更新）+ 攻擊 / 防禦 / 技能 / 逃跑 / 馴服 |
| **地城中** | D-Pad 方向鍵 + 搜索 / 地圖 / 休息 / 撤退 |
| **事件/對話** | 自動切換為選項按鈕面板，點擊即選擇 |

底部導覽列（常駐）：**🗺 探索 / 👤 角色 / 📦 物品 / 📋 任務 / ✨ 重生樹**

---

## 🚀 快速開始

### 環境需求
- Node.js 18+
- npm 9+

### 安裝與啟動
```bash
git clone https://github.com/ed100084/mud.git
cd mud
npm install
npm run dev
```

開啟瀏覽器前往 **http://localhost:5173**

### 建置正式版
```bash
npm run build
# 產出在 dist/ 目錄，可直接部署到任何靜態托管服務
```

---

## 🎮 遊戲指令（進階）

雖然已有完整 GUI，仍可在終端機輸出區域輸入指令：

```
【導航】  explore / go n|s|e|w / town / dungeon <id>
【戰鬥】  attack / defend / flee / tame / skill <n>
【角色】  status / stats / inventory / equip <n> / unequip
【職業】  jobs / changejob <id>
【城鎮】  shop / buy <n> / sell <n> / inn / talk <npc>
【任務】  quests / accept <id> / complete <id>
【重生】  prestige / rebirth / confirm_rebirth / buytier <id>
【系統】  save / settings theme <green|amber|white> / codex
```

---

## 🛠️ 技術架構

```
異界迷城
├── 建置工具    Vite 5 + TypeScript（strict mode）
├── 大數字      Decimal.js（無限精度，自訂格式化）
├── 儲存        localStorage（可升級至 Dexie IndexedDB）
├── UI          原生 DOM + 自訂終端機渲染器（無框架）
├── CSS         純手工 CSS + Custom Properties（主題切換）
└── 亂數        Mulberry32 種子亂數（可重現的程序生成）
```

### 目錄結構
```
src/
├── core/           bignum / rng / eventbus / ticker / formula / logger
├── types/          TypeScript 介面定義（player / job / equipment / ...）
├── systems/
│   ├── player/     PlayerSystem / StatsSystem / LevelSystem
│   ├── job/        JobSystem / JobData（20 個職業）
│   ├── combat/     CombatSystem / CombatFormulas
│   ├── equipment/  EquipmentSystem / ItemGenerator（程序裝備）
│   ├── adventure/  AdventureSystem / 隨機事件
│   ├── dungeon/    DungeonSystem / FloorGenerator / MiniMap
│   ├── town/       TownData / NPC / 商店
│   ├── npc/        QuestSystem（6 條任務線）
│   ├── companion/  CompanionSystem / 馴服系統
│   ├── monster/    MonsterData（9 種怪物）
│   └── prestige/   PrestigeSystem / 重生樹（11 節點）
├── ui/
│   ├── UIManager.ts        GUI 總控制器
│   ├── commands/           CommandRegistry（35+ 指令）
│   └── terminal/           Terminal / OutputBuffer / ColorParser
├── save/           SaveManager（自動存檔 + Base64 匯出）
├── game.ts         GameEngine（主協調者）
└── main.ts         入口點
```

---

## 🎨 主題切換

```
settings theme green   ← 預設綠磷終端機
settings theme amber   ← 琥珀色
settings theme white   ← 白光
```

---

## 📊 數值設計

| 常數 | 值 | 說明 |
|------|----|------|
| `TICK_MS` | 50ms | 遊戲迴圈 20 TPS |
| `XP_LEVEL_EXPONENT` | 1.8 | XP 需求曲線指數 |
| `XP_REBIRTH_REDUCTION` | 5%/次 | 每次重生降低 XP 需求 |
| `OFFLINE_MAX_HOURS` | 24h | 最大離線進度計算時間 |
| `OFFLINE_PROGRESS_RATE` | 50% | 離線收益效率 |
| `TAME_BASE_CHANCE` | 15% | 基礎馴服機率（HP 越低越高）|
| `PRESTIGE_UNLOCK_BASE_LEVEL` | 50 | 首次重生所需等級 |

---

## 📄 授權

MIT License © 2025 ed100084
