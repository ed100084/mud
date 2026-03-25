import { log } from '../../core/logger'
import { fmt, fmtFull, D } from '../../core/bignum'
import { terminal } from '../terminal/Terminal'
import type { PlayerState } from '../../types'

// 指令上下文（持有玩家狀態的引用）
export interface CommandContext {
  player: PlayerState
  getPlayer: () => PlayerState
}

type CommandHandler = (args: string[], ctx: CommandContext) => void

interface CommandDef {
  verb?: string
  handler: CommandHandler
  description: string
  usage: string
  aliases: string[]
  category: string
}

const registry = new Map<string, CommandDef>()

export function registerCommand(verb: string, def: CommandDef): void {
  registry.set(verb, def)
  for (const alias of def.aliases) registry.set(alias, def)
}

export function executeCommand(input: string, ctx: CommandContext): void {
  const parts = input.trim().split(/\s+/)
  const verb = parts[0].toLowerCase()
  const args = parts.slice(1)
  const cmd = registry.get(verb)
  if (!cmd) {
    log.warning(`未知指令「${verb}」，輸入 help 查看指令列表。`)
    return
  }
  try {
    cmd.handler(args, ctx)
  } catch (e) {
    log.error(`指令執行錯誤：${e}`)
  }
}

// ── 系統指令 ────────────────────────────────────────

registerCommand('help', {
  verb: 'help', aliases: ['h', '?'], category: 'system',
  description: '顯示指令說明',
  usage: 'help [指令名稱]',
  handler: (args, _ctx) => {
    if (args[0]) {
      const cmd = registry.get(args[0])
      if (cmd) {
        log.system(`${args[0]}：${cmd.description}`)
        log.info(`用法：${cmd.usage}`)
      } else {
        log.warning(`未知指令：${args[0]}`)
      }
      return
    }
    log.system('══════ 指令列表 ══════')
    log.system('【導航】go/探索 | explore/e | map | dungeon/d')
    log.system('【戰鬥】attack/a | skill/s | defend/def | flee | tame')
    log.system('【角色】status/st | stats | inventory/inv | equip | unequip')
    log.system('【職業】jobs | changejob <id> | skills')
    log.system('【同伴】companions/cp | dismiss <n>')
    log.system('【城鎮】town | talk <npc> | shop | buy <id> | sell <id> | inn')
    log.system('【任務】quests/q | accept <id> | complete <id>')
    log.system('【重生】prestige | rebirth | soultree | buytier <id> [n]')
    log.system('【系統】save | load | settings | codex | choice <n>')
    log.system('輸入 help <指令> 查看詳細說明')
  }
})

registerCommand('status', {
  verb: 'status', aliases: ['st', 'char', '狀態'], category: 'character',
  description: '顯示角色狀態',
  usage: 'status',
  handler: (_args, ctx) => {
    const p = ctx.player
    const hp = `${fmtFull(p.currentHP)}/${fmtFull(p.currentStats.hp)}`
    const mp = `${fmtFull(p.currentMP)}/${fmtFull(p.currentStats.mp)}`
    const xp = `${fmtFull(p.xp)}/${fmtFull(p.xpToNext)}`
    import('../../systems/job/JobData').then(({ getJobById }) => {
      const job = getJobById(p.jobId)
      log.system('══════ 角色狀態 ══════')
      log.info(`姓名：${p.name}  等級：Lv.${p.level.toFixed(0)}`)
      log.info(`職業：${job?.name ?? p.jobId}  職業等級：Lv.${p.jobLevel.toFixed(0)}`)
      log.info(`重生：第 ${p.rebirthCount} 次  靈魂碎片：${fmtFull(p.prestige.totalSoulFragments.minus(p.prestige.spentSoulFragments))}`)
      log.info(`HP：${hp}`)
      log.info(`MP：${mp}`)
      log.info(`XP：${xp}`)
      log.info(`金幣：${fmt(p.gold)}`)
      log.info(`位置：${{ town: '城鎮', adventure: '冒險區域', dungeon: '地城' }[p.location.type]}（${p.location.id}）`)
    })
  }
})

