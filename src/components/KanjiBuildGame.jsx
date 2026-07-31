import { useState } from 'react'
import { pickKanjiBuild, COMPANION_CORRECT_LINES, COMPANION_WRONG_LINES } from '../lib/games'
import { reactCompanion } from '../lib/companion'

const ADVANCE_DELAY_MS = 1200
const WRONG_FLASH_MS = 400

export default function KanjiBuildGame({ kanjiComponents }) {
  const [round, setRound] = useState(() => pickKanjiBuild(kanjiComponents))
  const [assembled, setAssembled] = useState([])
  const [wrongTap, setWrongTap] = useState(null)
  const [streak, setStreak] = useState(0)
  const [companionLine, setCompanionLine] = useState(null)
  const [complete, setComplete] = useState(false)

  function nextRound() {
    setRound(pickKanjiBuild(kanjiComponents))
    setAssembled([])
    setWrongTap(null)
    setCompanionLine(null)
    setComplete(false)
  }

  function handleTap(component, index) {
    if (complete) return
    const alreadyUsed = assembled.filter((a) => a === component).length
    const neededCount = round.correctComponents.filter((c) => c === component).length
    const isCorrect = neededCount > 0 && alreadyUsed < neededCount

    if (isCorrect) {
      const nextAssembled = [...assembled, component]
      setAssembled(nextAssembled)
      if (nextAssembled.length === round.correctComponents.length) {
        setComplete(true)
        setStreak((s) => s + 1)
        reactCompanion(
          setCompanionLine,
          'ja',
          { type: 'game_answer', correct: true, word: round.kanji, english: 'kanji components', lang: 'ja' },
          COMPANION_CORRECT_LINES,
        )
        setTimeout(nextRound, ADVANCE_DELAY_MS)
      }
    } else {
      setWrongTap(index)
      setStreak(0)
      reactCompanion(
        setCompanionLine,
        'ja',
        { type: 'game_answer', correct: false, word: round.kanji, english: 'kanji components', lang: 'ja' },
        COMPANION_WRONG_LINES,
      )
      setTimeout(() => setWrongTap(null), WRONG_FLASH_MS)
    }
  }

  if (!round) {
    return <p className="favorites-empty">No kanji breakdown data available.</p>
  }

  return (
    <div className="game-card">
      <div className="streak-counter">🔥 {streak}</div>
      <div className="game-instruction">Tap the components that build this kanji</div>
      <div className="kanji-build-target">{round.kanji}</div>

      <div className="kanji-build-assembled">
        {round.correctComponents.map((_, i) => (
          <span key={i} className="kanji-build-slot">
            {assembled[i] ?? ''}
          </span>
        ))}
      </div>

      <div className="kanji-build-choices">
        {round.choices.map((component, i) => {
          const usedCount = assembled.filter((a) => a === component).length
          const totalCount = round.correctComponents.filter((c) => c === component).length
          const isUsed = totalCount > 0 && usedCount >= totalCount
          return (
            <button
              key={`${component}-${i}`}
              className={`kanji-component-button ${wrongTap === i ? 'wrong' : ''} ${isUsed ? 'used' : ''}`}
              disabled={isUsed || complete}
              onClick={() => handleTap(component, i)}
            >
              {component}
            </button>
          )
        })}
      </div>

      {companionLine && (
        <div className={`companion-line companion-line-${complete ? 'correct' : 'wrong'}`} aria-live="polite">
          {companionLine}
        </div>
      )}
    </div>
  )
}
