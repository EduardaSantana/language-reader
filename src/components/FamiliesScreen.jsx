import { useState } from 'react'
import familiesData from '../data/language_families.json'
import { EXPLORE_LANGS } from '../lib/exploreGraph'

// Self-contained sub-navigation (list → family → element/history → back),
// mirroring EncyclopediaScreen's own view-machine pattern but kept local
// since Families is a multi-level drill-down unlike every other single-level
// entry type unifiedEntries.js models. `onExit` is called only when Back is
// pressed at this screen's own root — every deeper level pops its own stack.
// `onOpenLanguageHub(lang)` jumps straight out to that language's Encyclopedia
// hub — only ever wired up for codes in EXPLORE_LANGS (the 4 shipped
// languages); every other code in this data (Portuguese, Swedish, Yiddish...)
// has nothing to jump to and stays inert text.
export default function FamiliesScreen({ onExit, onOpenLanguageHub }) {
  const [stack, setStack] = useState([{ type: 'list' }])
  const top = stack[stack.length - 1]

  function push(screen) {
    setStack((prev) => [...prev, screen])
  }
  function pop() {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev))
    if (stack.length === 1) onExit()
  }

  if (top.type === 'family') {
    const family = familiesData.families.find((f) => f.id === top.id)
    return (
      <FamilyDetail
        family={family}
        onBack={pop}
        onOpenElement={(key) => push({ type: 'element', familyId: family.id, key })}
        onOpenHistory={() => push({ type: 'history', familyId: family.id })}
        onOpenLanguageHub={onOpenLanguageHub}
      />
    )
  }
  if (top.type === 'element') {
    const family = familiesData.families.find((f) => f.id === top.familyId)
    const element = family.elements.find((e) => e.key === top.key)
    return <ElementDetail family={family} element={element} onBack={pop} />
  }
  if (top.type === 'history') {
    const family = familiesData.families.find((f) => f.id === top.familyId)
    return <FamilyHistory family={family} onBack={pop} onOpenLanguageHub={onOpenLanguageHub} />
  }
  if (top.type === 'japanese') {
    return <JapaneseIsolate onBack={pop} onOpenLanguageHub={onOpenLanguageHub} />
  }
  return (
    <FamiliesList
      families={familiesData.families}
      onOpenFamily={(id) => push({ type: 'family', id })}
      onOpenJapanese={() => push({ type: 'japanese' })}
      onBack={pop}
    />
  )
}

function FamiliesScreenHead({ title, onBack }) {
  return (
    <div className="encyclopedia-screen-head">
      <button className="encyclopedia-back" onClick={onBack} aria-label="Back">
        ‹
      </button>
      <span className="encyclopedia-screen-title">{title}</span>
    </div>
  )
}

function FamiliesList({ families, onOpenFamily, onOpenJapanese, onBack }) {
  return (
    <>
      <FamiliesScreenHead title="🌳 Families" onBack={onBack} />
      {families.map((f) => {
        const shown = f.members.slice(0, 4)
        const hiddenCount = f.members.length - shown.length
        return (
          <button key={f.id} className="family-row" onClick={() => onOpenFamily(f.id)}>
            <span className="family-row-body">
              <span className="family-row-title">{f.name}</span>
              <span className="family-row-subtitle">{f.subtitle}</span>
            </span>
            <span className="family-row-flags">
              {shown.map((m) => (
                <span key={m.code} className={m.active ? '' : 'family-row-flag-planned'}>
                  {m.flag}
                </span>
              ))}
              {hiddenCount > 0 && <span className="family-row-flag-more">+{hiddenCount}</span>}
            </span>
          </button>
        )
      })}
      <button className="family-row" onClick={onOpenJapanese}>
        <span className="family-row-body">
          <span className="family-row-title">🏝️ Japanese</span>
          <span className="family-row-subtitle">A language isolate — no known relatives</span>
        </span>
        <span className="family-row-flags">
          <span>🇯🇵</span>
        </span>
      </button>
    </>
  )
}

function JapaneseIsolate({ onBack, onOpenLanguageHub }) {
  return (
    <>
      <FamiliesScreenHead title="🏝️ Japanese" onBack={onBack} />
      <div className="entry-card entry-card-oddity">
        <div className="family-card-eyebrow">🏝️ a language isolate</div>
        <div className="family-card-text">{familiesData.japanese.note}</div>
      </div>
      <div className="section-label">Members</div>
      <div className="member-list">
        <MemberChip
          member={{ code: familiesData.japanese.code, flag: familiesData.japanese.flag, name: 'Japanese', tag: 'the only member', active: true }}
          onOpenLanguageHub={onOpenLanguageHub}
        />
      </div>
    </>
  )
}

