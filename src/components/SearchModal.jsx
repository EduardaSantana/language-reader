import { useState } from 'react'
import { langMeta, getAvailableLangs } from '../lib/langs'
import { levelMeta, getAvailableLevels } from '../lib/levels'
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

function ResultRow({ story, onSelect }) {
  const { name: levelName, color: levelColor } = levelMeta(story.level)
  return (
    <li>
      <button className="story-list-item" onClick={() => onSelect(story.idx)}>
        <span className="story-list-emoji">{story.emoji || '📖'}</span>
        <span className="story-list-text">
          <span className="story-list-title-ja">{story.titleNative}</span>
          <span className="story-list-title-en">{story.titleEn}</span>
        </span>
        <span className="story-list-level-tag" style={{ background: levelColor }}>
          Lv.{story.level} {levelName}
        </span>
      </button>
    </li>
  )
}

export default function SearchModal({ stories, onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const [langFilter, setLangFilter] = useState(null)
  const [levelFilter, setLevelFilter] = useState(null)

  const allLangs = getAvailableLangs(stories)
  const allLevels = getAvailableLevels(stories)

  const scoped = stories
    .filter((s) => langFilter == null || s.lang === langFilter)
    .filter((s) => levelFilter == null || s.level === levelFilter)

  const trimmed = query.trim()
  const filtered = trimmed ? scoped.filter((s) => matchesQuery(s, trimmed)) : null
  const groups = trimmed ? null : groupByLangAndLevel(scoped)

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

        <div className="search-filter-chips">
          {allLangs.length > 1 && (
            <>
              <button
                className={`level-pill-button ${langFilter == null ? 'active' : ''}`}
                onClick={() => setLangFilter(null)}
              >
                All languages
              </button>
              {allLangs.map((lang) => (
                <button
                  key={lang}
                  className={`level-pill-button ${langFilter === lang ? 'active' : ''}`}
                  onClick={() => setLangFilter(lang)}
                >
                  {langMeta(lang).avatar} {langMeta(lang).label}
                </button>
              ))}
            </>
          )}
        </div>
        <div className="search-filter-chips">
          <button
            className={`level-pill-button ${levelFilter == null ? 'active' : ''}`}
            onClick={() => setLevelFilter(null)}
          >
            All levels
          </button>
          {allLevels.map((level) => (
            <button
              key={level}
              className={`level-pill-button ${levelFilter === level ? 'active' : ''}`}
              style={levelFilter === level ? { background: levelMeta(level).color } : undefined}
              onClick={() => setLevelFilter(level)}
            >
              Lv.{level}
            </button>
          ))}
        </div>

        {trimmed ? (
          filtered.length === 0 ? (
            <p className="favorites-empty">No stories found — try a different search.</p>
          ) : (
            <ul className="story-list">
              {filtered.map((story) => (
                <ResultRow key={story.idx} story={story} onSelect={onSelect} />
              ))}
            </ul>
          )
        ) : groups.length === 0 ? (
          <p className="favorites-empty">No stories match these filters.</p>
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
                      <ResultRow key={story.idx} story={story} onSelect={onSelect} />
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
