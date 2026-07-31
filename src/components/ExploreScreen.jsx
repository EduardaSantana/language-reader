import { useEffect, useMemo, useState } from 'react'
import grammarPoints from '../data/grammar_points_ja.json'
import { buildExploreGraph } from '../lib/explore'
import { layoutWeb } from '../lib/exploreLayout'
import { getExploreWeb, addExploreNodes, getUnseenSavedWords, getSavedWords } from '../lib/storage'
import BottomNav from './BottomNav'

function nodeId(key) {
  return `ja:${key}`
}

export default function ExploreScreen({ stories, wordSeed, activeTab, onChangeTab }) {
  const graph = useMemo(() => buildExploreGraph(stories, grammarPoints), [stories])
  const unseenCount = useMemo(() => getUnseenSavedWords().size, [])
  const [webNodes, setWebNodes] = useState(() => getExploreWeb())
  const [selectedId, setSelectedId] = useState(null)
  const [starterOpen, setStarterOpen] = useState(false)

  const savedJaWords = useMemo(
    () => getSavedWords().filter((w) => w.lang === 'ja' && graph.hasVocabWord(w.word)),
    [graph],
  )

  const { positions, width, height } = useMemo(() => layoutWeb(webNodes), [webNodes])
  const nodesById = useMemo(() => new Map(webNodes.map((n) => [n.id, n])), [webNodes])

  function addRoot(type, key) {
    const id = nodeId(key)
    if (nodesById.has(id)) {
      setSelectedId(id)
      return
    }
    const updated = addExploreNodes([{ id, type, text: key, parentId: null }])
    setWebNodes(updated)
    setSelectedId(id)
    setStarterOpen(false)
  }

  function handleSurpriseMe() {
    const pool = [...graph.startingVocab.map((w) => ({ type: 'vocab', key: w })), ...graph.grammarPatterns.map((p) => ({ type: 'grammar', key: p }))]
    const pick = pool[Math.floor(Math.random() * pool.length)]
    if (pick) addRoot(pick.type, pick.key)
  }

  // Seed a root the first time a word is handed in from Collection, if it isn't already in the web.
  useEffect(() => {
    if (wordSeed?.lang === 'ja' && graph.hasVocabWord(wordSeed.word) && !nodesById.has(nodeId(wordSeed.word))) {
      const updated = addExploreNodes([{ id: nodeId(wordSeed.word), type: 'vocab', text: wordSeed.word, parentId: null }])
      setWebNodes(updated)
      setSelectedId(nodeId(wordSeed.word))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordSeed])

  function handleNodeTap(node) {
    setSelectedId(node.id)
    const info = graph.getNode(node.type, node.text)
    if (!info) return
    const existingIds = new Set(webNodes.map((n) => n.id))
    const newNodes = info.related
      .filter((rel) => !existingIds.has(nodeId(rel.key)))
      .map((rel) => ({ id: nodeId(rel.key), type: rel.type, text: rel.key, parentId: node.id }))
    if (newNodes.length > 0) {
      const updated = addExploreNodes(newNodes)
      setWebNodes(updated)
    }
  }

  const selectedNode = selectedId ? nodesById.get(selectedId) : null
  const selectedInfo = selectedNode ? graph.getNode(selectedNode.type, selectedNode.text) : null

  return (
    <div className="screen explore-screen explore-screen-web">
      <header className="collection-header">
        <h1>Explore</h1>
        <button className="icon-button explore-start-button" onClick={() => setStarterOpen(true)}>
          + Start thread
        </button>
      </header>

      {webNodes.length === 0 ? (
        <div className="explore-empty-state">
          <p className="favorites-empty">
            Your knowledge web is empty. Start from a word you've saved, or let it surprise you.
          </p>
          <button className="save-word-button" onClick={handleSurpriseMe}>
            🎲 Surprise me
          </button>
        </div>
      ) : (
        <div className="explore-web-canvas-wrap">
          <div className="explore-web-canvas" style={{ width, height }}>
            <svg className="explore-web-lines" width={width} height={height}>
              {webNodes
                .filter((n) => n.parentId && positions.get(n.id) && positions.get(n.parentId))
                .map((n) => {
                  const a = positions.get(n.parentId)
                  const b = positions.get(n.id)
                  return <line key={n.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="web-line" />
                })}
            </svg>
            {webNodes.map((n) => {
              const pos = positions.get(n.id)
              if (!pos) return null
              const isRoot = n.parentId == null
              const size = isRoot ? 76 : 60
              return (
                <button
                  key={n.id}
                  className={`web-node web-node-${n.type} ${selectedId === n.id ? 'selected' : ''}`}
                  style={{ left: pos.x, top: pos.y, width: size, height: size }}
                  onClick={() => handleNodeTap(n)}
                >
                  {n.text}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {selectedInfo && (
        <div className="explore-detail-panel">
          <div className={`explore-detail-kind explore-detail-${selectedNode.type}`}>
            {selectedNode.type === 'grammar' ? 'Grammar' : 'Vocab'}
          </div>
          <div className="explore-detail-title">{selectedInfo.title}</div>
          {selectedInfo.subtitle && <div className="explore-detail-subtitle">{selectedInfo.subtitle}</div>}
          {selectedInfo.exampleSentence && (
            <div className="explore-detail-example" lang="ja">
              {selectedInfo.exampleSentence}
              {selectedInfo.exampleSource && <div className="explore-detail-source">— {selectedInfo.exampleSource}</div>}
            </div>
          )}
          <button className="gloss-dismiss" onClick={() => setSelectedId(null)} aria-label="Close">
            ✕
          </button>
        </div>
      )}

      {starterOpen && (
        <div className="modal-backdrop" onClick={() => setStarterOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Start a new thread</h2>
              <button className="icon-button" onClick={() => setStarterOpen(false)} aria-label="Close">
                ✕
              </button>
            </div>
            <button className="save-word-button explore-surprise-button" onClick={handleSurpriseMe}>
              🎲 Surprise me
            </button>
            {savedJaWords.length > 0 && (
              <>
                <p className="explore-starters-label">Or start from a saved word</p>
                <ul className="story-list">
                  {savedJaWords.map((w) => (
                    <li key={w.word}>
                      <button className="story-list-item" onClick={() => addRoot('vocab', w.word)}>
                        <span className="story-list-title-ja">{w.word}</span>
                        <span className="story-list-title-en">{w.english}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}

      <BottomNav active={activeTab} onChange={onChangeTab} badges={{ collection: unseenCount }} />
    </div>
  )
}
