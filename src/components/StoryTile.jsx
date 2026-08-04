import { langFlag, langMeta } from '../lib/langs'

// Matches docs/ENCYCLOPEDIA_IMPLEMENTATION_PLAN.md's design spec artifact
// exactly: title, then "flag Language · level N" subtitle, then chips —
// no emoji/head row (the mockup's coded `.story-tile` never had one).
export default function StoryTile({ story, teaches, onOpen, onExploreNode }) {
  const { label } = langMeta(story.lang)
  return (
    <div className="story-tile" role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => e.key === 'Enter' && onOpen()}>
      <div className="story-tile-title" lang={story.lang}>
        {story.titleNative}
      </div>
      <div className="story-tile-sub">
        {langFlag(story.lang)} {label} · level {story.level}
      </div>
      {teaches?.length > 0 && (
        <div className="story-tile-chips">
          {teaches.map((t) => (
            <button
              key={t.id}
              className="teach-chip"
              onClick={(e) => {
                e.stopPropagation()
                onExploreNode?.(t.id)
              }}
            >
              {t.title}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
