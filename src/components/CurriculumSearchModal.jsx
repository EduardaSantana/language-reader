import { useState } from 'react'

export default function CurriculumSearchModal({ points, onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const trimmed = query.trim().toLowerCase()
  const filtered = trimmed
    ? points.filter(
        (p) =>
          p.title.toLowerCase().includes(trimmed) ||
          p.explanation?.toLowerCase().includes(trimmed) ||
          p.example_native?.toLowerCase().includes(trimmed),
      )
    : []

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header search-modal-header">
          <input
            className="search-input search-modal-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search this curriculum…"
            autoFocus
          />
          <button className="icon-button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {!trimmed ? (
          <p className="favorites-empty">Type to search lesson titles, explanations, and examples.</p>
        ) : filtered.length === 0 ? (
          <p className="favorites-empty">No lessons found — try a different search.</p>
        ) : (
          <ul className="story-list">
            {filtered.map((p) => (
              <li key={p.id}>
                <button className="story-list-item" onClick={() => onSelect(p)}>
                  <span className="story-list-text">
                    <span className="story-list-title-ja">{p.title}</span>
                    <span className="story-list-title-en">{p.branch}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
