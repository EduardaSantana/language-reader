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

export function pickSentenceForOrder(stories, readIndices, lang) {
  const candidates = stories.filter((s) => s.lang === lang && readIndices.has(s.idx) && s.sentences.length > 0)
  if (candidates.length === 0) return null
  const story = candidates[Math.floor(Math.random() * candidates.length)]
  const sentence = story.sentences[Math.floor(Math.random() * story.sentences.length)]
  const tiles = sentence.filter((seg) => seg.text.trim() !== '')
  if (tiles.length < 2) return null
  return { story, tiles }
}

export function pickOddOneOut(pool, lang) {
  const langPool = pool.filter((e) => e.lang === lang)
  const byStory = new Map()
  for (const e of langPool) {
    if (!byStory.has(e.storyIndex)) byStory.set(e.storyIndex, [])
    byStory.get(e.storyIndex).push(e)
  }
  const groups = [...byStory.entries()].filter(([, list]) => list.length >= 3)
  if (groups.length === 0) return null
  const [storyIndex, group] = groups[Math.floor(Math.random() * groups.length)]
  const three = shuffle(group).slice(0, 3)
  const others = langPool.filter((e) => e.storyIndex !== storyIndex)
  if (others.length === 0) return null
  const oddOne = others[Math.floor(Math.random() * others.length)]
  const choices = shuffle([...three, oddOne])
  return { choices, oddWord: oddOne.word }
}

export function pickFillInBlank(stories, readIndices, lang, pool) {
  const candidates = shuffle(stories.filter((s) => s.lang === lang && readIndices.has(s.idx)))
  for (const story of candidates) {
    const glossedSentences = story.sentences
      .map((sentence) => sentence.map((seg, i) => ({ seg, i })).filter((x) => x.seg.gloss && x.seg.text.trim()))
      .filter((glossed) => glossed.length > 0)
    if (glossedSentences.length === 0) continue
    const glossed = glossedSentences[Math.floor(Math.random() * glossedSentences.length)]
    const blank = glossed[Math.floor(Math.random() * glossed.length)]
    const sentenceIdx = story.sentences.findIndex((s) => s.some((seg, i) => seg === blank.seg && i === blank.i))
    const langPool = pool.filter((e) => e.lang === lang && e.word !== blank.seg.text)
    if (langPool.length < 1) continue
    const distractors = shuffle(langPool).slice(0, 3).map((e) => e.word)
    const choices = shuffle([blank.seg.text, ...distractors])
    return { story, sentence: story.sentences[sentenceIdx], blankIndex: blank.i, answer: blank.seg.text, choices }
  }
  return null
}

export function pickCategorySort(pool, lang, stories, bucketCount = 2, itemsPerBucket = 3) {
  const langPool = pool.filter((e) => e.lang === lang)
  const byStory = new Map()
  for (const e of langPool) {
    if (!byStory.has(e.storyIndex)) byStory.set(e.storyIndex, [])
    byStory.get(e.storyIndex).push(e)
  }
  const eligible = [...byStory.entries()].filter(([, list]) => list.length >= itemsPerBucket)
  if (eligible.length < bucketCount) return null
  const chosen = shuffle(eligible).slice(0, bucketCount)
  const buckets = chosen.map(([storyIndex, list], i) => {
    const story = stories.find((s) => s.idx === storyIndex)
    return {
      bucketId: i,
      storyIndex,
      label: story ? `${story.emoji ? story.emoji + ' ' : ''}${story.titleEn}` : `Story ${storyIndex}`,
      items: shuffle(list).slice(0, itemsPerBucket),
    }
  })
  const allItems = shuffle(buckets.flatMap((b) => b.items.map((item) => ({ ...item, bucketId: b.bucketId }))))
  return { buckets, items: allItems }
}

export function pickKanjiBuild(kanjiComponents, kanjiMeanings) {
  if (kanjiComponents.length === 0) return null
  const target = kanjiComponents[Math.floor(Math.random() * kanjiComponents.length)]
  const correct = target.components
  const otherComponents = [...new Set(kanjiComponents.flatMap((k) => k.components).filter((c) => !correct.includes(c)))]
  const distractorCount = Math.min(3, otherComponents.length)
  const distractors = shuffle(otherComponents).slice(0, distractorCount)
  const choices = shuffle([...correct, ...distractors])
  return {
    kanji: target.kanji,
    kanjiMeaning: kanjiMeanings?.kanji?.[target.kanji] ?? null,
    correctComponents: correct,
    componentMeanings: kanjiMeanings?.components ?? {},
    choices,
  }
}

export function pickOnomatopoeia(entries) {
  if (entries.length < 4) return null
  const target = entries[Math.floor(Math.random() * entries.length)]
  const others = entries.filter((e) => e.word !== target.word)
  const distractors = shuffle(others).slice(0, 3)
  const choices = shuffle([target, ...distractors])
  return { target, choices }
}

export function pickCompoundBuild(compounds) {
  if (compounds.length === 0) return null
  const target = compounds[Math.floor(Math.random() * compounds.length)]
  const correctParts = target.parts.map((p) => p.text)
  const otherParts = compounds
    .filter((c) => c.word !== target.word)
    .flatMap((c) => c.parts)
    .filter((p) => !correctParts.includes(p.text))
  const distractorCount = Math.min(2, otherParts.length)
  const distractors = shuffle(otherParts).slice(0, distractorCount)
  const meanings = Object.fromEntries([...target.parts, ...distractors].map((p) => [p.text, p.meaning]))
  const choices = shuffle([...correctParts, ...distractors.map((p) => p.text)])
  return { word: target.word, english: target.english, correctParts, choices, meanings }
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

export const COMPANION_STORY_LINES = [
  'Nice, another one finished.',
  "That's one more in the books.",
  "Good read — on to the next whenever you're ready.",
  'Glad you got through that one.',
]

export function randomCompanionLine(lines) {
  return lines[Math.floor(Math.random() * lines.length)]
}
