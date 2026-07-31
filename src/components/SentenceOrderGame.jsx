import { useState } from 'react'
import { pickSentenceForOrder, shuffle, COMPANION_CORRECT_LINES, COMPANION_WRONG_LINES } from '../lib/games'
import { reactCompanion } from '../lib/companion'

const ADVANCE_DELAY_MS = 1400
const RETRY_DELAY_MS = 1100

function buildPool(tiles) {
  return shuffle(tiles.map((seg, i) => ({ tileId: i, text: seg.text, originalIndex: i })))
}

export default function SentenceOrderGame({ stories, readIndices, lang }) {
  const [round, setRound] = useState(() => pickSentenceForOrder(stories, readIndices, lang))
  const [pool, setPool] = useState(() => (round ? buildPool(round.tiles) : []))
  const [placed, setPlaced] = useState([])
  const [status, setStatus] = useState('playing')
  const [companionLine, setCompanionLine] = useState(null)

  function nextRound() {
    const next = pickSentenceForOrder(stories, readIndices, lang)
    setRound(next)
    setPool(next ? buildPool(next.tiles) : [])
    setPlaced([])
    setStatus('playing')
    setCompanionLine(null)
  }

  function handleTapPoolTile(tile) {
    if (status !== 'playing') return
    const nextPlaced = [...placed, tile]
    const nextPool = pool.filter((t) => t.tileId !== tile.tileId)
    setPlaced(nextPlaced)
    setPool(nextPool)

    if (nextPlaced.length === round.tiles.length) {
      const correct = nextPlaced.every((t, i) => t.originalIndex === i)
      setStatus(correct ? 'correct' : 'wrong')
      reactCompanion(
        setCompanionLine,
        lang,
        { type: 'game_answer', correct, word: round.tiles.map((t) => t.text).join(''), english: 'word order', lang },
        correct ? COMPANION_CORRECT_LINES : COMPANION_WRONG_LINES,
      )
      if (correct) {
        setTimeout(nextRound, ADVANCE_DELAY_MS)
      } else {
        setTimeout(() => {
          setPool(buildPool(round.tiles))
          setPlaced([])
          setStatus('playing')
          setCompanionLine(null)
        }, RETRY_DELAY_MS)
      }
    }
  }

  function handleReset() {
    if (status !== 'playing') return
    setPool(shuffle([...pool, ...placed]))
    setPlaced([])
  }

  if (!round) {
    return (
      <p className="favorites-empty">
        Read a few stories in this language first — this game reconstructs sentences you've already seen.
      </p>
    )
  }

  return (
    <div className="game-card sentence-order-game">
      <div className="game-instruction">Put the sentence back in order</div>

      <div className="sentence-answer-row" lang={lang}>
        {placed.length === 0 && <span className="sentence-answer-placeholder">Tap words below…</span>}
        {placed.map((tile) => (
          <span key={tile.tileId} className="sentence-answer-tile">
            {tile.text}
          </span>
        ))}
      </div>

      <div className="sentence-pool-row" lang={lang}>
        {pool.map((tile) => (
          <button
            key={tile.tileId}
            className="sentence-pool-tile"
            onClick={() => handleTapPoolTile(tile)}
            disabled={status !== 'playing'}
          >
            {tile.text}
          </button>
        ))}
      </div>

      <div className="game-row-actions">
        <button className="game-skip-button" onClick={handleReset} disabled={placed.length === 0 || status !== 'playing'}>
          Reset
        </button>
        <button className="game-skip-button" onClick={nextRound}>
          Skip
        </button>
      </div>

      {companionLine && (
        <div className={`companion-line companion-line-${status}`} aria-live="polite">
          {companionLine}
        </div>
      )}
    </div>
  )
}
