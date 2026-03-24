import { RNG } from '../../core/rng'
import { DUNGEON_ROOMS_BASE, DUNGEON_ROOMS_PER_FLOOR, DUNGEON_ROOMS_MAX } from '../../constants'
import type { FloorState, RoomState, RoomType, RoomConnection } from '../../types'

interface RoomNode {
  id: string
  type: RoomType
  connections: string[]
  x: number
  y: number
}

export function generateFloor(dungeonId: string, floor: number, seed: number): FloorState {
  const rng = new RNG(seed ^ (floor * 1234567))
  const roomCount = Math.min(
    DUNGEON_ROOMS_BASE + (floor - 1) * DUNGEON_ROOMS_PER_FLOOR,
    DUNGEON_ROOMS_MAX
  )

  const nodes: RoomNode[] = []
  for (let i = 0; i < roomCount; i++) {
    nodes.push({
      id: `r${floor}_${i}`,
      type: assignRoomType(i, roomCount, rng),
      connections: [],
      x: rng.range(0, 8),
      y: rng.range(0, 8),
    })
  }

  // 建立生成樹（確保連通）
  for (let i = 1; i < nodes.length; i++) {
    const parent = nodes[rng.int(i)]
    nodes[i].connections.push(parent.id)
    parent.connections.push(nodes[i].id)
  }

  // 額外連線（20% 機率）
  for (let i = 0; i < nodes.length; i++) {
    if (rng.chance(0.2)) {
      const target = nodes[rng.int(nodes.length)]
      if (target.id !== nodes[i].id && !nodes[i].connections.includes(target.id)) {
        nodes[i].connections.push(target.id)
        target.connections.push(nodes[i].id)
      }
    }
  }

  // 強制第一個為入口，最後一個為 BOSS
  nodes[0].type = 'entrance'
  nodes[nodes.length - 1].type = 'boss'

  const rooms: RoomState[] = nodes.map(n => ({
    id: n.id,
    type: n.type,
    connections: n.connections.map(cid => {
      const target = nodes.find(x => x.id === cid)!
      return { direction: getDirection(n, target), targetRoomId: cid } as RoomConnection
    }),
    isExplored: n.id === nodes[0].id,
    isCleared: n.type === 'entrance',
    enemyTemplateIds: (n.type === 'combat' || n.type === 'boss') ? assignEnemies(floor, rng) : undefined,
  }))

  return {
    floor,
    seed,
    rooms,
    currentRoomId: nodes[0].id,
    entranceRoomId: nodes[0].id,
    bossRoomId: nodes[nodes.length - 1].id,
    isComplete: false,
    mapRevealAll: false,
  }
}

function assignRoomType(index: number, total: number, rng: RNG): RoomType {
  if (index === 0) return 'entrance'
  if (index === total - 1) return 'boss'
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
  const tier = Math.max(1, Math.ceil(floor / 10))
  const eligible = candidates.slice(0, Math.min(candidates.length, tier + 2))
  const count = rng.range(1, 3)
  return Array.from({ length: count }, () => eligible[rng.int(eligible.length)])
}

function getDirection(from: RoomNode, to: RoomNode): 'n' | 's' | 'e' | 'w' {
  const dx = to.x - from.x
  const dy = to.y - from.y
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'e' : 'w'
  return dy > 0 ? 's' : 'n'
}
