import grammarFr from '../data/grammar_points_fr.json'
import grammarDe from '../data/grammar_points_de.json'
import grammarRu from '../data/grammar_points_ru.json'
import grammarJa from '../data/grammar_points_ja_bites.json'
import oddityFr from '../data/oddities_fr.json'
import oddityDe from '../data/oddities_de.json'
import oddityRu from '../data/oddities_ru.json'
import oddityJa from '../data/oddities_ja.json'
import comparativeOddities from '../data/oddities_comparative.json'
import { buildDictionary, stripLeadingArticle } from './vocabIndex'
import { classifyVocab } from './explorePaths'

const GRAMMAR_BY_LANG = { fr: grammarFr, de: grammarDe, ru: grammarRu, ja: grammarJa }
const ODDITIES_BY_LANG = { fr: oddityFr, de: oddityDe, ru: oddityRu, ja: oddityJa }
export const EXPLORE_LANGS = Object.keys(GRAMMAR_BY_LANG)

// Comparative oddities aren't tied to one language — id uses "all" as the
// pseudo-lang segment so they still fit the existing lang:type:key id scheme.
const COMPARATIVE_LANG = 'all'

export function grammarPointsForLang(lang) {
  return GRAMMAR_BY_LANG[lang] ?? []
}

export function oddityPointsForLang(lang) {
  return ODDITIES_BY_LANG[lang] ?? []
}

export function comparativeOddityPoints() {
  return comparativeOddities
}

export function vocabNodeId(lang, word) {
  return `${lang}:vocab:${word}`
}

export function grammarNodeId(lang, id) {
  return `${lang}:grammar:${id}`
}

export function oddityNodeId(lang, id) {
  return `${lang}:oddity:${id}`
}

export function comparativeNodeId(id) {
  return `${COMPARATIVE_LANG}:comparative:${id}`
}

function sentenceText(sentence) {
  return sentence.map((seg) => seg.text).join('')
}

// The word's own story may mention it in any sentence, not necessarily the
// first — search for one that actually contains it. Vocab words are stored
// with their dictionary-form leading article baked in ("le soleil", "das
// Videospiel"), but running text uses the bare noun ("il fait soleil") — strip
// the article before matching. Conjugated verbs and case-inflected nouns
// (French/German/Russian) still won't match their dictionary form here — real
// lemmatization is out of scope, so return null rather than show an unrelated
// sentence that only looks relevant.
function findExampleSentence(story, word, lang) {
  if (!story) return null
  const key = stripLeadingArticle(word, lang)
  const match = story.sentences.find((s) => sentenceText(s).includes(key))
  return match ? sentenceText(match) : null
}

// Grammar/oddity points historically stored one example as example_native/
// example_gloss; richer research-backed content (starting with French) stores
// several as an `examples` array instead. Both shapes normalize to the same
// `examples` array on the returned node, so every renderer only ever deals
// with one shape.
function exampleList(entry) {
  if (Array.isArray(entry.examples)) return entry.examples
  return entry.example_native ? [{ native: entry.example_native, gloss: entry.example_gloss ?? null }] : []
}

function exampleText(entry) {
  return exampleList(entry)
    .map((e) => e.native)
    .join(' ')
}

/** For each story, up to 3 grammar points (same language) whose example
 * sentence actually appears verbatim in that story's text — the reverse of
 * findStoryForExample's grammar→story lookup above, same "only a real
 * textual match counts" rule (no fabricated "this story teaches X" claims).
 * Powers Read's "teaches" chips (docs/ENCYCLOPEDIA_IMPLEMENTATION_PLAN.md
 * Phase 3). Cheap enough to memoize once per `stories` array, not per story. */
export function storyTeachesMap(stories) {
  const map = new Map()
  for (const story of stories) {
    const points = grammarPointsForLang(story.lang)
    const found = []
    for (const g of points) {
      const hasMatch = exampleList(g).some(
        (ex) => ex.native && story.sentences.some((s) => sentenceText(s).includes(ex.native)),
      )
      if (hasMatch) {
        found.push({ id: grammarNodeId(story.lang, g.id), lang: story.lang, title: g.title })
        if (found.length >= 3) break
      }
    }
    map.set(story.idx, found)
  }
  return map
}

/** Builds a lookup graph of vocab + grammar entries across all four languages,
 * linked by shared story context (vocab-vocab) and shared example wording
 * (vocab-grammar), plus a small set of hand-curated cross-language `see_also` links. */
