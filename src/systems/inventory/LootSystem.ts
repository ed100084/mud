import Decimal from 'decimal.js'
import { D, fmt, fmtFull } from '../../core/bignum'
import { globalRng } from '../../core/rng'
import { bus } from '../../core/eventbus'
import { log } from '../../core/logger'
import { generateItem } from '../equipment/ItemGenerator'
import { addItemToInventory } from '../equipment/EquipmentSystem'
import { grantGold, grantXP } from '../player/PlayerSystem'
import { grantJobXP } from '../job/JobSystem'
import type { PlayerState, MonsterTemplate, Equipment } from '../../types'

export interface LootResult {
  xp: Decimal
  gold: Decimal
  items: string[]
}

// 處理擊殺掉落
export function processKillLoot(
  player: PlayerState,
  monster: MonsterTemplate,
  floor = 1,
  tier = 1
): LootResult {
  const rebirth = player.rebirthCount
  const lckNum = player.currentStats.lck.toNumber()

  // XP（含重生加成）
  const rebirthXpBonus = D(1 + rebirth * 0.1)
  const xp = monster.xpReward
    .times(rebirthXpBonus)
    .times(1 + (floor - 1) * 0.1)
    .ceil()

  // 金幣掉落
  const [goldMin, goldMax] = monster.goldDrop
  const baseGold = globalRng.range(
    Math.floor(goldMin * (1 + (floor - 1) * 0.15)),
    Math.floor(goldMax * (1 + (floor - 1) * 0.15))
  )
  const goldMultiplier = D(1 + rebirth * 0.05)
  const gold = D(baseGold).times(goldMultiplier).ceil()

  // 發放 XP 與職業 XP
  grantXP(player, xp, monster.name)
  grantJobXP(player, xp.times(0.5).ceil())
  grantGold(player, gold)
  player.playtimeStats.totalKills = player.playtimeStats.totalKills.plus(1)

  // 裝備掉落
  const itemNames: string[] = []
  for (const entry of monster.lootTable) {
    const weight = entry.weight * (1 + lckNum / 1000)
    if (globalRng.chance(weight)) {
      const qty = globalRng.range(entry.minQty, entry.maxQty)
      // 生成隨機裝備
      const item = generateItem({
        level: Math.max(1, player.level.toNumber()),
        rebirthTier: rebirth,
        lck: lckNum,
      })
      addItemToInventory(player, item)
      itemNames.push(item.name)
      bus.emit('item:obtained', { name: item.name, rarity: item.rarity, quantity: qty })
      log.loot(`  獲得「${item.name}」[${item.rarity}]`)
    }
  }

  log.info(`  獲得 ${fmtFull(xp)} XP  ${fmt(gold)} 金幣`)

  return { xp, gold, items: itemNames }
}

// 開啟寶箱
export function openTreasureChest(player: PlayerState, tier: number): Equipment[] {
  const count = globalRng.range(1, 3)
  const items: Equipment[] = []
  const lckNum = player.currentStats.lck.toNumber()

  log.loot('✦ 你打開了寶箱！')
  for (let i = 0; i < count; i++) {
    const item = generateItem({
      level: Math.max(1, player.level.toNumber()),
      rebirthTier: player.rebirthCount,
      lck: lckNum + tier * 20,
    })
    addItemToInventory(player, item)
    items.push(item)
    log.loot(`  獲得「${item.name}」[${item.rarity}]`)
  }

  // 金幣
  const gold = D(
    globalRng.range(50, 200) * tier * (1 + player.rebirthCount * 0.1)
  ).ceil()
  grantGold(player, gold)
  log.loot(`  獲得 ${fmt(gold)} 金幣`)

  return items
}
