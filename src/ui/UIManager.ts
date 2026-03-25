import { bus } from '../core/eventbus'
import { fmt, fmtFull } from '../core/bignum'
import Decimal from 'decimal.js'
import { getActiveCombat } from '../systems/combat/CombatSystem'
import { getActiveDungeon, DUNGEON_TEMPLATES } from '../systems/dungeon/DungeonSystem'
import { TOWNS, NPCS, SHOPS } from '../systems/town/TownData'
import { JOB_DEFINITIONS } from '../systems/job/JobData'
import { canChangeJob } from '../systems/job/JobSystem'
import { canRebirth } from '../systems/prestige/PrestigeSystem'
import { PRESTIGE_NODES } from '../systems/prestige/PrestigeData'
import { QUEST_DEFINITIONS } from '../systems/npc/QuestSystem'
import { getAllItems, getEquippedItems, equipItem, unequipSlot, sellItem, addItemToInventory } from '../systems/equipment/EquipmentSystem'
import { EQUIPMENT_TEMPLATES } from '../systems/equipment/EquipmentData'
import { generateItem } from '../systems/equipment/ItemGenerator'
import { RANDOM_EVENTS, ZONES } from '../systems/adventure/AdventureSystem'
import type { PlayerState } from '../types'

type UIMode = 'default' | 'combat' | 'dungeon' | 'town' | 'event_choice' | 'dialogue'
type PanelType = 'character' | 'inventory' | 'quests' | 'prestige' | 'shop' | 'dungeons' | 'zones' | null

export class UIManager {
  private guiStatus!: HTMLElement
  private contextPanel!: HTMLElement
  private bottomNav!: HTMLElement
  private overlay!: HTMLElement
  private panelTitle!: HTMLElement
  private panelBody!: HTMLElement

