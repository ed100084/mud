import type { FloorState, RoomState } from '../../types'
import { log } from '../../core/logger'

const ROOM_ICONS: Record<string, string> = {
  entrance: 'IN', exit: 'EX', combat: ' C', treasure: ' T',
  shop: ' S', puzzle: ' P', rest: ' R', boss: ' B', event: ' E', empty: ' ·',
}

// 建立 ASCII 小地圖
export function renderMiniMap(floor: FloorState): void {
  const grid: string[][] = Array.from({ length: 10 }, () => Array(20).fill('   '))
  const roomPositions = new Map<string, [number, number]>()

  // 簡單樹狀佈局
  layoutRooms(floor.rooms, roomPositions, floor.entranceRoomId)

  for (const [roomId, [row, col]] of roomPositions) {
    const room = floor.rooms.find(r => r.id === roomId)
    if (!room) continue
    const col2 = col * 4
    if (row < 10 && col2 < 16) {
      let icon = room.isExplored ? (ROOM_ICONS[room.type] ?? ' ?') : ' ?'
      if (room.id === floor.currentRoomId) icon = '>>'
      if (room.type === 'boss') icon = room.id === floor.currentRoomId ? '>>B' : ' B!'
      grid[row][col2 / 4] = room.isExplored ? icon : ' ?'
    }
  }

  log.system('── 地圖 ──')
  for (const row of grid.filter(r => r.some(c => c !== '   '))) {
    log.info(row.join('-'))
  }
}

function layoutRooms(rooms: RoomState[], positions: Map<string, [number, number]>, startId: string): void {
  const visited = new Set<string>()
  const queue: { id: string; row: number; col: number }[] = [{ id: startId, row: 0, col: 0 }]
  let minCol = 0
  while (queue.length > 0) {
    const { id, row, col } = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)
    positions.set(id, [row, col - minCol])
    const room = rooms.find(r => r.id === id)
    if (!room) continue
    const offsets: Record<string, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
    for (const conn of room.connections) {
      if (!visited.has(conn.targetRoomId)) {
        const [dr, dc] = offsets[conn.direction] ?? [0, 0]
        const newCol = col + dc
        if (newCol < minCol) minCol = newCol
        queue.push({ id: conn.targetRoomId, row: row + dr, col: newCol })
      }
    }
  }
}
