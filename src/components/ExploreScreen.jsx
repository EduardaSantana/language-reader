import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  buildExploreGraph,
  EXPLORE_LANGS,
  grammarPointsForLang,
  oddityPointsForLang,
  oddityNodeId,
  grammarNodeId,
  comparativeOddityPoints,
  comparativeNodeId,
  vocabNodeId,
} from '../lib/exploreGraph'
import { buildGrammarPath, buildVocabPath, classifyVocab } from '../lib/explorePaths'
import { buildDictionary } from '../lib/vocabIndex'
import {
  getExploreTrail,
  setExploreTrail,
  clearExploreTrail,
  addSavedWord,
  isWordSaved,
  getSeenOddities,
  markOdditySeen,
  markOdditiesSeen,
  getReadStories,
} from '../lib/storage'
import { getDigDeeperSuggestions } from '../lib/companion'
import { GAMES_REQUIRING_READ_STORY } from '../lib/games'
import { langMeta } from '../lib/langs'
import EntryCard from './EntryCard'

const CATEGORIES = [
  { key: 'grammar', label: 'Grammar' },
  { key: 'noun', label: 'Nouns' },
  { key: 'verb', label: 'Verbs' },
]

const TIER_LABELS = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced' }

function vocabEntryToNode(entry) {
  const pos = classifyVocab(entry)
  return {
    id: vocabNodeId(entry.lang, entry.word),
    lang: entry.lang,
    type: 'vocab',
    pos: pos === 'other' ? null : pos,
    title: entry.word,
    reading: entry.reading ?? null,
    gender: entry.gender ?? null,
    subtitle: entry.english,
    example: null,
    note: null,
    relatedGameId: null,
    vocabEntry: entry,
    related: [],
  }
}