  private getPlayer!: () => PlayerState
  private cmdFn!: (s: string) => void
  private currentMode: UIMode = 'default'
  private activePanel: PanelType = null

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
      <div class="gui-stat-row" id="hp-row">
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
      <button class="nav-tab" data-panel="none" data-cmd="explore">
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
      if (panel === 'none') {
        // data-cmd="explore" is handled by the global delegation below
        return
      }
      if (panel) {
        this.openSlidePanel(panel as PanelType)
      }
    })

    // Global delegation for data-cmd and data-open-panel buttons
    document.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('[data-cmd],[data-open-panel]') as HTMLElement | null
      if (!btn) return

      // data-open-panel: open a slide panel by name
      if ((btn as HTMLElement).hasAttribute('data-open-panel')) {
        const panelName = (btn as HTMLElement).dataset.openPanel
        if (panelName) this.openSlidePanel(panelName as PanelType)
        return
      }

      const cmd = (btn as HTMLElement).dataset.cmd
      if (cmd && cmd.trim() !== '') {
        // Close slide panel when command is triggered from inside it
        if (btn.closest('#slide-panel')) this.closeSlidePanel()
        this.cmdFn(cmd)
        setTimeout(() => this.refresh(), 100)
      }
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

    bus.on('combat:damage', ({ targetId, amount, isCrit }: { targetId: string; amount: string; isCrit: boolean }) => {
      const text = fmt(new Decimal(amount))
      const cls = isCrit ? 'crit' : 'dmg'
      if (targetId === 'player') {
        const row = document.getElementById('hp-row')
        if (row) this.spawnFloat(row, `-${text}`, cls)
      } else {
        const card = document.getElementById(`ecard-${targetId}`)
        if (card) this.spawnFloat(card, `-${text}`, cls)
      }
    })

    bus.on('player:heal', ({ amount }: { amount: string }) => {
      const row = document.getElementById('hp-row')
      if (!row) return
      const text = amount === 'full' ? '完全恢復' : `+${fmt(new Decimal(amount))}`
      this.spawnFloat(row, text, 'heal')
    })
  }

  private spawnFloat(parent: Element, text: string, cls: 'dmg' | 'crit' | 'heal'): void {
    const el = document.createElement('div')
    el.className = `float-num float-${cls}`
    el.textContent = text
    el.style.left = `${20 + Math.random() * 60}%`
    parent.appendChild(el)
    setTimeout(() => el.remove(), 1200)
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
    }

    if (newMode !== this.currentMode) {
      this.currentMode = newMode
      this.renderContextPanel(newMode)
    } else if (newMode === 'combat') {
      this.updateEnemyBars()
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

    if (hpText) hpText.textContent = `${fmt(p.currentHP)}/${fmt(maxHP)}`
    if (mpText) mpText.textContent = `${fmt(p.currentMP)}/${fmt(maxMP)}`
    if (lvText) {
      const rb = p.rebirthCount > 0 ? ` ✦${p.rebirthCount}` : ''
      lvText.textContent = `Lv.${p.level.toFixed(0)}${rb}`
    }
    if (goldText) goldText.textContent = `💰${fmt(p.gold)}`
    if (rebirthText) rebirthText.textContent = p.rebirthCount > 0 ? `✦ 第${p.rebirthCount}輪迴` : ''
    if (locationText) locationText.textContent = this.locationLabel(p)
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
      case 'combat':  this.buildCombatPanel();  break
      case 'dungeon': this.buildDungeonPanel(); break
      case 'town':    this.buildTownPanel();    break
      default:        this.buildDefaultPanel(); break
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

    const optionBtns = node.options.map((opt, i) => `
      <button class="choice-btn" data-dia="${i}">${i + 1}. ${opt.text}</button>
    `).join('')

    this.contextPanel.innerHTML = `
      <div class="dialogue-panel">
        <div class="npc-name-title">【${npc.name}（${npc.title}）】</div>
        <div class="npc-dialogue-text">「${node.text}」</div>
        <div class="choice-options">${optionBtns}</div>
      </div>
    `

    this.contextPanel.querySelectorAll('.choice-btn[data-dia]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.dia!)
        this.handleDialogueOption(p, npc.dialogueTree, nodeId, idx)
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
        case 'open_shop':      this.cmdFn('shop');   break
        case 'show_quests':    this.cmdFn('quests'); break
        case 'show_guild_contracts':
        case 'show_guild_rank': this.cmdFn('quests'); break
        case 'open_enchant':   this.cmdFn('codex');  break
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
    const p = this.getPlayer?.()
    const hasAutoExplore = p?.flags['unlock_auto_explore']
    const autoExploreOn = hasAutoExplore && p?.flags['auto_explore'] !== false
    const currentZone = p?.flags['current_zone'] as string | undefined

    const autoExploreBtn = hasAutoExplore
      ? `<button class="act-btn ${autoExploreOn ? 'active-auto' : ''}" data-cmd="${autoExploreOn ? 'auto_explore off' : 'auto_explore on'}">
           ${autoExploreOn ? '⚡ 自動探索中' : '▶ 啟用自動探索'}
           ${autoExploreOn && currentZone ? `<br><small>${currentZone}</small>` : ''}
         </button>`
      : ''

    this.contextPanel.innerHTML = `
      <div class="action-grid cols-3">
        <button class="act-btn primary" data-open-panel="zones">🗺 探索</button>
        <button class="act-btn" data-cmd="town">🏙 城鎮</button>
        <button class="act-btn" data-open-panel="dungeons">⚔ 地城</button>
        <button class="act-btn" data-open-panel="character">👤 角色</button>
        <button class="act-btn" data-open-panel="prestige">✨ 重生樹</button>
        <button class="act-btn" data-cmd="save">💾 存檔</button>
        ${autoExploreBtn}
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

    this.contextPanel.innerHTML = `
      <div class="town-header">
        <div class="town-name">🏙 ${townName}</div>
        ${townDesc ? `<div class="town-desc">${townDesc}</div>` : ''}
      </div>
      <div class="action-grid cols-3">
        <button class="act-btn primary" data-open-panel="zones">🗺 探索</button>
        <button class="act-btn" data-open-panel="shop">🛒 商店</button>
        <button class="act-btn" data-cmd="inn">🏨 旅館</button>
        ${npcBtns}
        <button class="act-btn" data-open-panel="dungeons">⚔ 地城</button>
        <button class="act-btn" data-open-panel="quests">📋 任務</button>
      </div>
    `
  }

  private buildCombatPanel(): void {
    const combat = getActiveCombat()
    const p = this.getPlayer?.()
    let enemyCardsHTML = ''

    if (combat) {
      const alive = combat.enemies.filter(e => e.currentHP.gt(0))
      enemyCardsHTML = alive.map((e, i) => {
        const pct = e.maxHP.gt(0) ? clamp(e.currentHP.div(e.maxHP).times(100).toNumber()) : 0
        return `
          <div class="enemy-card" id="ecard-${e.unitId}">
            <div class="enemy-name">${e.name}</div>
            <div class="enemy-hp-bar">
              <div class="enemy-hp-fill" id="enemy-hp-${i}" style="width:${pct.toFixed(1)}%"></div>
            </div>
            <div class="enemy-hp-text">${fmt(e.currentHP)}/${fmt(e.maxHP)}</div>
          </div>
        `
      }).join('')
    }

    const hasAutoCombat = p?.flags['unlock_auto_combat']
    const autoCombatOn = hasAutoCombat && p?.flags['auto_combat'] !== false
    const autoIndicator = hasAutoCombat
      ? `<div class="auto-indicator ${autoCombatOn ? 'on' : 'off'}">
           ${autoCombatOn ? '⚡ AUTO' : '⏸ 手動'}
           <button class="auto-toggle-btn" data-cmd="${autoCombatOn ? 'auto_combat off' : 'auto_combat on'}">${autoCombatOn ? '暫停' : '啟用'}</button>
         </div>`
      : ''

    this.contextPanel.innerHTML = `
      <div class="combat-panel">
        ${autoIndicator}
        ${enemyCardsHTML ? `<div id="enemy-cards">${enemyCardsHTML}</div>` : ''}
        <div class="action-grid cols-2">
          <button class="act-btn primary" data-cmd="attack">⚔ 攻擊</button>
          <button class="act-btn" data-cmd="defend">🛡 防禦</button>
          <button class="act-btn" data-cmd="tame">🐾 馴服</button>
          <button class="act-btn danger" data-cmd="flee">🏃 逃跑</button>
        </div>
      </div>
    `
  }

  private buildDungeonPanel(): void {
    this.contextPanel.innerHTML = `
      <div class="dungeon-panel">
        <div class="dungeon-layout">
          <div class="dpad">
            <div></div>
            <button class="dpad-btn" data-cmd="go n">↑</button>
            <div></div>
            <button class="dpad-btn" data-cmd="go w">←</button>
            <div class="dpad-center">移動</div>
            <button class="dpad-btn" data-cmd="go e">→</button>
            <div></div>
            <button class="dpad-btn" data-cmd="go s">↓</button>
            <div></div>
          </div>
          <div class="dungeon-actions">
            <button class="act-btn" data-cmd="map">🗺 地圖</button>
            <button class="act-btn" data-cmd="explore">🔍 搜索</button>
            <button class="act-btn" data-cmd="inn">💤 休息</button>
            <button class="act-btn danger" data-cmd="exit_dungeon">🚪 撤退</button>
          </div>
        </div>
      </div>
    `
  }

  private updateEnemyBars(): void {
    const combat = getActiveCombat()
    if (!combat) return
    const alive = combat.enemies.filter(e => e.currentHP.gt(0))
    alive.forEach((e, i) => {
      const fill = document.getElementById(`enemy-hp-${i}`)
      if (fill) {
        const pct = e.maxHP.gt(0) ? clamp(e.currentHP.div(e.maxHP).times(100).toNumber()) : 0
        fill.style.width = `${pct.toFixed(1)}%`
      }
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
      case 'shop':      this.panelTitle.textContent = '商店';     this.buildShopPanel();      break
      case 'dungeons':  this.panelTitle.textContent = '地城選擇'; this.buildDungeonsPanel();  break
      case 'zones':     this.panelTitle.textContent = '探索區域'; this.buildZonesPanel();     break
    }
  }

  closeSlidePanel(): void {
    this.activePanel = null
    this.overlay.classList.remove('open')
    this.panelBody.innerHTML = ''
    this.bottomNav.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'))
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
        const cmdAttr = check.ok ? `data-cmd="changejob ${j.id}"` : ''
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
      .map(item => `<div class="equipped-chip">${this.slotLabel(item.slot)}: ${item.name}</div>`)
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
        return `
          <div class="item-card">
            <div>
              <div class="item-name">${item.name}</div>
              <div class="item-slot">${this.slotLabel(item.slot)}</div>
            </div>
            <span class="item-rarity-tag rarity-${item.rarity}">${item.rarity}</span>
            ${equipBtn}
            <button class="item-btn" data-action="sell" data-id="${item.instanceId}">販售</button>
          </div>
        `
      }).join('')
    }

    this.panelBody.innerHTML = `
      ${equippedSection}
      <div class="section-title">物品欄 (${myItems.length})</div>
      ${itemsHTML}
    `

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
  }

  private slotLabel(slot: string): string {
    const labels: Record<string, string> = {
      weapon: '武器', offhand: '副手', head: '頭部', body: '身體',
      legs: '腿部', feet: '腳部', ring: '戒指', ring1: '戒指1', ring2: '戒指2', amulet: '項鍊'
    }
    return labels[slot] ?? slot
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
    const isPendingRebirth = !!p.flags?.['pending_rebirth']
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
      ${isPendingRebirth
        ? `<button class="rebirth-big-btn danger-pulse" id="rebirth-confirm-btn">⚠ 確認重生！（不可逆）</button>
           <button class="rebirth-cancel-btn" id="rebirth-cancel-btn">取消</button>`
        : rebirthCheck.ok
          ? `<button class="rebirth-big-btn" id="rebirth-prepare-btn">✨ 重生</button>`
          : `<button class="rebirth-big-btn" disabled>✨ 重生（${rebirthCheck.reason ?? '條件不足'}）</button>`
      }
      <div class="section-title">重生樹</div>
      ${nodesHTML || '<div style="color:var(--text-dim);font-size:12px">尚未解鎖任何節點</div>'}
    `

    // Rebirth buttons
    document.getElementById('rebirth-prepare-btn')?.addEventListener('click', () => {
      this.cmdFn('rebirth')
      setTimeout(() => this.buildPrestigePanel(), 150)
    })
    document.getElementById('rebirth-confirm-btn')?.addEventListener('click', () => {
      this.cmdFn('confirm_rebirth')
      this.closeSlidePanel()
      setTimeout(() => this.refresh(), 200)
    })
    document.getElementById('rebirth-cancel-btn')?.addEventListener('click', () => {
      delete p.flags['pending_rebirth']
      this.buildPrestigePanel()
    })

    // Bind prestige node buy buttons
    this.panelBody.querySelectorAll('.prestige-buy-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        const nodeId = (btn as HTMLElement).dataset.nodeId!
        this.cmdFn(`buytier ${nodeId}`)
        setTimeout(() => this.buildPrestigePanel(), 100)
      })
    })
  }

  // ── Shop Panel ─────────────────────────────────────────────

  private buildShopPanel(): void {
    const p = this.getPlayer?.()
    if (!p) { this.panelBody.innerHTML = '<div>載入中...</div>'; return }

    const townId = p.location.type === 'town' ? p.location.id : 'starting_town'
    const town = TOWNS[townId]
    if (!town || town.shopIds.length === 0) {
      this.panelBody.innerHTML = '<div style="color:var(--text-dim)">此處沒有商店。</div>'
      return
    }

    const templateNames: Record<string, string> = Object.fromEntries(
      EQUIPMENT_TEMPLATES.map(t => [t.id, t.name])
    )

    let html = `<div style="color:var(--gold);font-size:12px;margin-bottom:10px">💰 你的金幣：${fmt(p.gold)}</div>`

    for (const shopId of town.shopIds) {
      const shop = SHOPS[shopId]
      if (!shop) continue
      html += `<div class="section-title">${shop.name}</div>`
      shop.inventory.forEach((item, i) => {
        const name = templateNames[item.templateId] ?? item.templateId
        const canAfford = p.gold.gte(item.price)
        html += `
          <div class="shop-item-row">
            <div class="shop-item-info">
              <div class="shop-item-name">${name}</div>
              <div class="shop-item-price">💰 ${fmt(item.price)}</div>
            </div>
            <span style="color:var(--text-dim);font-size:11px;flex-shrink:0">×${item.quantity}</span>
            <button class="item-btn shop-buy-btn"
              data-shop-id="${shopId}" data-item-idx="${i}"
              ${canAfford && item.quantity > 0 ? '' : 'disabled'}>購買</button>
          </div>
        `
      })
    }

    this.panelBody.innerHTML = html

    this.panelBody.querySelectorAll('.shop-buy-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        const el = btn as HTMLElement
        const shopId = el.dataset.shopId!
        const idx = parseInt(el.dataset.itemIdx!)
        const shop = SHOPS[shopId]
        if (!shop) return
        const shopItem = shop.inventory[idx]
        if (!p.gold.gte(shopItem.price)) return
        p.gold = p.gold.minus(shopItem.price)
        const item = generateItem({
          level: Math.max(1, p.level.toNumber()),
          rebirthTier: p.rebirthCount,
          lck: p.currentStats.lck.toNumber(),
          slotHint: undefined,
        })
        addItemToInventory(p, item)
        import('../core/logger').then(({ log }) => log.success(`購買了「${item.name}」！`))
        setTimeout(() => this.buildShopPanel(), 50)
      })
    })
  }

  // ── Dungeons Panel ─────────────────────────────────────────

  private buildDungeonsPanel(): void {
    const p = this.getPlayer?.()
    if (!p) { this.panelBody.innerHTML = '<div>載入中...</div>'; return }

    const playerLevel = p.level.toNumber()
    let html = ''

    for (const dungeon of Object.values(DUNGEON_TEMPLATES)) {
      const locked = playerLevel < dungeon.minLevel
      html += `
        <div class="dungeon-card ${locked ? 'locked' : ''}">
          <div class="dungeon-card-header">
            <div>
              <div class="dungeon-card-name">${dungeon.name}</div>
              <div class="dungeon-card-desc">${dungeon.description}</div>
            </div>
            <div class="dungeon-card-meta">
              <span>Tier ${dungeon.tier}</span>
              <span>${dungeon.maxFloors}F</span>
            </div>
          </div>
          <div class="dungeon-card-footer">
            <span class="dungeon-req ${locked ? 'locked' : ''}">
              ${locked ? `🔒 需 Lv.${dungeon.minLevel}` : `✓ Lv.${dungeon.minLevel}+`}
            </span>
            <button class="item-btn" data-cmd="dungeon ${dungeon.id}" ${locked ? 'disabled' : ''}>進入</button>
          </div>
        </div>
      `
    }

    this.panelBody.innerHTML = html || '<div style="color:var(--text-dim)">無可用地城</div>'
  }

  // ── Zones Panel ────────────────────────────────────────────

  private buildZonesPanel(): void {
    const p = this.getPlayer?.()
    if (!p) { this.panelBody.innerHTML = '<div>載入中...</div>'; return }

    const playerLevel = p.level.toNumber()
    let html = ''

    for (const zone of Object.values(ZONES)) {
      const locked = playerLevel < zone.unlockLevel
      html += `
        <div class="dungeon-card ${locked ? 'locked' : ''}">
          <div class="dungeon-card-header">
            <div>
              <div class="dungeon-card-name">${zone.name}</div>
              <div class="dungeon-card-desc">${zone.description}</div>
            </div>
            <div class="dungeon-card-meta">
              <span>Tier ${zone.tier}</span>
            </div>
          </div>
          ${locked
            ? `<div class="dungeon-card-footer">
                 <span class="dungeon-req locked">🔒 需 Lv.${zone.unlockLevel}</span>
               </div>`
            : `<div class="zone-areas">
                 ${zone.areas.map(area => `
                   <button class="act-btn zone-area-btn" data-cmd="explore ${zone.id} ${area.id}">
                     ${area.name}
                   </button>
                 `).join('')}
               </div>`
          }
        </div>
      `
    }

    this.panelBody.innerHTML = html || '<div style="color:var(--text-dim)">無可用區域</div>'
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, v))
}
