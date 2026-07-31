import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import storiesJa from './data/stories.json'
import storiesDe from './data/stories_de.json'
import { mergeStorySets } from './lib/data'
import ReadingScreen from './components/ReadingScreen'
import { getUnseenSavedWords, getActiveLanguages, setActiveLanguages, getActiveLevels, setActiveLevels } from './lib/storage'
import { getAvailableLangs } from './lib/langs'
import { syncAppBadge } from './lib/badge'
import './App.css'

const CollectionScreen = lazy(() => import('./components/CollectionScreen'))
const ExploreScreen = lazy(() => import('./components/ExploreScreen'))
const GamesScreen = lazy(() => import('./components/GamesScreen'))
const ProfileScreen = lazy(() => import('./components/ProfileScreen'))

function App() {
  const [tab, setTab] = useState('feed')
  const [jumpToIndex, setJumpToIndex] = useState(null)
  const [exploreWordSeed, setExploreWordSeed] = useState(null)

  const allStories = useMemo(
    () =>
      mergeStorySets([
        { stories: storiesJa, lang: 'ja' },
        { stories: storiesDe, lang: 'de' },
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

  if (tab === 'collection') {
    return (
      <Suspense fallback={null}>
        <CollectionScreen
          stories={allStories}
          activeTab={tab}
          onChangeTab={setTab}
          onExploreWord={openExploreForWord}
          onOpenStory={openStoryFromElsewhere}
        />
      </Suspense>
    )
  }

  if (tab === 'explore') {
    return (
      <Suspense fallback={null}>
        <ExploreScreen stories={allStories} wordSeed={exploreWordSeed} activeTab={tab} onChangeTab={setTab} />
      </Suspense>
    )
  }

  if (tab === 'games') {
    return (
      <Suspense fallback={null}>
        <GamesScreen stories={allStories} activeLanguages={activeLanguages} activeTab={tab} onChangeTab={setTab} />
      </Suspense>
    )
  }

  if (tab === 'profile') {
    return (
      <Suspense fallback={null}>
        <ProfileScreen
          allStories={allStories}
          activeLanguages={activeLanguages}
          activeLevels={activeLevels}
          onToggleLanguage={toggleLanguage}
          onToggleLevel={toggleLevel}
          activeTab={tab}
          onChangeTab={setTab}
        />
      </Suspense>
    )
  }

  return (
    <ReadingScreen
      stories={feedStories}
      jumpToIndex={jumpToIndex}
      onConsumedJump={() => setJumpToIndex(null)}
      activeTab={tab}
      onChangeTab={setTab}
    />
  )
}

export default App
