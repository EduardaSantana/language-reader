# Language Reader

A mobile-first PWA for reading graded stories and exploring grammar/vocab in
Japanese, German, French, and Russian. Vite + React, no backend except a
small serverless companion-chat API. Dark theme only (no light mode).

## Architecture map

**6 tabs**, switched via `tab` state in `src/App.jsx`: Feed (`ReadingScreen`),
Bookmarks (`BookmarksScreen`), Explore (`ExploreScreen`), Curriculum
(`CurriculumScreen`), Games (`GamesScreen`), Profile (`ProfileScreen`).
`BottomNav` renders the tab bar on every screen.

**Cross-screen navigation** is done via "seed" state lifted into `App.jsx`:
a setter stashes a payload and switches tabs (e.g. `openExploreForWord(lang,
word)` sets `exploreWordSeed` and does `setTab('explore')`); the target
screen consumes the seed in a `useEffect` keyed on it. Current seeds:
`jumpToIndex` (Feed), `exploreWordSeed`/`exploreNodeSeed` (Explore),
`gameSeed` (Games). Object seeds are wrapped fresh each time (`{ lang, word
}`, `{ id: nodeId }`) so the effect re-fires even if the same value is picked
twice in a row — a raw primitive wouldn't retrigger a `useEffect` on a
repeat value.

