#!/usr/bin/env node
/**
 * lyrics-splice.mjs — RETIRED. There is no splice. Running this does nothing.
 *
 * ── What it used to do ────────────────────────────────────────────────
 * The shipping `public/audio/body-to-body.mp3` was not the song: it was the
 * song cut at 126.8 — the breath after "somebody like", right before
 * "Everybody like you" — then 8 seconds of true silence for the death, then
 * the song again FROM SOURCE 123.0, replaying the phrase she died inside of.
 * Film time and song time were therefore the same number up to the cut and
 * differed by 11.8s after it, and one phrase was heard twice. A lyric sheet
 * timed against the original recording was correct for two minutes and then a
 * fixed 11.8s early for the rest — the kind of wrong that survives a glance,
 * because every cue is still in ORDER and still roughly under a vocal. (It
 * did survive one merge exactly that way.) So the sheet was GENERATED: this
 * script mapped `body-to-body-source.lrc` through the splice and wrote
 * `body-to-body.lrc`, which is what films.ts loads.
 *
 * ── Why it is retired ─────────────────────────────────────────────────
 * The film went back to the untouched recording (189.768s; the whole film is
 * 190.0s). Film time == song time from the first frame to the last, there is
 * no mapping left to apply, and the two .lrc files are byte-identical.
 *
 * It is a tombstone rather than a deletion for one reason: its defaults were
 * cut 126.8 / resume 123.0 / silence 8, and `--check` compared the sheet
 * against what THOSE SAME defaults produce — so if it survived as working
 * code, someone running it out of habit would silently re-splice the sheet
 * against an unspliced song and `--check` would call the result up to date.
 * Now it refuses instead. The mapping code is in git history if the splice
 * is ever reinstated (`git log -- scripts/lyrics-splice.mjs`), and the old
 * spliced audio is kept beside the song as
 * `public/audio/body-to-body-spliced.mp3`.
 *
 * ── Editing lyrics now ────────────────────────────────────────────────
 * `public/lyrics/body-to-body.lrc` is the sheet, pinned 1:1 to the recording.
 * `body-to-body-source.lrc` is an identical copy kept as the hand-pinned
 * original; edit either and copy it to the other (`cmp` them — they must be
 * byte-identical).
 */
console.error(
  [
    'lyrics-splice: RETIRED — the song is not spliced any more, so there is',
    'nothing to map. public/lyrics/body-to-body.lrc is pinned 1:1 to',
    'public/audio/body-to-body.mp3 and is byte-identical to',
    'public/lyrics/body-to-body-source.lrc. Edit the sheet directly and copy',
    'it to the other file. See the header of this file for the history.',
  ].join('\n'),
)
process.exit(1)