registerCommand('stats', {
  verb: 'stats', aliases: ['attributes', 'attr', '屬性'], category: 'character',
  description: '顯示角色詳細屬性',
  usage: 'stats',
  handler: (_args, ctx) => {
    const s = ctx.player.currentStats
    log.system('══════ 詳細屬性 ══════')
    log.info(`攻擊：${fmtFull(s.atk)}   防禦：${fmtFull(s.def)}`)
    log.info(`魔攻：${fmtFull(s.matk)}   魔防：${fmtFull(s.mdef)}`)
    log.info(`速度：${fmtFull(s.spd)}   幸運：${fmtFull(s.lck)}`)
    log.info(`爆擊率：${(s.crit.toNumber() * 100).toFixed(1)}%   爆擊傷害：${(s.critDmg.toNumber() * 100).toFixed(0)}%`)
    log.info(`閃避：${(s.dodge.toNumber() * 100).toFixed(1)}%   命中：${(s.acc.toNumber() * 100).toFixed(1)}%`)
  }
})

registerCommand('inventory', {
  verb: 'inventory', aliases: ['inv', 'i', '物品欄'], category: 'character',
  description: '查看物品欄',
  usage: 'inventory',
  handler: (_args, ctx) => {
    const p = ctx.player
    if (p.inventory.length === 0) {
      log.info('物品欄是空的。')
      return
    }
    import('../../systems/equipment/EquipmentSystem').then(({ getItem }) => {
      log.system('══════ 物品欄 ══════')
      p.inventory.forEach((slot, i) => {
        const item = getItem(slot.instanceId)
        if (item) {
          const rarityColors: Record<string, string> = {
            Common: '普通', Uncommon: '優良', Rare: '稀有',
            Epic: '史詩', Legendary: '傳說', Mythic: '神話', Transcendent: '超越',
          }
          log.info(`  ${i + 1}. ${item.name} [${rarityColors[item.rarity]}] （${item.slot}）`)
        }
      })
      log.info(`共 ${p.inventory.length} 件物品。 使用 equip <編號> 裝備物品`)
    })
  }
})

registerCommand('equip', {
  verb: 'equip', aliases: ['eq', '裝備'], category: 'character',
  description: '裝備物品',
  usage: 'equip <物品編號>',
  handler: (args, ctx) => {
    const idx = parseInt(args[0]) - 1
    const p = ctx.player
    if (isNaN(idx) || idx < 0 || idx >= p.inventory.length) {
      log.warning('無效的物品編號。')
      return
    }
    const slot = p.inventory[idx]
    import('../../systems/equipment/EquipmentSystem').then(({ equipItem }) => {
      import('../../systems/player/StatsSystem').then(({ recalcStats }) => {
        import('../../systems/equipment/EquipmentSystem').then(({ getEquippedItems }) => {
          equipItem(p, slot.instanceId)
          recalcStats(p, getEquippedItems(p))
        })
      })
    })
  }
})

registerCommand('explore', {
  verb: 'explore', aliases: ['e', 'ex', '探索'], category: 'navigation',
  description: '探索目前區域',
  usage: 'explore [區域ID]',
  handler: (args, ctx) => {
    const p = ctx.player
    if (p.location.type === 'dungeon') {
      log.warning('你正在地城中，使用 go <方向> 移動。')
      return
    }
    import('../../systems/adventure/AdventureSystem').then(({ exploreArea }) => {
      // 若在城鎮中，預設回到新手平原；若已在冒險區，繼續同區域
      const zoneId = args[0]
        || (p.location.type === 'adventure' ? p.location.id : null)
        || 'starting_plains'
      const areaId = args[1]
      p.location = { type: 'adventure', id: zoneId }
      exploreArea(p, zoneId, areaId)
    })
  }
})

registerCommand('go', {
  verb: 'go', aliases: ['move', '前往', 'n', 's', 'e', 'w'], category: 'navigation',
  description: '地城內移動方向',
  usage: 'go <n/s/e/w>',
  handler: (args, ctx) => {
    const p = ctx.player
    const dirMap: Record<string, 'n' | 's' | 'e' | 'w'> = {
      n: 'n', north: 'n', 北: 'n',
      s: 's', south: 's', 南: 's',
      e: 'e', east: 'e', 東: 'e',
      w: 'w', west: 'w', 西: 'w',
    }
    const dir = dirMap[args[0]?.toLowerCase() ?? '']
    if (!dir) {
      log.warning('請輸入方向：n/s/e/w（北/南/東/西）')
      return
    }
    import('../../systems/dungeon/DungeonSystem').then(({ moveRoom }) => {
      moveRoom(p, dir)
    })
  }
})

