import { bus } from '../core/eventbus'
import { D, fmt, fmtFull } from '../core/bignum'
import { getActiveCombat } from '../systems/combat/CombatSystem'
import { getActiveDungeon, getCurrentRoom, advanceFloor } from '../systems/dungeon/DungeonSystem'
import { TOWNS, NPCS, SHOPS } from '../systems/town/TownData'
import { EQUIPMENT_TEMPLATES } from '../systems/equipment/EquipmentData'
import { JOB_DEFINITIONS } from '../systems/job/JobData'
import { canChangeJob } from '../systems/job/JobSystem'
import { canRebirth } from '../systems/prestige/PrestigeSystem'
import { PRESTIGE_NODES } from '../systems/prestige/PrestigeData'
import { QUEST_DEFINITIONS, type QuestDefinition } from '../systems/npc/QuestSystem'
import { getAllItems, getEquippedItems, equipItem, unequipSlot, sellItem, getItem } from '../systems/equipment/EquipmentSystem'
import { recalcStats } from '../systems/player/StatsSystem'
import { RANDOM_EVENTS, ZONES } from '../systems/adventure/AdventureSystem'
import { DUNGEON_TEMPLATES } from '../systems/dungeon/DungeonSystem'
import { getActiveCompanions, dismissCompanion } from '../systems/companion/CompanionSystem'
import { listSaves, saveGame, deleteSave } from '../save/SaveManager'
import { acceptQuest, completeQuest } from '../systems/npc/QuestSystem'
import { MAX_COMPANIONS } from '../constants'
import type { PlayerState, FloorState } from '../types'

type UIMode = 'default' | 'combat' | 'dungeon' | 'town' | 'adventure' | 'event_choice' | 'dialogue'
type PanelType = 'character' | 'inventory' | 'quests' | 'prestige' | 'shop' | 'forge' | 'explore' | 'dungeons' | 'companions' | 'settings' | 'saves' | null

export class UIManager {
  private guiStatus!: HTMLElement
  private contextPanel!: HTMLElement
  private bottomNav!: HTMLElement
  private overlay!: HTMLElement
  private panelTitle!: HTMLElement
  private panelBody!: HTMLElement
  private tooltipEl!: HTMLElement

  private getPlayer!: () => PlayerState
  private cmdFn!: (s: string) => void
  private currentMode: UIMode = 'default'
  private activePanel: PanelType = null
  private activeShopId: string | undefined = undefined
  private forgeTargetItemId: string | undefined = undefined
  private loadCallback?: (slotName: string) => Promise<void>

  setLoadCallback(fn: (slotName: string) => Promise<void>): void {
    this.loadCallback = fn
  }

  init(_root: HTMLElement, getPlayer: () => PlayerState, cmdFn: (s: string) => void): void {
    this.getPlayer = getPlayer
    this.cmdFn = cmdFn

    this.buildDOM()
    this.bindEventBus()
  }

  private buildDOM(): void {
    const mudRoot = document.getElementById('mud-root')
    if (!mudRoot) {
      console.error('UIManager: #mud-root not found')
      return
    }

    // Status bar — inject before everything else in mud-root
    this.guiStatus = document.createElement('div')
    this.guiStatus.id = 'gui-status'
    this.guiStatus.innerHTML = `
      <div class="gui-stat-row">
        <span class="stat-label red">HP</span>
        <div class="gui-bar"><div id="hp-fill" class="bar-fill red" style="width:100%"></div></div>
        <span id="hp-text" class="stat-val">100/100</span>
      </div>
      <div class="gui-stat-row">
        <span class="stat-label blue">MP</span>
        <div class="gui-bar"><div id="mp-fill" class="bar-fill blue" style="width:100%"></div></div>
        <span id="mp-text" class="stat-val">50/50</span>
      </div>
      <div class="gui-stat-row">
        <span class="stat-label gold">XP</span>
        <div class="gui-bar"><div id="xp-fill" class="bar-fill gold" style="width:0%"></div></div>
        <span id="lv-text" class="stat-val">Lv.1</span>
      </div>
      <div class="gui-info-row">
        <span id="gold-text">💰0</span>
        <span id="rebirth-text"></span>
        <span id="location-text">城鎮</span>
      </div>
      <div id="quest-tracker"></div>
    `
    // Insert at top of mud-root (before terminal-output)
    mudRoot.insertBefore(this.guiStatus, mudRoot.firstChild)

    // Context panel — appended after terminal-output
    this.contextPanel = document.createElement('div')
    this.contextPanel.id = 'context-panel'
    mudRoot.appendChild(this.contextPanel)

    // Bottom nav
    this.bottomNav = document.createElement('div')
    this.bottomNav.id = 'bottom-nav'
    this.bottomNav.innerHTML = `
      <button class="nav-tab" data-panel="explore">
        <span class="nav-icon">🗺</span><span>探索</span>
      </button>
      <button class="nav-tab" data-panel="character">
        <span class="nav-icon">👤</span><span>角色</span>
      </button>
      <button class="nav-tab" data-panel="inventory">
        <span class="nav-icon">📦</span><span>物品</span>
      </button>
      <button class="nav-tab" data-panel="quests">
        <span class="nav-icon">📋</span><span>任務</span>
      </button>
      <button class="nav-tab" data-panel="prestige">
        <span class="nav-icon">✨</span><span>重生樹</span>
      </button>
    `
    mudRoot.appendChild(this.bottomNav)

    // Slide panel overlay — attached to body so it overlays everything
    const overlay = document.createElement('div')
    overlay.id = 'slide-panel-overlay'
    const slidePanel = document.createElement('div')
    slidePanel.id = 'slide-panel'
    slidePanel.innerHTML = `
      <div class="panel-header">
        <span class="panel-title" id="panel-title-text"></span>
        <button class="panel-close" id="panel-close-btn">✕</button>
      </div>
      <div class="panel-body" id="panel-body"></div>
    `
    overlay.appendChild(slidePanel)
    document.body.appendChild(overlay)
    this.overlay = overlay

    this.panelTitle = document.getElementById('panel-title-text')!
    this.panelBody = document.getElementById('panel-body')!

    // Global item tooltip
    this.tooltipEl = document.createElement('div')
    this.tooltipEl.id = 'item-tooltip'
    document.body.appendChild(this.tooltipEl)

    this.bindInteractions()
    this.renderContextPanel('default')
    this.updateStatusBars()
  }

