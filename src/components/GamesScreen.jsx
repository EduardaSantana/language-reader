import { useMemo, useState } from 'react'
import { getSavedWords, getUnseenSavedWords } from '../lib/storage'
import { buildDictionary } from '../lib/vocabIndex'
import { pickRound, COMPANION_CORRECT_LINES, COMPANION_WRONG_LINES, randomCompanionLine } from '../lib/games'
import BottomNav from './BottomNav'

const ADVANCE_DELAY_MS = 1100

export default function GamesScreen({ stories, activeTab, onChangeTab }) {
  const savedWords = useMemo(() => getSavedWords(), [])
  const dictionary = useMemo(() => buildDictionary(stories), [stories])
  const unseenCount = useMemo(() => getUnseenSavedWords().size, [])
  const pool = savedWords.length >= 4 ? savedWords : dictionary

  const [round, setRound] = useState(() => pickRound(pool))
  const [streak, setStreak] = useState(0)
  const [status, setStatus] = useState('playing') // 'playing' | 'correct' | 'wrong'
  const [pickedWord, setPickedWord] = useState(null)
  const [companionLine, setCompanionLine] = useState(null)

  function nextRound() {
    setRound(pickRound(pool))
    setStatus('playing')
    setPickedWord(null)
    setCompanionLine(null)
  }

  function handleChoice(choice) {
    if (status !== 'playing') return
    setPickedWord(choice.word)
    if (choice.word === round.target.word) {
      setStatus('correct')
      setStreak((s) => s + 1)
      setCompanionLine(randomCompanionLine(COMPANION_CORRECT_LINES))
    } else {
      setStatus('wrong')
      setStreak(0)
      setCompanionLine(randomCompanionLine(COMPANION_WRONG_LINES))
    }
    setTimeout(nextRound, ADVANCE_DELAY_MS)
  }

  if (!round) {
    return (
      <div className="screen games-screen">
        <header className="collection-header">
          <h1>Games</h1>
        </header>
        <p className="favorites-empty">Read a few stories first to build up a word pool to play with.</p>
        <BottomNav active={activeTab} onChange={onChangeTab} />
      </div>
    )
  }

  const promptStory = stories[round.target.storyIndex]

  return (
    <div className="screen games-screen">
      <header className="collection-header">
        <h1>Games</h1>
        <div className="streak-counter">🔥 {streak}</div>
      </header>

      <div className="game-card">
        <div className="game-prompt-emoji">{promptStory?.emoji || '📗'}</div>
        <div className="game-instruction">What's the word for…</div>
        <div className="game-prompt-english">{round.target.english}</div>

        <div className="game-choices">
          {round.choices.map((choice) => {
            const isPicked = pickedWord === choice.word
            const isTarget = choice.word === round.target.word
            let cls = 'game-choice-button'
            if (status !== 'playing' && isTarget) cls += ' game-choice-correct'
            else if (status === 'wrong' && isPicked) cls += ' game-choice-wrong'
            return (
              <button
                key={`${choice.lang}:${choice.word}`}
                className={cls}
                disabled={status !== 'playing'}
                onClick={() => handleChoice(choice)}
              >
                {choice.word}
              </button>
            )
          })}
        </div>

        {companionLine && (
          <div className={`companion-line companion-line-${status}`} aria-live="polite">
            {companionLine}
          </div>
        )}
      </div>

      <BottomNav active={activeTab} onChange={onChangeTab} badges={{ collection: unseenCount }} />
    </div>
  )
}
