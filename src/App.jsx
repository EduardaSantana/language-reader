import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import storiesJa from './data/stories.json'
import storiesDe from './data/stories_de.json'
import storiesFr from './data/stories_fr.json'
import storiesRu from './data/stories_ru.json'
import { mergeStorySets } from './lib/data'
import ReadingScreen from './components/ReadingScreen'
import CompanionOverlay from './components/CompanionOverlay'
import SurpriseMeOverlay from './components/SurpriseMeOverlay'
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
  const [tabResetNonce, setTabResetNonce] = useState(0)
  const [jumpToIndex, setJumpToIndex] = useState(null)
  const [exploreWordSeed, setExploreWordSeed] = useState(null)
  const [exploreNodeSeed, setExploreNodeSeed] = useState(null)
  const [gameSeed, setGameSeed] = useState(null)
  // Only the very first Feed mount of the session resumes the last reading
  // position (app reopen); every later visit — including re-tapping the Feed
  // tab — starts fresh at the top, like any other tab reset.
  const [canRestoreFeedPosition, setCanRestoreFeedPosition] = useState(true)

  // Tapping the tab you're already on should feel like arriving fresh —
  // force the screen to remount instead of leaving stale internal state
  // (open modals, mid-game state, scroll position) in place.
  function changeTab(next) {
    if (next === tab) {
      setTabResetNonce((n) => n + 1)
    } else {
      setTab(next)
    }
  }
  const companionRef = useRef(null)

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

  const resetKey = `${tab}-${tabResetNonce}`

  let screen
  if (tab === 'bookmarks') {
    screen = (
      <Suspense fallback={null}>
        <BookmarksScreen
          key={resetKey}
          stories={allStories}
          activeTab={tab}
          onChangeTab={changeTab}
          onExploreWord={openExploreForWord}
          onOpenStory={openStoryFromElsewhere}
        />
      </Suspense>
    )
  } else if (tab === 'explore') {
    screen = (
      <Suspense fallback={null}>
        <ExploreScreen
          key={resetKey}
          stories={allStories}
          wordSeed={exploreWordSeed}
          nodeSeed={exploreNodeSeed}
          onOpenGame={openGame}
          onOpenStory={openStoryFromElsewhere}
          activeTab={tab}
          onChangeTab={changeTab}
        />
      </Suspense>
    )
  } else if (tab === 'curriculum') {
    screen = (
      <Suspense fallback={null}>
        <CurriculumScreen
          key={resetKey}
          stories={allStories}
          onOpenGame={openGame}
          onOpenStory={openStoryFromElsewhere}
          onExploreNode={openExploreForNode}
          activeTab={tab}
          onChangeTab={changeTab}
        />
      </Suspense>
    )
  } else if (tab === 'games') {
    screen = (
      <Suspense fallback={null}>
        <GamesScreen
          key={resetKey}
          stories={allStories}
          activeLanguages={activeLanguages}
          activeTab={tab}
          onChangeTab={changeTab}
          gameSeed={gameSeed}
        />
      </Suspense>
    )
  } else if (tab === 'profile') {
    screen = (
      <Suspense fallback={null}>
        <ProfileScreen
          key={resetKey}
          allStories={allStories}
          activeLanguages={activeLanguages}
          activeLevels={activeLevels}
          onToggleLanguage={toggleLanguage}
          onToggleLevel={toggleLevel}
          activeTab={tab}
          onChangeTab={changeTab}
        />
      </Suspense>
    )
  } else {
    screen = (
      <ReadingScreen
        key={resetKey}
        stories={feedStories}
        jumpToIndex={jumpToIndex}
        onConsumedJump={() => setJumpToIndex(null)}
        onStoryFinished={(lang, context) => companionRef.current?.notifyStoryFinished(lang, context)}
        onOpenGame={openGame}
        restorePosition={canRestoreFeedPosition}
        onConsumedRestore={() => setCanRestoreFeedPosition(false)}
        activeTab={tab}
        onChangeTab={changeTab}
      />
    )
  }

  return (
    <>
      {screen}
      <CompanionOverlay ref={companionRef} langs={allLangs} />
      <SurpriseMeOverlay stories={allStories} onOpenNode={openExploreForNode} />
    </>
  )
}

export default App
