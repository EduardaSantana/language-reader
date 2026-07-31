import { useEffect, useMemo, useState } from 'react'
import { levelMeta } from '../lib/levels'
import { langMeta } from '../lib/langs'

function Segment({ seg, showFurigana }) {
  if (seg.reading && showFurigana) {
    return (
      <ruby>
        {seg.text}
        <rt>{seg.reading}</rt>
      </ruby>
    )
  }
  return <>{seg.text}</>
}

export default function StoryCard({
  story,
  showFurigana,
  newlyPulled,
  cardRef,
  cardIndex,
  isActive,
  isFavorite,
  onToggleFavorite,
}) {
  const [revealed, setRevealed] = useState(false)
  const [gloss, setGloss] = useState(null)
  const { name: levelName, color: levelColor } = levelMeta(story.level)
  const { avatar: langAvatar, label: langLabel } = langMeta(story.lang)

  useEffect(() => {
    if (!isActive) setRevealed(false)
  }, [isActive])

  const vocabByWord = useMemo(() => {
    const map = new Map()
    for (const v of story.vocab) map.set(v.word, v)
    return map
  }, [story])

  function handleWordTap(text) {
    const trimmed = text.trim()
    const match = vocabByWord.get(trimmed)
    if (match) setGloss(match)
  }

  return (
    <section className="story-card" ref={cardRef} data-card-index={cardIndex}>
      <span className="level-tag" style={{ background: levelColor }}>
        Lv.{story.level} {levelName}
      </span>

      <button
        className="heart-button"
        onClick={(e) => {
          e.stopPropagation()
          onToggleFavorite()
        }}
        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        aria-pressed={isFavorite}
      >
        {isFavorite ? '♥' : '♡'}
      </button>

      {newlyPulled && newlyPulled.length > 0 && (
        <div className="kanji-pull-toast" aria-live="polite">
          {newlyPulled.map((ch) => (
            <span key={ch} className="kanji-pull-char">
              {ch}
            </span>
          ))}
        </div>
      )}

      {!revealed ? (
        <div className="story-cover" onClick={() => setRevealed(true)}>
          <div className="cover-emoji">{story.emoji || '📖'}</div>
          <div className="story-title-ja">{story.titleNative}</div>
          <div className="story-title-en">{story.titleEn}</div>
          <div className="language-badge">
            <span className="language-avatar">{langAvatar}</span>
            <span>{langLabel}</span>
          </div>
        </div>
      ) : (
        <div className="story-card-body" lang={story.lang} onClick={() => setGloss(null)}>
          <div className="story-card-title">
            <div className="story-title-ja">{story.titleNative}</div>
            <div className="story-title-en">{story.titleEn}</div>
          </div>
          {story.sentences.map((sentence, sIdx) => (
            <p className="sentence" key={sIdx}>
              {sentence.map((seg, i) => (
                <span
                  key={i}
                  className="segment"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleWordTap(seg.text)
                  }}
                >
                  <Segment seg={seg} showFurigana={showFurigana} />
                </span>
              ))}
            </p>
          ))}
        </div>
      )}

      {gloss && (
        <div className="gloss-panel" onClick={() => setGloss(null)}>
          <strong>{gloss.word}</strong>
          {gloss.reading && <span className="gloss-reading"> ({gloss.reading})</span>}
          <span className="gloss-english"> — {gloss.english}</span>
        </div>
      )}
    </section>
  )
}
