import Decimal from 'decimal.js'
import { D, fmt } from '../../core/bignum'
import { bus } from '../../core/eventbus'
import { log } from '../../core/logger'
import { grantXP, grantGold } from '../player/PlayerSystem'
import type { PlayerState } from '../../types'

export interface QuestDefinition {
  id: string
  title: string
  description: string
  giverNpcId: string
  type: 'main' | 'side' | 'guild' | 'repeatable'
  objectives: {
    type: 'kill' | 'collect' | 'visit' | 'talk'
    target: string
    required: number
    description: string
  }[]
  rewards: { xp: Decimal; gold: Decimal; items?: string[] }
  prerequisites: string[]
  unlockFlag?: string
}

export const QUEST_DEFINITIONS: Record<string, QuestDefinition> = {
  // ── 始源城任務 ─────────────────────────────────────
  quest_first_steps: {
    id: 'quest_first_steps', title: '冒險的第一步',
    description: '前往東側草原，擊敗 3 隻史萊姆，感受戰鬥的滋味。',
    giverNpcId: 'elder', type: 'main',
    objectives: [{ type: 'kill', target: 'slime', required: 3, description: '擊敗史萊姆 0/3' }],
    rewards: { xp: D(500), gold: D(200) },
    prerequisites: [],
    unlockFlag: 'quest_first_steps_done',
  },
  quest_goblin_menace: {
    id: 'quest_goblin_menace', title: '哥布林的威脅',
    description: '哥布林開始侵擾農村，擊敗 5 隻哥布林以確保村民安全。',
    giverNpcId: 'elder', type: 'main',
    objectives: [{ type: 'kill', target: 'goblin', required: 5, description: '擊敗哥布林 0/5' }],
    rewards: { xp: D(1500), gold: D(500), items: ['iron_sword'] },
    prerequisites: ['quest_first_steps'],
    unlockFlag: 'quest_goblin_menace_done',
  },
  quest_knights_oath: {
    id: 'quest_knights_oath', title: '騎士的誓言',
    description: '擊敗 8 隻野狼，展現你的戰士資質。',
    giverNpcId: 'elder', type: 'side',
    objectives: [{ type: 'kill', target: 'wolf', required: 8, description: '擊敗野狼 0/8' }],
    rewards: { xp: D(3000), gold: D(1000) },
    prerequisites: ['quest_goblin_menace'],
    unlockFlag: 'quest_knights_oath_done',
  },
  quest_guild_rookie: {
    id: 'quest_guild_rookie', title: '公會新手任務',
    description: '作為公會新成員，完成你的第一項基礎委託。',
    giverNpcId: 'guild_master', type: 'guild',
    objectives: [{ type: 'kill', target: 'wolf', required: 3, description: '擊敗野狼 0/3' }],
    rewards: { xp: D(1200), gold: D(400) },
    prerequisites: [],
  },
  quest_goblin_valley_hunter: {
    id: 'quest_goblin_valley_hunter', title: '山谷獵人',
    description: '深入哥布林山谷，消滅哥布林戰士的威脅。',
    giverNpcId: 'guild_master', type: 'guild',
    objectives: [{ type: 'kill', target: 'goblin_warrior', required: 10, description: '擊敗哥布林戰士 0/10' }],
    rewards: { xp: D(8000), gold: D(2500) },
    prerequisites: ['quest_goblin_menace'],
  },
  // ── 谷地小鎮任務 ───────────────────────────────────
  quest_valley_defender: {
    id: 'quest_valley_defender', title: '谷地守護者',
    description: '消滅在山谷入口徘徊的哥布林戰士，保護村民的安全。',
    giverNpcId: 'valley_elder', type: 'main',
    objectives: [
      { type: 'kill', target: 'goblin_warrior', required: 8, description: '擊敗哥布林戰士 0/8' },
      { type: 'kill', target: 'cave_bat', required: 5, description: '消滅洞穴蝙蝠 0/5' },
    ],
    rewards: { xp: D(12000), gold: D(3500) },
    prerequisites: ['quest_goblin_menace'],
    unlockFlag: 'quest_valley_defender_done',
  },
  quest_goblin_fortress: {
    id: 'quest_goblin_fortress', title: '攻破要塞',
    description: '進入哥布林要塞，消滅哥布林軍閥的精銳部隊。',
    giverNpcId: 'valley_elder', type: 'main',
    objectives: [{ type: 'kill', target: 'goblin_warlord', required: 1, description: '擊敗哥布林軍閥 0/1' }],
    rewards: { xp: D(30000), gold: D(8000), items: ['steel_sword'] },
    prerequisites: ['quest_valley_defender'],
    unlockFlag: 'quest_goblin_fortress_done',
  },
  // ── 沼澤村任務 ─────────────────────────────────────
  quest_swamp_purge: {
    id: 'quest_swamp_purge', title: '沼澤淨化',
    description: '消滅沼澤中泛濫的毒蟾蜍和沼澤女巫，減弱詛咒的力量。',
    giverNpcId: 'swamp_elder', type: 'main',
    objectives: [
      { type: 'kill', target: 'poison_toad', required: 10, description: '擊敗毒蟾蜍 0/10' },
      { type: 'kill', target: 'swamp_witch', required: 5, description: '消滅沼澤女巫 0/5' },
    ],
    rewards: { xp: D(25000), gold: D(7000) },
    prerequisites: ['quest_valley_defender'],
    unlockFlag: 'quest_swamp_purge_done',
  },
  quest_hydra_slayer: {
    id: 'quest_hydra_slayer', title: '九頭蛇獵殺',
    description: '傳說沼澤深處潛伏著巨大的九頭蛇，請幫我們消滅它。',
    giverNpcId: 'swamp_elder', type: 'main',
    objectives: [{ type: 'kill', target: 'swamp_hydra', required: 1, description: '擊敗沼澤九頭蛇 0/1' }],
    rewards: { xp: D(60000), gold: D(15000), items: ['fire_staff'] },
    prerequisites: ['quest_swamp_purge'],
    unlockFlag: 'quest_hydra_slayer_done',
  },
  // ── 鐵鑄要塞任務 ───────────────────────────────────
  quest_iron_guardian: {
    id: 'quest_iron_guardian', title: '鐵山守護者',
    description: '消滅入侵礦坑的鐵甲守衛，確保採礦作業的安全。',
    giverNpcId: 'fortress_commander', type: 'main',
    objectives: [
      { type: 'kill', target: 'iron_sentinel', required: 12, description: '擊敗鐵甲守衛 0/12' },
      { type: 'kill', target: 'stone_golem', required: 6, description: '擊敗石像魔像 0/6' },
    ],
    rewards: { xp: D(50000), gold: D(12000) },
    prerequisites: ['quest_swamp_purge'],
    unlockFlag: 'quest_iron_guardian_done',
  },
  quest_titan_slayer: {
    id: 'quest_titan_slayer', title: '泰坦終結者',
    description: '深入鐵礦最深處，消滅傳說中的鐵甲泰坦。',
    giverNpcId: 'fortress_commander', type: 'main',
    objectives: [{ type: 'kill', target: 'iron_titan', required: 1, description: '擊敗鐵甲泰坦 0/1' }],
    rewards: { xp: D(120000), gold: D(30000), items: ['mountain_hammer'] },
    prerequisites: ['quest_iron_guardian'],
    unlockFlag: 'quest_titan_slayer_done',
  },
  // ── 森林前哨任務 ───────────────────────────────────
  quest_arcane_trial: {
    id: 'quest_arcane_trial', title: '奧術試煉',
    description: '通過魔法師公會的試煉，證明你的奧術實力。',
    giverNpcId: 'ranger_captain', type: 'side',
    objectives: [{ type: 'kill', target: 'dark_mage', required: 10, description: '擊敗黑暗法師 0/10' }],
    rewards: { xp: D(80000), gold: D(20000) },
    prerequisites: ['quest_iron_guardian'],
    unlockFlag: 'quest_arcane_trial_done',
  },
  quest_forest_purge: {
    id: 'quest_forest_purge', title: '森林淨化',
    description: '黑暗森林的深處有強大的怪物聚集，需要英雄清除這些威脅。',
    giverNpcId: 'ranger_captain', type: 'guild',
    objectives: [
      { type: 'kill', target: 'thunder_hawk', required: 8, description: '擊敗雷鷹 0/8' },
      { type: 'kill', target: 'dragon_hatchling', required: 5, description: '擊敗幼龍 0/5' },
    ],
    rewards: { xp: D(100000), gold: D(25000) },
    prerequisites: ['quest_arcane_trial'],
    unlockFlag: 'quest_forest_purge_done',
  },
  // ── 熔岩港任務 ─────────────────────────────────────
  quest_volcano_explorer: {
    id: 'quest_volcano_explorer', title: '火山探險家',
    description: '深入火山荒原，消滅熔岩元素和火焰飛蜥的威脅。',
    giverNpcId: 'harbor_master', type: 'main',
    objectives: [
      { type: 'kill', target: 'lava_elemental', required: 12, description: '擊敗熔岩元素 0/12' },
      { type: 'kill', target: 'fire_drake', required: 8, description: '擊敗火焰飛蜥 0/8' },
    ],
    rewards: { xp: D(200000), gold: D(50000) },
    prerequisites: ['quest_forest_purge'],
    unlockFlag: 'quest_volcano_explorer_done',
  },
  quest_volcano_lord: {
    id: 'quest_volcano_lord', title: '火山魔君討伐',
    description: '傳說中統治火山的強大存在——火山魔君，必須被消滅。',
    giverNpcId: 'harbor_master', type: 'main',
    objectives: [{ type: 'kill', target: 'volcano_lord', required: 1, description: '擊敗火山魔君 0/1' }],
    rewards: { xp: D(500000), gold: D(100000), items: ['dragon_fang'] },
    prerequisites: ['quest_volcano_explorer'],
    unlockFlag: 'quest_volcano_lord_done',
  },
  // ── 龍族聖城任務 ───────────────────────────────────
  quest_dragon_covenant: {
    id: 'quest_dragon_covenant', title: '龍族契約',
    description: '在龍族高峰之巔，與古老的龍族締結傳說中的契約。',
    giverNpcId: 'dragon_sage', type: 'main',
    objectives: [
      { type: 'kill', target: 'young_dragon', required: 5, description: '擊敗亞成體龍 0/5' },
      { type: 'kill', target: 'ancient_lich', required: 8, description: '消滅遠古骷髏法師 0/8' },
    ],
    rewards: { xp: D(800000), gold: D(200000) },
    prerequisites: ['quest_volcano_lord'],
    unlockFlag: 'quest_dragon_covenant_done',
  },
  quest_dragon_patriarch: {
    id: 'quest_dragon_patriarch', title: '龍族族長的考驗',
    description: '最終的試煉——面對龍族族長，証明你是傳說中的英雄。',
    giverNpcId: 'dragon_sage', type: 'main',
    objectives: [{ type: 'kill', target: 'dragon_patriarch', required: 1, description: '擊敗龍族族長 0/1' }],
    rewards: { xp: D(2000000), gold: D(500000), items: ['dragon_scale_armor'] },
    prerequisites: ['quest_dragon_covenant'],
    unlockFlag: 'quest_dragon_patriarch_done',
  },
}

