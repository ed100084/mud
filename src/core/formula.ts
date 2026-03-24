import Decimal from 'decimal.js'
import { D, mulD, addD, subD, clampD } from './bignum'
import {
  XP_BASE, XP_LEVEL_EXPONENT, XP_REBIRTH_REDUCTION,
  CRIT_BASE_MULTIPLIER, DEF_REDUCTION, MDEF_REDUCTION,
  DAMAGE_VARIANCE_MIN, DAMAGE_VARIANCE_MAX, MIN_DAMAGE,
  PRESTIGE_UNLOCK_BASE_LEVEL, PRESTIGE_UNLOCK_SCALE,
  SOUL_FRAGMENT_EXPONENT
} from '../constants'
import { globalRng } from './rng'

/** 計算到下一級所需 XP */
export function calcXpToNext(level: Decimal, rebirthCount: number): Decimal {
  const reduction = Math.max(0, 1 - rebirthCount * XP_REBIRTH_REDUCTION)
  return XP_BASE
    .times(level.pow(XP_LEVEL_EXPONENT))
    .times(reduction)
    .ceil()
}

/** 計算重生所需最低等級 */
export function calcRebirthRequiredLevel(rebirthCount: number): number {
  return Math.floor(
    PRESTIGE_UNLOCK_BASE_LEVEL * Math.pow(PRESTIGE_UNLOCK_SCALE, rebirthCount)
  )
}

/** 計算重生獲得的靈魂碎片 */
export function calcSoulFragments(level: Decimal, rebirthCount: number, bonusMultiplier: number): Decimal {
  const base = level.pow(SOUL_FRAGMENT_EXPONENT)
  const rebirthBonus = D(1 + rebirthCount * 0.1)
  return base.times(rebirthBonus).times(bonusMultiplier).floor()
}

/** 物理傷害 */
export function calcPhysicalDamage(
  atk: Decimal, def: Decimal,
  multiplier: number,
  isCrit: boolean,
  critDmgMultiplier: Decimal
): Decimal {
  const variance = DAMAGE_VARIANCE_MIN + globalRng.next() * (DAMAGE_VARIANCE_MAX - DAMAGE_VARIANCE_MIN)
  const reduction = def.times(DEF_REDUCTION)
  let dmg = atk.times(multiplier).minus(reduction).times(variance)
  if (isCrit) dmg = dmg.times(critDmgMultiplier)
  return clampD(dmg.ceil(), MIN_DAMAGE, D('1e100'))
}

/** 魔法傷害 */
export function calcMagicDamage(
  matk: Decimal, mdef: Decimal,
  multiplier: number,
  isCrit: boolean,
  critDmgMultiplier: Decimal,
  elementMultiplier = 1.0
): Decimal {
  const variance = DAMAGE_VARIANCE_MIN + globalRng.next() * (DAMAGE_VARIANCE_MAX - DAMAGE_VARIANCE_MIN)
  const reduction = mdef.times(MDEF_REDUCTION)
  let dmg = matk.times(multiplier).minus(reduction).times(variance).times(elementMultiplier)
  if (isCrit) dmg = dmg.times(critDmgMultiplier)
  return clampD(dmg.ceil(), MIN_DAMAGE, D('1e100'))
}

/** 判斷是否爆擊 */
export function rollCrit(critChance: Decimal): boolean {
  return globalRng.next() < critChance.toNumber()
}

/** 判斷是否命中（閃避判定） */
export function rollHit(acc: Decimal, dodge: Decimal): boolean {
  const hitChance = clampD(acc.minus(dodge).plus(0.95), D(0.05), D(1))
  return globalRng.next() < hitChance.toNumber()
}

/** 怪物縮放屬性 */
export function scaleMonsterStat(base: Decimal, floor: number, tier: number, rebirthCount: number): Decimal {
  const floorMul = D(1).plus(D(floor - 1).times(0.15))
  const tierMul = D(1).plus(D(tier - 1).times(0.5))
  const rebirthMul = D(1).plus(D(rebirthCount).times(0.3))
  return base.times(floorMul).times(tierMul).times(rebirthMul).ceil()
}

/** 馴服成功率 */
export function calcTameChance(baseRate: number, hpPercent: number, tameBonus: number, lck: Decimal): number {
  const hpFactor = 1 - hpPercent
  const lckBonus = 1 + lck.div(1000).toNumber()
  return Math.min(0.95, baseRate * hpFactor * (1 + tameBonus) * lckBonus)
}

/** 重生倍率（屬性加成） */
export function calcRebirthStatMultiplier(rebirthCount: number, bonusPercent: number): Decimal {
  return D(1).plus(D(rebirthCount).times(bonusPercent).div(100))
}
