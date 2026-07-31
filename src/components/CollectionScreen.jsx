import { useEffect, useMemo, useState } from 'react'
import { getAllKanji, getUnlockedKanjiFromSavedWords } from '../lib/kanji'
import { getSavedWords, getDaysRead, clearUnseenSavedWords, addSavedWord, isWordSaved } from '../lib/storage'
import { buildDictionary, matchesDictionaryQuery } from '../lib/vocabIndex'
import { getWordImage } from '../lib/images'
import { syncAppBadge } from '../lib/badge'
import BottomNav from './BottomNav'

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

export default function CollectionScreen({ stories, activeTab, onChangeTab, onExploreChar, onOpenStory }) {
  const allKanji = useMemo(() => getAllKanji(stories), [stories])
  const [savedWords, setSavedWords] = useState(() => getSavedWords())
  const unlocked = useMemo(() => getUnlockedKanjiFromSavedWords(savedWords), [savedWords])
  const daysRead = useMemo(() => getDaysRead(), [])
  const [selectedKanji, setSelectedKanji] = useState(null)
  const [selectedWord, setSelectedWord] = useState(null)
  const [mode, setMode] = useState('saved')
  const [dictQuery, setDictQuery] = useState('')

  const dictionary = useMemo(() => buildDictionary(stories), [stories])
  const filteredDictionary = useMemo(
    () => dictionary.filter((entry) => matchesDictionaryQuery(entry, dictQuery)),
    [dictionary, dictQuery],
  )

  useEffect(() => {
    clearUnseenSavedWords()
    syncAppBadge(0)
  }, [])

  const unlockedCount = allKanji.filter((k) => unlocked.has(k.char)).length

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

      <div className="stats">
        <div className="stat">
          <div className="stat-value">{daysRead.count}</div>
          <div className="stat-label">days read</div>
        </div>
        <div className="stat">
          <div className="stat-value">
            {unlockedCount} / {allKanji.length}
          </div>
          <div className="stat-label">kanji unlocked</div>
        </div>
      </div>

      <div className="kanji-grid">
        {allKanji.map(({ char, sourceStoryIndex }) => {
          const isUnlocked = unlocked.has(char)
          return (
            <button
              key={char}
              className={`kanji-tile ${isUnlocked ? 'unlocked' : 'locked'}`}
              disabled={!isUnlocked}
              onClick={() => setSelectedKanji({ char, sourceStoryIndex })}
            >
              {char}
            </button>
          )
        })}
      </div>

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
          <input
            className="search-input dictionary-search"
            value={dictQuery}
            onChange={(e) => setDictQuery(e.target.value)}
            placeholder="Search the dictionary…"
          />
          <ul className="story-list dictionary-list">
            {filteredDictionary.map((entry) => (
              <DictionaryRow key={`${entry.lang}:${entry.word}`} entry={entry} onSave={handleSaveFromDictionary} />
            ))}
          </ul>
        </>
      )}

      {selectedKanji && (
        <div className="modal-backdrop" onClick={() => setSelectedKanji(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedKanji.char}</h2>
              <button className="icon-button" onClick={() => setSelectedKanji(null)} aria-label="Close">
                ✕
              </button>
            </div>
            <p>First seen in:</p>
            <p className="story-list-title-ja">{stories[selectedKanji.sourceStoryIndex].titleNative}</p>
            <p className="story-list-title-en">{stories[selectedKanji.sourceStoryIndex].titleEn}</p>
            <button
              className="explore-link-button"
              onClick={() => {
                onExploreChar(selectedKanji.char)
                setSelectedKanji(null)
              }}
            >
              Explore this word →
            </button>
          </div>
        </div>
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
            <button
              className="explore-link-button"
              onClick={() => {
                onOpenStory(selectedWord.storyIndex)
                setSelectedWord(null)
              }}
            >
              Read this story →
            </button>
          </div>
        </div>
      )}

      <BottomNav active={activeTab} onChange={onChangeTab} />
    </div>
  )
}
