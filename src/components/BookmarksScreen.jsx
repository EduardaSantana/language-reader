import { useEffect, useMemo, useState } from 'react'
import {
  getSavedWords,
  clearUnseenSavedWords,
  addSavedWord,
  isWordSaved,
  getReadStories,
  unmarkStoryRead,
} from '../lib/storage'
import {
  buildDictionary,
  matchesDictionaryQuery,
  sortDictionary,
  buildLetterIndex,
  entryLetterLabel,
} from '../lib/vocabIndex'
import { getAvailableLangs, langMeta } from '../lib/langs'
import { getWordImage } from '../lib/images'
import { syncAppBadge } from '../lib/badge'
import kanaJa from '../data/kana_ja.json'
import alphabetRu from '../data/alphabet_ru.json'
import grammarFr from '../data/grammar_points_fr.json'
import grammarDe from '../data/grammar_points_de.json'
import grammarRu from '../data/grammar_points_ru.json'
import grammarJa from '../data/grammar_points_ja_bites.json'
import BottomNav from './BottomNav'

const PAGE_SIZE = 40
const GRAMMAR_PAGE_SIZE = 5

const ALPHABET_LANGS = {
  ja: { label: 'Japanese — hiragana & katakana' },
  ru: { label: 'Russian — Cyrillic' },
}

const GRAMMAR_LANGS = {
  fr: grammarFr,
  de: grammarDe,
  ru: grammarRu,
  ja: grammarJa,
}

function GrammarPointCard({ entry, onPractice }) {
  return (
    <div className="grammar-point-card">
      <div className="grammar-point-title">{entry.title}</div>
      <p className="grammar-point-explanation">{entry.explanation}</p>
      <div className="grammar-point-example" lang={entry.lang}>
        {entry.example_native}
        <div className="grammar-point-gloss">{entry.example_gloss}</div>
      </div>
      {entry.bridge_note && (
        <div className="bridge-note">
          <div className="bridge-note-label">
            Bridge note — {entry.bridge_lang === 'pt' ? 'Portuguese' : 'English'}
          </div>
          <div className="bridge-note-text">{entry.bridge_note}</div>
        </div>
      )}
      {entry.related_game_id && (
        <button className="explore-link-button" onClick={() => onPractice(entry)}>
          Practice this →
        </button>
      )}
    </div>
  )
}

function KANA_ROW_GROUPS() {
  const rows = []
  const seen = new Set()
  for (const entry of kanaJa) {
    if (!seen.has(entry.row)) {
      seen.add(entry.row)
      rows.push(entry.row)
    }
  }
  return rows
}

function WordImage({ entry, fallbackEmoji }) {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    let cancelled = false
    getWordImage(entry.english).then((result) => {
      if (!cancelled) setUrl(result)
    })
    return () => {
      cancelled = true
    }
  }, [entry.english])

  if (url) return <img className="word-image" src={url} alt={entry.english} loading="lazy" />
  return <div className="word-image word-image-fallback">{fallbackEmoji}</div>
}

function SavedWordCard({ entry, story, onOpen }) {
  return (
    <button className="saved-word-card" onClick={() => onOpen(entry)}>
      <WordImage entry={entry} fallbackEmoji={story?.emoji || '📗'} />
      <div className="saved-word-text">
        <div className="saved-word-word">{entry.word}</div>
        {entry.reading && <div className="saved-word-reading">{entry.reading}</div>}
        <div className="saved-word-english">{entry.english}</div>
      </div>
    </button>
  )
}

function DictionaryRow({ entry, onSave }) {
  const [saved, setSaved] = useState(() => isWordSaved(entry.lang, entry.word))
  return (
    <li className="dictionary-row">
      <div>
        <span className="story-list-title-ja">{entry.word}</span>
        {entry.reading && <span className="dictionary-reading"> ({entry.reading})</span>}
        <div className="story-list-title-en">{entry.english}</div>
      </div>
      <button
        className={`save-word-button ${saved ? 'saved' : ''}`}
        disabled={saved}
        onClick={() => {
          onSave(entry)
          setSaved(true)
        }}
      >
        {saved ? '✓ Saved' : '+ Save'}
      </button>
    </li>
  )
}

function ReadStoryRow({ story, onOpen, onUnmark }) {
  return (
    <li className="read-story-row">
      <button className="read-story-open" onClick={() => onOpen(story.idx)}>
        <span className="story-list-emoji">{story.emoji || '📖'}</span>
        <span className="story-list-text">
          <span className="story-list-title-ja">{story.titleNative}</span>
          <span className="story-list-title-en">{story.titleEn}</span>
        </span>
      </button>
      <button className="unmark-read-button" onClick={() => onUnmark(story.idx)} aria-label="Unmark as read">
        ✕
      </button>
    </li>
  )
}

