import { useEffect, useState } from 'react'
import { pickRound, COMPANION_CORRECT_LINES, COMPANION_WRONG_LINES } from '../lib/games'
import { reactCompanion } from '../lib/companion'
import { getWordImage } from '../lib/images'

const ADVANCE_DELAY_MS = 1400

export default function ImageGuessGame({ pool, stories, lang }) {
  const [round, setRound] = useState(() => pickRound(pool, lang))
  const [imageUrl, setImageUrl] = useState(null)
  const [streak, setStreak] = useState(0)
  const [status, setStatus] = useState('playing')
  const [pickedWord, setPickedWord] = useState(null)
  const [companionLine, setCompanionLine] = useState(null)

  useEffect(() => {
    let cancelled = false
    setImageUrl(null)
    if (round) {
      getWordImage(round.target.english).then((url) => {
        if (!cancelled) setImageUrl(url)
      })
    }
    return () => {
      cancelled = true
    }
  }, [round])

  function nextRound() {
    setRound(pickRound(pool, lang))
    setStatus('playing')
    setPickedWord(null)
    setCompanionLine(null)
  }

  function handleChoice(choice) {
    if (status !== 'playing') return
    setPickedWord(choice.word)
    const correct = choice.word === round.target.word
    setStatus(correct ? 'correct' : 'wrong')
    setStreak((s) => (correct ? s + 1 : 0))
    reactCompanion(
      setCompanionLine,
      lang,
      { type: 'game_answer', correct, word: round.target.word, english: round.target.english, lang },
      correct ? COMPANION_CORRECT_LINES : COMPANION_WRONG_LINES,
    )
    setTimeout(nextRound, ADVANCE_DELAY_MS)
  }

  if (!round) {
    return <p className="favorites-empty">Read a few stories in this language first to build up a word pool.</p>
  }

  const promptStory = stories[round.target.storyIndex]

  return (
    <div className="game-card">
      <div className="streak-counter">🔥 {streak}</div>
      {imageUrl ? (
        <img className="game-prompt-image" src={imageUrl} alt={round.target.english} />
      ) : (
        <div className="game-prompt-emoji">{promptStory?.emoji || '📗'}</div>
      )}
      <div className="game-instruction">What's the word for this?</div>

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
