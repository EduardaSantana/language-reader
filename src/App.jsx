import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import storiesJa from './data/stories.json'
import storiesDe from './data/stories_de.json'
import storiesFr from './data/stories_fr.json'
import storiesRu from './data/stories_ru.json'
import { mergeStorySets } from './lib/data'
import EncyclopediaScreen from './components/EncyclopediaScreen'
import BottomNav from './components/BottomNav'
import { getUnseenSavedWords, getActiveLanguages, setActiveLanguages, getActiveLevels, setActiveLevels } from './lib/storage'
import { getAvailableLangs } from './lib/langs'
import { syncAppBadge } from './lib/badge'
import './App.css'

// Phase 4 cutover (docs/ENCYCLOPEDIA_IMPLEMENTATION_PLAN.md): Encyclopedia is
// now the landing tab (eagerly imported, always mounted — the role Feed used
// to have), Read is lazy like every other non-landing tab. Bookmarks/Explore/
// Curriculum are deliberately kept mounted-but-unreachable (no BottomNav
// button, no seed ever routes to them) rather than deleted — a safety net
// until their replacement coverage inside Encyclopedia is fully confirmed
// (Phase 4.3 in the plan).
const ReadingScreen = lazy(() => import('./components/ReadingScreen'))
const BookmarksScreen = lazy(() => import('./components/BookmarksScreen'))
const ExploreScreen = lazy(() => import('./components/ExploreScreen'))
const CurriculumScreen = lazy(() => import('./components/CurriculumScreen'))
const GamesScreen = lazy(() => import('./components/GamesScreen'))
const ProfileScreen = lazy(() => import('./components/ProfileScreen'))

function App() {
  const [tab, setTab] = useState('encyclopedia')
  // Every tab stays mounted once visited — switching away and back preserves
  // whatever that screen's own internal state was (open modals, filters,
  // scroll position, mid-game state), instead of losing it. A tab only
  // resets when the user deliberately re-taps the tab they're already on
  // (see changeTab below) — that's the one remaining "arrive fresh" case.
  const [visitedTabs, setVisitedTabs] = useState(() => new Set(['encyclopedia']))
  const [tabResetNonces, setTabResetNonces] = useState({})
  const [jumpToIndex, setJumpToIndex] = useState(null)
  const [exploreWordSeed, setExploreWordSeed] = useState(null)
  const [exploreNodeSeed, setExploreNodeSeed] = useState(null)
  const [encyclopediaWordSeed, setEncyclopediaWordSeed] = useState(null)
  const [encyclopediaNodeSeed, setEncyclopediaNodeSeed] = useState(null)
  const [gameSeed, setGameSeed] = useState(null)
  // Only the very first Read mount of the session resumes the last reading
  // position; re-tapping the Read tab to force a fresh remount still starts
  // fresh at the top, like any other explicit tab reset. Read is lazy now
  // (Encyclopedia is the landing tab), so "first mount" may happen well
  // after app start — still correct: resume on whenever you first visit.
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

  // Renamed in spirit, not in signature — every existing caller (Curriculum,
  // Bookmarks, Read's teach-chips, SurpriseMeOverlay) already calls these by
  // these names; only the destination tab changed, from the now-unreachable
  // Explore to the new Encyclopedia landing tab.
  function openExploreForWord(lang, word) {
    setEncyclopediaWordSeed({ lang, word })
    setTab('encyclopedia')
  }

  function openExploreForNode(nodeId) {
    setEncyclopediaNodeSeed({ id: nodeId })
    setTab('encyclopedia')
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
      <div style={visibility('encyclopedia')}>
        <EncyclopediaScreen
          key={tabResetNonces.encyclopedia ?? 0}
          stories={allStories}
          onOpenGame={openGame}
          onOpenStory={openStoryFromElsewhere}
          onSavedWordsChange={refreshUnseenCount}
          wordSeed={encyclopediaWordSeed}
          nodeSeed={encyclopediaNodeSeed}
        />
      </div>

      {visitedTabs.has('feed') && (
        <div style={visibility('feed')}>
          <Suspense fallback={null}>
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
              onExploreNode={openExploreForNode}
            />
          </Suspense>
        </div>
      )}

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

      <BottomNav active={tab} onChange={changeTab} badges={{ encyclopedia: unseenSavedCount }} />
    </>
  )
}

export default App
