import { langMeta } from '../lib/langs'

export default function BiteCard({ entry, cardRef, cardIndex, onPractice }) {
  const { avatar, label } = langMeta(entry.lang)
  return (
    <section className="story-card bite-card" ref={cardRef} data-card-index={cardIndex}>
      <div className="story-card-body bite-card-body">
        <div className="bite-card-title">{entry.title}</div>
        <p className="bite-card-explanation">{entry.explanation}</p>
        <div className="bite-card-example" lang={entry.lang}>
          {entry.example_native}
          <div className="bite-card-gloss">{entry.example_gloss}</div>
        </div>
        {entry.bridge_note && (
          <div className="bridge-note">
            <div className="bridge-note-label">
              Bridge note — {entry.bridge_lang === 'pt' ? 'Portuguese' : 'English'}
            </div>
            <div className="bridge-note-text">{entry.bridge_note}</div>
          </div>
        )}
        {entry.related_game_id && onPractice && (
          <button className="explore-link-button bite-practice-button" onClick={onPractice}>
            Practice this →
          </button>
        )}
      </div>

      <div className="language-badge">
        <span className="language-avatar">{avatar}</span>
        <span>{label}</span>
      </div>
    </section>
  )
}
