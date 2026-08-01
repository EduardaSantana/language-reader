import { useMemo, useState } from 'react'
import { buildExploreGraph, EXPLORE_LANGS, grammarPointsForLang, grammarNodeId } from '../lib/exploreGraph'
import { buildCurriculum } from '../lib/explorePaths'
import { getReadStories } from '../lib/storage'
import { GAMES_REQUIRING_READ_STORY } from '../lib/games'
import { langMeta } from '../lib/langs'
import curriculumUnits from '../data/curriculum_units.json'
import BottomNav from './BottomNav'
import LessonCard from './LessonCard'

const UNIT_ACCENTS = ['#d4537e', '#a97ee0', '#4fb8a0', '#e0a24d']

function unitNarrative(lang, branch) {
  return curriculumUnits.find((u) => u.lang === lang && u.branch === branch)?.narrative ?? null
}

export default function CurriculumScreen({ stories, onOpenGame, onOpenStory, onExploreNode, activeTab, onChangeTab }) {
  const graph = useMemo(() => buildExploreGraph(stories), [stories])
  const [curriculumLang, setCurriculumLang] = useState(EXPLORE_LANGS[0])
  const [selectedBranch, setSelectedBranch] = useState(null)

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

  function handlePractice(node) {
    onOpenGame?.(node.relatedGameId, null, node.lang)
  }

  const units = useMemo(() => buildCurriculum(grammarPointsForLang(curriculumLang)), [curriculumLang])

  function changeLang(l) {
    setCurriculumLang(l)
    setSelectedBranch(null)
  }

  const unitIndex = units.findIndex((u) => u.branch === selectedBranch)
  const unit = unitIndex >= 0 ? units[unitIndex] : null

  return (
    <div className="screen curriculum-screen">
      <h1>Curriculum</h1>
      <div className="pill-row">
        {EXPLORE_LANGS.map((l) => (
          <button
            key={l}
            className={`level-pill-button ${curriculumLang === l ? 'active' : ''}`}
            onClick={() => changeLang(l)}
          >
            {langMeta(l).avatar} {langMeta(l).label}
          </button>
        ))}
      </div>

      {!unit ? (
        units.length === 0 ? (
          <p className="path-empty">Nothing charted for this curriculum yet.</p>
        ) : (
          units.map((u, i) => {
            const accent = UNIT_ACCENTS[i % UNIT_ACCENTS.length]
            const narrative = unitNarrative(curriculumLang, u.branch)
            return (
              <button
                key={u.branch}
                className="unit-map-card"
                style={{ borderLeftColor: accent }}
                onClick={() => setSelectedBranch(u.branch)}
              >
                <div className="unit-map-eyebrow" style={{ color: accent }}>
                  Unit {i + 1}
                </div>
                <h2 className="unit-map-title">{u.branch}</h2>
                {narrative && <p className="unit-map-narrative">{narrative}</p>}
                <div className="unit-map-footer">
                  {u.points.length} lesson{u.points.length === 1 ? '' : 's'}
                </div>
                <div className="unit-map-preview">
                  {u.points.slice(0, 4).map((p) => (
                    <span key={p.id} className="unit-map-preview-chip">
                      {p.title}
                    </span>
                  ))}
                </div>
              </button>
            )
          })
        )
      ) : (
        <>
          <button className="unit-back-button" onClick={() => setSelectedBranch(null)}>
            ← Units
          </button>
          <div className="unit-lesson-header" style={{ borderColor: UNIT_ACCENTS[unitIndex % UNIT_ACCENTS.length] }}>
            <div className="unit-map-eyebrow" style={{ color: UNIT_ACCENTS[unitIndex % UNIT_ACCENTS.length] }}>
              Unit {unitIndex + 1}
            </div>
            <h2 className="unit-map-title">{unit.branch}</h2>
            {unitNarrative(curriculumLang, unit.branch) && (
              <p className="unit-map-narrative">{unitNarrative(curriculumLang, unit.branch)}</p>
            )}
          </div>
          {unit.points.map((g, i) => {
            const node = graph.getNode(grammarNodeId(g.lang, g.id))
            if (!node) return null
            return (
              <LessonCard
                key={g.id}
                node={node}
                lessonNumber={i + 1}
                totalLessons={unit.points.length}
                accentColor={UNIT_ACCENTS[unitIndex % UNIT_ACCENTS.length]}
                onNavigate={(id) => onExploreNode?.(id)}
                onPractice={canPractice(node) ? () => handlePractice(node) : null}
                onReadInStory={node.storyContext ? () => onOpenStory?.(node.storyContext.storyIndex) : null}
              />
            )
          })}
        </>
      )}

      <BottomNav active={activeTab} onChange={onChangeTab} />
    </div>
  )
}
