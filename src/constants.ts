import Decimal from 'decimal.js'

// ── 遊戲迴圈 ────────────────────────────────────────
export const TICK_MS = 50                // 20 TPS
export const OFFLINE_PROGRESS_RATE = 0.5
export const OFFLINE_MAX_HOURS = 24
export const AUTO_SAVE_INTERVAL_MS = 60_000
export const OUTPUT_BUFFER_MAX_LINES = 10_000
export const OUTPUT_BUFFER_VISIBLE_LINES = 60

// ── 等級與 XP ────────────────────────────────────────
export const XP_BASE = new Decimal('100')
export const XP_LEVEL_EXPONENT = 1.8
export const XP_REBIRTH_REDUCTION = 0.05   // 每次重生降低 5%

// ── 重生 ────────────────────────────────────────────
export const PRESTIGE_UNLOCK_BASE_LEVEL = 50
export const PRESTIGE_UNLOCK_SCALE = 1.3
export const SOUL_FRAGMENT_EXPONENT = 0.5

// ── 戰鬥 ────────────────────────────────────────────
export const CRIT_BASE_CHANCE = 0.05
export const CRIT_BASE_MULTIPLIER = new Decimal('2.0')
export const TAME_BASE_CHANCE = 0.15
export const MIN_DAMAGE = new Decimal('1')
export const DAMAGE_VARIANCE_MIN = 0.9
export const DAMAGE_VARIANCE_MAX = 1.1
export const DEF_REDUCTION = 0.5
export const MDEF_REDUCTION = 0.4

// ── 裝備掉落稀有度權重 ────────────────────────────────
export const RARITY_WEIGHTS = {
  Common: 55,
  Uncommon: 25,
  Rare: 12,
  Epic: 5,
  Legendary: 2,
  Mythic: 0.8,
  Transcendent: 0.2,
}

// ── 城鎮商店 ────────────────────────────────────────
export const SHOP_REFRESH_SECONDS = 1800  // 30 分鐘

// ── 地城 ────────────────────────────────────────────
export const DUNGEON_ROOMS_BASE = 5
export const DUNGEON_ROOMS_PER_FLOOR = 2
export const DUNGEON_ROOMS_MAX = 30

// ── 同伴 ────────────────────────────────────────────
export const MAX_COMPANIONS = 4
export const COMPANION_XP_SHARE = 0.3   // 同伴獲得 30% 玩家 XP

// ── 版本 ────────────────────────────────────────────
export const SAVE_VERSION = '1.0.0'
export const GAME_TITLE = '異界迷城'
