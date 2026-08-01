import { useMemo, useState } from 'react'
import { buildExploreGraph, EXPLORE_LANGS, grammarPointsForLang, grammarNodeId } from '../lib/exploreGraph'
import { buildCurriculum } from '../lib/explorePaths'
import { buildDictionary } from '../lib/vocabIndex'
import { getReadStories } from '../lib/storage'
import { GAMES_REQUIRING_READ_STORY } from '../lib/games'
import { langMeta } from '../lib/langs'
import curriculumUnits from '../data/curriculum_units.json'
import LessonCard from './LessonCard'
import LessonCheck from './LessonCheck'
import CurriculumSearchModal from './CurriculumSearchModal'

const UNIT_ACCENTS = ['#d4537e', '#a97ee0', '#4fb8a0', '#e0a24d']

function unitNarrative(lang, branch) {
  return curriculumUnits.find((u) => u.lang === lang && u.branch === branch)?.narrative ?? null
}

export default function CurriculumScreen({ stories, onOpenGame, onOpenStory, onExploreNode }) {
  const graph = useMemo(() => buildExploreGraph(stories), [stories])
  const [curriculumLang, setCurriculumLang] = useState(EXPLORE_LANGS[0])
  const [selectedBranch, setSelectedBranch] = useState(null)
  const [lessonIndex, setLessonIndex] = useState(0)
  const [searchOpen, setSearchOpen] = useState(false)

  const readStoriesByLang = useMemo(() => {
    const readIndices = getReadStories()
    const byLang = new Set()
    for (const s of stories) {
      if (readIndices.has(s.idx)) byLang.add(s.lang)
    }
    return byLang
  }, [stories])

  const dictionary = useMemo(
    () => buildDictionary(stories.filter((s) => s.lang === curriculumLang)),
    [stories, curriculumLang],
  )

  function canPractice(node) {
    if (!node.relatedGameId) return false
    if (GAMES_REQUIRING_READ_STORY.has(node.relatedGameId)) return readStoriesByLang.has(node.lang)
    return true
  }

  function handlePractice(node) {
    onOpenGame?.(node.relatedGameId, null, node.lang)
  }

  const units = useMemo(() => buildCurriculum(grammarPointsForLang(curriculumLang)), [curriculumLang])
  const allPoints = useMemo(() => grammarPointsForLang(curriculumLang), [curriculumLang])

  function changeLang(l) {
    setCurriculumLang(l)
    setSelectedBranch(null)
    setLessonIndex(0)
  }

  function openUnit(branch) {
    setSelectedBranch(branch)
    setLessonIndex(0)
  }

  function jumpToPoint(p) {
    const uIdx = units.findIndex((u) => u.branch === p.branch)
    if (uIdx < 0) return
    const lIdx = units[uIdx].points.findIndex((pt) => pt.id === p.id)
    setSelectedBranch(p.branch)
    setLessonIndex(lIdx >= 0 ? lIdx : 0)
    setSearchOpen(false)
  }

  const unitIndex = units.findIndex((u) => u.branch === selectedBranch)
  const unit = unitIndex >= 0 ? units[unitIndex] : null
  const accent = unitIndex >= 0 ? UNIT_ACCENTS[unitIndex % UNIT_ACCENTS.length] : UNIT_ACCENTS[0]
  const currentPoint = unit?.points[lessonIndex] ?? null
  const currentNode = currentPoint ? graph.getNode(grammarNodeId(currentPoint.lang, currentPoint.id)) : null

  return (
    <div className="screen curriculum-screen">
      <div className="top-bar-icons curriculum-header">
        <h1>Curriculum</h1>
        <button className="icon-button" onClick={() => setSearchOpen(true)} aria-label="Search this curriculum">
          🔍
        </button>
      </div>
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
            const unitAccent = UNIT_ACCENTS[i % UNIT_ACCENTS.length]
            const narrative = unitNarrative(curriculumLang, u.branch)
            return (
              <button
                key={u.branch}
                className="unit-map-card"
                style={{ borderLeftColor: unitAccent }}
                onClick={() => openUnit(u.branch)}
              >
                <div className="unit-map-eyebrow" style={{ color: unitAccent }}>
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
          <div className="unit-lesson-header" style={{ borderColor: accent }}>
            <div className="unit-map-eyebrow" style={{ color: accent }}>
              Unit {unitIndex + 1}
            </div>
            <h2 className="unit-map-title">{unit.branch}</h2>
            {unitNarrative(curriculumLang, unit.branch) && (
              <p className="unit-map-narrative">{unitNarrative(curriculumLang, unit.branch)}</p>
            )}
          </div>

          {currentNode && (
            <>
              <LessonCard
                node={currentNode}
                lessonNumber={lessonIndex + 1}
                totalLessons={unit.points.length}
                accentColor={accent}
                onNavigate={(id) => onExploreNode?.(id)}
                onPractice={canPractice(currentNode) ? () => handlePractice(currentNode) : null}
                onReadInStory={
                  currentNode.storyContext ? () => onOpenStory?.(currentNode.storyContext.storyIndex) : null
                }
              />
              {!currentNode.relatedGameId && <LessonCheck node={currentNode} dictionary={dictionary} />}
            </>
          )}

          <div className="lesson-nav">
            <button
              className="lesson-nav-button"
              disabled={lessonIndex === 0}
              onClick={() => setLessonIndex((i) => Math.max(0, i - 1))}
            >
              ← Previous
            </button>
            <button
              className="lesson-nav-button"
              disabled={lessonIndex >= unit.points.length - 1}
              onClick={() => setLessonIndex((i) => Math.min(unit.points.length - 1, i + 1))}
            >
              Next →
            </button>
          </div>
        </>
      )}

      {searchOpen && <CurriculumSearchModal points={allPoints} onSelect={jumpToPoint} onClose={() => setSearchOpen(false)} />}
    </div>
  )
}
