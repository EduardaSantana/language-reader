export function matchesQuery(story, query) {
  const q = query.trim()
  if (!q) return true
  const qLower = q.toLowerCase()
  if (story.titleNative.toLowerCase().includes(qLower)) return true
  if (story.titleEn.toLowerCase().includes(qLower)) return true
  return story.vocab.some(
    (v) =>
      (v.word && v.word.includes(q)) ||
      (v.reading && v.reading.includes(q)) ||
      (v.english && v.english.toLowerCase().includes(qLower)),
  )
}
