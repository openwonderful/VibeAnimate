#!/usr/bin/env node
/**
 * doctor.mjs — static validator for the scene/timeline/film reference
 * graph (SPEC §12.4). Catches at edit time what the runtime would only
 * throw at load/render time. Run after any reorganization:
 *
 *   npm run doctor
 *
 * Errors (exit 1): duplicate keys, colliding sanitized composition ids,
 * missing scene files, undeclared groups, timeline keys missing from
 * the manifest, timeline overlaps.
 * Warnings (exit 0): clips longer than their scene's durationSec,
 * gaps between clips, manifest entries the regex tooling can't see.
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const errors = []
const warnings = []

/* ── manifest ─────────────────────────────────────────────────────── */
const manifestSrc = readFileSync(path.join(root, 'src/scenes/manifest.ts'), 'utf8')

const groupNames = [...manifestSrc.matchAll(/\{ name: '([^']+)', title:/g)].map(m => m[1])

const scenesBlock = manifestSrc.match(/const SCENES[^=]*=\s*\[([\s\S]*?)\n\]/)?.[1] ?? ''
const entryRe = /^\s*\{ key: '([^']+)',.*?group: '([^']+)'(?:.*?durationSec: ([\d.]+))?.*?import\('([^']+)'\)/gm
const scenes = new Map()
for (const m of scenesBlock.matchAll(entryRe)) {
  const [, key, group, durationSec, importPath] = m
  if (scenes.has(key)) errors.push(`manifest: duplicate key '${key}'`)
  scenes.set(key, { group, durationSec: durationSec ? parseFloat(durationSec) : 20, importPath })
}

// Regex-visibility check: every literal `{ key:` line should have parsed.
const naiveCount = (scenesBlock.match(/^\s*\{ key: '/gm) ?? []).length
if (naiveCount !== scenes.size) {
  warnings.push(`manifest: ${naiveCount - scenes.size} entr(y/ies) matched '{ key:' but not the full tooling regex — check line shape`)
}

// Sanitized composition-id collisions (Remotion id charset).
const sanitized = new Map()
for (const key of scenes.keys()) {
  const id = key.replace(/[^a-zA-Z0-9-]/g, '-')
  const clash = sanitized.get(id)
  if (clash) errors.push(`manifest: keys '${clash}' and '${key}' collide as composition id '${id}'`)
  sanitized.set(id, key)
}

// Groups and files.
for (const [key, s] of scenes) {
  if (!groupNames.includes(s.group)) errors.push(`manifest: '${key}' uses undeclared group '${s.group}'`)
  const base = path.join(root, 'src/scenes', s.importPath)
  if (![`${base}.tsx`, `${base}.ts`, path.join(base, 'index.tsx'), path.join(base, 'index.ts')]
    .some(existsSync)) {
    errors.push(`manifest: '${key}' scene file not found: ${s.importPath}`)
  }
}

/* ── timelines ────────────────────────────────────────────────────── */
function checkTimeline(file, constName, { contiguous }) {
  const src = readFileSync(path.join(root, file), 'utf8')
  const block = src.match(new RegExp(`const ${constName}[^=]*=\\s*\\[([\\s\\S]*?)\\n\\]`))?.[1]
  if (!block) { errors.push(`${file}: cannot find ${constName}`); return }
  const items = [...block.matchAll(/\{ key: '([^']+)', from: ([\d.]+), duration: ([\d.]+)(?:, offsetSec: ([\d.]+))?/g)]
    .map(m => ({ key: m[1], from: parseFloat(m[2]), duration: parseFloat(m[3]), offsetSec: m[4] ? parseFloat(m[4]) : 0 }))
  if (items.length === 0) { errors.push(`${constName}: empty or unparseable`); return }

  for (const it of items) {
    const scene = scenes.get(it.key)
    if (!scene) { errors.push(`${constName}: unknown scene key '${it.key}'`); continue }
    if (it.offsetSec + it.duration > scene.durationSec + 1e-9) {
      warnings.push(`${constName}: clip '${it.key}' plays to scene-local ${it.offsetSec + it.duration}s but the scene's durationSec is ${scene.durationSec}s (composition would cut it short)`)
    }
  }
  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1]
    const gap = items[i].from - (prev.from + prev.duration)
    if (gap < -1e-9) errors.push(`${constName}: '${prev.key}' overlaps '${items[i].key}'`)
    else if (contiguous && gap > 1e-9) warnings.push(`${constName}: ${gap}s gap between '${prev.key}' and '${items[i].key}'`)
  }
  return items
}

const masterItems = checkTimeline('src/remotion/timeline.ts', 'TIMELINE', { contiguous: false })

/* ── act labels vs the cut they claim to describe ─────────────────── */
/**
 * SCENE_GROUPS titles carry timings in prose — "The Show — the seven, and the
 * way back out (0:26–0:45)" — and they are the labels the studio's shot list
 * navigates by. Nothing kept them honest, and two of them had been wrong
 * since a retiming three commits before anyone noticed: Act 2 was reading
 * 0:26–0:45 when the master had it ending at 0:37.5. A label that is
 * plausible and wrong is worse than no label, because you plan a cut around
 * it.
 *
 * Warning rather than error: a group may legitimately describe something the
 * master timeline does not contain (Act 9, Legacy, the lab), and prose is
 * allowed to round. The tolerance is a second — enough for "0:37.5" written
 * as "0:37", not enough to hide a two-second retime.
 */
if (masterItems) {
  const acts = new Map()
  for (const it of masterItems) {
    const act = it.key.split(/[.\-]/)[0]
    const cur = acts.get(act)
    if (cur) { cur[0] = Math.min(cur[0], it.from); cur[1] = Math.max(cur[1], it.from + it.duration) }
    else acts.set(act, [it.from, it.from + it.duration])
  }
  const secs = (m, s) => parseInt(m, 10) * 60 + parseFloat(s)
  const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`
  for (const g of manifestSrc.matchAll(/\{ name: '(Act ([0-9]+)B?)', title: '([^']*)'/g)) {
    const [, name, actNum, title] = g
    const range = /\((\d+):(\d+(?:\.\d+)?)[–-](\d+):(\d+(?:\.\d+)?)\)/.exec(title)
    if (!range) continue
    const real = acts.get(actNum)
    if (!real) continue
    const claimed = [secs(range[1], range[2]), secs(range[3], range[4])]
    if (Math.abs(claimed[0] - real[0]) > 1 || Math.abs(claimed[1] - real[1]) > 1) {
      warnings.push(`manifest: ${name}'s title says (${range[1]}:${range[2]}–${range[3]}:${range[4]}) but TIMELINE has it at ${fmt(real[0])}–${fmt(real[1])}`)
    }
  }
}
checkTimeline('src/studio/story/timeline.ts', 'STORY_TIMELINE', { contiguous: true })
checkTimeline('src/studio/story/timeline.ts', 'STORY_ANIME_TIMELINE', { contiguous: true })
checkTimeline('src/studio/story/timeline.ts', 'STORY_OVERLAYS', { contiguous: false })

/* ── films registry ───────────────────────────────────────────────── */
const filmsSrc = readFileSync(path.join(root, 'src/studio/films.ts'), 'utf8')
for (const m of filmsSrc.matchAll(/composition: '([^']+)'/g)) {
  // Composition ids must not collide with sanitized scene keys.
  if (sanitized.has(m[1])) errors.push(`films: composition id '${m[1]}' collides with a scene composition id`)
}
/*
 * A film's score and lyric sheet must actually be on disk.
 *
 * These are the one class of film reference nothing else checks: scene keys
 * fail loudly at module load (StoryFilm.tsx validates them), but a missing
 * mp3 fails QUIETLY and in three different ways — Remotion's staticFile 404s
 * to a silent render, render-fast prints one line and carries on video-only,
 * and the studio's lyric lane just comes up empty. Worth an error because
 * `.gitignore` carries a blanket `*.mp3`: the tracked scores are all
 * force-added, so a NEW one is ignored by default and the film is broken for
 * every checkout but the one it was authored on.
 *
 * A WARNING, not an error, for two reasons: the film still renders (silent),
 * and this check found `lantern-keeper-theme.mp3` already missing on the day
 * it was written — both story films reference a score that is not in the
 * repo. Erroring would have turned CI red for a pre-existing condition
 * unrelated to whoever ran doctor next. Promote it once that score lands.
 */
for (const m of filmsSrc.matchAll(/\b(audio|lyrics): '([^']+)'/g)) {
  const rel = path.join('public', m[2])
  if (!existsSync(path.join(root, rel))) warnings.push(`films: ${m[1]} '${rel}' does not exist — that film renders silent`)
}

/* ── report ───────────────────────────────────────────────────────── */
for (const w of warnings) console.log(`[warn ] ${w}`)
for (const e of errors) console.log(`[ERROR] ${e}`)
console.log(`doctor: ${scenes.size} scenes · ${errors.length} error(s) · ${warnings.length} warning(s)`)
process.exit(errors.length > 0 ? 1 : 0)
