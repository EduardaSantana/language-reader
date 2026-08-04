import { useMemo, useState } from 'react'
import { getLevelsPerLang, levelMeta } from '../lib/levels'
import { getAvailableLangs, langMeta } from '../lib/langs'
import { clearAllProgress, getSavedWords, getReadStories } from '../lib/storage'

export default function ProfileScreen({
  allStories,
  activeLanguages,
  activeLevels,
  onToggleLanguage,
  onToggleLevel,
}) {
  const allLangs = useMemo(() => getAvailableLangs(allStories), [allStories])
  const levelsPerLang = useMemo(() => getLevelsPerLang(allStories), [allStories])
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  // Real collection stats only — no fabricated "badges" or completion
  // tracking that doesn't actually exist in storage.js. "Oddities found"
  // was dropped: markOdditySeen/markOdditiesSeen are only ever called from
  // the now-unreachable ExploreScreen (see
  // docs/ENCYCLOPEDIA_IMPLEMENTATION_PLAN.md's findings), so that counter
  // was permanently stuck at 0 post-cutover — showing a stat nothing can
  // ever move is worse than not showing it. Re-add once oddity-seen
  // tracking is wired into Encyclopedia's own oddity views for real.
  const wordsSaved = useMemo(() => getSavedWords().length, [])
  const storiesRead = useMemo(() => getReadStories().size, [])

  function handleDeleteAll() {
    clearAllProgress()
    window.location.reload()
  }

  return (
    <div className="screen profile-screen">
      <header className="collection-header">
        <h1>Profile</h1>
      </header>

      <div className="profile-section">
        <div className="profile-section-title">Your collection so far</div>
        <div className="journal-stat">
          <span className="journal-stat-label">📗 Words saved</span>
          <span className="journal-stat-value">{wordsSaved}</span>
        </div>
        <div className="journal-stat">
          <span className="journal-stat-label">📖 Stories read</span>
          <span className="journal-stat-value">{storiesRead}</span>
        </div>
      </div>

      <div className="profile-section">
        <div className="profile-section-title">Languages</div>
        {allLangs.map((lang) => {
          const langActive = activeLanguages.includes(lang)
          const { avatar, label } = langMeta(lang)
          return (
            <div className="profile-lang-block" key={lang}>
              <button
                className={`profile-toggle-row ${langActive ? 'active' : ''}`}
                onClick={() => onToggleLanguage(lang)}
                aria-pressed={langActive}
              >
                <span className="language-avatar">{avatar}</span>
                <span>{label}</span>
                <span className="profile-toggle-check">{langActive ? '✓' : ''}</span>
              </button>
              <div className={`profile-level-row ${langActive ? '' : 'dimmed'}`}>
                {(levelsPerLang[lang] ?? []).map((level) => {
                  const levelsForLang = activeLevels[lang]
                  const levelActive = levelsForLang == null || levelsForLang.includes(level)
                  return (
                    <button
                      key={level}
                      className={`level-pill-button ${levelActive ? 'active' : ''}`}
                      style={levelActive ? { background: levelMeta(level).color } : undefined}
                      onClick={() => onToggleLevel(lang, level, levelsPerLang[lang])}
                    >
                      Lv.{level}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="profile-section">
        <div className="profile-section-title">Data</div>
        <button className="delete-progress-button" onClick={() => setConfirmingDelete(true)}>
          Delete all progress
        </button>
      </div>

      {confirmingDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmingDelete(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete all progress?</h2>
            </div>
            <p>
              This clears your reading position, saved words, days read, favorites, read
              stories, and your Explore web. This can't be undone.
            </p>
            <div className="modal-actions">
              <button className="icon-button" onClick={() => setConfirmingDelete(false)}>
                Cancel
              </button>
              <button className="delete-progress-confirm-button" onClick={handleDeleteAll}>
                Delete everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
