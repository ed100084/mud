import type Decimal from 'decimal.js'

export interface PrestigeBonusNode {
  id: string
  name: string
  description: string
  tier: 1 | 2 | 3 | 4
  costPerLevel: Decimal
  maxLevel: number
  effect: {
    stat?: string
    flatBonus?: number
    percentBonus?: number
    special?: string
  }
  prerequisiteIds: string[]
  unlockRebirthCount: number
}

export interface PrestigeMilestone {
  rebirthCount: number
  title: string
  description: string
  rewards: string[]
  unlocksFeature?: string
}

export interface PrestigeState {
  bonusLevels: Record<string, number>
  totalSoulFragments: Decimal
  spentSoulFragments: Decimal
  milestoneIds: string[]
}

export interface RunStats {
  startTime: number
  rebirthNumber: number
  peakLevel: Decimal
  monstersKilled: Decimal
  dungeonsCleared: number
  deepestFloor: number
  soulFragmentsEarned: Decimal
}
