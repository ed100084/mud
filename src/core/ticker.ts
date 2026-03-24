import { TICK_MS } from '../constants'
import { bus } from './eventbus'

class Ticker {
  private running = false
  private lastTime = 0
  private accumulated = 0
  private tickCount = 0
  private rafId = 0

  start(): void {
    if (this.running) return
    this.running = true
    this.lastTime = performance.now()
    this.loop()
  }

  stop(): void {
    this.running = false
    cancelAnimationFrame(this.rafId)
  }

  private loop(): void {
    const now = performance.now()
    const delta = now - this.lastTime
    this.lastTime = now
    this.accumulated += delta

    while (this.accumulated >= TICK_MS) {
      this.tickCount++
      bus.emit('tick', { tick: this.tickCount, delta: TICK_MS })
      this.accumulated -= TICK_MS
    }

    if (this.running) {
      this.rafId = requestAnimationFrame(this.loop.bind(this))
    }
  }

  getTickCount(): number { return this.tickCount }
}

export const ticker = new Ticker()
