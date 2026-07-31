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

const GOJUUON_ROWS = {
  あいうえおぁぃぅぇぉ: 'あ',
  かきくけこがぎぐげご: 'か',
  さしすせそざじずぜぞ: 'さ',
  たちつてとだぢづでどっ: 'た',
  なにぬねの: 'な',
  はひふへほばびぶべぼぱぴぷぺぽ: 'は',
  まみむめも: 'ま',
  やゆよゃゅょ: 'や',
  らりるれろ: 'ら',
  わをんゐゑ: 'わ',
}

const GOJUUON_ROW_MAP = Object.fromEntries(
  Object.entries(GOJUUON_ROWS).flatMap(([chars, row]) => [...chars].map((ch) => [ch, row])),
)

function toHiraganaChar(ch) {
  const code = ch.codePointAt(0)
  if (code >= 0x30a1 && code <= 0x30fa) return String.fromCodePoint(code - 0x60)
  return ch
}

export function gojuuonRow(char) {
  const hira = toHiraganaChar(char)
  return GOJUUON_ROW_MAP[hira] ?? hira
}

export function sortDictionary(entries) {
  return [...entries].sort((a, b) => {
    if (a.lang !== b.lang) return a.lang < b.lang ? -1 : 1
    const aKey = a.reading || a.word
    const bKey = b.reading || b.word
    return aKey.localeCompare(bKey, a.lang === 'ja' ? 'ja' : 'de')
  })
}

export function buildLetterIndex(sortedEntries) {
  const index = []
  const seen = new Set()
  sortedEntries.forEach((entry, i) => {
    const firstChar = (entry.reading || entry.word)[0]
    const label = entry.lang === 'ja' ? gojuuonRow(firstChar) : firstChar.toUpperCase()
    const dedupeKey = `${entry.lang}:${label}`
    if (!seen.has(dedupeKey)) {
      seen.add(dedupeKey)
      index.push({ label, lang: entry.lang, firstIndex: i })
    }
  })
  return index
}