registerCommand('attack', {
  verb: 'attack', aliases: ['a', 'atk', '攻擊'], category: 'combat',
  description: '攻擊敵人',
  usage: 'attack',
  handler: (_args, ctx) => {
    import('../../systems/combat/CombatSystem').then(({ getActiveCombat, playerAttack }) => {
      if (!getActiveCombat()) { log.warning('你沒有在戰鬥中。'); return }
      playerAttack(ctx.player)
    })
  }
})

registerCommand('defend', {
  verb: 'defend', aliases: ['def', '防禦'], category: 'combat',
  description: '採取防禦姿態',
  usage: 'defend',
  handler: (_args, ctx) => {
    import('../../systems/combat/CombatSystem').then(({ getActiveCombat, playerDefend }) => {
      if (!getActiveCombat()) { log.warning('你沒有在戰鬥中。'); return }
      playerDefend(ctx.player)
    })
  }
})

registerCommand('flee', {
  verb: 'flee', aliases: ['run', 'escape', '逃跑'], category: 'combat',
  description: '嘗試逃跑',
  usage: 'flee',
  handler: (_args, ctx) => {
    import('../../systems/combat/CombatSystem').then(({ getActiveCombat, playerFlee }) => {
      if (!getActiveCombat()) { log.warning('你沒有在戰鬥中。'); return }
      playerFlee(ctx.player)
    })
  }
})

registerCommand('tame', {
  verb: 'tame', aliases: ['馴服', 'recruit'], category: 'combat',
  description: '嘗試馴服目前戰鬥中的怪物',
  usage: 'tame',
  handler: (_args, ctx) => {
    import('../../systems/combat/CombatSystem').then(({ getActiveCombat }) => {
      const combat = getActiveCombat()
      if (!combat) { log.warning('你沒有在戰鬥中。'); return }
      const target = combat.enemies.find(e => e.currentHP.gt(0))
      if (!target || !target.templateId) { log.warning('沒有可馴服的目標。'); return }
      import('../../systems/monster/MonsterData').then(({ getMonsterById }) => {
        import('../../systems/companion/CompanionSystem').then(({ attemptTame }) => {
          const template = getMonsterById(target.templateId!)
          if (!template) return
          const hpPct = target.currentHP.div(target.maxHP).toNumber()
          attemptTame(ctx.player, template, hpPct)
        })
      })
    })
  }
})

registerCommand('jobs', {
  verb: 'jobs', aliases: ['job', '職業'], category: 'job',
  description: '查看職業資訊',
  usage: 'jobs',
  handler: (_args, ctx) => {
    const p = ctx.player
    import('../../systems/job/JobData').then(({ JOB_DEFINITIONS, getJobById }) => {
      import('../../systems/job/JobSystem').then(({ canChangeJob }) => {
        const current = getJobById(p.jobId)
        log.system(`══════ 職業系統 ══════`)
        log.info(`目前職業：${current?.name ?? p.jobId}  職業等級：Lv.${p.jobLevel.toFixed(0)}`)
        log.system('可轉職業：')
        Object.values(JOB_DEFINITIONS).filter(j => j.id !== p.jobId).forEach(j => {
          const { ok, reason } = canChangeJob(p, j.id)
          if (ok) log.success(`  ✔ [Tier${j.tier}] ${j.name}`)
          else log.info(`  ✗ [Tier${j.tier}] ${j.name}（${reason}）`)
        })
        log.info('使用 changejob <職業ID> 轉職')
      })
    })
  }
})

registerCommand('changejob', {
  verb: 'changejob', aliases: ['cj', '轉職'], category: 'job',
  description: '轉換職業',
  usage: 'changejob <職業ID>',
  handler: (args, ctx) => {
    if (!args[0]) { log.warning('請指定職業ID'); return }
    import('../../systems/job/JobSystem').then(({ changeJob }) => {
      changeJob(ctx.player, args[0])
    })
  }
})

registerCommand('companions', {
  verb: 'companions', aliases: ['cp', 'party', '同伴'], category: 'companion',
  description: '查看同伴列表',
  usage: 'companions',
  handler: (_args, ctx) => {
    import('../../systems/companion/CompanionSystem').then(({ showCompanions }) => {
      showCompanions(ctx.player)
    })
  }
})

