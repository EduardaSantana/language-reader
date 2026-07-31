function shuffle(arr) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function pickRound(pool) {
  if (pool.length === 0) return null
  const target = pool[Math.floor(Math.random() * pool.length)]
  const sameLangOthers = pool.filter((e) => e.lang === target.lang && e.word !== target.word)
  const distractors = shuffle(sameLangOthers).slice(0, 3)
  const choices = shuffle([target, ...distractors])
  return { target, choices }
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
