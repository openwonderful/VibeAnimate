/**
 * timeline.ts — the FullVideo master timeline: which scene plays when,
 * derived from SCRIPT.md (V2, "Mountains to Stage"). Times in seconds.
 *
 * Every `key` is a scene-manifest key; `from`/`duration` follow the SCRIPT.md
 * section timings cited on each line. Total = 190s, matching the song.
 */
import { FPS } from '../scenes/manifest'

export type TimelineItem = {
  /** Scene manifest key. */
  key: string
  /** Start time in the master video, seconds. */
  from: number
  /** How long the scene plays, seconds. */
  duration: number
  /** In-point: skip this many seconds into the scene (blade/split support).
   *  The scene's local clock starts at offsetSec when the clip begins. */
  offsetSec?: number
  /** Extra props passed to the scene component in the master video only —
   *  scenes still see local time from 0, but can take timeline-specific
   *  configuration (e.g. 2.1-zoom's hold length) here. */
  props?: Record<string, unknown>
}

/*
 * ── The arithmetic, because it is the whole story of this file ────────
 *
 * Act 8 starts at 2:22 on "Everybody like you" and runs 48 seconds to the
 * end of the song. That is the one number nothing is allowed to move.
 *
 * Everything before it used to be squeezed against Acts 1–3, which ran to
 * 1:36 and left 46 seconds for Acts 4 through 7. Two cuts inside the flight
 * bought 28 of those seconds back:
 *
 *   - The journey home was thirty-one seconds of pure travelling — out of
 *     the bowl, back through the city, over the pass, across the valley and
 *     down onto the two of them on the road. It now plays in ten. Nothing
 *     was removed; the whole move is simply played about three times faster
 *     (see `storyTime` in actB/flight.ts).
 *   - The meal was fourteen seconds and needed seven.
 *
 * Acts 4–7 therefore get 1:07.5 → 2:22 — seventy-four seconds instead of
 * forty-six — and every beat that had been cut for time is back in the film:
 * both audition bookends, both halves of the road back, and the
 * apartment/empty-table mirror at full length.
 *
 * ── The order ────────────────────────────────────────────────────────
 * Act 5 now comes BEFORE Act 6, which is the way round the story actually
 * goes: the child leaves home, is alone in a city of strangers, and only
 * then walks into an audition room. Running the audition first made the
 * leaving read as a consequence of a decision the audience had not seen.
 *
 * The pins this buys back are almost exactly SCRIPT.md's own: the pat on
 * "우리만의 그 style", the wave on "두 눈을 감지 않을 이 밤", the streets on
 * "솟구치는 겨레의 마음", the apartment on the second chorus, the empty table
 * on "손에 손, 너와 나", 7.1 on 1:51 and 7.2 on 2:03.
 */
