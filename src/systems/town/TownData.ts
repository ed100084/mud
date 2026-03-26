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
    unlockLevel: 1, innCost: 20,
  },
  valley_town: {
    id: 'valley_town', name: '谷地小鎮', tier: 1,
    description: '哥布林山谷中的人類據點，曾多次遭受哥布林侵襲。',
    zoneId: 'goblin_valley',
    shopIds: ['valley_shop', 'valley_weapon_shop'],
    npcIds: ['valley_elder', 'valley_innkeeper', 'valley_blacksmith'],
    hasDungeon: false, hasGuild: true, hasInn: true, hasBlacksmith: true,
    unlockLevel: 8, innCost: 40,
  },
  swamp_village: {
    id: 'swamp_village', name: '沼澤村', tier: 2,
    description: '建在沼澤邊緣的特殊村落，村民擅長魔法藥水的製作。',
    zoneId: 'cursed_swamp',
    shopIds: ['swamp_shop', 'alchemy_shop'],
    npcIds: ['swamp_elder', 'swamp_innkeeper', 'alchemist_npc'],
    hasDungeon: false, hasGuild: true, hasInn: true, hasBlacksmith: true,
    unlockLevel: 20, innCost: 80,
  },
  iron_fortress: {
    id: 'iron_fortress', name: '鐵鑄要塞', tier: 3,
    description: '鐵山山脈的防禦要塞，採礦者和戰士的聚集地。',
    zoneId: 'iron_mountains',
    shopIds: ['forge_shop', 'armory_shop'],
    npcIds: ['fortress_commander', 'master_blacksmith', 'fortress_innkeeper'],
    hasDungeon: false, hasGuild: true, hasInn: true, hasBlacksmith: true,
    unlockLevel: 35, innCost: 150,
  },
  forest_outpost: {
    id: 'forest_outpost', name: '森林前哨站', tier: 3,
    description: '深入黑暗森林的前哨基地，設備簡陋但物資齊全。',
    zoneId: 'dark_forest',
    shopIds: ['forest_shop'],
    npcIds: ['ranger_captain', 'forest_alchemist'],
    hasDungeon: false, hasGuild: true, hasInn: true, hasBlacksmith: false,
    unlockLevel: 50, innCost: 250,
  },
  volcanic_harbor: {
    id: 'volcanic_harbor', name: '熔岩港', tier: 4,
    description: '建立在火山裂縫旁的特殊城市，以耐熱技術聞名天下。',
    zoneId: 'volcanic_plains',
    shopIds: ['flame_shop', 'volcanic_weapon_shop'],
    npcIds: ['harbor_master', 'fire_sage', 'volcanic_innkeeper'],
    hasDungeon: false, hasGuild: true, hasInn: true, hasBlacksmith: true,
    unlockLevel: 70, innCost: 500,
  },
  dragon_citadel: {
    id: 'dragon_citadel', name: '龍族聖城', tier: 5,
    description: '龍族與人類共同建立的神聖城市，傳說中最後的冒險者聖地。',
    zoneId: 'dragon_peaks',
    shopIds: ['dragon_shop', 'legend_weapon_shop'],
    npcIds: ['dragon_sage', 'citadel_innkeeper', 'legend_blacksmith'],
    hasDungeon: false, hasGuild: true, hasInn: true, hasBlacksmith: true,
    unlockLevel: 90, innCost: 1000,
  },
}