**Tabs persist, mounted-once-per-session**: every tab keeps its internal
state (open modals, filters, scroll position, mid-game state) when you
switch away and back — screens are never unmounted just for a tab switch.
`App.jsx` renders all six screens as permanent siblings; `visitedTabs` (a
`Set`) gates each non-Feed screen behind `lazy()`/`Suspense` so it's still
only imported the first time you actually visit that tab, and each screen's
own wrapper div toggles `display: contents` (active) vs `display: none`
(inactive) rather than conditionally rendering. Feed is the exception to the
lazy-mount (eagerly imported, always mounted from app start, matching its
role as the landing tab). The one remaining reset case: tapping the tab
you're already **on** still forces that one screen fresh — `changeTab`
bumps a per-tab entry in `tabResetNonces`, used as that screen's `key`, so
only the re-tapped screen remounts; every other already-visited screen is
untouched. Screens that need to react every time they *become* the active
tab again (not just on first mount — e.g. `BookmarksScreen` clearing the
unseen-saved-words badge) must key that logic off the `activeTab` prop
changing, not off mount (`useEffect(() => {...}, [activeTab])` with an
`if (activeTab !== 'x') return` guard), since a plain mount-only effect will
now only ever fire once per session. Feed's reading position continues to
work the same way it always did — `restorePosition` is only `true` on the
very first Feed mount of the session (`App.jsx`'s `canRestoreFeedPosition`)
— but now that Feed rarely remounts at all, scroll position mostly just
stays put on its own; re-tapping Feed while already on it is still the one
way to force it back to the top.

**`BottomNav` is a single global instance**, rendered once in `App.jsx`
(not per-screen) since every tab now stays mounted simultaneously — one
instance per screen would mean up to six simultaneously in the DOM. Its
unseen-saved-words badge is owned by `App.jsx` (`unseenSavedCount` state +
`refreshUnseenCount()`), passed down as `onSavedWordsChange` to every screen
that can save/clear saved words (`ReadingScreen`, `BookmarksScreen`,
`ExploreScreen`) — each calls it after its own save/clear action instead of
computing a local, mount-once copy of the count.

**Global floating overlays** (mounted as siblings after the tab screens in
`App.jsx`, so reachable from every tab): `CompanionOverlay` (AI chat bubble,
bottom-right) and `SurpriseMeOverlay` (random-content "slot machine",
bottom-left — deliberately mirrored to avoid colliding with the companion
bubble). Both build their own data independently rather than sharing lifted
state, consistent with how every screen already rebuilds its own dictionary
per mount.

## Data schemas

**Stories** (`src/data/stories.json` [ja], `stories_de.json`, `stories_fr.json`,
`stories_ru.json`) — flat JSON array, normalized by `lib/data.js`
`normalizeStory`/`mergeStorySets`:
```json
{
  "lang": "fr", "level": 0, "index": 0,
  "title_native": "...", "title_en": "...", "emoji": "🎮",
  "sentences": [[{ "text": "...", "annotation": null }]],
  "vocab": [{ "word": "...", "annotation": "m", "english": "..." }]
}
```
**The `annotation` field is overloaded and this ambiguity has caused two real
bugs this session** — know it cold:
- On **sentence segments**, it's the phonetic reading (Japanese furigana
  only; always `null` for fr/de/ru since they don't need it).
- On **vocab entries**, it's grammatical gender (`"m"`/`"f"`/`"n"`) for
  fr/de/ru — Japanese vocab uses a real `reading` field instead. Both map
  into the same normalized `reading` field (`v.reading ?? v.annotation ??
  null`), so `entry.reading` means "furigana" for ja but "gender code" for
  everything else. Code that treats `reading` as alphabetically sortable or
  displayable pronunciation must check `lang` first (see
  `lib/vocabIndex.js`'s `sortKeySource`).
- Vocab words are also stored **with their dictionary-form leading article
  baked in** (`"le soleil"`, `"das Videospiel"`) for fr/de — but running text
  never repeats the article (`"il fait soleil"`). Use
  `stripLeadingArticle(word, lang)` / `hasLeadingArticle` (`lib/vocabIndex.js`)
  before substring-matching a word against sentence text or you'll silently
  get zero matches (or worse, an unrelated fallback sentence).
- `index` must be sequential per `(lang, level)` — `mergeStorySets` sorts by
  `(lang, level, index)` then assigns a global `idx`.

**Grammar points** (`src/data/grammar_points_{fr,de,ru}.json`,
`grammar_points_ja_bites.json`) — flat array:
```json
{
  "id": "fr-negation-01", "lang": "fr", "difficulty": 1,
  "title": "...", "explanation": "...",
  "example_native": "...", "example_gloss": "...",
  "bridge_lang": "pt", "bridge_note": "...",
  "related_game_id": null,
  "see_also": [{ "lang": "de", "id": "de-verb-second-01" }],
  "confidence": "first_pass"
}
```
`difficulty` (1-3) drives Explore's Paths basic→complex ordering.
`bridge_lang` is `"pt"` for French (bridging to Portuguese), `"en"` for
German/Russian/Japanese. `see_also` is a small hand-curated set of
cross-language links (verb-position points link to each other, case-system
points link to each other) — not automatic. **Important**:
`grammar_points_ja.json` (no `_bites` suffix) is a *different*, older schema
(`pattern`/`explanation`/`examples[]` mined from the corpus with real story
citations) — it's only consumed by nothing anymore after the Explore
rewrite; don't confuse the two files. `grammar_points_ja_bites.json` is the
one everything (Bites, Bookmarks-era Grammar section, Explore, Curriculum)
actually uses — despite the `_bites` name it now holds the full sourced
Japanese curriculum (132 points), not just short "bites": 13 core
prerequisite-ordered units (Writing System through Passive/Causative,
sourced against Genki/Tobira/JF Standard lesson numbers where the source
doc cites one), a `"N3–N2 Pattern Library"` branch (~40 points,
deliberately *not* prerequisite-chained — it's a searchable reference of
atomic bunkei like そうだ/ようだ/らしい, not a linear track, matching how
N3–N2 grammar is actually taught), a `"Sentence-Final Particles &
Register"` capstone (ね/よ/わ/ぞ・ぜ/かな/でしょう), and one preserved
`"Verb Forms & Conjugation Patterns"` unit (person/number-invariant verbs,
transitive/intransitive pairs) carried over from the old 11-entry file
because the sourced curriculum doc doesn't cover that topic at all — don't
delete it thinking it's leftover cruft. Confidence is deliberately mostly
`"first_pass"` (121/132) with `"verified"` reserved for points the source
doc explicitly ties to a specific Genki lesson number or calls
"well-corroborated" — the doc itself stresses no official JLPT grammar
syllabus exists, so over-claiming `"verified"` would misrepresent that.

**Oddities** (`src/data/oddities_{fr,de,ru,ja}.json`) — same shape as
grammar points minus `difficulty`/`bridge_lang`'s role in ordering (oddities
have no natural difficulty order). Tonally distinct: delight/wonder, not
instruction. Rendered with a violet `.entry-card-oddity` accent. Explore has
a dedicated third mode for these (`Random | Paths | ✨ Oddities`) — don't
build a bug where the Oddities tab's own list uses a different code path
than Random mode's; both must go through `graph.getNode(oddityNodeId(lang,
id))` so cross-links (`see_also`, cluster mates) and "Dig deeper" actually
populate. An optional `"cluster"` string field (e.g.
`"feelings-with-no-english-word"`) lets otherwise-unconnected oddities across
different languages surface each other as `related` links —
`exploreGraph.js` resolves this by building one flat cross-language oddity
list (`allOddities`) inside `buildExploreGraph` and matching on `cluster`.

**Comparative oddities** (`src/data/oddities_comparative.json`) — a fourth,
language-agnostic shape: one concept shown side-by-side across all 4
languages at once. `{ id, title, concept_note, entries: [{ lang, native,
gloss, note }] }`. Node ids use `"all"` as the pseudo-lang segment
(`all:comparative:${id}`) to fit the existing `lang:type:key` id scheme
without changing it. `EntryCard.jsx` has an early-return branch for
`node.type === 'comparative'` that renders a loop of per-language rows
instead of the normal single-citation layout — don't thread comparative
nodes through the normal citation/eyebrow rendering path, it doesn't fit.

**Language families** (`src/data/language_families.json`, rendered by
`components/FamiliesScreen.jsx`, reached via a "🌳 Families" card on
Encyclopedia's home hub next to "🌐 Compared") — a fifth, genealogical
grouping distinct from the other four: `{ families: [{ id, name, subtitle,
drafted, origin, pattern?, members: [{ code, flag, name, tag, active,
branch? }], branchNotes?, history: { intro, tree, timeline }, elements: [...]
}], japanese: { name, note } }`. `drafted` gates whether `FamilyDetail` shows
real element rows or a "🚧 not yet drafted" placeholder card — Slavic and
Germanic ship with real `members`/`history` but `elements: []` today; only
Romance has real content. `elements[].kind` is one of four shape-specific
templates (`pattern-outlier`, `consensus`, `vocab-strip`, `pattern-insight`)
chosen per element based on its actual content shape (a clean 4-agree/
1-diverges split vs. a barely-worth-a-table consensus vs. a pure vocab list
vs. no single outlier) — don't force every element through one generic
table+prose layout, that was an earlier, since-abandoned design. Every
comparison table (`CompareTable` in `FamiliesScreen.jsx`, styled via the
existing `.wide-table`) shows all of that family's languages per row, using
a literal `"-"` cell value for a genuine non-equivalent (e.g. Romanian has
no fused preposition+article form) rather than silently omitting a column —
missing-without-explanation reads as a data bug, an explicit dash doesn't.
`FamiliesScreen` owns its own internal back-stack (list → family detail →
element/history) independently of `EncyclopediaScreen`'s single-level `view`
state machine, since Families is the one multi-level drill-down among
otherwise-flat entry types; it only calls the `onExit` prop when Back is
pressed at its own list root. Germanic's `members` carry a `branch` field
(`"West Germanic"` — German/English/Dutch/Afrikaans/Yiddish; `"North
Germanic"` — Swedish/Danish/Norwegian/Icelandic/Faroese) with matching
`branchNotes`; Slavic stays a flat 6-member list (Russian + Polish/
Ukrainian/Czech/Serbian-Croatian/Bulgarian) since no branch split was
requested for it. Design lineage: drafted in `docs/ENCYCLOPEDIA_MOCKUP.html`
frames 19–34, iterated as a real click-through prototype at
`docs/FAMILIES_FLOW_PROTOTYPE.html` (also a published Claude Artifact)
before any `src/` code was written, per the mockup-first sign-off rule
below. Next step per `docs/BACKLOG.md`: draft Slavic's and Germanic's own
11 element tables now that Germanic's branch structure is settled.

