import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  getReadingPosition,
  setReadingPosition,
  getUnlockedKanji,
  addUnlockedKanji,
  addUnseenKanji,
  getUnseenKanji,
  markDayReadIfNeeded,
  hasSeenLoopMilestone,
  markLoopMilestoneSeen,
  getFavoriteStories,
  toggleFavoriteStory,
} from '../lib/storage'
import { extractKanjiFromStory } from '../lib/kanji'
import { syncAppBadge } from '../lib/badge'
import { getAvailableLevels, levelMeta } from '../lib/levels'
import { getAvailableLangs, langMeta } from '../lib/langs'
import { matchesQuery } from '../lib/search'
import StoryCard from './StoryCard'
import JumpToStoryModal from './JumpToStoryModal'
import BottomNav from './BottomNav'

const PULL_ANIMATION_MS = 1800
const ACTIVE_THRESHOLD = 0.6

function buildCards(stories, milestoneAlreadySeen) {
  const cards = stories.map((story, i) => ({
    key: `story-${i}`,
    type: 'story',
    story,
    storyIndex: i,
  }))
  if (!milestoneAlreadySeen) {
    cards.push({ key: 'milestone', type: 'milestone' })
  }
  cards.push({ key: 'wrap-0', type: 'story', story: stories[0], storyIndex: 0 })
  return cards
}

function buildFilteredCards(stories, selectedLevel, selectedLangs, query) {
  return stories
    .map((story, i) => ({ story, storyIndex: i }))
    .filter(({ story }) => selectedLevel == null || story.level === selectedLevel)
    .filter(({ story }) => selectedLangs.has(story.lang))
    .filter(({ story }) => matchesQuery(story, query))
    .map(({ story, storyIndex }) => ({
      key: `story-${storyIndex}`,
      type: 'story',
      story,
      storyIndex,
    }))
}

