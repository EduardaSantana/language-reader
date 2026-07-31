import { useMemo } from 'react'
import { getFavoriteStories, getUnseenKanji } from '../lib/storage'
import BottomNav from './BottomNav'

export default function FavoritesScreen({ stories, onOpenStory, activeTab, onChangeTab }) {
  const favorites = useMemo(() => {
    const favSet = getFavoriteStories()
    return stories
      .map((story, index) => ({ story, index }))
      .filter(({ index }) => favSet.has(index))
  }, [stories])
  const unseenCount = useMemo(() => getUnseenKanji().size, [])

  return (
    <div className="screen favorites-screen">
      <header className="collection-header">
        <h1>Favorites</h1>
      </header>

      {favorites.length === 0 ? (
        <p className="favorites-empty">
          Nothing favorited yet — tap the heart on any story to save it here.
        </p>
      ) : (
        <ul className="story-list">
          {favorites.map(({ story, index }) => (
            <li key={index}>
              <button className="story-list-item" onClick={() => onOpenStory(index)}>
                <span className="story-list-title-ja">{story.titleNative}</span>
                <span className="story-list-title-en">{story.titleEn}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <BottomNav active={activeTab} onChange={onChangeTab} badges={{ collection: unseenCount }} />
    </div>
  )
}
