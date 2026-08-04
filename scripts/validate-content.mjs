#!/usr/bin/env node
// Schema/integrity validation for src/data/*.json.
// Phase 0 of docs/ENCYCLOPEDIA_IMPLEMENTATION_PLAN.md — catches the class
// of bug that previously only surfaced by chance (corrupted vocab entries,
// duplicate ids, dangling cross-links) before content ships.

import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA = join(ROOT, 'src/data')

const LANGS = ['ja', 'de', 'fr', 'ru']
const CONFIDENCE_VALUES = new Set(['first_pass', 'verified'])
const KANJI_LEVELS = new Set(['N5', 'N4', 'Not Sorted'])

let errors = []
let warnings = []

function err(msg) {
  errors.push(msg)
}
function warn(msg) {
  warnings.push(msg)
}

function loadJson(name) {
  const path = join(DATA, name)
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (e) {
    err(`${name}: invalid JSON — ${e.message}`)
    return null
  }
}

// ---- stories: sequential index per (lang, level), required fields ----
function validateStories() {
  const files = {
    ja: 'stories.json',
    de: 'stories_de.json',
    fr: 'stories_fr.json',
    ru: 'stories_ru.json',
  }
  for (const [lang, file] of Object.entries(files)) {
    const stories = loadJson(file)
    if (!stories) continue

    const byLevel = new Map()
    stories.forEach((s, i) => {
      const where = `${file}[${i}]`
      // ja's raw file omits `lang` (inferred from the file) and uses title_ja,
      // not title_native — see normalizeStory in lib/data.js
      if (s.lang !== undefined && s.lang !== lang) err(`${where}: lang "${s.lang}" doesn't match file (expected "${lang}")`)
      if (typeof s.level !== 'number') err(`${where}: missing/invalid level`)
      if (typeof s.index !== 'number') err(`${where}: missing/invalid index`)
      if (!s.title_native && !s.title_ja) err(`${where}: missing title_native/title_ja`)
      if (!Array.isArray(s.sentences) || s.sentences.length === 0) err(`${where}: missing/empty sentences`)
      if (!Array.isArray(s.vocab)) err(`${where}: missing vocab array`)

      s.vocab?.forEach((v, vi) => {
        if (!v.word) return
        // corrupted-entry pattern seen before: a bare Latin initial standing in for a dropped kanji
        if (lang === 'ja' && /^[A-Za-z][^\x00-\x7F]/.test(v.word)) {
          warn(`${file}[${i}].vocab[${vi}]: word "${v.word}" looks corrupted (Latin initial + non-ASCII — the known 北極/南極-style bug pattern)`)
        }
      })

      if (typeof s.level === 'number' && typeof s.index === 'number') {
        const key = s.level
        if (!byLevel.has(key)) byLevel.set(key, [])
        byLevel.get(key).push(s.index)
      }
    })

    // `index` just needs to be unique within its level so mergeStorySets'
    // (lang, level, index) sort is unambiguous — it isn't required to be
    // zero-based or contiguous (ja's file numbers it globally across levels).
    for (const [level, indices] of byLevel) {
      const dupes = indices.filter((v, i) => indices.indexOf(v) !== i)
      if (dupes.length) err(`${file}: level ${level} has duplicate index values: ${[...new Set(dupes)].join(', ')}`)
    }
  }
}