export const TIMELINE: TimelineItem[] = [
  // ACTS 1–3 — ONE TAKE, 0:00–1:06.3.
  //
  // Three slots, not one and not thirteen: windows into the same flight, so
  // played in order they are frame-identical to playing '?act=flight'
  // straight through, and three of them is the balance between giving
  // render:fast something to parallelise and not making the live film player
  // rebuild a WebGL canvas every few seconds.
  //
  // The boundaries are where the act changes its mind: at 0:26 the
  // travelling stops and the seven land, and at 0:37.5 the flight touches
  // down on the road behind the two of them.
  //
  // Slot 3 was 30s, then 28.8, and is 27.3: the meal at the end of it gives
  // 1.2s to Act 4's doorway. See FLIGHT_END in actB/flight.ts for why it
  // comes from here and not from anywhere else.
  //
  // The last 1.5s came off in two pieces, both of them holds rather than
  // moves. TREE_TRIM takes 0.5s out of the front of the tree beat, where the
  // shot was pushing in on two people sitting still for five seconds. The
  // other 1.0s is right here: the flight's picture ends at FLIGHT_FILM_END
  // (63.8) and this clip runs on past it with the camera parked on the
  // table, so shortening the clip shortens the meal and nothing else. That
  // parked hold was 2s and is 1s.
  { key: '1', from: 0, duration: 26 },      // the range → the city → over the rim
  { key: '2', from: 26, duration: 11.5 },   // the seven, then the whole way back out
  { key: '3', from: 37.5, duration: 27.3 }, // the road, the tree, the door, the table
  // ACT 4 — The Life Between (1:06.3–1:27). Twenty and a bit seconds.
  //
  // ── The doorway is the SPINE now, not the overture ───────────────────
  // 4.5 used to be one held 6.5s shot at the head of the act: a family
  // measuring their kid against the post three times while a century went
  // past behind the house. It read as one frame with a filter running over
  // it, because it was.
  //
  // It is three shots now — 4.5a/b/c, three windows on one montage
  // (act4/doorway.tsx) — and they are cut THROUGH the act rather than
  // stacked at the front of it, with the paired beats between them. That
  // does two things at once. It makes the act strictly chronological, and it
  // gives the pairs somewhere to have happened: the world visibly changes
  // across the three measures (the paddies drain, the towers go up, and by
  // the third there are no fields at all, just dirt), so the years between
  // "parent lifts child" and "child hands fruit down" are on the screen
  // instead of implied.
  //
  // ── 4.2r ─────────────────────────────────────────────────────────────
  // 4.2 was the only beat in the act with no mirror — SCRIPT.md's
  // "irreducible start". It has one now: the same room and the same camera,
  // a few years on, and the child walks OUT past the same kneeling
  // caregiver. It is Act 5's wave at a distance he can still come back from.
  //
  // ── What this costs, because it is not free ──────────────────────────
  // 4.6 loses its pin. It was on "It's so tight / 너와의 사이" at 1:19.4 and
  // it now plays at 1:17.4, two seconds early.
  //
  // The run from 4.6 to 4.10 filled 79.4 → 87.0 EXACTLY — 1.7 + 1.7 + 1.7 +
  // 2.5, no slack — with 4.10 nailed to "우리만의 그 style" at 84.5 and 5.1
  // to "두 눈을 감지 않을 이 밤" at 87.0. Putting the third measure between
  // 4.6 and 4.7 means something in that run gives, and moving 4.6 earlier is
  // cheaper than cutting three 1.7s beats down to 1.1s each — FILM.md
  // already lists those beats as the thinnest thing in the film. Everything
  // from 4.7 onward keeps the frame it had.
  //
  // ── WHERE THE 1.5s FROM ACT 3 WENT, AND WHY IT WENT HERE ─────────────
  // Nowhere else in the film will take it. Every beat from 4.5a onward is
  // pinned to a lyric — 4.5a on "Somebody like you, somebody like" at 70,
  // 4.4 on "Everybody like you", 4.10 on "우리만의 그 style", 5.1 on "두 눈을
  // 감지 않을 이 밤", and 8.55 nailed to 2:22 — so slack given to any of
  // them pushes a pin off its word. 4.2 and 4.3 are the only two beats in
  // the film that sit BEFORE the first pin and carry none of their own, so
  // they are where the act can start earlier without moving anything.
  //
  // They were the thinnest beats in the film at 2.0 and 1.7; they are 2.7
  // and 2.5 now, and 4.5a still begins on 70.0 to the frame.
  { key: '4.2', from: 64.8, duration: 2.7 },  // 1:04 first steps — into the arms
  { key: '4.3', from: 67.5, duration: 2.5 },  //      persimmon lift (before)
  { key: '4.5a', from: 70, duration: 2 },     // 1:10 first measure — the valley farmed
  { key: '4.2r', from: 72, duration: 1.7 },   //      first steps reversed — walking out
  { key: '4.4', from: 73.7, duration: 1.7 },  //      sickbed care (before)
  { key: '4.5b', from: 75.4, duration: 2 },   // 1:15 second measure — half the fields gone
  { key: '4.6', from: 77.4, duration: 1.7 },  //      sickbed reversed (after)
  { key: '4.5c', from: 79.1, duration: 2 },   // 1:19 third measure — no fields, just dirt
  { key: '4.7', from: 81.1, duration: 1.7 },  //      persimmon hand-down (after)
  { key: '4.9', from: 82.8, duration: 1.7 },  //      piggyback inversion (after)
  { key: '4.10', from: 84.5, duration: 2.5 }, // 1:25 "우리만의 그 style" — the pat
  // ACT 5 — SEPARATION (1:27–1:44). Seventeen seconds, and the mirror at the
  // end of it is intact again: 5.3 and 5.4 are the same shot in two worlds,
  // and they need the same length to read as one.
  //
  // 5.15 is the beat that used to be missing: he leaves a farmyard at dawn and
  // was in a city canyon at night one frame later, so the distance he crossed —
  // which is the whole substance of what he just did — was a cut. A second and
  // a half of one warm figure on the floor of the pass buys it back. It is
  // paid for out of 5.2, which was 5.5s and needed 4: its fisheye morph is
  // complete at 3.0 and the rest was hold. Everything downstream of it keeps
  // its pin, and the line 5.2 used to stand on — "솟구치는 겨레의 마음", the
  // surging heart of the people — now lands on the mountains instead, which is
  // a better home for it than a pavement.
  // 5.1 gives half a second to 5.2: the street now starts outside the canyon
  // mouth and walks IN, and that needs the room. 5.1 cuts while the
  // caregiver's hand is STILL UP — the "stays up one beat longer" read
  // survives by never being seen to end.
  //
  // 5.15 keeps its own half-second back: 1.0s was not enough to read a
  // figure crossing a pass, and the beat only works if you have time to see
  // the scale of the country he is walking through. 5.2 pays for it again,
  // and can: its morph still completes at 3.0 of the 3.4 it now has, so what
  // is lost is hold at the end of the shot, not any part of the move.
  // The act also carries the FIRST PHONE CALL now (6.4): eating alone and
  // calling home are one gesture, so the call sits directly on the 5.3/5.4
  // mirror — he eats alone, we see the table where nobody sits, he calls
  // her. The 3.1 seconds it needs come out of holds, not beats: 5.2's
  // fisheye morph is complete at 3.0 (the rest was always hold), the mirror
  // shots keep their equality at 3.3s each, and the waiting room gives 0.6.
  { key: '5.1', from: 87, duration: 3 },      // 1:27 "두 눈을 감지 않을 이 밤" — the wave
  { key: '5.15', from: 90, duration: 1.5 },   // 1:30 "솟구치는 겨레의 마음" — through the mountains
  { key: '5.2', from: 91.5, duration: 3.4 },  // 1:31.5 "Be about it" — the streets, walked into
  { key: '5.3', from: 94.9, duration: 3.3 },  // 1:36 "I need some body to body" — the apartment
  { key: '5.4', from: 98.2, duration: 3.3 },  //      "손에 손, 너와 나" — the empty table
  { key: '6.4', from: 101.5, duration: 3.1 }, // 1:41.5 phone call I — he calls home before the door
  // ACT 6 — THE AUDITION AND THE PAVEMENT (1:44–1:56.55). Thirteen seconds,
  // and both halves of the act are in the film again.
  //
  // 6.2 runs 6.85s. The orbit is unchanged (a complete 360°, finishing at 5.44)
  // and the hand still lands at 5.74 — "Somebody like you" opens at 1:50.7 and
  // the word "you" is the held G#4 at 1:51.74 (`POINT_LAND` in Act6_2.tsx).
  // What the extra 1.11s buys is the TAIL. The old six-second slot ended a
  // quarter of a second after the hand arrived, so the gesture the whole shot
  // is built around was cut off the moment it landed.
  //
  // The out-point is measured off the vocal, not chosen: "you" is held to
  // 112.08, the "ayy" is a short C5/C#5 at 112.10–112.22, a last B4 tail sits
  // at 112.60–112.70, and the phrase begins again at 113.20. It was 113.2 —
  // the last frame before the next "Somebody like you" — and is 112.85, which
  // is the 0.35s the director asked off the tail. That still clears the last
  // B4 tail at 112.70, so the trim lands inside the gap between phrases and
  // the cut is musically clean; what it costs is 0.35s of the held hand, not
  // any part of the gesture. Everything from 6.3 to 6.85 slides 0.35 earlier
  // with it — this timeline is gapless by invariant, so a trim here IS a
  // retime of the whole act.
  //
  // 6.3, the busking corner, is back, at 3.7s rather than the 1.5 it had when
  // it was dropped. It goes AFTER the audition and not before, and that order
  // is the story: he gets into the room, and then the seven of them play a
  // pavement in the rain that nobody stops on. The road filling up behind him
  // in 7.2 is the answer to this shot and to no other.
  { key: '6.1', from: 104.6, duration: 1.4 },  //        the waiting room
  { key: '6.2', from: 106, duration: 6.75 },   // 1:51.7 "Somebody like you, ayy" — the point, held
  { key: '6.3', from: 112.75, duration: 3.7 }, // 1:52.75 busking in the rain; nobody stops
  // ACT 6B — THE RISE, AND THE GRANDMOTHER (1:56.55 → 2:22). The new middle.
  //
  // This stretch replaces 7.1/7.2 in the cut (the scenes still exist; the
  // walk home is 7.4 now). The arc: his rise intercut with the grandmother —
  // every stage bigger, and in every one he finds the broadcast camera and
  // waves, because she is watching a screen full of seven identical boys and
  // the wave is how she knows which one is hers.
  //
  // THE SONG IS WHOLE. It used to cut at 126.8 and hold 8 seconds of true
  // silence under the death, then resume from source 123.0 (replaying
  // "Somebody like you, somebody like"), which put film = song + 11.8 for
  // everything after the gap. That splice is GONE: the film plays the
  // untouched recording, and film time == song time from the first frame to
  // the last. Nothing in this file needs a conversion any more, and any
  // number here that does not match the song's own clock is a bug.
  //
  // What that costs is picture, not music. The window the silence used to
  // hold open has to close, so 6.85 and 7.4 together own song 126.45 → 142.0
  // — 15.55 seconds for what was 27.0. That is 11.45s of picture cut here;
  // the remaining 0.35s of the film's 11.8s comes off 6.2's tail above.
  { key: '6.5', from: 116.45, duration: 2.9 },     // 1:56.45 "Somebody like you, ayy" — first gig, seven on stage; the wave finds the camera
  { key: '6.6', from: 119.35, duration: 3.9 },     //       the daytime interview — hello, in the background; she waves back at the set
  // 6.7 — THE ARENA — IS NO LONGER A SLOT. Its 3.1s went into 6.85, and so
  // did its staging: the pedestal broadcast camera out on the runway and the
  // six behind him are 6.85's stage beat now. The scene file stays (as 7.1
  // and 7.2 do) and still plays at ?act=6.7; it just is not in the cut.
  //
  // The reason is the one the arc was always about. He waves into a
  // broadcast lens at every stage he ever plays because that is how she
  // finds him on a screen full of seven identical boys. Playing that shot
  // whole at 2:03 and then playing a different, emptier stage after her
  // death spent the image twice. Once, at the end, into a camera nobody is
  // watching him through, is the shot.
  // 6.85 — ONE connected piece where 6.8/6.9/6.95 used to be three: the
  // call that ends it, in the grey city apartment — with the whole room to
  // itself now; the gray turn and the head sweeping down alone in the dark
  // (the HUDDLE is unlinked to the backlog — "remove the scene where there
  // are all hands around the character… go immediately to the award scene");
  // the stage from 0:20 rising around him ON the 130.93 vocal; the trophy on
  // a flare and STREAMER CANNONS from the deck edges; the wave that never
  // comes down; and then the camera ARCS around the standing man while the
  // world turns to countryside — no cut in any of it.
  //
  // It was 20.5s, then 9.05, and it is 12.25. The huddle's 1.6s went to the
  // call (0 → 7.68 outright) and the stage (7.68 → 11.45), per the notes
  // round of 2026-08-13: "more airtime for the call… more airtime for the
  // stage… the transition into the new scene is too soon".
  //
  // WHERE THE HOOKS LAND. 127.21 "Everybody like you, ayy" is the first
  // breath of the gold drain; 130.93 "Somebody like you, oh" IS the swap
  // frame — the vocal hits as the black turns into the stadium; 135.02
  // "Somebody like you, ayy" lands mid-arc, on the home valley wheeling in
  // around him. See act6b/Act6_85.tsx for the beat sheet.
  { key: '6.85', from: 123.25, duration: 12.25 },  // the call, the award stage, the wave; the camera arcs and the world turns to countryside
  // 7.4 — the walk home. Its FIRST frame continues 6.85's last (the arc has
  // just settled behind his shoulder; he stands on Z_START, still waving —
  // the wave releases in this scene's first quarter and the grandmother
  // rises at the sight of it); its LAST frame is still 8.55's
  // first (OPEN_CAM handoff). journey74.ts owns the walk and must agree
  // with this slot.
  //
  // IT KEEPS 6.5s, and that is deliberate: 6.85 absorbed the entire 11.45s.
  // journey74.ts's DUR is not a knob — Z_START, DECEL_T, T_OFF_74, the fov
  // ramp, the walker retiming and KEYS_74 are all hand-solved backwards from
  // it, and roadGate / clearing74 / porchGate must read exactly 0 on the
  // handoff frame or 8.55 does not get its exact first frame. Take time out
  // of here only with a full re-solve of that file.
  { key: '7.4', from: 135.5, duration: 6.5 },      // the road, the lit house, the chair
  // 8.55 is one 48s shot carrying the Arirang AND the finale, so it takes the
  // old Act 8 and Act 9 slots together. "Everybody like you" (source 2:22)
  // plays at film 142.0, because song time and film time are the same number
  // now. Its LENGTH never moved; only the clock under it did.
  { key: '8.55', from: 142, duration: 48 },        // "Everybody like you" → the end
]

