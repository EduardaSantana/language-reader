import { useEffect, useMemo, useState } from 'react'
import {
  getReadingPosition,
  setReadingPosition,
  getUnlockedKanji,
  addUnlockedKanji,
  addUnseenKanji,
  markDayReadIfNeeded,
} from '../lib/storage'
import { extractKanji } from '../lib/kanji'
import { syncAppBadge } from '../lib/badge'
import JumpToStoryModal from './JumpToStoryModal'

const PULL_ANIMATION_MS = 1800

function Segment({ seg, showFurigana }) {
  if (seg.furigana && showFurigana) {
    return (
      <ruby>
        {seg.text}
        <rt>{seg.furigana}</rt>
      </ruby>
    )
  }
  return <>{seg.text}</>
}

export default function ReadingScreen({ stories, onOpenCollection }) {
  const [position, setPosition] = useState(getReadingPosition)
  const [showFurigana, setShowFurigana] = useState(true)
  const [gloss, setGloss] = useState(null)
  const [jumpOpen, setJumpOpen] = useState(false)
  const [newlyPulled, setNewlyPulled] = useState([])

  const story = stories[position.storyIndex] ?? stories[0]
  const sentence = story.sentences[position.sentenceIndex] ?? story.sentences[0]

  const vocabByWord = useMemo(() => {
    const map = new Map()
    for (const v of story.vocab) map.set(v.word, v)
    return map
  }, [story])

  // Reward the moment this sentence is reached — not gated behind
  // finishing the page or pressing "Done for today".
  useEffect(() => {
    const kanjiHere = extractKanji(sentence.map((s) => s.text).join(''))
    if (kanjiHere.size === 0) return
    const before = getUnlockedKanji()
    const fresh = [...kanjiHere].filter((ch) => !before.has(ch))
    addUnlockedKanji(kanjiHere)
    if (fresh.length > 0) {
      setNewlyPulled(fresh)
      const unseen = addUnseenKanji(fresh)
      syncAppBadge(unseen.size)
    }
  }, [position.storyIndex, position.sentenceIndex])

  useEffect(() => {
    if (newlyPulled.length === 0) return
    const timer = setTimeout(() => setNewlyPulled([]), PULL_ANIMATION_MS)
    return () => clearTimeout(timer)
  }, [newlyPulled])

  function commitPosition(next) {
    setPosition(next)
    setReadingPosition(next)
    setGloss(null)
  }

  function goToSentence(delta) {
    const nextIndex = position.sentenceIndex + delta
    if (nextIndex < 0 || nextIndex >= story.sentences.length) return
    commitPosition({ ...position, sentenceIndex: nextIndex })
  }

  function handleWordTap(text) {
    const trimmed = text.trim()
    const match = vocabByWord.get(trimmed)
    if (match) setGloss(match)
  }

  function handleDoneForToday() {
    markDayReadIfNeeded()

    let next
    if (position.sentenceIndex + 1 < story.sentences.length) {
      next = { ...position, sentenceIndex: position.sentenceIndex + 1 }
    } else if (position.storyIndex + 1 < stories.length) {
      next = { storyIndex: position.storyIndex + 1, sentenceIndex: 0 }
    } else {
      next = { storyIndex: 0, sentenceIndex: 0 }
    }
    commitPosition(next)
  }

  function handleJump(storyIndex) {
    commitPosition({ storyIndex, sentenceIndex: 0 })
    setJumpOpen(false)
  }

  return (
    <div className="screen reading-screen">
      <header className="reading-header">
        <button className="icon-button" onClick={() => setJumpOpen(true)} aria-label="Jump to story">
          📖
        </button>
        <div className="story-title">
          <div className="story-title-ja">{story.title_ja}</div>
          <div className="story-title-en">{story.title_en}</div>
        </div>
        <button
          className="icon-button"
          onClick={() => setShowFurigana((v) => !v)}
          aria-pressed={showFurigana}
          aria-label="Toggle furigana"
        >
          あ
        </button>
      </header>

      {newlyPulled.length > 0 && (
        <div className="kanji-pull-toast" aria-live="polite">
          {newlyPulled.map((ch) => (
            <span key={ch} className="kanji-pull-char">
              {ch}
            </span>
          ))}
        </div>
      )}

      <div className="page-indicator">
        {position.sentenceIndex + 1} / {story.sentences.length}
      </div>

      <main className="sentence-area">
        <p className="sentence">
          {sentence.map((seg, i) => (
            <span
              key={i}
              className="segment"
              onClick={() => handleWordTap(seg.text)}
            >
              <Segment seg={seg} showFurigana={showFurigana} />
            </span>
          ))}
        </p>
      </main>

      {gloss && (
        <div className="gloss-panel" onClick={() => setGloss(null)}>
          <strong>{gloss.word}</strong>
          {gloss.reading && <span className="gloss-reading"> ({gloss.reading})</span>}
          <span className="gloss-english"> — {gloss.english}</span>
        </div>
      )}

      <nav className="sentence-nav">
        <button onClick={() => goToSentence(-1)} disabled={position.sentenceIndex === 0}>
          ← Prev
        </button>
        <button onClick={() => goToSentence(1)} disabled={position.sentenceIndex >= story.sentences.length - 1}>
          Next →
        </button>
      </nav>

      <footer className="reading-footer">
        <button className="done-button" onClick={handleDoneForToday}>
          Done for today
        </button>
        <button className="collection-link" onClick={onOpenCollection}>
          View Collection
        </button>
      </footer>

      {jumpOpen && (
        <JumpToStoryModal
          stories={stories}
          onSelect={handleJump}
          onClose={() => setJumpOpen(false)}
        />
      )}
    </div>
  )
}
