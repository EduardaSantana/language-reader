import { useMemo, useState } from 'react'
import grammarPoints from '../data/grammar_points_ja.json'
import { buildExploreGraph } from '../lib/explore'
import { getUnseenKanji, getFavoriteStories } from '../lib/storage'
import BottomNav from './BottomNav'

export default function ExploreScreen({ stories, charSeed, activeTab, onChangeTab }) {
  const graph = useMemo(() => buildExploreGraph(stories, grammarPoints), [stories])
  const unseenCount = useMemo(() => getUnseenKanji().size, [])
  const favoritesCount = useMemo(() => getFavoriteStories().size, [])
  const [current, setCurrent] = useState(() => {
    const seededWord = charSeed ? graph.findWordContainingChar(charSeed) : null
    return seededWord ? { type: 'vocab', key: seededWord } : { type: 'vocab', key: graph.startingVocab[0] }
  })

  const node = graph.getNode(current.type, current.key)

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
            <div className={`explore-card explore-card-${node.type}`}>
              <div className="explore-card-kind">{node.type === 'grammar' ? 'Grammar' : 'Vocab'}</div>
              <div className="explore-card-title">{node.title}</div>
              {node.subtitle && <div className="explore-card-subtitle">{node.subtitle}</div>}
              {node.exampleSentence && (
                <div className="explore-card-example" lang="ja">
                  {node.exampleSentence}
                  {node.exampleSource && <div className="explore-card-source">— {node.exampleSource}</div>}
                </div>
              )}
            </div>

            <div className="explore-chips">
              {node.related.length === 0 && (
                <div className="favorites-empty">No related words or patterns found.</div>
              )}
              {node.related.map((rel) => (
                <button
                  key={`${rel.type}-${rel.key}`}
                  className={`explore-chip explore-chip-${rel.type}`}
                  onClick={() => setCurrent({ type: rel.type, key: rel.key })}
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
                    onClick={() => setCurrent({ type: 'grammar', key: pattern })}
                  >
                    {pattern}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <BottomNav
        active={activeTab}
        onChange={onChangeTab}
        badges={{ collection: unseenCount, favorites: favoritesCount }}
      />
    </div>
  )
}
