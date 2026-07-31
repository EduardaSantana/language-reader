import { useEffect, useState } from 'react'
import { levelMeta } from '../lib/levels'
import { langMeta } from '../lib/langs'
import { isWordSaved } from '../lib/storage'

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
  cardRef,
  cardIndex,
  isActive,
  isFavorite,
  isRead,
  onToggleFavorite,
  onSaveWord,
  onMarkRead,
}) {
  const [revealed, setRevealed] = useState(false)
  const [gloss, setGloss] = useState(null)
  const [saved, setSaved] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const { name: levelName, color: levelColor } = levelMeta(story.level)
  const { avatar: langAvatar, label: langLabel } = langMeta(story.lang)

  useEffect(() => {
    if (!isActive) setRevealed(false)
  }, [isActive])

  function handleSegmentTap(seg) {
    const trimmed = seg.text.trim()
    if (!trimmed || (!seg.reading && !seg.gloss)) return
    setGloss(seg)
    setSaved(isWordSaved(story.lang, seg.text))
  }

  function handleSave(e) {
    e.stopPropagation()
    onSaveWord({ word: gloss.text, reading: gloss.reading, english: gloss.gloss })
    setSaved(true)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 500)
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
                  className={`segment ${seg.gloss || seg.reading ? 'segment-taggable' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSegmentTap(seg)
                  }}
                >
                  <Segment seg={seg} showFurigana={showFurigana} />
                </span>
              ))}
            </p>
          ))}
          <button
            className={`mark-read-button ${isRead ? 'read' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              onMarkRead()
            }}
            disabled={isRead}
          >
            {isRead ? '✓ Read' : 'Mark as read'}
          </button>
        </div>
      )}

      {gloss && (
        <div className="gloss-panel" onClick={(e) => e.stopPropagation()}>
          <div className="gloss-text">
            <strong>{gloss.text}</strong>
            {gloss.reading && <span className="gloss-reading"> ({gloss.reading})</span>}
            {gloss.gloss ? (
              <span className="gloss-english"> — {gloss.gloss}</span>
            ) : (
              <span className="gloss-english gloss-unknown"> — no meaning on file yet</span>
            )}
          </div>
          {gloss.gloss && (
            <button
              className={`save-word-button ${saved ? 'saved' : ''} ${justSaved ? 'just-saved' : ''}`}
              onClick={handleSave}
              disabled={saved}
            >
              {saved ? '✓ Saved' : '+ Save'}
            </button>
          )}
          <button className="gloss-dismiss" onClick={() => setGloss(null)} aria-label="Close">
            ✕
          </button>
        </div>
      )}
    </section>
  )
}
