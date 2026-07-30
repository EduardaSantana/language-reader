const KANJI_RE = /[一-龯]/

export function extractKanji(text) {
  const found = new Set()
  for (const ch of text) {
    if (KANJI_RE.test(ch)) found.add(ch)
  }
  return found
}

export function extractKanjiFromStory(story) {
  const found = new Set()
  for (const sentence of story.sentences) {
    for (const seg of sentence) {
      for (const ch of extractKanji(seg.text)) found.add(ch)
    }
  }
  return found
}

let cachedAllKanji = null

export function getAllKanji(stories) {
  if (cachedAllKanji) return cachedAllKanji
  const map = new Map()
  stories.forEach((story, storyIndex) => {
    for (const ch of extractKanjiFromStory(story)) {
      if (!map.has(ch)) map.set(ch, storyIndex)
    }
  })
  cachedAllKanji = [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'ja'))
    .map(([char, sourceStoryIndex]) => ({ char, sourceStoryIndex }))
  return cachedAllKanji
}
