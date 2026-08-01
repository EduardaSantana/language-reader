import { useMemo, useState } from 'react'
import kanaJa from '../data/kana_ja.json'
import alphabetRu from '../data/alphabet_ru.json'
import { pickAlphabetRound, COMPANION_CORRECT_LINES, COMPANION_WRONG_LINES } from '../lib/games'
import { reactCompanion } from '../lib/companion'

const ADVANCE_DELAY_MS = 1400

function poolForLang(lang) {
  if (lang === 'ja') return kanaJa.map((e) => ({ char: e.hiragana, answer: e.romaji }))
  if (lang === 'ru') return alphabetRu.map((e) => ({ char: e.letter, answer: e.romanization }))
  return []
}

export default function AlphabetGame({ lang }) {
  const pool = useMemo(() => poolForLang(lang), [lang])
  const [round, setRound] = useState(() => pickAlphabetRound(pool))
  const [streak, setStreak] = useState(0)
  const [status, setStatus] = useState('playing')
  const [picked, setPicked] = useState(null)
  const [companionLine, setCompanionLine] = useState(null)

  function nextRound() {
    setRound(pickAlphabetRound(pool))
    setStatus('playing')
    setPicked(null)
    setCompanionLine(null)
  }

  function handleChoice(choice) {
    if (status !== 'playing') return
    setPicked(choice.char)
    const correct = choice.char === round.target.char
    setStatus(correct ? 'correct' : 'wrong')
    setStreak((s) => (correct ? s + 1 : 0))
    reactCompanion(
      setCompanionLine,
      lang,
      { type: 'game_answer', correct, word: round.target.char, english: round.target.answer, lang },
      correct ? COMPANION_CORRECT_LINES : COMPANION_WRONG_LINES,
    )
    setTimeout(nextRound, ADVANCE_DELAY_MS)
  }

  if (!round) {
    return <p className="favorites-empty">No alphabet data available for this language.</p>
  }

  return (
    <div className="game-card">
      <div className="streak-counter">🔥 {streak}</div>
      <div className="game-instruction">What's the romanization for…</div>
      <div className="alphabet-prompt-char" lang={lang}>
        {round.target.char}
      </div>

      <div className="game-choices">
        {round.choices.map((choice) => {
          const isPicked = picked === choice.char
          const isTarget = choice.char === round.target.char
          let cls = 'game-choice-button'
          if (status !== 'playing' && isTarget) cls += ' game-choice-correct'
          else if (status === 'wrong' && isPicked) cls += ' game-choice-wrong'
          return (
            <button
              key={choice.char}
              className={cls}
              disabled={status !== 'playing'}
              onClick={() => handleChoice(choice)}
            >
              {choice.answer}
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
