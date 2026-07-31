import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  getReadingPosition,
  setReadingPosition,
  markDayReadIfNeeded,
  hasSeenLoopMilestone,
  markLoopMilestoneSeen,
  getFavoriteStories,
  toggleFavoriteStory,
  getUnseenSavedWords,
  addSavedWord,
  markStoryOpened,
  getFeedOrder,
  setFeedOrder,
} from '../lib/storage'
import { syncAppBadge } from '../lib/badge'
import { matchesQuery } from '../lib/search'
import StoryCard from './StoryCard'
import JumpToStoryModal from './JumpToStoryModal'
import BottomNav from './BottomNav'

function buildCards(stories, milestoneAlreadySeen) {
  const cards = stories.map((story) => ({
    key: `story-${story.idx}`,
    type: 'story',
    story,
    storyIndex: story.idx,
  }))
  if (!milestoneAlreadySeen) {
    cards.push({ key: 'milestone', type: 'milestone' })
  }
  cards.push({ key: 'wrap-0', type: 'story', story: stories[0], storyIndex: stories[0]?.idx })
  return cards
}

function buildFilteredCards(stories, favoritesOnly, favorites, query) {
  return stories
    .filter((story) => !favoritesOnly || favorites.has(story.idx))
    .filter((story) => matchesQuery(story, query))
    .map((story) => ({
      key: `story-${story.idx}`,
      type: 'story',
      story,
      storyIndex: story.idx,
    }))
}

const ACTIVE_THRESHOLD = 0.6

function shuffleArray(arr) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export default function ReadingScreen({ stories, jumpToIndex, onConsumedJump, activeTab, onChangeTab }) {
  const [showFurigana, setShowFurigana] = useState(true)
  const [jumpOpen, setJumpOpen] = useState(false)
  const [unseenCount, setUnseenCount] = useState(() => getUnseenSavedWords().size)
  const [favorites, setFavorites] = useState(() => getFavoriteStories())
  const [activeIndex, setActiveIndex] = useState(-1)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [feedOrder, setFeedOrderState] = useState(() => getFeedOrder())
  const [shuffledStories, setShuffledStories] = useState(() =>
    getFeedOrder() === 'shuffled' ? shuffleArray(stories) : null,
  )

  const isFiltering = favoritesOnly || searchQuery.trim() !== ''
  const orderedStories = feedOrder === 'shuffled' && shuffledStories ? shuffledStories : stories

  function toggleFeedOrder() {
    const next = feedOrder === 'shuffled' ? 'sequential' : 'shuffled'
    setFeedOrderState(next)
    setFeedOrder(next)
    setShuffledStories(next === 'shuffled' ? shuffleArray(stories) : null)
  }

  const cards = useMemo(() => {
    if (isFiltering) return buildFilteredCards(orderedStories, favoritesOnly, favorites, searchQuery)
    return buildCards(orderedStories, hasSeenLoopMilestone())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderedStories, isFiltering, favoritesOnly, favorites, searchQuery])

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
  }, [isFiltering, favoritesOnly, searchQuery])

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
      markStoryOpened(card.storyIndex)
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

  function handleSaveWord(vocab, story) {
    addSavedWord({
      word: vocab.word,
      reading: vocab.reading,
      english: vocab.english,
      lang: story.lang,
      storyIndex: story.idx,
    })
    const unseen = getUnseenSavedWords()
    setUnseenCount(unseen.size)
    syncAppBadge(unseen.size)
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
        <button
          className={`icon-button-bar shuffle-toggle ${feedOrder === 'shuffled' ? 'active' : ''}`}
          onClick={toggleFeedOrder}
          aria-label="Shuffle feed order"
          aria-pressed={feedOrder === 'shuffled'}
        >
          🔀
        </button>
        <button
          className={`icon-button-bar favorites-filter-toggle ${favoritesOnly ? 'active' : ''}`}
          onClick={() => setFavoritesOnly((v) => !v)}
          aria-label="Show favorites only"
          aria-pressed={favoritesOnly}
        >
          {favoritesOnly ? '♥' : '♡'}
        </button>
      </div>

      <div className="feed-container" ref={containerRef}>
        {cards.length === 0 && (
          <div className="empty-results">
            {favoritesOnly ? 'No favorites yet — tap the heart on a story to save it here.' : 'No stories found — try a different search.'}
          </div>
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
              isActive={i === activeIndex}
              isFavorite={favorites.has(card.storyIndex)}
              onToggleFavorite={() => handleToggleFavorite(card.storyIndex)}
              onSaveWord={(vocab) => handleSaveWord(vocab, card.story)}
            />
          )
        })}
      </div>

      <div className="floating-controls">
        <button className="floating-button" onClick={() => setJumpOpen(true)} aria-label="Jump to story">
          <span className="floating-button-icon">📑</span>
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
        badges={{ collection: unseenCount }}
      />
    </div>
  )
}
