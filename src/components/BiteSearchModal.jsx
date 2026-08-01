import { useState } from 'react'
import { langMeta } from '../lib/langs'

function matchesBiteQuery(point, query) {
  const q = query.toLowerCase()
  return (
    point.title.toLowerCase().includes(q) ||
    point.explanation.toLowerCase().includes(q) ||
    point.example_native.toLowerCase().includes(q) ||
    point.example_gloss.toLowerCase().includes(q)
  )
}

export default function BiteSearchModal({ points, onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const trimmed = query.trim()
  const filtered = trimmed ? points.filter((p) => matchesBiteQuery(p, trimmed)) : points

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header search-modal-header">
          <input
            className="search-input search-modal-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search grammar bites…"
            autoFocus
          />
          <button className="icon-button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {filtered.length === 0 ? (
          <p className="favorites-empty">No grammar bites found — try a different search.</p>
        ) : (
          <ul className="story-list">
            {filtered.map((point) => (
              <li key={point.id}>
                <button className="story-list-item" onClick={() => onSelect(point.id)}>
                  <span className="story-list-emoji">{langMeta(point.lang).avatar}</span>
                  <span className="story-list-text">
                    <span className="story-list-title-ja">{point.title}</span>
                    <span className="story-list-title-en">{point.example_native}</span>
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
