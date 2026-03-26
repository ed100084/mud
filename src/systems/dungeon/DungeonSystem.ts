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
  goblin_fortress: {
    id: 'goblin_fortress', name: '哥布林要塞', tier: 2,
    description: '哥布林軍閥的石造要塞，精銳部隊駐守其中。',
    minLevel: 12, maxFloors: 15,
    themes: ['fortress', 'goblin'],
    bossIds: ['goblin_warlord'],
  },
  swamp_lair: {
    id: 'swamp_lair', name: '沼澤巢穴', tier: 2,
    description: '沼澤深處的神秘巢穴，詛咒能量在此濃縮。',
    minLevel: 25, maxFloors: 20,
    themes: ['swamp', 'undead'],
    bossIds: ['swamp_hydra'],
  },
  iron_mine: {
    id: 'iron_mine', name: '鐵礦深坑', tier: 3,
    description: '廢棄的礦坑深處，機械構造體被邪惡能量激活。',
    minLevel: 40, maxFloors: 25,
    themes: ['mine', 'construct'],
    bossIds: ['iron_titan'],
  },
  dark_forest_dungeon: {
    id: 'dark_forest_dungeon', name: '黑暗迷林', tier: 3,
    description: '古老森林的禁地，強大的不死族在此游蕩。',
    minLevel: 55, maxFloors: 30,
    themes: ['forest', 'undead'],
    bossIds: ['ancient_dragon'],
  },
  volcanic_cavern: {
    id: 'volcanic_cavern', name: '火山熔岩窟', tier: 4,
    description: '火山內部的熔岩洞窟，最古老的元素精靈守護著此地。',
    minLevel: 75, maxFloors: 35,
    themes: ['volcano', 'elemental'],
    bossIds: ['volcano_lord'],
  },
  dragon_nest: {
    id: 'dragon_nest', name: '龍族巢穴', tier: 5,
    description: '龍族族長的神聖巢穴，傳說中的終極挑戰。',
    minLevel: 95, maxFloors: 40,
    themes: ['dragon', 'sacred'],
    bossIds: ['dragon_patriarch'],
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
    case 'rest':
      log.heal('這裡有一個休息點，你稍作休息恢復了一些 HP/MP。')
      player.currentHP = player.currentHP.plus(player.currentStats.hp.times(0.3))
      if (player.currentHP.gt(player.currentStats.hp)) player.currentHP = player.currentStats.hp.plus(0)
      player.currentMP = player.currentMP.plus(player.currentStats.mp.times(0.3))
      if (player.currentMP.gt(player.currentStats.mp)) player.currentMP = player.currentStats.mp.plus(0)
      room.isCleared = true
      break
    case 'boss': {
      const bossId = template?.bossIds[0] ?? 'goblin_king'
      const boss = getMonsterById(bossId)
      if (boss) {
        log.story(`\n⚔ BOSS 出現！${boss.name} 從黑暗中現身！`)
        startCombat(player, [boss], 'dungeon_boss', `地城BOSS-${floor}F`, floor, tier)
        room.isCleared = true
      }
      break
      // ※ isCleared 由 markBossRoomCleared() 在戰鬥勝利後設定
    }
  }
}

/** 戰鬥結束後由外部（game.ts）呼叫：標記 boss 房間已清除 */
export function markBossRoomCleared(): boolean {
  const d = activeDungeon
  if (!d) return false
  const floor = d.floors[d.currentFloor - 1]
  const room = floor?.rooms.find(r => r.id === floor.currentRoomId)
  if (!room || room.type !== 'boss' || room.isCleared) return false
  room.isCleared = true
  log.success(`✦ BOSS 擊敗！你可以繼續前進至下一層。`)
  return true
}

/** 推進到下一層（或通關地城） */
export function advanceFloor(player: PlayerState): void {
  const d = activeDungeon
  if (!d) return
  const template = (DUNGEON_TEMPLATES as Record<string, typeof DUNGEON_TEMPLATES[keyof typeof DUNGEON_TEMPLATES]>)[d.dungeonId]

  // 標記目前層已完成
  const currentFloorState = d.floors[d.currentFloor - 1]
  if (currentFloorState) currentFloorState.isComplete = true
  bus.emit('dungeon:floor_complete', { dungeonId: d.dungeonId, floor: d.currentFloor })

  if (d.currentFloor >= d.maxFloor) {
    // 全層通關
    log.story(`\n★━━━━━━━━━━━━━━━━━━━━━━━━━━━━★`)
    log.story(`   恭喜！你通關了「${template?.name ?? d.dungeonId}」！`)
    log.story(`★━━━━━━━━━━━━━━━━━━━━━━━━━━━━━★`)
    activeDungeon.isActive = false
    activeDungeon = null
    player.location = { type: 'town', id: 'starting_town' }
    bus.emit('dungeon:cleared', { dungeonId: d.dungeonId, totalFloors: d.maxFloor })
    return
  }

  // 生成下一層
  const nextFloorNum = d.currentFloor + 1
  const newFloorSeed  = d.seed ^ (nextFloorNum * 0xdeadbeef)
  const newFloorState = generateFloor(d.dungeonId, nextFloorNum, newFloorSeed)
  d.floors.push(newFloorState)
  d.currentFloor = nextFloorNum
  player.location.subId = newFloorState.currentRoomId

  log.story(`\n── 第 ${nextFloorNum} 層 ─────────────────────`)
  describeRoom(getCurrentRoom()!)
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
