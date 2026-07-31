export default function JumpToStoryModal({ stories, onSelect, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Jump to story</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <ul className="story-list">
          {stories.map((story) => (
            <li key={story.idx}>
              <button className="story-list-item" onClick={() => onSelect(story.idx)}>
                <span className="story-list-title-ja">{story.titleNative}</span>
                <span className="story-list-title-en">{story.titleEn}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