// 190s = the untouched recording (189.768s, rounded up to the frame boundary
// the last shot needs). It was 201.8 while the song carried 8 seconds of
// spliced silence and a 3.8s replayed phrase.
export const TOTAL_DURATION_SEC = 190
export const TOTAL_DURATION_FRAMES = Math.round(TOTAL_DURATION_SEC * FPS)

// Sanity: the film is a continuous strip of song, so items must be
// sequential, non-overlapping AND gapless — a gap is a black frame, which is
// the one thing easier to ship by accident than to notice. Rounded to the
// millisecond, because these are hand-typed decimals.
const ms = (n: number) => Math.round(n * 1000)
for (let i = 1; i < TIMELINE.length; i++) {
  const prev = TIMELINE[i - 1]
  const end = ms(prev.from + prev.duration)
  const next = ms(TIMELINE[i].from)
  if (next < end) {
    throw new Error(`timeline overlap: '${prev.key}' runs past the start of '${TIMELINE[i].key}'`)
  }
  if (next > end) {
    throw new Error(
      `timeline gap: ${(next - end) / 1000}s of nothing between '${prev.key}' and '${TIMELINE[i].key}'`,
    )
  }
}
{
  const last = TIMELINE[TIMELINE.length - 1]
  if (ms(last.from + last.duration) !== ms(TOTAL_DURATION_SEC)) {
    throw new Error(
      `timeline ends at ${last.from + last.duration}s, but the film is ${TOTAL_DURATION_SEC}s (the song, untouched)`,
    )
  }
}
