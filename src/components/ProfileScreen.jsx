import { useMemo, useState } from 'react'
import { getLevelsPerLang, levelMeta } from '../lib/levels'
import { getAvailableLangs, langMeta } from '../lib/langs'
import { clearAllProgress } from '../lib/storage'
import BottomNav from './BottomNav'

export default function ProfileScreen({
  allStories,
  activeLanguages,
  activeLevels,
  onToggleLanguage,
  onToggleLevel,
  activeTab,
  onChangeTab,
}) {
  const allLangs = useMemo(() => getAvailableLangs(allStories), [allStories])
  const levelsPerLang = useMemo(() => getLevelsPerLang(allStories), [allStories])
  const [confirmingDelete, setConfirmingDelete] = useState(false)

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
              This clears your reading position, saved words, days read, favorites, and opened
              stories. This can't be undone.
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

      <BottomNav active={activeTab} onChange={onChangeTab} />
    </div>
  )
}