export const SHOPS: Record<string, ShopDefinition> = {
  // ── 始源城 ─────────────────────────────────────────
  general_shop: {
    id: 'general_shop', name: '通用商店', tier: 1,
    description: '販售各種基礎冒險用品。',
    currency: 'gold', rotatingSlots: 3,
    inventory: [
      { templateId: 'short_sword', price: D(100), quantity: 5, isRotating: false },
      { templateId: 'leather_cap', price: D(80), quantity: 5, isRotating: false },
      { templateId: 'cloth_robe', price: D(90), quantity: 5, isRotating: false },
      { templateId: 'leather_boots', price: D(70), quantity: 5, isRotating: false },
      { templateId: 'leather_leggings', price: D(75), quantity: 5, isRotating: false },
      { templateId: 'lucky_ring', price: D(150), quantity: 3, isRotating: false },
      { templateId: 'wooden_shield', price: D(60), quantity: 3, isRotating: false },
    ],
  },
  weapon_shop: {
    id: 'weapon_shop', name: '武器店', tier: 1,
    description: '專賣武器與防具的老字號商店。',
    currency: 'gold', rotatingSlots: 2,
    inventory: [
      { templateId: 'iron_sword', price: D(300), quantity: 3, isRotating: false },
      { templateId: 'magic_staff', price: D(280), quantity: 3, isRotating: false },
      { templateId: 'iron_helm', price: D(200), quantity: 3, isRotating: false },
      { templateId: 'iron_armor', price: D(350), quantity: 3, isRotating: false },
      { templateId: 'iron_boots', price: D(180), quantity: 3, isRotating: false },
      { templateId: 'iron_leggings', price: D(220), quantity: 3, isRotating: false },
      { templateId: 'iron_shield', price: D(260), quantity: 3, isRotating: false },
      { templateId: 'shadow_dagger', price: D(500), quantity: 2, isRotating: false },
    ],
  },
  // ── 谷地小鎮 ───────────────────────────────────────
  valley_shop: {
    id: 'valley_shop', name: '谷地雜貨店', tier: 1,
    description: '緊急補給站，提供中階冒險物資。',
    currency: 'gold', rotatingSlots: 2,
    inventory: [
      { templateId: 'iron_sword', price: D(280), quantity: 3, isRotating: false },
      { templateId: 'iron_armor', price: D(330), quantity: 3, isRotating: false },
      { templateId: 'iron_helm', price: D(190), quantity: 3, isRotating: false },
      { templateId: 'power_amulet', price: D(400), quantity: 2, isRotating: false },
      { templateId: 'attack_ring', price: D(350), quantity: 2, isRotating: false },
    ],
  },
  valley_weapon_shop: {
    id: 'valley_weapon_shop', name: '谷地兵器鋪', tier: 1,
    description: '專賣對付哥布林有效的武器。',
    currency: 'gold', rotatingSlots: 2,
    inventory: [
      { templateId: 'steel_sword', price: D(600), quantity: 3, isRotating: false },
      { templateId: 'shadow_dagger', price: D(480), quantity: 2, isRotating: false },
      { templateId: 'iron_shield', price: D(250), quantity: 3, isRotating: false },
    ],
  },
  // ── 沼澤村 ─────────────────────────────────────────
  swamp_shop: {
    id: 'swamp_shop', name: '沼澤雜貨', tier: 2,
    description: '充滿神奇物品的特殊商店。',
    currency: 'gold', rotatingSlots: 2,
    inventory: [
      { templateId: 'steel_sword', price: D(580), quantity: 3, isRotating: false },
      { templateId: 'chain_armor', price: D(750), quantity: 3, isRotating: false },
      { templateId: 'chain_leggings', price: D(600), quantity: 3, isRotating: false },
      { templateId: 'resistance_amulet', price: D(800), quantity: 2, isRotating: false },
      { templateId: 'mana_ring', price: D(500), quantity: 2, isRotating: false },
    ],
  },
  alchemy_shop: {
    id: 'alchemy_shop', name: '煉金商店', tier: 2,
    description: '販售魔法裝備和法術道具。',
    currency: 'gold', rotatingSlots: 2,
    inventory: [
      { templateId: 'fire_staff', price: D(900), quantity: 2, isRotating: false },
      { templateId: 'magic_staff', price: D(450), quantity: 3, isRotating: false },
      { templateId: 'mystic_robe', price: D(800), quantity: 2, isRotating: false },
      { templateId: 'mage_hood', price: D(650), quantity: 2, isRotating: false },
      { templateId: 'arcane_tome', price: D(700), quantity: 2, isRotating: false },
    ],
  },
  // ── 鐵鑄要塞 ───────────────────────────────────────
  forge_shop: {
    id: 'forge_shop', name: '熔爐鍛造', tier: 3,
    description: '以精鋼和特殊合金打造的頂級裝備。',
    currency: 'gold', rotatingSlots: 2,
    inventory: [
      { templateId: 'battle_axe', price: D(1500), quantity: 2, isRotating: false },
      { templateId: 'cursed_blade', price: D(2000), quantity: 2, isRotating: false },
      { templateId: 'mountain_hammer', price: D(2200), quantity: 2, isRotating: false },
      { templateId: 'steel_helm', price: D(1200), quantity: 3, isRotating: false },
      { templateId: 'dragon_mail', price: D(3000), quantity: 2, isRotating: false },
    ],
  },
  armory_shop: {
    id: 'armory_shop', name: '武具倉庫', tier: 3,
    description: '堡壘級防禦裝備的販售中心。',
    currency: 'gold', rotatingSlots: 2,
    inventory: [
      { templateId: 'chain_armor', price: D(700), quantity: 3, isRotating: false },
      { templateId: 'chain_leggings', price: D(580), quantity: 3, isRotating: false },
      { templateId: 'enchanted_boots', price: D(900), quantity: 2, isRotating: false },
      { templateId: 'iron_shield', price: D(500), quantity: 3, isRotating: false },
      { templateId: 'arcane_tome', price: D(800), quantity: 2, isRotating: false },
      { templateId: 'power_amulet', price: D(600), quantity: 2, isRotating: false },
    ],
  },
  // ── 森林前哨站 ─────────────────────────────────────
  forest_shop: {
    id: 'forest_shop', name: '前哨補給站', tier: 3,
    description: '深林中的緊急補給站，提供高階裝備。',
    currency: 'gold', rotatingSlots: 2,
    inventory: [
      { templateId: 'cursed_blade', price: D(1900), quantity: 2, isRotating: false },
      { templateId: 'fire_staff', price: D(1200), quantity: 2, isRotating: false },
      { templateId: 'mystic_robe', price: D(1500), quantity: 2, isRotating: false },
      { templateId: 'mage_hood', price: D(1000), quantity: 2, isRotating: false },
      { templateId: 'resistance_amulet', price: D(1200), quantity: 2, isRotating: false },
      { templateId: 'dragon_helm', price: D(4000), quantity: 1, isRotating: false },
    ],
  },
  // ── 熔岩港 ─────────────────────────────────────────
  flame_shop: {
    id: 'flame_shop', name: '烈焰商會', tier: 4,
    description: '以火山礦石打造的傳奇裝備販售處。',
    currency: 'gold', rotatingSlots: 3,
    inventory: [
      { templateId: 'dragon_helm', price: D(5000), quantity: 2, isRotating: false },
      { templateId: 'dragon_mail', price: D(7000), quantity: 2, isRotating: false },
      { templateId: 'dragon_greaves', price: D(5500), quantity: 2, isRotating: false },
      { templateId: 'dragon_ring', price: D(4500), quantity: 2, isRotating: false },
      { templateId: 'dragon_amulet', price: D(6000), quantity: 2, isRotating: false },
    ],
  },
  volcanic_weapon_shop: {
    id: 'volcanic_weapon_shop', name: '火炎兵器坊', tier: 4,
    description: '以火山熔岩淬煉的高階武器。',
    currency: 'gold', rotatingSlots: 2,
    inventory: [
      { templateId: 'great_sword', price: D(4000), quantity: 2, isRotating: false },
      { templateId: 'mountain_hammer', price: D(3500), quantity: 2, isRotating: false },
      { templateId: 'cursed_blade', price: D(3000), quantity: 2, isRotating: false },
      { templateId: 'fire_staff', price: D(3200), quantity: 2, isRotating: false },
    ],
  },
  // ── 龍族聖城 ───────────────────────────────────────
  dragon_shop: {
    id: 'dragon_shop', name: '龍族聖物鋪', tier: 5,
    description: '龍族工匠親手打造的傳說級裝備。',
    currency: 'gold', rotatingSlots: 3,
    inventory: [
      { templateId: 'dragon_ring', price: D(12000), quantity: 2, isRotating: false },
      { templateId: 'dragon_amulet', price: D(15000), quantity: 2, isRotating: false },
      { templateId: 'dragon_greaves', price: D(10000), quantity: 2, isRotating: false },
      { templateId: 'dragon_helm', price: D(11000), quantity: 2, isRotating: false },
    ],
  },
  legend_weapon_shop: {
    id: 'legend_weapon_shop', name: '傳說兵器殿', tier: 5,
    description: '只有頂尖冒險者才能駕馭的傳說武器。',
    currency: 'gold', rotatingSlots: 2,
    inventory: [
      { templateId: 'dragon_fang', price: D(25000), quantity: 1, isRotating: false },
      { templateId: 'dragon_scale_armor', price: D(30000), quantity: 1, isRotating: false },
      { templateId: 'great_sword', price: D(8000), quantity: 2, isRotating: false },
    ],
  },
}