function MemberChip({ member: m, onOpenLanguageHub }) {
  const clickable = onOpenLanguageHub && EXPLORE_LANGS.includes(m.code)
  const className = `member-chip ${m.active ? 'member-chip-active' : 'member-chip-planned'}`
  const content = (
    <>
      <span className="member-chip-flag">{m.flag}</span>
      <span className="member-chip-name">{m.name}</span>
      <span className="member-chip-tag">{clickable ? 'open →' : m.tag}</span>
    </>
  )
  if (clickable) {
    return (
      <button className={`${className} member-chip-clickable`} onClick={() => onOpenLanguageHub(m.code)}>
        {content}
      </button>
    )
  }
  return <div className={className}>{content}</div>
}

function FamilyDetail({ family, onBack, onOpenElement, onOpenHistory, onOpenLanguageHub }) {
  const groups = ['Grammar elements', 'Lexical elements', 'Appendix']
  return (
    <>
      <FamiliesScreenHead title={`🌳 ${family.name}`} onBack={onBack} />
      <div className="entry-card entry-card-oddity">
        <div className="family-card-eyebrow">{family.origin.eyebrow}</div>
        <div className="family-card-text" dangerouslySetInnerHTML={{ __html: family.origin.text }} />
      </div>
      {family.pattern && (
        <div className="entry-card entry-card-oddity" style={{ marginTop: 8 }}>
          <div className="family-card-eyebrow">{family.pattern.eyebrow}</div>
          <div className="family-card-text" dangerouslySetInnerHTML={{ __html: family.pattern.text }} />
        </div>
      )}
      <button className="unit-row" onClick={onOpenHistory}>
        <span className="unit-row-num">🕐</span>
        <span className="unit-row-title">History of the family</span>
        <span className="unit-row-count">›</span>
      </button>
      <div className="section-label">Members</div>
      <div className="member-list">
        {family.members.map((m) => (
          <MemberChip key={m.code} member={m} onOpenLanguageHub={onOpenLanguageHub} />
        ))}
      </div>
      {family.elements.length > 0 ? (
        groups.map((g) => {
          const els = family.elements.filter((e) => e.group === g)
          if (els.length === 0) return null
          return (
            <div key={g}>
              <div className="section-label">{g}</div>
              {els.map((e) => (
                <button key={e.key} className="unit-row" onClick={() => onOpenElement(e.key)}>
                  <span className="unit-row-num">{e.icon}</span>
                  <span className="unit-row-title">{e.title}</span>
                  <span className="unit-row-count">{family.members.length} langs</span>
                </button>
              ))}
            </div>
          )
        })
      ) : (
        <div className="placeholder-card">
          <div className="placeholder-card-icon">🚧</div>
          <b>No element comparisons drafted yet.</b>
          <br />
          {family.name} isn't sourced beyond its member list and history yet — when it is, expect the same
          Grammar/Lexical/Appendix structure Romance already has.
        </div>
      )}
    </>
  )
}

function FamilyHistory({ family, onBack, onOpenLanguageHub }) {
  return (
    <>
      <FamiliesScreenHead title="🕐 History" onBack={onBack} />
      <div className="family-crumb">{family.name} › History</div>
      <p style={{ fontSize: 13, lineHeight: 1.55, margin: '2px 0 12px' }}>{family.history.intro}</p>
      <div className="section-label">How the family split</div>
      <div className="hist-tree">
        <ul>
          <TreeNode node={family.history.tree} onOpenLanguageHub={onOpenLanguageHub} />
        </ul>
      </div>
      {family.history.treeNote && <div className="hist-tree-note">{family.history.treeNote}</div>}
      <div className="section-label">Timeline</div>
      {family.history.timeline.map((t, i) => (
        <div key={i} className="hist-item">
          <span className="hist-when">{t.when}</span>
          <span className="hist-text">{t.text}</span>
        </div>
      ))}
      <div className="confidence-note">
        first-pass — general linguistic history written from common knowledge, not checked against a single academic
        source; good for the big picture, not a citation.
      </div>
    </>
  )
}

