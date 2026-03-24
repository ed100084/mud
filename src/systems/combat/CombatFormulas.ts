import Decimal from 'decimal.js'
import { D, clampD } from '../../core/bignum'
import { rollCrit, rollHit, calcPhysicalDamage, calcMagicDamage } from '../../core/formula'
import { MIN_DAMAGE } from '../../constants'
import type { CombatUnit, SkillDefinition } from '../../types'

export interface DamageResult {
  amount: Decimal
  isCrit: boolean
  isMiss: boolean
  isHeal: boolean
  element?: string
}

export function resolveAttack(attacker: CombatUnit, target: CombatUnit): DamageResult {
  const hit = rollHit(attacker.stats.acc, target.stats.dodge)
  if (!hit) return { amount: D(0), isCrit: false, isMiss: true, isHeal: false }

  const isCrit = rollCrit(attacker.stats.crit)
  const dmg = calcPhysicalDamage(
    attacker.stats.atk,
    target.stats.def,
    1.0,
    isCrit,
    attacker.stats.critDmg,
  )
  // 防禦姿態減傷 30%
  const finalDmg = target.isDefending ? dmg.times(0.7) : dmg
  return { amount: finalDmg.ceil(), isCrit, isMiss: false, isHeal: false }
}

export function resolveSkill(
  attacker: CombatUnit,
  target: CombatUnit,
  skill: SkillDefinition,
): DamageResult {
  const hit = rollHit(attacker.stats.acc, target.stats.dodge)
  if (!hit && skill.targetType.includes('enemy')) {
    return { amount: D(0), isCrit: false, isMiss: true, isHeal: false }
  }

  const isCrit = rollCrit(attacker.stats.crit)

  if (skill.healMultiplier !== undefined) {
    // 治療技能
    const healAmt = attacker.stats.matk
      .times(skill.healMultiplier)
      .times(isCrit ? attacker.stats.critDmg : D(1))
      .ceil()
    return { amount: healAmt, isCrit, isMiss: false, isHeal: true }
  }

  const multiplier = skill.damageMultiplier ?? 1.0
  let dmg: Decimal
  if (skill.element && skill.element !== 'none') {
    dmg = calcMagicDamage(attacker.stats.matk, target.stats.mdef, multiplier, isCrit, attacker.stats.critDmg)
  } else {
    dmg = calcPhysicalDamage(attacker.stats.atk, target.stats.def, multiplier, isCrit, attacker.stats.critDmg)
  }
  const finalDmg = target.isDefending ? dmg.times(0.7) : dmg
  return { amount: finalDmg.ceil(), isCrit, isMiss: false, isHeal: false, element: skill.element }
}