**Seen-oddities tracking** (`lib/storage.js` `getSeenOddities`/
`markOdditySeen`/`markOdditiesSeen`) — a Set persisted under `seen_oddities`,
same pattern as `getReadStories`. Deliberately zero-pressure: pure
accumulation, no streak, nothing ever un-marks. Marked seen (a) when an
oddity becomes Random mode's `currentNode`, (b) in bulk the moment a
language's Oddities-tab list (or the comparative list) is opened — no
scroll-tracking, since the whole list is already visible at once. Drives the
"✨ N / total found" counter and the `isNew` "NEW" badge in `EntryCard`.

**Dictionary entries** (built by `lib/vocabIndex.js` `buildDictionary(stories)`
from every story's `vocab[]`, deduped by `${lang}:${word}`): `{ word,
reading, english, lang, level, storyIndex }`.

**Kanji reference** (Bookmarks' "Kanji" tab, Japanese-only) — three parallel
files keyed by the kanji character, not one combined schema:
- `src/data/kanji_components.json` — flat array, `{ kanji, components: [...],
  level, onyomi, kunyomi }`. `level` is `"N5"`/`"N4"`/`"Not Sorted"` (no
  official JLPT kanji list exists; N5/N4 are tagged against
  community-consensus lists, "Not Sorted" means likely N3+ or otherwise
  untagged rather than a guessed level). `onyomi`/`kunyomi` are **real kana**
  (on'yomi in katakana, kun'yomi in hiragana), comma-separated for multiple
  readings, with okurigana kept in the source's parenthetical convention
  (e.g. `たか(い)`, prefix/suffix forms keep a leading hyphen like `-どき`).
  These were converted from a romaji source via a one-off mora-tokenizing
  script (not part of the repo) — if re-deriving readings from a new source,
  remember on'yomi long vowels are always spelled `-ou`/`-ei`-style (お+う,
  え+い), while kun'yomi occasionally has a genuine doubled vowel (`こおり`,
  `おおやけ`) that must NOT be collapsed to the `-ou` spelling.
- `src/data/kanji_meanings.json` — `{ kanji: {char: meaning}, components:
  {char: meaning} }`.
- `src/data/kanji_examples.json` — `{ [kanji]: { on?: {word, reading,
  meaning}, kun?: {word, reading, meaning} } }`, one example compound (or
  standalone word for kun'yomi adjectives/verbs) per reading type,
  demonstrating it in actual use rather than just restating the bare
  reading. Either key can be absent — some kanji have no clean on'yomi
  compound, some kun'yomi entries are rare enough that no example was added
  rather than guess. **First-pass, unverified** like the rest of the app's
  hand-authored content (see below) — hasn't had native-speaker review.
`BookmarksScreen.jsx`'s `KanjiReference` component is the only consumer of
all three; `KanjiBuildGame.jsx` also reads `kanji_components.json` for its
own N5/N4/Not Sorted level filter (kept in sync with Bookmarks' filter for
consistency, not because the two share state).

## Established conventions

- **"first_pass" content disclosure.** Every hand-authored grammar
  point/oddity/story added by an AI pass carries `"confidence": "first_pass"`
  (or is called out as such in conversation) — none of it has had
  native-speaker review. Flag this explicitly whenever adding more; don't
  let it silently read as verified.
- **Noun/verb classification** (`lib/explorePaths.js` `classifyVocab`) —
  used to build Explore's Nouns/Verbs Paths from real story vocab, not
  fabricated lists. Each language uses a different signal because the data
  itself differs: French/German/Russian nouns are detected via gender
  annotation or (French) a leading article / (German) capitalization after
  stripping the article; verbs via infinitive suffix (`-er/-ir/-re`,
  `-en/-ln/-rn`, `-ть/-ти/-чь`). Japanese has neither signal, so it uses a
  small hand-curated allowlist matched against whatever's actually in the
  corpus (never asserts unverified content).
- **Design tokens** — `src/index.css` `:root`: `--bg`, `--surface`, `--text`,
  `--text-dim`, `--accent` (pink `#d4537e`), `--accent-secondary` (green,
  "saved"/success state), `--border`, per-language colors
  `--lang-{ja,de,fr,ru}-color`/`-text`. `color-scheme: dark` — there is no
  light theme, don't build one without discussing it first.
