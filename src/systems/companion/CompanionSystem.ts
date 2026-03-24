import Decimal from 'decimal.js'
import { D } from '../../core/bignum'
import { globalRng } from '../../core/rng'
import { log } from '../../core/logger'
import { bus } from '../../core/eventbus'
import { calcTameChance } from '../../core/formula'
import { MAX_COMPANIONS } from '../../constants'
import type { PlayerState, Companion, MonsterTemplate } from '../../types'
import { createBaseStats } from '../player/PlayerSystem'

const companionRegistry = new Map<string, Companion>()

export function registerCompanion(c: Companion): void { companionRegistry.set(c.instanceId, c) }
export function getCompanion(id: string): Companion | undefined { return companionRegistry.get(id) }
export function getActiveCompanions(player: PlayerState): Companion[] {
  return player.companionIds.map(id => companionRegistry.get(id)).filter(Boolean) as Companion[]
}

// 從怪物模板建立同伴
function createCompanionFromMonster(template: MonsterTemplate): Companion {
  const id = crypto.randomUUID()
  return {
    instanceId: id,
    templateId: template.id,
    name: template.name,
    type: 'monster',
    level: D(1),
    xp: D(0),
    xpToNext: D(100),
    baseStats: { ...template.baseStats },
    currentStats: { ...template.baseStats },
    currentHP: template.baseStats.hp.plus(0),
    currentMP: template.baseStats.mp.plus(0),
    skillIds: template.skillIds,
    aiStrategy: 'aggressive',
    position: 'front',
    equipment: {},
    affinity: 50,
    sourceMonsterId: template.id,
    recruitMethod: 'tame',
    isActive: true,
  }
}

// 嘗試馴服怪物
export function attemptTame(
  player: PlayerState,
  monster: MonsterTemplate,
  monsterHpPercent: number
): boolean {
  if (!monster.tameable) {
    log.warning(`${monster.name} 無法被馴服。`)
    return false
  }
  if (player.companionIds.length >= MAX_COMPANIONS) {
    log.warning(`同伴數量已達上限（${MAX_COMPANIONS}）。`)
    return false
  }

  const tameBonus = player.masteredJobs.includes('hunter') ? 0.5 : 0
  const chance = calcTameChance(
    monster.tameRate,
    monsterHpPercent,
    tameBonus,
    player.currentStats.lck
  )

  log.info(`馴服嘗試中... 成功率：${(chance * 100).toFixed(1)}%`)

  if (globalRng.chance(chance)) {
    const companion = createCompanionFromMonster(monster)
    registerCompanion(companion)
    player.companionIds.push(companion.instanceId)
    bus.emit('companion:recruited', { name: monster.name, type: 'monster' })
    log.success(`✦ 成功馴服「${monster.name}」！牠加入了你的隊伍！`)
    return true
  } else {
    log.warning(`馴服失敗... ${monster.name} 甩開了你的束縛。`)
    return false
  }
}

// 解散同伴
export function dismissCompanion(player: PlayerState, companionId: string): void {
  const companion = companionRegistry.get(companionId)
  if (!companion) { log.warning('找不到同伴'); return }
  player.companionIds = player.companionIds.filter(id => id !== companionId)
  companionRegistry.delete(companionId)
  log.system(`${companion.name} 離開了你的隊伍。`)
}

// 增加同伴好感度
export function increaseAffinity(companion: Companion, amount: number): void {
  companion.affinity = Math.min(100, companion.affinity + amount)
  if (companion.affinity >= 80 && (companion.affinity - amount) < 80) {
    log.story(`✦ ${companion.name} 對你的好感度已達到 80！解鎖特殊技能！`)
  }
}

// 顯示同伴列表
export function showCompanions(player: PlayerState): void {
  const companions = getActiveCompanions(player)
  if (companions.length === 0) {
    log.info('你目前沒有同伴。')
    return
  }
  log.system('── 同伴列表 ──')
  companions.forEach((c, i) => {
    const pos = c.position === 'front' ? '前排' : '後排'
    log.info(`  ${i + 1}. ${c.name}  Lv.${c.level.toFixed(0)}  ❤${c.currentHP.toFixed(0)}/${c.currentStats.hp.toFixed(0)}  好感:${c.affinity}  [${pos}]`)
  })
}
