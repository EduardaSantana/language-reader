import { useState } from 'react'
import onomatopoeia from '../data/onomatopoeia_ja.json'
import { pickOnomatopoeia, COMPANION_CORRECT_LINES, COMPANION_WRONG_LINES } from '../lib/games'
import { reactCompanion } from '../lib/companion'

const ADVANCE_DELAY_MS = 1400

export default function OnomatopoeiaGame() {
  const [round, setRound] = useState(() => pickOnomatopoeia(onomatopoeia))
  const [streak, setStreak] = useState(0)
  const [status, setStatus] = useState('playing')
  const [pickedMeaning, setPickedMeaning] = useState(null)
  const [companionLine, setCompanionLine] = useState(null)

  function nextRound() {
    setRound(pickOnomatopoeia(onomatopoeia))
    setStatus('playing')
    setPickedMeaning(null)
    setCompanionLine(null)
  }

  function handleChoice(choice) {
    if (status !== 'playing') return
    setPickedMeaning(choice.meaning)
    const correct = choice.word === round.target.word
    setStatus(correct ? 'correct' : 'wrong')
    setStreak((s) => (correct ? s + 1 : 0))
    reactCompanion(
      setCompanionLine,
      'ja',
      { type: 'game_answer', correct, word: round.target.word, english: round.target.meaning, lang: 'ja' },
      correct ? COMPANION_CORRECT_LINES : COMPANION_WRONG_LINES,
    )
    setTimeout(nextRound, ADVANCE_DELAY_MS)
  }

  if (!round) {
    return <p className="favorites-empty">Not enough onomatopoeia loaded for this game yet.</p>
  }

  return (
    <div className="game-card">
      <div className="streak-counter">🔥 {streak}</div>
      <div className="game-instruction">What does this sound-word describe?</div>
      <div className="game-prompt-english">{round.target.word}</div>
      <div className="game-subinstruction">{round.target.romaji}</div>

      <div className="game-choices">
        {round.choices.map((choice) => {
          const isPicked = pickedMeaning === choice.meaning
          const isTarget = choice.word === round.target.word
          let cls = 'game-choice-button'
          if (status !== 'playing' && isTarget) cls += ' game-choice-correct'
          else if (status === 'wrong' && isPicked) cls += ' game-choice-wrong'
          return (
            <button key={choice.word} className={cls} disabled={status !== 'playing'} onClick={() => handleChoice(choice)}>
              {choice.meaning}
            </button>
          )
        })}
      </div>

      <button className="game-skip-button" onClick={nextRound} disabled={status !== 'playing'}>
        Skip
      </button>

      {companionLine && (
        <div className={`companion-line companion-line-${status}`} aria-live="polite">
          {companionLine}
        </div>
      )}
    </div>
  )
}
