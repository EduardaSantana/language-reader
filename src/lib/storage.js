const KEYS = {
  readingPosition: 'reading_position',
  daysRead: 'days_read',
  seenLoopMilestone: 'seen_loop_milestone',
  favoriteStories: 'favorite_stories',
  savedWords: 'saved_words',
  unseenSavedWords: 'unseen_saved_words',
  readStories: 'read_stories',
  activeLanguages: 'active_languages',
  activeLevels: 'active_levels',
  imageCache: 'image_cache',
  feedOrder: 'feed_order',
  companionDeviceId: 'companion_device_id',
  exploreTrail: 'explore_trail',
  seenOddities: 'seen_oddities',
}

const PROGRESS_KEYS = [
  KEYS.readingPosition,
  KEYS.savedWords,
  KEYS.daysRead,
  KEYS.favoriteStories,
  KEYS.readStories,
  KEYS.unseenSavedWords,
  KEYS.exploreTrail,
  KEYS.seenOddities,
]

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function wordKey(lang, word) {
  return `${lang}:${word}`
}

export function getReadingPosition() {
  const stored = readJSON(KEYS.readingPosition, { storyIndex: 0 })
  return { storyIndex: stored.storyIndex ?? 0 }
}

export function setReadingPosition(storyIndex) {
  writeJSON(KEYS.readingPosition, { storyIndex })
}

export function getDaysRead() {
  return readJSON(KEYS.daysRead, { count: 0, lastDate: null })
}

export function todayString() {
  return new Date().toISOString().slice(0, 10)
}

export function markDayReadIfNeeded() {
  const daysRead = getDaysRead()
  const today = todayString()
  if (daysRead.lastDate !== today) {
    const updated = { count: daysRead.count + 1, lastDate: today }
    writeJSON(KEYS.daysRead, updated)
    return updated
  }
  return daysRead
}

export function hasSeenLoopMilestone() {
  return readJSON(KEYS.seenLoopMilestone, false)
}

export function markLoopMilestoneSeen() {
  writeJSON(KEYS.seenLoopMilestone, true)
}

export function getFavoriteStories() {
  return new Set(readJSON(KEYS.favoriteStories, []))
}

export function toggleFavoriteStory(storyIndex) {
  const current = getFavoriteStories()
  if (current.has(storyIndex)) {
    current.delete(storyIndex)
  } else {
    current.add(storyIndex)
  }
  writeJSON(KEYS.favoriteStories, [...current])
  return current
}

export function getSavedWords() {
  return readJSON(KEYS.savedWords, [])
}

export function isWordSaved(lang, word) {
  return getSavedWords().some((w) => w.lang === lang && w.word === word)
}

export function addSavedWord(entry) {
  const current = getSavedWords()
  if (current.some((w) => w.lang === entry.lang && w.word === entry.word)) return current
  const updated = [...current, entry]
  writeJSON(KEYS.savedWords, updated)
  addUnseenSavedWords([wordKey(entry.lang, entry.word)])
  return updated
}

export function getUnseenSavedWords() {
  return new Set(readJSON(KEYS.unseenSavedWords, []))
}

function addUnseenSavedWords(keys) {
  const current = getUnseenSavedWords()
  for (const k of keys) current.add(k)
  writeJSON(KEYS.unseenSavedWords, [...current])
  return current
}

export function clearUnseenSavedWords() {
  writeJSON(KEYS.unseenSavedWords, [])
  return new Set()
}

export function getReadStories() {
  return new Set(readJSON(KEYS.readStories, []))
}

export function markStoryRead(storyIndex) {
  const current = getReadStories()
  if (current.has(storyIndex)) return current
  current.add(storyIndex)
  writeJSON(KEYS.readStories, [...current])
  return current
}

export function unmarkStoryRead(storyIndex) {
  const current = getReadStories()
  if (!current.has(storyIndex)) return current
  current.delete(storyIndex)
  writeJSON(KEYS.readStories, [...current])
  return current
}

export function getActiveLanguages(allLangs) {
  return readJSON(KEYS.activeLanguages, allLangs)
}

export function setActiveLanguages(langs) {
  writeJSON(KEYS.activeLanguages, langs)
}

export function getActiveLevels() {
  return readJSON(KEYS.activeLevels, {})
}

export function setActiveLevels(levelsByLang) {
  writeJSON(KEYS.activeLevels, levelsByLang)
}

export function getImageCache() {
  return readJSON(KEYS.imageCache, {})
}

export function cacheImage(query, url) {
  const cache = getImageCache()
  cache[query] = url
  writeJSON(KEYS.imageCache, cache)
}

export function clearAllProgress() {
  for (const key of PROGRESS_KEYS) localStorage.removeItem(key)
}

export function getFeedOrder() {
  return readJSON(KEYS.feedOrder, 'shuffled')
}

export function setFeedOrder(order) {
  writeJSON(KEYS.feedOrder, order)
}

export function getCompanionDeviceId() {
  let id = readJSON(KEYS.companionDeviceId, null)
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    writeJSON(KEYS.companionDeviceId, id)
  }
  return id
}

export function getExploreTrail() {
  return readJSON(KEYS.exploreTrail, null)
}

export function setExploreTrail(trail) {
  writeJSON(KEYS.exploreTrail, trail)
  return trail
}

export function clearExploreTrail() {
  writeJSON(KEYS.exploreTrail, null)
  return null
}

export function getSeenOddities() {
  return new Set(readJSON(KEYS.seenOddities, []))
}

export function markOdditySeen(id) {
  const current = getSeenOddities()
  if (current.has(id)) return current
  current.add(id)
  writeJSON(KEYS.seenOddities, [...current])
  return current
}

export function markOdditiesSeen(ids) {
  const current = getSeenOddities()
  let changed = false
  for (const id of ids) {
    if (!current.has(id)) {
      current.add(id)
      changed = true
    }
  }
  if (changed) writeJSON(KEYS.seenOddities, [...current])
  return current
}