// ---- grammar points + oddities: id uniqueness, enums, cross-references ----
function validateGrammarAndOddities() {
  const grammarFiles = {
    fr: 'grammar_points_fr.json',
    de: 'grammar_points_de.json',
    ru: 'grammar_points_ru.json',
    ja: 'grammar_points_ja_bites.json',
  }
  const oddityFiles = {
    fr: 'oddities_fr.json',
    de: 'oddities_de.json',
    ru: 'oddities_ru.json',
    ja: 'oddities_ja.json',
  }

  const allIds = new Map() // id -> file it first appeared in
  const grammarByLang = {}
  const oddityByLang = {}

  function checkId(id, file, i) {
    if (!id) {
      err(`${file}[${i}]: missing id`)
      return
    }
    if (allIds.has(id)) {
      err(`${file}[${i}]: duplicate id "${id}" (also in ${allIds.get(id)})`)
    } else {
      allIds.set(id, file)
    }
  }

  for (const [lang, file] of Object.entries(grammarFiles)) {
    const points = loadJson(file)
    if (!points) continue
    grammarByLang[lang] = new Set(points.map((p) => p.id))
    points.forEach((p, i) => {
      const where = `${file}[${i}] (${p.id ?? 'no id'})`
      checkId(p.id, file, i)
      if (p.lang !== lang) err(`${where}: lang "${p.lang}" doesn't match file (expected "${lang}")`)
      if (![1, 2, 3].includes(p.difficulty)) err(`${where}: difficulty must be 1-3, got ${p.difficulty}`)
      if (!CONFIDENCE_VALUES.has(p.confidence)) err(`${where}: confidence must be first_pass|verified, got "${p.confidence}"`)
      if (!p.title) err(`${where}: missing title`)
      if (!p.explanation) err(`${where}: missing explanation`)
      if (!Array.isArray(p.examples) || p.examples.length === 0) warn(`${where}: no examples`)
    })
  }

  for (const [lang, file] of Object.entries(oddityFiles)) {
    const oddities = loadJson(file)
    if (!oddities) continue
    oddityByLang[lang] = new Set(oddities.map((o) => o.id))
    oddities.forEach((o, i) => {
      const where = `${file}[${i}] (${o.id ?? 'no id'})`
      checkId(o.id, file, i)
      if (o.lang !== lang) err(`${where}: lang "${o.lang}" doesn't match file (expected "${lang}")`)
      if (!CONFIDENCE_VALUES.has(o.confidence)) err(`${where}: confidence must be first_pass|verified, got "${o.confidence}"`)
      if (!o.title) err(`${where}: missing title`)
    })
  }

  const comparative = loadJson('oddities_comparative.json')
  if (comparative) {
    comparative.forEach((c, i) => {
      const where = `oddities_comparative.json[${i}] (${c.id ?? 'no id'})`
      checkId(c.id, 'oddities_comparative.json', i)
      if (!CONFIDENCE_VALUES.has(c.confidence)) err(`${where}: confidence must be first_pass|verified, got "${c.confidence}"`)
      if (!Array.isArray(c.entries) || c.entries.length < 2) err(`${where}: needs at least 2 language entries`)
      c.entries?.forEach((e) => {
        if (!LANGS.includes(e.lang)) err(`${where}: unknown lang "${e.lang}" in entries`)
      })
    })
  }

  // cross-references: prerequisites (same-lang bare ids), see_also ({lang,id}),
  // related_oddity_id ({lang,id})
  function checkRefs(points, file) {
    points?.forEach((p, i) => {
      const where = `${file}[${i}] (${p.id})`
      p.prerequisites?.forEach((refId) => {
        if (!grammarByLang[p.lang]?.has(refId)) {
          err(`${where}: prerequisite "${refId}" not found in ${p.lang} grammar points`)
        }
      })
      p.see_also?.forEach((ref) => {
        if (!grammarByLang[ref.lang]?.has(ref.id)) {
          err(`${where}: see_also target "${ref.lang}:${ref.id}" not found`)
        }
      })
      if (p.related_oddity_id) {
        const ref = p.related_oddity_id
        if (!oddityByLang[ref.lang]?.has(ref.id)) {
          err(`${where}: related_oddity_id "${ref.lang}:${ref.id}" not found`)
        }
      }
    })
  }
  for (const [lang, file] of Object.entries(grammarFiles)) {
    checkRefs(loadJson(file), file)
  }
}

// ---- kanji reference: level enum, cross-file key consistency ----
function validateKanji() {
  const components = loadJson('kanji_components.json')
  const meanings = loadJson('kanji_meanings.json')
  const examples = loadJson('kanji_examples.json')
  if (!components) return

  const kanjiSet = new Set()
  components.forEach((k, i) => {
    const where = `kanji_components.json[${i}] (${k.kanji ?? '?'})`
    if (!k.kanji) {
      err(`${where}: missing kanji character`)
      return
    }
    if (kanjiSet.has(k.kanji)) err(`${where}: duplicate kanji entry`)
    kanjiSet.add(k.kanji)
    if (!KANJI_LEVELS.has(k.level)) err(`${where}: level must be N5|N4|"Not Sorted", got "${k.level}"`)
    if (!Array.isArray(k.components)) err(`${where}: missing components array`)
    if (!k.onyomi && !k.kunyomi) warn(`${where}: no onyomi or kunyomi at all`)
  })

  if (meanings) {
    for (const k of Object.keys(meanings.kanji ?? {})) {
      if (!kanjiSet.has(k)) warn(`kanji_meanings.json: "${k}" has a meaning but no entry in kanji_components.json`)
    }
  }
  if (examples) {
    for (const k of Object.keys(examples)) {
      if (!kanjiSet.has(k)) warn(`kanji_examples.json: "${k}" has an example but no entry in kanji_components.json`)
      const e = examples[k]
      if (!e.on && !e.kun) err(`kanji_examples.json["${k}"]: neither on nor kun example present`)
    }
  }
}

validateStories()
validateGrammarAndOddities()
validateKanji()

if (warnings.length) {
  console.log(`⚠ ${warnings.length} warning(s):`)
  warnings.forEach((w) => console.log(`  - ${w}`))
}
if (errors.length) {
  console.log(`\n✗ ${errors.length} error(s):`)
  errors.forEach((e) => console.log(`  - ${e}`))
  console.log(`\nContent validation failed.`)
  process.exit(1)
} else {
  console.log(`\n✓ Content validation passed${warnings.length ? ' (with warnings above)' : ''}.`)
}