export function buildExploreGraph(stories) {
  const storiesByIdx = new Map(stories.map((s) => [s.idx, s]))
  const dictByLang = {}
  const vocabByWord = {}
  const vocabByStory = {}
  const allOddities = EXPLORE_LANGS.flatMap((lang) => (ODDITIES_BY_LANG[lang] ?? []).map((o) => ({ ...o, lang })))
  const storiesByLang = {}
  for (const lang of EXPLORE_LANGS) storiesByLang[lang] = stories.filter((s) => s.lang === lang)

  // Finds a real story whose text actually contains a grammar point's example
  // sentence, so "Read it in a story" only ever links to a genuine citation —
  // same "don't show a fabricated match" rule findExampleSentence follows above.
  function findStoryForExample(lang, examples) {
    for (const example of examples) {
      if (!example.native) continue
      for (const story of storiesByLang[lang] ?? []) {
        if (story.sentences.some((s) => sentenceText(s).includes(example.native))) {
          return { storyIndex: story.idx, titleEn: story.titleEn }
        }
      }
    }
    return null
  }

  for (const lang of EXPLORE_LANGS) {
    const dict = buildDictionary(stories.filter((s) => s.lang === lang))
    dictByLang[lang] = dict
    const byWord = new Map()
    const byStory = new Map()
    for (const entry of dict) {
      byWord.set(entry.word, entry)
      if (!byStory.has(entry.storyIndex)) byStory.set(entry.storyIndex, [])
      byStory.get(entry.storyIndex).push(entry)
    }
    vocabByWord[lang] = byWord
    vocabByStory[lang] = byStory
  }

  function mentionedVocab(lang, text, excludeWord) {
    const byWord = vocabByWord[lang]
    if (!byWord || !text) return []
    const found = []
    for (const word of byWord.keys()) {
      if (word === excludeWord) continue
      if (text.includes(stripLeadingArticle(word, lang))) found.push(word)
      if (found.length >= 6) break
    }
    return found
  }

  function getVocabNode(lang, word) {
    const entry = vocabByWord[lang]?.get(word)
    if (!entry) return null
    const story = storiesByIdx.get(entry.storyIndex)
    const related = []
    const storyMates = (vocabByStory[lang]?.get(entry.storyIndex) ?? []).filter((e) => e.word !== word)
    for (const mate of storyMates.slice(0, 5)) {
      related.push({ id: vocabNodeId(lang, mate.word), lang, type: 'vocab', title: mate.word })
    }
    const wordKey = stripLeadingArticle(word, lang)
    for (const g of GRAMMAR_BY_LANG[lang] ?? []) {
      if (exampleText(g).includes(wordKey)) {
        related.push({ id: grammarNodeId(lang, g.id), lang, type: 'grammar', title: g.title })
      }
    }
    for (const o of ODDITIES_BY_LANG[lang] ?? []) {
      if (o.example_native?.includes(wordKey)) {
        related.push({ id: oddityNodeId(lang, o.id), lang, type: 'oddity', title: o.title })
      }
    }
    const pos = classifyVocab(entry)
    return {
      id: vocabNodeId(lang, word),
      lang,
      type: 'vocab',
      pos: pos === 'other' ? null : pos,
      title: word,
      reading: entry.reading ?? null,
      gender: entry.gender ?? null,
      subtitle: entry.english,
      examples: (() => {
        const native = story ? findExampleSentence(story, word, lang) : null
        return native ? [{ native, gloss: entry.english, source: story.titleEn }] : []
      })(),
      note: null,
      relatedGameId: null,
      vocabEntry: entry,
      related,
    }
  }

  function getGrammarNode(lang, id) {
    const g = (GRAMMAR_BY_LANG[lang] ?? []).find((p) => p.id === id)
    if (!g) return null
    const related = []
    for (const word of mentionedVocab(lang, exampleText(g))) {
      related.push({ id: vocabNodeId(lang, word), lang, type: 'vocab', title: word })
    }
    for (const ref of g.see_also ?? []) {
      const target = (GRAMMAR_BY_LANG[ref.lang] ?? []).find((p) => p.id === ref.id)
      if (target) {
        related.push({ id: grammarNodeId(ref.lang, ref.id), lang: ref.lang, type: 'grammar', title: target.title })
      }
    }
    if (g.related_oddity_id) {
      const ref = g.related_oddity_id
      const target = (ODDITIES_BY_LANG[ref.lang] ?? []).find((p) => p.id === ref.id)
      if (target) {
        related.push({ id: oddityNodeId(ref.lang, ref.id), lang: ref.lang, type: 'oddity', title: target.title })
      }
    }
    const prerequisiteRefs = []
    for (const prereqId of g.prerequisites ?? []) {
      const target = (GRAMMAR_BY_LANG[lang] ?? []).find((p) => p.id === prereqId)
      if (target) {
        prerequisiteRefs.push({ id: grammarNodeId(lang, prereqId), lang, type: 'grammar', title: target.title })
      }
    }
    return {
      id: grammarNodeId(lang, id),
      lang,
      type: 'grammar',
      pos: null,
      title: g.title,
      reading: null,
      subtitle: g.explanation,
      examples: exampleList(g),
      note: g.bridge_note ?? null,
      mistake: g.mistake ?? null,
      cefr: g.cefr ?? null,
      source: g.source ?? null,
      confidence: g.confidence ?? null,
      relatedGameId: g.related_game_id ?? null,
      storyContext: findStoryForExample(lang, exampleList(g)),
      vocabEntry: null,
      related,
      prerequisiteRefs,
    }
  }

  function getOddityNode(lang, id) {
    const o = (ODDITIES_BY_LANG[lang] ?? []).find((p) => p.id === id)
    if (!o) return null
    const related = []
    for (const word of mentionedVocab(lang, o.example_native)) {
      related.push({ id: vocabNodeId(lang, word), lang, type: 'vocab', title: word })
    }
    for (const ref of o.see_also ?? []) {
      const target =
        (GRAMMAR_BY_LANG[ref.lang] ?? []).find((p) => p.id === ref.id) ??
        (ODDITIES_BY_LANG[ref.lang] ?? []).find((p) => p.id === ref.id)
      if (target) {
        const isGrammar = (GRAMMAR_BY_LANG[ref.lang] ?? []).includes(target)
        related.push({
          id: isGrammar ? grammarNodeId(ref.lang, ref.id) : oddityNodeId(ref.lang, ref.id),
          lang: ref.lang,
          type: isGrammar ? 'grammar' : 'oddity',
          title: target.title,
        })
      }
    }
    if (o.cluster) {
      const clusterMates = allOddities.filter((other) => other.cluster === o.cluster && other.id !== o.id)
      for (const mate of clusterMates.slice(0, 2)) {
        related.push({ id: oddityNodeId(mate.lang, mate.id), lang: mate.lang, type: 'oddity', title: mate.title })
      }
    }
    return {
      id: oddityNodeId(lang, id),
      lang,
      type: 'oddity',
      pos: null,
      title: o.title,
      reading: null,
      subtitle: null,
      examples: exampleList(o),
      note: o.bridge_note ?? null,
      relatedGameId: o.related_game_id ?? null,
      confidence: o.confidence ?? null,
      vocabEntry: null,
      related,
    }
  }

  function getComparativeNode(id) {
    const c = comparativeOddities.find((p) => p.id === id)
    if (!c) return null
    const related = []
    for (const ref of c.see_also ?? []) {
      const target =
        (GRAMMAR_BY_LANG[ref.lang] ?? []).find((p) => p.id === ref.id) ??
        (ODDITIES_BY_LANG[ref.lang] ?? []).find((p) => p.id === ref.id)
      if (target) {
        const isGrammar = (GRAMMAR_BY_LANG[ref.lang] ?? []).includes(target)
        related.push({
          id: isGrammar ? grammarNodeId(ref.lang, ref.id) : oddityNodeId(ref.lang, ref.id),
          lang: ref.lang,
          type: isGrammar ? 'grammar' : 'oddity',
          title: target.title,
        })
      }
    }
    return {
      id: comparativeNodeId(id),
      lang: COMPARATIVE_LANG,
      type: 'comparative',
      pos: null,
      title: c.title,
      reading: null,
      subtitle: c.concept_note,
      examples: [],
      note: null,
      relatedGameId: null,
      confidence: c.confidence ?? null,
      vocabEntry: null,
      entries: c.entries,
      related,
    }
  }

  function getNode(id) {
    const [lang, type, ...rest] = id.split(':')
    const key = rest.join(':')
    if (type === 'grammar') return getGrammarNode(lang, key)
    if (type === 'oddity') return getOddityNode(lang, key)
    if (type === 'comparative') return getComparativeNode(key)
    return getVocabNode(lang, key)
  }

  const startingIds = []
  const allIds = []
  for (const lang of EXPLORE_LANGS) {
    for (const g of GRAMMAR_BY_LANG[lang]) {
      startingIds.push(grammarNodeId(lang, g.id))
      allIds.push(grammarNodeId(lang, g.id))
    }
    for (const o of ODDITIES_BY_LANG[lang] ?? []) {
      startingIds.push(oddityNodeId(lang, o.id))
      allIds.push(oddityNodeId(lang, o.id))
    }
    for (const entry of dictByLang[lang].slice(0, 15)) startingIds.push(vocabNodeId(lang, entry.word))
    for (const entry of dictByLang[lang]) allIds.push(vocabNodeId(lang, entry.word))
  }
  for (const c of comparativeOddities) {
    startingIds.push(comparativeNodeId(c.id))
    allIds.push(comparativeNodeId(c.id))
  }

  return { getNode, startingIds, allIds }
}
