import { useState } from 'react'
import compounds from '../data/compounds_de.json'
import { pickCompoundBuild, COMPANION_CORRECT_LINES, COMPANION_WRONG_LINES } from '../lib/games'
import { reactCompanion } from '../lib/companion'

const ADVANCE_DELAY_MS = 1400
const WRONG_FLASH_MS = 400

export default function CompoundBuilderGame() {
  const [round, setRound] = useState(() => pickCompoundBuild(compounds))
  const [assembled, setAssembled] = useState([])
  const [wrongTap, setWrongTap] = useState(null)
  const [streak, setStreak] = useState(0)
  const [companionLine, setCompanionLine] = useState(null)
  const [complete, setComplete] = useState(false)

  function nextRound() {
    setRound(pickCompoundBuild(compounds))
    setAssembled([])
    setWrongTap(null)
    setCompanionLine(null)
    setComplete(false)
  }

  function handleTap(part, index) {
    if (complete) return
    const expected = round.correctParts[assembled.length]
    const isCorrect = part === expected

    if (isCorrect) {
      const nextAssembled = [...assembled, part]
      setAssembled(nextAssembled)
      if (nextAssembled.length === round.correctParts.length) {
        setComplete(true)
        setStreak((s) => s + 1)
        reactCompanion(
          setCompanionLine,
          'de',
          { type: 'game_answer', correct: true, word: round.word, english: round.english, lang: 'de' },
          COMPANION_CORRECT_LINES,
        )
        setTimeout(nextRound, ADVANCE_DELAY_MS)
      }
    } else {
      setWrongTap(index)
      setStreak(0)
      reactCompanion(
        setCompanionLine,
        'de',
        { type: 'game_answer', correct: false, word: round.word, english: round.english, lang: 'de' },
        COMPANION_WRONG_LINES,
      )
      setTimeout(() => setWrongTap(null), WRONG_FLASH_MS)
    }
  }

  if (!round) {
    return <p className="favorites-empty">No compound data available.</p>
  }

  return (
    <div className="game-card">
      <div className="streak-counter">🔥 {streak}</div>
      <div className="game-instruction">Assemble the German compound for…</div>
      <div className="game-prompt-english">{round.english}</div>

      <div className="kanji-build-assembled">
        {round.correctParts.map((_, i) => (
          <span key={i} className="kanji-build-slot compound-slot">
            {assembled[i] ?? ''}
          </span>
        ))}
      </div>

      <div className="kanji-build-choices">
        {round.choices.map((part, i) => {
          const usedCount = assembled.filter((a) => a === part).length
          const totalCount = round.correctParts.filter((c) => c === part).length
          const isUsed = totalCount > 0 && usedCount >= totalCount
          return (
            <button
              key={`${part}-${i}`}
              className={`kanji-component-button compound-button ${wrongTap === i ? 'wrong' : ''} ${isUsed ? 'used' : ''}`}
              disabled={isUsed || complete}
              onClick={() => handleTap(part, i)}
            >
              <span className="kanji-component-char">{part}</span>
              <span className="kanji-component-meaning">{round.meanings[part] || '—'}</span>
            </button>
          )
        })}
      </div>

      {complete && <div className="game-subinstruction">{round.word}</div>}

      {companionLine && (
        <div className={`companion-line companion-line-${complete ? 'correct' : 'wrong'}`} aria-live="polite">
          {companionLine}
        </div>
      )}
    </div>
  )
}