- **Animation vocabulary** (`src/App.css`) — `save-pulse` keyframe (scale
  0.9→1.08→1 overshoot) is the one "juicy" idiom, reused directly on every
  correct-answer moment (`.game-choice-correct`, `.match-card.matched`,
  `.category-item-correct`) rather than inventing new animation styles per
  component. All animated states respect `prefers-reduced-motion`. **No
  `navigator.vibrate` anywhere by explicit request** — don't add haptics.
- **Bottom-sheet modals** reuse the generic `.modal-backdrop`/`.modal`
  classes (slide-up from bottom, `z-index: 10`) rather than one-off dialog
  styling per feature.
- Floating action buttons: `z-index: 9`, 52×52px circle, `bottom: calc(88px
  + env(safe-area-inset-bottom))`, right side for companion, left side for
  anything added later (keep the convention of alternating sides so FABs
  never stack).

## Where things live (`src/lib/*.js`)

- `data.js` — `normalizeStory`/`mergeStorySets`: raw story JSON → normalized
  shape, merges all 4 languages into one sorted array with a global `idx`.
- `vocabIndex.js` — dictionary building/sorting/lettering for Bookmarks'
  Dictionary tab; `stripLeadingArticle`/`hasLeadingArticle` (shared with
  `exploreGraph.js`).
