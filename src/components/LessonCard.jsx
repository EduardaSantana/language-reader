import { langMeta } from '../lib/langs'

/** Distinct from EntryCard on purpose — Curriculum is meant to read as a
 * course, not another Explore list, so this doesn't reuse EntryCard's layout. */
export default function LessonCard({ node, lessonNumber, totalLessons, accentColor, onNavigate, onPractice, onReadInStory }) {
  return (
    <div className="lesson-card" style={{ borderLeftColor: accentColor }}>
      <div className="lesson-card-header">
        <span className="lesson-number" style={{ color: accentColor }}>
          {String(lessonNumber).padStart(2, '0')}
        </span>
        <span className="lesson-of">
          Lesson {lessonNumber} of {totalLessons}
        </span>
      </div>

      <h3 className="lesson-title" lang={node.lang}>
        {node.title}
      </h3>
      {node.subtitle && <p className="lesson-explanation">{node.subtitle}</p>}

      {node.example?.native && (
        <div className="citation">
          <div className="citation-native" lang={node.lang}>
            {node.example.native}
          </div>
          {node.example.gloss && <div className="citation-gloss">{node.example.gloss}</div>}
        </div>
      )}

      {node.note && (
        <div className="bridge-note">
          <div className="bridge-note-label">Bridge note</div>
          <div className="bridge-note-text">{node.note}</div>
        </div>
      )}

      {node.relatedGameId && onPractice && (
        <button className="explore-link-button" onClick={onPractice}>
          Practice this lesson →
        </button>
      )}

      {node.storyContext && onReadInStory && (
        <button className="explore-link-button" onClick={onReadInStory}>
          Read it in a story →
        </button>
      )}

      {node.prerequisiteRefs?.length > 0 && (
        <>
          <div className="refs-label">Builds on</div>
          <div className="refs-list">
            {node.prerequisiteRefs.map((rel) => (
              <button key={rel.id} className="ref-button" onClick={() => onNavigate(rel.id)}>
                <span className="ref-word" lang={rel.lang}>
                  {rel.title}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {node.related.length > 0 && (
        <>
          <div className="refs-label">Go deeper</div>
          <div className="refs-list">
            {node.related.map((rel) => {
              const relMeta = langMeta(rel.lang)
              return (
                <button key={rel.id} className="ref-button" onClick={() => onNavigate(rel.id)}>
                  <span className={`ref-mark lang-tag-${rel.lang}`}>{relMeta.avatar}</span>
                  <span className="ref-word" lang={rel.lang}>
                    {rel.title}
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
