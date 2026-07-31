export function shuffle(arr) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function pickRound(pool, lang) {
  const langPool = pool.filter((e) => e.lang === lang)
  if (langPool.length === 0) return null
  const target = langPool[Math.floor(Math.random() * langPool.length)]
  const others = langPool.filter((e) => e.word !== target.word)
  const distractors = shuffle(others).slice(0, 3)
  const choices = shuffle([target, ...distractors])
  return { target, choices }
}

export function pickMatchingSet(pool, lang, pairCount = 6) {
  const langPool = pool.filter((e) => e.lang === lang)
  if (langPool.length < 2) return null
  return shuffle(langPool).slice(0, Math.min(pairCount, langPool.length))
}

export function pickSentenceForOrder(stories, openedIndices, lang) {
  const candidates = stories.filter(
    (s) => s.lang === lang && openedIndices.has(s.idx) && s.sentences.length > 0,
  )
  if (candidates.length === 0) return null
  const story = candidates[Math.floor(Math.random() * candidates.length)]
  const sentence = story.sentences[Math.floor(Math.random() * story.sentences.length)]
  const tiles = sentence.filter((seg) => seg.text.trim() !== '')
  if (tiles.length < 2) return null
  return { story, tiles }
}

export const COMPANION_CORRECT_LINES = [
  "Yes! That's it.",
  'Nice — you got it.',
  "That's right, nicely done.",
  'Exactly right!',
  "You've got this one down.",
]

export const COMPANION_WRONG_LINES = [
  'Close — this one was tricky.',
  'Not quite, but good guess.',
  "That's an easy one to mix up.",
  'All good — on to the next.',
  "No worries, that one's a new one.",
]

export function randomCompanionLine(lines) {
  return lines[Math.floor(Math.random() * lines.length)]
}