export default function ReadingScreen({ stories, jumpToIndex, onConsumedJump, activeTab, onChangeTab }) {
  const [showFurigana, setShowFurigana] = useState(true)
  const [jumpOpen, setJumpOpen] = useState(false)
  const [pulledByCard, setPulledByCard] = useState({})
  const [unseenCount, setUnseenCount] = useState(() => getUnseenKanji().size)
  const [favorites, setFavorites] = useState(() => getFavoriteStories())
  const [activeIndex, setActiveIndex] = useState(-1)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLevel, setSelectedLevel] = useState(null)

  const levels = useMemo(() => getAvailableLevels(stories), [stories])
  const allLangs = useMemo(() => getAvailableLangs(stories), [stories])
  const [selectedLangs, setSelectedLangs] = useState(() => new Set(allLangs))
  const isFiltering =
    selectedLevel != null || searchQuery.trim() !== '' || selectedLangs.size < allLangs.length

  const cards = useMemo(() => {
    if (isFiltering) return buildFilteredCards(stories, selectedLevel, selectedLangs, searchQuery)
    return buildCards(stories, hasSeenLoopMilestone())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stories, isFiltering, selectedLevel, selectedLangs, searchQuery])

  function toggleLang(lang) {
    setSelectedLangs((prev) => {
      const next = new Set(prev)
      if (next.has(lang)) next.delete(lang)
      else next.add(lang)
      return next.size === 0 ? new Set(allLangs) : next
    })
  }

  const containerRef = useRef(null)
  const cardRefs = useRef([])

  useLayoutEffect(() => {
    const targetStoryIndex = jumpToIndex ?? getReadingPosition().storyIndex
    const targetIndex = cards.findIndex(
      (c) => c.type === 'story' && c.storyIndex === targetStoryIndex && c.key !== 'wrap-0',
    )
    const el = cardRefs.current[targetIndex >= 0 ? targetIndex : 0]
    el?.scrollIntoView({ behavior: 'instant', block: 'start' })
    if (jumpToIndex != null) onConsumedJump?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (isFiltering) containerRef.current?.scrollTo({ top: 0, behavior: 'instant' })
  }, [isFiltering, selectedLevel, searchQuery])

  useEffect(() => {
    // Any real scroll interaction that day is enough — no separate
    // "done for today" action required.
    const container = containerRef.current
    if (!container) return
    function handleScroll() {
      markDayReadIfNeeded()
      container.removeEventListener('scroll', handleScroll)
    }
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  function activateCard(card, index) {
    setActiveIndex(index)
    if (card.type === 'story') {
      if (!isFiltering) setReadingPosition(card.storyIndex)
      const kanjiHere = extractKanjiFromStory(card.story)
      if (kanjiHere.size === 0) return
      const before = getUnlockedKanji()
      const fresh = [...kanjiHere].filter((ch) => !before.has(ch))
      addUnlockedKanji(kanjiHere)
      if (fresh.length > 0) {
        setPulledByCard((prev) => ({ ...prev, [card.key]: fresh }))
        const unseen = addUnseenKanji(fresh)
        setUnseenCount(unseen.size)
        syncAppBadge(unseen.size)
        setTimeout(() => {
          setPulledByCard((prev) => {
            const next = { ...prev }
            delete next[card.key]
            return next
          })
        }, PULL_ANIMATION_MS)
      }
    } else if (card.type === 'milestone') {
      markLoopMilestoneSeen()
    }
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting && e.intersectionRatio >= ACTIVE_THRESHOLD)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (!visible) return
        const index = Number(visible.target.dataset.cardIndex)
        activateCard(cards[index], index)
      },
      { root: container, threshold: [ACTIVE_THRESHOLD] },
    )

    cardRefs.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards])

  function handleJump(storyIndex) {
    const targetIndex = cards.findIndex(
      (c) => c.type === 'story' && c.storyIndex === storyIndex && c.key !== 'wrap-0',
    )
    cardRefs.current[targetIndex]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setJumpOpen(false)
  }

  function handleToggleFavorite(storyIndex) {
    setFavorites(toggleFavoriteStory(storyIndex))
  }

  return (
    <div className="feed-screen">
      <div className="top-bar">
        <button
          className="icon-button-bar"
          onClick={() => setSearchOpen((v) => !v)}
          aria-label="Search stories"
          aria-pressed={searchOpen}
        >
          🔍
        </button>
        {searchOpen && (
          <input
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stories or vocab…"
            autoFocus
          />
        )}
        <div className="level-pills">
          <button
            className={`level-pill-button ${selectedLevel == null ? 'active' : ''}`}
            onClick={() => setSelectedLevel(null)}
          >
            All
          </button>
          {levels.map((level) => (
            <button
              key={level}
              className={`level-pill-button ${selectedLevel === level ? 'active' : ''}`}
              style={selectedLevel === level ? { background: levelMeta(level).color } : undefined}
              onClick={() => setSelectedLevel(level)}
            >
              Lv.{level}
            </button>
          ))}
        </div>
        {allLangs.length > 1 && (
          <div className="lang-pills">
            {allLangs.map((lang) => (
              <button
                key={lang}
                className={`level-pill-button lang-pill-button ${selectedLangs.has(lang) ? 'active' : ''}`}
                onClick={() => toggleLang(lang)}
                aria-pressed={selectedLangs.has(lang)}
              >
                {langMeta(lang).avatar}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="feed-container" ref={containerRef}>
        {cards.length === 0 && (
          <div className="empty-results">No stories found — try a different search.</div>
        )}
        {cards.map((card, i) => {
          if (card.type === 'milestone') {
            return (
              <section
                className="milestone-card"
                key={card.key}
                ref={(el) => (cardRefs.current[i] = el)}
                data-card-index={i}
              >
                <div className="milestone-emoji">🎉</div>
                <div className="milestone-title">You've read the whole set!</div>
                <div className="milestone-subtitle">
                  All {stories.length} stories, done. Keep going — it loops right back to the start.
                </div>
              </section>
            )
          }
          return (
            <StoryCard
              key={card.key}
              cardRef={(el) => (cardRefs.current[i] = el)}
              cardIndex={i}
              story={card.story}
              showFurigana={showFurigana}
              newlyPulled={pulledByCard[card.key]}
              isActive={i === activeIndex}
              isFavorite={favorites.has(card.storyIndex)}
              onToggleFavorite={() => handleToggleFavorite(card.storyIndex)}
            />
          )
        })}
      </div>

      <div className="floating-controls">
        <button className="floating-button" onClick={() => setJumpOpen(true)} aria-label="Jump to story">
          <span className="floating-button-icon">🔀</span>
        </button>
        <button
          className="floating-button"
          onClick={() => setShowFurigana((v) => !v)}
          aria-pressed={showFurigana}
          aria-label="Toggle furigana"
        >
          <span className="floating-button-icon">あ</span>
        </button>
      </div>

      {jumpOpen && (
        <JumpToStoryModal stories={stories} onSelect={handleJump} onClose={() => setJumpOpen(false)} />
      )}

      <BottomNav
        active={activeTab}
        onChange={onChangeTab}
        badges={{ collection: unseenCount, favorites: favorites.size }}
      />
    </div>
  )
}
