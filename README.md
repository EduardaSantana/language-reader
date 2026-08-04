# Language Reader

A mobile-first PWA for learning a language through graded reading, not
flashcard drilling. Built for Japanese, German, French, and Russian. Vite +
React, dark-theme-only, no backend beyond a small serverless AI companion.

## Concept

Most language apps start from vocabulary lists or grammar drills and hope
you eventually read something real. This app inverts that: the core loop is
**reading short graded stories**, with every word tappable for an instant
gloss, and every grammar point, oddity, and vocab item you encounter feeding
into a personal web of things to revisit — dictionary, grammar curriculum,
games, and an AI conversation partner all pull from the same underlying
story/vocab/grammar data instead of being separate content tracks.

## The six tabs

- **Feed** — an infinite-scroll stream of graded stories (leveled 0+ per
  language) in your active languages. Tap any word for a gloss; sentence
  furigana for Japanese. This is the landing tab and the only one always
  mounted from app start.
- **Bookmarks** — saved words, read-story history, a full cross-story
  dictionary, a native-alphabet reference (hiragana/katakana, Cyrillic) with
  romanization, and — for Japanese — a kanji reference (JLPT-ish level
  filter, component breakdown, kun/on readings in real kana with example
  words).
- **Explore** — a rabbit-hole knowledge graph across grammar points, vocab,
  and "oddities" (delightful untranslatable-word-style facts), cross-linked
  within and across languages. Three modes: Random (keep clicking related
  nodes), Paths (a curated basic→complex curriculum), and Oddities.
- **Curriculum** — the structured counterpart to Explore's Random mode: a
  sourced, unit-by-unit grammar syllabus per language (French/German/Russian
  so far), one lesson per page with Prev/Next navigation, a "Practice this
  lesson" link into the matching game where one exists or a lightweight
  inline quick-check when it doesn't, and in-tab search across the current
  language's lessons.
- **Games** — ten-plus vocab/grammar mini-games (matching pairs, fill in the
  blank, sentence reordering, kanji-building, compound-word building, etc.),
  generated from whatever you've actually read/saved rather than a fixed
  question bank.
- **Profile** — active language/level toggles and progress reset.

Two floating overlays reachable from every tab: an AI companion chat bubble
(reacts to what you just read, suggests tangents to explore) and a
"Surprise Me" random-content button.

## Why this might be worth reusing

The interesting architectural bits, if you want to build something similar
for a different subject:

- **One corpus, many views.** Stories carry their own vocab and grammar
  annotations; Explore, Games, Bookmarks, and the companion chat all derive
  their content from that single corpus rather than maintaining separate
  content databases. Add a story once, get dictionary entries, game
  rounds, and Explore nodes for free.
- **Every tab stays mounted and stateful for the whole session** — switching
  tabs never loses your scroll position, open filters, or mid-game state.
  Only a deliberate re-tap of the tab you're already on resets it. See
  `CLAUDE.md`'s "Tabs persist, mounted-once-per-session" section for the
  implementation.
- **Cross-screen "seed" navigation** — tapping a word in a story can jump
  you to Explore or a Game preloaded with that exact word/node, via small
  pieces of state lifted into the root component rather than a router.
- **No native content is asserted without a source.** Hand-authored grammar
  points and oddities carry an explicit `confidence` tag (`first_pass` vs.
  `verified`) tied to whether they were checked against a cited reference —
  worth stealing for any app generating educational content with an LLM.

## Stack

- **Vite + React 19**, no TypeScript, no router (tab state + seeds instead).
- **PWA** via `vite-plugin-pwa` — installable, offline-capable, app-icon
  badge synced to unseen saved words.
- **No database for content** — all stories/grammar/vocab/oddities are
  static JSON in `src/data/`, shipped with the build.
- **One serverless function** (`api/companion-chat.js`, deployed on Vercel)
  for the AI companion chat — the only network dependency in the app.
- **`localStorage`** for all user state (saved words, read history, active
  languages/levels, Explore trail, seen oddities) — see `src/lib/storage.js`
  for the full list; nothing is synced to a server.

## Getting started

```sh
npm install
npm run dev      # start the dev server
npm run build    # production build — the correctness gate; no test suite
npm run lint     # oxlint
```

See `CLAUDE.md` for the full architecture map, data schemas, and
established conventions — it's kept up to date as the primary spec for
anyone (human or AI) working on this codebase.
