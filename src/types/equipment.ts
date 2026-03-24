import type Decimal from 'decimal.js'
import type { StatBlock } from './player'

export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic' | 'Transcendent'
export type EquipSlot = 'weapon' | 'offhand' | 'head' | 'body' | 'legs' | 'feet' | 'ring' | 'amulet'

export interface Enchantment {
  id: string
  name: string
  stat: keyof StatBlock
  flatBonus: Decimal
  percentBonus: number
}

export interface Equipment {
  instanceId: string
  templateId: string
  name: string
  slot: EquipSlot
  rarity: Rarity
  level: number
  rebirthTier: number
  baseStats: Partial<Record<keyof StatBlock, Decimal>>
  enchantments: Enchantment[]
  setId?: string
  prefixId?: string
  suffixId?: string
  durability: number
  maxDurability: number
  isBound: boolean
  sellPrice: Decimal
  description: string
}

export interface EquipmentTemplate {
  id: string
  name: string
  slot: EquipSlot
  minTier: number
  baseStatRanges: Partial<Record<keyof StatBlock, [number, number]>>
  description: string
  allowedRarities: Rarity[]
}
