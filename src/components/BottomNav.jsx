// Phase 4 cutover (docs/ENCYCLOPEDIA_IMPLEMENTATION_PLAN.md): Encyclopedia is
// the landing tab; Bookmarks/Explore/Curriculum are retired from the nav bar
// (their functionality lives inside Encyclopedia now) but deliberately kept
// mounted-but-unreachable in App.jsx as a rollback safety net, not deleted.
const TABS = [
  { key: 'encyclopedia', icon: '📚', label: 'Encyclopedia' },
  { key: 'feed', icon: '📖', label: 'Read' },
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
