import { Fragment, useEffect, useMemo, useState } from 'react'
import { buildExploreGraph, EXPLORE_LANGS, grammarPointsForLang, vocabNodeId } from '../lib/exploreGraph'
import { buildGrammarPath, buildVocabPath, classifyVocab } from '../lib/explorePaths'
import { buildDictionary } from '../lib/vocabIndex'
import {
  getExploreTrail,
  setExploreTrail,
  clearExploreTrail,
  addSavedWord,
  isWordSaved,
  getUnseenSavedWords,
} from '../lib/storage'
import { getDigDeeperSuggestions } from '../lib/companion'
import { langMeta } from '../lib/langs'
import BottomNav from './BottomNav'

const CATEGORIES = [
  { key: 'grammar', label: 'Grammar' },
  { key: 'noun', label: 'Nouns' },
  { key: 'verb', label: 'Verbs' },
]

function grammarPointToNode(g) {
  return {
    id: `${g.lang}:grammar:${g.id}`,
    lang: g.lang,
    type: 'grammar',
    pos: null,
    title: g.title,
    reading: null,
    subtitle: g.explanation,
    example: { native: g.example_native, gloss: g.example_gloss, source: null },
    note: g.bridge_note ?? null,
    relatedGameId: g.related_game_id ?? null,
    vocabEntry: null,
    related: [],
  }
}

function vocabEntryToNode(entry) {
  const pos = classifyVocab(entry)
  return {
    id: vocabNodeId(entry.lang, entry.word),
    lang: entry.lang,
    type: 'vocab',
    pos: pos === 'other' ? null : pos,
    title: entry.word,
    reading: entry.reading && !/^[mfn]$/i.test(entry.reading.trim()) ? entry.reading : null,
    subtitle: entry.english,
    example: null,
    note: null,
    relatedGameId: null,
    vocabEntry: entry,
    related: [],
  }
}