- `exploreGraph.js` — builds the cross-language vocab/grammar/oddity/
  comparative node graph for Explore's Random rabbit-hole mode; `getNode(id)`
  dispatches on the id's embedded type (`lang:type:key`, `"all"` pseudo-lang
  for comparative); `startingIds` (curated pool) vs. `allIds` (full pool,
  used by Surprise Me for true randomness).
- `explorePaths.js` — `classifyVocab`, `buildGrammarPath`/`buildVocabPath`
  for Explore's Paths mode (basic→complex ordering).
- `tokenize.js` — client-side word tokenization + vocab lookup so every word
  in a story (not just pre-glossed ones) is tappable for a gloss.
- `games.js` — round-picking logic for every game (`pickRound`,
  `pickAlphabetRound`, etc.) plus shared companion reaction line pools.
- `companion.js` — AI companion chat + "dig deeper" tangent suggestions
  (calls a serverless API endpoint).
- `storage.js` — all `localStorage` reads/writes behind named functions
  (saved words, read stories, explore trail, feed order, etc.) — never touch
  `localStorage` directly elsewhere. `getBookmarksView`/`setBookmarksView`
  persist Bookmarks' `{mode, alphabetLang, kanjiLevel}` as belt-and-suspenders
  on top of the in-memory tab persistence (survives a full page reload, not
  just a tab switch) — deliberately not in `PROGRESS_KEYS` since it's UI
  state, not learning progress, so it's untouched by "Delete all progress."
- `langs.js` / `levels.js` — display metadata (avatar/label/color) for
  languages and reading levels.
- `search.js` — story search matching for the Feed search modal.
- `badge.js` — PWA app-icon badge sync (unseen saved words count).
- `images.js` — cached word-illustration lookup for saved-word cards.

## Verification habits

- `npm run build` after any change — must stay clean (no dedicated test
  suite; this is the correctness gate).
- For UI changes, actually drive the app: start `npm run dev`, use
  Playwright (`chromium.launch`) headlessly against `localhost:5173` to
  click through the real flow and screenshot it. Don't just eyeball the
  code — several real bugs this session (dictionary letter filter,
  word-tap mismatches, Explore citation mismatches) only surfaced by
  actually clicking through the running app.
- **Always use the mockup.** `docs/ENCYCLOPEDIA_MOCKUP.html` is the
  locked design spec (also referenced from `docs/ENCYCLOPEDIA_
  DIRECTIONS.md`) — before building or changing any Encyclopedia/Read/
  Games/Profile UI, open it and check the actual coded HTML/CSS for that
  screen, not a remembered impression of it. When no frame exists for
  what you're building (e.g. a Kanji browsing grid), design it *in the
  mockup file first* — as a new frame, matching its existing tokens/
  classes — then implement to match that frame exactly. "Approximately
  matches" is not the bar; a real side-by-side (screenshot the mockup
  frame and the running app, compare pixel values) is. This rule exists
  because every UI phase this session drifted from the mockup when built
  from memory instead of checked against it — see
  `docs/ENCYCLOPEDIA_IMPLEMENTATION_PLAN.md`'s "Design fidelity audit"
  for the concrete pattern of bugs that caused.
- **Design in the mockup, get explicit sign-off, only then touch real
  app code.** For any new feature or nontrivial redesign (not a small
  copy/CSS fix to something already built), the sequence is: (1) draft
  the new frame(s) in `docs/ENCYCLOPEDIA_MOCKUP.html`, (2) stop and
  describe the design back to the user in plain terms, (3) wait for
  explicit agreement, and only after that (4) write `src/` code. Do not
  self-authorize the jump from "design looks done to me" to
  implementation — a design that feels finished is not the same as one
  the user has actually confirmed. This rule exists because a session
  went straight from drafting the Language Families mockup frames into
  writing real data files and components without asking first, and had
  to revert that work when the user stopped it ("we need to agree on
  the design first before doing anything").
