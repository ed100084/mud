import { OUTPUT_BUFFER_MAX_LINES } from '../../constants'

export interface BufferLine {
  id: number
  text: string
  color: string
  channel: string
  timestamp: number
}

let lineCounter = 0
let lines: BufferLine[] = []
let onNewLine: ((line: BufferLine) => void) | null = null

export function setLineCallback(cb: (line: BufferLine) => void): void {
  onNewLine = cb
}

export function pushLine(text: string, color = '#cccccc', channel = 'info'): BufferLine {
  const line: BufferLine = {
    id: lineCounter++,
    text,
    color,
    channel,
    timestamp: Date.now(),
  }
  lines.push(line)
  if (lines.length > OUTPUT_BUFFER_MAX_LINES) {
    lines = lines.slice(-OUTPUT_BUFFER_MAX_LINES)
  }
  onNewLine?.(line)
  return line
}

export function getLines(): BufferLine[] { return lines }
export function getLastLines(count: number): BufferLine[] {
  return lines.slice(-count)
}
export function clearBuffer(): void { lines = [] }
