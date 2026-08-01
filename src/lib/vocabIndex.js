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

// Vocab words are stored with their dictionary-form leading article baked in
// ("das Brot", "le beurre", "l'ami") — fine for display, but it collapses nearly
// every noun onto the same letter if used for sorting/grouping. Strip it for
// that purpose only.
const LEADING_ARTICLE_RE = {
  fr: /^(?:les?|la)\s+|^l['’]/i,
  de: /^(?:der|die|das|den|dem|des)\s+/i,
}

function stripLeadingArticle(word, lang) {
  const re = LEADING_ARTICLE_RE[lang]
  if (!re) return word
  const stripped = word.replace(re, '')
  return stripped || word
}

export function hasLeadingArticle(word, lang) {
  const re = LEADING_ARTICLE_RE[lang]
  return re ? re.test(word) : false
}

export { stripLeadingArticle }

// Only Japanese vocab carries a real phonetic reading (furigana) worth sorting by.
// French/German/Russian reuse this field for grammatical gender (m/f/n), which must
// never drive alphabetical order or letter grouping.
function sortKeySource(entry) {
  if (entry.lang === 'ja') return entry.reading || entry.word
  return stripLeadingArticle(entry.word, entry.lang)
}

export function sortDictionary(entries) {
  return [...entries].sort((a, b) => {
    if (a.lang !== b.lang) return a.lang < b.lang ? -1 : 1
    return sortKeySource(a).localeCompare(sortKeySource(b), a.lang)
  })
}

export function entryLetterLabel(entry) {
  const firstChar = sortKeySource(entry)[0]
  return entry.lang === 'ja' ? gojuuonRow(firstChar) : firstChar.toUpperCase()
}

export function buildLetterIndex(sortedEntries) {
  const index = []
  const seen = new Set()
  sortedEntries.forEach((entry, i) => {
    const label = entryLetterLabel(entry)
    const dedupeKey = `${entry.lang}:${label}`
    if (!seen.has(dedupeKey)) {
      seen.add(dedupeKey)
      index.push({ label, lang: entry.lang, firstIndex: i })
    }
  })
  return index
}
