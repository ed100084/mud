import Decimal from 'decimal.js'
import { D } from '../../core/bignum'
import { calcRebirthStatMultiplier } from '../../core/formula'
import type { PlayerState, StatBlock } from '../../types'

// 重新計算玩家當前屬性（基礎 + 裝備 + 重生加成 + Buff）
export function recalcStats(player: PlayerState, equippedItems: Map<string, import('../../types').Equipment>): void {
  const base = player.baseStats
  const prestige = player.prestige
  const rebirth = player.rebirthCount

  // 重生基礎倍率
  const prestigeAllBonus = (prestige.bonusLevels['soul_power'] ?? 0) * 5
  const rebirthMul = D(1 + prestigeAllBonus / 100)

  // 計算裝備加成
  const equipFlat: Partial<Record<keyof StatBlock, Decimal>> = {}
  for (const eq of equippedItems.values()) {
    for (const [stat, val] of Object.entries(eq.baseStats) as [keyof StatBlock, Decimal][]) {
      equipFlat[stat] = (equipFlat[stat] ?? D(0)).plus(val)
    }
    for (const ench of eq.enchantments) {
      const k = ench.stat as keyof StatBlock
      equipFlat[k] = (equipFlat[k] ?? D(0)).plus(ench.flatBonus)
    }
  }

  // 合併計算
  const cs = player.currentStats
  const keys: (keyof StatBlock)[] = [
    'hp','mp','atk','def','matk','mdef','spd','lck','crit','critDmg','dodge','acc'
  ]
  for (const k of keys) {
    const b = base[k]
    const eq = equipFlat[k] ?? D(0)
    cs[k] = b.plus(eq).times(rebirthMul)
  }

  // 確保目前 HP/MP 不超過上限
  if (player.currentHP.gt(cs.hp)) player.currentHP = cs.hp.plus(0)
  if (player.currentMP.gt(cs.mp)) player.currentMP = cs.mp.plus(0)
}

// 取得某屬性的格式化顯示
export function statLabel(key: keyof StatBlock): string {
  const labels: Record<keyof StatBlock, string> = {
    hp: '生命', mp: '魔力',
    atk: '攻擊', def: '防禦',
    matk: '魔攻', mdef: '魔防',
    spd: '速度', lck: '幸運',
    crit: '爆擊率', critDmg: '爆擊傷害',
    dodge: '閃避率', acc: '命中率',
  }
  return labels[key]
}