function AlphabetScreenJa() {
  const rows = useMemo(() => KANA_ROW_GROUPS(), [])
  const [selected, setSelected] = useState(null)
  return (
    <>
      {rows.map((row) => (
        <div className="alphabet-row-group" key={row}>
          <div className="alphabet-row-heading">{row}</div>
          <div className="alphabet-grid">
            {kanaJa
              .filter((e) => e.row === row)
              .map((entry) => (
                <button
                  key={entry.hiragana}
                  className="alphabet-card"
                  onClick={() => setSelected(entry)}
                >
                  <span className="alphabet-card-hira">{entry.hiragana}</span>
                  <span className="alphabet-card-kata">{entry.katakana}</span>
                  <span className="alphabet-card-romaji">{entry.romaji}</span>
                </button>
              ))}
          </div>
        </div>
      ))}
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selected.romaji}</h2>
              <button className="icon-button" onClick={() => setSelected(null)} aria-label="Close">
                ✕
              </button>
            </div>
            <p className="alphabet-detail-forms">
              Hiragana <strong>{selected.hiragana}</strong> · Katakana <strong>{selected.katakana}</strong>
            </p>
          </div>
        </div>
      )}
    </>
  )
}

function AlphabetScreenRu() {
  const [selected, setSelected] = useState(null)
  return (
    <>
      <div className="alphabet-grid">
        {alphabetRu.map((entry) => (
          <button key={entry.letter} className="alphabet-card" onClick={() => setSelected(entry)}>
            <span className="alphabet-card-hira">{entry.letter}</span>
            <span className="alphabet-card-kata">{entry.lower}</span>
            <span className="alphabet-card-romaji">{entry.romanization}</span>
          </button>
        ))}
      </div>
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {selected.letter} {selected.lower}
              </h2>
              <button className="icon-button" onClick={() => setSelected(null)} aria-label="Close">
                ✕
              </button>
            </div>
            <p className="alphabet-detail-forms">
              "{selected.name}" · romanized {selected.romanization}
            </p>
          </div>
        </div>
      )}
    </>
  )
}

