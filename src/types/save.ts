export interface SaveSlot {
  id?: number
  slotName: string
  timestamp: number
  version: string
  playerName: string
  level: string
  rebirthCount: number
  playTime: number
  data: string   // JSON 序列化的 PlayerState
  checksum: string
}
