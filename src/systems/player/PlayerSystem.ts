import Decimal from 'decimal.js'
import { D, ZERO } from '../../core/bignum'
import { bus } from '../../core/eventbus'
import { log } from '../../core/logger'
import { calcXpToNext, calcRebirthStatMultiplier } from '../../core/formula'
import type { PlayerState, StatBlock, LocationState } from '../../types'
import { COMPANION_XP_SHARE } from '../../constants'

// 建立初始屬性區塊
export function createBaseStats(): StatBlock {
  return {
    hp: D(100), mp: D(50),
    atk: D(10), def: D(5),
    matk: D(8), mdef: D(4),
    spd: D(10), lck: D(5),
    crit: D('0.05'), critDmg: D('2.0'),
    dodge: D('0.05'), acc: D('0.95'),
  }
}

// 建立新玩家
export function createPlayer(name: string): PlayerState {
  const base = createBaseStats()
  return {
    id: crypto.randomUUID(),
    name,
    rebirthCount: 0,
    level: D(1),
    xp: ZERO,
    xpToNext: calcXpToNext(D(1), 0),
    jobId: 'warrior',
    jobLevel: D(1),
    jobXp: ZERO,
    jobXpToNext: D(100),
    jobHistory: ['warrior'],
    masteredJobs: [],
    baseStats: base,
    currentStats: { ...base },
    currentHP: base.hp,
    currentMP: base.mp,
    gold: D(50),
    soulFragments: ZERO,
    location: { type: 'town', id: 'starting_town' },
    inventory: [],
    equipmentState: {},
    companionIds: [],
    quests: [],
    completedQuestIds: [],
    flags: {},
    achievements: [],
    prestige: {
      bonusLevels: {},
      totalSoulFragments: ZERO,
      spentSoulFragments: ZERO,
      milestoneIds: [],
    },
    playtimeStats: {
      totalKills: ZERO,
      totalDeaths: 0,
      totalRebirths: 0,
      totalXpGained: ZERO,
      totalGoldGained: ZERO,
      highestLevel: D(1),
      highestFloor: 0,
      startTime: Date.now(),
      playTime: 0,
    },
    lastSaveTime: Date.now(),
  }
}

// 給予 XP
export function grantXP(player: PlayerState, amount: Decimal, source = ''): void {
  player.xp = player.xp.plus(amount)
  player.playtimeStats.totalXpGained = player.playtimeStats.totalXpGained.plus(amount)

  // 分享 XP 給同伴（由 CompanionSystem 監聽 player:level_up 處理）
  while (player.xp.gte(player.xpToNext)) {
    player.xp = player.xp.minus(player.xpToNext)
    player.level = player.level.plus(1)
    player.xpToNext = calcXpToNext(player.level, player.rebirthCount)

    // 等級升高時提升基礎屬性
    levelUpStats(player)

    if (player.level.gt(player.playtimeStats.highestLevel)) {
      player.playtimeStats.highestLevel = player.level.plus(0)
    }

    bus.emit('player:level_up', {
      newLevel: player.level.toString(),
      statsGained: {},
    })
    log.system(`✦ 等級提升！現在是 Lv.${player.level.toFixed(0)}`)
  }
}

// 等級升高屬性成長
function levelUpStats(player: PlayerState): void {
  const s = player.baseStats
  s.hp = s.hp.plus(s.hp.times(0.08).ceil())
  s.mp = s.mp.plus(s.mp.times(0.06).ceil())
  s.atk = s.atk.plus(s.atk.times(0.05).ceil())
  s.def = s.def.plus(s.def.times(0.04).ceil())
  s.matk = s.matk.plus(s.matk.times(0.05).ceil())
  s.mdef = s.mdef.plus(s.mdef.times(0.04).ceil())
  s.spd = s.spd.plus(D(1))
  s.lck = s.lck.plus(D(1))
}

// 給予金幣
export function grantGold(player: PlayerState, amount: Decimal): void {
  player.gold = player.gold.plus(amount)
  player.playtimeStats.totalGoldGained = player.playtimeStats.totalGoldGained.plus(amount)
}

// 消費金幣，回傳是否成功
export function spendGold(player: PlayerState, amount: Decimal): boolean {
  if (player.gold.lt(amount)) return false
  player.gold = player.gold.minus(amount)
  return true
}

// 治療
export function healPlayer(player: PlayerState, amount: Decimal): void {
  player.currentHP = player.currentHP.plus(amount)
  if (player.currentHP.gt(player.currentStats.hp)) {
    player.currentHP = player.currentStats.hp.plus(0)
  }
  bus.emit('player:heal', { amount: amount.toString() })
}

// 恢復 MP
export function restoreMP(player: PlayerState, amount: Decimal): void {
  player.currentMP = player.currentMP.plus(amount)
  if (player.currentMP.gt(player.currentStats.mp)) {
    player.currentMP = player.currentStats.mp.plus(0)
  }
}

// 完全恢復（旅店休息）
export function fullRestore(player: PlayerState): void {
  player.currentHP = player.currentStats.hp.plus(0)
  player.currentMP = player.currentStats.mp.plus(0)
  log.heal('你在旅店好好休息，完全恢復了！')
  bus.emit('player:heal', { amount: 'full' })
}

// 設定旗標
export function setFlag(player: PlayerState, key: string, value: boolean | number | string): void {
  player.flags[key] = value
}

export function getFlag(player: PlayerState, key: string): boolean | number | string | undefined {
  return player.flags[key]
}
