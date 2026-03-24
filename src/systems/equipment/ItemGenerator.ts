import Decimal from 'decimal.js'
import { D } from '../../core/bignum'
import { RNG, globalRng } from '../../core/rng'
import { RARITY_WEIGHTS } from '../../constants'
import { EQUIPMENT_TEMPLATES, ITEM_PREFIXES, ITEM_SUFFIXES } from './EquipmentData'
import type { Equipment, Rarity, EquipSlot, StatBlock } from '../../types'

function rollRarity(lck: number, rng: RNG): Rarity {
  const weights = { ...RARITY_WEIGHTS }
  // 幸運加成：提升高稀有度機率
  const lckBonus = 1 + lck / 500
  weights.Rare *= lckBonus
  weights.Epic *= lckBonus * 1.2
  weights.Legendary *= lckBonus * 1.5
  weights.Mythic *= lckBonus * 1.8
  weights.Transcendent *= lckBonus * 2.0

  const entries = Object.entries(weights).map(([k, v]) => ({
    weight: v, value: k as Rarity
  }))
  return rng.weighted(entries)
}

function scaleStat(base: number, level: number, rebirthTier: number): Decimal {
  const levelScale = 1 + (level - 1) * 0.08
  const rebirthScale = 1 + rebirthTier * 0.5
  return D(Math.floor(base * levelScale * rebirthScale))
}

export function generateItem(params: {
  slotHint?: EquipSlot
  level: number
  rebirthTier: number
  lck: number
  seed?: number
  forceRarity?: Rarity
}): Equipment {
  const rng = new RNG(params.seed ?? RNG.makeSeed())

  // 選擇模板
  const validTemplates = EQUIPMENT_TEMPLATES.filter(t => {
    if (params.slotHint && t.slot !== params.slotHint) return false
    return t.minTier <= params.rebirthTier
  })
  const template = validTemplates[rng.int(validTemplates.length)]
  if (!template) throw new Error('No valid template found')

  const rarity = params.forceRarity ?? rollRarity(params.lck, rng)
  const rarityIndex = ['Common','Uncommon','Rare','Epic','Legendary','Mythic','Transcendent'].indexOf(rarity)

  // 計算基礎屬性
  const baseStats: Partial<Record<keyof StatBlock, Decimal>> = {}
  for (const [stat, range] of Object.entries(template.baseStatRanges) as [keyof StatBlock, [number, number]][]) {
    const base = rng.range(range[0], range[1])
    baseStats[stat] = scaleStat(base * (1 + rarityIndex * 0.3), params.level, params.rebirthTier)
  }

  // 前綴（Rare 以上）
  let prefixId: string | undefined
  let prefixName = ''
  if (rarityIndex >= 2 && ITEM_PREFIXES.length > 0) {
    const pfx = ITEM_PREFIXES[rng.int(ITEM_PREFIXES.length)]
    prefixId = pfx.id
    prefixName = pfx.name
    const statKey = pfx.bonusStat as keyof StatBlock
    const bonus = scaleStat(rng.range(pfx.bonusRange[0], pfx.bonusRange[1]), params.level, params.rebirthTier)
    baseStats[statKey] = (baseStats[statKey] ?? D(0)).plus(bonus)
  }

  // 後綴（Epic 以上）
  let suffixId: string | undefined
  let suffixName = ''
  if (rarityIndex >= 3 && ITEM_SUFFIXES.length > 0) {
    const sfx = ITEM_SUFFIXES[rng.int(ITEM_SUFFIXES.length)]
    suffixId = sfx.id
    suffixName = ` ·${sfx.name}`
    const statKey = sfx.bonusStat as keyof StatBlock
    const bonus = scaleStat(rng.range(sfx.bonusRange[0], sfx.bonusRange[1]), params.level, params.rebirthTier)
    baseStats[statKey] = (baseStats[statKey] ?? D(0)).plus(bonus)
  }

  const rarityColors: Record<Rarity, string> = {
    Common: '普通', Uncommon: '優良', Rare: '稀有',
    Epic: '史詩', Legendary: '傳說', Mythic: '神話', Transcendent: '超越',
  }

  const itemName = `${prefixName}${template.name}${suffixName}`
  const sellPrice = D(10 * Math.pow(3, rarityIndex) * (1 + params.level * 0.1)).ceil()

  return {
    instanceId: crypto.randomUUID(),
    templateId: template.id,
    name: itemName,
    slot: template.slot,
    rarity,
    level: params.level,
    rebirthTier: params.rebirthTier,
    baseStats,
    enchantments: [],
    prefixId,
    suffixId,
    durability: 100,
    maxDurability: 100,
    isBound: false,
    sellPrice,
    description: `[${rarityColors[rarity]}] ${template.description}`,
  }
}
