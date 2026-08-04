import { useEffect, useMemo, useRef, useState } from 'react'
import { buildUnifiedEntries, kanjiNodeId, vocabEntryId } from '../lib/unifiedEntries'
import { EXPLORE_LANGS, grammarNodeId, grammarPointsForLang } from '../lib/exploreGraph'
import { buildCurriculum } from '../lib/explorePaths'
import { buildDictionary, sortDictionary, buildLetterIndex } from '../lib/vocabIndex'
import { addSavedWord, isWordSaved, getReadStories } from '../lib/storage'
import { GAMES_REQUIRING_READ_STORY } from '../lib/games'
import { langFlag, langMeta } from '../lib/langs'
import kanjiComponents from '../data/kanji_components.json'
import FamiliesScreen from './FamiliesScreen'

const KANJI_LEVELS = ['All', 'N5', 'N4', 'Not Sorted']

// Real named authorities per language's curriculum research (matched against
// docs/sources_audit_{lang}.md and each docs/{lang}_curriculum.md's own
// citations) — shown so "Sources" points at Genki/Wade/Eaquals/etc., not at
// an internal file path. `source_doc` still exists for real traceability,
// it's just not the thing surfaced to a reader as "the source" anymore.
const PRIMARY_REFERENCES = {
  fr: 'Eaquals/CIEP Inventaire linguistique des contenus clés des niveaux du CECRL; Kwiziq CEFR grammar tagging',
  de: 'Goethe-Institut/ÖSD "Zertifikat B1" inventory; Profile Deutsch; Durrell, Hammer’s German Grammar and Usage',
  ru: 'Russian State Standard for TORFL/ТРКИ; Terence Wade, A Comprehensive Russian Grammar (4th ed., Wiley-Blackwell)',
  ja: 'Japan Foundation JLPT level specifications; Genki I/II; Tobira; Makino & Tsutsui grammar dictionaries',
}

function posLabel(entry) {
  if (entry.type === 'grammar') return 'grammar point'
  if (entry.type === 'oddity') return '✨ oddity'
  if (entry.type === 'comparative') return null
  if (entry.type === 'kanji') return `kanji · ${entry.kanji?.level ?? '?'}`
  if (entry.type === 'alphabet') return entry.alphabet?.system === 'kana' ? 'kana' : 'letter'
  return entry._raw?.pos ?? null
}

