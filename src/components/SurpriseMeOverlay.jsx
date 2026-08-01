import { useMemo, useRef, useState } from 'react'
import { buildExploreGraph } from '../lib/exploreGraph'
import EntryCard from './EntryCard'

export default function SurpriseMeOverlay({ stories, onOpenNode }) {
  const graph = useMemo(() => buildExploreGraph(stories), [stories])
  const [open, setOpen] = useState(false)
  const [currentId, setCurrentId] = useState(null)
  const lastIdRef = useRef(null)

  function rollAgain() {
    const pool = graph.allIds.length > 1 ? graph.allIds.filter((id) => id !== lastIdRef.current) : graph.allIds
    const pick = pool[Math.floor(Math.random() * pool.length)]
    lastIdRef.current = pick
    setCurrentId(pick)
  }

  function handleOpen() {
    rollAgain()
    setOpen(true)
  }

  function handleGoDeeper() {
    onOpenNode?.(currentId)
    setOpen(false)
  }

  const node = currentId ? graph.getNode(currentId) : null

  return (
    <>
      <button className="surprise-fab" onClick={handleOpen} aria-label="Surprise me">
        🎲
      </button>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal surprise-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🎲 Surprise me</h2>
              <button className="icon-button" onClick={() => setOpen(false)} aria-label="Close">
                ✕
              </button>
            </div>

            {node && <EntryCard node={node} />}

            <div className="game-row-actions">
              <button className="game-skip-button" onClick={rollAgain}>
                🎲 Again
              </button>
              <button className="explore-link-button" onClick={handleGoDeeper}>
                Go deeper →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
