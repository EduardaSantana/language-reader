function normalizeStory(raw, defaultLang) {
  const lang = raw.lang ?? defaultLang
  return {
    lang,
    level: raw.level,
    index: raw.index,
    titleNative: raw.title_ja ?? raw.title_native,
    titleEn: raw.title_en,
    emoji: raw.emoji ?? null,
    sentences: raw.sentences.map((sentence) =>
      sentence.map((seg) => ({
        text: seg.text,
        reading: seg.furigana ?? seg.annotation ?? null,
        gloss: seg.gloss ?? null,
      })),
    ),
    vocab: raw.vocab.map((v) => ({
      word: v.word,
      reading: v.reading ?? v.annotation ?? null,
      english: v.english,
    })),
  }
}

export function mergeStorySets(sets) {
  const normalized = sets.flatMap(({ stories, lang }) => stories.map((s) => normalizeStory(s, lang)))
  normalized.sort((a, b) => {
    if (a.lang !== b.lang) return a.lang < b.lang ? -1 : 1
    if (a.level !== b.level) return a.level - b.level
    return a.index - b.index
  })
  return normalized.map((story, idx) => ({ ...story, idx }))
}
