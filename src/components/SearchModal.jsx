import { useState } from 'react'
import { langMeta } from '../lib/langs'
import { levelMeta } from '../lib/levels'
import { matchesQuery } from '../lib/search'

function groupByLangAndLevel(stories) {
  const byLang = new Map()
  for (const story of stories) {
    if (!byLang.has(story.lang)) byLang.set(story.lang, new Map())
    const byLevel = byLang.get(story.lang)
    if (!byLevel.has(story.level)) byLevel.set(story.level, [])
    byLevel.get(story.level).push(story)
  }
  return [...byLang.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([lang, byLevel]) => ({
      lang,
      levels: [...byLevel.entries()]
        .sort(([a], [b]) => a - b)
        .map(([level, levelStories]) => ({ level, stories: levelStories })),
    }))
}

export default function SearchModal({ stories, onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const trimmed = query.trim()
  const filtered = trimmed ? stories.filter((s) => matchesQuery(s, trimmed)) : null
  const groups = trimmed ? null : groupByLangAndLevel(stories)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header search-modal-header">
          <input
            className="search-input search-modal-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stories or vocab…"
            autoFocus
          />
          <button className="icon-button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {trimmed ? (
          filtered.length === 0 ? (
            <p className="favorites-empty">No stories found — try a different search.</p>
          ) : (
            <ul className="story-list">
              {filtered.map((story) => (
                <li key={story.idx}>
                  <button className="story-list-item" onClick={() => onSelect(story.idx)}>
                    <span className="story-list-title-ja">{story.titleNative}</span>
                    <span className="story-list-title-en">{story.titleEn}</span>
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : (
          groups.map(({ lang, levels }) => (
            <div className="jump-lang-group" key={lang}>
              <div className="jump-lang-heading">
                <span className="language-avatar">{langMeta(lang).avatar}</span>
                <span>{langMeta(lang).label}</span>
              </div>
              {levels.map(({ level, stories: levelStories }) => (
                <div className="jump-level-group" key={level}>
                  <div className="jump-level-heading">
                    Lv.{level} {levelMeta(level).name}
                  </div>
                  <ul className="story-list">
                    {levelStories.map((story) => (
                      <li key={story.idx}>
                        <button className="story-list-item" onClick={() => onSelect(story.idx)}>
                          <span className="story-list-title-ja">{story.titleNative}</span>
                          <span className="story-list-title-en">{story.titleEn}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
