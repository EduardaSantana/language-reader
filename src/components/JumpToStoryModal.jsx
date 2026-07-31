import { langMeta } from '../lib/langs'
import { levelMeta } from '../lib/levels'

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

export default function JumpToStoryModal({ stories, onSelect, onClose }) {
  const groups = groupByLangAndLevel(stories)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Jump to story</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {groups.map(({ lang, levels }) => (
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
        ))}
      </div>
    </div>
  )
}
