import type Decimal from 'decimal.js'
import type { StatBlock, EquipmentState } from './player'

export type AIStrategy = 'aggressive' | 'healer' | 'tank' | 'balanced' | 'support'
export type FormationPosition = 'front' | 'back'
export type CompanionType = 'humanoid' | 'monster' | 'summon'

export interface Companion {
  instanceId: string
  templateId: string
  name: string
  type: CompanionType
  level: Decimal
  xp: Decimal
  xpToNext: Decimal
  baseStats: StatBlock
  currentStats: StatBlock
  currentHP: Decimal
  currentMP: Decimal
  skillIds: string[]
  aiStrategy: AIStrategy
  position: FormationPosition
  equipment: EquipmentState
  affinity: number        // 0-100
  sourceMonsterId?: string
  recruitMethod: 'hire' | 'tame' | 'quest' | 'prestige'
  isActive: boolean
}

export interface CompanionTemplate {
  id: string
  name: string
  type: CompanionType
  description: string
  baseStats: StatBlock
  statGrowth: Partial<StatBlock>
  skillIds: string[]
  hireCost?: Decimal
  sourceMonsterId?: string
}
