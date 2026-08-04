// Phase 1 of docs/ENCYCLOPEDIA_IMPLEMENTATION_PLAN.md: the unified entry
// adapter. Maps every existing content shape (grammar points, oddities,
// comparative entries, vocab, kanji, alphabet/kana) into one entry shape —
// the schema locked in the design spec (docs/ENCYCLOPEDIA_DIRECTIONS.md):
//
//   { id, lang, type, title, reading, definition, examples,
//     depth: { why, mistake, sources }, relations: { prerequisiteOf, seeAlso, appearsIn },
//     confidence, source_doc }
//
// This is an ADAPTER, not a rewrite: it reads today's data files (and reuses
// exploreGraph.js's existing id scheme and relation-building logic) as-is and
// reshapes the result at runtime, same spirit as data.js's normalizeStory.
// No source JSON file changes shape because of this file.
//
// One deliberate naming deviation from the schema as originally sketched:
// `relations.prerequisiteOf` is a *reverse* index (which entries this one
// unlocks), built by inverting the existing `prerequisites` field (which
// entries this one depends on) — the forward field alone can't answer
// "what does learning this open up," which is what the name promises.

import kanjiComponents from '../data/kanji_components.json'
import kanjiMeaningsRaw from '../data/kanji_meanings.json'
import kanjiExamples from '../data/kanji_examples.json'
import alphabetRu from '../data/alphabet_ru.json'
import kanaJa from '../data/kana_ja.json'
import {
  buildExploreGraph,
  grammarPointsForLang,
  oddityPointsForLang,
  comparativeOddityPoints,
  vocabNodeId,
  grammarNodeId,
  oddityNodeId,
  comparativeNodeId,
  EXPLORE_LANGS,
} from './exploreGraph'

const KANJI_LANG = 'ja'
const ALPHABET_LANGS = { ru: alphabetRu, ja: kanaJa }

export function kanjiNodeId(kanji) {
  return `ja:kanji:${kanji}`
}

export function alphabetNodeId(lang, key) {
  return `${lang}:alphabet:${key}`
}

// ---- reverse prerequisite index: "what does finishing this unlock" ----
let prerequisiteOfIndex = null
function buildPrerequisiteOfIndex() {
  const index = {} // `${lang}:${id}` -> [{ id, lang, type, title }]
  for (const lang of EXPLORE_LANGS) {
    const points = grammarPointsForLang(lang)
    for (const p of points) {
      for (const prereqId of p.prerequisites ?? []) {
        const key = `${lang}:${prereqId}`
        if (!index[key]) index[key] = []
        index[key].push({ id: grammarNodeId(lang, p.id), lang, type: 'grammar', title: p.title })
      }
    }
  }
  return index
}
function prerequisiteOfFor(lang, id) {
  if (!prerequisiteOfIndex) prerequisiteOfIndex = buildPrerequisiteOfIndex()
  return prerequisiteOfIndex[`${lang}:${id}`] ?? []
}

// ---- shared reshape: exploreGraph's node shape -> the unified entry shape ----
function fromExploreNode(node, extra = {}) {
  if (!node) return null
  const sources = []
  if (node.source) sources.push({ label: node.source, confidence: node.confidence ?? null })
  return {
    id: node.id,
    lang: node.lang,
    type: node.type,
    title: node.title,
    reading: node.reading ?? null,
    gender: node.gender ?? null,
    definition: node.subtitle ?? null,
    examples: node.examples ?? [],
    depth: {
      why: node.note ?? null,
      mistake: node.mistake ?? null,
      sources,
    },
    relations: {
      prerequisites: node.prerequisiteRefs ?? [],
      prerequisiteOf: extra.rawId ? prerequisiteOfFor(node.lang, extra.rawId) : [],
      seeAlso: node.related ?? [],
      appearsIn: {
        stories: node.storyContext ? [node.storyContext] : [],
        oddities: (node.related ?? []).filter((r) => r.type === 'oddity'),
        games: node.relatedGameId ? [node.relatedGameId] : [],
      },
    },
    confidence: node.confidence ?? null,
    source_doc: extra.source_doc ?? null,
    branch: extra.branch ?? null,
    longForm: extra.longForm ?? null,
    // kept for screens that still need the pre-unified shape mid-migration
    // (e.g. comparative's per-language `entries`, prerequisiteRefs for the
    // "builds on" list) — additive, not a second source of truth.
    _raw: node,
  }
}

