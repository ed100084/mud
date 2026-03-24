import Decimal from 'decimal.js'
import { D } from '../../core/bignum'
import type { TownDefinition, NpcDefinition, ShopDefinition } from '../../types'

export const TOWNS: Record<string, TownDefinition> = {
  starting_town: {
    id: 'starting_town', name: '始源城', tier: 1,
    description: '所有冒險者踏上旅途的起點，充滿活力的邊境小鎮。',
    zoneId: 'starting_plains',
    shopIds: ['general_shop', 'weapon_shop'],
    npcIds: ['elder', 'innkeeper', 'guild_master', 'blacksmith'],
    hasDungeon: false, hasGuild: true, hasInn: true, hasBlacksmith: true,
    unlockLevel: 1,
  },
  forest_outpost: {
    id: 'forest_outpost', name: '森林前哨站', tier: 3,
    description: '深入黑暗森林的前哨基地，設備簡陋但物資齊全。',
    zoneId: 'dark_forest',
    shopIds: ['forest_shop'],
    npcIds: ['ranger_captain', 'alchemist'],
    hasDungeon: false, hasGuild: true, hasInn: true, hasBlacksmith: false,
    unlockLevel: 50,
  },
}

export const SHOPS: Record<string, ShopDefinition> = {
  general_shop: {
    id: 'general_shop', name: '通用商店', tier: 1,
    description: '販售各種基礎冒險用品。',
    currency: 'gold', rotatingSlots: 3,
    inventory: [
      { templateId: 'short_sword', price: D(100), quantity: 5, isRotating: false },
      { templateId: 'leather_cap', price: D(80), quantity: 5, isRotating: false },
      { templateId: 'cloth_robe', price: D(90), quantity: 5, isRotating: false },
      { templateId: 'lucky_ring', price: D(150), quantity: 3, isRotating: false },
    ],
  },
  weapon_shop: {
    id: 'weapon_shop', name: '武器店', tier: 1,
    description: '專賣武器與防具的老字號商店。',
    currency: 'gold', rotatingSlots: 2,
    inventory: [
      { templateId: 'iron_sword', price: D(300), quantity: 3, isRotating: false },
      { templateId: 'magic_staff', price: D(280), quantity: 3, isRotating: false },
      { templateId: 'shadow_dagger', price: D(500), quantity: 2, isRotating: false },
    ],
  },
}

export const NPCS: Record<string, NpcDefinition> = {
  elder: {
    id: 'elder', name: '老村長', title: '始源城長老',
    description: '城鎮的守護者，飽經風霜的智者。',
    townId: 'starting_town',
    questIds: ['quest_first_steps', 'quest_goblin_menace'],
    dialogueTree: [
      {
        id: 'root',
        text: '啊，又一位年輕的冒險者。這片大地的危機，需要勇者來解決。',
        options: [
          { text: '我想了解這片土地', nextId: 'lore_01' },
          { text: '有什麼任務嗎？', nextId: 'quest_menu', action: 'show_quests' },
          { text: '再見', nextId: undefined },
        ],
      },
      {
        id: 'lore_01',
        text: '這片大地名為「異界」，曾經是人與怪物和諧共存的世界，直到遠古的封印被打破...',
        options: [
          { text: '繼續聆聽', nextId: 'lore_02' },
          { text: '返回', nextId: 'root' },
        ],
      },
      {
        id: 'lore_02',
        text: '如今，強大的黑暗力量在各地蔓延。我們需要一位傳說中的「轉生英雄」來終結這一切。',
        options: [
          { text: '我就是那個英雄', nextId: 'root' },
          { text: '返回', nextId: 'root' },
        ],
      },
    ],
    shopId: undefined,
  },
  innkeeper: {
    id: 'innkeeper', name: '旅店老闆', title: '始源旅店老闆',
    description: '熱情招待每位旅客的善良中年男性。',
    townId: 'starting_town',
    questIds: [],
    dialogueTree: [
      {
        id: 'root',
        text: '歡迎來到「重生之旅店」！要住宿嗎？費用是 20 金幣，可以完全恢復 HP/MP。',
        options: [
          { text: '住宿（20 金幣）', nextId: undefined, action: 'inn_rest', condition: 'gold>=20' },
          { text: '不了，謝謝', nextId: undefined },
        ],
      },
    ],
    shopId: undefined,
  },
  guild_master: {
    id: 'guild_master', name: '公會長', title: '冒險者公會長',
    description: '管理冒險者公會的嚴肅老練女性。',
    townId: 'starting_town',
    questIds: ['quest_guild_rookie'],
    dialogueTree: [
      {
        id: 'root',
        text: '公會歡迎你。這裡有最新的委託，完成任務可以提升公會等級，解鎖更好的獎勵。',
        options: [
          { text: '查看委託', nextId: undefined, action: 'show_guild_contracts' },
          { text: '查看我的公會等級', nextId: undefined, action: 'show_guild_rank' },
          { text: '離開', nextId: undefined },
        ],
      },
    ],
    shopId: undefined,
  },
  blacksmith: {
    id: 'blacksmith', name: '鐵匠老魯', title: '鐵匠',
    description: '技藝精湛的老鐵匠，能強化任何裝備。',
    townId: 'starting_town',
    questIds: [],
    dialogueTree: [
      {
        id: 'root',
        text: '叮！叮！啊，客人來了。需要強化裝備嗎？把物品給我，我讓它更強！',
        options: [
          { text: '強化裝備', nextId: undefined, action: 'open_enchant' },
          { text: '購買材料', nextId: undefined, action: 'open_shop' },
          { text: '離開', nextId: undefined },
        ],
      },
    ],
    shopId: 'weapon_shop',
  },
}

export function getTown(id: string): TownDefinition | undefined { return TOWNS[id] }
export function getShop(id: string): ShopDefinition | undefined { return SHOPS[id] }
export function getNPC(id: string): NpcDefinition | undefined { return NPCS[id] }
