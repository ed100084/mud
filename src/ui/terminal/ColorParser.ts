export interface ColorSpan {
  text: string
  color?: string
  bold?: boolean
}

// 顏色標籤對照表
const COLOR_MAP: Record<string, string> = {
  red: '#ff4444', green: '#44ff88', blue: '#4488ff',
  yellow: '#ffff44', gold: '#ffcc00', cyan: '#00ccff',
  magenta: '#ff44ff', white: '#ffffff', gray: '#888888',
  dark: '#333333', orange: '#ff8800', pink: '#ff88aa',
  purple: '#aa44ff', lime: '#88ff44', teal: '#44ffcc',
}

// 解析顏色標籤 [red]text[/red] [b]text[/b]
export function parseColorTags(text: string): ColorSpan[] {
  const spans: ColorSpan[] = []
  const regex = /\[(\/?\w+)\]/g
  let lastIndex = 0
  const stack: { color?: string; bold?: boolean }[] = [{}]

  const flushText = (t: string) => {
    if (!t) return
    const top = stack[stack.length - 1]
    spans.push({ text: t, color: top.color, bold: top.bold })
  }

  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    flushText(text.slice(lastIndex, match.index))
    lastIndex = match.index + match[0].length
    const tag = match[1]
    if (tag.startsWith('/')) {
      stack.pop()
      if (stack.length === 0) stack.push({})
    } else if (tag === 'b') {
      stack.push({ ...stack[stack.length - 1], bold: true })
    } else if (COLOR_MAP[tag]) {
      stack.push({ ...stack[stack.length - 1], color: COLOR_MAP[tag] })
    }
  }
  flushText(text.slice(lastIndex))
  return spans
}
