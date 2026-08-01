const WORD_RE = /[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu

const ARTICLES = new Set([
  'le', 'la', 'les', "l'", "l’", 'un', 'une', 'des',
  'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einer', 'einem',
  'a', 'an', 'the',
])

const ELISION_PREFIX_RE = /^([a-zà-öø-ÿ]{1,2})['’](.+)$/i

function stripAccents(str) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function normalizeKey(str) {
  return stripAccents(str.toLowerCase().trim())
}

/** Splits sentence text into { text, isWord } chunks. Non-word chunks (spaces, punctuation) are left as-is. */
export function tokenizeWords(text) {
  const tokens = []
  let lastIndex = 0
  for (const match of text.matchAll(WORD_RE)) {
    if (match.index > lastIndex) {
      tokens.push({ text: text.slice(lastIndex, match.index), isWord: false })
    }
    tokens.push({ text: match[0], isWord: true })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    tokens.push({ text: text.slice(lastIndex), isWord: false })
  }
  return tokens
}

/** Builds a normalized lookup map from a story's vocab list, keyed by word forms likely to appear in running text. */
export function buildVocabLookup(vocab) {
  const map = new Map()
  const set = (key, entry) => {
    const k = normalizeKey(key)
    if (k && !map.has(k)) map.set(k, entry)
  }

  for (const v of vocab ?? []) {
    const entry = { word: v.word, reading: v.reading, english: v.english }
    set(v.word, entry)

    const words = v.word.split(/\s+/).filter(Boolean)
    if (words.length > 1) {
      for (const w of words) {
        if (w.length > 2 && !ARTICLES.has(normalizeKey(w))) set(w, entry)
      }
      set(words[words.length - 1], entry)
    } else {
      const stripped = v.word.replace(ELISION_PREFIX_RE, '$2')
      if (stripped !== v.word) set(stripped, entry)
      if (v.word.endsWith('s') || v.word.endsWith('x')) set(v.word.slice(0, -1), entry)
    }
  }
  return map
}

/** Looks up a tapped word against a vocab lookup map, trying a few light normalizations. */
export function lookupWord(map, rawWord) {
  const direct = map.get(normalizeKey(rawWord))
  if (direct) return direct

  const elisionMatch = rawWord.match(ELISION_PREFIX_RE)
  if (elisionMatch) {
    const stripped = map.get(normalizeKey(elisionMatch[2]))
    if (stripped) return stripped
  }

  if (rawWord.endsWith('s') || rawWord.endsWith('x')) {
    const singular = map.get(normalizeKey(rawWord.slice(0, -1)))
    if (singular) return singular
  }

  return null
}
