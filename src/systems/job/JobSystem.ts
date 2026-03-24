import Decimal from 'decimal.js'
import { D } from '../../core/bignum'
import { bus } from '../../core/eventbus'
import { log } from '../../core/logger'
import type { PlayerState, JobDefinition } from '../../types'
import { JOB_DEFINITIONS, getJobById } from './JobData'

// 檢查是否可以轉職
export function canChangeJob(player: PlayerState, jobId: string): { ok: boolean; reason?: string } {
  const job = getJobById(jobId)
  if (!job) return { ok: false, reason: '職業不存在' }

  for (const req of job.requirements) {
    if (req.type === 'level') {
      if (player.level.lt(req.value as number)) {
        return { ok: false, reason: `需要 Lv.${req.value}（目前 ${player.level.toFixed(0)}）` }
      }
    }
    if (req.type === 'job') {
      if (!player.jobHistory.includes(req.target!)) {
        return { ok: false, reason: `需要曾任職「${getJobById(req.target!)?.name ?? req.target}」` }
      }
    }
    if (req.type === 'mastered_job') {
      if (!player.masteredJobs.includes(req.target!)) {
        return { ok: false, reason: `需要精通「${getJobById(req.target!)?.name ?? req.target}」` }
      }
    }
    if (req.type === 'rebirth') {
      if (player.rebirthCount < (req.value as number)) {
        return { ok: false, reason: `需要重生 ${req.value} 次` }
      }
    }
    if (req.type === 'quest') {
      if (!player.completedQuestIds.includes(req.target!)) {
        return { ok: false, reason: `需要完成任務「${req.target}」` }
      }
    }
  }
  return { ok: true }
}

// 執行轉職
export function changeJob(player: PlayerState, jobId: string): boolean {
  const check = canChangeJob(player, jobId)
  if (!check.ok) {
    log.warning(`無法轉職：${check.reason}`)
    return false
  }
  const oldJob = player.jobId
  player.jobId = jobId
  if (!player.jobHistory.includes(jobId)) {
    player.jobHistory.push(jobId)
  }
  // 職業等級重置（每個職業有獨立等級，存在 Map 中；此處重置當前顯示等級）
  player.jobLevel = D(1)
  player.jobXp = D(0)
  player.jobXpToNext = D(100)

  bus.emit('player:job_change', { oldJob, newJob: jobId })
  const jobDef = getJobById(jobId)!
  log.success(`✦ 轉職成功！你現在是「${jobDef.name}」`)
  log.story(jobDef.lore)
  return true
}

// 授予職業 XP
export function grantJobXP(player: PlayerState, amount: Decimal): void {
  player.jobXp = player.jobXp.plus(amount)
  while (player.jobXp.gte(player.jobXpToNext)) {
    player.jobXp = player.jobXp.minus(player.jobXpToNext)
    player.jobLevel = player.jobLevel.plus(1)
    player.jobXpToNext = player.jobXpToNext.times(1.15).ceil()

    // 檢查職業精通（達到 100 級）
    if (player.jobLevel.gte(100) && !player.masteredJobs.includes(player.jobId)) {
      player.masteredJobs.push(player.jobId)
      const jobDef = getJobById(player.jobId)
      log.success(`★ 精通成就！你精通了「${jobDef?.name ?? player.jobId}」，解鎖特殊能力！`)
    }
    log.info(`職業升級！${getJobById(player.jobId)?.name} Lv.${player.jobLevel.toFixed(0)}`)
  }
}

// 取得可轉職業列表
export function listAvailableJobs(player: PlayerState): string[] {
  return Object.values(JOB_DEFINITIONS)
    .filter(j => j.id !== player.jobId && canChangeJob(player, j.id).ok)
    .map(j => j.id)
}

// 取得鎖定職業與原因
export function listLockedJobs(player: PlayerState): { job: JobDefinition; reason: string }[] {
  return Object.values(JOB_DEFINITIONS)
    .filter(j => j.id !== player.jobId)
    .map(j => {
      const check = canChangeJob(player, j.id)
      return check.ok ? null : { job: j, reason: check.reason! }
    })
    .filter(Boolean) as { job: JobDefinition; reason: string }[]
}
