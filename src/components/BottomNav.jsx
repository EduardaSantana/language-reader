const TABS = [
  { key: 'feed', icon: '📖', label: 'Feed' },
  { key: 'bookmarks', icon: '🔖', label: 'Bookmarks' },
  { key: 'explore', icon: '✦', label: 'Explore' },
  { key: 'games', icon: '🎮', label: 'Games' },
  { key: 'profile', icon: '👤', label: 'Profile' },
]

export default function BottomNav({ active, onChange, badges = {} }) {
  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          className={`bottom-nav-tab ${active === tab.key ? 'active' : ''}`}
          onClick={() => onChange(tab.key)}
          aria-label={tab.label}
          aria-pressed={active === tab.key}
        >
          <span className="bottom-nav-icon">
            {tab.icon}
            {badges[tab.key] > 0 && <span className="bottom-nav-badge">{badges[tab.key]}</span>}
          </span>
          <span className="bottom-nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
