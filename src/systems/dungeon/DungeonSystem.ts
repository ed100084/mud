import { RNG } from '../../core/rng'
import { log } from '../../core/logger'
import { bus } from '../../core/eventbus'
import { generateFloor } from './FloorGenerator'
import { startCombat } from '../combat/CombatSystem'
import { openTreasureChest } from '../inventory/LootSystem'
import { getMonsterById } from '../monster/MonsterData'
import type { PlayerState, DungeonRun, FloorState, RoomState } from '../../types'

export const DUNGEON_TEMPLATES = {
  goblin_cave: {
    id: 'goblin_cave', name: '哥布林洞窟', tier: 1,
    description: '哥布林部落的巢穴，傳說深處有王者寶藏。',
    minLevel: 5, maxFloors: 10,
    themes: ['cave', 'goblin'],
    bossIds: ['goblin_king'],
    unlockQuestId: undefined,
  },
  dark_forest_dungeon: {
    id: 'dark_forest_dungeon', name: '黑暗迷林', tier: 3,
    description: '古老森林的禁地，強大的不死族在此游蕩。',
    minLevel: 60, maxFloors: 30,
    themes: ['forest', 'undead'],
    bossIds: ['ancient_dragon'],
  },
}

let activeDungeon: DungeonRun | null = null

export function getActiveDungeon(): DungeonRun | null { return activeDungeon }

export function enterDungeon(player: PlayerState, dungeonId: string, roguelike = false): boolean {
  const template = (DUNGEON_TEMPLATES as Record<string, typeof DUNGEON_TEMPLATES[keyof typeof DUNGEON_TEMPLATES]>)[dungeonId]
  if (!template) { log.warning('未知地城。'); return false }
  if (player.level.lt(template.minLevel)) {
    log.warning(`需要 Lv.${template.minLevel} 才能進入「${template.name}」。`)
    return false
  }

  const seed = RNG.makeSeed()
  const firstFloor = generateFloor(dungeonId, 1, seed)

  activeDungeon = {
    dungeonId,
    seed,
    currentFloor: 1,
    maxFloor: template.maxFloors,
    floors: [firstFloor],
    isRoguelikeMode: roguelike,
    isActive: true,
    runScore: 0,
    startTime: Date.now(),
    modifiers: [],
  }

  player.location = { type: 'dungeon', id: dungeonId, subId: firstFloor.currentRoomId }
  log.story(`\n══════════════════════════════`)
  log.story(`  進入地城：${template.name}`)
  if (roguelike) log.warning('  ⚠ Roguelike 模式：死亡結束挑戰！')
  log.story(`══════════════════════════════`)
  describeRoom(getCurrentRoom()!)
  return true
}

export function getCurrentRoom(): RoomState | undefined {
  const d = activeDungeon
  if (!d) return undefined
  const floor = d.floors[d.currentFloor - 1]
  if (!floor) return undefined
  return floor.rooms.find(r => r.id === floor.currentRoomId)
}

export function moveRoom(player: PlayerState, direction: 'n' | 's' | 'e' | 'w'): boolean {
  const d = activeDungeon
  if (!d) { log.warning('你不在地城中。'); return false }
  const floor = d.floors[d.currentFloor - 1]
  const room = getCurrentRoom()
  if (!room) return false

  const conn = room.connections.find(c => c.direction === direction)
  if (!conn) { log.warning('那個方向沒有出路。'); return false }

  floor.currentRoomId = conn.targetRoomId
  player.location.subId = conn.targetRoomId

  const newRoom = getCurrentRoom()!
  if (!newRoom.isExplored) {
    newRoom.isExplored = true
    d.runScore += 10
  }

  describeRoom(newRoom)
  triggerRoom(player, newRoom, d)
  return true
}

function triggerRoom(player: PlayerState, room: RoomState, dungeon: DungeonRun): void {
  if (room.isCleared) return

  const template = (DUNGEON_TEMPLATES as Record<string, typeof DUNGEON_TEMPLATES[keyof typeof DUNGEON_TEMPLATES]>)[dungeon.dungeonId]
  const floor = dungeon.currentFloor
  const tier = template?.tier ?? 1

  switch (room.type) {
    case 'combat': {
      const enemies = (room.enemyTemplateIds ?? ['slime'])
        .map(id => getMonsterById(id))
        .filter(Boolean) as import('../../types').MonsterTemplate[]
      if (enemies.length > 0) {
        startCombat(player, enemies, 'normal', `地城-${floor}F`, floor, tier)
      }
      room.isCleared = true
      break
    }
    case 'treasure':
      openTreasureChest(player, tier)
      room.isCleared = true
      break
    case 'rest': {
      log.heal('這裡有一個休息點，你稍作休息恢復了一些 HP/MP。')
      const restHeal = player.currentStats.hp.times(0.3)
      player.currentHP = player.currentHP.plus(restHeal)
      if (player.currentHP.gt(player.currentStats.hp)) player.currentHP = player.currentStats.hp.plus(0)
      bus.emit('player:heal', { amount: restHeal.toString() })
      player.currentMP = player.currentMP.plus(player.currentStats.mp.times(0.3))
      if (player.currentMP.gt(player.currentStats.mp)) player.currentMP = player.currentStats.mp.plus(0)
      room.isCleared = true
      break
    }
    case 'boss': {
      const bossId = template?.bossIds[0] ?? 'goblin_king'
      const boss = getMonsterById(bossId)
      if (boss) {
        log.story(`\n⚔ BOSS 出現！${boss.name} 從黑暗中現身！`)
        startCombat(player, [boss], 'dungeon_boss', `地城BOSS-${floor}F`, floor, tier)
        room.isCleared = true
      }
      break
    }
  }
}

export function exitDungeon(player: PlayerState): void {
  if (!activeDungeon) return
  activeDungeon.isActive = false
  activeDungeon = null
  player.location = { type: 'town', id: 'starting_town' }
  log.system('你離開了地城。')
}

function describeRoom(room: RoomState): void {
  const typeNames: Record<string, string> = {
    entrance: '入口', exit: '出口', combat: '戰鬥房間', treasure: '寶箱房間',
    shop: '商店房間', puzzle: '謎題房間', rest: '休息點', boss: '魔王間', event: '事件房間', empty: '空房間',
  }
  const typeName = typeNames[room.type] ?? room.type
  const cleared = room.isCleared ? '（已清除）' : ''
  log.system(`\n[ ${typeName} ${cleared}]`)

  const dirs = room.connections.map(c => {
    const dirNames: Record<string, string> = { n: '北(n)', s: '南(s)', e: '東(e)', w: '西(w)' }
    return dirNames[c.direction]
  }).join('、')
  log.info(`可前往方向：${dirs || '無'}`)
}