registerCommand('quests', {
  verb: 'quests', aliases: ['q', 'quest', '任務'], category: 'npc',
  description: '查看任務列表',
  usage: 'quests',
  handler: (_args, ctx) => {
    const p = ctx.player
    log.system('══════ 任務 ══════')
    if (p.quests.length === 0) {
      log.info('目前沒有進行中的任務。')
    } else {
      import('../../systems/npc/QuestSystem').then(({ QUEST_DEFINITIONS }) => {
        p.quests.forEach(q => {
          const def = QUEST_DEFINITIONS[q.questId]
          if (!def) return
          log.quest(`  [${q.isComplete ? '可提交' : '進行中'}] ${def.title}`)
          def.objectives.forEach((obj, i) => {
            const prog = q.objectiveProgress[`${i}`] ?? 0
            log.info(`    ○ ${obj.description.split(' ')[0]} ${prog}/${obj.required}`)
          })
        })
      })
    }
    log.info(`已完成：${p.completedQuestIds.length} 個任務`)
  }
})

registerCommand('accept', {
  verb: 'accept', aliases: ['接受任務'], category: 'npc',
  description: '接受任務',
  usage: 'accept <任務ID>',
  handler: (args, ctx) => {
    if (!args[0]) { log.warning('請指定任務ID'); return }
    import('../../systems/npc/QuestSystem').then(({ acceptQuest }) => {
      acceptQuest(ctx.player, args[0])
    })
  }
})

registerCommand('complete', {
  verb: 'complete', aliases: ['finish', '完成任務'], category: 'npc',
  description: '提交完成的任務',
  usage: 'complete <任務ID>',
  handler: (args, ctx) => {
    if (!args[0]) { log.warning('請指定任務ID'); return }
    import('../../systems/npc/QuestSystem').then(({ completeQuest }) => {
      completeQuest(ctx.player, args[0])
    })
  }
})

registerCommand('talk', {
  verb: 'talk', aliases: ['t', 'npc', '對話'], category: 'town',
  description: '與 NPC 對話',
  usage: 'talk <NPC名稱或ID>',
  handler: (args, ctx) => {
    const name = args.join(' ').toLowerCase()
    import('../../systems/town/TownData').then(({ NPCS }) => {
      const npc = Object.values(NPCS).find(n =>
        n.id === name || n.name.toLowerCase().includes(name)
      )
      if (!npc) { log.warning('找不到 NPC。'); return }
      const root = npc.dialogueTree.find(d => d.id === 'root')
      if (!root) return
      log.separator()
      log.dialogue(`【${npc.name}（${npc.title}）】`)
      log.dialogue(`「${root.text}」`)
      root.options.forEach((opt, i) => {
        log.info(`  ${i + 1}. ${opt.text}`)
      })
      ctx.player.flags['talking_npc'] = npc.id
      ctx.player.flags['talking_node'] = 'root'
    })
  }
})

registerCommand('inn', {
  verb: 'inn', aliases: ['rest', '旅店', '休息'], category: 'town',
  description: '在旅店休息（20 金幣）',
  usage: 'inn',
  handler: (_args, ctx) => {
    const p = ctx.player
    if (p.location.type !== 'town') { log.warning('你不在城鎮中。'); return }
    if (p.gold.lt(20)) { log.warning('金幣不足（需要 20 金幣）。'); return }
    import('../../systems/player/PlayerSystem').then(({ fullRestore, spendGold }) => {
      if (!spendGold(p, D(20))) { log.warning('金幣不足。'); return }
      fullRestore(p)
    })
  }
})

registerCommand('town', {
  verb: 'town', aliases: ['city', '城鎮', 'return'], category: 'town',
  description: '顯示城鎮資訊（若在野外則返回最近城鎮）',
  usage: 'town',
  handler: (_args, ctx) => {
    const p = ctx.player
    if (p.location.type !== 'town') {
      // 自動返回最近城鎮
      p.location = { type: 'town', id: 'starting_town' }
      log.info('你返回了城鎮。')
    }
    import('../../systems/town/TownData').then(({ getTown, NPCS }) => {
      const town = getTown(p.location.id)
      if (!town) return
      log.system(`══════ ${town.name} ══════`)
      log.story(town.description)
      log.info('NPC：' + town.npcIds.map(id => NPCS[id]?.name ?? id).join('、'))
      const services = []
      if (town.hasInn) services.push('旅店(inn)')
      if (town.hasGuild) services.push('公會')
      if (town.hasBlacksmith) services.push('鐵匠(forge)')
      log.info('設施：' + services.join('、'))
      log.info('使用 talk <NPC> 對話')
    })
  }
})

