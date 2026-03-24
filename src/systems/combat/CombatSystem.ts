import { D } from '../../core/bignum'
import { fmtFull } from '../../core/bignum'
import { bus } from '../../core/eventbus'
import { log } from '../../core/logger'
import { globalRng } from '../../core/rng'
import { scaleMonsterStat } from '../../core/formula'
import { resolveAttack } from './CombatFormulas'
import { AUTO_COMBAT_DELAY_MS } from '../../constants'
import type { CombatState, CombatUnit } from '../../types'
import type { PlayerState } from '../../types'
import type { MonsterTemplate } from '../../types'

let activeCombat: CombatState | null = null

export function getActiveCombat(): CombatState | null { return activeCombat }

// 從怪物模板建立戰鬥單位
export function createEnemyUnit(template: MonsterTemplate, floor = 1, tier = 1, rebirth = 0): CombatUnit {
  const stats = {
    hp:   scaleMonsterStat(template.baseStats.hp,   floor, tier, rebirth),
    mp:   scaleMonsterStat(template.baseStats.mp,   floor, tier, rebirth),
    atk:  scaleMonsterStat(template.baseStats.atk,  floor, tier, rebirth),
    def:  scaleMonsterStat(template.baseStats.def,  floor, tier, rebirth),
    matk: scaleMonsterStat(template.baseStats.matk, floor, tier, rebirth),
    mdef: scaleMonsterStat(template.baseStats.mdef, floor, tier, rebirth),
    spd:  scaleMonsterStat(template.baseStats.spd,  floor, tier, rebirth),
    lck:     template.baseStats.lck,
    crit:    template.baseStats.crit,
    critDmg: template.baseStats.critDmg,
    dodge:   template.baseStats.dodge,
    acc:     template.baseStats.acc,
  }
  return {
    unitId: crypto.randomUUID(),
    name: template.name,
    isPlayer: false,
    isCompanion: false,
    currentHP: stats.hp.plus(0),
    maxHP:     stats.hp.plus(0),
    currentMP: stats.mp.plus(0),
    maxMP:     stats.mp.plus(0),
    stats,
    statusEffects: [],
    skillIds: template.skillIds,
    aiStrategy: 'aggressive',
    isDefending: false,
    templateId: template.id,
  }
}

// 從玩家建立戰鬥單位
export function createPlayerUnit(player: PlayerState): CombatUnit {
  return {
    unitId: 'player',
    name: player.name,
    isPlayer: true,
    isCompanion: false,
    currentHP: player.currentHP.plus(0),
    maxHP:     player.currentStats.hp.plus(0),
    currentMP: player.currentMP.plus(0),
    maxMP:     player.currentStats.mp.plus(0),
    stats:     { ...player.currentStats },
    statusEffects: [],
    skillIds: [],
    isDefending: false,
  }
}

// 計算回合順序（依速度排序）
function buildTurnOrder(allies: CombatUnit[], enemies: CombatUnit[]): string[] {
  return [...allies, ...enemies]
    .sort((a, b) => {
      const diff = b.stats.spd.minus(a.stats.spd).toNumber()
      return diff !== 0 ? diff : b.stats.lck.minus(a.stats.lck).toNumber()
    })
    .map(u => u.unitId)
}

