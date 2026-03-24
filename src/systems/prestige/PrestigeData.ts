import Decimal from 'decimal.js'
import { D } from '../../core/bignum'
import type { PrestigeBonusNode, PrestigeMilestone } from '../../types'

export const PRESTIGE_NODES: Record<string, PrestigeBonusNode> = {
  // ── Tier 1 ──────────────────────────────────────
  soul_power: {
    id: 'soul_power', name: '靈魂之力', tier: 1,
    description: '全屬性永久提升 5%',
    costPerLevel: D(10), maxLevel: 100,
    effect: { stat: 'all', percentBonus: 5 },
    prerequisiteIds: [],
    unlockRebirthCount: 1,
  },
  soul_wealth: {
    id: 'soul_wealth', name: '靈魂財富', tier: 1,
    description: '起始金幣提升 10%',
    costPerLevel: D(8), maxLevel: 50,
    effect: { special: 'start_gold', percentBonus: 10 },
    prerequisiteIds: [],
    unlockRebirthCount: 1,
  },
  soul_speed: {
    id: 'soul_speed', name: '靈魂速悟', tier: 1,
    description: '等級所需 XP 減少 2%',
    costPerLevel: D(15), maxLevel: 25,
    effect: { special: 'xp_reduction', percentBonus: 2 },
    prerequisiteIds: [],
    unlockRebirthCount: 1,
  },
  // ── Tier 2 ──────────────────────────────────────
  eternal_strength: {
    id: 'eternal_strength', name: '永恆之力', tier: 2,
    description: '攻擊與防禦倍率提升 10%',
    costPerLevel: D(25), maxLevel: 50,
    effect: { stat: 'atk_def', percentBonus: 10 },
    prerequisiteIds: ['soul_power'],
    unlockRebirthCount: 5,
  },
  arcane_legacy: {
    id: 'arcane_legacy', name: '奧術傳承', tier: 2,
    description: '魔攻與魔防倍率提升 10%',
    costPerLevel: D(25), maxLevel: 50,
    effect: { stat: 'matk_mdef', percentBonus: 10 },
    prerequisiteIds: ['soul_power'],
    unlockRebirthCount: 5,
  },
  lucky_star: {
    id: 'lucky_star', name: '幸運之星', tier: 2,
    description: '幸運永久提升 2%',
    costPerLevel: D(20), maxLevel: 50,
    effect: { stat: 'lck', percentBonus: 2 },
    prerequisiteIds: ['soul_wealth'],
    unlockRebirthCount: 5,
  },
  // ── Tier 3 ──────────────────────────────────────
  transcendence: {
    id: 'transcendence', name: '超越之境', tier: 3,
    description: '屬性隨重生次數指數成長',
    costPerLevel: D(100), maxLevel: 20,
    effect: { special: 'exponential_growth', percentBonus: 5 },
    prerequisiteIds: ['eternal_strength', 'arcane_legacy'],
    unlockRebirthCount: 20,
  },
  ancient_knowledge: {
    id: 'ancient_knowledge', name: '古老知識', tier: 3,
    description: '每次重生時已解鎖 Tier 1 職業',
    costPerLevel: D(80), maxLevel: 1,
    effect: { special: 'start_jobs_unlocked' },
    prerequisiteIds: ['soul_speed'],
    unlockRebirthCount: 20,
  },
  soul_companion: {
    id: 'soul_companion', name: '靈魂夥伴', tier: 3,
    description: '每次重生時帶著一名基礎同伴開始',
    costPerLevel: D(60), maxLevel: 1,
    effect: { special: 'start_with_companion' },
    prerequisiteIds: ['lucky_star'],
    unlockRebirthCount: 20,
  },
  // ── Tier 4 ──────────────────────────────────────
  infinite_potential: {
    id: 'infinite_potential', name: '無限潛能', tier: 4,
    description: '移除屬性成長的有效上限',
    costPerLevel: D(500), maxLevel: 1,
    effect: { special: 'remove_stat_cap' },
    prerequisiteIds: ['transcendence'],
    unlockRebirthCount: 100,
  },
  echo_of_legends: {
    id: 'echo_of_legends', name: '傳說回聲', tier: 4,
    description: '擊敗 BOSS 後永久獲得微量屬性加成',
    costPerLevel: D(300), maxLevel: 1,
    effect: { special: 'boss_echo_bonus' },
    prerequisiteIds: ['transcendence'],
    unlockRebirthCount: 100,
  },
}

export const PRESTIGE_MILESTONES: PrestigeMilestone[] = [
  { rebirthCount: 1,    title: '第一次重生',   description: '你踏上了無盡輪迴的道路。',             rewards: ['解鎖重生樹 Tier 1'],                    unlocksFeature: 'prestige_tree_t1' },
  { rebirthCount: 5,    title: '五次輪迴',     description: '你開始掌握重生的節奏。',               rewards: ['解鎖重生樹 Tier 2', '解鎖自動戰鬥'],      unlocksFeature: 'auto_combat' },
  { rebirthCount: 10,   title: '十重天',       description: '每一次重生讓你更加強大。',              rewards: ['解鎖自動探索循環', '離線進度提升至 60%'],  unlocksFeature: 'auto_explore' },
  { rebirthCount: 15,   title: '輪迴老手',     description: '重生已成為你的日常，節奏越來越快。',    rewards: ['解鎖自動出售低稀有度裝備'],               unlocksFeature: 'auto_sell' },
  { rebirthCount: 20,   title: '超越凡境',     description: '你的力量已超越普通冒險者的想像。',      rewards: ['解鎖重生樹 Tier 3', '解鎖自動裝備'],       unlocksFeature: 'prestige_tree_t3' },
  { rebirthCount: 50,   title: '半不死身',     description: '你已無懼死亡，將重生視為另一次機會。',  rewards: ['離線進度提升至 75%'],                     unlocksFeature: 'offline_rate_75' },
  { rebirthCount: 100,  title: '永恆輪迴者',   description: '百次輪迴，你已觸及永恆的邊界。',        rewards: ['解鎖重生樹 Tier 4', '離線進度提升至 90%'], unlocksFeature: 'prestige_tree_t4' },
  { rebirthCount: 250,  title: '傳說',         description: '你的名字已成為傳說。',                 rewards: ['所有商店 10% 折扣'],                      unlocksFeature: 'shop_discount' },
  { rebirthCount: 500,  title: '神話',         description: '超越傳說，進入神話的領域。',            rewards: ['完全 AFK 模式（不需開啟瀏覽器）'],         unlocksFeature: 'afk_mode' },
  { rebirthCount: 1000, title: '永恆之神',     description: '你已超越所有限制，成為這個世界的一部分。', rewards: ['解鎖隱藏結局'],                        unlocksFeature: 'true_ending' },
]
