import type Decimal from 'decimal.js'
import type { StatBlock } from './player'

export type ActionType = 'attack' | 'skill' | 'item' | 'defend' | 'flee' | 'auto'

export interface StatusEffect {
  id: string
  name: string
  type: 'buff' | 'debuff' | 'dot' | 'hot'
  stat?: keyof StatBlock
  flatValue?: Decimal
  percentValue?: number
  duration: number
  remaining: number
  sourceId: string
}

export interface CombatUnit {
  unitId: string
  name: string
  isPlayer: boolean
  isCompanion: boolean
  currentHP: Decimal
  maxHP: Decimal
  currentMP: Decimal
  maxMP: Decimal
  stats: StatBlock
  statusEffects: StatusEffect[]
  skillIds: string[]
  aiStrategy?: string
  isDefending: boolean
  templateId?: string
}

export interface CombatLogEntry {
  turn: number
  actorId: string
  actorName: string
  text: string
  color: string
  damage?: Decimal
  isCrit?: boolean
  isHeal?: boolean
}

export interface CombatState {
  id: string
  type: 'normal' | 'elite' | 'boss' | 'dungeon_boss'
  allies: CombatUnit[]
  enemies: CombatUnit[]
  turnOrder: string[]   // unitIds 按速度排序
  currentTurnIndex: number
  roundNumber: number
  log: CombatLogEntry[]
  isActive: boolean
  isPlayerTurn: boolean
  location: string
}

export interface SkillDefinition {
  id: string
  name: string
  description: string
  type: 'active' | 'passive'
  jobId: string
  mpCost: Decimal
  cooldown: number
  targetType: 'single_enemy' | 'all_enemies' | 'single_ally' | 'all_allies' | 'self'
  damageMultiplier?: number
  healMultiplier?: number
  statusEffectId?: string
  unlockJobLevel: number
  element?: 'fire' | 'ice' | 'lightning' | 'holy' | 'dark' | 'earth' | 'none'
}