// 開始戰鬥
export function startCombat(
  player: PlayerState,
  enemies: MonsterTemplate[],
  type: CombatState['type'] = 'normal',
  location = '',
  floor = 1,
  tier = 1
): void {
  if (activeCombat?.isActive) return
  const playerUnit  = createPlayerUnit(player)
  const enemyUnits  = enemies.map(e => createEnemyUnit(e, floor, tier, player.rebirthCount))
  activeCombat = {
    id: crypto.randomUUID(),
    type,
    allies:  [playerUnit],
    enemies: enemyUnits,
    turnOrder: buildTurnOrder([playerUnit], enemyUnits),
    currentTurnIndex: 0,
    roundNumber: 1,
    log: [],
    isActive: true,
    isPlayerTurn: false,
    location,
  }
  activeCombat.isPlayerTurn = activeCombat.turnOrder[0] === 'player'
  bus.emit('combat:start', { enemyNames: enemies.map(e => e.name), location })
  log.separator()
  log.combat('⚔  戰鬥開始！')
  for (const e of enemyUnits) {
    const marker = type === 'boss' ? '【BOSS】' : type === 'elite' ? '【精英】' : ''
    log.combat(`  ${marker}${e.name}  HP:${fmtFull(e.currentHP)}`)
  }
  log.separator()
  if (!activeCombat.isPlayerTurn) {
    setTimeout(() => processEnemyTurns(player), 400)
  } else {
    maybeAutoAct(player)
  }
}

function getCurrentUnit(combat: CombatState): CombatUnit | undefined {
  const id = combat.turnOrder[combat.currentTurnIndex]
  return [...combat.allies, ...combat.enemies].find(u => u.unitId === id)
}

function advanceTurn(combat: CombatState): void {
  combat.currentTurnIndex = (combat.currentTurnIndex + 1) % combat.turnOrder.length
  if (combat.currentTurnIndex === 0) combat.roundNumber++
  // 跳過已死亡單位
  for (let i = 0; i < combat.turnOrder.length; i++) {
    const u = getCurrentUnit(combat)
    if (u && u.currentHP.gt(0)) break
    combat.currentTurnIndex = (combat.currentTurnIndex + 1) % combat.turnOrder.length
  }
  combat.isPlayerTurn = getCurrentUnit(combat)?.isPlayer ?? false
}

function applyDamage(target: CombatUnit, damage: import('decimal.js').default): void {
  target.currentHP = target.currentHP.minus(damage)
  if (target.currentHP.lt(0)) target.currentHP = D(0)
}

// 玩家攻擊
export function playerAttack(player: PlayerState): boolean {
  const combat = activeCombat
  if (!combat?.isActive || !combat.isPlayerTurn) return false
  const playerUnit = combat.allies.find(u => u.isPlayer)!
  const target = combat.enemies.find(e => e.currentHP.gt(0))
  if (!target) return false
  playerUnit.isDefending = false
  const result = resolveAttack(playerUnit, target)
  if (result.isMiss) {
    log.combat(`  ${player.name} 攻擊 ${target.name}... 未命中！`)
  } else {
    applyDamage(target, result.amount)
    const crit = result.isCrit ? ' 【爆擊！】' : ''
    log.damage(`  ▶ ${player.name} 攻擊 ${target.name}！造成 ${fmtFull(result.amount)} 傷害${crit}`)
    bus.emit('combat:damage', { actorId: 'player', targetId: target.unitId, amount: result.amount.toString(), isCrit: result.isCrit })
  }
  checkCombatEnd(player, combat)
  if (combat.isActive) {
    advanceTurn(combat)
    if (!combat.isPlayerTurn) {
      setTimeout(() => processEnemyTurns(player), 300)
    } else {
      maybeAutoAct(player)
    }
  }
  return true
}

// 玩家防禦
export function playerDefend(player: PlayerState): boolean {
  const combat = activeCombat
  if (!combat?.isActive || !combat.isPlayerTurn) return false
  const pu = combat.allies.find(u => u.isPlayer)!
  pu.isDefending = true
  log.combat(`  ${player.name} 採取防禦姿態！（受傷減少 30%）`)
  advanceTurn(combat)
  if (!combat.isPlayerTurn) {
    setTimeout(() => processEnemyTurns(player), 300)
  } else {
    maybeAutoAct(player)
  }
  return true
}

