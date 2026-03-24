import Decimal from 'decimal.js'
import { D, fmt } from '../../core/bignum'
import { globalRng } from '../../core/rng'
import { bus } from '../../core/eventbus'
import { log } from '../../core/logger'
import { startCombat } from '../combat/CombatSystem'
import { processKillLoot } from '../inventory/LootSystem'
import { getMonstersByTier, getMonsterById } from '../monster/MonsterData'
import type { PlayerState, Zone, Area } from '../../types'

// ── 區域資料 ─────────────────────────────────────────

export const ZONES: Record<string, Zone> = {
  starting_plains: {
    id: 'starting_plains', name: '新手平原', tier: 1,
    description: '廣闊的草原，適合初學者練習的地方。',
    areas: [
      {
        id: 'plains_east', name: '東側草原',
        description: '東側草原，哥布林和史萊姆出沒。',
        encounters: [
          { monsterId: 'slime', weight: 40, isElite: false },
          { monsterId: 'goblin', weight: 35, isElite: false },
          { monsterId: 'wolf', weight: 25, isElite: false },
        ],
        eliteChance: 0.05,
        events: ['event_merchant', 'event_find_cache', 'event_wounded_traveler'],
        lootModifier: 1.0,
      },
      {
        id: 'plains_deep', name: '深草叢',
        description: '草木茂密的深處，危險度較高。',
        encounters: [
          { monsterId: 'wolf', weight: 40, isElite: false },
          { monsterId: 'goblin', weight: 30, isElite: false },
          { monsterId: 'skeleton', weight: 30, isElite: false },
        ],
        eliteChance: 0.1,
        events: ['event_ancient_ruins', 'event_ambush'],
        lootModifier: 1.3,
      },
    ],
    connectedZoneIds: ['dark_forest', 'goblin_valley'],
    dungeonIds: ['goblin_cave'],
    townIds: ['starting_town'],
    unlockLevel: 1, unlockRebirthCount: 0,
    ambientDescriptions: [
      '微風吹過草原，帶來遠方的戰鬥氣息。',
      '遠處傳來怪物的咆哮聲。',
      '這片大地上留下了無數冒險者的足跡。',
      '陽光照耀著廣闊的草原，危機四伏。',
    ],
  },
  dark_forest: {
    id: 'dark_forest', name: '黑暗森林', tier: 3,
    description: '陽光難以穿透的古老森林，強大的怪物在此棲息。',
    areas: [
      {
        id: 'forest_edge', name: '森林邊緣',
        description: '森林入口，危險程度尚可接受。',
        encounters: [
          { monsterId: 'skeleton', weight: 40, isElite: false },
          { monsterId: 'orc', weight: 35, isElite: false },
          { monsterId: 'dark_mage', weight: 25, isElite: false },
        ],
        eliteChance: 0.12,
        events: ['event_ancient_ruins', 'event_merchant'],
        lootModifier: 1.5,
      },
      {
        id: 'forest_deep', name: '黑暗深林',
        description: '最黑暗的深處，強敵雲集。',
        encounters: [
          { monsterId: 'orc', weight: 30, isElite: false },
          { monsterId: 'dark_mage', weight: 40, isElite: false },
          { monsterId: 'dragon_hatchling', weight: 30, isElite: false },
        ],
        eliteChance: 0.18,
        events: ['event_ambush', 'event_ancient_ruins'],
        lootModifier: 2.0,
      },
    ],
    connectedZoneIds: ['starting_plains', 'dragon_peaks'],
    dungeonIds: ['dark_forest_dungeon'],
    townIds: ['forest_outpost'],
    unlockLevel: 50, unlockRebirthCount: 0,
    ambientDescriptions: [
      '黑暗中有無數雙眼睛注視著你...',
      '這裡的黑暗似乎有了生命。',
      '古老的樹木低語著被遺忘的秘密。',
    ],
  },
}

export function getZone(id: string): Zone | undefined {
  return ZONES[id]
}

// ── 隨機事件資料 ────────────────────────────────────

