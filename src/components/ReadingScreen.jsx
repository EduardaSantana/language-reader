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
  getReadStories,
  markStoryRead,
  getFeedOrder,
  setFeedOrder,
} from '../lib/storage'
import { syncAppBadge } from '../lib/badge'
import StoryCard from './StoryCard'
import SearchModal from './SearchModal'
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

function buildFavoritesCards(stories, favorites) {
  return stories
    .filter((story) => favorites.has(story.idx))
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

export default function ReadingScreen({ stories, jumpToIndex, onConsumedJump, onStoryFinished, activeTab, onChangeTab }) {
  const [showFurigana, setShowFurigana] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [unseenCount, setUnseenCount] = useState(() => getUnseenSavedWords().size)
  const [favorites, setFavorites] = useState(() => getFavoriteStories())
  const [readStories, setReadStories] = useState(() => getReadStories())
  const [activeIndex, setActiveIndex] = useState(-1)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [feedOrder, setFeedOrderState] = useState(() => getFeedOrder())
  const [shuffledStories, setShuffledStories] = useState(() =>
    getFeedOrder() === 'shuffled' ? shuffleArray(stories) : null,
  )

  const isFiltering = favoritesOnly
  const orderedStories = feedOrder === 'shuffled' && shuffledStories ? shuffledStories : stories

  const containerRef = useRef(null)
  const cardRefs = useRef([])

  function handleShuffleTap() {
    setShuffledStories(shuffleArray(stories))
    setFeedOrderState('shuffled')
    setFeedOrder('shuffled')
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleResetSequential() {
    setShuffledStories(null)
    setFeedOrderState('sequential')
    setFeedOrder('sequential')
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cards = useMemo(() => {
    if (isFiltering) return buildFavoritesCards(orderedStories, favorites)
    return buildCards(orderedStories, hasSeenLoopMilestone())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderedStories, isFiltering, favorites])

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
  }, [isFiltering])

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
    if (targetIndex >= 0) {
      cardRefs.current[targetIndex]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    setSearchOpen(false)
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

  function handleMarkRead(story) {
    setReadStories(markStoryRead(story.idx))
    onStoryFinished?.(story.lang, { type: 'story_finished', title_en: story.titleEn })
  }

  return (
    <div className="feed-screen">
      <div className="top-bar">
        <button className="icon-button-bar" onClick={() => setSearchOpen(true)} aria-label="Search stories">
          🔍
        </button>
        <button
          className={`icon-button-bar shuffle-toggle ${feedOrder === 'shuffled' ? 'active' : ''}`}
          onClick={handleShuffleTap}
          aria-label="Shuffle feed order"
          aria-pressed={feedOrder === 'shuffled'}
        >
          🔀
        </button>
        {feedOrder === 'shuffled' && (
          <button className="icon-button-bar" onClick={handleResetSequential} aria-label="Back to sequential order">
            ↺
          </button>
        )}
        <button
          className={`icon-button-bar favorites-filter-toggle ${favoritesOnly ? 'active' : ''}`}
          onClick={() => setFavoritesOnly((v) => !v)}
          aria-label="Show favorites only"
          aria-pressed={favoritesOnly}
        >
          {favoritesOnly ? '♥' : '♡'}
        </button>
        <button
          className={`icon-button-bar furigana-toggle ${showFurigana ? 'active' : ''}`}
          onClick={() => setShowFurigana((v) => !v)}
          aria-pressed={showFurigana}
          aria-label="Toggle furigana"
        >
          あ
        </button>
      </div>

      <div className="feed-container" ref={containerRef}>
        {cards.length === 0 && (
          <div className="empty-results">No favorites yet — tap the heart on a story to save it here.</div>
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
              isRead={readStories.has(card.storyIndex)}
              onToggleFavorite={() => handleToggleFavorite(card.storyIndex)}
              onSaveWord={(vocab) => handleSaveWord(vocab, card.story)}
              onMarkRead={() => handleMarkRead(card.story)}
            />
          )
        })}
      </div>

      {searchOpen && (
        <SearchModal stories={stories} onSelect={handleJump} onClose={() => setSearchOpen(false)} />
      )}

      <BottomNav active={activeTab} onChange={onChangeTab} badges={{ collection: unseenCount }} />
    </div>
  )
}
