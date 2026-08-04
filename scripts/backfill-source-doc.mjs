#!/usr/bin/env node
// Phase 0.4 of docs/ENCYCLOPEDIA_IMPLEMENTATION_PLAN.md: add a `source_doc`
// field to every grammar point, pointing back at the sourced .md curriculum
// doc's unit heading it was transcribed from. Deterministic text matching
// against each grammar point's existing `branch` field.
//
// One hand-mapped exception: docs/japanese_curriculum.md's "N3–N2 EXTENSION
// LAYER" section is real and sourced (confirmed against docs/sources_audit_
// japanese.md — Bunpro, Amgidex, Nihongo to Japan, learnjp.net, nihongo-
// career.com, PassJapanese), but it isn't a numbered "UNIT N" heading like
// the rest of the doc, so the generic parser below can't find it — mapped
// explicitly instead of guessing. The legacy "Verb Forms & Conjugation
// Patterns" unit genuinely has no sourcing basis anywhere (confirmed by the
// same audit) and is correctly left without a source_doc — not a bug.

import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const FILES = {
  fr: { doc: 'docs/french_curriculum.md', json: 'src/data/grammar_points_fr.json' },
  de: { doc: 'docs/german_curriculum.md', json: 'src/data/grammar_points_de.json' },
  ru: { doc: 'docs/russian_curriculum.md', json: 'src/data/grammar_points_ru.json' },
  ja: { doc: 'docs/japanese_curriculum.md', json: 'src/data/grammar_points_ja_bites.json' },
}

function normalize(s) {
  return s
    .toLowerCase()
    .replace(/\(.*?\)/g, '') // trailing (A1), (prerequisite foundation), etc.
    .replace(/\[.*?\]/g, '') // trailing [A1], [N5], etc.
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

function parseUnits(docText) {
  const units = []
  const re = /^#{2,3} UNIT (\d+)\s*(?:\(.*?\))?\s*—\s*(.+)$/gm
  let m
  while ((m = re.exec(docText))) {
    units.push({ number: Number(m[1]), title: m[2].trim(), normTitle: normalize(m[2]) })
  }
  return units
}

let totalMatched = 0
let totalUnmatched = []

for (const [lang, { doc, json }] of Object.entries(FILES)) {
  const docText = readFileSync(join(ROOT, doc), 'utf8')
  const units = parseUnits(docText)
  const points = JSON.parse(readFileSync(join(ROOT, json), 'utf8'))

  for (const p of points) {
    if (!p.branch) {
      totalUnmatched.push(`${json}: ${p.id} (no branch field)`)
      continue
    }
    if (lang === 'ja' && p.branch === 'N3–N2 Pattern Library') {
      p.source_doc = `${doc}#n3-n2-extension-layer`
      totalMatched++
      continue
    }
    const normBranch = normalize(p.branch)
    const unit = units.find(
      (u) => u.normTitle === normBranch || u.normTitle.startsWith(normBranch) || normBranch.startsWith(u.normTitle),
    )
    if (unit) {
      p.source_doc = `${doc}#unit-${unit.number}`
      totalMatched++
    } else {
      p.source_doc = null
      totalUnmatched.push(`${json}: ${p.id} (branch "${p.branch}" — no matching unit in ${doc}, left null)`)
    }
  }

  writeFileSync(join(ROOT, json), JSON.stringify(points, null, 2) + '\n', 'utf8')
  console.log(`${json}: ${points.length} points processed`)
}

console.log(`\n✓ ${totalMatched} points matched to a source_doc unit.`)
if (totalUnmatched.length) {
  console.log(`\n${totalUnmatched.length} left without a source_doc (expected for content the doc doesn't cover, e.g. Japanese's pattern library / legacy unit):`)
  totalUnmatched.forEach((line) => console.log(`  - ${line}`))
}
