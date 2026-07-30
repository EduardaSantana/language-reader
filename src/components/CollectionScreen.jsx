import { useEffect, useMemo, useState } from 'react'
import { getAllKanji } from '../lib/kanji'
import { getUnlockedKanji, getDaysRead, clearUnseenKanji } from '../lib/storage'
import { syncAppBadge } from '../lib/badge'

export default function CollectionScreen({ stories, onBack }) {
  const allKanji = useMemo(() => getAllKanji(stories), [stories])
  const unlocked = useMemo(() => getUnlockedKanji(), [])
  const daysRead = useMemo(() => getDaysRead(), [])
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    clearUnseenKanji()
    syncAppBadge(0)
  }, [])

  const unlockedCount = allKanji.filter((k) => unlocked.has(k.char)).length

  return (
    <div className="screen collection-screen">
      <header className="collection-header">
        <button className="icon-button" onClick={onBack} aria-label="Back to reading">
          ←
        </button>
        <h1>Collection</h1>
      </header>

      <div className="stats">
        <div className="stat">
          <div className="stat-value">{daysRead.count}</div>
          <div className="stat-label">days read</div>
        </div>
        <div className="stat">
          <div className="stat-value">
            {unlockedCount} / {allKanji.length}
          </div>
          <div className="stat-label">kanji unlocked</div>
        </div>
      </div>

      <div className="kanji-grid">
        {allKanji.map(({ char, sourceStoryIndex }) => {
          const isUnlocked = unlocked.has(char)
          return (
            <button
              key={char}
              className={`kanji-tile ${isUnlocked ? 'unlocked' : 'locked'}`}
              disabled={!isUnlocked}
              onClick={() => setSelected({ char, sourceStoryIndex })}
            >
              {char}
            </button>
          )
        })}
      </div>

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selected.char}</h2>
              <button className="icon-button" onClick={() => setSelected(null)} aria-label="Close">
                ✕
              </button>
            </div>
            <p>First seen in:</p>
            <p className="story-list-title-ja">{stories[selected.sourceStoryIndex].title_ja}</p>
            <p className="story-list-title-en">{stories[selected.sourceStoryIndex].title_en}</p>
          </div>
        </div>
      )}
    </div>
  )
}
