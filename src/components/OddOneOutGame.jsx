import { useState } from 'react'
import { pickOddOneOut, COMPANION_CORRECT_LINES, COMPANION_WRONG_LINES } from '../lib/games'
import { reactCompanion } from '../lib/companion'

const ADVANCE_DELAY_MS = 1400

export default function OddOneOutGame({ pool, lang }) {
  const [round, setRound] = useState(() => pickOddOneOut(pool, lang))
  const [streak, setStreak] = useState(0)
  const [status, setStatus] = useState('playing')
  const [pickedWord, setPickedWord] = useState(null)
  const [companionLine, setCompanionLine] = useState(null)

  function nextRound() {
    setRound(pickOddOneOut(pool, lang))
    setStatus('playing')
    setPickedWord(null)
    setCompanionLine(null)
  }

  function handleChoice(choice) {
    if (status !== 'playing') return
    setPickedWord(choice.word)
    const correct = choice.word === round.oddWord
    setStatus(correct ? 'correct' : 'wrong')
    setStreak((s) => (correct ? s + 1 : 0))
    reactCompanion(
      setCompanionLine,
      lang,
      { type: 'game_answer', correct, word: round.oddWord, english: choice.english, lang },
      correct ? COMPANION_CORRECT_LINES : COMPANION_WRONG_LINES,
    )
    setTimeout(nextRound, ADVANCE_DELAY_MS)
  }

  if (!round) {
    return (
      <p className="favorites-empty">
        Read a few more stories in this language — this game needs several words from the same story to work with.
      </p>
    )
  }

  return (
    <div className="game-card">
      <div className="streak-counter">🔥 {streak}</div>
      <div className="game-instruction">Which one doesn't belong with the others?</div>

      <div className="game-choices">
        {round.choices.map((choice) => {
          const isPicked = pickedWord === choice.word
          const isOdd = choice.word === round.oddWord
          let cls = 'game-choice-button'
          if (status !== 'playing' && isOdd) cls += ' game-choice-correct'
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
  )
}
