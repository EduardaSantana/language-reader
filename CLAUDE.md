# Language Reader

A mobile-first PWA for reading graded stories and exploring grammar/vocab in
Japanese, German, French, and Russian. Vite + React, no backend except a
small serverless companion-chat API. Dark theme only (no light mode).

## Architecture map

**5 tabs**, switched via `tab` state in `src/App.jsx`: Feed (`ReadingScreen`),
Bookmarks (`BookmarksScreen`), Explore (`ExploreScreen`), Games
(`GamesScreen`), Profile (`ProfileScreen`). `BottomNav` renders the tab bar on
every screen.

**Cross-screen navigation** is done via "seed" state lifted into `App.jsx`:
a setter stashes a payload and switches tabs (e.g. `openExploreForWord(lang,
word)` sets `exploreWordSeed` and does `setTab('explore')`); the target
screen consumes the seed in a `useEffect` keyed on it. Current seeds:
`jumpToIndex` (Feed), `exploreWordSeed`/`exploreNodeSeed` (Explore),
`gameSeed` (Games). Object seeds are wrapped fresh each time (`{ lang, word
}`, `{ id: nodeId }`) so the effect re-fires even if the same value is picked
twice in a row — a raw primitive wouldn't retrigger a `useEffect` on a
repeat value.

**Tab-reset convention**: tapping the tab you're already on should feel like
arriving fresh, not resume where you left off. `App.jsx`'s `changeTab`
detects a same-tab tap and bumps `tabResetNonce`; every screen is mounted
with `key={resetKey}` where `resetKey = \`${tab}-${tabResetNonce}\``, forcing
a full remount (fresh `useState` initializers) instead of a no-op re-render.
Feed's reading position is the one exception — `restorePosition` is only
`true` on the very first Feed mount of the session (`App.jsx`'s
`canRestoreFeedPosition`), so reopening the app resumes your spot but
re-tapping Feed later always scrolls to top.

**Global floating overlays** (mounted as siblings after `{screen}` in
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
one everything (Bites, Bookmarks-era Grammar section, Explore) actually uses.

**Oddities** (`src/data/oddities_{fr,de,ru,ja}.json`) — same shape as
grammar points minus `difficulty`/`bridge_lang`/`confidence`'s role in
ordering (oddities have no natural difficulty order — they're
Explore-Random-only, never in Paths). Tonally distinct: delight/wonder, not
instruction. Rendered with a violet `.entry-card-oddity` accent.

**Dictionary entries** (built by `lib/vocabIndex.js` `buildDictionary(stories)`
from every story's `vocab[]`, deduped by `${lang}:${word}`): `{ word,
reading, english, lang, level, storyIndex }`.

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
- `exploreGraph.js` — builds the cross-language vocab/grammar/oddity node
  graph for Explore's Random rabbit-hole mode; `getNode(id)` dispatches on
  the id's embedded type (`lang:type:key`); `startingIds` (curated pool) vs.
  `allIds` (full pool, used by Surprise Me for true randomness).
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
  `localStorage` directly elsewhere.
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
