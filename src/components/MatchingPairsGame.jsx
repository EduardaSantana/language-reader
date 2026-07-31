import { useMemo, useState } from 'react'
import { pickMatchingSet, shuffle, COMPANION_CORRECT_LINES } from '../lib/games'
import { reactCompanion } from '../lib/companion'

const MISMATCH_DELAY_MS = 700

function buildCards(pairs) {
  const cards = pairs.flatMap((entry, i) => [
    { cardId: `${i}-word`, matchId: i, text: entry.word, kind: 'word' },
    { cardId: `${i}-meaning`, matchId: i, text: entry.english, kind: 'meaning' },
  ])
  return shuffle(cards)
}

export default function MatchingPairsGame({ pool, lang }) {
  const [pairs, setPairs] = useState(() => pickMatchingSet(pool, lang))
  const [cards, setCards] = useState(() => (pairs ? buildCards(pairs) : []))
  const [flipped, setFlipped] = useState([])
  const [matchedIds, setMatchedIds] = useState(new Set())
  const [mismatchPair, setMismatchPair] = useState([])
  const [companionLine, setCompanionLine] = useState(null)
  const busy = mismatchPair.length > 0

  const complete = pairs != null && matchedIds.size === pairs.length

  function newRound() {
    const nextPairs = pickMatchingSet(pool, lang)
    setPairs(nextPairs)
    setCards(nextPairs ? buildCards(nextPairs) : [])
    setFlipped([])
    setMatchedIds(new Set())
    setMismatchPair([])
    setCompanionLine(null)
  }

  function handleFlip(card) {
    if (busy || complete) return
    if (matchedIds.has(card.matchId)) return
    if (flipped.includes(card.cardId)) return
    if (flipped.length === 2) return

    const nextFlipped = [...flipped, card.cardId]
    setFlipped(nextFlipped)

    if (nextFlipped.length === 2) {
      const [firstId, secondId] = nextFlipped
      const first = cards.find((c) => c.cardId === firstId)
      const second = cards.find((c) => c.cardId === secondId)
      if (first.matchId === second.matchId) {
        const nextMatched = new Set(matchedIds).add(first.matchId)
        setTimeout(() => {
          setMatchedIds(nextMatched)
          setFlipped([])
          if (nextMatched.size === pairs.length) {
            reactCompanion(
              setCompanionLine,
              lang,
              { type: 'game_answer', correct: true, word: `${pairs.length} pairs`, english: 'matched them all', lang },
              COMPANION_CORRECT_LINES,
            )
          }
        }, 250)
      } else {
        setMismatchPair(nextFlipped)
        setTimeout(() => {
          setMismatchPair([])
          setFlipped([])
        }, MISMATCH_DELAY_MS)
      }
    }
  }

  if (!pairs) {
    return <p className="favorites-empty">Read a few stories in this language first to build up a word pool.</p>
  }

  return (
    <div className="game-card matching-game">
      <div className="game-instruction">Match each word to its meaning</div>

      <div className="matching-grid">
        {cards.map((card) => {
          const isFaceUp = flipped.includes(card.cardId) || matchedIds.has(card.matchId)
          const isMismatch = mismatchPair.includes(card.cardId)
          const isMatched = matchedIds.has(card.matchId)
          return (
            <button
              key={card.cardId}
              className={`match-card ${isFaceUp ? 'face-up' : ''} ${isMismatch ? 'mismatch' : ''} ${isMatched ? 'matched' : ''}`}
              onClick={() => handleFlip(card)}
              disabled={isMatched}
            >
              {isFaceUp ? card.text : '?'}
            </button>
          )
        })}
      </div>

      {complete && (
        <>
          {companionLine && (
            <div className="companion-line companion-line-correct" aria-live="polite">
              {companionLine}
            </div>
          )}
          <button className="game-skip-button" onClick={newRound}>
            Play again
          </button>
        </>
      )}
    </div>
  )
}
