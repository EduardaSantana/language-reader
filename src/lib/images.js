import { getImageCache, cacheImage } from './storage'

const ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY

export function hasImageProvider() {
  return Boolean(ACCESS_KEY)
}

export async function getWordImage(englishQuery) {
  if (!englishQuery) return null
  const cache = getImageCache()
  if (Object.prototype.hasOwnProperty.call(cache, englishQuery)) return cache[englishQuery] || null
  if (!ACCESS_KEY) return null

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(englishQuery)}&per_page=1&orientation=squarish`,
      { headers: { Authorization: `Client-ID ${ACCESS_KEY}` } },
    )
    if (!res.ok) return null
    const data = await res.json()
    const url = data.results?.[0]?.urls?.small ?? null
    if (url) cacheImage(englishQuery, url)
    return url
  } catch {
    return null
  }
}
