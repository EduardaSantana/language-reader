const KEYS = {
  readingPosition: 'reading_position',
  unlockedKanji: 'unlocked_kanji',
  daysRead: 'days_read',
  unseenKanji: 'unseen_kanji',
}

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

export function getReadingPosition() {
  return readJSON(KEYS.readingPosition, { storyIndex: 0, sentenceIndex: 0 })
}

export function setReadingPosition(position) {
  writeJSON(KEYS.readingPosition, position)
}

export function getUnlockedKanji() {
  return new Set(readJSON(KEYS.unlockedKanji, []))
}

export function addUnlockedKanji(kanjiChars) {
  const current = getUnlockedKanji()
  for (const ch of kanjiChars) current.add(ch)
  writeJSON(KEYS.unlockedKanji, [...current])
  return current
}

export function getUnseenKanji() {
  return new Set(readJSON(KEYS.unseenKanji, []))
}

export function addUnseenKanji(kanjiChars) {
  const current = getUnseenKanji()
  for (const ch of kanjiChars) current.add(ch)
  writeJSON(KEYS.unseenKanji, [...current])
  return current
}

export function clearUnseenKanji() {
  writeJSON(KEYS.unseenKanji, [])
  return new Set()
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