// 接受任務
export function acceptQuest(player: PlayerState, questId: string): boolean {
  const quest = QUEST_DEFINITIONS[questId]
  if (!quest) { log.warning('未知任務'); return false }
  if (player.completedQuestIds.includes(questId)) { log.warning('你已完成此任務'); return false }
  if (player.quests.some(q => q.questId === questId)) { log.warning('你已接受此任務'); return false }

  // 檢查前置任務
  for (const pre of quest.prerequisites) {
    if (!player.completedQuestIds.includes(pre)) {
      const preQuest = QUEST_DEFINITIONS[pre]
      log.warning(`需要先完成「${preQuest?.title ?? pre}」`)
      return false
    }
  }

  player.quests.push({
    questId,
    objectiveProgress: Object.fromEntries(quest.objectives.map((o, i) => [`${i}`, 0])),
    isComplete: false,
  })
  bus.emit('quest:accepted', { questId, title: quest.title })
  log.quest(`✦ 接受任務：「${quest.title}」`)
  quest.objectives.forEach(o => log.quest(`  ○ ${o.description}`))
  return true
}

// 更新任務進度（擊殺類型）
export function updateQuestProgress(player: PlayerState, killTarget: string, count = 1): void {
  for (const progress of player.quests) {
    if (progress.isComplete) continue
    const quest = QUEST_DEFINITIONS[progress.questId]
    if (!quest) continue
    quest.objectives.forEach((obj, i) => {
      if (obj.type === 'kill' && obj.target === killTarget) {
        const current = (progress.objectiveProgress[`${i}`] ?? 0) + count
        progress.objectiveProgress[`${i}`] = Math.min(current, obj.required)
        if (current >= obj.required) {
          log.quest(`  ✔ ${obj.description.split(' ')[0]} 完成！`)
        }
      }
    })
    checkQuestCompletion(player, progress.questId)
  }
}

