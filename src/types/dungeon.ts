export type RoomType = 'combat' | 'treasure' | 'shop' | 'puzzle' | 'rest' | 'boss' | 'event' | 'empty' | 'entrance' | 'exit'

export interface RoomConnection {
  direction: 'n' | 's' | 'e' | 'w'
  targetRoomId: string
}

export interface RoomState {
  id: string
  type: RoomType
  connections: RoomConnection[]
  isExplored: boolean
  isCleared: boolean
  enemyTemplateIds?: string[]
  lootIds?: string[]
  eventId?: string
  trapId?: string
  hasShop?: boolean
  hasRest?: boolean
  description?: string
}

export interface FloorState {
  floor: number
  seed: number
  rooms: RoomState[]
  currentRoomId: string
  entranceRoomId: string
  bossRoomId: string
  isComplete: boolean
  mapRevealAll: boolean
}

export interface DungeonRun {
  dungeonId: string
  seed: number
  currentFloor: number
  maxFloor: number
  floors: FloorState[]
  isRoguelikeMode: boolean
  isActive: boolean
  runScore: number
  startTime: number
  modifiers: string[]
}

export interface DungeonTemplate {
  id: string
  name: string
  description: string
  tier: number
  minLevel: number
  maxFloors: number
  themes: string[]
  bossIds: string[]
  entryCost?: number
  unlockQuestId?: string
}
