import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  getReadingPosition,
  hasReadingPosition,
  setReadingPosition,
  markDayReadIfNeeded,
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
import { storyTeachesMap } from '../lib/exploreGraph'
import { langFlag, langMeta } from '../lib/langs'
import { levelMeta } from '../lib/levels'
import StoryCard from './StoryCard'
import StoryTile from './StoryTile'
import SearchModal from './SearchModal'

function shuffleArray(arr) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// Groups an already-ordered story list into (lang, level) chapters — only
// meaningful in sequential order, where that's a real progression; the
// caller gates this behind `showChapters`. Real derivation, not fabricated
// theming (see docs/ENCYCLOPEDIA_IMPLEMENTATION_PLAN.md's Phase 3 findings
// on why "themed" chapters like the mockup's "Friends & Pets" aren't used).
function groupIntoChapters(stories) {
  const groups = []
  let current = null
  for (const story of stories) {
    const key = `${story.lang}:${story.level}`
    if (!current || current.key !== key) {
      current = { key, lang: story.lang, level: story.level, stories: [] }
      groups.push(current)
    }
    current.stories.push(story)
  }
  return groups
}

// Bites mode (a swipeable feed of grammar-point cards) was removed —
// Encyclopedia's Curriculum now owns grammar-point browsing, so a second,
// separate grammar feed inside Read was redundant. Removed by request; see
// docs/ENCYCLOPEDIA_IMPLEMENTATION_PLAN.md's post-launch feedback section.
export default function ReadingScreen({
  stories,
  jumpToIndex,
  onConsumedJump,
  onStoryFinished,
  restorePosition,
  onConsumedRestore,
  onSavedWordsChange,
  onExploreNode,
}) {
  const [showFurigana, setShowFurigana] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [favorites, setFavorites] = useState(() => getFavoriteStories())
  const [readStories, setReadStories] = useState(() => getReadStories())
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [feedOrder, setFeedOrderState] = useState(() => getFeedOrder())
  const [shuffledStories, setShuffledStories] = useState(() =>
    getFeedOrder() === 'shuffled' ? shuffleArray(stories) : null,
  )
  const [openStoryIndex, setOpenStoryIndex] = useState(null)

  const isFiltering = favoritesOnly
  const orderedStories = feedOrder === 'shuffled' && shuffledStories ? shuffledStories : stories

  // "Teaches" chips + chapter grouping (Phase 3, docs/ENCYCLOPEDIA_IMPLEMENTATION_PLAN.md).
  // teachesMap only lists a grammar point if its example sentence genuinely
  // appears in that story's text (same rule lib/exploreGraph.js uses
  // elsewhere) — chapters only render in the feed's natural (lang, level)
  // order, since shuffled/favorites-filtered adjacency isn't a meaningful
  // progression.
  const teachesMap = useMemo(() => storyTeachesMap(stories), [stories])
  const showChapters = feedOrder === 'sequential' && !isFiltering

  const displayedStories = useMemo(
    () => (isFiltering ? orderedStories.filter((s) => favorites.has(s.idx)) : orderedStories),
    [orderedStories, isFiltering, favorites],
  )
  const chapters = useMemo(
    () => (showChapters ? groupIntoChapters(displayedStories) : [{ key: 'all', stories: displayedStories }]),
    [displayedStories, showChapters],
  )

  const containerRef = useRef(null)

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

  function handleOpenStory(storyIndex) {
    setOpenStoryIndex(storyIndex)
    setReadingPosition(storyIndex)
    markDayReadIfNeeded()
  }

  useLayoutEffect(() => {
    // Resume the last-read story on the very first mount of the session
    // (Read is lazy now — "first mount" may happen well after app start,
    // whenever the user first taps the Read tab, which is still correct) —
    // but only if a position was ever genuinely saved. getReadingPosition()
    // defaults to storyIndex 0 even when nothing was ever read, which would
    // otherwise drop a brand-new reader straight into a story instead of
    // showing them the list first.
    const targetStoryIndex =
      jumpToIndex ?? (restorePosition && hasReadingPosition() ? getReadingPosition().storyIndex : null)
    if (targetStoryIndex != null && stories.some((s) => s.idx === targetStoryIndex)) {
      setOpenStoryIndex(targetStoryIndex)
    }
    if (jumpToIndex != null) onConsumedJump?.()
    onConsumedRestore?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    function handleScroll() {
      markDayReadIfNeeded()
      container.removeEventListener('scroll', handleScroll)
    }
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [openStoryIndex])

  function handleJump(storyIndex) {
    setOpenStoryIndex(storyIndex)
    setSearchOpen(false)
  }

  function handleToggleFavorite(storyIndex) {
    setFavorites(toggleFavoriteStory(storyIndex))
  }

  function handleSaveWord(vocab, story) {
    addSavedWord({
      word: vocab.word,
      reading: vocab.reading,
      gender: vocab.gender,
      english: vocab.english,
      lang: story.lang,
      storyIndex: story.idx,
    })
    syncAppBadge(getUnseenSavedWords().size)
    onSavedWordsChange?.()
  }

  function handleMarkRead(story) {
    setReadStories(markStoryRead(story.idx))
    onStoryFinished?.(story.lang, { type: 'story_finished', title_en: story.titleEn })
  }

  const openStoryData = openStoryIndex != null ? stories.find((s) => s.idx === openStoryIndex) : null

  return (
    <div className="feed-screen">
      <div className="top-bar">
        {!openStoryData && (
          <div className="top-bar-icons">
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
        )}
      </div>

      {openStoryData ? (
        <div className="feed-container-static" ref={containerRef}>
          <StoryCard
            story={openStoryData}
            showFurigana={showFurigana}
            isFavorite={favorites.has(openStoryData.idx)}
            isRead={readStories.has(openStoryData.idx)}
            onToggleFavorite={() => handleToggleFavorite(openStoryData.idx)}
            onSaveWord={(vocab) => handleSaveWord(vocab, openStoryData)}
            onMarkRead={() => handleMarkRead(openStoryData)}
            onBack={() => setOpenStoryIndex(null)}
          />
        </div>
      ) : (
        <div className="feed-container" ref={containerRef}>
          {displayedStories.length === 0 && (
            <div className="empty-results">No favorites yet — tap the heart on a story to save it here.</div>
          )}

          <div className="read-story-list">
            {chapters.map((chapter) => (
              <div key={chapter.key}>
                {showChapters && (
                  <div className="read-chapter-header">
                    <span className="read-chapter-header-icon">{langFlag(chapter.lang)}</span>
                    <div className="read-chapter-header-text">
                      <div className="read-chapter-header-lang">{langMeta(chapter.lang).label}</div>
                      <div className="read-chapter-header-level">{levelMeta(chapter.level).name}</div>
                    </div>
                  </div>
                )}
                {chapter.stories.map((story) => (
                  <StoryTile
                    key={story.idx}
                    story={story}
                    teaches={teachesMap.get(story.idx)}
                    onOpen={() => handleOpenStory(story.idx)}
                    onExploreNode={onExploreNode}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {searchOpen && <SearchModal stories={stories} onSelect={handleJump} onClose={() => setSearchOpen(false)} />}
    </div>
  )
}
