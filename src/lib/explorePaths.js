import { hasLeadingArticle, stripLeadingArticle } from './vocabIndex'

// French/German/Russian vocab entries store grammatical gender (m/f/n) in the
// `reading` field when there's no real phonetic reading to show (see data.js) —
// a noun-only property, so its presence is a reliable noun signal.
function hasGenderCode(entry) {
  return typeof entry.reading === 'string' && /^[mfn]$/i.test(entry.reading.trim())
}

// German nouns are always capitalized, but are stored with their leading
// article ("das Videospiel") — strip that first or every noun reads as
// lowercase "das"/"die"/"das" instead of its own capitalized word.
function isCapitalized(word, lang) {
  const bare = stripLeadingArticle(word, lang)
  return /^[A-ZÄÖÜ]/.test(bare)
}

const FR_VERB_ENDING = /^(?:se |s')?\S+(er|ir|re)$/i
const DE_VERB_ENDING = /^(?!.*\s)[a-zäöüß]+(en|ln|rn)$/
const RU_VERB_ENDING = /(ть|ти|чь)$/i

// A bounded allowlist of common dictionary-form Japanese words — matched against
// the real corpus below, never asserted on its own. Words not present in the
// corpus simply don't show up; nothing here is displayed unverified.
const JA_VERBS = new Set([
  '見る', '食べる', '行く', '来る', 'する', 'ある', 'いる', '買う', '読む', '書く',
  '話す', '聞く', '分かる', '飲む', '会う', '待つ', '作る', '使う', '知る', '思う',
  '言う', '帰る', '出る', '入る', '座る', '立つ', '歩く', '走る', '遊ぶ', '寝る', '起きる',
])
const JA_NOUNS = new Set([
  '家族', '友達', '学校', '先生', '学生', '会社', '電車', '新幹線', '車', '本',
  '水', '猫', '犬', '人', '時間', '今日', '明日', '昨日', '天気', '雨', '山',
  '川', '海', '空', '花', '木', '家', '部屋', '窓', '机', '椅子', 'ゲーム',
  'アニメ', '漫画', 'けん', '駅',
])

/** Classifies a dictionary entry as 'noun' | 'verb' | 'other' for path-building purposes. */
export function classifyVocab(entry) {
  switch (entry.lang) {
    case 'fr':
      if (hasGenderCode(entry) || hasLeadingArticle(entry.word, 'fr')) return 'noun'
      if (FR_VERB_ENDING.test(entry.word)) return 'verb'
      return 'other'
    case 'de':
      if (isCapitalized(entry.word, 'de')) return 'noun'
      if (DE_VERB_ENDING.test(entry.word)) return 'verb'
      return 'other'
    case 'ru':
      if (hasGenderCode(entry)) return 'noun'
      if (RU_VERB_ENDING.test(entry.word)) return 'verb'
      return 'other'
    case 'ja':
      if (JA_NOUNS.has(entry.word)) return 'noun'
      // Story vocab often stores the polite conjugated form (e.g. たたかいます)
      // rather than the dictionary form — the ます ending is a reliable verb signal on its own.
      if (JA_VERBS.has(entry.word) || entry.word.endsWith('ます')) return 'verb'
      return 'other'
    default:
      return 'other'
  }
}

/** Grammar points for a language, ordered basic → complex. */
export function buildGrammarPath(grammarPoints) {
  return [...grammarPoints].sort((a, b) => a.difficulty - b.difficulty)
}

/** Vocab entries of one category (noun/verb) for a language, ordered by the story
 * level they were first introduced at — basic → complex, using real progression
 * data rather than an invented difficulty score. */
export function buildVocabPath(dictionary, category) {
  return dictionary
    .filter((entry) => classifyVocab(entry) === category)
    .sort((a, b) => a.level - b.level)
}