function TreeNode({ node, onOpenLanguageHub }) {
  const clickable = !node.children && onOpenLanguageHub && node.code && EXPLORE_LANGS.includes(node.code)
  const label = (
    <>
      {node.flag ? `${node.flag} ` : ''}
      {node.label}
    </>
  )
  return (
    <li>
      {clickable ? (
        <button className="hist-tree-leaf hist-tree-leaf-clickable" onClick={() => onOpenLanguageHub(node.code)}>
          {label}
        </button>
      ) : (
        <span className={node.children ? 'hist-tree-root' : 'hist-tree-leaf'}>{label}</span>
      )}
      {node.children && (
        <ul>
          {node.children.map((child, i) => (
            <TreeNode key={i} node={child} onOpenLanguageHub={onOpenLanguageHub} />
          ))}
        </ul>
      )}
    </li>
  )
}

function CompareTable({ cols, items }) {
  return (
    <div className="wide-table-wrap">
      <table className="wide-table">
        <thead>
          <tr>
            <th></th>
            {cols.map((c) => (
              <th key={c.code}>
                {c.flag} {c.code.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.label}>
              <td className="wide-table-rowhead">{it.label}</td>
              {cols.map((c) => {
                const v = it.cells[c.code]
                return v && v !== '-' ? (
                  <td key={c.code}>{v}</td>
                ) : (
                  <td key={c.code} className="wide-table-missing">
                    &ndash;
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ElementDetail({ family, element, onBack }) {
  const cols = family.members.map((m) => ({ code: m.code, flag: m.flag }))
  return (
    <>
      <FamiliesScreenHead title={`${element.icon} ${element.title}`} onBack={onBack} />
      <div className="family-crumb">
        {family.name} › {element.group}
      </div>

      {element.kind === 'pattern-outlier' && (
        <>
          <div className="section-label">All {cols.length}, compared</div>
          <CompareTable cols={cols} items={element.items} />
          <OutlierCard outlier={element.outlier} />
        </>
      )}

      {element.kind === 'consensus' && (
        <>
          <div className="entry-card family-card-consensus">
            <div className="family-card-eyebrow">✓ all {cols.length} agree</div>
            <div className="family-card-text">{element.consensus.text}</div>
          </div>
          <div className="mistake-note">
            <b>Common mistake:</b> <span dangerouslySetInnerHTML={{ __html: element.mistake }} />
          </div>
          <div className="section-label">{element.diffLabel}</div>
          <CompareTable cols={cols} items={element.diffItems} />
        </>
      )}

      {element.kind === 'vocab-strip' && (
        <>
          <div className="insight-lead">{element.insightLead}</div>
          <div className="section-label">Instantly recognizable</div>
          <CompareTable cols={cols} items={element.items} />
        </>
      )}

      {element.kind === 'pattern-insight' && (
        <>
          <div className="section-label">Across the family</div>
          <CompareTable cols={cols} items={element.items} />
          <div className="entry-card entry-card-oddity">
            <div className="family-card-eyebrow">{element.insight.eyebrow}</div>
            <div className="family-card-text" dangerouslySetInnerHTML={{ __html: element.insight.text }} />
          </div>
        </>
      )}

      <div className="transfer-line">
        <span className="transfer-line-icon">↳</span>
        <span dangerouslySetInnerHTML={{ __html: element.transfer }} />
      </div>
      <div className="confidence-line">
        <span className="confidence-line-ok">✓ {cols[0].code.toUpperCase()} — sourced</span>
        <span className="confidence-line-un">
          • {cols
            .slice(1)
            .map((c) => c.code.toUpperCase())
            .join('/')}{' '}
          — first-pass
        </span>
      </div>
      <div className="confidence-note">
        first-pass = plausible but not native-checked — good for pattern-spotting, verify before you rely on exact
        forms.
      </div>
    </>
  )
}

function OutlierCard({ outlier }) {
  return (
    <div className="entry-card entry-card-oddity" style={{ marginTop: 8 }}>
      <div className="family-card-eyebrow">↳ the outlier</div>
      <div className="family-card-headline">
        <span style={{ marginRight: 6 }}>{outlier.flag}</span>
        {outlier.headline}
      </div>
      <div className="family-card-text" dangerouslySetInnerHTML={{ __html: outlier.text }} />
      {outlier.backref && <div className="family-card-backref">{outlier.backref}</div>}
    </div>
  )
}
