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
  quest_first_steps: {
    id: 'quest_first_steps', title: '冒險的第一步',
    description: '前往東側草原，擊敗 3 隻史萊姆，感受戰鬥的滋味。',
    giverNpcId: 'elder', type: 'main',
    objectives: [{ type: 'kill', target: 'slime', required: 3, description: '擊敗史萊姆 0/3' }],
    rewards: { xp: D(100), gold: D(50) },
    prerequisites: [],
    unlockFlag: 'quest_first_steps_done',
  },
  quest_goblin_menace: {
    id: 'quest_goblin_menace', title: '哥布林的威脅',
    description: '哥布林開始侵擾農村，擊敗 5 隻哥布林以確保村民安全。',
    giverNpcId: 'elder', type: 'main',
    objectives: [{ type: 'kill', target: 'goblin', required: 5, description: '擊敗哥布林 0/5' }],
    rewards: { xp: D(250), gold: D(120), items: ['iron_sword'] },
    prerequisites: ['quest_first_steps'],
    unlockFlag: 'quest_goblin_menace_done',
  },
  quest_guild_rookie: {
    id: 'quest_guild_rookie', title: '公會新手任務',
    description: '作為公會新成員，完成你的第一項基礎委託。',
    giverNpcId: 'guild_master', type: 'guild',
    objectives: [{ type: 'kill', target: 'wolf', required: 3, description: '擊敗野狼 0/3' }],
    rewards: { xp: D(150), gold: D(80) },
    prerequisites: [],
  },
  quest_knights_oath: {
    id: 'quest_knights_oath', title: '騎士的誓言',
    description: '前往古老的騎士石碑，宣誓效忠。',
    giverNpcId: 'elder', type: 'side',
    objectives: [{ type: 'visit', target: 'knights_monument', required: 1, description: '前往騎士石碑' }],
    rewards: { xp: D(5000), gold: D(1000) },
    prerequisites: ['quest_goblin_menace'],
    unlockFlag: 'quest_knights_oath_done',
  },
  quest_arcane_trial: {
    id: 'quest_arcane_trial', title: '奧術試煉',
    description: '通過魔法師公會的試煉，證明你的奧術實力。',
    giverNpcId: 'guild_master', type: 'side',
    objectives: [{ type: 'kill', target: 'dark_mage', required: 10, description: '擊敗黑暗法師 0/10' }],
    rewards: { xp: D(8000), gold: D(2000) },
    prerequisites: ['quest_goblin_menace'],
    unlockFlag: 'quest_arcane_trial_done',
  },
  quest_dragon_covenant: {
    id: 'quest_dragon_covenant', title: '龍族契約',
    description: '尋找傳說中的龍族聖地，與龍族締結契約。',
    giverNpcId: 'elder', type: 'main',
    objectives: [
      { type: 'kill', target: 'dragon_hatchling', required: 5, description: '擊敗幼龍 0/5' },
      { type: 'visit', target: 'dragon_peak', required: 1, description: '前往龍峰' },
    ],
    rewards: { xp: D(50000), gold: D(10000) },
    prerequisites: ['quest_knights_oath'],
    unlockFlag: 'quest_dragon_covenant_done',
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
