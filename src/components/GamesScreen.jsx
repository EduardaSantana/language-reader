import { useMemo, useState } from 'react'
import { getSavedWords, getUnseenSavedWords, getReadStories } from '../lib/storage'
import { buildDictionary } from '../lib/vocabIndex'
import { langMeta } from '../lib/langs'
import kanjiComponents from '../data/kanji_components.json'
import kanjiMeanings from '../data/kanji_meanings.json'
import GuessWordGame from './GuessWordGame'
import MatchingPairsGame from './MatchingPairsGame'
import SentenceOrderGame from './SentenceOrderGame'
import ImageGuessGame from './ImageGuessGame'
import OddOneOutGame from './OddOneOutGame'
import FillInBlankGame from './FillInBlankGame'
import CategorySortGame from './CategorySortGame'
import KanjiBuildGame from './KanjiBuildGame'
import OnomatopoeiaGame from './OnomatopoeiaGame'
import CompoundBuilderGame from './CompoundBuilderGame'
import BottomNav from './BottomNav'

const GAMES = [
  { key: 'guess', title: 'Guess the word', icon: '🎯', description: 'Pick the right word for the meaning shown.' },
  { key: 'image', title: 'Image guess', icon: '🖼', description: 'Pick the right word for the photo shown.' },
  { key: 'match', title: 'Matching pairs', icon: '🃏', description: 'Flip cards to match a word to its meaning.' },
  { key: 'order', title: 'Sentence order', icon: '🧩', description: "Rebuild a sentence from a story you've read." },
  { key: 'odd', title: 'Odd one out', icon: '🔍', description: "Spot the word that doesn't belong." },
  { key: 'blank', title: 'Fill in the blank', icon: '✏️', description: "Complete a sentence from a story you've read." },
  { key: 'category', title: 'Category sort', icon: '🗂', description: 'Sort words by which story they came from.' },
  { key: 'kanji', title: 'Kanji build', icon: '構', description: 'Assemble a kanji from its components.', onlyLang: 'ja' },
  { key: 'onomatopoeia', title: 'Onomatopoeia match', icon: '💫', description: 'Match the sound-word to what it describes.', onlyLang: 'ja' },
  { key: 'compound', title: 'Compound builder', icon: '🧱', description: 'Assemble a German compound from its pieces.', onlyLang: 'de' },
]

export default function GamesScreen({ stories, activeLanguages, activeTab, onChangeTab }) {
  const savedWords = useMemo(() => getSavedWords(), [])
  const dictionary = useMemo(() => buildDictionary(stories), [stories])
  const readIndices = useMemo(() => getReadStories(), [])
  const unseenCount = useMemo(() => getUnseenSavedWords().size, [])
  const pool = savedWords.length >= 4 ? savedWords : dictionary

  const langs = activeLanguages?.length ? activeLanguages : ['ja']
  const [lang, setLang] = useState(langs[0])
  const [activeGame, setActiveGame] = useState(null)

  const availableGames = GAMES.filter((g) => !g.onlyLang || g.onlyLang === lang)

  function handleLangChange(l) {
    setLang(l)
    if (activeGame && !GAMES.find((g) => g.key === activeGame && (!g.onlyLang || g.onlyLang === l))) {
      setActiveGame(null)
    }
  }

  return (
    <div className="screen games-screen">
      <header className="collection-header">
        <h1>Games</h1>
        {activeGame && (
          <button className="icon-button games-back-button" onClick={() => setActiveGame(null)} aria-label="Back to games">
            ← All games
          </button>
        )}
      </header>

      <div className="game-lang-select">
        {langs.map((l) => (
          <button
            key={l}
            className={`level-pill-button ${lang === l ? 'active' : ''}`}
            onClick={() => handleLangChange(l)}
          >
            {langMeta(l).avatar} {langMeta(l).label}
          </button>
        ))}
      </div>

      {!activeGame ? (
        <div className="games-hub">
          {availableGames.map((g) => (
            <button key={g.key} className="game-hub-card" onClick={() => setActiveGame(g.key)}>
              <div className="game-hub-icon">{g.icon}</div>
              <div className="game-hub-title">{g.title}</div>
              <div className="game-hub-description">{g.description}</div>
            </button>
          ))}
        </div>
      ) : activeGame === 'guess' ? (
        <GuessWordGame key={lang} pool={pool} stories={stories} lang={lang} />
      ) : activeGame === 'image' ? (
        <ImageGuessGame key={lang} pool={pool} stories={stories} lang={lang} />
      ) : activeGame === 'match' ? (
        <MatchingPairsGame key={lang} pool={pool} lang={lang} />
      ) : activeGame === 'order' ? (
        <SentenceOrderGame key={lang} stories={stories} readIndices={readIndices} lang={lang} />
      ) : activeGame === 'odd' ? (
        <OddOneOutGame key={lang} pool={pool} lang={lang} />
      ) : activeGame === 'blank' ? (
        <FillInBlankGame key={lang} stories={stories} readIndices={readIndices} lang={lang} pool={pool} />
      ) : activeGame === 'category' ? (
        <CategorySortGame key={lang} pool={pool} lang={lang} stories={stories} />
      ) : activeGame === 'kanji' ? (
        <KanjiBuildGame kanjiComponents={kanjiComponents} kanjiMeanings={kanjiMeanings} />
      ) : activeGame === 'onomatopoeia' ? (
        <OnomatopoeiaGame />
      ) : activeGame === 'compound' ? (
        <CompoundBuilderGame />
      ) : null}

      <BottomNav active={activeTab} onChange={onChangeTab} badges={{ bookmarks: unseenCount }} />
    </div>
  )
}
