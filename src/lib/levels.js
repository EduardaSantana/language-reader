const LEVEL_NAMES = {
  0: 'Start',
  1: 'Beginner',
}

const LEVEL_COLORS = {
  0: '#22c55e',
  1: '#3b82f6',
}

const FALLBACK_COLORS = ['#a855f7', '#f59e0b', '#ec4899', '#06b6d4', '#f43f5e']

export function levelMeta(level) {
  const name = LEVEL_NAMES[level] ?? `Level ${level}`
  const color = LEVEL_COLORS[level] ?? FALLBACK_COLORS[level % FALLBACK_COLORS.length]
  return { name, color }
}

export function getAvailableLevels(stories) {
  return [...new Set(stories.map((s) => s.level))].sort((a, b) => a - b)
}

export function getLevelsPerLang(stories) {
  const byLang = {}
  for (const story of stories) {
    if (!byLang[story.lang]) byLang[story.lang] = new Set()
    byLang[story.lang].add(story.level)
  }
  const result = {}
  for (const [lang, levels] of Object.entries(byLang)) {
    result[lang] = [...levels].sort((a, b) => a - b)
  }
  return result
}
