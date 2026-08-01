import grammarFr from '../data/grammar_points_fr.json'
import grammarDe from '../data/grammar_points_de.json'
import grammarRu from '../data/grammar_points_ru.json'
import grammarJa from '../data/grammar_points_ja_bites.json'
import { buildDictionary, stripLeadingArticle } from './vocabIndex'
import { classifyVocab } from './explorePaths'

const GRAMMAR_BY_LANG = { fr: grammarFr, de: grammarDe, ru: grammarRu, ja: grammarJa }
export const EXPLORE_LANGS = Object.keys(GRAMMAR_BY_LANG)

export function grammarPointsForLang(lang) {
  return GRAMMAR_BY_LANG[lang] ?? []
}

export function vocabNodeId(lang, word) {
  return `${lang}:vocab:${word}`
}

export function grammarNodeId(lang, id) {
  return `${lang}:grammar:${id}`
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

/** Builds a lookup graph of vocab + grammar entries across all four languages,
 * linked by shared story context (vocab-vocab) and shared example wording
 * (vocab-grammar), plus a small set of hand-curated cross-language `see_also` links. */
export function buildExploreGraph(stories) {
  const storiesByIdx = new Map(stories.map((s) => [s.idx, s]))
  const dictByLang = {}
  const vocabByWord = {}
  const vocabByStory = {}

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
      if (g.example_native?.includes(wordKey)) {
        related.push({ id: grammarNodeId(lang, g.id), lang, type: 'grammar', title: g.title })
      }
    }
    const pos = classifyVocab(entry)
    return {
      id: vocabNodeId(lang, word),
      lang,
      type: 'vocab',
      pos: pos === 'other' ? null : pos,
      title: word,
      reading: entry.reading && !/^[mfn]$/i.test(entry.reading.trim()) ? entry.reading : null,
      subtitle: entry.english,
      example: (() => {
        const native = story ? findExampleSentence(story, word, lang) : null
        return native ? { native, gloss: entry.english, source: story.titleEn } : null
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
    for (const word of mentionedVocab(lang, g.example_native)) {
      related.push({ id: vocabNodeId(lang, word), lang, type: 'vocab', title: word })
    }
    for (const ref of g.see_also ?? []) {
      const target = (GRAMMAR_BY_LANG[ref.lang] ?? []).find((p) => p.id === ref.id)
      if (target) {
        related.push({ id: grammarNodeId(ref.lang, ref.id), lang: ref.lang, type: 'grammar', title: target.title })
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
      example: { native: g.example_native, gloss: g.example_gloss, source: null },
      note: g.bridge_note ?? null,
      relatedGameId: g.related_game_id ?? null,
      vocabEntry: null,
      related,
    }
  }

  function getNode(id) {
    const [lang, type, ...rest] = id.split(':')
    const key = rest.join(':')
    return type === 'grammar' ? getGrammarNode(lang, key) : getVocabNode(lang, key)
  }

  const startingIds = []
  for (const lang of EXPLORE_LANGS) {
    for (const g of GRAMMAR_BY_LANG[lang]) startingIds.push(grammarNodeId(lang, g.id))
    for (const entry of dictByLang[lang].slice(0, 15)) startingIds.push(vocabNodeId(lang, entry.word))
  }

  return { getNode, startingIds }
}