export const NPCS: Record<string, NpcDefinition> = {
  // ── 始源城 ─────────────────────────────────────────
  elder: {
    id: 'elder', name: '老村長', title: '始源城長老',
    description: '城鎮的守護者，飽經風霜的智者。',
    townId: 'starting_town',
    questIds: ['quest_first_steps', 'quest_goblin_menace', 'quest_knights_oath'],
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
    questIds: ['quest_guild_rookie', 'quest_goblin_valley_hunter'],
    dialogueTree: [
      {
        id: 'root',
        text: '公會歡迎你。這裡有最新的委託，完成任務可以提升公會等級，解鎖更好的獎勵。',
        options: [
          { text: '查看委託', nextId: undefined, action: 'show_quests' },
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
  // ── 谷地小鎮 ───────────────────────────────────────
  valley_elder: {
    id: 'valley_elder', name: '谷地村長', title: '谷地村長',
    description: '飽受哥布林侵擾的老村長，眼神中透露出疲憊與希望。',
    townId: 'valley_town',
    questIds: ['quest_valley_defender', 'quest_goblin_fortress'],
    dialogueTree: [
      {
        id: 'root',
        text: '終於有強大的冒險者來了！我們村子被哥布林圍攻已久，拜託你幫幫我們。',
        options: [
          { text: '我願意幫忙', nextId: 'quest_menu', action: 'show_quests' },
          { text: '只是路過', nextId: undefined },
        ],
      },
    ],
    shopId: undefined,
  },
  valley_innkeeper: {
    id: 'valley_innkeeper', name: '谷地旅店老闆娘', title: '旅店老闆娘',
    description: '勤勞的中年女性，為所有冒險者提供休憩之所。',
    townId: 'valley_town',
    questIds: [],
    dialogueTree: [
      {
        id: 'root',
        text: '歡迎！我們的旅店雖然簡陋，但很安全。住宿費 40 金幣，完全恢復 HP/MP。',
        options: [
          { text: '住宿（40 金幣）', nextId: undefined, action: 'inn_rest', condition: 'gold>=40' },
          { text: '不了，謝謝', nextId: undefined },
        ],
      },
    ],
    shopId: undefined,
  },
  valley_blacksmith: {
    id: 'valley_blacksmith', name: '矮人鐵匠', title: '谷地鐵匠',
    description: '來自礦山的矮人鐵匠，擅長打造厚重武器。',
    townId: 'valley_town',
    questIds: [],
    dialogueTree: [
      {
        id: 'root',
        text: '喝！好久沒見到像樣的客人了！讓我看看你的裝備，我幫你強化！',
        options: [
          { text: '強化裝備', nextId: undefined, action: 'open_enchant' },
          { text: '購買武器', nextId: undefined, action: 'open_shop' },
          { text: '離開', nextId: undefined },
        ],
      },
    ],
    shopId: 'valley_weapon_shop',
  },
  // ── 沼澤村 ─────────────────────────────────────────
  swamp_elder: {
    id: 'swamp_elder', name: '沼澤巫師', title: '沼澤村長老',
    description: '掌握古老沼澤魔法的神秘老者。',
    townId: 'swamp_village',
    questIds: ['quest_swamp_purge', 'quest_hydra_slayer'],
    dialogueTree: [
      {
        id: 'root',
        text: '來者何人...你的氣息不同尋常。沼澤的詛咒越來越強，我們需要你的力量。',
        options: [
          { text: '有什麼任務嗎？', nextId: 'quest_menu', action: 'show_quests' },
          { text: '離開', nextId: undefined },
        ],
      },
    ],
    shopId: undefined,
  },
  swamp_innkeeper: {
    id: 'swamp_innkeeper', name: '沼澤旅店老闆', title: '旅店老闆',
    description: '沉默寡言的旅店老闆，提供安全的休憩場所。',
    townId: 'swamp_village',
    questIds: [],
    dialogueTree: [
      {
        id: 'root',
        text: '住宿嗎？80 金幣，完全恢復 HP/MP。這裡是沼澤地帶唯一的安全之所。',
        options: [
          { text: '住宿（80 金幣）', nextId: undefined, action: 'inn_rest', condition: 'gold>=80' },
          { text: '不了，謝謝', nextId: undefined },
        ],
      },
    ],
    shopId: undefined,
  },
  alchemist_npc: {
    id: 'alchemist_npc', name: '煉金術士', title: '神秘煉金術士',
    description: '精通藥劑調配的神秘術士，能強化任何魔法裝備。',
    townId: 'swamp_village',
    questIds: [],
    dialogueTree: [
      {
        id: 'root',
        text: '滋滋...正在煮藥。要魔法強化嗎？我的手藝可比那些普通鐵匠強多了。',
        options: [
          { text: '魔法強化（附魔）', nextId: undefined, action: 'open_enchant' },
          { text: '購買法術裝備', nextId: undefined, action: 'open_shop' },
          { text: '離開', nextId: undefined },
        ],
      },
    ],
    shopId: 'alchemy_shop',
  },
  // ── 鐵鑄要塞 ───────────────────────────────────────
  fortress_commander: {
    id: 'fortress_commander', name: '要塞指揮官', title: '鐵鑄要塞指揮官',
    description: '統帥要塞防禦力量的老練軍人。',
    townId: 'iron_fortress',
    questIds: ['quest_iron_guardian', 'quest_titan_slayer'],
    dialogueTree: [
      {
        id: 'root',
        text: '新來的冒險者？鐵山的構造體越來越難對付了，我需要強力的援助。',
        options: [
          { text: '我能協助', nextId: 'quest_menu', action: 'show_quests' },
          { text: '只是路過', nextId: undefined },
        ],
      },
    ],
    shopId: undefined,
  },
  master_blacksmith: {
    id: 'master_blacksmith', name: '大師鐵匠', title: '要塞首席鐵匠',
    description: '鍛造技藝達到傳奇境界的大師級鐵匠。',
    townId: 'iron_fortress',
    questIds: [],
    dialogueTree: [
      {
        id: 'root',
        text: '要打造或強化裝備嗎？讓老夫的錘子來幫你！',
        options: [
          { text: '強化裝備', nextId: undefined, action: 'open_enchant' },
          { text: '購買裝備', nextId: undefined, action: 'open_shop' },
          { text: '離開', nextId: undefined },
        ],
      },
    ],
    shopId: 'forge_shop',
  },
  fortress_innkeeper: {
    id: 'fortress_innkeeper', name: '要塞酒館老闆', title: '酒館老闆',
    description: '豪爽的酒館老闆，為戰士們提供酒食與休憩。',
    townId: 'iron_fortress',
    questIds: [],
    dialogueTree: [
      {
        id: 'root',
        text: '歡迎來到「鐵砧酒館」！住宿費 150 金幣，包吃包睡，完全恢復！',
        options: [
          { text: '住宿（150 金幣）', nextId: undefined, action: 'inn_rest', condition: 'gold>=150' },
          { text: '不了，謝謝', nextId: undefined },
        ],
      },
    ],
    shopId: undefined,
  },
  // ── 森林前哨站 ─────────────────────────────────────
  ranger_captain: {
    id: 'ranger_captain', name: '游俠隊長', title: '黑暗森林游俠隊長',
    description: '帶領探索隊深入黑暗森林的勇敢女性。',
    townId: 'forest_outpost',
    questIds: ['quest_arcane_trial', 'quest_forest_purge'],
    dialogueTree: [
      {
        id: 'root',
        text: '歡迎來到前哨站。森林深處危機四伏，你有我們需要的力量嗎？',
        options: [
          { text: '什麼任務？', nextId: 'quest_menu', action: 'show_quests' },
          { text: '我只是路過', nextId: undefined },
        ],
      },
    ],
    shopId: undefined,
  },
  forest_alchemist: {
    id: 'forest_alchemist', name: '森林藥師', title: '前哨站藥師',
    description: '利用森林植物調配藥水的神秘術士。',
    townId: 'forest_outpost',
    questIds: [],
    dialogueTree: [
      {
        id: 'root',
        text: '來者可是需要補給？住宿費 250 金幣，這裡是黑暗森林最安全的地方。',
        options: [
          { text: '住宿（250 金幣）', nextId: undefined, action: 'inn_rest', condition: 'gold>=250' },
          { text: '購買裝備', nextId: undefined, action: 'open_shop' },
          { text: '離開', nextId: undefined },
        ],
      },
    ],
    shopId: 'forest_shop',
  },
  // ── 熔岩港 ─────────────────────────────────────────
  harbor_master: {
    id: 'harbor_master', name: '港口長官', title: '熔岩港長官',
    description: '統管整個熔岩港的強硬官員。',
    townId: 'volcanic_harbor',
    questIds: ['quest_volcano_explorer', 'quest_volcano_lord'],
    dialogueTree: [
      {
        id: 'root',
        text: '火山的活動越來越劇烈，連熔岩港都開始動搖。強者，能幫我們嗎？',
        options: [
          { text: '有什麼任務？', nextId: 'quest_menu', action: 'show_quests' },
          { text: '只是路過', nextId: undefined },
        ],
      },
    ],
    shopId: undefined,
  },
  fire_sage: {
    id: 'fire_sage', name: '火焰賢者', title: '火系魔法賢者',
    description: '精通火焰魔法的老智者，能強化火系裝備。',
    townId: 'volcanic_harbor',
    questIds: [],
    dialogueTree: [
      {
        id: 'root',
        text: '來者不凡。讓我看看你的裝備，賦予它火焰之力！',
        options: [
          { text: '強化裝備', nextId: undefined, action: 'open_enchant' },
          { text: '購買裝備', nextId: undefined, action: 'open_shop' },
          { text: '離開', nextId: undefined },
        ],
      },
    ],
    shopId: 'flame_shop',
  },
  volcanic_innkeeper: {
    id: 'volcanic_innkeeper', name: '熔岩旅店老闆', title: '旅店老闆',
    description: '在高溫環境中毫不在乎地工作的特殊旅店老闆。',
    townId: 'volcanic_harbor',
    questIds: [],
    dialogueTree: [
      {
        id: 'root',
        text: '歡迎！火山地帶的住宿費 500 金幣，完全恢復 HP/MP，值得的！',
        options: [
          { text: '住宿（500 金幣）', nextId: undefined, action: 'inn_rest', condition: 'gold>=500' },
          { text: '不了，謝謝', nextId: undefined },
        ],
      },
    ],
    shopId: undefined,
  },
  // ── 龍族聖城 ───────────────────────────────────────
  dragon_sage: {
    id: 'dragon_sage', name: '龍族賢者', title: '龍族聖城賢者',
    description: '半龍半人的古老賢者，掌握著龍族最深奧的知識。',
    townId: 'dragon_citadel',
    questIds: ['quest_dragon_covenant', 'quest_dragon_patriarch'],
    dialogueTree: [
      {
        id: 'root',
        text: '能走到這裡的冒險者，你的力量已非凡人可比。龍族的最終試煉在等著你。',
        options: [
          { text: '接受試煉', nextId: 'quest_menu', action: 'show_quests' },
          { text: '我還未準備好', nextId: undefined },
        ],
      },
    ],
    shopId: undefined,
  },
  citadel_innkeeper: {
    id: 'citadel_innkeeper', name: '聖城旅店老闆', title: '聖城旅店老闆',
    description: '龍族聖城中唯一的人類旅店老闆，受到龍族保護。',
    townId: 'dragon_citadel',
    questIds: [],
    dialogueTree: [
      {
        id: 'root',
        text: '能來到聖城的勇者，歡迎！住宿費 1000 金幣，完全恢復一切。',
        options: [
          { text: '住宿（1000 金幣）', nextId: undefined, action: 'inn_rest', condition: 'gold>=1000' },
          { text: '不了，謝謝', nextId: undefined },
        ],
      },
    ],
    shopId: undefined,
  },
  legend_blacksmith: {
    id: 'legend_blacksmith', name: '傳說鐵匠', title: '龍族傳說鐵匠',
    description: '得到龍族傳承技藝的最偉大鐵匠，能強化任何裝備至極限。',
    townId: 'dragon_citadel',
    questIds: [],
    dialogueTree: [
      {
        id: 'root',
        text: '能來到這裡的裝備，必定也是傳奇之物。讓我來將它推向極限！',
        options: [
          { text: '強化裝備', nextId: undefined, action: 'open_enchant' },
          { text: '購買傳說裝備', nextId: undefined, action: 'open_shop' },
          { text: '離開', nextId: undefined },
        ],
      },
    ],
    shopId: 'legend_weapon_shop',
  },
}

export function getTown(id: string): TownDefinition | undefined { return TOWNS[id] }
export function getShop(id: string): ShopDefinition | undefined { return SHOPS[id] }
export function getNPC(id: string): NpcDefinition | undefined { return NPCS[id] }
