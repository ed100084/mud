import type Decimal from 'decimal.js'
import type { Equipment } from './equipment'

export interface StatBlock {
  hp: Decimal
  mp: Decimal
  atk: Decimal
  def: Decimal
  matk: Decimal
  mdef: Decimal
  spd: Decimal
  lck: Decimal
  crit: Decimal
  critDmg: Decimal
  dodge: Decimal
  acc: Decimal
}

export interface LocationState {
  type: 'town' | 'adventure' | 'dungeon'
  id: string
  subId?: string  // 地城: floorId、冒險: areaId
}

export interface InventoryItem {
  instanceId: string
  templateId: string
  quantity: number
}

export interface EquipmentState {
  weapon?: string
  offhand?: string
  head?: string
  body?: string
  legs?: string
  feet?: string
  ring1?: string
  ring2?: string
  amulet?: string
}

export interface QuestProgress {
  questId: string
  objectiveProgress: Record<string, number>
  isComplete: boolean
}

export interface PlaytimeStats {
  totalKills: Decimal
  totalDeaths: number
  totalRebirths: number
  totalXpGained: Decimal
  totalGoldGained: Decimal
  highestLevel: Decimal
  highestFloor: number
  startTime: number
  playTime: number
}

export interface PlayerState {
  id: string
  name: string
  rebirthCount: number
  level: Decimal
  xp: Decimal
  xpToNext: Decimal
  jobId: string
  jobLevel: Decimal
  jobXp: Decimal
  jobXpToNext: Decimal
  jobHistory: string[]
  masteredJobs: string[]
  baseStats: StatBlock
  currentStats: StatBlock
  currentHP: Decimal
  currentMP: Decimal
  gold: Decimal
  soulFragments: Decimal
  location: LocationState
  inventory: InventoryItem[]
  equipmentState: EquipmentState
  companionIds: string[]
  quests: QuestProgress[]
  completedQuestIds: string[]
  flags: Record<string, boolean | number | string>
  achievements: string[]
  prestige: import('./prestige').PrestigeState
  playtimeStats: PlaytimeStats
  lastSaveTime: number
  itemData: Record<string, Equipment>
}