// 檢查任務是否可以完成
function checkQuestCompletion(player: PlayerState, questId: string): boolean {
  const progress = player.quests.find(q => q.questId === questId)
  const quest = QUEST_DEFINITIONS[questId]
  if (!progress || !quest) return false

  const allDone = quest.objectives.every((o, i) =>
    (progress.objectiveProgress[`${i}`] ?? 0) >= o.required
  )
  if (allDone && !progress.isComplete) {
    progress.isComplete = true
    bus.emit('quest:ready', { questId, title: quest.title })
    log.quest(`★ 任務「${quest.title}」可以交付了！`)
    return true
  }
  return false
}

// 提交任務
export function completeQuest(player: PlayerState, questId: string): boolean {
  const progress = player.quests.find(q => q.questId === questId)
  const quest = QUEST_DEFINITIONS[questId]
  if (!progress || !quest) { log.warning('找不到任務'); return false }
  if (!progress.isComplete) {
    if (!checkQuestCompletion(player, questId)) {
      log.warning('任務尚未完成。')
      return false
    }
  }

  // 給予獎勵
  grantXP(player, quest.rewards.xp)
  grantGold(player, quest.rewards.gold)
  player.quests = player.quests.filter(q => q.questId !== questId)
  player.completedQuestIds.push(questId)
  if (quest.unlockFlag) player.flags[quest.unlockFlag] = true

  bus.emit('quest:complete', { questId, title: quest.title })
  log.separator()
  log.success(`★ 任務完成：「${quest.title}」`)
  log.quest(`  獎勵：${fmt(quest.rewards.xp)} XP、${fmt(quest.rewards.gold)} 金幣`)
  log.separator()
  return true
}
