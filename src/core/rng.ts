// Mulberry32 seeded PRNG
export class RNG {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0
  }

  next(): number {
    let z = (this.state += 0x6D2B79F5)
    z = Math.imul(z ^ (z >>> 15), z | 1)
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61)
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296
  }

  /** 返回 [0, max) 整數 */
  int(max: number): number {
    return Math.floor(this.next() * max)
  }

  /** 返回 [min, max] 整數 */
  range(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1))
  }

  /** 依權重隨機抽取 */
  weighted<T>(entries: { weight: number; value: T }[]): T {
    const total = entries.reduce((s, e) => s + e.weight, 0)
    let r = this.next() * total
    for (const e of entries) {
      r -= e.weight
      if (r <= 0) return e.value
    }
    return entries[entries.length - 1].value
  }

  /** 隨機排列 */
  shuffle<T>(arr: T[]): T[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  chance(probability: number): boolean {
    return this.next() < probability
  }

  /** 產生用於地城的種子 */
  static makeSeed(): number {
    return Math.floor(Math.random() * 2147483647)
  }
}

export const globalRng = new RNG(Date.now() & 0xFFFFFFFF)
