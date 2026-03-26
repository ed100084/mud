import type Decimal from 'decimal.js'

export interface ShopItem {
  templateId: string
  price: Decimal
  quantity: number
  isRotating: boolean
}

export interface ShopDefinition {
  id: string
  name: string
  description: string
  inventory: ShopItem[]
  rotatingSlots: number
  currency: 'gold' | 'soul'
  tier: number
}

export interface GuildContract {
  id: string
  title: string
  description: string
  type: 'kill' | 'collect' | 'explore' | 'boss'
  target: string
  required: number
  reward: { gold: Decimal; xp: Decimal; item?: string }
  minGuildRank: number
  expiresIn?: number
}

export interface NpcDialogueNode {
  id: string
  text: string
  options: { text: string; nextId?: string; action?: string; condition?: string }[]
}

export interface NpcDefinition {
  id: string
  name: string
  title: string
  description: string
  townId: string
  dialogueTree: NpcDialogueNode[]
  questIds: string[]
  shopId?: string
}

export interface TownDefinition {
  id: string
  name: string
  description: string
  tier: number
  zoneId: string
  shopIds: string[]
  npcIds: string[]
  hasDungeon: boolean
  hasGuild: boolean
  hasInn: boolean
  hasBlacksmith: boolean
  unlockLevel: number
  innCost?: number
}
