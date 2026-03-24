import Decimal from 'decimal.js'
import { D, fmt, fmtFull } from '../../core/bignum'
import { log } from '../../core/logger'
import { bus } from '../../core/eventbus'
import { calcRebirthRequiredLevel, calcSoulFragments } from '../../core/formula'
import { createPlayer, createBaseStats } from '../player/PlayerSystem'
import { PRESTIGE_NODES, PRESTIGE_MILESTONES } from './PrestigeData'
import type { PlayerState } from '../../types'
import { ZERO } from '../../core/bignum'

// 計算重生所需等級
export function getRebirthRequiredLevel(player: PlayerState): number {
  return calcRebirthRequiredLevel(player.rebirthCount)
}

// 可以重生嗎
export function canRebirth(player: PlayerState): { ok: boolean; reason?: string } {
  const required = getRebirthRequiredLevel(player)
  if (player.level.lt(required)) {
    return { ok: false, reason: `需要 Lv.${required}（目前 ${player.level.toFixed(0)}）` }
  }
  return { ok: true }
}

// 執行重生
export function performRebirth(player: PlayerState): boolean {
  const check = canRebirth(player)
  if (!check.ok) {
    log.warning(`無法重生：${check.reason}`)
    return false
  }

  // 計算靈魂碎片
  const bonusMultiplier = calcSoulFragmentBonus(player)
  const fragments = calcSoulFragments(player.level, player.rebirthCount, bonusMultiplier)

  log.separator()
  log.story('╔════════════════════════════════════╗')
  log.story('║          ✦ 輪 迴 重 生 ✦            ║')
  log.story('╚════════════════════════════════════╝')
  log.story(`你在 Lv.${player.level.toFixed(0)} 選擇了重生`)
  log.story(`獲得了 ${fmtFull(fragments)} 靈魂碎片`)

  // 保留的數據
  const preservedPrestige = { ...player.prestige }
  preservedPrestige.totalSoulFragments = preservedPrestige.totalSoulFragments.plus(fragments)
  const preservedJobHistory = [...player.jobHistory]
  const preservedMasteredJobs = [...player.masteredJobs]
  const preservedCompletedQuests = [...player.completedQuestIds]
  const preservedFlags = { ...player.flags }
  const preservedAchievements = [...player.achievements]
  const preservedPlaytimeStats = { ...player.playtimeStats }
  const preservedRebirthCount = player.rebirthCount + 1

  // 重置角色（保留姓名）
  const name = player.name
  Object.assign(player, createPlayer(name))

  // 還原保留的數據
  player.prestige = preservedPrestige
  player.jobHistory = preservedJobHistory
  player.masteredJobs = preservedMasteredJobs
  player.completedQuestIds = preservedCompletedQuests
  player.flags = preservedFlags
  player.achievements = preservedAchievements
  player.playtimeStats = preservedPlaytimeStats
  player.playtimeStats.totalRebirths = preservedRebirthCount
  player.rebirthCount = preservedRebirthCount

  // 給予起始加成（根據重生樹）
  applyRebirthBonuses(player)

  // 檢查里程碑
  checkMilestones(player)

  bus.emit('player:rebirth', { count: player.rebirthCount, soulFragments: fragments.toString() })
  log.story(`\n你帶著記憶重生，從起點重新開始...`)
  log.system(`重生次數：${player.rebirthCount}`)
  log.separator()
  return true
}

// 計算靈魂碎片加成倍率
function calcSoulFragmentBonus(player: PlayerState): number {
  const prestige = player.prestige
  let bonus = 1.0
  // future: 加入更多重生樹節點效果
  return bonus
}

// 套用重生加成到起始屬性
function applyRebirthBonuses(player: PlayerState): void {
  const prestige = player.prestige

  // 靈魂之力：全屬性 +5% per level
  const soulPower = prestige.bonusLevels['soul_power'] ?? 0
  if (soulPower > 0) {
    const mul = 1 + (soulPower * 5) / 100
    const s = player.baseStats
    s.hp = s.hp.times(mul).ceil()
    s.mp = s.mp.times(mul).ceil()
    s.atk = s.atk.times(mul).ceil()
    s.def = s.def.times(mul).ceil()
    s.matk = s.matk.times(mul).ceil()
    s.mdef = s.mdef.times(mul).ceil()
    player.currentHP = s.hp.plus(0)
    player.currentMP = s.mp.plus(0)
  }

  // 靈魂財富：起始金幣加成
  const soulWealth = prestige.bonusLevels['soul_wealth'] ?? 0
  if (soulWealth > 0) {
    const goldBonus = 1 + (soulWealth * 10) / 100
    player.gold = player.gold.times(goldBonus).ceil()
  }
}

