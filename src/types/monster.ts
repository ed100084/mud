import type Decimal from 'decimal.js'
import type { StatBlock } from './player'

export type MonsterFamily = 'beast' | 'undead' | 'demon' | 'dragon' | 'elemental' | 'humanoid' | 'plant' | 'slime' | 'construct'

export interface LootEntry {
  templateId: string
  weight: number
  minQty: number
  maxQty: number
}

export interface MonsterTemplate {
  id: string
  name: string
  description: string
  family: MonsterFamily
  tier: number
  baseStats: StatBlock
  statScaling: number     // 倍率，隨樓層/區域等級疊加
  skillIds: string[]
  lootTable: LootEntry[]
  goldDrop: [number, number]   // [min, max] 倍率
  xpReward: Decimal
  tameable: boolean
  tameRate: number
  evolveToId?: string
  evolveLevelReq?: number
  isBoss: boolean
  isElite: boolean
  ascii?: string    // ASCII 外觀（選用）
}
