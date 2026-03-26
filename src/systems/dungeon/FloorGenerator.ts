import { RNG } from '../../core/rng'
import { DUNGEON_ROOMS_BASE, DUNGEON_ROOMS_PER_FLOOR, DUNGEON_ROOMS_MAX } from '../../constants'
import type { FloorState, RoomState, RoomType, RoomConnection } from '../../types'

const DIRS: { dx: number; dy: number; dir: 'n' | 's' | 'e' | 'w'; opp: 'n' | 's' | 'e' | 'w' }[] = [
  { dx:  0, dy: -1, dir: 'n', opp: 's' },
  { dx:  0, dy:  1, dir: 's', opp: 'n' },
  { dx:  1, dy:  0, dir: 'e', opp: 'w' },
  { dx: -1, dy:  0, dir: 'w', opp: 'e' },
]

export function generateFloor(dungeonId: string, floor: number, seed: number): FloorState {
  const rng = new RNG(seed ^ (floor * 1234567))
  const roomCount = Math.min(
    DUNGEON_ROOMS_BASE + (floor - 1) * DUNGEON_ROOMS_PER_FLOOR,
    DUNGEON_ROOMS_MAX
  )

  // ── 1. 網格擴展佈局 ─────────────────────────────────
  // 每個格子只放一個房間，確保方向絕對正確
  type Pos = { x: number; y: number }
  const posKey = (x: number, y: number) => `${x},${y}`
  const occupied = new Map<string, string>()   // "x,y" -> roomId
  const roomPos   = new Map<string, Pos>()     // roomId -> pos
  const adjMap    = new Map<string, Set<string>>() // roomId -> 鄰居 roomId

  const placeRoom = (id: string, x: number, y: number) => {
    occupied.set(posKey(x, y), id)
    roomPos.set(id, { x, y })
    adjMap.set(id, new Set())
  }

  // 入口放在原點
  const firstId = `r${floor}_0`
  placeRoom(firstId, 0, 0)

  for (let i = 1; i < roomCount; i++) {
    // 蒐集所有已佔格子的空鄰格
    const frontier: { x: number; y: number; parentId: string }[] = []
    for (const [id, pos] of roomPos) {
      for (const { dx, dy } of DIRS) {
        const nx = pos.x + dx; const ny = pos.y + dy
        if (!occupied.has(posKey(nx, ny))) {
          frontier.push({ x: nx, y: ny, parentId: id })
        }
      }
    }
    if (frontier.length === 0) break

    const chosen = frontier[rng.int(frontier.length)]
    const newId  = `r${floor}_${i}`
    placeRoom(newId, chosen.x, chosen.y)

    // 雙向連線（父 → 子）
    adjMap.get(chosen.parentId)!.add(newId)
    adjMap.get(newId)!.add(chosen.parentId)
  }

  // ── 2. 額外隨機連線（20%，僅限格子鄰居）──────────────
  for (const [id, pos] of roomPos) {
    for (const { dx, dy } of DIRS) {
      const neighborId = occupied.get(posKey(pos.x + dx, pos.y + dy))
      if (neighborId && !adjMap.get(id)!.has(neighborId) && rng.chance(0.2)) {
        adjMap.get(id)!.add(neighborId)
        adjMap.get(neighborId)!.add(id)
      }
    }
  }

  // ── 3. Boss 房 = BFS 最遠的房間 ─────────────────────
  const bossId = bfsFarthest(firstId, adjMap)

  // ── 4. 建立 RoomState ────────────────────────────────
  const roomIds  = Array.from(roomPos.keys())
  const typeMap  = new Map<string, RoomType>()

  // 先給入口/Boss，其餘隨機
  typeMap.set(firstId, 'entrance')
  typeMap.set(bossId, 'boss')
  for (const id of roomIds) {
    if (!typeMap.has(id)) typeMap.set(id, assignRoomType(rng))
  }

  const rooms: RoomState[] = roomIds.map(id => {
    const pos  = roomPos.get(id)!
    const type = typeMap.get(id)!

    const connections: RoomConnection[] = Array.from(adjMap.get(id)!).map(tid => {
      const tp = roomPos.get(tid)!
      const dx = tp.x - pos.x; const dy = tp.y - pos.y
      const dir = DIRS.find(d => d.dx === dx && d.dy === dy)!.dir
      return { direction: dir, targetRoomId: tid }
    })

    return {
      id,
      type,
      connections,
      isExplored: id === firstId,
      isCleared:  type === 'entrance',
      enemyTemplateIds: (type === 'combat' || type === 'boss') ? assignEnemies(floor, rng) : undefined,
    }
  })

  return {
    floor,
    seed,
    rooms,
    currentRoomId:  firstId,
    entranceRoomId: firstId,
    bossRoomId:     bossId,
    isComplete: false,
    mapRevealAll: false,
  }
}

// ── 輔助函式 ──────────────────────────────────────────────────────────────

function bfsFarthest(startId: string, adj: Map<string, Set<string>>): string {
  const dist = new Map<string, number>([[startId, 0]])
  const queue = [startId]
  let farthest = startId
  while (queue.length) {
    const id = queue.shift()!
    const d  = dist.get(id)!
    if (d > (dist.get(farthest) ?? 0)) farthest = id
    for (const nid of adj.get(id) ?? []) {
      if (!dist.has(nid)) { dist.set(nid, d + 1); queue.push(nid) }
    }
  }
  return farthest
}

function assignRoomType(rng: RNG): RoomType {
  const roll = rng.next()
  if (roll < 0.40) return 'combat'
  if (roll < 0.55) return 'treasure'
  if (roll < 0.65) return 'shop'
  if (roll < 0.75) return 'rest'
  if (roll < 0.85) return 'event'
  if (roll < 0.95) return 'puzzle'
  return 'empty'
}

function assignEnemies(floor: number, rng: RNG): string[] {
  const candidates = ['slime', 'goblin', 'wolf', 'skeleton', 'orc', 'dark_mage', 'dragon_hatchling']
  const tier    = Math.max(1, Math.ceil(floor / 10))
  const eligible = candidates.slice(0, Math.min(candidates.length, tier + 2))
  const count   = rng.range(1, 4)   // 1-3 隻
  return Array.from({ length: count }, () => eligible[rng.int(eligible.length)])
}