// 玩家逃跑
export function playerFlee(player: PlayerState): boolean {
  const combat = activeCombat
  if (!combat?.isActive || !combat.isPlayerTurn) return false
  const pu = combat.allies.find(u => u.isPlayer)!
  const fastestEnemy = combat.enemies.reduce((a, b) => a.stats.spd.gt(b.stats.spd) ? a : b)
  const fleeChance = Math.min(0.9, Math.max(0.1,
    0.5 + pu.stats.spd.minus(fastestEnemy.stats.spd).div(100).toNumber()
  ))
  if (globalRng.chance(fleeChance)) {
    log.warning(`  ${player.name} 成功逃跑！`)
    endCombat(player, combat, false, true); return true
  }
  log.combat(`  逃跑失敗！`)
  advanceTurn(combat)
  if (!combat.isPlayerTurn) setTimeout(() => processEnemyTurns(player), 300)
  return false
}

// 自動戰鬥：若已解鎖且未暫停，自動執行玩家策略
function maybeAutoAct(player: PlayerState): void {
  if (!player.flags['unlock_auto_combat']) return
  if (player.flags['auto_combat'] === false) return  // 玩家手動關閉
  const strategy = (player.flags['auto_combat_strategy'] as string) ?? 'attack'
  setTimeout(() => {
    const combat = activeCombat
    if (!combat?.isActive || !combat.isPlayerTurn) return
    const pu = combat.allies.find(u => u.isPlayer)
    const hpPct = pu && pu.maxHP.gt(0) ? pu.currentHP.div(pu.maxHP).toNumber() : 1
    if (strategy === 'defend_low_hp' && hpPct < 0.3) {
      playerDefend(player)
    } else {
      playerAttack(player)
    }
  }, AUTO_COMBAT_DELAY_MS)
}

// 敵人 AI
function processEnemyTurns(player: PlayerState): void {
  const combat = activeCombat
  if (!combat?.isActive || combat.isPlayerTurn) return
  const cur = getCurrentUnit(combat)
  if (!cur || cur.isPlayer || cur.isCompanion || cur.currentHP.lte(0)) {
    advanceTurn(combat); return
  }
  const target = combat.allies.filter(a => a.currentHP.gt(0))
    .sort((a, b) => a.currentHP.minus(b.currentHP).toNumber())[0]
  if (!target) { checkCombatEnd(player, combat); return }
  cur.isDefending = false
  const result = resolveAttack(cur, target)
  if (result.isMiss) {
    log.combat(`  ${cur.name} 攻擊 ${target.name}... 未命中！`)
  } else {
    applyDamage(target, result.amount)
    const crit = result.isCrit ? ' 【爆擊！】' : ''
    log.damage(`  ◀ ${cur.name} 攻擊 ${target.name}！造成 ${fmtFull(result.amount)} 傷害${crit}`)
    if (target.isPlayer) player.currentHP = target.currentHP.plus(0)
  }
  checkCombatEnd(player, combat)
  if (combat.isActive) {
    advanceTurn(combat)
    if (!combat.isPlayerTurn) {
      setTimeout(() => processEnemyTurns(player), 250)
    } else {
      maybeAutoAct(player)
    }
  }
}

function checkCombatEnd(player: PlayerState, combat: CombatState): void {
  if (combat.enemies.every(e => e.currentHP.lte(0))) { endCombat(player, combat, true, false); return }
  if (combat.allies.find(u => u.isPlayer)?.currentHP.lte(0)) endCombat(player, combat, false, false)
}

function endCombat(player: PlayerState, combat: CombatState, victory: boolean, fled: boolean): void {
  combat.isActive = false; activeCombat = null
  log.separator()
  if (victory) {
    log.success('⚔  戰鬥勝利！')
    bus.emit('combat:end', { victory: true, xp: '0', gold: '0' })
  } else if (!fled) {
    log.error('💀  你被擊敗了...')
    player.currentHP = player.currentStats.hp.times(0.1).ceil()
    player.location  = { type: 'town', id: 'starting_town' }
    player.playtimeStats.totalDeaths++
    bus.emit('combat:end',   { victory: false, xp: '0', gold: '0' })
    bus.emit('player:death', { location: combat.location })
    log.info('你在起始城鎮甦醒，帶著傷痕重新站起來...')
  }
}
