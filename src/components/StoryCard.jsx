import { useMemo, useState } from 'react'
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

// Rebuilt to match the design spec artifact exactly: Read is now a browsable
// list of story tiles (StoryTile.jsx), not a swipe-per-story feed — so this
// component is a dedicated reading view reached by tapping a tile, not a
// snap-scroll card with its own cover/reveal state. All the actual reading
// mechanics (tap-a-word-for-a-gloss, save, mark-as-read, favorite) are
// unchanged from before, just no longer wrapped in a full-bleed swipe card.
export default function StoryCard({ story, showFurigana, isFavorite, isRead, onToggleFavorite, onSaveWord, onMarkRead, onBack }) {
  const [gloss, setGloss] = useState(null)
  const [saved, setSaved] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const { name: levelName, color: levelColor } = levelMeta(story.level)
  const { avatar: langAvatar, label: langLabel } = langMeta(story.lang)
  const vocabLookup = useMemo(() => buildVocabLookup(story.vocab), [story.vocab])

  function showGloss(text, reading, glossText, gender = null) {
    const trimmed = text.trim()
    if (!trimmed) return
    setGloss({ text, reading, gloss: glossText, gender })
    setSaved(isWordSaved(story.lang, text))
  }

  function handleSegmentTap(seg) {
    showGloss(seg.text, seg.reading, seg.gloss)
  }

  function handleWordTap(word) {
    const found = lookupWord(vocabLookup, word)
    showGloss(word, found?.reading ?? null, found?.english ?? null, found?.gender ?? null)
  }

  function handleSave(e) {
    e.stopPropagation()
    onSaveWord({ word: gloss.text, reading: gloss.reading, gender: gloss.gender, english: gloss.gloss })
    setSaved(true)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 500)
  }

  return (
    <section className="story-reader">
      <div className="story-reader-head">
        <button className="encyclopedia-back" onClick={onBack} aria-label="Back to Read">
          ‹
        </button>
        <div className="story-reader-head-lang">
          <span className="level-tag" style={{ background: levelColor, position: 'static' }}>
            Lv.{story.level} {levelName}
          </span>
          <div className="language-badge" style={{ position: 'static' }}>
            <span className="language-avatar">{langAvatar}</span>
            <span>{langLabel}</span>
          </div>
        </div>
        <button
          className="story-reader-heart"
          onClick={onToggleFavorite}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={isFavorite}
        >
          {isFavorite ? '♥' : '♡'}
        </button>
      </div>

      <div className="story-reader-body" lang={story.lang} onClick={() => setGloss(null)}>
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

      {gloss && (
        <div className="gloss-panel" onClick={(e) => e.stopPropagation()}>
          <div className="gloss-text">
            <strong>{gloss.text}</strong>
            {(gloss.reading || gloss.gender) && (
              <span className="gloss-reading"> ({gloss.reading || gloss.gender})</span>
            )}
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
