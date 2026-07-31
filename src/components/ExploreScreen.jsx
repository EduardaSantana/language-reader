import { useMemo, useRef, useState } from 'react'
import grammarPoints from '../data/grammar_points_ja.json'
import { buildExploreGraph } from '../lib/explore'
import { getUnseenSavedWords } from '../lib/storage'
import BottomNav from './BottomNav'

const SWIPE_THRESHOLD = 70

export default function ExploreScreen({ stories, charSeed, activeTab, onChangeTab }) {
  const graph = useMemo(() => buildExploreGraph(stories, grammarPoints), [stories])
  const unseenCount = useMemo(() => getUnseenSavedWords().size, [])
  const [current, setCurrent] = useState(() => {
    const seededWord = charSeed ? graph.findWordContainingChar(charSeed) : null
    return seededWord ? { type: 'vocab', key: seededWord } : { type: 'vocab', key: graph.startingVocab[0] }
  })
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [exiting, setExiting] = useState(null) // 'left' | 'right' | 'chip' | null
  const dragStartX = useRef(null)

  const node = graph.getNode(current.type, current.key)

  function defaultNext() {
    if (node?.related?.length > 0) return node.related[0]
    const pool = graph.startingVocab
    const idx = (graph.startingVocab.indexOf(current.key) + 1) % pool.length
    return { type: 'vocab', key: pool[idx] }
  }

  function goTo(target, exitDirection) {
    setExiting(exitDirection)
    setTimeout(() => {
      setCurrent({ type: target.type, key: target.key })
      setDragX(0)
      setExiting(null)
    }, 180)
  }

  function handlePointerDown(e) {
    dragStartX.current = e.clientX
    setDragging(true)
  }

  function handlePointerMove(e) {
    if (dragStartX.current == null) return
    setDragX(e.clientX - dragStartX.current)
  }

  function handlePointerUp() {
    if (dragStartX.current == null) return
    const delta = dragX
    dragStartX.current = null
    setDragging(false)
    if (Math.abs(delta) > SWIPE_THRESHOLD) {
      goTo(defaultNext(), delta < 0 ? 'left' : 'right')
    } else {
      setDragX(0)
    }
  }

  function handleChipTap(rel) {
    goTo(rel, 'chip')
  }

  const cardStyle = dragging
    ? { transform: `translateX(${dragX}px) rotate(${dragX / 40}deg)`, transition: 'none' }
    : exiting === 'left'
      ? { transform: 'translateX(-120%) rotate(-8deg)', opacity: 0 }
      : exiting === 'right'
        ? { transform: 'translateX(120%) rotate(8deg)', opacity: 0 }
        : exiting === 'chip'
          ? { transform: 'scale(0.9)', opacity: 0 }
          : { transform: 'translateX(0)', opacity: 1 }

  return (
    <div className="screen explore-screen">
      <header className="collection-header">
        <h1>Explore</h1>
      </header>

      <div className="explore-body">
        {!node ? (
          <p className="favorites-empty">Nothing to show yet.</p>
        ) : (
          <>
            <div className="explore-carousel">
              <div
                className={`explore-card explore-card-${node.type}`}
                style={cardStyle}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                <div className="explore-card-kind">{node.type === 'grammar' ? 'Grammar' : 'Vocab'}</div>
                <div className="explore-card-title">{node.title}</div>
                {node.subtitle && <div className="explore-card-subtitle">{node.subtitle}</div>}
                {node.exampleSentence && (
                  <div className="explore-card-example" lang="ja">
                    {node.exampleSentence}
                    {node.exampleSource && <div className="explore-card-source">— {node.exampleSource}</div>}
                  </div>
                )}
                <div className="explore-swipe-hint">← swipe for more, tap a chip to redirect →</div>
              </div>
            </div>

            <div className="explore-chips">
              {node.related.length === 0 && (
                <div className="favorites-empty">No related words or patterns found.</div>
              )}
              {node.related.map((rel) => (
                <button
                  key={`${rel.type}-${rel.key}`}
                  className={`explore-chip explore-chip-${rel.type}`}
                  onClick={() => handleChipTap(rel)}
                >
                  {rel.label}
                </button>
              ))}
            </div>

            <div className="explore-starters">
              <div className="explore-starters-label">Grammar patterns</div>
              <div className="explore-chips">
                {graph.grammarPatterns.map((pattern) => (
                  <button
                    key={pattern}
                    className={`explore-chip explore-chip-grammar ${current.type === 'grammar' && current.key === pattern ? 'active' : ''}`}
                    onClick={() => handleChipTap({ type: 'grammar', key: pattern })}
                  >
                    {pattern}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <BottomNav active={activeTab} onChange={onChangeTab} badges={{ collection: unseenCount }} />
    </div>
  )
}
