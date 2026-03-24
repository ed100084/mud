export interface RandomEvent {
  id: string
  title: string
  description: string
  weight: number
  requiresFlag?: string
  options: EventOption[]
}

export interface EventOption {
  text: string
  outcome: string
  goldChange?: number
  hpChange?: number
  xpReward?: number
  itemReward?: string
  flagSet?: string
}

export interface AreaEncounterEntry {
  monsterId: string
  weight: number
  isElite: boolean
}

export interface Area {
  id: string
  name: string
  description: string
  encounters: AreaEncounterEntry[]
  eliteChance: number
  events: string[]   // event IDs
  lootModifier: number
}

export interface Zone {
  id: string
  name: string
  description: string
  tier: number
  areas: Area[]
  connectedZoneIds: string[]
  dungeonIds: string[]
  townIds: string[]
  unlockLevel: number
  unlockRebirthCount: number
  ambientDescriptions: string[]
}