export default function BookmarksScreen({ stories, activeTab, onChangeTab, onExploreWord, onOpenStory, onOpenGame }) {
  const [savedWords, setSavedWords] = useState(() => getSavedWords())
  const [selectedWord, setSelectedWord] = useState(null)
  const [mode, setMode] = useState('saved')
  const [dictQuery, setDictQuery] = useState('')
  const [dictPage, setDictPage] = useState(0)
  const [selectedLetter, setSelectedLetter] = useState(null)
  const [readStoryIndices, setReadStoryIndices] = useState(() => getReadStories())

  const allLangs = useMemo(() => getAvailableLangs(stories), [stories])
  const [dictLang, setDictLang] = useState(allLangs[0])

  const availableAlphabetLangs = useMemo(
    () => allLangs.filter((l) => ALPHABET_LANGS[l]),
    [allLangs],
  )
  const [alphabetLang, setAlphabetLang] = useState(() => availableAlphabetLangs[0])

  const availableGrammarLangs = useMemo(() => allLangs.filter((l) => GRAMMAR_LANGS[l]), [allLangs])
  const [grammarLang, setGrammarLang] = useState(() => availableGrammarLangs[0])
  const [grammarPage, setGrammarPage] = useState(0)
  const grammarPoints = grammarLang ? GRAMMAR_LANGS[grammarLang] ?? [] : []
  const grammarTotalPages = Math.max(1, Math.ceil(grammarPoints.length / GRAMMAR_PAGE_SIZE))
  const grammarPageEntries = grammarPoints.slice(
    grammarPage * GRAMMAR_PAGE_SIZE,
    grammarPage * GRAMMAR_PAGE_SIZE + GRAMMAR_PAGE_SIZE,
  )

  function handleGrammarLangChange(lang) {
    setGrammarLang(lang)
    setGrammarPage(0)
  }

  function handlePracticeGrammarPoint(entry) {
    onOpenGame('sentence-build', entry.related_game_id, entry.lang)
  }

  const dictionary = useMemo(
    () => sortDictionary(buildDictionary(stories).filter((entry) => entry.lang === dictLang)),
    [stories, dictLang],
  )
  const queriedDictionary = useMemo(
    () => dictionary.filter((entry) => matchesDictionaryQuery(entry, dictQuery)),
    [dictionary, dictQuery],
  )
  const filteredDictionary = useMemo(
    () =>
      selectedLetter
        ? queriedDictionary.filter((entry) => entryLetterLabel(entry) === selectedLetter)
        : queriedDictionary,
    [queriedDictionary, selectedLetter],
  )

  function handleDictLangChange(lang) {
    setDictLang(lang)
    setDictQuery('')
    setDictPage(0)
    setSelectedLetter(null)
  }
  const letterIndex = useMemo(() => buildLetterIndex(queriedDictionary), [queriedDictionary])
  const totalPages = Math.max(1, Math.ceil(filteredDictionary.length / PAGE_SIZE))
  const pageEntries = filteredDictionary.slice(dictPage * PAGE_SIZE, dictPage * PAGE_SIZE + PAGE_SIZE)

  function handleDictQueryChange(value) {
    setDictQuery(value)
    setDictPage(0)
    setSelectedLetter(null)
  }

  function selectLetter(label) {
    setSelectedLetter((current) => (current === label ? null : label))
    setDictPage(0)
  }

  useEffect(() => {
    clearUnseenSavedWords()
    syncAppBadge(0)
  }, [])

  function handleSaveFromDictionary(entry) {
    const updated = addSavedWord({
      word: entry.word,
      reading: entry.reading,
      english: entry.english,
      lang: entry.lang,
      storyIndex: entry.storyIndex,
    })
    setSavedWords(updated)
  }

  function handleUnmarkRead(storyIndex) {
    setReadStoryIndices(unmarkStoryRead(storyIndex))
  }

  const readStoriesList = useMemo(
    () => stories.filter((s) => readStoryIndices.has(s.idx)),
    [stories, readStoryIndices],
  )

  return (
    <div className="screen collection-screen">
      <header className="collection-header">
        <h1>Bookmarks</h1>
      </header>

      <div className="collection-mode-toggle">
        <button className={mode === 'saved' ? 'active' : ''} onClick={() => setMode('saved')}>
          My words ({savedWords.length})
        </button>
        <button className={mode === 'read' ? 'active' : ''} onClick={() => setMode('read')}>
          Read ({readStoriesList.length})
        </button>
        <button className={mode === 'dictionary' ? 'active' : ''} onClick={() => setMode('dictionary')}>
          Dictionary
        </button>
        {availableAlphabetLangs.length > 0 && (
          <button className={mode === 'alphabets' ? 'active' : ''} onClick={() => setMode('alphabets')}>
            Alphabets
          </button>
        )}
        {availableGrammarLangs.length > 0 && (
          <button className={mode === 'grammar' ? 'active' : ''} onClick={() => setMode('grammar')}>
            Grammar
          </button>
        )}
      </div>

      {mode === 'saved' &&
        (savedWords.length === 0 ? (
          <p className="favorites-empty">
            Nothing saved yet — tap a word's gloss while reading, then "+ Save".
          </p>
        ) : (
          <div className="saved-words-grid">
            {savedWords.map((entry) => (
              <SavedWordCard
                key={`${entry.lang}:${entry.word}`}
                entry={entry}
                story={stories[entry.storyIndex]}
                onOpen={setSelectedWord}
              />
            ))}
          </div>
        ))}

      {mode === 'read' &&
        (readStoriesList.length === 0 ? (
          <p className="favorites-empty">
            Nothing marked as read yet — finish a story and tap "Mark as read" to see it here.
          </p>
        ) : (
          <ul className="story-list read-story-list">
            {readStoriesList.map((story) => (
              <ReadStoryRow key={story.idx} story={story} onOpen={onOpenStory} onUnmark={handleUnmarkRead} />
            ))}
          </ul>
        ))}

      {mode === 'dictionary' && (
        <>
          {allLangs.length > 1 && (
            <div className="game-lang-select">
              {allLangs.map((l) => (
                <button
                  key={l}
                  className={`level-pill-button ${dictLang === l ? 'active' : ''}`}
                  onClick={() => handleDictLangChange(l)}
                >
                  {langMeta(l).avatar} {langMeta(l).label}
                </button>
              ))}
            </div>
          )}
          <input
            className="search-input dictionary-search"
            value={dictQuery}
            onChange={(e) => handleDictQueryChange(e.target.value)}
            placeholder="Search the dictionary…"
          />

          <div className="letter-index">
            {letterIndex.map(({ label, lang }) => (
              <button
                key={`${lang}-${label}`}
                className={`letter-index-button ${selectedLetter === label ? 'active' : ''}`}
                onClick={() => selectLetter(label)}
              >
                {label}
              </button>
            ))}
          </div>

          {selectedLetter && (
            <div className="dictionary-letter-active">
              Showing "{selectedLetter}" words
              <button className="explore-link-button" onClick={() => setSelectedLetter(null)}>
                Clear
              </button>
            </div>
          )}

          {filteredDictionary.length === 0 ? (
            <p className="favorites-empty">No matching words.</p>
          ) : (
            <>
              <ul className="story-list dictionary-list">
                {pageEntries.map((entry) => (
                  <DictionaryRow key={`${entry.lang}:${entry.word}`} entry={entry} onSave={handleSaveFromDictionary} />
                ))}
              </ul>
              <div className="dictionary-pagination">
                <button disabled={dictPage === 0} onClick={() => setDictPage((p) => Math.max(0, p - 1))}>
                  ← Previous
                </button>
                <span className="dictionary-page-label">
                  Page {dictPage + 1} / {totalPages}
                </span>
                <button
                  disabled={dictPage >= totalPages - 1}
                  onClick={() => setDictPage((p) => Math.min(totalPages - 1, p + 1))}
                >
                  Next →
                </button>
              </div>
            </>
          )}
        </>
      )}

      {mode === 'alphabets' && (
        <>
          {availableAlphabetLangs.length > 1 && (
            <div className="game-lang-select">
              {availableAlphabetLangs.map((l) => (
                <button
                  key={l}
                  className={`level-pill-button ${alphabetLang === l ? 'active' : ''}`}
                  onClick={() => setAlphabetLang(l)}
                >
                  {langMeta(l).avatar} {langMeta(l).label}
                </button>
              ))}
            </div>
          )}
          {alphabetLang === 'ja' && <AlphabetScreenJa />}
          {alphabetLang === 'ru' && <AlphabetScreenRu />}
        </>
      )}

      {mode === 'grammar' && (
        <>
          {availableGrammarLangs.length > 1 && (
            <div className="game-lang-select">
              {availableGrammarLangs.map((l) => (
                <button
                  key={l}
                  className={`level-pill-button ${grammarLang === l ? 'active' : ''}`}
                  onClick={() => handleGrammarLangChange(l)}
                >
                  {langMeta(l).avatar} {langMeta(l).label}
                </button>
              ))}
            </div>
          )}

          {grammarPoints.length === 0 ? (
            <p className="favorites-empty">No grammar points for this language yet.</p>
          ) : (
            <>
              <div className="grammar-point-list">
                {grammarPageEntries.map((entry) => (
                  <GrammarPointCard key={entry.id} entry={entry} onPractice={handlePracticeGrammarPoint} />
                ))}
              </div>
              <div className="dictionary-pagination">
                <button disabled={grammarPage === 0} onClick={() => setGrammarPage((p) => Math.max(0, p - 1))}>
                  ← Previous
                </button>
                <span className="dictionary-page-label">
                  Page {grammarPage + 1} / {grammarTotalPages}
                </span>
                <button
                  disabled={grammarPage >= grammarTotalPages - 1}
                  onClick={() => setGrammarPage((p) => Math.min(grammarTotalPages - 1, p + 1))}
                >
                  Next →
                </button>
              </div>
            </>
          )}
        </>
      )}

      {selectedWord && (
        <div className="modal-backdrop" onClick={() => setSelectedWord(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedWord.word}</h2>
              <button className="icon-button" onClick={() => setSelectedWord(null)} aria-label="Close">
                ✕
              </button>
            </div>
            <WordImage entry={selectedWord} fallbackEmoji={stories[selectedWord.storyIndex]?.emoji || '📗'} />
            {selectedWord.reading && <p className="story-list-title-en">{selectedWord.reading}</p>}
            <p>{selectedWord.english}</p>
            <p>From: {stories[selectedWord.storyIndex]?.titleEn}</p>
            <div className="modal-actions">
              <button
                className="icon-button"
                onClick={() => {
                  onOpenStory(selectedWord.storyIndex)
                  setSelectedWord(null)
                }}
              >
                Read this story →
              </button>
              <button
                className="explore-link-button"
                onClick={() => {
                  onExploreWord(selectedWord.lang, selectedWord.word)
                  setSelectedWord(null)
                }}
              >
                Explore this word →
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav active={activeTab} onChange={onChangeTab} />
    </div>
  )
}
