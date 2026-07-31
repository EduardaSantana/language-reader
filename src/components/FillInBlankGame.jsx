import { useState } from 'react'
import { pickFillInBlank, COMPANION_CORRECT_LINES, COMPANION_WRONG_LINES } from '../lib/games'
import { reactCompanion } from '../lib/companion'

const ADVANCE_DELAY_MS = 1400

export default function FillInBlankGame({ stories, readIndices, lang, pool }) {
  const [round, setRound] = useState(() => pickFillInBlank(stories, readIndices, lang, pool))
  const [streak, setStreak] = useState(0)
  const [status, setStatus] = useState('playing')
  const [pickedWord, setPickedWord] = useState(null)
  const [companionLine, setCompanionLine] = useState(null)

  function nextRound() {
    setRound(pickFillInBlank(stories, readIndices, lang, pool))
    setStatus('playing')
    setPickedWord(null)
    setCompanionLine(null)
  }

  function handleChoice(word) {
    if (status !== 'playing') return
    setPickedWord(word)
    const correct = word === round.answer
    setStatus(correct ? 'correct' : 'wrong')
    setStreak((s) => (correct ? s + 1 : 0))
    reactCompanion(
      setCompanionLine,
      lang,
      { type: 'game_answer', correct, word: round.answer, english: round.story.titleEn, lang },
      correct ? COMPANION_CORRECT_LINES : COMPANION_WRONG_LINES,
    )
    setTimeout(nextRound, ADVANCE_DELAY_MS)
  }

  if (!round) {
    return (
      <p className="favorites-empty">
        Mark a few stories as read in this language first — this game fills in the blank from a sentence you've read.
      </p>
    )
  }

  return (
    <div className="game-card">
      <div className="streak-counter">🔥 {streak}</div>
      <div className="game-instruction">Fill in the blank</div>
      <div className="fill-blank-sentence" lang={lang}>
        {round.sentence.map((seg, i) =>
          i === round.blankIndex ? (
            <span key={i} className="fill-blank-gap">
              ____
            </span>
          ) : (
            <span key={i}>{seg.text}</span>
          ),
        )}
      </div>
      <div className="game-instruction fill-blank-source">— {round.story.titleEn}</div>

      <div className="game-choices">
        {round.choices.map((word) => {
          const isPicked = pickedWord === word
          const isAnswer = word === round.answer
          let cls = 'game-choice-button'
          if (status !== 'playing' && isAnswer) cls += ' game-choice-correct'
          else if (status === 'wrong' && isPicked) cls += ' game-choice-wrong'
          return (
            <button key={word} className={cls} disabled={status !== 'playing'} onClick={() => handleChoice(word)}>
              {word}
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