export default function EncyclopediaScreen({ stories, onOpenGame, onOpenStory, onSavedWordsChange, wordSeed, nodeSeed }) {
  const unified = useMemo(() => buildUnifiedEntries(stories), [stories])
  const [view, setView] = useState('home')
  const [hubLang, setHubLang] = useState(null)
  const [listType, setListType] = useState(null)
  const [openBranch, setOpenBranch] = useState(null)
  const [kanjiLevel, setKanjiLevel] = useState('All')
  const [trail, setTrail] = useState([])
  const [currentId, setCurrentId] = useState(null)
  const [query, setQuery] = useState('')
  const [openSection, setOpenSection] = useState({ why: true, sources: false, related: false, mistake: false })
  const [savedTick, setSavedTick] = useState(0)

  const readStoriesByLang = useMemo(() => {
    const readIndices = getReadStories()
    const byLang = new Set()
    for (const s of stories) if (readIndices.has(s.idx)) byLang.add(s.lang)
    return byLang
  }, [stories])

  // Cross-screen navigation seeds (same pattern as every other screen in
  // App.jsx: a fresh object each time so a repeat tap on the same word/node
  // still retriggers the effect). Now the destination for what used to route
  // to Explore — Curriculum, Bookmarks, Read's teach-chips, and the global
  // SurpriseMeOverlay all still call the same App.jsx functions, just aimed
  // here since Phase 4's nav cutover.
  useEffect(() => {
    if (!nodeSeed) return
    openEntry(nodeSeed.id, { fresh: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeSeed])

  useEffect(() => {
    if (!wordSeed) return
    openEntry(vocabEntryId(wordSeed.lang, wordSeed.word), { fresh: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordSeed])

  // Every screen here shares the window's scroll (`.screen` has no overflow
  // of its own) — without this, navigating into a new view/entry (most
  // visibly: opening the long-form reading screen from partway down a long
  // entry) kept whatever scroll offset the previous view was at instead of
  // starting at the top of the new content.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [view, currentId])

  const searchIndex = useMemo(() => {
    if (!query.trim()) return []
    const q = query.trim().toLowerCase()
    const results = []
    for (const id of unified.allIds) {
      const e = unified.getEntry(id)
      if (!e) continue
      if (e.title.toLowerCase().includes(q) || e.definition?.toLowerCase().includes(q)) {
        results.push(e)
        if (results.length >= 30) break
      }
    }
    return results
  }, [query, unified])

  function goHome() {
    setView('home')
    setHubLang(null)
    setListType(null)
    setTrail([])
    setQuery('')
  }

  function openHub(lang) {
    setHubLang(lang)
    setView('hub')
    setOpenBranch(null)
  }

  function openList(lang, type) {
    setHubLang(lang)
    setListType(type)
    setOpenBranch(null)
    setView('list')
  }

  function openEntry(id, { fresh = false } = {}) {
    const entry = unified.getEntry(id)
    if (!entry) return
    setTrail((prev) => (fresh ? [] : [...prev, entry]))
    setCurrentId(id)
    setView('entry')
    setOpenSection({ why: true, sources: false, related: false, mistake: false })
  }

  function goBack() {
    if (view === 'entry' && trail.length > 1) {
      const next = trail.slice(0, -1)
      setTrail(next)
      setCurrentId(next[next.length - 1].id)
      return
    }
    if (view === 'entry') {
      const next = listType ? 'list' : hubLang ? 'hub' : 'home'
      setView(next)
      setTrail([])
      // Falling back to home (e.g. an entry opened straight from a search
      // result) must also clear the query — otherwise `view === 'home'`
      // silently keeps rendering stale search results instead of the hub grid.
      if (next === 'home') setQuery('')
      return
    }
    if (view === 'list') {
      // Comparative is opened directly from home (no language hub involved —
      // hubLang stays null), so it must return to home, not a hub with
      // nothing to show.
      setView(hubLang ? 'hub' : 'home')
      return
    }
    if (view === 'families') {
      // FamiliesScreen owns its own internal back-stack (list → family →
      // element/history) and only calls this when Back is pressed at its
      // own root, same as Comparative — no hubLang involved either.
      goHome()
      return
    }
    if (view === 'hub') {
      goHome()
    }
  }

  function toggleSection(key) {
    setOpenSection((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function canPractice(entry) {
    const gameId = entry._raw?.relatedGameId
    if (!gameId) return false
    if (GAMES_REQUIRING_READ_STORY.has(gameId)) return readStoriesByLang.has(entry.lang)
    return true
  }

  function handleSaveWord(entry) {
    if (entry.type !== 'vocab' || !entry._raw?.vocabEntry) return
    addSavedWord({
      word: entry._raw.vocabEntry.word,
      reading: entry._raw.vocabEntry.reading,
      gender: entry._raw.vocabEntry.gender,
      english: entry._raw.vocabEntry.english,
      lang: entry.lang,
      storyIndex: entry._raw.vocabEntry.storyIndex,
    })
    setSavedTick((t) => t + 1)
    onSavedWordsChange?.()
  }

  const currentEntry = currentId ? unified.getEntry(currentId) : null

  return (
    <div className="screen encyclopedia-screen">
      {view === 'home' && (
        <>
          <h1>Encyclopedia</h1>
          <div className="search-bar-wrap" style={{ marginBottom: 14 }}>
            <input
              className="dictionary-search"
              placeholder="Search grammar, words, kanji…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {query.trim() ? (
            <div>
              {searchIndex.length === 0 && <p className="path-empty">No matches yet.</p>}
              {searchIndex.map((e) => (
                <button key={e.id} className="result-row" onClick={() => openEntry(e.id, { fresh: true })}>
                  <span
                    className="result-icon"
                    style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text)' }}
                  >
                    {e.type === 'kanji' ? '字' : e.type === 'oddity' ? '✨' : e.type === 'comparative' ? '🌐' : e.type === 'alphabet' ? 'あ' : e.type === 'grammar' ? '🎓' : '📗'}
                  </span>
                  <span>
                    <div className="result-title">{e.title}</div>
                    <div className="result-subtitle">
                      {langMeta(e.lang).label} · {posLabel(e)}
                    </div>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <>
              {trail.length > 0 && (
                <>
                  <div className="section-label">Continue where you left off</div>
                  <div className="trail" style={{ marginBottom: 18 }}>
                    {trail.map((t, i) => (
                      <span key={t.id}>
                        <button
                          className={`trail-item ${i === trail.length - 1 ? 'current' : ''}`}
                          onClick={() => openEntry(t.id)}
                        >
                          {t.title}
                        </button>
                        {i < trail.length - 1 && <span className="trail-sep">›</span>}
                      </span>
                    ))}
                  </div>
                </>
              )}
              <div className="section-label">Browse by language</div>
              <div className="hub-grid">
                {EXPLORE_LANGS.map((lang) => {
                  const meta = langMeta(lang)
                  return (
                    <button key={lang} className="hub-card" onClick={() => openHub(lang)}>
                      <span className="hub-card-icon">{langFlag(lang)}</span>
                      <span className="hub-card-title">{meta.label}</span>
                      <span className="hub-card-count">{unified.listByLang(lang, 'grammar').length} grammar pts</span>
                    </button>
                  )
                })}
                <button
                  className="hub-card hub-card-wide"
                  onClick={() => openList(null, 'comparative')}
                >
                  <span>
                    <span className="hub-card-icon">🌐</span> <span className="hub-card-title">Compared</span>
                  </span>
                  <span className="hub-card-count">cross-language concepts →</span>
                </button>
                <button className="hub-card hub-card-wide" onClick={() => setView('families')}>
                  <span>
                    <span className="hub-card-icon">🌳</span> <span className="hub-card-title">Families</span>
                  </span>
                  <span className="hub-card-count">grouped by ancestry →</span>
                </button>
              </div>
            </>
          )}
        </>
      )}

      {view === 'families' && <FamiliesScreen onExit={goBack} />}

      {view === 'hub' && hubLang && (
        <>
          <div className="encyclopedia-screen-head">
            <button className="encyclopedia-back" onClick={goBack} aria-label="Back">
              ‹
            </button>
            <span className="encyclopedia-screen-title">
              {langFlag(hubLang)} {langMeta(hubLang).label}
            </span>
          </div>
          <div className="hub-grid">
            <button className="hub-card" onClick={() => openList(hubLang, 'grammar')}>
              <span className="hub-card-icon">🎓</span>
              <span className="hub-card-title">Curriculum</span>
              <span className="hub-card-count">{unified.listByLang(hubLang, 'grammar').length} points</span>
            </button>
            <button className="hub-card" onClick={() => openList(hubLang, 'dictionary')}>
              <span className="hub-card-icon">📗</span>
              <span className="hub-card-title">Dictionary</span>
              <span className="hub-card-count">from every story</span>
            </button>
            {(hubLang === 'ru' || hubLang === 'ja') && (
              <button className="hub-card" onClick={() => openList(hubLang, 'alphabet')}>
                <span className="hub-card-icon">{hubLang === 'ja' ? 'あ' : 'АБ'}</span>
                <span className="hub-card-title">{hubLang === 'ja' ? 'Kana' : 'Alphabet'}</span>
                <span className="hub-card-count">{unified.listByLang(hubLang, 'alphabet').length} characters</span>
              </button>
            )}
            {hubLang === 'ja' && (
              <button className="hub-card" onClick={() => openList(hubLang, 'kanji')}>
                <span className="hub-card-icon">字</span>
                <span className="hub-card-title">Kanji</span>
                <span className="hub-card-count">{kanjiComponents.length} characters</span>
              </button>
            )}
            <button className="hub-card" onClick={() => openList(hubLang, 'oddity')}>
              <span className="hub-card-icon">✨</span>
              <span className="hub-card-title">Oddities</span>
              <span className="hub-card-count">{unified.listByLang(hubLang, 'oddity').length} found so far</span>
            </button>
          </div>
        </>
      )}

      {view === 'list' && listType === 'grammar' && hubLang && (
        <GrammarList
          lang={hubLang}
          onBack={goBack}
          openBranch={openBranch}
          setOpenBranch={setOpenBranch}
          onOpenEntry={(id) => openEntry(id, { fresh: true })}
        />
      )}

      {view === 'list' && listType === 'dictionary' && hubLang && (
        <DictionaryList lang={hubLang} stories={stories} onBack={goBack} onOpenEntry={(id) => openEntry(id, { fresh: true })} />
      )}

      {view === 'list' && listType === 'alphabet' && hubLang && (
        <AlphabetList
          lang={hubLang}
          entries={unified.listByLang(hubLang, 'alphabet')}
          onBack={goBack}
          onOpenEntry={(id) => openEntry(id, { fresh: true })}
        />
      )}

      {view === 'list' && listType === 'kanji' && hubLang && (
        <KanjiList
          level={kanjiLevel}
          setLevel={setKanjiLevel}
          onBack={goBack}
          onOpenEntry={(id) => openEntry(id, { fresh: true })}
        />
      )}

      {view === 'list' && listType === 'oddity' && hubLang && (
        <OddityList
          lang={hubLang}
          entries={unified.listByLang(hubLang, 'oddity')}
          onBack={goBack}
          onOpenEntry={(id) => openEntry(id, { fresh: true })}
        />
      )}

      {view === 'list' && listType === 'comparative' && (
        <ComparativeList
          entries={unified.listByLang('all', 'comparative')}
          onBack={goBack}
          onOpenEntry={(id) => openEntry(id, { fresh: true })}
        />
      )}

      {view === 'entry' && currentEntry && (
        <EntryDetail
          entry={currentEntry}
          trail={trail}
          onBack={goBack}
          onNavigate={openEntry}
          openSection={openSection}
          onToggleSection={toggleSection}
          onSave={() => handleSaveWord(currentEntry)}
          saved={currentEntry.type === 'vocab' ? isWordSaved(currentEntry.lang, currentEntry.title) : false}
          savedTick={savedTick}
          canPractice={canPractice(currentEntry)}
          onPractice={() => onOpenGame?.(currentEntry._raw?.relatedGameId, null, currentEntry.lang)}
          onReadInStory={
            currentEntry._raw?.storyContext ? () => onOpenStory?.(currentEntry._raw.storyContext.storyIndex) : null
          }
          onReadLongForm={currentEntry.longForm ? () => setView('reading') : null}
        />
      )}

      {view === 'reading' && currentEntry?.longForm && (
        <LongFormReading entry={currentEntry} onBack={() => setView('entry')} />
      )}
    </div>
  )
}

function ScreenHead({ title, onBack }) {
  return (
    <div className="encyclopedia-screen-head">
      <button className="encyclopedia-back" onClick={onBack} aria-label="Back">
        ‹
      </button>
      <span className="encyclopedia-screen-title">{title}</span>
    </div>
  )
}

// Rebuilt per docs/ENCYCLOPEDIA_MOCKUP.html frames 03/04 (2026-08-04): the
// mockup is two separate screens (a unit list, then tapping a unit opens a
// distinct lesson list) — this was previously a single-screen accordion,
// which is not what the artifact specifies. `openBranch` now means "which
// unit's dedicated lesson-list screen is showing" (null = unit list).
function GrammarList({ lang, onBack, openBranch, setOpenBranch, onOpenEntry }) {
  const units = useMemo(() => buildCurriculum(grammarPointsForLang(lang)), [lang])
  const unitIndex = units.findIndex((u) => u.branch === openBranch)
  const unit = unitIndex >= 0 ? units[unitIndex] : null

  if (unit) {
    return (
      <>
        <ScreenHead
          title={`${String(unitIndex + 1).padStart(2, '0')} · ${unit.branch}`}
          onBack={() => setOpenBranch(null)}
        />
        {unit.points.map((p) => (
          <button key={p.id} className="lesson-row" onClick={() => onOpenEntry(grammarNodeId(lang, p.id))}>
            <span className={`lesson-row-dot ${p.confidence !== 'verified' ? 'todo' : ''}`} />
            <span className="lesson-row-title">{p.title}</span>
            {p.cefr && <span className="lesson-row-meta">{p.cefr}</span>}
          </button>
        ))}
      </>
    )
  }

  return (
    <>
      <ScreenHead title={`🎓 ${langMeta(lang).label} Curriculum`} onBack={onBack} />
      {units.map((u, i) => (
        <button key={u.branch} className="unit-row" onClick={() => setOpenBranch(u.branch)}>
          <span className="unit-row-num">{String(i + 1).padStart(2, '0')}</span>
          <span className="unit-row-title">{u.branch}</span>
          <span className="unit-row-count">
            {u.points.length} pt{u.points.length === 1 ? '' : 's'}
          </span>
        </button>
      ))}
    </>
  )
}

// Rebuilt per docs/ENCYCLOPEDIA_MOCKUP.html's `.dict-layout` (2026-08-04) —
// was a flat list with no way to jump to a letter. `entryLetterLabel`/
// `buildLetterIndex` already existed in lib/vocabIndex.js for exactly this
// (Bookmarks' original Dictionary tab uses them) but were sitting unused
// here.
function DictionaryList({ lang, stories, onBack, onOpenEntry }) {
  const words = useMemo(
    () => sortDictionary(buildDictionary(stories.filter((s) => s.lang === lang))),
    [stories, lang],
  )
  const letterIndex = useMemo(() => buildLetterIndex(words), [words])
  const rowRefs = useRef([])
  const [activeLetter, setActiveLetter] = useState(null)

  function jumpToLetter(entry) {
    rowRefs.current[entry.firstIndex]?.scrollIntoView({ block: 'start' })
    setActiveLetter(entry.label)
  }

  return (
    <>
      <ScreenHead title={`📗 ${langMeta(lang).label} Dictionary`} onBack={onBack} />
      <div className="dict-layout">
        <div className="dict-list">
          {words.map((w, i) => (
            <button
              key={w.word}
              ref={(el) => (rowRefs.current[i] = el)}
              className="dict-row"
              onClick={() => onOpenEntry(`${lang}:vocab:${w.word}`)}
              style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer' }}
            >
              <span>
                <span className="dict-row-word">
                  {w.word} {(w.reading || w.gender) && <span className="dict-row-annot">({w.reading || w.gender})</span>}
                </span>
                <div className="dict-row-gloss">{w.english}</div>
              </span>
            </button>
          ))}
        </div>
        <div className="dict-jump">
          {letterIndex.map((entry) => (
            <span
              key={entry.label}
              role="button"
              tabIndex={0}
              className={activeLetter === entry.label ? 'on' : ''}
              onClick={() => jumpToLetter(entry)}
            >
              {entry.label}
            </span>
          ))}
        </div>
      </div>
    </>
  )
}

// Redone per docs/ENCYCLOPEDIA_MOCKUP.html frames 07/07b (2026-08-04): the
// Hiragana/Katakana toggle was sketched in the original mockup but never
// actually wired up (the grid always showed hiragana) — it's real now.
// Cyrillic shows the upper/lower pair per cell instead of uppercase-only,
// since recognizing both cases is the actual point of an alphabet reference.
// Kana grouped by gojūon row (docs/ENCYCLOPEDIA_MOCKUP.html frames 07,
// redone again 2026-08-04): kana_ja.json is already in correct gojūon
// order (a/k/s/t/n/h/m/y/r/w rows, then dakuten g/z/d/b rows, then
// handakuten p-row) — the "mess" was purely presentational: one continuous
// 5-column grid let short rows (や/ゆ/よ has 3, わ/を has 2) bleed into the
// next row's cells, misaligning everything after them. Grouping by row (the
// way every real gojūon chart does it) fixes that, and a label separates
// the base 46 from the 25 dakuten/handakuten sounds.
function groupKanaByRow(entries) {
  const groups = []
  let current = null
  for (const e of entries) {
    const row = e.alphabet.row
    if (!current || current.row !== row) {
      current = { row, kind: e.alphabet.kind, entries: [] }
      groups.push(current)
    }
    current.entries.push(e)
  }
  return groups
}

function AlphabetList({ lang, entries, onBack, onOpenEntry }) {
  const [kanaScript, setKanaScript] = useState('hiragana')
  const kanaGroups = useMemo(() => (lang === 'ja' ? groupKanaByRow(entries) : null), [lang, entries])

  function kanaCell(e) {
    return (
      <button key={e.id} className="char-cell" onClick={() => onOpenEntry(e.id)}>
        <div className="char-cell-big">{kanaScript === 'katakana' ? e.alphabet.katakana : e.title}</div>
        <div className="char-cell-small">{e.reading}</div>
      </button>
    )
  }

  return (
    <>
      <ScreenHead title={lang === 'ja' ? 'あ Kana' : 'АБ Alphabet'} onBack={onBack} />
      {lang === 'ja' && (
        <div className="pill-row">
          <button className={`pill ${kanaScript === 'hiragana' ? 'current' : ''}`} onClick={() => setKanaScript('hiragana')}>
            Hiragana
          </button>
          <button className={`pill ${kanaScript === 'katakana' ? 'current' : ''}`} onClick={() => setKanaScript('katakana')}>
            Katakana
          </button>
        </div>
      )}
      {lang === 'ja' ? (
        kanaGroups.map((group, i) => {
          const prevKind = i > 0 ? kanaGroups[i - 1].kind : null
          return (
            <div key={group.row}>
              {group.kind !== prevKind && (
                <div className="section-label">
                  {group.kind === 'dakuten' ? 'Dakuten (゛)' : group.kind === 'handakuten' ? 'Handakuten (゜)' : 'Base sounds'}
                </div>
              )}
              <div className="char-grid">{group.entries.map(kanaCell)}</div>
            </div>
          )
        })
      ) : (
        <div className="char-grid">
          {entries.map((e) => (
            <button key={e.id} className="char-cell" onClick={() => onOpenEntry(e.id)}>
              <div className="char-cell-big">{`${e.title}${e.alphabet.lower}`}</div>
              <div className="char-cell-small">{e.reading}</div>
            </button>
          ))}
        </div>
      )}
    </>
  )
}

// Redone per docs/ENCYCLOPEDIA_MOCKUP.html frame 08 (2026-08-04): reuses the
// same char-grid/char-cell pattern as Kana/Cyrillic above instead of a
// bespoke bare 6-column grid, so the three reference screens read as one
// family instead of three different designs.
function KanjiList({ level, setLevel, onBack, onOpenEntry }) {
  const filtered = useMemo(
    () => (level === 'All' ? kanjiComponents : kanjiComponents.filter((k) => k.level === level)),
    [level],
  )
  return (
    <>
      <ScreenHead title="字 Kanji" onBack={onBack} />
      <div className="pill-row">
        {KANJI_LEVELS.map((l) => (
          <button key={l} className={`pill ${level === l ? 'current' : ''}`} onClick={() => setLevel(l)}>
            {l}
          </button>
        ))}
      </div>
      <div className="char-grid">
        {filtered.map((k) => (
          <button key={k.kanji} className="char-cell" onClick={() => onOpenEntry(kanjiNodeId(k.kanji))}>
            <div className="char-cell-big">{k.kanji}</div>
            <div className="char-cell-small">{k.level}</div>
          </button>
        ))}
      </div>
    </>
  )
}

function OddityList({ lang, entries, onBack, onOpenEntry }) {
  return (
    <>
      <ScreenHead title={`✨ ${langMeta(lang).label} Oddities`} onBack={onBack} />
      {entries.map((e) => (
        <div key={e.id} className="entry-card entry-card-oddity entry-card-clickable" onClick={() => onOpenEntry(e.id)}>
          <div className="entry-headword">{e.title}</div>
          {e.definition && <p className="entry-definition">{e.definition}</p>}
        </div>
      ))}
    </>
  )
}

function ComparativeList({ entries, onBack, onOpenEntry }) {
  return (
    <>
      <ScreenHead title="🌐 Compared" onBack={onBack} />
      {entries.map((e) => (
        <div key={e.id} className="entry-card entry-card-oddity entry-card-clickable" onClick={() => onOpenEntry(e.id)}>
          <div className="entry-eyebrow">
            <span className="lang-tag lang-tag-comparative">🌐 compared</span>
          </div>
          <div className="entry-headword">{e.title}</div>
          {e.definition && <p className="entry-definition">{e.definition}</p>}
        </div>
      ))}
    </>
  )
}

// Phase 5 (docs/ENCYCLOPEDIA_IMPLEMENTATION_PLAN.md): a horizontal-scroll
// wide table rather than stacked per-language cards — built to scale past 4
// columns for the Romance-language expansion the sources-audit conversation
// is feeding into (PT/ES/IT/RO), where a vertical stack of 6+ language cards
// would be a lot of scrolling to compare one concept. Row labels reflect the
// real oddities_comparative.json shape (native/gloss/note per language) —
// not the generic "form/verbal?" example rows from the design mockup, which
// assumed shorter, more structured cell content than full sentences.
function ComparativeTable({ entries }) {
  const hasNotes = entries.some((e) => e.note)
  return (
    <div className="wide-table-wrap">
      <table className="wide-table">
        <thead>
          <tr>
            <th></th>
            {entries.map((e) => (
              <th key={e.lang}>
                {langFlag(e.lang)} {e.lang.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="wide-table-rowhead">Example</td>
            {entries.map((e) => (
              <td key={e.lang} lang={e.lang}>
                {e.native}
              </td>
            ))}
          </tr>
          <tr>
            <td className="wide-table-rowhead">Meaning</td>
            {entries.map((e) => (
              <td key={e.lang}>{e.gloss}</td>
            ))}
          </tr>
          {hasNotes && (
            <tr>
              <td className="wide-table-rowhead">Note</td>
              {entries.map((e) => (
                <td key={e.lang}>{e.note ?? '—'}</td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// Phase 5, built for real 2026-08-04 (docs/ENCYCLOPEDIA_MOCKUP.html frame
// 17): a dedicated full-screen essay view for the `long_form` field the
// language-expert agents write, not another disclosure section bolted onto
// the entry card. Structure matches the mockup exactly — eyebrow, serif
// heading, drop-cap first paragraph, a bordered citation block, remaining
// paragraphs. The mockup itself has no back button (it omits utility chrome
// throughout), but real navigation needs one, so a minimal one is added.
function LongFormReading({ entry, onBack }) {
  const paragraphs = entry.longForm.split('\n\n').filter(Boolean)
  const citation = entry.examples[0]
  return (
    <>
      <div className="encyclopedia-screen-head">
        <button className="encyclopedia-back" onClick={onBack} aria-label="Back">
          ‹
        </button>
      </div>
      <div className="reading-mode-screen">
        <div className="reading-mode-eyebrow">
          {langFlag(entry.lang)} {langMeta(entry.lang).label}
          {entry.branch ? ` · ${entry.branch}` : ''}
        </div>
        <h3 className="reading-mode-heading">{entry.title}</h3>
        {paragraphs.map((para, i) => (
          <div key={i}>
            <p className={`reading-mode-text ${i === 0 ? 'reading-mode-lede' : ''}`}>{para}</p>
            {i === 0 && citation && (
              <div className="reading-mode-cite">
                {citation.native}
                {citation.gloss && (
                  <>
                    <br />— {citation.gloss}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

function EntryDetail({
  entry,
  trail,
  onBack,
  onNavigate,
  openSection,
  onToggleSection,
  onSave,
  saved,
  canPractice,
  onPractice,
  onReadInStory,
  onReadLongForm,
}) {
  const meta = langMeta(entry.lang)
  const hasDepth = entry.depth.why || entry.depth.mistake || entry.depth.sources.length > 0 || entry.source_doc
  const hasRelations =
    entry.relations.prerequisites.length > 0 ||
    entry.relations.prerequisiteOf.length > 0 ||
    entry.relations.seeAlso.length > 0
  const backlinks = [
    ...entry.relations.appearsIn.stories.map((s) => ({ label: `📖 ${s.titleEn}`, kind: 'story', ref: s })),
    ...entry.relations.appearsIn.oddities.map((o) => ({ label: `✨ ${o.title}`, kind: 'entry', ref: o })),
    ...(entry.relations.appearsIn.games.length ? [{ label: '🎮 practice', kind: 'game' }] : []),
  ]

  return (
    <>
      <div className="encyclopedia-screen-head">
        <button className="encyclopedia-back" onClick={onBack} aria-label="Back">
          ‹
        </button>
      </div>
      {trail.length > 1 && (
        <div className="trail">
          {trail.map((t, i) => (
            <span key={t.id}>
              <span className={`trail-item ${i === trail.length - 1 ? 'current' : ''}`}>{t.title}</span>
              {i < trail.length - 1 && <span className="trail-sep">›</span>}
            </span>
          ))}
        </div>
      )}

      <div className="entry-card">
        <div className="entry-eyebrow">
          <span className={`lang-tag lang-tag-${entry.lang === 'all' ? 'comparative' : entry.lang}`}>
            {entry.lang === 'all' ? '🌐 compared' : `${langFlag(entry.lang)} ${meta.label}`}
          </span>
          {posLabel(entry) && <span className="entry-pos">{posLabel(entry)}</span>}
          {entry.confidence === 'verified' && <span className="verified-badge">✓ verified</span>}
        </div>

        {entry.type === 'alphabet' ? (
          // Right-sized for a single letter (docs/ENCYCLOPEDIA_MOCKUP.html
          // frame 07c, redone 2026-08-04) — was reusing the generic
          // entry-headword + the long-form drop-cap treatment, which made a
          // single-character "definition" (a letter's *name*, e.g. "a")
          // render as one giant oversized cursive letter. Shows the upper/
          // lower (or hiragana/katakana) pair, the name, and the
          // romanization in one compact card instead.
          <div className="alpha-hero">
            <div className="alpha-hero-pair">
              {entry.alphabet.system === 'kana'
                ? `${entry.title}${entry.alphabet.katakana}`
                : `${entry.title}${entry.alphabet.lower}`}
            </div>
            <div>
              {entry.definition && <div className="alpha-hero-name">{entry.definition}</div>}
              {entry.reading && <div className="alpha-hero-rom">{entry.reading}</div>}
            </div>
          </div>
        ) : (
          <>
            <div className="entry-headword">{entry.title}</div>
            {entry.reading && <div className="entry-reading">{entry.reading}</div>}
            {entry.gender && <div className="entry-reading">{entry.gender}</div>}
            {entry.definition && (
              <p className="entry-definition reading-mode-text reading-mode-lede">{entry.definition}</p>
            )}
          </>
        )}

        {entry.type === 'kanji' && (
          <>
            <div className="comp-row">
              {entry.kanji.components.map((c) => (
                <span key={c} className="comp-chip" title={entry.kanji.componentMeanings[c] ?? undefined}>
                  {c}
                </span>
              ))}
            </div>
            {entry.kanji.onyomi && (
              <div className="reading-block">
                <div className="reading-block-label">On&apos;yomi</div>
                <div className="reading-block-value">{entry.kanji.onyomi}</div>
                {entry.kanji.onExample && (
                  <div className="reading-block-example">
                    {entry.kanji.onExample.word} ({entry.kanji.onExample.reading}) — {entry.kanji.onExample.meaning}
                  </div>
                )}
              </div>
            )}
            {entry.kanji.kunyomi && (
              <div className="reading-block">
                <div className="reading-block-label">Kun&apos;yomi</div>
                <div className="reading-block-value">{entry.kanji.kunyomi}</div>
                {entry.kanji.kunExample && (
                  <div className="reading-block-example">
                    {entry.kanji.kunExample.word} ({entry.kanji.kunExample.reading}) — {entry.kanji.kunExample.meaning}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {entry.type === 'comparative' && <ComparativeTable entries={entry._raw.entries} />}

        {entry.examples.map((ex, i) => (
          <div className="citation" key={i}>
            <div className="citation-native" lang={entry.lang}>
              {ex.native}
            </div>
            {ex.gloss && <div className="citation-gloss">{ex.gloss}</div>}
          </div>
        ))}

        {hasDepth && (
          <div className="disclosure">
            {entry.depth.why && (
              <>
                <button className={`disclosure-row ${openSection.why ? 'open' : ''}`} onClick={() => onToggleSection('why')}>
                  <span className="disclosure-caret">{openSection.why ? '▾' : '▸'}</span> Why this happens
                </button>
                {openSection.why && (
                  <div className="disclosure-body reading-mode-text">{entry.depth.why}</div>
                )}
              </>
            )}
            {entry.depth.mistake && (
              <>
                <button
                  className={`disclosure-row ${openSection.mistake ? 'open' : ''}`}
                  onClick={() => onToggleSection('mistake')}
                >
                  <span className="disclosure-caret">{openSection.mistake ? '▾' : '▸'}</span> Common mistake
                </button>
                {openSection.mistake && <div className="disclosure-body">{entry.depth.mistake}</div>}
              </>
            )}
            {(entry.depth.sources.length > 0 || entry.source_doc) && (
              <>
                <button
                  className={`disclosure-row ${openSection.sources ? 'open' : ''}`}
                  onClick={() => onToggleSection('sources')}
                >
                  <span className="disclosure-caret">{openSection.sources ? '▾' : '▸'}</span> Sources
                </button>
                {openSection.sources && (
                  <>
                    {entry.depth.sources.map((s, i) => (
                      <div className="disclosure-body" key={i}>
                        <span className="disclosure-body-source">{s.label}</span>
                        {s.confidence && ` — ${s.confidence.replace('_', ' ')}`}
                      </div>
                    ))}
                    {entry.source_doc && PRIMARY_REFERENCES[entry.lang] && (
                      <div className="disclosure-body">
                        <span className="disclosure-body-source">Primary references for this unit:</span>{' '}
                        {PRIMARY_REFERENCES[entry.lang]}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {hasRelations && (
          <div className="disclosure">
            <button
              className={`disclosure-row ${openSection.related ? 'open' : ''}`}
              onClick={() => onToggleSection('related')}
            >
              <span className="disclosure-caret">{openSection.related ? '▾' : '▸'}</span> Connections
            </button>
            {openSection.related && (
              <>
                {entry.relations.prerequisites.length > 0 && (
                  <>
                    <div className="refs-label">Builds on</div>
                    <div className="refs-list">
                      {entry.relations.prerequisites.map((r) => (
                        <button key={r.id} className="ref-button" onClick={() => onNavigate(r.id)}>
                          <span className={`ref-mark lang-tag-${r.lang}`}>{langMeta(r.lang).avatar}</span>
                          <span className="ref-word">{r.title}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {entry.relations.prerequisiteOf.length > 0 && (
                  <>
                    <div className="refs-label">Unlocks</div>
                    <div className="refs-list">
                      {entry.relations.prerequisiteOf.map((r) => (
                        <button key={r.id} className="ref-button" onClick={() => onNavigate(r.id)}>
                          <span className={`ref-mark lang-tag-${r.lang}`}>{langMeta(r.lang).avatar}</span>
                          <span className="ref-word">{r.title}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {entry.relations.seeAlso.length > 0 && (
                  <>
                    <div className="refs-label">See also</div>
                    <div className="refs-list">
                      {entry.relations.seeAlso.map((r) => (
                        <button key={r.id} className="ref-button" onClick={() => onNavigate(r.id)}>
                          <span className={`ref-mark lang-tag-${r.lang}`}>{langMeta(r.lang).avatar}</span>
                          <span className="ref-word">{r.title}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {backlinks.length > 0 && (
          <div className="backlinks">
            {backlinks.map((b, i) =>
              b.kind === 'entry' ? (
                <button key={i} className="backlink-chip" onClick={() => onNavigate(b.ref.id)}>
                  {b.label}
                </button>
              ) : (
                <span key={i} className="backlink-chip">
                  {b.label}
                </span>
              ),
            )}
          </div>
        )}

        <div className="action-row" style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {entry.type === 'vocab' && (
            <button className={`save-word-button ${saved ? 'saved' : ''}`} disabled={saved} onClick={onSave}>
              {saved ? '✓ Saved' : '+ Save'}
            </button>
          )}
          {onReadLongForm && (
            <button className="explore-link-button" onClick={onReadLongForm}>
              Read the full essay →
            </button>
          )}
          {onReadInStory && (
            <button className="explore-link-button" onClick={onReadInStory}>
              Read it in a story →
            </button>
          )}
          {canPractice && (
            <button className="explore-link-button" onClick={onPractice}>
              Practice this →
            </button>
          )}
        </div>
      </div>
    </>
  )
}
