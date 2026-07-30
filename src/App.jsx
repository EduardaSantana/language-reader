import { lazy, Suspense, useEffect, useState } from 'react'
import stories from './data/stories.json'
import ReadingScreen from './components/ReadingScreen'
import { getUnseenKanji } from './lib/storage'
import { syncAppBadge } from './lib/badge'
import './App.css'

const CollectionScreen = lazy(() => import('./components/CollectionScreen'))

function App() {
  const [view, setView] = useState('reading')

  useEffect(() => {
    if (navigator.storage?.persist) {
      navigator.storage.persist()
    }
    syncAppBadge(getUnseenKanji().size)
  }, [])

  if (view === 'collection') {
    return (
      <Suspense fallback={null}>
        <CollectionScreen stories={stories} onBack={() => setView('reading')} />
      </Suspense>
    )
  }
  return <ReadingScreen stories={stories} onOpenCollection={() => setView('collection')} />
}

export default App
