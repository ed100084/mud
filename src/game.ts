import { ticker } from './core/ticker'
import { bus } from './core/eventbus'
import { log } from './core/logger'
import { terminal } from './ui/terminal/Terminal'
import { UIManager } from './ui/UIManager'
import { executeCommand } from './ui/commands/CommandRegistry'
import { createPlayer } from './systems/player/PlayerSystem'
import { recalcStats } from './systems/player/StatsSystem'
import { getEquippedItems } from './systems/equipment/EquipmentSystem'
import { saveGame, loadGame, startAutoSave } from './save/SaveManager'
import { OFFLINE_MAX_HOURS, AUTO_EXPLORE_DELAY_MS } from './constants'
import { D, fmt, fmtFull, toDecimal } from './core/bignum'
import { updateQuestProgress } from './systems/npc/QuestSystem'
import { getOfflineRate, getPrestigeXpMultiplier, getPrestigeGoldMultiplier } from './systems/prestige/PrestigeSystem'
import type { PlayerState, StatBlock } from './types'

// 修復舊存檔或 HMR 後 Decimal 變成普通字串/數字的問題
function rehydratePlayer(p: PlayerState): PlayerState {
  const td = toDecimal
  const fixSB = (sb: StatBlock): StatBlock => ({
    hp: td(sb.hp), mp: td(sb.mp),
    atk: td(sb.atk), def: td(sb.def),
    matk: td(sb.matk), mdef: td(sb.mdef),
    spd: td(sb.spd), lck: td(sb.lck),
    crit: td(sb.crit), critDmg: td(sb.critDmg),
    dodge: td(sb.dodge), acc: td(sb.acc),
  })
  p.level = td(p.level)
  p.xp = td(p.xp)
  p.xpToNext = td(p.xpToNext)
  p.jobLevel = td(p.jobLevel)
  p.jobXp = td(p.jobXp)
  p.jobXpToNext = td(p.jobXpToNext)
  p.gold = td(p.gold)
  p.currentHP = td(p.currentHP)
  p.currentMP = td(p.currentMP)
  p.baseStats = fixSB(p.baseStats)
  p.currentStats = fixSB(p.currentStats)
  p.prestige = {
    ...p.prestige,
    totalSoulFragments: td(p.prestige.totalSoulFragments),
    spentSoulFragments: td(p.prestige.spentSoulFragments),
  }
  p.playtimeStats = {
    ...p.playtimeStats,
    totalKills: td(p.playtimeStats.totalKills),
    totalXpGained: td(p.playtimeStats.totalXpGained),
    totalGoldGained: td(p.playtimeStats.totalGoldGained),
    highestLevel: td(p.playtimeStats.highestLevel),
  }
  return p
}

export class GameEngine {
  private player!: PlayerState
  private tickCount = 0
  private lastStatusUpdate = 0
  private uiManager = new UIManager()

  async init(appEl: HTMLElement): Promise<void> {
    // 初始化終端機 UI（建立 #mud-root 和 #terminal-output）
    terminal.init(appEl)

    // 初始化 UIManager（建立狀態列、操作面板、底部導覽）
    this.uiManager.init(appEl, () => this.player, (cmd) => this.handleCommand(cmd))

    // 載入或建立玩家
    await this.loadOrCreatePlayer()

    // 啟動遊戲迴圈
    ticker.start()

    // 監聽 tick 事件
    bus.on('tick', ({ tick }) => this.onTick(tick))

    // 監聽戰鬥事件：自動探索循環
    bus.on('combat:end', ({ victory }) => {
      if (!victory) return
      if (!this.player.flags['unlock_auto_explore']) return
      if (this.player.flags['auto_explore'] === false) return
      const zoneId = this.player.flags['current_zone'] as string | undefined
      if (!zoneId) return
      setTimeout(() => {
        import('./systems/adventure/AdventureSystem').then(({ exploreArea }) => {
          exploreArea(this.player, zoneId)
          setTimeout(() => this.uiManager.refresh(), 100)
        })
      }, AUTO_EXPLORE_DELAY_MS)
    })

    // 啟動自動存檔
    startAutoSave(() => this.player)

    // 顯示歡迎訊息
    this.showWelcome()

    // 初始化 UI 狀態
    this.uiManager.refresh()
  }

