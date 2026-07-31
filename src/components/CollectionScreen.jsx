import { useEffect, useMemo, useState } from 'react'
import { getSavedWords, clearUnseenSavedWords, addSavedWord, isWordSaved } from '../lib/storage'
import { buildDictionary, matchesDictionaryQuery, sortDictionary, buildLetterIndex } from '../lib/vocabIndex'
import { getAvailableLangs, langMeta } from '../lib/langs'
import { getWordImage } from '../lib/images'
import { syncAppBadge } from '../lib/badge'
import BottomNav from './BottomNav'

const PAGE_SIZE = 40

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

export default function CollectionScreen({ stories, activeTab, onChangeTab, onExploreWord, onOpenStory }) {
  const [savedWords, setSavedWords] = useState(() => getSavedWords())
  const [selectedWord, setSelectedWord] = useState(null)
  const [mode, setMode] = useState('saved')
  const [dictQuery, setDictQuery] = useState('')
  const [dictPage, setDictPage] = useState(0)

  const allLangs = useMemo(() => getAvailableLangs(stories), [stories])
  const [dictLang, setDictLang] = useState(allLangs[0])

  const dictionary = useMemo(
    () => sortDictionary(buildDictionary(stories).filter((entry) => entry.lang === dictLang)),
    [stories, dictLang],
  )
  const filteredDictionary = useMemo(
    () => dictionary.filter((entry) => matchesDictionaryQuery(entry, dictQuery)),
    [dictionary, dictQuery],
  )

  function handleDictLangChange(lang) {
    setDictLang(lang)
    setDictQuery('')
    setDictPage(0)
  }
  const letterIndex = useMemo(() => buildLetterIndex(filteredDictionary), [filteredDictionary])
  const totalPages = Math.max(1, Math.ceil(filteredDictionary.length / PAGE_SIZE))
  const pageEntries = filteredDictionary.slice(dictPage * PAGE_SIZE, dictPage * PAGE_SIZE + PAGE_SIZE)

  function handleDictQueryChange(value) {
    setDictQuery(value)
    setDictPage(0)
  }

  function jumpToLetter(firstIndex) {
    setDictPage(Math.floor(firstIndex / PAGE_SIZE))
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

  return (
    <div className="screen collection-screen">
      <header className="collection-header">
        <h1>Collection</h1>
      </header>

      <div className="collection-mode-toggle">
        <button className={mode === 'saved' ? 'active' : ''} onClick={() => setMode('saved')}>
          My words ({savedWords.length})
        </button>
        <button className={mode === 'dictionary' ? 'active' : ''} onClick={() => setMode('dictionary')}>
          Dictionary
        </button>
      </div>

      {mode === 'saved' ? (
        savedWords.length === 0 ? (
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
        )
      ) : (
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
            {letterIndex.map(({ label, lang, firstIndex }) => (
              <button key={`${lang}-${label}`} className="letter-index-button" onClick={() => jumpToLetter(firstIndex)}>
                {label}
              </button>
            ))}
          </div>

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
