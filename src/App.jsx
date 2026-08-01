import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import storiesJa from './data/stories.json'
import storiesDe from './data/stories_de.json'
import storiesFr from './data/stories_fr.json'
import storiesRu from './data/stories_ru.json'
import { mergeStorySets } from './lib/data'
import ReadingScreen from './components/ReadingScreen'
import CompanionOverlay from './components/CompanionOverlay'
import SurpriseMeOverlay from './components/SurpriseMeOverlay'
import BottomNav from './components/BottomNav'
import { getUnseenSavedWords, getActiveLanguages, setActiveLanguages, getActiveLevels, setActiveLevels } from './lib/storage'
import { getAvailableLangs } from './lib/langs'
import { syncAppBadge } from './lib/badge'
import './App.css'

const BookmarksScreen = lazy(() => import('./components/BookmarksScreen'))
const ExploreScreen = lazy(() => import('./components/ExploreScreen'))
const CurriculumScreen = lazy(() => import('./components/CurriculumScreen'))
const GamesScreen = lazy(() => import('./components/GamesScreen'))
const ProfileScreen = lazy(() => import('./components/ProfileScreen'))

function App() {
  const [tab, setTab] = useState('feed')
  // Every tab stays mounted once visited — switching away and back preserves
  // whatever that screen's own internal state was (open modals, filters,
  // scroll position, mid-game state), instead of losing it. A tab only
  // resets when the user deliberately re-taps the tab they're already on
  // (see changeTab below) — that's the one remaining "arrive fresh" case.
  const [visitedTabs, setVisitedTabs] = useState(() => new Set(['feed']))
  const [tabResetNonces, setTabResetNonces] = useState({})
  const [jumpToIndex, setJumpToIndex] = useState(null)
  const [exploreWordSeed, setExploreWordSeed] = useState(null)
  const [exploreNodeSeed, setExploreNodeSeed] = useState(null)
  const [gameSeed, setGameSeed] = useState(null)
  // Only the very first Feed mount of the session resumes the last reading
  // position (app reopen); re-tapping the Feed tab to force a fresh remount
  // still starts fresh at the top, like any other explicit tab reset.
  const [canRestoreFeedPosition, setCanRestoreFeedPosition] = useState(true)

  useEffect(() => {
    setVisitedTabs((prev) => (prev.has(tab) ? prev : new Set(prev).add(tab)))
  }, [tab])

  // Re-tapping the tab you're already on still forces that one screen to
  // remount fresh (bumping its own nonce changes its key) — every other
  // already-visited screen stays mounted and untouched. Switching to a
  // different tab is just a visibility toggle now, no remount at all.
  function changeTab(next) {
    if (next === tab) {
      setTabResetNonces((prev) => ({ ...prev, [next]: (prev[next] ?? 0) + 1 }))
    } else {
      setTab(next)
    }
  }
  const companionRef = useRef(null)

  // BottomNav is a single global instance now (see below) rather than one
  // per screen, so its unseen-saved-words badge is owned here too — every
  // screen that saves or clears saved words calls refreshUnseenCount()
  // instead of computing its own (mount-once) copy of this count.
  const [unseenSavedCount, setUnseenSavedCount] = useState(() => getUnseenSavedWords().size)
  function refreshUnseenCount() {
    setUnseenSavedCount(getUnseenSavedWords().size)
  }

  const allStories = useMemo(
    () =>
      mergeStorySets([
        { stories: storiesJa, lang: 'ja' },
        { stories: storiesDe, lang: 'de' },
        { stories: storiesFr, lang: 'fr' },
        { stories: storiesRu, lang: 'ru' },
      ]),
    [],
  )
  const allLangs = useMemo(() => getAvailableLangs(allStories), [allStories])

  const [activeLanguages, setActiveLanguagesState] = useState(() => getActiveLanguages(allLangs))
  const [activeLevels, setActiveLevelsState] = useState(() => getActiveLevels())

  const feedStories = useMemo(
    () =>
      allStories.filter(
        (story) =>
          activeLanguages.includes(story.lang) &&
          (activeLevels[story.lang] == null || activeLevels[story.lang].includes(story.level)),
      ),
    [allStories, activeLanguages, activeLevels],
  )

  useEffect(() => {
    if (navigator.storage?.persist) {
      navigator.storage.persist()
    }
    syncAppBadge(getUnseenSavedWords().size)
  }, [])

  function openStoryFromElsewhere(storyIndex) {
    setJumpToIndex(storyIndex)
    setTab('feed')
  }

  function openExploreForWord(lang, word) {
    setExploreWordSeed({ lang, word })
    setTab('explore')
  }

  function openExploreForNode(nodeId) {
    setExploreNodeSeed({ id: nodeId })
    setTab('explore')
  }

  function openGame(gameKey, puzzleId, lang) {
    setGameSeed({ gameKey, puzzleId, lang })
    setTab('games')
  }

  function toggleLanguage(lang) {
    setActiveLanguagesState((prev) => {
      const next = prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
      const safe = next.length === 0 ? allLangs : next
      setActiveLanguages(safe)
      return safe
    })
  }

  function toggleLevel(lang, level, allLevelsForLang) {
    setActiveLevelsState((prev) => {
      const current = prev[lang] ?? allLevelsForLang
      const next = current.includes(level) ? current.filter((l) => l !== level) : [...current, level]
      const safeForLang = next.length === 0 ? allLevelsForLang : next
      const updated = { ...prev, [lang]: safeForLang }
      setActiveLevels(updated)
      return updated
    })
  }

  function visibility(name) {
    return { display: tab === name ? 'contents' : 'none' }
  }

  return (
    <>
      <div style={visibility('feed')}>
        <ReadingScreen
          key={tabResetNonces.feed ?? 0}
          stories={feedStories}
          jumpToIndex={jumpToIndex}
          onConsumedJump={() => setJumpToIndex(null)}
          onStoryFinished={(lang, context) => companionRef.current?.notifyStoryFinished(lang, context)}
          onOpenGame={openGame}
          restorePosition={canRestoreFeedPosition}
          onConsumedRestore={() => setCanRestoreFeedPosition(false)}
          onSavedWordsChange={refreshUnseenCount}
        />
      </div>

      {visitedTabs.has('bookmarks') && (
        <div style={visibility('bookmarks')}>
          <Suspense fallback={null}>
            <BookmarksScreen
              key={tabResetNonces.bookmarks ?? 0}
              stories={allStories}
              activeTab={tab}
              onExploreWord={openExploreForWord}
              onOpenStory={openStoryFromElsewhere}
              onSavedWordsChange={refreshUnseenCount}
            />
          </Suspense>
        </div>
      )}

      {visitedTabs.has('explore') && (
        <div style={visibility('explore')}>
          <Suspense fallback={null}>
            <ExploreScreen
              key={tabResetNonces.explore ?? 0}
              stories={allStories}
              wordSeed={exploreWordSeed}
              nodeSeed={exploreNodeSeed}
              onOpenGame={openGame}
              onOpenStory={openStoryFromElsewhere}
              onSavedWordsChange={refreshUnseenCount}
            />
          </Suspense>
        </div>
      )}

      {visitedTabs.has('curriculum') && (
        <div style={visibility('curriculum')}>
          <Suspense fallback={null}>
            <CurriculumScreen
              key={tabResetNonces.curriculum ?? 0}
              stories={allStories}
              onOpenGame={openGame}
              onOpenStory={openStoryFromElsewhere}
              onExploreNode={openExploreForNode}
            />
          </Suspense>
        </div>
      )}

      {visitedTabs.has('games') && (
        <div style={visibility('games')}>
          <Suspense fallback={null}>
            <GamesScreen
              key={tabResetNonces.games ?? 0}
              stories={allStories}
              activeLanguages={activeLanguages}
              gameSeed={gameSeed}
            />
          </Suspense>
        </div>
      )}

      {visitedTabs.has('profile') && (
        <div style={visibility('profile')}>
          <Suspense fallback={null}>
            <ProfileScreen
              key={tabResetNonces.profile ?? 0}
              allStories={allStories}
              activeLanguages={activeLanguages}
              activeLevels={activeLevels}
              onToggleLanguage={toggleLanguage}
              onToggleLevel={toggleLevel}
            />
          </Suspense>
        </div>
      )}

      <CompanionOverlay ref={companionRef} langs={allLangs} />
      <SurpriseMeOverlay stories={allStories} onOpenNode={openExploreForNode} />
      <BottomNav active={tab} onChange={changeTab} badges={{ bookmarks: unseenSavedCount }} />
    </>
  )
}

export default App
