import { useEffect, useMemo, useState } from 'react'
import { levelMeta } from '../lib/levels'
import { langMeta } from '../lib/langs'
import { isWordSaved } from '../lib/storage'
import { tokenizeWords, buildVocabLookup, lookupWord } from '../lib/tokenize'

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
  const vocabLookup = useMemo(() => buildVocabLookup(story.vocab), [story.vocab])

  useEffect(() => {
    if (!isActive) setRevealed(false)
  }, [isActive])

  function showGloss(text, reading, glossText) {
    const trimmed = text.trim()
    if (!trimmed) return
    setGloss({ text, reading, gloss: glossText })
    setSaved(isWordSaved(story.lang, text))
  }

  function handleSegmentTap(seg) {
    showGloss(seg.text, seg.reading, seg.gloss)
  }

  function handleWordTap(word) {
    const found = lookupWord(vocabLookup, word)
    showGloss(word, found?.reading ?? null, found?.english ?? null)
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
              {sentence.map((seg, i) =>
                seg.gloss || seg.reading ? (
                  <span
                    key={i}
                    className="segment segment-taggable"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSegmentTap(seg)
                    }}
                  >
                    <Segment seg={seg} showFurigana={showFurigana} />
                  </span>
                ) : (
                  tokenizeWords(seg.text).map((tok, tIdx) =>
                    tok.isWord ? (
                      <span
                        key={`${i}-${tIdx}`}
                        className="segment segment-taggable"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleWordTap(tok.text)
                        }}
                      >
                        {tok.text}
                      </span>
                    ) : (
                      <span key={`${i}-${tIdx}`}>{tok.text}</span>
                    ),
                  )
                ),
              )}
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
