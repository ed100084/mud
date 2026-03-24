import Decimal from 'decimal.js'

Decimal.set({ precision: 64, toExpPos: 9e15, toExpNeg: -9e15 })

// 覆寫 toJSON：確保 Decimal 序列化為 {__d:"..."} 格式（HMR 安全）
;(Decimal.prototype as unknown as { toJSON: () => unknown }).toJSON = function () {
  return { __d: (this as Decimal).toString() }
}

export { Decimal }
export const D = (v: number | string | Decimal): Decimal => new Decimal(v)
export const ZERO = D(0)
export const ONE = D(1)

const SUFFIXES = [
  '', 'K', 'M', 'B', 'T',
  'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No',
  'Dc', 'Ud', 'Dd', 'Td', 'Qad', 'Qid', 'Sxd', 'Spd', 'Ocd', 'Nod',
  'Vg', 'Uvg', 'Dvg', 'Tvg',
]

export function fmt(d: Decimal, decimals = 2): string {
  if (d.isNaN() || !d.isFinite()) return '???'
  const abs = d.abs()
  if (abs.lt(1000)) return d.toFixed(0)
  for (let i = SUFFIXES.length - 1; i >= 1; i--) {
    const threshold = D(10).pow(i * 3)
    if (abs.gte(threshold)) {
      const val = d.div(threshold)
      const str = val.toFixed(decimals)
      return `${str}${SUFFIXES[i]}`
    }
  }
  return d.toExponential(2)
}

export function fmtFull(d: Decimal): string {
  if (d.lt(D('1e15'))) {
    return d.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }
  return d.toExponential(4)
}

export function fmtPercent(d: Decimal, decimals = 1): string {
  return `${d.mul(100).toFixed(decimals)}%`
}

export function clampD(d: Decimal, min: Decimal, max: Decimal): Decimal {
  if (d.lt(min)) return min
  if (d.gt(max)) return max
  return d
}

export function addD(a: Decimal, b: Decimal | number): Decimal { return a.plus(b) }
export function mulD(a: Decimal, b: Decimal | number): Decimal { return a.times(b) }
export function divD(a: Decimal, b: Decimal | number): Decimal { return a.div(b) }
export function subD(a: Decimal, b: Decimal | number): Decimal { return a.minus(b) }

// BigNumber-aware JSON serialization
export function serializeDecimal(d: Decimal): string { return d.toString() }
export function deserializeDecimal(s: string): Decimal { return new Decimal(s) }

export function replacer(_key: string, value: unknown): unknown {
  if (value instanceof Decimal) return { __d: value.toString() }
  return value
}

export function reviver(_key: string, value: unknown): unknown {
  if (value && typeof value === 'object' && '__d' in (value as object)) {
    return new Decimal((value as { __d: string }).__d)
  }
  return value
}

// 安全轉換任意值為 Decimal（處理字串/數字/舊存檔格式）
export function toDecimal(v: unknown): Decimal {
  if (v instanceof Decimal) return v
  if (typeof v === 'number' && isFinite(v)) return new Decimal(v)
  if (typeof v === 'string') { try { return new Decimal(v) } catch { return ZERO } }
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    if (typeof o.__d === 'string') { try { return new Decimal(o.__d) } catch { return ZERO } }
  }
  return ZERO
}
