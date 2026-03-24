import type { JobDefinition } from '../../types'

export const JOB_DEFINITIONS: Record<string, JobDefinition> = {
  // ── Tier 1 ───────────────────────────────────────────
  warrior: {
    id: 'warrior', name: '戰士', tier: 1,
    description: '以力量與鋼鐵為武器的基礎戰鬥者。',
    requirements: [],
    statGrowth: { hp: 15, atk: 8, def: 6, spd: 2 },
    passiveSkillIds: ['passive_tough'],
    activeSkillIds: ['skill_slash'],
    lore: '踏上冒險之路的第一步，以劍與盾開拓命運。',
  },
  mage: {
    id: 'mage', name: '法師', tier: 1,
    description: '操縱魔法的知識探求者。',
    requirements: [],
    statGrowth: { mp: 20, matk: 10, mdef: 4, spd: 2 },
    passiveSkillIds: ['passive_mana_flow'],
    activeSkillIds: ['skill_fireball'],
    lore: '魔法是一種語言，而世界是它的書頁。',
  },
  rogue: {
    id: 'rogue', name: '盜賊', tier: 1,
    description: '身形敏捷、擅長偷襲的暗影追蹤者。',
    requirements: [],
    statGrowth: { spd: 8, atk: 7, lck: 5, dodge: 3 },
    passiveSkillIds: ['passive_nimble'],
    activeSkillIds: ['skill_backstab'],
    lore: '黑暗是最好的盔甲，而速度是最快的劍。',
  },
  cleric: {
    id: 'cleric', name: '牧師', tier: 1,
    description: '以神聖之力治癒同伴的信仰之人。',
    requirements: [],
    statGrowth: { hp: 10, mp: 15, mdef: 6, lck: 4 },
    passiveSkillIds: ['passive_holy_light'],
    activeSkillIds: ['skill_heal'],
    lore: '光明所及之處，黑暗自然退散。',
  },
  ranger: {
    id: 'ranger', name: '弓箭手', tier: 1,
    description: '精準遠程打擊的自然守護者。',
    requirements: [],
    statGrowth: { atk: 7, spd: 6, lck: 5, acc: 3 },
    passiveSkillIds: ['passive_eagle_eye'],
    activeSkillIds: ['skill_arrow_shot'],
    lore: '一箭穿心，千里之外。',
  },
  merchant: {
    id: 'merchant', name: '商人', tier: 1,
    description: '以財富與機智游走世界的貿易者。',
    requirements: [],
    statGrowth: { hp: 5, lck: 10, spd: 4 },
    passiveSkillIds: ['passive_bargain'],
    activeSkillIds: ['skill_throw_coin'],
    lore: '黃金是最鋒利的武器。',
  },
  // ── Tier 2 ───────────────────────────────────────────
  swordsman: {
    id: 'swordsman', name: '劍士', tier: 2,
    description: '精通劍技的近戰專家。',
    requirements: [
      { type: 'job', target: 'warrior', value: 1 },
      { type: 'level', value: 30 },
    ],
    statGrowth: { hp: 12, atk: 12, def: 8, spd: 4 },
    passiveSkillIds: ['passive_sword_mastery'],
    activeSkillIds: ['skill_double_slash', 'skill_parry'],
    lore: '劍即是我，我即是劍。',
  },
  wizard: {
    id: 'wizard', name: '巫師', tier: 2,
    description: '掌握多種元素魔法的進階法師。',
    requirements: [
      { type: 'job', target: 'mage', value: 1 },
      { type: 'level', value: 30 },
    ],
    statGrowth: { mp: 25, matk: 15, mdef: 6, spd: 3 },
    passiveSkillIds: ['passive_arcane_mastery'],
    activeSkillIds: ['skill_ice_lance', 'skill_thunder'],
    lore: '魔法的邊界只在於想像力的邊界。',
  },
  assassin: {
    id: 'assassin', name: '刺客', tier: 2,
    description: '以致命一擊終結敵人的暗殺者。',
    requirements: [
      { type: 'job', target: 'rogue', value: 1 },
      { type: 'level', value: 30 },
    ],
    statGrowth: { atk: 14, spd: 10, crit: 8, critDmg: 15 },
    passiveSkillIds: ['passive_lethal_strike'],
    activeSkillIds: ['skill_shadowstep', 'skill_poison_blade'],
    lore: '死亡只是另一種形式的藝術。',
  },
  priest: {
    id: 'priest', name: '祭司', tier: 2,
    description: '強化神聖魔法的進階治療者。',
    requirements: [
      { type: 'job', target: 'cleric', value: 1 },
      { type: 'level', value: 30 },
    ],
    statGrowth: { hp: 8, mp: 20, mdef: 10, lck: 6 },
    passiveSkillIds: ['passive_divine_protection'],
    activeSkillIds: ['skill_holy_strike', 'skill_regen'],
    lore: '神的憐憫延伸至信徒所站之地。',
  },
  hunter: {
    id: 'hunter', name: '獵人', tier: 2,
    description: '追蹤與馴服怪物的野外專家。',
    requirements: [
      { type: 'job', target: 'ranger', value: 1 },
      { type: 'level', value: 30 },
    ],
    statGrowth: { atk: 10, spd: 8, lck: 8, acc: 5 },
    passiveSkillIds: ['passive_tracking', 'passive_tame_beast'],
    activeSkillIds: ['skill_rapid_fire', 'skill_trap'],
    lore: '獵人永遠不是最快的，但永遠是最準的。',
  },
  monk: {
    id: 'monk', name: '武僧', tier: 2,
    description: '肉體即武器，精神即鎧甲的修行者。',
    requirements: [
      { type: 'job', target: 'warrior', value: 1 },
      { type: 'job', target: 'cleric', value: 1 },
      { type: 'level', value: 35 },
    ],
    statGrowth: { hp: 14, atk: 10, def: 8, spd: 7, lck: 5 },
    passiveSkillIds: ['passive_iron_body'],
    activeSkillIds: ['skill_combo_strike', 'skill_meditate'],
    lore: '不動如山，動如雷電。',
  },
  bard: {
    id: 'bard', name: '吟遊詩人', tier: 2,
    description: '以音樂激勵同伴的多才多藝者。',
    requirements: [
      { type: 'job', target: 'mage', value: 1 },
      { type: 'job', target: 'rogue', value: 1 },
      { type: 'level', value: 35 },
    ],
    statGrowth: { mp: 15, matk: 8, spd: 8, lck: 8 },
    passiveSkillIds: ['passive_inspire'],
    activeSkillIds: ['skill_battle_hymn', 'skill_lullaby'],
    lore: '音符可以比劍更銳利。',
  },
  // ── Tier 3 ───────────────────────────────────────────
  knight: {
    id: 'knight', name: '騎士', tier: 3,
    description: '以榮譽守護同伴的鋼鐵堡壘。',
    requirements: [
      { type: 'mastered_job', target: 'swordsman', value: 1 },
      { type: 'level', value: 80 },
      { type: 'quest', target: 'quest_knights_oath', value: 1 },
    ],
    statGrowth: { hp: 20, atk: 15, def: 18, spd: 5 },
    passiveSkillIds: ['passive_shield_wall', 'passive_chivalry'],
    activeSkillIds: ['skill_shield_bash', 'skill_holy_blade', 'skill_provoke'],
    lore: '劍指蒼天，盾護大地。',
  },
  archmage: {
    id: 'archmage', name: '大魔導士', tier: 3,
    description: '掌握奧術之巔的偉大魔法師。',
    requirements: [
      { type: 'mastered_job', target: 'wizard', value: 1 },
      { type: 'level', value: 80 },
      { type: 'quest', target: 'quest_arcane_trial', value: 1 },
    ],
    statGrowth: { mp: 35, matk: 22, mdef: 12, spd: 5 },
    passiveSkillIds: ['passive_mana_overload', 'passive_spell_echo'],
    activeSkillIds: ['skill_meteor', 'skill_time_stop', 'skill_mana_surge'],
    lore: '宇宙的奧秘，盡在掌握之中。',
  },
  shadow: {
    id: 'shadow', name: '暗影', tier: 3,
    description: '與黑暗融為一體的終極刺客。',
    requirements: [
      { type: 'mastered_job', target: 'assassin', value: 1 },
      { type: 'level', value: 80 },
    ],
    statGrowth: { atk: 20, spd: 15, crit: 12, critDmg: 25, dodge: 8 },
    passiveSkillIds: ['passive_shadow_form', 'passive_death_mark'],
    activeSkillIds: ['skill_void_strike', 'skill_shadow_clone', 'skill_mark_kill'],
    lore: '影子不會說謊，因為它本身就是真相。',
  },
  bishop: {
    id: 'bishop', name: '主教', tier: 3,
    description: '以神聖力量掌控戰場的宗教領袖。',
    requirements: [
      { type: 'mastered_job', target: 'priest', value: 1 },
      { type: 'level', value: 80 },
    ],
    statGrowth: { hp: 15, mp: 30, matk: 12, mdef: 18, lck: 10 },
    passiveSkillIds: ['passive_sanctify', 'passive_holy_aura'],
    activeSkillIds: ['skill_mass_heal', 'skill_resurrection', 'skill_holy_storm'],
    lore: '神的意志，由我傳遞。',
  },
  beastmaster: {
    id: 'beastmaster', name: '御獸師', tier: 3,
    description: '與怪物共生共榮的傳奇馴獸師。',
    requirements: [
      { type: 'mastered_job', target: 'hunter', value: 1 },
      { type: 'level', value: 80 },
    ],
    statGrowth: { atk: 12, spd: 10, lck: 15, hp: 12 },
    passiveSkillIds: ['passive_beast_bond', 'passive_pack_leader'],
    activeSkillIds: ['skill_beast_call', 'skill_evolve_companion', 'skill_wild_rage'],
    lore: '所有生命皆是夥伴，沒有野獸，只有未被理解的靈魂。',
  },
  necromancer: {
    id: 'necromancer', name: '死靈法師', tier: 3,
    description: '驅使亡者之力的禁忌術士。',
    requirements: [
      { type: 'mastered_job', target: 'wizard', value: 1 },
      { type: 'job', target: 'priest', value: 1 },
      { type: 'level', value: 85 },
      { type: 'quest', target: 'quest_forbidden_tome', value: 1 },
    ],
    statGrowth: { mp: 28, matk: 18, mdef: 10, lck: 8 },
    passiveSkillIds: ['passive_undead_mastery', 'passive_life_drain'],
    activeSkillIds: ['skill_raise_dead', 'skill_death_nova', 'skill_soul_harvest'],
    lore: '死亡只是另一段旅程的開始。',
  },
  // ── Tier 4 ───────────────────────────────────────────
  dragon_knight: {
    id: 'dragon_knight', name: '龍騎士', tier: 4,
    description: '以龍之威能震撼戰場的偉大騎士。',
    requirements: [
      { type: 'mastered_job', target: 'knight', value: 1 },
      { type: 'level', value: 200 },
      { type: 'quest', target: 'quest_dragon_covenant', value: 1 },
      { type: 'rebirth', value: 3 },
    ],
    statGrowth: { hp: 30, atk: 25, def: 20, matk: 15, spd: 8 },
    passiveSkillIds: ['passive_dragon_scales', 'passive_dragon_heart'],
    activeSkillIds: ['skill_dragon_breath', 'skill_dragon_roar', 'skill_ascension'],
    lore: '龍與騎士，共鑄傳說。',
  },
  grand_wizard: {
    id: 'grand_wizard', name: '魔法宗師', tier: 4,
    description: '超越人類極限的絕頂魔法師。',
    requirements: [
      { type: 'mastered_job', target: 'archmage', value: 1 },
      { type: 'level', value: 200 },
      { type: 'rebirth', value: 3 },
    ],
    statGrowth: { mp: 50, matk: 35, mdef: 20, spd: 8 },
    passiveSkillIds: ['passive_reality_warp', 'passive_infinite_mana'],
    activeSkillIds: ['skill_big_bang', 'skill_time_rewind', 'skill_void_rift'],
    lore: '魔法本是宇宙的基礎，我只是學會了說它的語言。',
  },
  // ── Tier 5 / 超越 ────────────────────────────────────
  demigod: {
    id: 'demigod', name: '半神', tier: 5,
    description: '超越凡人極限，觸碰神性邊緣的存在。',
    requirements: [
      { type: 'rebirth', value: 100 },
      { type: 'level', value: 1000 },
      { type: 'quest', target: 'quest_transcendence', value: 1 },
    ],
    statGrowth: { hp: 100, mp: 100, atk: 80, def: 70, matk: 80, mdef: 70, spd: 30, lck: 50 },
    passiveSkillIds: ['passive_divine_body', 'passive_immortal_will'],
    activeSkillIds: ['skill_divine_judgment', 'skill_realm_break', 'skill_god_force'],
    lore: '凡人的終點，神的起點。',
  },
  void_walker: {
    id: 'void_walker', name: '虛空行者', tier: 5,
    description: '穿越虛空維度的神秘存在。',
    requirements: [
      { type: 'rebirth', value: 100 },
      { type: 'mastered_job', target: 'shadow', value: 1 },
      { type: 'mastered_job', target: 'grand_wizard', value: 1 },
    ],
    statGrowth: { atk: 60, matk: 60, spd: 50, crit: 30, critDmg: 100, dodge: 20 },
    passiveSkillIds: ['passive_void_step', 'passive_reality_phase'],
    activeSkillIds: ['skill_dimension_slash', 'skill_void_storm', 'skill_time_lock'],
    lore: '此地非此地，此時非此時。',
  },
}

export function getJobById(id: string): JobDefinition | undefined {
  return JOB_DEFINITIONS[id]
}

export function getJobsByTier(tier: number): JobDefinition[] {
  return Object.values(JOB_DEFINITIONS).filter(j => j.tier === tier)
}
