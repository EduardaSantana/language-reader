import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import storiesJa from './data/stories.json'
import storiesDe from './data/stories_de.json'
import { mergeStorySets } from './lib/data'
import ReadingScreen from './components/ReadingScreen'
import { getUnseenKanji } from './lib/storage'
import { syncAppBadge } from './lib/badge'
import './App.css'

const CollectionScreen = lazy(() => import('./components/CollectionScreen'))
const FavoritesScreen = lazy(() => import('./components/FavoritesScreen'))
const ExploreScreen = lazy(() => import('./components/ExploreScreen'))

function App() {
  const [tab, setTab] = useState('feed')
  const [jumpToIndex, setJumpToIndex] = useState(null)
  const [exploreCharSeed, setExploreCharSeed] = useState(null)

  const stories = useMemo(
    () =>
      mergeStorySets([
        { stories: storiesJa, lang: 'ja' },
        { stories: storiesDe, lang: 'de' },
      ]),
    [],
  )

  useEffect(() => {
    if (navigator.storage?.persist) {
      navigator.storage.persist()
    }
    syncAppBadge(getUnseenKanji().size)
  }, [])

  function openStoryFromElsewhere(storyIndex) {
    setJumpToIndex(storyIndex)
    setTab('feed')
  }

  function openExploreForChar(char) {
    setExploreCharSeed(char)
    setTab('explore')
  }

  if (tab === 'collection') {
    return (
      <Suspense fallback={null}>
        <CollectionScreen
          stories={stories}
          activeTab={tab}
          onChangeTab={setTab}
          onExploreChar={openExploreForChar}
        />
      </Suspense>
    )
  }

  if (tab === 'favorites') {
    return (
      <Suspense fallback={null}>
        <FavoritesScreen
          stories={stories}
          onOpenStory={openStoryFromElsewhere}
          activeTab={tab}
          onChangeTab={setTab}
        />
      </Suspense>
    )
  }

  if (tab === 'explore') {
    return (
      <Suspense fallback={null}>
        <ExploreScreen
          stories={stories}
          charSeed={exploreCharSeed}
          activeTab={tab}
          onChangeTab={setTab}
        />
      </Suspense>
    )
  }

  return (
    <ReadingScreen
      stories={stories}
      jumpToIndex={jumpToIndex}
      onConsumedJump={() => setJumpToIndex(null)}
      activeTab={tab}
      onChangeTab={setTab}
    />
  )
}

export default App