// ---- kanji ----
function kanjiToEntry(k) {
  const meanings = kanjiMeaningsRaw.kanji ?? {}
  const componentMeaningsAll = kanjiMeaningsRaw.components ?? {}
  const componentMeanings = Object.fromEntries(
    (k.components ?? []).map((c) => [c, componentMeaningsAll[c] ?? null]),
  )
  const examples = kanjiExamples[k.kanji]
  return {
    id: kanjiNodeId(k.kanji),
    lang: KANJI_LANG,
    type: 'kanji',
    title: k.kanji,
    reading: null,
    gender: null,
    definition: meanings[k.kanji] ?? null,
    examples: [],
    depth: {
      why: null,
      mistake: null,
      sources: [],
    },
    relations: { prerequisites: [], prerequisiteOf: [], seeAlso: [], appearsIn: { stories: [], oddities: [], games: [] } },
    confidence: 'first_pass',
    source_doc: null,
    kanji: {
      level: k.level,
      components: k.components,
      componentMeanings,
      onyomi: k.onyomi ?? null,
      kunyomi: k.kunyomi ?? null,
      onExample: examples?.on ?? null,
      kunExample: examples?.kun ?? null,
    },
  }
}

// ---- alphabet / kana ----
function alphabetToEntry(lang, item) {
  if (lang === 'ja') {
    return {
      id: alphabetNodeId(lang, item.hiragana),
      lang,
      type: 'alphabet',
      title: item.hiragana,
      reading: item.romaji,
      gender: null,
      definition: null,
      examples: [],
      depth: { why: null, mistake: null, sources: [] },
      relations: { prerequisites: [], prerequisiteOf: [], seeAlso: [], appearsIn: { stories: [], oddities: [], games: [] } },
      confidence: 'verified',
      source_doc: null,
      alphabet: { system: 'kana', katakana: item.katakana, romaji: item.romaji, row: item.row, kind: item.kind },
    }
  }
  // ru
  return {
    id: alphabetNodeId(lang, item.letter),
    lang,
    type: 'alphabet',
    title: item.letter,
    reading: item.romanization,
    gender: null,
    definition: item.name,
    examples: [],
    depth: { why: null, mistake: null, sources: [] },
    relations: { prerequisites: [], prerequisiteOf: [], seeAlso: [], appearsIn: { stories: [], oddities: [], games: [] } },
    confidence: 'verified',
    source_doc: null,
    alphabet: { system: 'cyrillic', lower: item.lower, name: item.name, romanization: item.romanization },
  }
}

/** Builds the unified entry accessor for a given normalized story set (same
 * input buildExploreGraph already takes). Returns { getEntry(id), listByLang(lang, type),
 * allIds, kanjiEntries, alphabetEntries(lang) }. */
export function buildUnifiedEntries(stories) {
  const graph = buildExploreGraph(stories)

  function getEntry(id) {
    const [lang, type, ...rest] = id.split(':')
    const key = rest.join(':')

    if (type === 'kanji') {
      const k = kanjiComponents.find((c) => c.kanji === key)
      return k ? kanjiToEntry(k) : null
    }
    if (type === 'alphabet') {
      const list = ALPHABET_LANGS[lang]
      if (!list) return null
      const item = lang === 'ja' ? list.find((c) => c.hiragana === key) : list.find((c) => c.letter === key)
      return item ? alphabetToEntry(lang, item) : null
    }

    const node = graph.getNode(id)
    if (!node) return null

    let source_doc = null
    let branch = null
    let longForm = null
    if (type === 'grammar') {
      const raw = grammarPointsForLang(lang).find((p) => p.id === key)
      source_doc = raw?.source_doc ?? null
      branch = raw?.branch ?? null
      longForm = raw?.long_form ?? null
    }
    return fromExploreNode(node, { rawId: type === 'grammar' ? key : null, source_doc, branch, longForm })
  }

  function listByLang(lang, type) {
    if (type === 'grammar') return grammarPointsForLang(lang).map((p) => getEntry(grammarNodeId(lang, p.id)))
    if (type === 'oddity') return oddityPointsForLang(lang).map((p) => getEntry(oddityNodeId(lang, p.id)))
    if (type === 'comparative') return comparativeOddityPoints().map((p) => getEntry(comparativeNodeId(p.id)))
    if (type === 'kanji' && lang === 'ja') return kanjiComponents.map((k) => kanjiToEntry(k))
    if (type === 'alphabet') return (ALPHABET_LANGS[lang] ?? []).map((item) => alphabetToEntry(lang, item))
    return []
  }

  return {
    getEntry,
    listByLang,
    allIds: graph.allIds,
    startingIds: graph.startingIds,
  }
}

export function vocabEntryId(lang, word) {
  return vocabNodeId(lang, word)
}
