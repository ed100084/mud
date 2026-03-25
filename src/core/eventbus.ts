type Handler<T = unknown> = (data: T) => void

export interface GameEventMap {
  'tick': { tick: number; delta: number }
  'player:level_up': { newLevel: string; statsGained: Record<string, string> }
  'player:job_change': { oldJob: string; newJob: string }
  'player:rebirth': { count: number; soulFragments: string }
  'player:death': { location: string }
  'player:heal': { amount: string }
  'combat:start': { enemyNames: string[]; location: string }
  'combat:end': { victory: boolean; xp: string; gold: string }
  'combat:damage': { actorId: string; targetId: string; amount: string; isCrit: boolean }
  'item:obtained': { name: string; rarity: string; quantity: number }
  'quest:accepted': { questId: string; title: string }
  'quest:complete': { questId: string; title: string }
  'companion:recruited': { name: string; type: string }
  'dungeon:floor_complete': { dungeonId: string; floor: number }
  'dungeon:cleared': { dungeonId: string; totalFloors: number }
  'achievement:unlocked': { id: string; title: string }
  'save:complete': { slotName: string }
  'ui:print': { text: string; color?: string; channel?: string }
  'ui:clear': {}
}

class EventBus {
  private handlers: Map<string, Handler[]> = new Map()

  on<K extends keyof GameEventMap>(event: K, handler: Handler<GameEventMap[K]>): () => void {
    const list = this.handlers.get(event) ?? []
    list.push(handler as Handler)
    this.handlers.set(event, list)
    return () => this.off(event, handler)
  }

  off<K extends keyof GameEventMap>(event: K, handler: Handler<GameEventMap[K]>): void {
    const list = this.handlers.get(event)
    if (list) {
      this.handlers.set(event, list.filter(h => h !== handler))
    }
  }

  emit<K extends keyof GameEventMap>(event: K, data: GameEventMap[K]): void {
    const list = this.handlers.get(event)
    if (list) list.forEach(h => h(data))
  }
}

export const bus = new EventBus()