  private bindInteractions(): void {
    // Bottom nav tabs — open slide panels
    this.bottomNav.addEventListener('click', (e) => {
      const tab = (e.target as HTMLElement).closest('.nav-tab') as HTMLElement | null
      if (!tab) return

      const panel = tab.dataset.panel
      if (panel) {
        this.openSlidePanel(panel as PanelType)
      }
    })

    // Global delegation for all data-cmd buttons
    document.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('[data-cmd]') as HTMLElement | null
      if (!btn) return
      const cmd = btn.dataset.cmd
      if (cmd && cmd.trim() !== '') {
        this.cmdFn(cmd)
        setTimeout(() => this.refresh(), 100)
      }
    })

    // Global delegation for data-open-shop buttons
    document.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('[data-open-shop]') as HTMLElement | null
      if (!btn) return
      const shopId = btn.dataset.openShop
      if (shopId) this.openShopPanel(shopId)
    })

    // Global delegation for non-nav data-panel buttons (context panel, etc.)
    document.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('[data-panel]') as HTMLElement | null
      if (!btn || btn.classList.contains('nav-tab')) return  // nav-tabs handled separately
      const panel = btn.dataset.panel
      if (panel) this.openSlidePanel(panel as PanelType)
    })

    // Close overlay on backdrop click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.closeSlidePanel()
    })

    // Close button
    document.getElementById('panel-close-btn')?.addEventListener('click', () => {
      this.closeSlidePanel()
    })
  }

  private bindEventBus(): void {
    bus.on('combat:start', () => setTimeout(() => this.refresh(), 50))
    bus.on('combat:end',   () => setTimeout(() => this.refresh(), 50))
    bus.on('player:level_up', () => this.updateStatusBars())
    bus.on('player:rebirth',  () => setTimeout(() => this.refresh(), 50))
    bus.on('dungeon:floor_complete', () => setTimeout(() => this.refresh(), 50))
    bus.on('dungeon:cleared',        () => setTimeout(() => this.refresh(), 50))
    bus.on('quest:accepted', () => this.updateStatusBars())
    bus.on('quest:ready',    () => this.updateStatusBars())
    bus.on('quest:complete', () => this.updateStatusBars())
  }

  // ── Public API ─────────────────────────────────────────────

  refresh(): void {
    this.updateStatusBars()

    const p = this.getPlayer?.()

    // 優先：有待處理事件選項 → 顯示事件選項面板
    if (p?.flags?.['pending_event']) {
      this.currentMode = 'event_choice'
      this.buildEventChoicePanel()
      return
    }

    // 優先：正在對話中 → 顯示對話面板
    if (p?.flags?.['talking_npc']) {
      this.currentMode = 'dialogue'
      this.buildDialoguePanel()
      return
    }

    // 一般模式偵測
    let newMode: UIMode = 'default'

    try {
      if (getActiveCombat()) newMode = 'combat'
    } catch { /* ignore */ }

    if (newMode === 'default') {
      try {
        if (getActiveDungeon()) newMode = 'dungeon'
      } catch { /* ignore */ }
    }

    if (newMode === 'default') {
      if (p?.location?.type === 'town') newMode = 'town'
      else if (p?.location?.type === 'adventure') newMode = 'adventure'
    }

    if (newMode !== this.currentMode) {
      this.currentMode = newMode
      this.renderContextPanel(newMode)
    } else if (newMode === 'combat') {
      this.updateEnemyBars()
    } else if (newMode === 'dungeon') {
      this.buildDungeonPanel()
    }
  }

  setMode(mode: UIMode): void {
    this.currentMode = mode
    this.renderContextPanel(mode)
  }

  updateStatusBars(): void {
    try { this._doUpdateStatusBars() } catch { /* prevent tick crash */ }
  }

  // ── Status Bars ────────────────────────────────────────────

  private _doUpdateStatusBars(): void {
    const p = this.getPlayer?.()
    if (!p) return

    const hpFill   = document.getElementById('hp-fill')
    const mpFill   = document.getElementById('mp-fill')
    const xpFill   = document.getElementById('xp-fill')
    const hpText   = document.getElementById('hp-text')
    const mpText   = document.getElementById('mp-text')
    const lvText   = document.getElementById('lv-text')
    const goldText = document.getElementById('gold-text')
    const rebirthText  = document.getElementById('rebirth-text')
    const locationText = document.getElementById('location-text')

    if (!hpFill || !mpFill || !xpFill) return

    const maxHP = p.currentStats.hp
    const maxMP = p.currentStats.mp
    const hpPct = maxHP.gt(0) ? p.currentHP.div(maxHP).times(100).toNumber() : 0
    const mpPct = maxMP.gt(0) ? p.currentMP.div(maxMP).times(100).toNumber() : 0
    const xpPct = p.xpToNext.gt(0) ? p.xp.div(p.xpToNext).times(100).toNumber() : 0

    hpFill.style.width = `${clamp(hpPct).toFixed(1)}%`
    mpFill.style.width = `${clamp(mpPct).toFixed(1)}%`
    xpFill.style.width = `${clamp(xpPct).toFixed(1)}%`

    if (hpText) hpText.textContent = `${fmtFull(p.currentHP)}/${fmtFull(maxHP)}`
    if (mpText) mpText.textContent = `${fmtFull(p.currentMP)}/${fmtFull(maxMP)}`
    if (lvText) {
      const rb = p.rebirthCount > 0 ? ` ✦${p.rebirthCount}` : ''
      lvText.textContent = `Lv.${p.level.toFixed(0)}${rb}`
    }
    if (goldText) goldText.textContent = `💰${fmt(p.gold)}`
    if (rebirthText) rebirthText.textContent = p.rebirthCount > 0 ? `✦ 第${p.rebirthCount}輪迴` : ''
    if (locationText) locationText.textContent = this.locationLabel(p)

    this._updateQuestTracker(p)
  }

  private _updateQuestTracker(p: PlayerState): void {
    const el = document.getElementById('quest-tracker')
    if (!el) return
    if (p.quests.length === 0) { el.innerHTML = ''; return }

    const rows = p.quests.map(progress => {
      const def = (QUEST_DEFINITIONS as Record<string, QuestDefinition | undefined>)[progress.questId]
      if (!def) return ''
      const objLines = def.objectives.map((obj, i) => {
        const cur = progress.objectiveProgress[`${i}`] ?? 0
        const pct = obj.required > 0 ? Math.min(100, Math.round(cur / obj.required * 100)) : 100
        const done = cur >= obj.required
        const label = obj.description.replace(/0\/\d+/, `${cur}/${obj.required}`)
        return `
          <div class="qt-obj${done ? ' qt-done' : ''}">
            <span class="qt-obj-label">${label}</span>
            <div class="qt-bar-bg"><div class="qt-bar-fill" style="width:${pct}%"></div></div>
          </div>`
      }).join('')
      const allDone = progress.isComplete
      return `
        <div class="qt-quest${allDone ? ' qt-ready' : ''}">
          <div class="qt-title">${allDone ? '📬 ' : '📋 '}${def.title}${allDone ? ' <span class="qt-ready-tag">可交付</span>' : ''}</div>
          ${objLines}
        </div>`
    }).join('')

    el.innerHTML = rows
  }

  private locationLabel(p: PlayerState): string {
    if (p.location.type === 'town') return `🏙 ${p.location.id}`
    if (p.location.type === 'dungeon') return `⚔ 地城`
    return `🗺 冒險中`
  }

  // ── Context Panel ──────────────────────────────────────────

  private renderContextPanel(mode: UIMode): void {
    this.contextPanel.innerHTML = ''
    switch (mode) {
      case 'combat':    this.buildCombatPanel();    break
      case 'dungeon':   this.buildDungeonPanel();   break
      case 'town':      this.buildTownPanel();      break
      case 'adventure': this.buildAdventurePanel(); break
      default:          this.buildDefaultPanel();   break
    }
  }

  // ── 事件選項面板 ───────────────────────────────────────────
  private buildEventChoicePanel(): void {
    const p = this.getPlayer?.()
    if (!p) return

    const eventId = p.flags['pending_event'] as string
    const event = (RANDOM_EVENTS as Record<string, { title?: string; options: { text: string }[] }>)[eventId]
    if (!event) {
      // 事件資料找不到 → 清除旗標回復正常
      delete p.flags['pending_event']
      this.refresh()
      return
    }

    const optionBtns = event.options.map((opt, i) => `
      <button class="choice-btn" data-choice="${i + 1}">${i + 1}. ${opt.text}</button>
    `).join('')

    this.contextPanel.innerHTML = `
      <div class="choice-panel">
        <div class="choice-header">【事件】${event.title ?? '選擇'}</div>
        <div class="choice-options">${optionBtns}</div>
      </div>
    `

    this.contextPanel.querySelectorAll('.choice-btn[data-choice]').forEach(btn => {
      btn.addEventListener('click', () => {
        const n = (btn as HTMLElement).dataset.choice!
        this.cmdFn(`choice ${n}`)
      })
    })
  }

  // ── NPC 對話面板 ───────────────────────────────────────────
  private buildDialoguePanel(): void {
    const p = this.getPlayer?.()
    if (!p) return

    const npcId  = p.flags['talking_npc']  as string
    const nodeId = (p.flags['talking_node'] as string) ?? 'root'
    const npc = NPCS[npcId]

    if (!npc) { this.clearDialogue(p); return }

    const node = npc.dialogueTree.find(n => n.id === nodeId)
    if (!node) { this.clearDialogue(p); return }

    const optionBtns = node.options.map((opt, i) => {
      let disabled = false
      if ((opt as any).condition) {
        const cond: string = (opt as any).condition
        const m = cond.match(/^gold>=(\d+)$/)
        if (m && p.gold.lt(parseInt(m[1]))) disabled = true
      }
      return `<button class="choice-btn${disabled ? ' disabled' : ''}" data-dia="${i}"${disabled ? ' disabled' : ''}>${i + 1}. ${opt.text}${disabled ? ' <span style="color:#f66;font-size:10px">（金幣不足）</span>' : ''}</button>`
    }).join('')

    // Quest buttons for this NPC
    const npcQuestIds = npc.questIds ?? []
    let questHTML = ''
    if (npcQuestIds.length > 0) {
      const questBtns = npcQuestIds.map(qid => {
        const def = QUEST_DEFINITIONS[qid]
        if (!def) return ''
        const activeQ = p.quests.find(q => q.questId === qid)
        const isCompleted = p.completedQuestIds.includes(qid)
        if (isCompleted) return `<div style="color:var(--text-dim);font-size:11px">✔ ${def.title}</div>`
        if (activeQ?.isComplete) {
          return `<button class="choice-btn" data-quest-complete="${qid}">📬 提交「${def.title}」</button>`
        }
        if (activeQ) {
          return `<div style="color:var(--text-dim);font-size:11px">🔄 ${def.title}（進行中）</div>`
        }
        return `<button class="choice-btn" data-quest-accept="${qid}">📜 接受「${def.title}」</button>`
      }).join('')
      questHTML = `<div class="quest-section" style="margin-top:6px;border-top:1px solid var(--border);padding-top:6px">${questBtns}</div>`
    }

    this.contextPanel.innerHTML = `
      <div class="dialogue-panel">
        <div class="npc-name-title">【${npc.name}（${npc.title}）】</div>
        <div class="npc-dialogue-text">「${node.text}」</div>
        <div class="choice-options">${optionBtns}</div>
        ${questHTML}
      </div>
    `

    this.contextPanel.querySelectorAll('.choice-btn[data-dia]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.dia!)
        this.handleDialogueOption(p, npc.dialogueTree, nodeId, idx)
      })
    })

    this.contextPanel.querySelectorAll('[data-quest-accept]').forEach(btn => {
      btn.addEventListener('click', () => {
        acceptQuest(p, (btn as HTMLElement).dataset.questAccept!)
        this.buildDialoguePanel()
      })
    })

    this.contextPanel.querySelectorAll('[data-quest-complete]').forEach(btn => {
      btn.addEventListener('click', () => {
        completeQuest(p, (btn as HTMLElement).dataset.questComplete!)
        this.buildDialoguePanel()
      })
    })
  }

  private handleDialogueOption(
    p: PlayerState,
    tree: { id: string; text: string; options: { text: string; nextId?: string; action?: string }[] }[],
    nodeId: string,
    optIdx: number
  ): void {
    const node = tree.find(n => n.id === nodeId)
    if (!node) { this.clearDialogue(p); return }

    const opt = node.options[optIdx]
    if (!opt) { this.clearDialogue(p); return }

    // 處理特殊 action
    if (opt.action) {
      switch (opt.action) {
        case 'inn_rest':       this.cmdFn('inn');    break
        case 'open_shop': {
          const npcId = p.flags['talking_npc'] as string
          const npc = NPCS[npcId]
          const town = TOWNS[p.location.id]
          const shopId = npc?.shopId ?? town?.shopIds?.[0]
          this.clearDialogue(p)
          if (shopId) this.openShopPanel(shopId)
          return
        }
        case 'show_quests':    this.cmdFn('quests'); break
        case 'show_guild_contracts':
        case 'show_guild_rank': this.cmdFn('quests'); break
        case 'open_enchant': {
          this.forgeTargetItemId = undefined
          this.clearDialogue(p)
          this.openSlidePanel('forge')
          return
        }
        default: break
      }
    }

    // 導向下一個節點或關閉對話
    if (opt.nextId) {
      p.flags['talking_node'] = opt.nextId
      this.buildDialoguePanel()
    } else {
      this.clearDialogue(p)
    }
  }

  private clearDialogue(p: PlayerState): void {
    delete p.flags['talking_npc']
    delete p.flags['talking_node']
    this.currentMode = 'default'
    this.refresh()
  }

  private buildDefaultPanel(): void {
    this.contextPanel.innerHTML = `
      <div class="action-grid cols-3">
        <button class="act-btn primary" data-panel="explore">🗺 探索</button>
        <button class="act-btn" data-cmd="town">🏙 城鎮</button>
        <button class="act-btn" data-panel="dungeons">⚔ 地城</button>
        <button class="act-btn" data-panel="companions">🐾 同伴</button>
        <button class="act-btn" data-panel="saves">💾 存檔</button>
        <button class="act-btn" data-panel="settings">⚙ 設定</button>
      </div>
    `
  }

  private buildAdventurePanel(): void {
    const p = this.getPlayer?.()
    if (!p) return

    const zoneId = p.location.id ?? 'starting_plains'
    const areaId = p.location.subId
    const zone   = ZONES[zoneId]
    const area   = areaId ? zone?.areas.find(a => a.id === areaId) : zone?.areas[0]
    const continueCmd = areaId ? `explore ${zoneId} ${areaId}` : `explore ${zoneId}`

    const hpPct = p.currentStats.hp.gt(0)
      ? clamp(p.currentHP.div(p.currentStats.hp).times(100).toNumber()) : 0
    const hpColor = hpPct > 50 ? '#1eff00' : hpPct > 25 ? '#ffaa00' : '#ff3333'

    this.contextPanel.innerHTML = `
      <div class="adventure-panel">
        <div style="margin-bottom:6px">
          <div style="font-size:13px;font-weight:bold;color:var(--text)">${zone?.name ?? zoneId}</div>
          <div style="font-size:11px;color:var(--text-dim)">${area?.name ?? ''}</div>
          <div style="margin-top:4px;font-size:11px">
            <span style="color:${hpColor}">HP ${fmtFull(p.currentHP)}/${fmtFull(p.currentStats.hp)}</span>
            &nbsp;💰${fmt(p.gold)}
          </div>
        </div>
        <div class="action-grid cols-2">
          <button class="act-btn primary" data-cmd="${continueCmd}" style="grid-column:span 2">⚔ 繼續探索</button>
          <button class="act-btn" data-panel="explore">🗺 換區域</button>
          <button class="act-btn" data-cmd="town">🏙 回城</button>
        </div>
      </div>
    `
  }

  private buildTownPanel(): void {
    const p = this.getPlayer?.()
    const townId = p?.location?.id ?? 'starting_town'
    const town = TOWNS[townId]
    const townName = town?.name ?? '城鎮'
    const townDesc = town?.description ?? ''

    const npcBtns = (town?.npcIds ?? []).map(npcId => {
      const npc = NPCS[npcId]
      return npc ? `<button class="act-btn" data-cmd="talk ${npcId}">👤 ${npc.name}</button>` : ''
    }).join('')

    const firstShopId = town?.shopIds?.[0] ?? 'general_shop'

    this.contextPanel.innerHTML = `
      <div class="town-header">
        <div class="town-name">🏙 ${townName}</div>
        ${townDesc ? `<div class="town-desc">${townDesc}</div>` : ''}
      </div>
      <div class="action-grid cols-3">
        <button class="act-btn" data-cmd="explore">🗺 探索</button>
        <button class="act-btn" data-open-shop="${firstShopId}">🛒 商店</button>
        <button class="act-btn" data-cmd="inn">🏨 旅館</button>
        ${npcBtns}
        <button class="act-btn" data-panel="dungeons">⚔ 地城</button>
        <button class="act-btn" data-cmd="quests">📋 任務</button>
      </div>
    `
  }

  private buildCombatPanel(): void {
    const combat = getActiveCombat()
    let enemyCardsHTML = ''

    if (combat) {
      enemyCardsHTML = combat.enemies.map((e) => {
        const pct = e.maxHP.gt(0) ? clamp(e.currentHP.div(e.maxHP).times(100).toNumber()) : 0
        const dead = e.currentHP.lte(0)
        return `
          <div class="enemy-card" id="enemy-card-${e.unitId}" style="${dead ? 'opacity:0.35' : ''}">
            <div class="enemy-name">${dead ? '💀 ' : ''}${e.name}</div>
            <div class="enemy-hp-bar">
              <div class="enemy-hp-fill" id="enemy-hp-${e.unitId}" style="width:${pct.toFixed(1)}%"></div>
            </div>
            <div class="enemy-hp-text" id="enemy-hp-text-${e.unitId}">${fmtFull(e.currentHP)}/${fmtFull(e.maxHP)}</div>
          </div>
        `
      }).join('')
    }

    this.contextPanel.innerHTML = `
      <div class="combat-panel">
        ${enemyCardsHTML ? `<div id="enemy-cards">${enemyCardsHTML}</div>` : ''}
        <div class="action-grid cols-4">
          <button class="act-btn primary" data-cmd="attack">⚔ 攻擊</button>
          <button class="act-btn" data-cmd="defend">🛡 防禦</button>
          <button class="act-btn magic" data-cmd="skill 1">✨ 技能</button>
          <button class="act-btn danger" data-cmd="flee">🏃 逃跑</button>
          <button class="act-btn" data-cmd="tame">🐾 馴服</button>
          <button class="act-btn" data-cmd="inventory">📦 物品</button>
        </div>
      </div>
    `
  }

  private buildDungeonPanel(): void {
    const dungeon = getActiveDungeon()
    const floor   = dungeon ? dungeon.floors[dungeon.currentFloor - 1] : null
    const room    = getCurrentRoom()
    const availDirs = new Set((room?.connections ?? []).map(c => c.direction))

    const dBtn = (dir: string, arrow: string) => {
      const ok = availDirs.has(dir)
      return ok
        ? `<button class="dpad-btn" data-cmd="go ${dir}">${arrow}</button>`
        : `<div class="dpad-btn" style="opacity:0.2;cursor:default">${arrow}</div>`
    }

    const typeLabel: Record<string, string> = {
      entrance: '入口', exit: '出口', combat: '⚔戰鬥', treasure: '💰寶箱',
      shop: '🛒商店', rest: '💤休息', boss: '💀魔王', event: '❓事件', puzzle: '🔮謎題', empty: '空房',
    }
    const maxFloor   = dungeon?.maxFloor ?? 1
    const floorInfo  = dungeon ? `第 ${dungeon.currentFloor} 層 / ${maxFloor} 層` : ''
    const roomLabel  = room ? (typeLabel[room.type] ?? room.type) + (room.isCleared ? '✓' : '') : ''

    // 判斷是否可以前進下一層
    const bossCleared = room?.type === 'boss' && room?.isCleared
    const isLastFloor = dungeon ? dungeon.currentFloor >= dungeon.maxFloor : false

    const mapHTML = floor ? this.buildMiniMapHTML(floor) : ''

    const nextFloorBtn = bossCleared
      ? (isLastFloor
          ? `<button class="act-btn" style="background:#4a3000;border-color:#ffaa00;color:#ffaa00" data-cmd="advance_floor">🏆 通關地城</button>`
          : `<button class="act-btn" style="background:#003a2a;border-color:#00ffaa;color:#00ffaa" data-cmd="advance_floor">⬇ 下一層</button>`)
      : ''

    this.contextPanel.innerHTML = `
      <div class="dungeon-panel">
        <div style="font-size:11px;color:var(--text-dim);text-align:center;margin-bottom:2px">${floorInfo} ${roomLabel}</div>
        ${mapHTML}
        <div class="dungeon-layout">
          <div class="dpad">
            <div></div>
            ${dBtn('n', '↑')}
            <div></div>
            ${dBtn('w', '←')}
            <div class="dpad-center">移動</div>
            ${dBtn('e', '→')}
            <div></div>
            ${dBtn('s', '↓')}
            <div></div>
          </div>
          <div class="dungeon-actions">
            ${nextFloorBtn}
            <button class="act-btn" data-cmd="inn">💤 休息</button>
            <button class="act-btn danger" data-cmd="exit_dungeon">🚪 撤退</button>
          </div>
        </div>
      </div>
    `
  }

  private buildMiniMapHTML(floor: FloorState): string {
    // BFS 從入口展開，用方向決定每個房間的網格座標
    const positions = new Map<string, { r: number; c: number }>()
    const visited   = new Set<string>()
    const queue: { id: string; r: number; c: number }[] = [{ id: floor.entranceRoomId, r: 0, c: 0 }]
    const offsets: Record<string, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

    while (queue.length) {
      const { id, r, c } = queue.shift()!
      if (visited.has(id)) continue
      visited.add(id)
      positions.set(id, { r, c })
      const rm = floor.rooms.find(x => x.id === id)
      if (!rm) continue
      for (const conn of rm.connections) {
        if (!visited.has(conn.targetRoomId)) {
          const [dr, dc] = offsets[conn.direction] ?? [0, 0]
          queue.push({ id: conn.targetRoomId, r: r + dr, c: c + dc })
        }
      }
    }

    if (!positions.size) return ''

    let minR = 0, maxR = 0, minC = 0, maxC = 0
    for (const { r, c } of positions.values()) {
      minR = Math.min(minR, r); maxR = Math.max(maxR, r)
      minC = Math.min(minC, c); maxC = Math.max(maxC, c)
    }
    const rows = maxR - minR + 1
    const cols = maxC - minC + 1

    // 建立 2D grid
    const grid: (string | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null))
    for (const [roomId, { r, c }] of positions) grid[r - minR][c - minC] = roomId

    const icons: Record<string, string> = {
      entrance: '🚪', exit: '🔼', combat: '⚔', treasure: '💰',
      shop: '🛒', rest: '💤', boss: '💀', event: '❓', puzzle: '🔮', empty: '·',
    }
    // 房間背景色
    const bgColor: Record<string, string> = {
      entrance: '#2a4a2a', exit: '#1a3a4a', combat: '#3a1a1a', treasure: '#3a2a00',
      shop: '#1a2a3a', rest: '#1a3a2a', boss: '#4a0a0a', event: '#2a1a3a', puzzle: '#1a2a2a', empty: '#1a1a1a',
    }
    const CELL = 22  // px

    const cells = grid.flatMap(row => row.map(roomId => {
      if (!roomId) {
        return `<div style="width:${CELL}px;height:${CELL}px"></div>`
      }
      const rm = floor.rooms.find(x => x.id === roomId)!
      const isCurrent = roomId === floor.currentRoomId
      const explored  = rm.isExplored
      const icon = explored ? (icons[rm.type] ?? '?') : '?'
      const bg   = isCurrent ? '#cc4400' : (explored ? (bgColor[rm.type] ?? '#222') : '#111')
      const border = isCurrent ? '2px solid #ff6600' : '1px solid #444'
      return `<div style="
        width:${CELL}px;height:${CELL}px;
        background:${bg};border:${border};
        display:flex;align-items:center;justify-content:center;
        font-size:${explored ? 10 : 9}px;
        box-sizing:border-box;
        border-radius:2px;
      ">${icon}</div>`
    }))

    return `
      <div style="overflow:auto;max-height:130px;margin-bottom:4px">
        <div style="display:grid;grid-template-columns:repeat(${cols},${CELL}px);gap:2px;width:fit-content;margin:0 auto">
          ${cells.join('')}
        </div>
      </div>
    `
  }

  private updateEnemyBars(): void {
    const combat = getActiveCombat()
    if (!combat) return
    combat.enemies.forEach(e => {
      const fill = document.getElementById(`enemy-hp-${e.unitId}`)
      const text = document.getElementById(`enemy-hp-text-${e.unitId}`)
      const card = document.getElementById(`enemy-card-${e.unitId}`)
      if (!fill) return
      const dead = e.currentHP.lte(0)
      if (card) card.style.opacity = dead ? '0.35' : '1'
      const pct = e.maxHP.gt(0) ? clamp(e.currentHP.div(e.maxHP).times(100).toNumber()) : 0
      fill.style.width = `${pct.toFixed(1)}%`
      if (text) text.textContent = `${fmtFull(e.currentHP)}/${fmtFull(e.maxHP)}`
    })
  }

  // ── Slide Panels ───────────────────────────────────────────

  openSlidePanel(type: PanelType): void {
    if (!type) return
    this.activePanel = type
    this.overlay.classList.add('open')

    // Mark active nav tab
    this.bottomNav.querySelectorAll('.nav-tab').forEach(t => {
      t.classList.toggle('active', (t as HTMLElement).dataset.panel === type)
    })

    switch (type) {
      case 'character': this.panelTitle.textContent = '角色資訊'; this.buildCharacterPanel(); break
      case 'inventory': this.panelTitle.textContent = '物品欄';   this.buildInventoryPanel(); break
      case 'quests':    this.panelTitle.textContent = '任務列表'; this.buildQuestsPanel();    break
      case 'prestige':  this.panelTitle.textContent = '重生樹';   this.buildPrestigePanel();  break
      case 'shop':       this.panelTitle.textContent = '商店';     this.buildShopPanel();       break
      case 'forge':      this.panelTitle.textContent = '鐵匠鋪';  this.buildForgePanel();      break
      case 'explore':    this.panelTitle.textContent = '探索區域'; this.buildExplorePanel();    break
      case 'dungeons':   this.panelTitle.textContent = '地城列表'; this.buildDungeonsPanel();   break
      case 'companions': this.panelTitle.textContent = '同伴';    this.buildCompanionsPanel();  break
      case 'settings':   this.panelTitle.textContent = '設定';    this.buildSettingsPanel();    break
      case 'saves':      this.panelTitle.textContent = '存檔管理'; this.buildSavesPanel();      break
    }
  }

  closeSlidePanel(): void {
    this.activePanel = null
    this.overlay.classList.remove('open')
    this.panelBody.innerHTML = ''
    this.bottomNav.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'))
  }

  openShopPanel(shopId: string): void {
    this.activeShopId = shopId
    this.activePanel = 'shop'
    this.panelTitle.textContent = '商店'
    this.panelBody.innerHTML = ''
    this.overlay.classList.add('open')
    this.buildShopPanel()
  }

  // ── Character Panel ────────────────────────────────────────

  private buildCharacterPanel(): void {
    const p = this.getPlayer?.()
    if (!p) { this.panelBody.innerHTML = '<div>載入中...</div>'; return }

    const cs = p.currentStats
    const jobDef = JOB_DEFINITIONS[p.jobId]
    const jobName = jobDef?.name ?? p.jobId
    const jobDesc = jobDef?.description ?? ''
    const jobXpPct = p.jobXpToNext.gt(0) ? clamp(p.jobXp.div(p.jobXpToNext).times(100).toNumber()) : 0

    const availableJobs = Object.values(JOB_DEFINITIONS)
      .filter(j => j.id !== p.jobId)
      .slice(0, 10)
      .map(j => {
        const check = canChangeJob(p, j.id)
        const cls = check.ok ? 'available' : ''
        const info = check.ok ? `Tier ${j.tier} · ${j.description}` : (check.reason ?? '')
        const cmdAttr = check.ok ? `data-cmd="job ${j.id}"` : ''
        return `
          <div class="job-card ${cls}" ${cmdAttr} style="cursor:${check.ok ? 'pointer' : 'default'}">
            <div class="job-card-name">${j.name}</div>
            <div class="job-card-info">${info}</div>
          </div>
        `
      }).join('')

    this.panelBody.innerHTML = `
      <div class="section-title">屬性</div>
      <table class="stat-table">
        <tr><td>HP</td><td>${fmtFull(p.currentHP)} / ${fmtFull(cs.hp)}</td></tr>
        <tr><td>MP</td><td>${fmtFull(p.currentMP)} / ${fmtFull(cs.mp)}</td></tr>
        <tr><td>ATK</td><td>${fmtFull(cs.atk)}</td></tr>
        <tr><td>DEF</td><td>${fmtFull(cs.def)}</td></tr>
        <tr><td>MATK</td><td>${fmtFull(cs.matk)}</td></tr>
        <tr><td>MDEF</td><td>${fmtFull(cs.mdef)}</td></tr>
        <tr><td>SPD</td><td>${fmtFull(cs.spd)}</td></tr>
        <tr><td>LCK</td><td>${fmtFull(cs.lck)}</td></tr>
        <tr><td>CRIT</td><td>${cs.crit.times(100).toFixed(1)}%</td></tr>
        <tr><td>CRITDMG</td><td>${cs.critDmg.times(100).toFixed(0)}%</td></tr>
        <tr><td>DODGE</td><td>${cs.dodge.times(100).toFixed(1)}%</td></tr>
        <tr><td>ACC</td><td>${cs.acc.times(100).toFixed(1)}%</td></tr>
      </table>

      <div class="section-title" style="margin-top:12px">職業</div>
      <div class="job-card current">
        <div class="job-card-name">${jobName}</div>
        <div class="job-card-info">${jobDesc}</div>
        <div class="job-card-info" style="margin-top:4px">
          職業等級 ${p.jobLevel.toFixed(0)} &nbsp;·&nbsp; XP ${fmtFull(p.jobXp)} / ${fmtFull(p.jobXpToNext)}
        </div>
        <div class="job-xp-bar-wrap">
          <div class="job-xp-bar-fill" style="width:${jobXpPct.toFixed(1)}%"></div>
        </div>
      </div>

      <div class="section-title" style="margin-top:12px">轉職</div>
      ${availableJobs || '<div style="color:var(--text-dim);font-size:12px">暫無可用職業</div>'}
    `
  }

  // ── Inventory Panel ────────────────────────────────────────

  private buildInventoryPanel(): void {
    const p = this.getPlayer?.()
    if (!p) { this.panelBody.innerHTML = '<div>載入中...</div>'; return }

    const equippedMap = getEquippedItems(p)
    const equippedIds = new Set<string>()
    equippedMap.forEach(item => equippedIds.add(item.instanceId))

    const equippedChips = Array.from(equippedMap.values())
      .map(item => {
        const rc = RARITY_COLOR[item.rarity] ?? '#888'
        return `<div class="equipped-chip" style="border-color:${rc};color:${rc};cursor:default" data-tooltip-id="${item.instanceId}">${this.slotLabel(item.slot)}: ${item.name}</div>`
      })
      .join('')

    const equippedSection = equippedChips
      ? `<div class="section-title">已裝備</div><div class="equipped-row">${equippedChips}</div>`
      : `<div class="section-title">已裝備</div><div style="color:var(--text-dim);font-size:12px;margin-bottom:8px">無裝備</div>`

    const allItems = getAllItems()
    const playerItemIds = new Set(p.inventory.map(i => i.instanceId))
    const myItems = allItems.filter(i => playerItemIds.has(i.instanceId))

    let itemsHTML: string
    if (myItems.length === 0) {
      itemsHTML = '<div style="color:var(--text-dim);font-size:12px">物品欄空空如也</div>'
    } else {
      itemsHTML = myItems.map(item => {
        const isEquipped = equippedIds.has(item.instanceId)
        const equipBtn = isEquipped
          ? `<button class="item-btn" data-action="unequip" data-slot="${item.slot}">卸下</button>`
          : `<button class="item-btn" data-action="equip" data-id="${item.instanceId}">裝備</button>`
        const rc = RARITY_COLOR[item.rarity] ?? '#888'
        return `
          <div class="item-card" style="border-left:3px solid ${rc};cursor:default" data-tooltip-id="${item.instanceId}">
            <div>
              <div class="item-name" style="color:${rc}">${item.name}</div>
              <div class="item-slot">${this.slotLabel(item.slot)}</div>
            </div>
            <span class="item-rarity-tag rarity-${item.rarity}">${item.rarity}</span>
            ${equipBtn}
            <button class="item-btn" data-action="sell" data-id="${item.instanceId}">販售</button>
          </div>
        `
      }).join('')
    }

    const RARITY_ORDER = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Transcendent']
    const equippedIds2 = new Set<string>()
    equippedMap.forEach(item => equippedIds2.add(item.instanceId))

    const batchSellHTML = `
      <div class="section-title" style="margin-top:8px">批次售出</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
        <button class="item-btn batch-sell-btn" data-rarity-max="Common" style="color:${RARITY_COLOR['Common']}">賣出 Common</button>
        <button class="item-btn batch-sell-btn" data-rarity-max="Uncommon" style="color:${RARITY_COLOR['Uncommon']}">賣出 ≤ Uncommon</button>
        <button class="item-btn batch-sell-btn" data-rarity-max="Rare" style="color:${RARITY_COLOR['Rare']}">賣出 ≤ Rare</button>
      </div>
    `

    this.panelBody.innerHTML = `
      ${equippedSection}
      ${batchSellHTML}
      <div class="section-title">物品欄 (${myItems.length})</div>
      ${itemsHTML}
    `

    // Bind batch sell buttons
    this.panelBody.querySelectorAll<HTMLElement>('.batch-sell-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        const maxRarity = btn.dataset.rarityMax!
        const maxIdx = RARITY_ORDER.indexOf(maxRarity)
        const allItems2 = getAllItems()
        const playerItemIds2 = new Set(p.inventory.map(i => i.instanceId))
        const toSell = allItems2.filter(item =>
          playerItemIds2.has(item.instanceId) &&
          !equippedIds2.has(item.instanceId) &&
          RARITY_ORDER.indexOf(item.rarity) <= maxIdx
        )
        if (toSell.length === 0) {
          import('../core/logger').then(({ log }) => log.info('沒有符合條件的物品可以售出。'))
          return
        }
        toSell.forEach(item => sellItem(p, item.instanceId))
        import('../core/logger').then(({ log }) => log.success(`批次售出了 ${toSell.length} 件物品。`))
        this.buildInventoryPanel()
        setTimeout(() => this.updateStatusBars(), 50)
      })
    })

    // Bind item action buttons
    this.panelBody.querySelectorAll('.item-btn[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        const el = btn as HTMLElement
        const action = el.dataset.action
        if (action === 'equip' && el.dataset.id) {
          equipItem(p, el.dataset.id)
          this.buildInventoryPanel()
        } else if (action === 'unequip' && el.dataset.slot) {
          unequipSlot(p, el.dataset.slot)
          this.buildInventoryPanel()
        } else if (action === 'sell' && el.dataset.id) {
          sellItem(p, el.dataset.id)
          this.buildInventoryPanel()
        }
      })
    })

    // Bind item hover tooltips — inventory items
    this.panelBody.querySelectorAll<HTMLElement>('.item-card[data-tooltip-id]').forEach(card => {
      const itemId = card.dataset.tooltipId!
      const item   = getItem(itemId)
      if (!item) return
      // Find equipped item in same slot for comparison
      const equippedInSlot = this.getEquippedForSlot(p, item)
      card.addEventListener('mouseenter', () => this.showTooltip(item, equippedInSlot, card))
      card.addEventListener('mouseleave', (e) => {
        if (!card.contains(e.relatedTarget as Node)) this.hideTooltip()
      })
    })

    // Bind equipped chip tooltips
    this.panelBody.querySelectorAll<HTMLElement>('.equipped-chip[data-tooltip-id]').forEach(chip => {
      const itemId = chip.dataset.tooltipId!
      const item   = getItem(itemId)
      if (!item) return
      chip.addEventListener('mouseenter', () => this.showTooltip(item, null, chip))
      chip.addEventListener('mouseleave', (e) => {
        if (!chip.contains(e.relatedTarget as Node)) this.hideTooltip()
      })
    })
  }

  private slotLabel(slot: string): string {
    const labels: Record<string, string> = {
      weapon: '武器', offhand: '副手', head: '頭部', body: '身體',
      legs: '腿部', feet: '腳部', ring: '戒指', ring1: '戒指1', ring2: '戒指2', amulet: '項鍊'
    }
    return labels[slot] ?? slot
  }

  // ── Item Tooltip ───────────────────────────────────────────

  /** 取得同部位已裝備品（用於比較） */
  private getEquippedForSlot(p: PlayerState, item: import('../types').Equipment): import('../types').Equipment | null {
    const es = p.equipmentState as Record<string, string | undefined>
    let equippedId: string | undefined
    if (item.slot === 'ring') {
      // 戒指：若兩格都滿，比較 ring2（新戒指會替換 ring2）
      equippedId = es.ring1 && es.ring2 ? es.ring2 : undefined
    } else {
      equippedId = es[item.slot]
    }
    return equippedId ? (getItem(equippedId) ?? null) : null
  }

  /** 計算裝備的每個 stat 總值（baseStats + enchantments flatBonus） */
  private itemEffectiveStats(item: import('../types').Equipment): Partial<Record<string, import('decimal.js').default>> {
    const total: Record<string, import('decimal.js').default> = {}
    for (const [k, v] of Object.entries(item.baseStats)) {
      if (v) total[k] = v
    }
    for (const enc of item.enchantments) {
      total[enc.stat] = total[enc.stat] ? total[enc.stat].plus(enc.flatBonus) : enc.flatBonus
    }
    return total
  }

  private showTooltip(
    item: import('../types').Equipment,
    compared: import('../types').Equipment | null,
    anchor: HTMLElement
  ): void {
    this.tooltipEl.innerHTML = this.buildTooltipHTML(item, compared)
    this.tooltipEl.style.display = 'block'

    const rect = anchor.getBoundingClientRect()
    const TW = 228
    const TH = this.tooltipEl.scrollHeight || 320

    // 水平：置中對齊 anchor，夾在 viewport 內
    let left = rect.left + (rect.width - TW) / 2
    if (left + TW > window.innerWidth - 8) left = window.innerWidth - TW - 8
    if (left < 8) left = 8

    // 垂直：優先顯示在 anchor 正上方；若上方空間不足則顯示在下方
    let top = rect.top - TH - 8
    if (top < 8) top = rect.bottom + 8
    // 若下方也超出螢幕，強制貼頂
    if (top + TH > window.innerHeight - 8) top = 8

    this.tooltipEl.style.left = `${left}px`
    this.tooltipEl.style.top  = `${top}px`
  }

  private hideTooltip(): void {
    this.tooltipEl.style.display = 'none'
  }

  private buildTooltipHTML(
    item: import('../types').Equipment,
    compared: import('../types').Equipment | null
  ): string {
    const rc = RARITY_COLOR[item.rarity] ?? '#888'
    const myStats  = this.itemEffectiveStats(item)
    const cmpStats = compared ? this.itemEffectiveStats(compared) : null

    const PCT_STATS = new Set(['crit', 'critDmg', 'dodge', 'acc'])
    const STAT_LABELS: Record<string, string> = {
      hp: 'HP', mp: 'MP', atk: 'ATK', def: 'DEF',
      matk: 'MATK', mdef: 'MDEF', spd: 'SPD', lck: 'LCK',
      crit: 'CRIT', critDmg: 'CRITDMG', dodge: 'DODGE', acc: 'ACC',
    }
    const STAT_ORDER = ['hp','mp','atk','def','matk','mdef','spd','lck','crit','critDmg','dodge','acc']

    // All stat keys present in either item
    const allKeys = STAT_ORDER.filter(k =>
      (myStats[k] && !myStats[k].isZero()) ||
      (cmpStats && cmpStats[k] && !cmpStats[k].isZero())
    )

    const statRows = allKeys.map(k => {
      const v   = myStats[k]
      const cv  = cmpStats?.[k]
      const isPct = PCT_STATS.has(k)

      const fmtVal = (d: import('decimal.js').default | undefined) =>
        d ? (isPct ? `${d.times(100).toFixed(1)}%` : fmtFull(d)) : '—'

      let deltaHTML = ''
      if (cmpStats !== null) {
        const myNum  = (v  ?? D(0)).toNumber()
        const cmpNum = (cv ?? D(0)).toNumber()
        const diff   = myNum - cmpNum
        if (Math.abs(diff) > 0.0001) {
          const sign = diff > 0 ? '+' : ''
          const cls  = diff > 0 ? 'tt-up' : 'tt-down'
          const dStr = isPct ? `${sign}${(diff * 100).toFixed(1)}%` : `${sign}${Math.round(diff)}`
          deltaHTML = `<span class="${cls}">${dStr}</span>`
        }
      }

      return `
        <div class="tt-stat-row">
          <span class="tt-stat-label">${STAT_LABELS[k] ?? k}</span>
          <span class="tt-stat-val">${fmtVal(v)}${deltaHTML}</span>
        </div>`
    }).join('')

    const enchHTML = item.enchantments.length
      ? item.enchantments.map(e =>
          `<div class="tt-enchant">✦ ${e.name} +${fmtFull(e.flatBonus)}</div>`
        ).join('')
      : ''

    const compareHeader = compared
      ? `<hr class="tt-divider"><div class="tt-compare-header">比較：${compared.name}</div>`
      : ''

    return `
      <div class="tt-name" style="color:${rc}">${item.name}</div>
      <div class="tt-meta">${this.slotLabel(item.slot)} · Lv.${item.level} · ${item.rarity}</div>
      <hr class="tt-divider">
      ${compareHeader}
      ${statRows || '<div style="color:var(--text-dim);font-size:11px">無屬性加成</div>'}
      ${enchHTML ? `<hr class="tt-divider">${enchHTML}` : ''}
      <hr class="tt-divider">
      <div class="tt-sell">💰 售價 ${fmtFull(item.sellPrice)}</div>
    `
  }

  // ── Quests Panel ───────────────────────────────────────────

  private buildQuestsPanel(): void {
    const p = this.getPlayer?.()
    if (!p) { this.panelBody.innerHTML = '<div>載入中...</div>'; return }

    const activeQuests = (p.quests ?? []).filter(q => !q.isComplete)
    const completedCount = p.completedQuestIds?.length ?? 0

    let activeHTML: string
    if (activeQuests.length === 0) {
      activeHTML = '<div style="color:var(--text-dim);font-size:12px">目前沒有進行中的任務</div>'
    } else {
      activeHTML = activeQuests.map(qp => {
        const def = QUEST_DEFINITIONS[qp.questId]
        if (!def) return ''
        const objectivesHTML = def.objectives.map((obj, i) => {
          const progress = qp.objectiveProgress[i] ?? 0
          const pct = obj.required > 0 ? clamp((progress / obj.required) * 100) : 0
          const desc = `${obj.description.replace(/\d+\/\d+$/, '')}${progress}/${obj.required}`
          return `
            <div class="quest-obj">${desc}</div>
            <div class="quest-progress">
              <div class="quest-progress-fill" style="width:${pct.toFixed(1)}%"></div>
            </div>
          `
        }).join('')
        return `
          <div class="quest-card">
            <div class="quest-title">${def.title}</div>
            ${objectivesHTML}
          </div>
        `
      }).join('')
    }

    this.panelBody.innerHTML = `
      <div class="section-title">進行中任務 (${activeQuests.length})</div>
      ${activeHTML}
      <div class="section-title" style="margin-top:12px">已完成</div>
      <div style="color:var(--text-dim);font-size:12px">共完成 ${completedCount} 個任務</div>
    `
  }

  // ── Prestige Panel ─────────────────────────────────────────

  private buildPrestigePanel(): void {
    const p = this.getPlayer?.()
    if (!p) { this.panelBody.innerHTML = '<div>載入中...</div>'; return }

    const rebirthCheck = canRebirth(p)
    const soulTotal = p.prestige?.totalSoulFragments ?? p.soulFragments
    const soulSpent = p.prestige?.spentSoulFragments
    const soulAvail = soulTotal && soulSpent ? soulTotal.minus(soulSpent) : soulTotal

    const nodesHTML = Object.values(PRESTIGE_NODES).map(node => {
      const ownedLevel = p.prestige?.bonusLevels?.[node.id] ?? 0
      const isCapped = ownedLevel >= node.maxLevel
      const nextCost = node.costPerLevel.times(ownedLevel + 1)
      const canAfford = soulAvail ? soulAvail.gte(nextCost) : false
      const canBuy = !isCapped && canAfford

      return `
        <div class="prestige-node ${ownedLevel > 0 ? 'owned' : ''}">
          <div class="prestige-node-info">
            <div class="prestige-node-name">${node.name}${ownedLevel > 0 ? ` Lv.${ownedLevel}` : ''}</div>
            <div class="prestige-node-desc">${node.description}</div>
            <div class="prestige-node-cost">
              ${isCapped ? '(已達上限)' : `費用: ${fmtFull(nextCost)} 靈魂碎片`}
            </div>
          </div>
          <button class="prestige-buy-btn" data-node-id="${node.id}" ${canBuy ? '' : 'disabled'}>購買</button>
        </div>
      `
    }).join('')

    this.panelBody.innerHTML = `
      <div style="color:var(--text-dim);font-size:12px;margin-bottom:8px">
        重生次數：<span style="color:var(--purple)">${p.rebirthCount}</span>
        &nbsp;&nbsp;
        靈魂碎片：<span style="color:var(--gold)">${fmtFull(soulAvail ?? p.soulFragments)}</span>
      </div>
      <button class="rebirth-big-btn" ${rebirthCheck.ok ? 'data-cmd="rebirth confirm"' : 'disabled'}>
        ✨ 重生${rebirthCheck.ok ? '' : ` (${rebirthCheck.reason ?? ''})`}
      </button>
      <div class="section-title">重生樹</div>
      ${nodesHTML || '<div style="color:var(--text-dim);font-size:12px">尚未解鎖任何節點</div>'}
    `

    // Bind prestige node buy buttons
    this.panelBody.querySelectorAll('.prestige-buy-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        const nodeId = (btn as HTMLElement).dataset.nodeId!
        this.cmdFn(`prestige buy ${nodeId}`)
        setTimeout(() => this.buildPrestigePanel(), 100)
      })
    })
  }

  // ── Shop Panel ─────────────────────────────────────────────

  private buildShopPanel(): void {
    const p = this.getPlayer?.()
    if (!p) { this.panelBody.innerHTML = '<div>載入中...</div>'; return }

    const shopId = this.activeShopId ?? Object.keys(SHOPS)[0]
    const shop = shopId ? SHOPS[shopId] : undefined
    if (!shop) { this.panelBody.innerHTML = '<div style="color:var(--text-dim)">商店不可用</div>'; return }

    const itemRows = shop.inventory.map((shopItem, idx) => {
      const tmpl = EQUIPMENT_TEMPLATES.find(t => t.id === shopItem.templateId)
      const displayName = tmpl?.name ?? shopItem.templateId
      const slotLbl = tmpl ? this.slotLabel(tmpl.slot) : ''
      const desc = tmpl?.description ?? ''
      const canAfford = p.gold.gte(shopItem.price)
      // Build rarity range display from template's allowedRarities
      const rarityTags = tmpl?.allowedRarities
        ? tmpl.allowedRarities.map(r => `<span style="color:${RARITY_COLOR[r] ?? '#888'};font-size:10px;margin-right:3px">${r}</span>`).join('')
        : ''
      return `
        <div class="item-card">
          <div style="flex:1">
            <div class="item-name">${displayName}</div>
            <div class="item-slot">${slotLbl}</div>
            <div style="margin-top:2px">${rarityTags}</div>
            <div style="color:var(--text-dim);font-size:11px;margin-top:2px">${desc}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="color:var(--gold);font-size:12px;margin-bottom:4px">💰${fmt(shopItem.price)}</div>
            <button class="item-btn shop-buy-btn${canAfford ? '' : ' disabled'}"
              data-shop-idx="${idx}"
              ${canAfford ? '' : 'disabled'}>購買</button>
          </div>
        </div>
      `
    }).join('')

    // Second shop button (if town has multiple shops)
    const town = TOWNS[p.location.id]
    const otherShopBtns = (town?.shopIds ?? [])
      .filter(id => id !== shopId)
      .map(id => `<button class="item-btn" data-open-shop="${id}" style="margin-bottom:8px">切換：${SHOPS[id]?.name ?? id}</button>`)
      .join('')

    this.panelBody.innerHTML = `
      <div style="color:var(--gold);font-size:13px;margin-bottom:8px">💰 你的金幣：${fmt(p.gold)}</div>
      ${otherShopBtns}
      <div class="section-title">${shop.name}</div>
      <div style="color:var(--text-dim);font-size:11px;margin-bottom:8px">${shop.description}</div>
      ${itemRows || '<div style="color:var(--text-dim)">暫無商品</div>'}
    `

    this.panelBody.querySelectorAll('.shop-buy-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        const el = btn as HTMLElement
        const idx = parseInt(el.dataset.shopIdx!)
        this.handleShopBuy(p, shopId, idx)
      })
    })
  }

  private handleShopBuy(p: PlayerState, shopId: string, idx: number): void {
    const shop = SHOPS[shopId]
    if (!shop || idx >= shop.inventory.length) return
    const shopItem = shop.inventory[idx]
    if (p.gold.lt(shopItem.price)) {
      import('../core/logger').then(({ log }) => log.warning('金幣不足！'))
      return
    }
    import('../systems/player/PlayerSystem').then(({ spendGold }) => {
      import('../systems/equipment/ItemGenerator').then(({ generateItem }) => {
        import('../systems/equipment/EquipmentSystem').then(({ addItemToInventory }) => {
          spendGold(p, shopItem.price)
          const tmpl = EQUIPMENT_TEMPLATES.find(t => t.id === shopItem.templateId)
          const item = generateItem({
            level: Math.max(1, p.level.toNumber()),
            rebirthTier: p.rebirthCount,
            lck: p.currentStats.lck.toNumber(),
            slotHint: tmpl?.slot,
          })
          addItemToInventory(p, item)
          import('../core/logger').then(({ log }) => log.success(`購買了「${item.name}」！`))
          this.buildShopPanel()
          setTimeout(() => this.updateStatusBars(), 50)
        })
      })
    })
  }

  // ── Forge Panel ────────────────────────────────────────────

  private buildForgePanel(): void {
    const p = this.getPlayer?.()
    if (!p) { this.panelBody.innerHTML = '<div>載入中...</div>'; return }

    const equippedMap = getEquippedItems(p)

    let targetSectionHTML: string
    if (equippedMap.size === 0) {
      targetSectionHTML = '<div style="color:var(--text-dim);font-size:12px">請先裝備物品才能強化</div>'
    } else {
      const chips = Array.from(equippedMap.values()).map(item => {
        const isSel = this.forgeTargetItemId === item.instanceId
        return `
          <button class="item-btn${isSel ? ' primary' : ''}"
            style="margin:2px;font-size:11px"
            data-forge-target="${item.instanceId}">
            ${this.slotLabel(item.slot)}: ${item.name}
          </button>
        `
      }).join('')
      targetSectionHTML = `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">${chips}</div>`
    }

    let enchantHTML = ''
    if (this.forgeTargetItemId) {
      const targetItem = equippedMap.get(this.forgeTargetItemId) ?? getItem(this.forgeTargetItemId)
      if (targetItem) {
        const existingCount = targetItem.enchantments.length
        const forgeOptions = [
          { id: 'atk_up',  label: '+ATK 強化', stat: 'atk',  cost: 200, bonus: 10 },
          { id: 'def_up',  label: '+DEF 強化', stat: 'def',  cost: 150, bonus: 8  },
          { id: 'hp_up',   label: '+HP 強化',  stat: 'hp',   cost: 100, bonus: 30 },
          { id: 'matk_up', label: '+MATK 強化',stat: 'matk', cost: 180, bonus: 10 },
          { id: 'spd_up',  label: '+SPD 強化', stat: 'spd',  cost: 120, bonus: 5  },
          { id: 'lck_up',  label: '+LCK 強化', stat: 'lck',  cost: 80,  bonus: 5  },
        ] as const
        enchantHTML = forgeOptions.map(opt => {
          const scaledCost = D(opt.cost).times(1 + existingCount * 0.5).ceil()
          const canAfford = p.gold.gte(scaledCost)
          const existing = targetItem.enchantments.find(e => e.id === opt.id)
          const curStr = existing ? `（目前：+${fmtFull(existing.flatBonus)}）` : ''
          return `
            <div class="item-card">
              <div style="flex:1">
                <div class="item-name">${opt.label}${curStr}</div>
                <div style="color:var(--gold);font-size:12px">費用：💰${fmt(scaledCost)}</div>
              </div>
              <button class="item-btn forge-btn${canAfford ? '' : ' disabled'}"
                data-forge-opt="${opt.id}"
                data-forge-cost="${scaledCost}"
                data-forge-stat="${opt.stat}"
                data-forge-bonus="${opt.bonus}"
                ${canAfford ? '' : 'disabled'}>強化</button>
            </div>
          `
        }).join('')
      }
    }

    this.panelBody.innerHTML = `
      <div style="color:var(--gold);font-size:13px;margin-bottom:8px">💰 你的金幣：${fmt(p.gold)}</div>
      <div class="section-title">選擇強化目標</div>
      ${targetSectionHTML}
      ${this.forgeTargetItemId ? `<div class="section-title" style="margin-top:8px">強化選項</div>${enchantHTML}` : ''}
    `

    this.panelBody.querySelectorAll('[data-forge-target]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.forgeTargetItemId = (btn as HTMLElement).dataset.forgeTarget
        this.buildForgePanel()
      })
    })

    this.panelBody.querySelectorAll('.forge-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        const el = btn as HTMLElement
        const p2 = this.getPlayer?.()
        if (!p2) return
        this.handleForgeEnchant(p2, {
          optId: el.dataset.forgeOpt!,
          cost: D(el.dataset.forgeCost!),
          stat: el.dataset.forgeStat!,
          bonus: parseInt(el.dataset.forgeBonus!),
        })
      })
    })
  }

  private handleForgeEnchant(p: PlayerState, opts: { optId: string; cost: ReturnType<typeof D>; stat: string; bonus: number }): void {
    if (!this.forgeTargetItemId) return
    const item = getItem(this.forgeTargetItemId)
    if (!item) { import('../core/logger').then(({ log }) => log.warning('找不到目標裝備')); return }

    import('../systems/player/PlayerSystem').then(({ spendGold }) => {
      if (!spendGold(p, opts.cost)) {
        import('../core/logger').then(({ log }) => log.warning('金幣不足！'))
        return
      }
      const existing = item.enchantments.find(e => e.id === opts.optId)
      if (existing) {
        existing.flatBonus = existing.flatBonus.plus(opts.bonus)
      } else {
        item.enchantments.push({
          id: opts.optId,
          name: `${opts.stat.toUpperCase()}強化`,
          stat: opts.stat as keyof PlayerState['baseStats'],
          flatBonus: D(opts.bonus),
          percentBonus: 0,
        })
      }
      if (p.itemData) p.itemData[item.instanceId] = item
      recalcStats(p, getEquippedItems(p))
      import('../core/logger').then(({ log }) => log.success(`強化成功！「${item.name}」${opts.stat.toUpperCase()} +${opts.bonus}`))
      this.buildForgePanel()
      setTimeout(() => this.updateStatusBars(), 50)
    })
  }

  // ── Explore Panel ──────────────────────────────────────────

  private buildExplorePanel(): void {
    const p = this.getPlayer?.()
    if (!p) { this.panelBody.innerHTML = '<div>載入中...</div>'; return }

    const zoneCards = Object.values(ZONES).map(zone => {
      const unlocked = p.level.gte(zone.unlockLevel)
      const lockNote = unlocked ? '' : `<div style="color:#f66;font-size:11px">🔒 需要 Lv.${zone.unlockLevel}</div>`
      const areaBtns = zone.areas.map(area => `
        <button class="act-btn explore-area-btn" style="font-size:11px;padding:4px 8px"
          data-zone="${zone.id}" data-area="${area.id}"
          ${unlocked ? '' : 'disabled'}>
          📍 ${area.name}
        </button>
      `).join('')
      return `
        <div class="quest-card" style="margin-bottom:8px;opacity:${unlocked ? '1' : '0.5'}">
          <div class="quest-title">Tier ${zone.tier} · ${zone.name} <span style="font-size:10px;color:var(--text-dim)">Lv.${zone.unlockLevel}+</span></div>
          <div style="color:var(--text-dim);font-size:11px;margin-bottom:4px">${zone.description}</div>
          ${lockNote}
          <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">${areaBtns}</div>
        </div>
      `
    }).join('')

    this.panelBody.innerHTML = `
      <div class="section-title">選擇探索區域</div>
      ${zoneCards || '<div style="color:var(--text-dim)">暫無區域</div>'}
    `

    this.panelBody.querySelectorAll('.explore-area-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const el = btn as HTMLElement
        const zoneId = el.dataset.zone!
        const areaId = el.dataset.area!
        this.closeSlidePanel()
        this.cmdFn(`explore ${zoneId} ${areaId}`)
      })
    })
  }

  // ── Dungeons Panel ─────────────────────────────────────────

  private buildDungeonsPanel(): void {
    const p = this.getPlayer?.()
    if (!p) { this.panelBody.innerHTML = '<div>載入中...</div>'; return }

    const dungeonCards = Object.values(DUNGEON_TEMPLATES).map(d => {
      const canEnter = p.level.gte(d.minLevel)
      const btnText = canEnter ? '進入地城' : `需要 Lv.${d.minLevel}`
      return `
        <div class="quest-card" style="margin-bottom:8px">
          <div class="quest-title">Tier ${d.tier} · ${d.name}</div>
          <div style="color:var(--text-dim);font-size:11px;margin:4px 0">${d.description}</div>
          <div style="color:var(--text-dim);font-size:11px;margin-bottom:6px">最低等級：${d.minLevel} · 最大樓層：${d.maxFloors}</div>
          <button class="act-btn${canEnter ? ' primary' : ''}"
            style="font-size:12px;padding:4px 12px"
            data-dungeon="${d.id}"
            ${canEnter ? '' : 'disabled'}>${btnText}</button>
        </div>
      `
    }).join('')

    this.panelBody.innerHTML = `
      <div class="section-title">地城列表</div>
      ${dungeonCards || '<div style="color:var(--text-dim)">暫無地城</div>'}
    `

    this.panelBody.querySelectorAll('[data-dungeon]:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => {
        const dungeonId = (btn as HTMLElement).dataset.dungeon!
        this.closeSlidePanel()
        this.cmdFn(`dungeon ${dungeonId}`)
      })
    })
  }

  // ── Companions Panel ───────────────────────────────────────

  private buildCompanionsPanel(): void {
    const p = this.getPlayer?.()
    if (!p) { this.panelBody.innerHTML = '<div>載入中...</div>'; return }

    const companions = getActiveCompanions(p)
    const slots = `${companions.length} / ${MAX_COMPANIONS}`

    let companionHTML: string
    if (companions.length === 0) {
      companionHTML = '<div style="color:var(--text-dim);font-size:12px">目前沒有同伴。在冒險或戰鬥中使用「馴服」來招募怪物！</div>'
    } else {
      companionHTML = companions.map(c => {
        const hpPct = c.currentStats.hp.gt(0) ? clamp(c.currentHP.div(c.currentStats.hp).times(100).toNumber()) : 0
        return `
          <div class="quest-card" style="margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div>
                <div class="item-name">${c.name}</div>
                <div style="color:var(--text-dim);font-size:11px">Lv.${c.level.toFixed(0)} · ${c.type} · 好感度 ${c.affinity}</div>
              </div>
              <button class="item-btn" style="color:var(--danger)" data-dismiss="${c.instanceId}">解散</button>
            </div>
            <div style="margin-top:6px">
              <div style="font-size:11px;color:var(--text-dim);margin-bottom:2px">HP ${fmtFull(c.currentHP)}/${fmtFull(c.currentStats.hp)}</div>
              <div class="enemy-hp-bar"><div class="enemy-hp-fill" style="width:${hpPct.toFixed(1)}%"></div></div>
            </div>
          </div>
        `
      }).join('')
    }

    this.panelBody.innerHTML = `
      <div style="color:var(--text-dim);font-size:12px;margin-bottom:8px">同伴欄位：${slots}</div>
      ${companionHTML}
    `

    this.panelBody.querySelectorAll('[data-dismiss]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.dismiss!
        const p2 = this.getPlayer?.()
        if (p2) { dismissCompanion(p2, id); this.buildCompanionsPanel() }
      })
    })
  }

  // ── Settings Panel ─────────────────────────────────────────

  private buildSettingsPanel(): void {
    const p = this.getPlayer?.()
    if (!p) { this.panelBody.innerHTML = '<div>載入中...</div>'; return }

    const themes = [
      { id: 'dark',   label: '🌑 暗黑' },
      { id: 'light',  label: '☀ 明亮' },
      { id: 'solarized', label: '🌊 Solarized' },
    ]
    const curTheme = document.documentElement.dataset.theme ?? 'dark'
    const themeHTML = themes.map(t => `
      <button class="act-btn${t.id === curTheme ? ' primary' : ''}"
        data-theme-set="${t.id}" style="min-width:80px">${t.label}</button>
    `).join('')

    this.panelBody.innerHTML = `
      <div class="section-title">主題</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">${themeHTML}</div>
      <div class="section-title">遊戲資訊</div>
      <table class="stat-table">
        <tr><td>角色</td><td>${p.name}</td></tr>
        <tr><td>等級</td><td>${p.level.toFixed(0)}</td></tr>
        <tr><td>重生次數</td><td>${p.rebirthCount}</td></tr>
        <tr><td>總遊玩時間</td><td>${Math.floor(p.playtimeStats.playTime / 60)} 分鐘</td></tr>
        <tr><td>總擊殺</td><td>${fmtFull(p.playtimeStats.totalKills)}</td></tr>
        <tr><td>總獲得XP</td><td>${fmtFull(p.playtimeStats.totalXpGained)}</td></tr>
        <tr><td>總獲得金幣</td><td>${fmtFull(p.playtimeStats.totalGoldGained)}</td></tr>
        <tr><td>死亡次數</td><td>${p.playtimeStats.totalDeaths}</td></tr>
      </table>
    `

    this.panelBody.querySelectorAll('[data-theme-set]').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = (btn as HTMLElement).dataset.themeSet!
        document.documentElement.dataset.theme = t
        this.buildSettingsPanel()
      })
    })
  }

  // ── Saves Panel ────────────────────────────────────────────

  private buildSavesPanel(): void {
    const p = this.getPlayer?.()
    if (!p) { this.panelBody.innerHTML = '<div>載入中...</div>'; return }

    const saves = listSaves()
    const saveRows = saves.map(slot => `
      <div class="item-card">
        <div style="flex:1">
          <div class="item-name">${slot}</div>
          <div style="color:var(--text-dim);font-size:11px">${slot === 'Auto Save' ? '自動存檔' : '手動存檔'}</div>
        </div>
        ${this.loadCallback ? `<button class="item-btn" data-load-slot="${slot}">讀取</button>` : ''}
        ${slot !== 'Auto Save' ? `<button class="item-btn" style="color:var(--danger)" data-delete-slot="${slot}">刪除</button>` : ''}
      </div>
    `).join('')

    this.panelBody.innerHTML = `
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <button class="act-btn primary" id="save-manual-btn">💾 手動存檔</button>
      </div>
      <div class="section-title">存檔列表 (${saves.length})</div>
      ${saveRows || '<div style="color:var(--text-dim);font-size:12px">沒有存檔</div>'}
    `

    document.getElementById('save-manual-btn')?.addEventListener('click', () => {
      const slotName = `Save ${new Date().toLocaleString('zh-TW', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' })}`
      saveGame(p, slotName).then(() => {
        import('../core/logger').then(({ log }) => log.success(`已儲存至「${slotName}」`))
        this.buildSavesPanel()
      })
    })

    this.panelBody.querySelectorAll('[data-load-slot]').forEach(btn => {
      btn.addEventListener('click', () => {
        const slot = (btn as HTMLElement).dataset.loadSlot!
        if (this.loadCallback) {
          this.closeSlidePanel()
          this.loadCallback(slot)
        }
      })
    })

    this.panelBody.querySelectorAll('[data-delete-slot]').forEach(btn => {
      btn.addEventListener('click', () => {
        const slot = (btn as HTMLElement).dataset.deleteSlot!
        deleteSave(slot)
        this.buildSavesPanel()
      })
    })
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, v))
}

const RARITY_COLOR: Record<string, string> = {
  Common:       '#888888',
  Uncommon:     '#1eff00',
  Rare:         '#0088ff',
  Epic:         '#aa33ff',
  Legendary:    '#ff8800',
  Mythic:       '#ffdd66',
  Transcendent: '#ff66aa',
}
