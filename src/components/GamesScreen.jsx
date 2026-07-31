import { useMemo, useState } from 'react'
import { getSavedWords, getUnseenSavedWords, getOpenedStories } from '../lib/storage'
import { buildDictionary } from '../lib/vocabIndex'
import { langMeta } from '../lib/langs'
import GuessWordGame from './GuessWordGame'
import MatchingPairsGame from './MatchingPairsGame'
import SentenceOrderGame from './SentenceOrderGame'
import BottomNav from './BottomNav'

const GAMES = [
  { key: 'guess', title: 'Guess the word', icon: '🎯', description: 'Pick the right word for the meaning shown.' },
  { key: 'match', title: 'Matching pairs', icon: '🃏', description: 'Flip cards to match a word to its meaning.' },
  { key: 'order', title: 'Sentence order', icon: '🧩', description: 'Rebuild a sentence from a story you\'ve read.' },
]

export default function GamesScreen({ stories, activeLanguages, activeTab, onChangeTab }) {
  const savedWords = useMemo(() => getSavedWords(), [])
  const dictionary = useMemo(() => buildDictionary(stories), [stories])
  const openedIndices = useMemo(() => getOpenedStories(), [])
  const unseenCount = useMemo(() => getUnseenSavedWords().size, [])
  const pool = savedWords.length >= 4 ? savedWords : dictionary

  const langs = activeLanguages?.length ? activeLanguages : ['ja']
  const [lang, setLang] = useState(langs[0])
  const [activeGame, setActiveGame] = useState(null)

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
            onClick={() => setLang(l)}
          >
            {langMeta(l).avatar} {langMeta(l).label}
          </button>
        ))}
      </div>

      {!activeGame ? (
        <div className="games-hub">
          {GAMES.map((g) => (
            <button key={g.key} className="game-hub-card" onClick={() => setActiveGame(g.key)}>
              <div className="game-hub-icon">{g.icon}</div>
              <div className="game-hub-title">{g.title}</div>
              <div className="game-hub-description">{g.description}</div>
            </button>
          ))}
        </div>
      ) : activeGame === 'guess' ? (
        <GuessWordGame key={lang} pool={pool} stories={stories} lang={lang} />
      ) : activeGame === 'match' ? (
        <MatchingPairsGame key={lang} pool={pool} lang={lang} />
      ) : (
        <SentenceOrderGame key={lang} stories={stories} openedIndices={openedIndices} lang={lang} />
      )}

      <BottomNav active={activeTab} onChange={onChangeTab} badges={{ collection: unseenCount }} />
    </div>
  )
}