registerCommand('shop', {
  verb: 'shop', aliases: ['store', '商店'], category: 'town',
  description: '查看商店物品',
  usage: 'shop [商店ID]',
  handler: (args, ctx) => {
    import('../../systems/town/TownData').then(({ getTown, SHOPS }) => {
      const town = getTown(ctx.player.location.id)
      if (!town) { log.warning('你不在城鎮中。'); return }
      const shopId = args[0] || town.shopIds[0]
      const shop = SHOPS[shopId]
      if (!shop) { log.warning('找不到商店。'); return }
      log.system(`══ ${shop.name} ══`)
      shop.inventory.forEach((item, i) => {
        log.info(`  ${i + 1}. ${item.templateId}  價格：${fmt(item.price)} 金幣  數量：${item.quantity}`)
      })
      log.info(`你的金幣：${fmt(ctx.player.gold)}`)
      log.info('使用 buy <編號> 購買')
    })
  }
})

registerCommand('dungeon', {
  verb: 'dungeon', aliases: ['d', 'enter', '地城'], category: 'dungeon',
  description: '進入地城',
  usage: 'dungeon <地城ID> [roguelike]',
  handler: (args, ctx) => {
    if (!args[0]) {
      log.info('可用地城：goblin_cave（哥布林洞窟）、dark_forest_dungeon（黑暗迷林）')
      return
    }
    import('../../systems/dungeon/DungeonSystem').then(({ enterDungeon }) => {
      enterDungeon(ctx.player, args[0], args[1] === 'roguelike')
    })
  }
})

registerCommand('map', {
  verb: 'map', aliases: ['minimap', '地圖'], category: 'dungeon',
  description: '顯示地城小地圖',
  usage: 'map',
  handler: (_args, ctx) => {
    import('../../systems/dungeon/DungeonSystem').then(({ getActiveDungeon }) => {
      import('../../systems/dungeon/MiniMap').then(({ renderMiniMap }) => {
        const d = getActiveDungeon()
        if (!d) { log.warning('你不在地城中。'); return }
        const floor = d.floors[d.currentFloor - 1]
        if (floor) renderMiniMap(floor)
      })
    })
  }
})

registerCommand('rebirth', {
  verb: 'rebirth', aliases: ['重生', 'rb'], category: 'prestige',
  description: '重生（重置進度，保留永久加成）',
  usage: 'rebirth',
  handler: (_args, ctx) => {
    import('../../systems/prestige/PrestigeSystem').then(({ canRebirth, getRebirthRequiredLevel }) => {
      const { ok, reason } = canRebirth(ctx.player)
      if (!ok) {
        const req = getRebirthRequiredLevel(ctx.player)
        log.warning(`無法重生：${reason}`)
        log.info(`下次重生需要 Lv.${req}`)
        return
      }
      log.warning('確定要重生嗎？輸入 confirm_rebirth 確認。')
      ctx.player.flags['pending_rebirth'] = true
    })
  }
})

registerCommand('confirm_rebirth', {
  verb: 'confirm_rebirth', aliases: ['crb'], category: 'prestige',
  description: '確認重生',
  usage: 'confirm_rebirth',
  handler: (_args, ctx) => {
    if (!ctx.player.flags['pending_rebirth']) { log.warning('請先輸入 rebirth。'); return }
    delete ctx.player.flags['pending_rebirth']
    import('../../systems/prestige/PrestigeSystem').then(({ performRebirth }) => {
      performRebirth(ctx.player)
    })
  }
})

registerCommand('prestige', {
  verb: 'prestige', aliases: ['soultree', '重生樹'], category: 'prestige',
  description: '查看重生升級樹',
  usage: 'prestige',
  handler: (_args, ctx) => {
    import('../../systems/prestige/PrestigeSystem').then(({ showPrestigeTree }) => {
      showPrestigeTree(ctx.player)
    })
  }
})

