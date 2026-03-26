import Decimal from 'decimal.js'
import { D, fmt } from '../../core/bignum'
import { log } from '../../core/logger'
import type { PlayerState, Equipment, EquipSlot, StatBlock } from '../../types'

// 裝備物品庫（instanceId -> Equipment）
const itemRegistry = new Map<string, Equipment>()

export function registerItem(item: Equipment): void {
  itemRegistry.set(item.instanceId, item)
}

export function getItem(instanceId: string): Equipment | undefined {
  return itemRegistry.get(instanceId)
}

export function getAllItems(): Equipment[] {
  return Array.from(itemRegistry.values())
}

// 取得玩家已裝備的物品 Map
export function getEquippedItems(player: PlayerState): Map<string, Equipment> {
  const result = new Map<string, Equipment>()
  for (const [_slot, id] of Object.entries(player.equipmentState)) {
    if (id) {
      const item = itemRegistry.get(id)
      if (item) result.set(id, item)
    }
  }
  return result
}

// 裝備物品
export function equipItem(player: PlayerState, instanceId: string): boolean {
  const item = itemRegistry.get(instanceId)
  if (!item) { log.warning('找不到物品'); return false }

  // 取得插槽名稱
  let slotKey = item.slot as string
  if (item.slot === 'ring') {
    slotKey = !player.equipmentState.ring1 ? 'ring1' : 'ring2'
  }

  // 如果插槽已有物品，先卸下
  const current = (player.equipmentState as Record<string, string | undefined>)[slotKey]
  if (current) {
    unequipSlot(player, slotKey)
  }

  (player.equipmentState as Record<string, string>)[slotKey] = instanceId

  // 將物品從物品欄移除（如果在）
  player.inventory = player.inventory.filter(i => i.instanceId !== instanceId)

  log.system(`裝備了「${item.name}」`)
  return true
}

// 卸下插槽
export function unequipSlot(player: PlayerState, slotKey: string): void {
  const id = (player.equipmentState as Record<string, string | undefined>)[slotKey]
  if (!id) return
  const item = itemRegistry.get(id)
  if (item) {
    player.inventory.push({ instanceId: id, templateId: item.templateId, quantity: 1 })
    log.system(`卸下了「${item.name}」`)
  }
  (player.equipmentState as Record<string, string | undefined>)[slotKey] = undefined
}

// 販售物品
export function sellItem(player: PlayerState, instanceId: string): Decimal {
  const item = itemRegistry.get(instanceId)
  if (!item) return D(0)

  const price = item.sellPrice
  player.gold = player.gold.plus(price)
  player.inventory = player.inventory.filter(i => i.instanceId !== instanceId)
  delete player.itemData?.[instanceId]
  itemRegistry.delete(instanceId)

  log.loot(`賣出「${item.name}」，獲得 ${fmt(price)} 金幣`)
  return price
}

// 新增物品到物品欄
export function addItemToInventory(player: PlayerState, item: Equipment): void {
  registerItem(item)
  player.itemData = player.itemData ?? {}
  player.itemData[item.instanceId] = item
  player.inventory.push({ instanceId: item.instanceId, templateId: item.templateId, quantity: 1 })
}
