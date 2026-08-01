import { langMeta } from '../lib/langs'

export default function EntryCard({
  node,
  stepLabel,
  showRefs,
  onNavigate,
  onSave,
  saved,
  onPractice,
  onDigDeeper,
  diggingDeeper,
  onOpenRabbitHole,
}) {
  const { avatar, label } = langMeta(node.lang)
  const posLabel = node.type === 'grammar' ? 'grammar point' : node.type === 'oddity' ? '✨ oddity' : node.pos

  return (
    <div
      className={`entry-card ${onOpenRabbitHole ? 'entry-card-clickable' : ''} ${
        node.type === 'oddity' ? 'entry-card-oddity' : ''
      }`}
      onClick={onOpenRabbitHole}
      role={onOpenRabbitHole ? 'button' : undefined}
      tabIndex={onOpenRabbitHole ? 0 : undefined}
    >
      <div className="entry-eyebrow">
        <span className={`lang-tag lang-tag-${node.lang}`}>
          {avatar} {label}
        </span>
        {posLabel && <span className="entry-pos">{posLabel}</span>}
        {stepLabel && <span className="step-badge">{stepLabel}</span>}
      </div>

      <div className="entry-headword" lang={node.lang}>
        {node.title}
      </div>
      {node.reading && <div className="entry-reading">{node.reading}</div>}
      {node.subtitle && <p className="entry-definition">{node.subtitle}</p>}

      {node.example?.native && (
        <div className="citation">
          <div className="citation-native" lang={node.lang}>
            {node.example.native}
          </div>
          {node.example.gloss && <div className="citation-gloss">{node.example.gloss}</div>}
          {node.example.source && <div className="citation-source">— {node.example.source}</div>}
        </div>
      )}

      {node.note && (
        <div className="bridge-note">
          <div className="bridge-note-label">Bridge note</div>
          <div className="bridge-note-text">{node.note}</div>
        </div>
      )}

      {node.type === 'vocab' && onSave && (
        <button
          className={`save-word-button ${saved ? 'saved' : ''}`}
          disabled={saved}
          onClick={(e) => {
            e.stopPropagation()
            onSave()
          }}
        >
          {saved ? '✓ Saved' : '+ Save'}
        </button>
      )}

      {node.relatedGameId && onPractice && (
        <button
          className="explore-link-button"
          onClick={(e) => {
            e.stopPropagation()
            onPractice()
          }}
        >
          Practice this →
        </button>
      )}

      {showRefs && (
        <>
          {node.related.length > 0 && (
            <>
              <div className="refs-label">See also</div>
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
          {onDigDeeper && (
            <button className="dig-deeper-button" onClick={onDigDeeper} disabled={diggingDeeper}>
              {diggingDeeper ? 'Digging…' : '🔮 Dig deeper'}
            </button>
          )}
        </>
      )}
    </div>
  )
}
