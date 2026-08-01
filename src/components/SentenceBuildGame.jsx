import { useMemo, useState } from 'react'
import puzzlesFr from '../data/sentence_puzzles_fr.json'
import puzzlesDe from '../data/sentence_puzzles_de.json'
import grammarFr from '../data/grammar_points_fr.json'
import grammarDe from '../data/grammar_points_de.json'
import { shuffle, pickSentencePuzzle, COMPANION_CORRECT_LINES } from '../lib/games'
import { reactCompanion } from '../lib/companion'

const PUZZLES_BY_LANG = { fr: puzzlesFr, de: puzzlesDe }
const GRAMMAR_BY_LANG = { fr: grammarFr, de: grammarDe }
const SETTLE_MS = 550

function buildTiles(puzzle) {
  const withIndex = puzzle.tiles.map((t, i) => ({ ...t, correctIndex: i }))
  let scrambled = shuffle(withIndex)
  while (puzzle.tiles.length > 1 && scrambled.every((t, i) => t.correctIndex === i)) {
    scrambled = shuffle(withIndex)
  }
  return scrambled
}

export default function SentenceBuildGame({ lang, initialPuzzleId }) {
  const puzzles = PUZZLES_BY_LANG[lang] ?? []
  const grammarPoints = GRAMMAR_BY_LANG[lang] ?? []

  const [round, setRound] = useState(() => {
    const seeded = initialPuzzleId ? puzzles.find((p) => p.id === initialPuzzleId) : null
    return seeded ?? pickSentencePuzzle(puzzles, null)
  })
  const [tiles, setTiles] = useState(() => (round ? buildTiles(round) : []))
  const [selected, setSelected] = useState(null)
  const [solved, setSolved] = useState(false)
  const [settling, setSettling] = useState(false)
  const [companionLine, setCompanionLine] = useState(null)

  const bridgeNote = useMemo(
    () => (round ? grammarPoints.find((g) => g.id === round.grammar_point_id) ?? null : null),
    [round, grammarPoints],
  )

  function nextRound(excludeId) {
    const next = pickSentencePuzzle(puzzles, excludeId)
    setRound(next)
    setTiles(next ? buildTiles(next) : [])
    setSelected(null)
    setSolved(false)
    setSettling(false)
    setCompanionLine(null)
  }

  function handleTapTile(index) {
    if (solved) return
    if (selected === null) {
      setSelected(index)
      return
    }
    if (selected === index) {
      setSelected(null)
      return
    }

    const swapped = [...tiles]
    ;[swapped[selected], swapped[index]] = [swapped[index], swapped[selected]]
    setTiles(swapped)
    setSelected(null)

    const correct = swapped.every((t, i) => t.correctIndex === i)
    if (correct) {
      setSolved(true)
      setSettling(true)
      reactCompanion(
        setCompanionLine,
        lang,
        { type: 'game_answer', correct: true, word: swapped.map((t) => t.text).join(' '), english: round.translation, lang },
        COMPANION_CORRECT_LINES,
      )
      setTimeout(() => setSettling(false), SETTLE_MS)
    }
  }

  if (!round) {
    return <p className="favorites-empty">No sentence puzzles for this language yet.</p>
  }

  const hasVerbTile = tiles.some((t) => t.role === 'verb')

  return (
    <div className="game-card sentence-build-game">
      <div className="game-instruction">Tap two tiles to swap them into the right order</div>

      <div className={`sentence-build-row ${settling ? 'settling' : ''}`} lang={lang}>
        {tiles.map((tile, i) => (
          <button
            key={tile.correctIndex}
            className={`sentence-build-tile ${selected === i ? 'selected' : ''} ${
              hasVerbTile && tile.role === 'verb' ? 'verb-tile' : ''
            }`}
            onClick={() => handleTapTile(i)}
            disabled={solved}
          >
            <span className="sentence-build-tile-text">{tile.text}</span>
            <span className="sentence-build-tile-gloss">{tile.gloss}</span>
          </button>
        ))}
      </div>

      {solved && bridgeNote && (
        <div className="bridge-note">
          <div className="bridge-note-label">
            Bridge note — {bridgeNote.bridge_lang === 'pt' ? 'Portuguese' : 'English'}
          </div>
          <div className="bridge-note-text">{bridgeNote.bridge_note}</div>
        </div>
      )}

      <div className="game-row-actions">
        <button className="game-skip-button" onClick={() => nextRound(round.id)}>
          {solved ? 'Next puzzle' : 'Skip'}
        </button>
      </div>

      {companionLine && (
        <div className="companion-line companion-line-correct" aria-live="polite">
          {companionLine}
        </div>
      )}
    </div>
  )
}