  private async loadOrCreatePlayer(): Promise<void> {
    const saves = (await import('./save/SaveManager')).listSaves()
    if (saves.includes('Auto Save')) {
      const loaded = await loadGame('Auto Save')
      if (loaded) {
        this.player = rehydratePlayer(loaded)
        recalcStats(this.player, getEquippedItems(this.player))
        this.calcOfflineProgress()
        return
      }
    }
    // 新遊戲
    this.player = createPlayer('無名英雄')
    recalcStats(this.player, getEquippedItems(this.player))
    log.story('歡迎來到「異界迷城」！這是你第一次踏上這片土地。')
    log.system('點擊底部按鈕開始探索！')
  }

  private calcOfflineProgress(): void {
    const now = Date.now()
    const elapsed = (now - this.player.lastSaveTime) / 1000  // 秒
    const maxSeconds = OFFLINE_MAX_HOURS * 3600
    const actual = Math.min(elapsed, maxSeconds)

    if (actual < 60) return  // 少於 1 分鐘，不計算

    const hours = Math.floor(actual / 3600)
    const minutes = Math.floor((actual % 3600) / 60)
    const timeStr = hours > 0 ? `${hours} 小時 ${minutes} 分鐘` : `${minutes} 分鐘`

    // 動態離線效率（根據里程碑）
    const offlineRate = getOfflineRate(this.player)
    const xpMult = getPrestigeXpMultiplier(this.player)
    const goldMult = getPrestigeGoldMultiplier(this.player)

    // 估算戰鬥場次（每場約 15 秒），套用離線效率
    const combatsPerSecond = 1 / 15
    const totalCombats = Math.floor(combatsPerSecond * actual * offlineRate)

    // 每場戰鬥平均 XP = 攻擊力 * 3（概估），套用轉生倍率
    const xpPerCombat = this.player.currentStats.atk.times(3)
    const totalXp = xpPerCombat.times(totalCombats).times(xpMult).ceil()

    // 每場戰鬥金幣 = (重生次數 + 1) * 5，套用轉生倍率
    const goldPerCombat = D(1 + this.player.rebirthCount).times(5)
    const totalGold = goldPerCombat.times(totalCombats).times(goldMult).ceil()

    import('./systems/player/PlayerSystem').then(({ grantXP, grantGold }) => {
      log.separator()
      log.story(`歡迎回來！你離線了 ${timeStr}。`)
      log.info(`離線效率：${(offlineRate * 100).toFixed(0)}%　模擬戰鬥：${totalCombats} 場`)
      grantXP(this.player, totalXp, '離線進度')
      grantGold(this.player, totalGold)
      log.info(`離線獲得：${fmt(totalXp)} XP、${fmt(totalGold)} 金幣`)
      log.separator()
    })
  }

  private onTick(tick: number): void {
    this.tickCount = tick
    // 每 20 tick（1 秒）更新一次狀態列
    if (tick - this.lastStatusUpdate >= 20) {
      this.lastStatusUpdate = tick
      this.uiManager.updateStatusBars()
      this.player.playtimeStats.playTime += 1
    }
  }

  private handleCommand(input: string): void {
    // 特殊：新遊戲姓名輸入
    if (this.player.flags['awaiting_name']) {
      if (input.length >= 2 && input.length <= 12) {
        this.player.name = input
        delete this.player.flags['awaiting_name']
        log.success(`你的名字是「${input}」。冒險開始！`)
        recalcStats(this.player, getEquippedItems(this.player))
        this.showWelcome()
        this.uiManager.refresh()
        return
      } else {
        log.warning('姓名需要 2-12 個字元')
        return
      }
    }
    executeCommand(input, { player: this.player, getPlayer: () => this.player })
    // Refresh UI after command execution
    setTimeout(() => this.uiManager.refresh(), 100)
  }

  private showWelcome(): void {
    log.system(`╔════════════════════════════════════╗`)
    log.system(`║        ✦  異界迷城 MUD  ✦           ║`)
    log.system(`║    無盡輪迴的傳說從此展開              ║`)
    log.system(`╚════════════════════════════════════╝`)
    log.story(`歡迎回來，${this.player.name}。`)
    log.story(`你是第 ${this.player.rebirthCount} 次重生的英雄，`)
    log.story(`目前等級 ${this.player.level.toFixed(0)}，位於${this.player.location.id}。`)
    log.info('點擊底部按鈕探索、查看角色或任務。')
  }
}
