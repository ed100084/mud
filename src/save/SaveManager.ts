import { log } from '../core/logger'
import { bus } from '../core/eventbus'
import { replacer, reviver } from '../core/bignum'
import { SAVE_VERSION, AUTO_SAVE_INTERVAL_MS } from '../constants'
import type { PlayerState } from '../types'
import type { SaveSlot } from '../types'

// 簡單的 localStorage 存檔（Dexie 可選升級）
const SAVE_KEY_PREFIX = 'mud_save_'
const SLOT_LIST_KEY = 'mud_save_slots'

function makeChecksum(data: string): string {
  let hash = 0
  for (let i = 0; i < Math.min(data.length, 1000); i++) {
    hash = ((hash << 5) - hash) + data.charCodeAt(i)
    hash |= 0
  }
  return hash.toString(16)
}

export async function saveGame(player: PlayerState, slotName = 'Auto Save'): Promise<void> {
  try {
    player.lastSaveTime = Date.now()
    const data = JSON.stringify(player, replacer)
    const checksum = makeChecksum(data)
    const slot: SaveSlot = {
      slotName,
      timestamp: Date.now(),
      version: SAVE_VERSION,
      playerName: player.name,
      level: player.level.toString(),
      rebirthCount: player.rebirthCount,
      playTime: player.playtimeStats.playTime,
      data,
      checksum,
    }
    localStorage.setItem(SAVE_KEY_PREFIX + slotName, JSON.stringify(slot))

    // 更新存槽清單
    const listRaw = localStorage.getItem(SLOT_LIST_KEY) ?? '[]'
    const list: string[] = JSON.parse(listRaw)
    if (!list.includes(slotName)) list.push(slotName)
    localStorage.setItem(SLOT_LIST_KEY, JSON.stringify(list))

    bus.emit('save:complete', { slotName })
    log.system(`✦ 存檔完成：${slotName}`)
  } catch (e) {
    log.error(`存檔失敗：${e}`)
  }
}

export async function loadGame(slotName = 'Auto Save'): Promise<PlayerState | null> {
  try {
    const raw = localStorage.getItem(SAVE_KEY_PREFIX + slotName)
    if (!raw) { log.warning(`找不到存槽「${slotName}」`); return null }
    const slot: SaveSlot = JSON.parse(raw)
    if (slot.version !== SAVE_VERSION) {
      log.warning(`存檔版本不符（${slot.version} vs ${SAVE_VERSION}），嘗試載入...`)
    }
    const player = JSON.parse(slot.data, reviver) as PlayerState
    log.success(`✦ 讀取存檔「${slotName}」— ${player.name} Lv.${player.level}`)
    return player
  } catch (e) {
    log.error(`讀取存檔失敗：${e}`)
    return null
  }
}

export function listSaves(): string[] {
  const raw = localStorage.getItem(SLOT_LIST_KEY) ?? '[]'
  return JSON.parse(raw)
}

export function deleteSave(slotName: string): void {
  localStorage.removeItem(SAVE_KEY_PREFIX + slotName)
  const listRaw = localStorage.getItem(SLOT_LIST_KEY) ?? '[]'
  const list: string[] = JSON.parse(listRaw)
  localStorage.setItem(SLOT_LIST_KEY, JSON.stringify(list.filter(s => s !== slotName)))
  log.info(`已刪除存槽「${slotName}」`)
}

// 匯出存檔為 Base64 字串
export function exportSave(player: PlayerState): string {
  const data = JSON.stringify(player, replacer)
  return btoa(unescape(encodeURIComponent(data)))
}

// 從 Base64 匯入存檔
export function importSave(encoded: string): PlayerState | null {
  try {
    const data = decodeURIComponent(escape(atob(encoded)))
    return JSON.parse(data, reviver) as PlayerState
  } catch {
    log.error('匯入失敗：無效的存檔字串')
    return null
  }
}

// 自動存檔定時器
let autoSaveTimer: ReturnType<typeof setInterval> | null = null

export function startAutoSave(getPlayer: () => PlayerState): void {
  if (autoSaveTimer) clearInterval(autoSaveTimer)
  autoSaveTimer = setInterval(() => {
    saveGame(getPlayer(), 'Auto Save')
  }, AUTO_SAVE_INTERVAL_MS)
}