function EntryCard({
  node,
  stepLabel,
  showRefs,
  onNavigate,
  onSave,
  saved,
  onPractice,
  onDigDeeper,
  diggingDeeper,
  onOpenRabbitHole,
}) {
  const { avatar, label } = langMeta(node.lang)
  const posLabel = node.type === 'grammar' ? 'grammar point' : node.pos

  return (
    <div
      className={`entry-card ${onOpenRabbitHole ? 'entry-card-clickable' : ''}`}
      onClick={onOpenRabbitHole}
      role={onOpenRabbitHole ? 'button' : undefined}
      tabIndex={onOpenRabbitHole ? 0 : undefined}
    >
      <div className="entry-eyebrow">
        <span className={`lang-tag lang-tag-${node.lang}`}>
          {avatar} {label}
        </span>
        {posLabel && <span className="entry-pos">{posLabel}</span>}
        {stepLabel && <span className="step-badge">{stepLabel}</span>}
      </div>

      <div className="entry-headword" lang={node.lang}>
        {node.title}
      </div>
      {node.reading && <div className="entry-reading">{node.reading}</div>}
      {node.subtitle && <p className="entry-definition">{node.subtitle}</p>}

      {node.example?.native && (
        <div className="citation">
          <div className="citation-native" lang={node.lang}>
            {node.example.native}
          </div>
          {node.example.gloss && <div className="citation-gloss">{node.example.gloss}</div>}
          {node.example.source && <div className="citation-source">— {node.example.source}</div>}
        </div>
      )}

      {node.note && (
        <div className="bridge-note">
          <div className="bridge-note-label">Bridge note</div>
          <div className="bridge-note-text">{node.note}</div>
        </div>
      )}

      {node.type === 'vocab' && onSave && (
        <button
          className={`save-word-button ${saved ? 'saved' : ''}`}
          disabled={saved}
          onClick={(e) => {
            e.stopPropagation()
            onSave()
          }}
        >
          {saved ? '✓ Saved' : '+ Save'}
        </button>
      )}

      {node.relatedGameId && onPractice && (
        <button
          className="explore-link-button"
          onClick={(e) => {
            e.stopPropagation()
            onPractice()
          }}
        >
          Practice this →
        </button>
      )}

      {showRefs && (
        <>
          {node.related.length > 0 && (
            <>
              <div className="refs-label">See also</div>
              <div className="refs-list">
                {node.related.map((rel) => {
                  const relMeta = langMeta(rel.lang)
                  return (
                    <button key={rel.id} className="ref-button" onClick={() => onNavigate(rel.id)}>
                      <span className={`ref-mark lang-tag-${rel.lang}`}>{relMeta.avatar}</span>
                      <span className="ref-word" lang={rel.lang}>
                        {rel.title}
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
          {onDigDeeper && (
            <button className="dig-deeper-button" onClick={onDigDeeper} disabled={diggingDeeper}>
              {diggingDeeper ? 'Digging…' : '🔮 Dig deeper'}
            </button>
          )}
        </>
      )}
    </div>
  )
}

export default function ExploreScreen({ stories, wordSeed, onOpenGame, activeTab, onChangeTab }) {
  const graph = useMemo(() => buildExploreGraph(stories), [stories])
  const unseenCount = useMemo(() => getUnseenSavedWords().size, [])

  const [mode, setMode] = useState('random')
  const [trail, setTrail] = useState(() => getExploreTrail() ?? [graph.startingIds[0]])
  const [aiNodes, setAiNodes] = useState(() => new Map())
  const [diggingDeeper, setDiggingDeeper] = useState(false)
  const [, forceUpdate] = useState(0)

  const [pathLang, setPathLang] = useState(EXPLORE_LANGS[0])
  const [pathCategory, setPathCategory] = useState('grammar')

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

  async function handleDigDeeper() {
    if (!currentNode || diggingDeeper) return
    setDiggingDeeper(true)
    const suggestions = await getDigDeeperSuggestions(currentNode.lang, currentNode.title, currentNode.type)
    setDiggingDeeper(false)
    if (!suggestions.length) return
    setAiNodes((prev) => {
      const next = new Map(prev)
      const related = [...currentNode.related]
      for (const s of suggestions) {
        const id = `ai:${currentNode.lang}:${s.text}`
        if (!next.has(id)) {
          next.set(id, {
            id,
            lang: currentNode.lang,
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
          related.push({ id, lang: currentNode.lang, type: 'ai', title: s.text })
        }
      }
      next.set(currentId, { ...currentNode, related })
      return next
    })
  }

  function handleSave(node) {
    if (!node.vocabEntry) return
    addSavedWord({
      word: node.vocabEntry.word,
      reading: node.vocabEntry.reading,
      english: node.vocabEntry.english,
      lang: node.lang,
      storyIndex: node.vocabEntry.storyIndex,
    })
    forceUpdate((t) => t + 1)
  }

  function handlePractice(node) {
    onOpenGame?.('sentence-build', node.relatedGameId, node.lang)
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
              onPractice={currentNode.relatedGameId ? () => handlePractice(currentNode) : null}
              onDigDeeper={handleDigDeeper}
              diggingDeeper={diggingDeeper}
            />
          ) : (
            <p className="favorites-empty">Nothing here yet — try "Begin elsewhere."</p>
          )}
        </>
      ) : (
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
                  const node = grammarPointToNode(g)
                  return (
                    <EntryCard
                      key={g.id}
                      node={node}
                      stepLabel={`${i + 1} / ${grammarPath.length}`}
                      onPractice={node.relatedGameId ? () => handlePractice(node) : null}
                      onOpenRabbitHole={() => startRabbitHole(node.id)}
                    />
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
      )}

      <BottomNav active={activeTab} onChange={onChangeTab} badges={{ bookmarks: unseenCount }} />
    </div>
  )
}
