export type JobTier = 1 | 2 | 3 | 4 | 5

export interface JobStatGrowth {
  hp?: number; mp?: number
  atk?: number; def?: number
  matk?: number; mdef?: number
  spd?: number; lck?: number
  crit?: number; critDmg?: number
}

export interface JobRequirement {
  type: 'level' | 'job' | 'mastered_job' | 'stat' | 'quest' | 'rebirth' | 'item'
  target?: string
  value: number | string
}

export interface JobDefinition {
  id: string
  name: string
  description: string
  tier: JobTier
  requirements: JobRequirement[]
  statGrowth: JobStatGrowth
  passiveSkillIds: string[]
  activeSkillIds: string[]
  lore: string
}