registerCommand('buytier', {
  verb: 'buytier', aliases: ['buynode', '購買升級'], category: 'prestige',
  description: '購買重生樹升級',
  usage: 'buytier <節點ID> [數量]',
  handler: (args, ctx) => {
    if (!args[0]) { log.warning('請指定節點ID'); return }
    const levels = parseInt(args[1] ?? '1')
    import('../../systems/prestige/PrestigeSystem').then(({ buyPrestigeNode }) => {
      buyPrestigeNode(ctx.player, args[0], levels || 1)
    })
  }
})

registerCommand('choice', {
  verb: 'choice', aliases: ['c', '選擇'], category: 'event',
  description: '在事件中做選擇',
  usage: 'choice <選項編號>',
  handler: (args, ctx) => {
    const n = parseInt(args[0])
    if (isNaN(n)) { log.warning('請輸入選項編號'); return }
    import('../../systems/adventure/AdventureSystem').then(({ resolveEvent }) => {
      resolveEvent(ctx.player, n)
    })
  }
})

registerCommand('save', {
  verb: 'save', aliases: ['存檔'], category: 'system',
  description: '手動存檔',
  usage: 'save [插槽名稱]',
  handler: (args, ctx) => {
    const slotName = args.join(' ') || 'Slot 1'
    import('../../save/SaveManager').then(({ saveGame }) => {
      saveGame(ctx.player, slotName)
    })
  }
})

export { registry }

// ─────────────────────────────────────────────────────────
//  補充指令
// ─────────────────────────────────────────────────────────

registerCommand('exit_dungeon', {
  verb: 'exit_dungeon', aliases: ['leave', 'exitd', '離開地城'], category: 'dungeon',
  description: '離開地城返回城鎮',
  usage: 'exit_dungeon',
  handler: (_args, ctx) => {
    import('../../systems/dungeon/DungeonSystem').then(({ exitDungeon }) => {
      exitDungeon(ctx.player)
    })
  }
})

registerCommand('sell', {
  verb: 'sell', aliases: ['販售'], category: 'town',
  description: '販售物品',
  usage: 'sell <物品編號>',
  handler: (args, ctx) => {
    const idx = parseInt(args[0]) - 1
    const p = ctx.player
    if (isNaN(idx) || idx < 0 || idx >= p.inventory.length) {
      import('../../core/logger').then(({ log }) => log.warning('無效的物品編號。'))
      return
    }
    const slot = p.inventory[idx]
    import('../../systems/equipment/EquipmentSystem').then(({ sellItem }) => {
      sellItem(p, slot.instanceId)
    })
  }
})

registerCommand('buy', {
  verb: 'buy', aliases: ['購買'], category: 'town',
  description: '購買商店物品',
  usage: 'buy <商品編號>',
  handler: (args, ctx) => {
    const idx = parseInt(args[0]) - 1
    if (isNaN(idx)) { import('../../core/logger').then(({ log }) => log.warning('請輸入商品編號')); return }
    import('../../systems/town/TownData').then(({ getTown, SHOPS }) => {
      import('../../core/logger').then(({ log }) => {
        import('../../systems/equipment/ItemGenerator').then(({ generateItem }) => {
          import('../../systems/equipment/EquipmentSystem').then(({ addItemToInventory }) => {
            const town = getTown(ctx.player.location.id)
            if (!town) { log.warning('你不在城鎮中。'); return }
            const shop = SHOPS[town.shopIds[0]]
            if (!shop || idx >= shop.inventory.length) { log.warning('無效的商品編號。'); return }
            const shopItem = shop.inventory[idx]
            if (ctx.player.gold.lt(shopItem.price)) { log.warning('金幣不足！'); return }
            ctx.player.gold = ctx.player.gold.minus(shopItem.price)
            const item = generateItem({
              level: Math.max(1, ctx.player.level.toNumber()),
              rebirthTier: ctx.player.rebirthCount,
              lck: ctx.player.currentStats.lck.toNumber(),
              slotHint: undefined,
            })
            addItemToInventory(ctx.player, item)
            log.success(`購買了「${item.name}」！`)
          })
        })
      })
    })
  }
})