export const RANDOM_EVENTS = {
  event_merchant: {
    id: 'event_merchant', title: '流浪商人', weight: 20,
    description: '你遇到了一位流浪商人，他展示了一些特別的商品...',
    options: [
      { text: '查看商品（消費 50 金幣）', outcome: '購買了一件特殊物品！', goldChange: -50, itemReward: 'lucky_ring' },
      { text: '繼續前行', outcome: '商人揮手道別。', goldChange: 0 },
    ],
  },
  event_find_cache: {
    id: 'event_find_cache', title: '發現隱藏寶藏', weight: 15,
    description: '你在草叢中發現了一個隱藏的小箱子...',
    options: [
      { text: '打開箱子', outcome: '你找到了一些寶貝！', goldChange: 50 },
    ],
  },
  event_wounded_traveler: {
    id: 'event_wounded_traveler', title: '受傷的旅人', weight: 10,
    description: '一位受傷的旅人倒在路旁，向你求助...',
    options: [
      { text: '給予幫助（消費 20 金幣）', outcome: '旅人感謝你，給了你一件物品作為報答。', goldChange: -20, itemReward: 'short_sword' },
      { text: '繼續前行', outcome: '你決定不插手他人的事。', goldChange: 0 },
    ],
  },
  event_ancient_ruins: {
    id: 'event_ancient_ruins', title: '遠古遺跡', weight: 8,
    description: '你發現了一處遠古遺跡，散發著神秘的氣息...',
    options: [
      { text: '探索遺跡', outcome: '你找到了遠古的寶物！', itemReward: 'power_amulet' },
      { text: '謹慎離開', outcome: '你明智地選擇了離開。', goldChange: 0 },
    ],
  },
  event_ambush: {
    id: 'event_ambush', title: '遭受伏擊！', weight: 12,
    description: '怪物從暗處突然發動攻擊！',
    options: [
      { text: '應戰！', outcome: '你準備好應對突襲。', goldChange: 0 },
    ],
  },
}

// ── 主要探索函式 ─────────────────────────────────────

export function exploreArea(player: PlayerState, zoneId: string, areaId?: string): void {
  const zone = ZONES[zoneId]
  if (!zone) {
    log.warning('未知區域。')
    return
  }
  if (player.level.lt(zone.unlockLevel) || player.rebirthCount < zone.unlockRebirthCount) {
    log.warning(`你尚未強大到能夠進入「${zone.name}」。（需要 Lv.${zone.unlockLevel}）`)
    return
  }

  // 記錄當前探索區域（供自動探索循環使用）
  player.flags['current_zone'] = zoneId

  const area = areaId
    ? zone.areas.find(a => a.id === areaId) ?? zone.areas[0]
    : zone.areas[globalRng.int(zone.areas.length)]

  // 顯示環境描述
  const ambient = zone.ambientDescriptions[globalRng.int(zone.ambientDescriptions.length)]
  log.story(ambient)

  // 決定遭遇類型
  const roll = globalRng.next()
  if (roll < 0.60) {
    // 戰鬥遭遇
    triggerCombatEncounter(player, area, zone.tier)
  } else if (roll < 0.80) {
    // 隨機事件
    triggerRandomEvent(player, area)
  } else if (roll < 0.95) {
    // 發現
    log.info('你在這片區域中靜靜地探索，沒有遇到什麼特別的事。')
  } else {
    // 什麼都沒有
    log.info('這片區域出奇地安靜...')
  }
}

function triggerCombatEncounter(player: PlayerState, area: Area, zoneTier: number): void {
  const entry = globalRng.weighted(
    area.encounters.map(e => ({ weight: e.weight, value: e }))
  )

  const isElite = globalRng.chance(area.eliteChance)
  const monster = getMonsterById(entry.monsterId)
  if (!monster) return

  const combatType = isElite ? 'elite' : 'normal'
  const prefix = isElite ? '【精英】' : ''
  log.combat(`遭遇了 ${prefix}${monster.name}！`)

  // 啟動戰鬥
  startCombat(player, [monster], combatType, area.name, 1, zoneTier)

  // 監聽戰鬥結束（由 game.ts 統一處理）
}

function triggerRandomEvent(player: PlayerState, area: Area): void {
  if (!area.events || area.events.length === 0) return
  const eventId = area.events[globalRng.int(area.events.length)]
  const event = (RANDOM_EVENTS as Record<string, typeof RANDOM_EVENTS[keyof typeof RANDOM_EVENTS]>)[eventId]
  if (!event) return

  log.story(`\n【事件】${event.title}`)
  log.story(event.description)
  event.options.forEach((opt, i) => {
    log.dialogue(`  ${i + 1}. ${opt.text}`)
  })
  log.info('（輸入 choice 1/2/... 選擇）')

  // 儲存待處理事件（由 CommandSystem 處理選擇）
  player.flags['pending_event'] = eventId
  player.flags['pending_event_area'] = area.id
}

export function resolveEvent(player: PlayerState, optionIndex: number): void {
  const eventId = player.flags['pending_event'] as string
  if (!eventId) return
  const event = (RANDOM_EVENTS as Record<string, typeof RANDOM_EVENTS[keyof typeof RANDOM_EVENTS]>)[eventId]
  if (!event) return

  const opt = event.options[optionIndex - 1]
  if (!opt) {
    log.warning('無效的選擇。')
    return
  }
  log.story(opt.outcome)
  if (opt.goldChange && opt.goldChange !== 0) {
    if (opt.goldChange > 0) {
      player.gold = player.gold.plus(opt.goldChange)
      log.loot(`獲得 ${opt.goldChange} 金幣`)
    } else {
      if (player.gold.gte(Math.abs(opt.goldChange))) {
        player.gold = player.gold.plus(opt.goldChange)
      }
    }
  }

  delete player.flags['pending_event']
  delete player.flags['pending_event_area']
}
