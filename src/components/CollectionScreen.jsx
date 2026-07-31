import { useEffect, useMemo, useState } from 'react'
import { getAllKanji } from '../lib/kanji'
import {
  getUnlockedKanji,
  getDaysRead,
  clearUnseenKanji,
  clearAllProgress,
  getFavoriteStories,
} from '../lib/storage'
import { syncAppBadge } from '../lib/badge'
import BottomNav from './BottomNav'

export default function CollectionScreen({ stories, activeTab, onChangeTab, onExploreChar }) {
  const allKanji = useMemo(() => getAllKanji(stories), [stories])
  const unlocked = useMemo(() => getUnlockedKanji(), [])
  const daysRead = useMemo(() => getDaysRead(), [])
  const favoritesCount = useMemo(() => getFavoriteStories().size, [])
  const [selected, setSelected] = useState(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    clearUnseenKanji()
    syncAppBadge(0)
  }, [])

  const unlockedCount = allKanji.filter((k) => unlocked.has(k.char)).length

  function handleDeleteAll() {
    clearAllProgress()
    window.location.reload()
  }

  return (
    <div className="screen collection-screen">
      <header className="collection-header">
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

      <button className="delete-progress-button" onClick={() => setConfirmingDelete(true)}>
        Delete all progress
      </button>

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
            <p className="story-list-title-ja">{stories[selected.sourceStoryIndex].titleNative}</p>
            <p className="story-list-title-en">{stories[selected.sourceStoryIndex].titleEn}</p>
            <button
              className="explore-link-button"
              onClick={() => {
                onExploreChar(selected.char)
                setSelected(null)
              }}
            >
              Explore this word →
            </button>
          </div>
        </div>
      )}

      {confirmingDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmingDelete(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete all progress?</h2>
            </div>
            <p>
              This clears your reading position, unlocked kanji, days read, and favorites. This
              can't be undone.
            </p>
            <div className="modal-actions">
              <button className="icon-button" onClick={() => setConfirmingDelete(false)}>
                Cancel
              </button>
              <button className="delete-progress-confirm-button" onClick={handleDeleteAll}>
                Delete everything
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav active={activeTab} onChange={onChangeTab} badges={{ favorites: favoritesCount }} />
    </div>
  )
}
