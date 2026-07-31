export function buildDictionary(stories) {
  const seen = new Map()
  for (const story of stories) {
    for (const v of story.vocab) {
      const key = `${story.lang}:${v.word}`
      if (seen.has(key)) continue
      seen.set(key, {
        word: v.word,
        reading: v.reading,
        english: v.english,
        lang: story.lang,
        level: story.level,
        storyIndex: story.idx,
      })
    }
  }
  return [...seen.values()]
}

export function matchesDictionaryQuery(entry, query) {
  const q = query.trim()
  if (!q) return true
  const qLower = q.toLowerCase()
  return (
    entry.word.toLowerCase().includes(qLower) ||
    (entry.reading && entry.reading.toLowerCase().includes(qLower)) ||
    entry.english.toLowerCase().includes(qLower)
  )
}