registerCommand('codex', {
  verb: 'codex', aliases: ['圖鑑', 'bestiary'], category: 'system',
  description: '查看遊戲圖鑑',
  usage: 'codex [monsters|jobs|zones]',
  handler: (args, ctx) => {
    import('../../core/logger').then(({ log }) => {
      const topic = args[0] ?? 'help'
      if (topic === 'monsters' || topic === '怪物') {
        import('../../systems/monster/MonsterData').then(({ MONSTER_TEMPLATES }) => {
          log.system('── 怪物圖鑑 ──')
          for (const m of Object.values(MONSTER_TEMPLATES)) {
            const found = ctx.player.playtimeStats.totalKills.gt(0) ? '✔' : '?'
            log.info(`  ${found} ${m.name} [Tier${m.tier}] ${m.isBoss ? '【BOSS】' : ''}`)
          }
        })
      } else if (topic === 'jobs' || topic === '職業') {
        import('../../systems/job/JobData').then(({ JOB_DEFINITIONS }) => {
          log.system('── 職業圖鑑 ──')
          for (let t = 1; t <= 5; t++) {
            const jobs = Object.values(JOB_DEFINITIONS).filter(j => j.tier === t)
            if (jobs.length) {
              log.system(`  ── Tier ${t} ──`)
              jobs.forEach(j => {
                const mastered = ctx.player.masteredJobs.includes(j.id) ? '★' : ctx.player.jobHistory.includes(j.id) ? '○' : ' '
                log.info(`  ${mastered} ${j.name}：${j.description}`)
              })
            }
          }
        })
      } else {
        log.system('圖鑑分類：codex monsters | codex jobs')
      }
    })
  }
})

registerCommand('auto_combat', {
  verb: 'auto_combat', aliases: ['ac'], category: 'system',
  description: '切換自動戰鬥（需重生 5 次解鎖）',
  usage: 'auto_combat [on|off] [strategy <attack|defend_low_hp>]',
  handler: (args, ctx) => {
    const p = ctx.player
    if (!p.flags['unlock_auto_combat']) {
      log.warning('自動戰鬥尚未解鎖（需重生 5 次）')
      return
    }
    if (args[0] === 'strategy' && args[1]) {
      p.flags['auto_combat_strategy'] = args[1]
      log.success(`自動戰鬥策略設為：${args[1]}`)
    } else if (args[0] === 'on') {
      p.flags['auto_combat'] = true
      log.success('⚡ 自動戰鬥已啟用')
    } else if (args[0] === 'off') {
      p.flags['auto_combat'] = false
      log.info('⏸ 自動戰鬥已暫停')
    } else {
      const on = p.flags['auto_combat'] !== false
      p.flags['auto_combat'] = !on
      log.success(p.flags['auto_combat'] ? '⚡ 自動戰鬥已啟用' : '⏸ 自動戰鬥已暫停')
    }
  }
})

registerCommand('auto_explore', {
  verb: 'auto_explore', aliases: ['ae'], category: 'system',
  description: '切換自動探索循環（需重生 10 次解鎖）',
  usage: 'auto_explore [on|off]',
  handler: (args, ctx) => {
    const p = ctx.player
    if (!p.flags['unlock_auto_explore']) {
      log.warning('自動探索尚未解鎖（需重生 10 次）')
      return
    }
    if (args[0] === 'on') {
      p.flags['auto_explore'] = true
      log.success('⚡ 自動探索已啟用')
    } else if (args[0] === 'off') {
      p.flags['auto_explore'] = false
      log.info('⏸ 自動探索已暫停')
    } else {
      const on = p.flags['auto_explore'] !== false
      p.flags['auto_explore'] = !on
      log.success(p.flags['auto_explore'] ? '⚡ 自動探索已啟用' : '⏸ 自動探索已暫停')
    }
  }
})

registerCommand('settings', {
  verb: 'settings', aliases: ['設定'], category: 'system',
  description: '遊戲設定',
  usage: 'settings [theme <green|amber|white>]',
  handler: (args, _ctx) => {
    import('../../core/logger').then(({ log }) => {
      if (args[0] === 'theme' && args[1]) {
        const themes: Record<string, string> = { green: '', amber: 'theme-amber', white: 'theme-white' }
        const cls = themes[args[1]]
        if (cls !== undefined) {
          document.body.className = cls
          log.success(`已切換主題：${args[1]}`)
        } else {
          log.warning('可用主題：green / amber / white')
        }
      } else {
        log.system('設定選項：settings theme <green|amber|white>')
      }
    })
  }
})