// 計算目前有效的離線進度倍率（考慮里程碑）
export function getOfflineRate(player: PlayerState): number {
  if (player.flags['unlock_offline_rate_75'] || player.rebirthCount >= 100) {
    return player.rebirthCount >= 100 ? 0.9 : 0.75
  }
  if (player.rebirthCount >= 10) return 0.6
  return 0.5
}

// 計算轉生樹 XP 倍率（soul_speed 降低 xpToNext → 等效提升 XP 獲取速度）
export function getPrestigeXpMultiplier(player: PlayerState): number {
  const soulSpeed = player.prestige.bonusLevels['soul_speed'] ?? 0
  const reduction = Math.min(soulSpeed * 0.02, 0.5)  // 最高減少 50%
  return 1 / (1 - reduction)
}

// 計算轉生樹金幣倍率
export function getPrestigeGoldMultiplier(player: PlayerState): number {
  const soulWealth = player.prestige.bonusLevels['soul_wealth'] ?? 0
  return 1 + soulWealth * 0.1
}

// 檢查並觸發里程碑
function checkMilestones(player: PlayerState): void {
  for (const milestone of PRESTIGE_MILESTONES) {
    if (
      player.rebirthCount >= milestone.rebirthCount &&
      !player.prestige.milestoneIds.includes(`m_${milestone.rebirthCount}`)
    ) {
      player.prestige.milestoneIds.push(`m_${milestone.rebirthCount}`)
      log.separator()
      log.story(`★ 里程碑解鎖：「${milestone.title}」★`)
      log.story(milestone.description)
      milestone.rewards.forEach(r => log.quest(`  ✦ ${r}`))
      if (milestone.unlocksFeature) {
        player.flags[`unlock_${milestone.unlocksFeature}`] = true
        // 自動化功能解鎖時預設啟用
        if (['auto_combat', 'auto_explore', 'auto_sell'].includes(milestone.unlocksFeature)) {
          player.flags[milestone.unlocksFeature] = true
          log.success(`  → 已自動啟用！可在設定中關閉。`)
        }
      }
      log.separator()
    }
  }
}

// 購買重生樹節點
export function buyPrestigeNode(player: PlayerState, nodeId: string, levels = 1): boolean {
  const node = PRESTIGE_NODES[nodeId]
  if (!node) { log.warning('未知的升級節點'); return false }
  if (player.rebirthCount < node.unlockRebirthCount) {
    log.warning(`需要重生 ${node.unlockRebirthCount} 次才能解鎖此升級`)
    return false
  }

  const currentLevel = player.prestige.bonusLevels[nodeId] ?? 0
  const newLevel = Math.min(currentLevel + levels, node.maxLevel)
  const actualLevels = newLevel - currentLevel
  if (actualLevels <= 0) { log.warning('此升級已達最高等級'); return false }

  const totalCost = node.costPerLevel.times(actualLevels)
  if (player.prestige.totalSoulFragments.minus(player.prestige.spentSoulFragments).lt(totalCost)) {
    log.warning(`靈魂碎片不足（需要 ${fmtFull(totalCost)}，擁有 ${fmtFull(player.prestige.totalSoulFragments.minus(player.prestige.spentSoulFragments))}）`)
    return false
  }

  player.prestige.spentSoulFragments = player.prestige.spentSoulFragments.plus(totalCost)
  player.prestige.bonusLevels[nodeId] = newLevel
  log.success(`✦ 升級「${node.name}」至 Lv.${newLevel}！`)
  log.quest(`  效果：${node.description}`)
  return true
}

// 顯示重生樹
export function showPrestigeTree(player: PlayerState): void {
  const available = player.prestige.totalSoulFragments.minus(player.prestige.spentSoulFragments)
  log.system(`\n── 重生升級樹 ── 可用靈魂碎片：${fmtFull(available)}`)

  for (let tier = 1; tier <= 4; tier++) {
    const nodes = Object.values(PRESTIGE_NODES).filter(n => n.tier === tier)
    if (nodes.length === 0) continue
    const unlocked = player.rebirthCount >= nodes[0].unlockRebirthCount
    log.system(`\n  ── Tier ${tier} ${unlocked ? '' : `（需重生 ${nodes[0].unlockRebirthCount} 次）`}──`)
    for (const node of nodes) {
      const lv = player.prestige.bonusLevels[node.id] ?? 0
      const maxLv = node.maxLevel
      const cost = node.costPerLevel
      const status = lv >= maxLv ? '[MAX]' : `Lv.${lv}/${maxLv} 每級 ${fmtFull(cost)} 碎片`
      log.info(`  ${node.name}：${status}`)
      log.info(`    ${node.description}`)
    }
  }
}
