import { useState } from 'react'
import { pickCategorySort, COMPANION_CORRECT_LINES, COMPANION_WRONG_LINES } from '../lib/games'
import { reactCompanion } from '../lib/companion'

export default function CategorySortGame({ pool, lang, stories }) {
  const [round, setRound] = useState(() => pickCategorySort(pool, lang, stories))
  const [selectedKey, setSelectedKey] = useState(null)
  const [placements, setPlacements] = useState({})
  const [companionLine, setCompanionLine] = useState(null)

  function itemKey(item) {
    return `${item.lang}:${item.word}`
  }

  function nextRound() {
    setRound(pickCategorySort(pool, lang, stories))
    setSelectedKey(null)
    setPlacements({})
    setCompanionLine(null)
  }

  function handlePlace(bucketId) {
    if (!selectedKey) return
    const item = round.items.find((i) => itemKey(i) === selectedKey)
    const correct = item.bucketId === bucketId
    const nextPlacements = { ...placements, [selectedKey]: { bucketId, correct } }
    setPlacements(nextPlacements)
    setSelectedKey(null)

    if (Object.keys(nextPlacements).length === round.items.length) {
      const correctCount = Object.values(nextPlacements).filter((p) => p.correct).length
      const allCorrect = correctCount === round.items.length
      reactCompanion(
        setCompanionLine,
        lang,
        { type: 'game_answer', correct: allCorrect, word: `${correctCount}/${round.items.length} sorted`, english: 'category sort', lang },
        allCorrect ? COMPANION_CORRECT_LINES : COMPANION_WRONG_LINES,
      )
    }
  }

  if (!round) {
    return (
      <p className="favorites-empty">
        Read a few more stories in this language first — this game needs several words per story to sort.
      </p>
    )
  }

  const allPlaced = Object.keys(placements).length === round.items.length

  return (
    <div className="game-card category-sort-game">
      <div className="game-instruction">Sort each word into the story it came from</div>
      <div className="game-subinstruction">
        Buckets are grouped by source story, not real semantic categories — the corpus doesn't have those yet.
      </div>

      <div className="category-buckets">
        {round.buckets.map((bucket) => (
          <button
            key={bucket.bucketId}
            className={`category-bucket ${selectedKey ? 'targetable' : ''}`}
            onClick={() => handlePlace(bucket.bucketId)}
          >
            {bucket.label}
          </button>
        ))}
      </div>

      <div className="category-items">
        {round.items.map((item) => {
          const key = itemKey(item)
          const placement = placements[key]
          let cls = 'category-item'
          if (placement) cls += placement.correct ? ' category-item-correct' : ' category-item-wrong'
          else if (selectedKey === key) cls += ' selected'
          return (
            <button
              key={key}
              className={cls}
              disabled={!!placement}
              onClick={() => setSelectedKey(key)}
            >
              {item.word}
            </button>
          )
        })}
      </div>

      {allPlaced && (
        <>
          {companionLine && (
            <div className="companion-line" aria-live="polite">
              {companionLine}
            </div>
          )}
          <button className="game-skip-button" onClick={nextRound}>
            Play again
          </button>
        </>
      )}
    </div>
  )
}