export default function ExploreScreen({ stories, wordSeed, nodeSeed, onOpenGame, onOpenStory, onSavedWordsChange }) {
  const graph = useMemo(() => buildExploreGraph(stories), [stories])

  const [mode, setMode] = useState('random')
  const [trail, setTrail] = useState(() => getExploreTrail() ?? [graph.startingIds[0]])
  const [aiNodes, setAiNodes] = useState(() => new Map())
  const [diggingDeeperId, setDiggingDeeperId] = useState(null)
  const [, forceUpdate] = useState(0)

  const [pathLang, setPathLang] = useState(EXPLORE_LANGS[0])
  const [pathCategory, setPathCategory] = useState('grammar')
  const [seenOddities, setSeenOddities] = useState(() => getSeenOddities())
  const [showComparative, setShowComparative] = useState(false)

  useEffect(() => {
    setExploreTrail(trail)
  }, [trail])

  useEffect(() => {
    if (!wordSeed) return
    const id = vocabNodeId(wordSeed.lang, wordSeed.word)
    if (graph.getNode(id)) {
      setMode('random')
      setTrail([id])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordSeed])

  useEffect(() => {
    if (!nodeSeed) return
    if (graph.getNode(nodeSeed.id)) {
      setMode('random')
      setTrail([nodeSeed.id])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeSeed])

  function resolveNode(id) {
    return aiNodes.get(id) ?? graph.getNode(id)
  }

  function navigateTo(id) {
    setTrail((prev) => {
      const existingIndex = prev.indexOf(id)
      return existingIndex >= 0 ? prev.slice(0, existingIndex + 1) : [...prev, id]
    })
  }

  function jumpToTrailIndex(i) {
    setTrail((prev) => prev.slice(0, i + 1))
  }

  function beginElsewhere() {
    const unvisited = graph.startingIds.filter((id) => !trail.includes(id))
    const pool = unvisited.length ? unvisited : graph.startingIds
    setTrail([pool[Math.floor(Math.random() * pool.length)]])
  }

  function startRabbitHole(id) {
    setMode('random')
    setTrail([id])
  }

  function resetTrail() {
    setTrail([graph.startingIds[0]])
    setAiNodes(new Map())
    clearExploreTrail()
  }

  const currentId = trail[trail.length - 1]
  const currentNode = resolveNode(currentId)

  useEffect(() => {
    if (currentNode?.type === 'oddity') setSeenOddities(markOdditySeen(currentNode.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId])

  async function handleDigDeeper(node) {
    if (!node || diggingDeeperId) return
    setDiggingDeeperId(node.id)
    const suggestions = await getDigDeeperSuggestions(node.lang, node.title, node.type)
    setDiggingDeeperId(null)
    if (!suggestions.length) return
    setAiNodes((prev) => {
      const next = new Map(prev)
      const related = [...node.related]
      for (const s of suggestions) {
        const id = `ai:${node.lang}:${s.text}`
        if (!next.has(id)) {
          next.set(id, {
            id,
            lang: node.lang,
            type: 'ai',
            pos: null,
            title: s.text,
            reading: null,
            subtitle: s.note || 'AI-suggested tangent — not verified from the corpus.',
            example: null,
            note: null,
            relatedGameId: null,
            vocabEntry: null,
            related: [],
          })
          related.push({ id, lang: node.lang, type: 'ai', title: s.text })
        }
      }
      next.set(node.id, { ...node, related })
      return next
    })
  }

  function handleSave(node) {
    if (!node.vocabEntry) return
    addSavedWord({
      word: node.vocabEntry.word,
      reading: node.vocabEntry.reading,
      gender: node.vocabEntry.gender,
      english: node.vocabEntry.english,
      lang: node.lang,
      storyIndex: node.vocabEntry.storyIndex,
    })
    forceUpdate((t) => t + 1)
    onSavedWordsChange?.()
  }

  function handlePractice(node) {
    onOpenGame?.(node.relatedGameId, null, node.lang)
  }

  const oddities = useMemo(() => oddityPointsForLang(pathLang), [pathLang])
  const comparativeOddities = useMemo(() => comparativeOddityPoints(), [])
  const oddityFoundCount = oddities.filter((o) => seenOddities.has(oddityNodeId(pathLang, o.id))).length

  useEffect(() => {
    if (mode !== 'oddities' || showComparative || oddities.length === 0) return
    setSeenOddities(markOdditiesSeen(oddities.map((o) => oddityNodeId(pathLang, o.id))))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, pathLang, showComparative, oddities])

  useEffect(() => {
    if (mode !== 'oddities' || !showComparative || comparativeOddities.length === 0) return
    setSeenOddities(markOdditiesSeen(comparativeOddities.map((c) => comparativeNodeId(c.id))))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, showComparative, comparativeOddities])

  const readStoriesByLang = useMemo(() => {
    const readIndices = getReadStories()
    const byLang = new Set()
    for (const s of stories) {
      if (readIndices.has(s.idx)) byLang.add(s.lang)
    }
    return byLang
  }, [stories])

  function canPractice(node) {
    if (!node.relatedGameId) return false
    if (GAMES_REQUIRING_READ_STORY.has(node.relatedGameId)) return readStoriesByLang.has(node.lang)
    return true
  }

  const grammarPath = useMemo(() => buildGrammarPath(grammarPointsForLang(pathLang)), [pathLang])
  const vocabDictForPathLang = useMemo(
    () => buildDictionary(stories.filter((s) => s.lang === pathLang)),
    [stories, pathLang],
  )
  const vocabPath = useMemo(
    () => (pathCategory === 'grammar' ? [] : buildVocabPath(vocabDictForPathLang, pathCategory)),
    [vocabDictForPathLang, pathCategory],
  )

  return (
    <div className="screen explore-screen">
      <header className="collection-header">
        <h1>Explore</h1>
      </header>

      <div className="collection-mode-toggle">
        <button className={mode === 'random' ? 'active' : ''} onClick={() => setMode('random')}>
          Random
        </button>
        <button className={mode === 'paths' ? 'active' : ''} onClick={() => setMode('paths')}>
          Paths
        </button>
        <button className={mode === 'oddities' ? 'active' : ''} onClick={() => setMode('oddities')}>
          ✨ Oddities
        </button>
      </div>

      {mode === 'random' ? (
        <>
          <div className="masthead-actions">
            <button onClick={beginElsewhere}>🔀 Begin elsewhere</button>
            <button onClick={resetTrail}>Clear trail</button>
          </div>

          <nav className="trail" aria-label="Reading trail">
            {trail.map((id, i) => {
              const n = resolveNode(id)
              const isCurrent = i === trail.length - 1
              return (
                <Fragment key={id}>
                  {i > 0 && <span className="trail-sep">›</span>}
                  <button
                    className={`trail-item ${isCurrent ? 'current' : ''}`}
                    onClick={() => !isCurrent && jumpToTrailIndex(i)}
                    disabled={isCurrent}
                  >
                    §{i + 1} {n?.title ?? '…'}
                  </button>
                </Fragment>
              )
            })}
          </nav>

          {currentNode ? (
            <EntryCard
              node={currentNode}
              showRefs
              onNavigate={navigateTo}
              onSave={currentNode.vocabEntry ? () => handleSave(currentNode) : null}
              saved={currentNode.vocabEntry ? isWordSaved(currentNode.lang, currentNode.vocabEntry.word) : false}
              onPractice={canPractice(currentNode) ? () => handlePractice(currentNode) : null}
              onReadInStory={
                currentNode.storyContext ? () => onOpenStory?.(currentNode.storyContext.storyIndex) : null
              }
              onDigDeeper={() => handleDigDeeper(currentNode)}
              diggingDeeper={diggingDeeperId === currentNode.id}
            />
          ) : (
            <p className="favorites-empty">Nothing here yet — try "Begin elsewhere."</p>
          )}
        </>
      ) : mode === 'paths' ? (
        <>
          <div className="pill-row">
            {EXPLORE_LANGS.map((l) => (
              <button
                key={l}
                className={`level-pill-button ${pathLang === l ? 'active' : ''}`}
                onClick={() => setPathLang(l)}
              >
                {langMeta(l).avatar} {langMeta(l).label}
              </button>
            ))}
          </div>
          <div className="pill-row">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                className={`level-pill-button ${pathCategory === c.key ? 'active' : ''}`}
                onClick={() => setPathCategory(c.key)}
              >
                {c.label}
              </button>
            ))}
          </div>

          {pathCategory === 'grammar' ? (
            grammarPath.length === 0 ? (
              <p className="path-empty">Nothing charted for this path yet.</p>
            ) : (
              <>
                <p className="path-progress">
                  {grammarPath.length} stop{grammarPath.length === 1 ? '' : 's'} — basic to complex
                </p>
                {grammarPath.map((g, i) => {
                  const node = graph.getNode(grammarNodeId(g.lang, g.id))
                  if (!node) return null
                  const tier = TIER_LABELS[g.difficulty] ?? null
                  const showTierHeader = tier && g.difficulty !== grammarPath[i - 1]?.difficulty
                  return (
                    <Fragment key={g.id}>
                      {showTierHeader && <div className="path-tier-header">{tier}</div>}
                      <EntryCard
                        node={node}
                        stepLabel={`${i + 1} / ${grammarPath.length}`}
                        showRefs
                        onNavigate={startRabbitHole}
                        onPractice={canPractice(node) ? () => handlePractice(node) : null}
                        onReadInStory={node.storyContext ? () => onOpenStory?.(node.storyContext.storyIndex) : null}
                        onOpenRabbitHole={() => startRabbitHole(node.id)}
                      />
                    </Fragment>
                  )
                })}
              </>
            )
          ) : vocabPath.length === 0 ? (
            <p className="path-empty">Nothing charted for this path yet.</p>
          ) : (
            <>
              <p className="path-progress">
                {vocabPath.length} stop{vocabPath.length === 1 ? '' : 's'} — basic to complex
              </p>
              {vocabPath.map((entry, i) => {
                const node = vocabEntryToNode(entry)
                return (
                  <EntryCard
                    key={entry.word}
                    node={node}
                    stepLabel={`${i + 1} / ${vocabPath.length}`}
                    onSave={() => handleSave(node)}
                    saved={isWordSaved(entry.lang, entry.word)}
                    onOpenRabbitHole={() => startRabbitHole(node.id)}
                  />
                )
              })}
            </>
          )}
        </>
      ) : (
        <>
          <div className="pill-row">
            {EXPLORE_LANGS.map((l) => (
              <button
                key={l}
                className={`level-pill-button ${!showComparative && pathLang === l ? 'active' : ''}`}
                onClick={() => {
                  setShowComparative(false)
                  setPathLang(l)
                }}
              >
                {langMeta(l).avatar} {langMeta(l).label}
              </button>
            ))}
            <button
              className={`level-pill-button level-pill-button-comparative ${showComparative ? 'active' : ''}`}
              onClick={() => setShowComparative(true)}
            >
              🌐 All languages compared
            </button>
          </div>

          {showComparative ? (
            <>
              <p className="path-progress">
                🌐 {comparativeOddities.length} concept{comparativeOddities.length === 1 ? '' : 's'} compared across
                all 4 languages
              </p>
              {comparativeOddities.map((c) => {
                const node = graph.getNode(comparativeNodeId(c.id))
                if (!node) return null
                return (
                  <EntryCard
                    key={c.id}
                    node={node}
                    showRefs
                    isNew={!seenOddities.has(node.id)}
                    onNavigate={startRabbitHole}
                    onOpenRabbitHole={() => startRabbitHole(node.id)}
                  />
                )
              })}
            </>
          ) : oddities.length === 0 ? (
            <p className="path-empty">No oddities charted for this language yet.</p>
          ) : (
            <>
              <p className="path-progress">
                ✨ {oddityFoundCount} / {oddities.length} found
              </p>
              {oddities.map((o) => {
                const node = graph.getNode(oddityNodeId(pathLang, o.id))
                if (!node) return null
                return (
                  <EntryCard
                    key={o.id}
                    node={node}
                    showRefs
                    isNew={!seenOddities.has(node.id)}
                    onNavigate={startRabbitHole}
                    onDigDeeper={() => handleDigDeeper(node)}
                    diggingDeeper={diggingDeeperId === node.id}
                    onOpenRabbitHole={() => startRabbitHole(node.id)}
                  />
                )
              })}
            </>
          )}
        </>
      )}
    </div>
  )
}
