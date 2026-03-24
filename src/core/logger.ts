import { bus } from './eventbus'

export type LogChannel = 'combat' | 'system' | 'loot' | 'dialogue' | 'quest' | 'story' | 'info' | 'warning' | 'error'

interface LogEntry {
  id: number
  text: string
  color: string
  channel: LogChannel
  timestamp: number
}

class GameLogger {
  private entries: LogEntry[] = []
  private counter = 0
  private enabledChannels: Set<LogChannel> = new Set([
    'combat', 'system', 'loot', 'dialogue', 'quest', 'story', 'info', 'warning', 'error'
  ])

  private write(text: string, color: string, channel: LogChannel): void {
    if (!this.enabledChannels.has(channel)) return
    const entry: LogEntry = { id: this.counter++, text, color, channel, timestamp: Date.now() }
    this.entries.push(entry)
    bus.emit('ui:print', { text, color, channel })
  }

  info(text: string)     { this.write(text, '#aaaaaa', 'info') }
  system(text: string)   { this.write(text, '#00ccff', 'system') }
  combat(text: string)   { this.write(text, '#ffffff', 'combat') }
  damage(text: string)   { this.write(text, '#ff4444', 'combat') }
  heal(text: string)     { this.write(text, '#44ff88', 'combat') }
  loot(text: string)     { this.write(text, '#ffcc00', 'loot') }
  quest(text: string)    { this.write(text, '#88ffcc', 'quest') }
  story(text: string)    { this.write(text, '#ccaaff', 'story') }
  dialogue(text: string) { this.write(text, '#ffffaa', 'dialogue') }
  warning(text: string)  { this.write(text, '#ff8800', 'warning') }
  error(text: string)    { this.write(text, '#ff2222', 'error') }
  success(text: string)  { this.write(text, '#00ff88', 'system') }

  separator(): void {
    this.write('─'.repeat(50), '#333333', 'system')
  }

  blank(): void {
    this.write('', '#000000', 'system')
  }

  toggleChannel(channel: LogChannel, enabled: boolean): void {
    if (enabled) this.enabledChannels.add(channel)
    else this.enabledChannels.delete(channel)
  }

  getEntries(): LogEntry[] { return this.entries }
}

export const log = new GameLogger()
