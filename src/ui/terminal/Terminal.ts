import { bus } from '../../core/eventbus'
import { pushLine, setLineCallback } from './OutputBuffer'
import { OUTPUT_BUFFER_VISIBLE_LINES } from '../../constants'
import type { BufferLine } from './OutputBuffer'

export class Terminal {
  private outputEl!: HTMLElement

  init(appEl: HTMLElement): void {
    // Build the mud-root container with just the terminal output div
    // UIManager will insert #gui-status before and #context-panel/#bottom-nav after
    let mudRoot = document.getElementById('mud-root')
    if (!mudRoot) {
      mudRoot = document.createElement('div')
      mudRoot.id = 'mud-root'
      appEl.appendChild(mudRoot)
    }

    // Create terminal output element
    const outputEl = document.createElement('div')
    outputEl.id = 'terminal-output'
    mudRoot.appendChild(outputEl)
    this.outputEl = outputEl

    // Listen to UI print events
    bus.on('ui:print', ({ text, color }) => {
      pushLine(text, color ?? '#cccccc')
    })

    setLineCallback((line) => this.renderLine(line))
  }

  addLine(text: string, colorClass?: string): void {
    const div = document.createElement('div')
    div.className = 'mud-line' + (colorClass ? ` ${colorClass}` : '')
    div.textContent = text
    this.outputEl.appendChild(div)
    this.trimLines()
    this.scrollToBottom()
  }

  private renderLine(line: BufferLine): void {
    if (!line.text) {
      const div = document.createElement('div')
      div.className = 'mud-line mud-blank'
      this.outputEl.appendChild(div)
      this.trimLines()
      this.scrollToBottom()
      return
    }
    const div = document.createElement('div')
    div.className = 'mud-line'
    div.style.color = line.color
    div.textContent = line.text
    this.outputEl.appendChild(div)
    this.trimLines()
    this.scrollToBottom()
  }

  private trimLines(): void {
    // Virtualization: keep DOM manageable
    while (this.outputEl.children.length > OUTPUT_BUFFER_VISIBLE_LINES * 2) {
      this.outputEl.removeChild(this.outputEl.firstChild!)
    }
  }

  private scrollToBottom(): void {
    this.outputEl.scrollTop = this.outputEl.scrollHeight
  }

  // No-op: UIManager handles status bars now
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  updateStatusBar(_content: string): void {
    // no-op
  }
}

export const terminal = new Terminal()
