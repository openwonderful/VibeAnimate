/**
 * Scene manifest — the single source of truth for every scene in the project.
 *
 * Everything derives from this list:
 *   - the live viewer's ?act= route map and navigator page (src/App.tsx)
 *   - the screenshot/sweep tooling's key list (scripts/lib/acts.mjs parses
 *     this file statically — keep entries one-per-line, key first)
 *   - Remotion video compositions (src/remotion/Root.tsx registers one
 *     composition per entry)
 *
 * Adding a scene = one file + one entry here. Nothing else to wire.
 *
 * NOTE for scripts/lib/acts.mjs: entries must stay in the literal form
 * `{ key: '...', ... }` inside the SCENES array — the tooling regex-parses
 * this file (it cannot execute TypeScript).
 */
import type { ComponentType } from 'react'

export const FPS = 30
/** Fallback composition length for scenes without an explicit duration. */
export const DEFAULT_DURATION_SEC = 20

export type SceneEntry = {
  /** Route key: ?act=<key> in the viewer, composition id (sanitised) in Remotion. */
  key: string
  /** Nav card label; defaults to the key. */
  label?: string
  /** Short human title (nav card sub-label). */
  title: string
  /** Nav row this scene belongs to (must match a SCENE_GROUPS name). */
  group: string
  /** Render with the purple "transition" card style in the nav. */
  transition?: boolean
  /** false = routable via ?act= but hidden from the navigator page. */
  nav?: boolean
  /** Video length in seconds (Remotion composition duration). */
  durationSec?: number
  /** Lazy module import — the scene component must be the default export. */
  load: () => Promise<{ default: ComponentType }>
}

export type SceneGroup = {
  name: string
  title: string
  /** Secondary section (rendered below the main act rows with a divider). */
  section?: boolean
}

export const SCENE_GROUPS: SceneGroup[] = [
  // The whole film, top of the page. This is the thing being built; every
  // row under it is a piece of it, and the pieces are only interesting
  // because of where they land in here.
  // No length in this title. It said "0:00 → 3:10", then became 3:21.8 the
  // moment the silence was spliced into the song, and is 3:10 again now the
  // splice is gone — which is exactly why the number does not belong in a
  // group title. The row underneath already prints the real duration off the
  // entry's own durationSec.
  { name: 'Film', title: 'Every act in sequence, with the song' },
  // Acts 1–3 are ONE take. The flight through the range, the city, the
  // stadium and back out across the valley to the table used to be its own
  // "Act B" while the old scene-per-beat opening sat alongside it; the old
  // opening is in Legacy now and the flight IS Acts 1, 2 and 3. The act
  // boundaries are cuts in the edit, not seams in the world — 1→2 is where
  // the travelling stops and the seven land, 2→3 is the chorus at 0:44.99.
  { name: 'Act 1', title: 'The Approach — the range, the city, the stadium (0:00–0:26)' },
  { name: 'Act 2', title: 'The Show — the seven, and the way back out (0:26–0:37.5)' },
  { name: 'Act 3', title: 'Coming Home — the valley, the road, the table (0:37.5–1:04.8)' },
  { name: 'Act 4', title: 'The Life Between' },
  { name: 'Act 5', title: 'Separation' },
  { name: 'Act 6', title: 'The Audition' },
  // The rise-and-grandmother arc: 1:56.55 → the walk home. The wave into the
  // broadcast camera is the spine. The song used to CUT here — 8 seconds of
  // silence under the death — and it does not any more: the film plays the
  // untouched recording, film time == song time, and the death rides the
  // hooks like everything around it.
  { name: 'Act 6B', title: 'The Rise, and the Grandmother' },
  { name: 'Act 7', title: 'Somebody Like You' },
  // Act 8.55 is one 48s shot covering both the Arirang and the finale, so
  // there is no longer a separate Act 9 — its two scenes live in Legacy.
  { name: 'Act 8', title: 'Arirang → The Finale' },
  { name: 'Act 9', title: 'The Finale' },
  { name: 'Fable ✦', title: 'Fable recreations — every canonical beat, rebuilt' },
  { name: 'Studio', title: 'Flow Studio — worlds, shader labs & story' },
  // Design sheets and studies that are not in the cut and are not drafts of
  // anything that is. The lantern line lives here: it is a whole parallel
  // idea for Act 8, not an iteration of 8.55.
  { name: 'Lab', title: 'Design sheets and studies — not in the cut', section: true },
  { name: 'Archive', title: 'Previous scene versions', section: true },
  { name: 'Homages', title: 'Film / scene tributes', section: true },
  { name: '아리랑', title: 'Arirang Symbol Animations', section: true },
  { name: 'Figures', title: 'Character Figure Variations', section: true },
  { name: 'Legacy', title: 'Legacy scenes', section: true },
  { name: 'Gemini Auto', title: 'Gemini Agent Rebuilds', section: true },
]

export const SCENES: SceneEntry[] = [
  // ── Studio: shared worlds, shader labs, story film ──────────
  { key: 'world.dusk', title: 'Lantern Valley — Dusk (wide)', group: 'Studio', durationSec: 10, load: () => import('../studio/worlds/LanternValley/shots/ValleyDusk') },
  { key: 'world.night', title: 'Lantern Valley — Lane (night)', group: 'Studio', durationSec: 10, load: () => import('../studio/worlds/LanternValley/shots/LanternLaneNight') },
  { key: 'world.dawn', title: 'Lantern Valley — Shrine (dawn)', group: 'Studio', durationSec: 10, load: () => import('../studio/worlds/LanternValley/shots/ShrineDawn') },
  { key: 'lab.toon', title: 'Toon Shader Lab', group: 'Studio', durationSec: 12, load: () => import('../studio/lab/ToonLab') },
  { key: 'lab.manip', title: 'Manipulation Lab', group: 'Studio', durationSec: 12, load: () => import('../studio/lab/ManipLab') },
  { key: 'fx.letterbox', title: 'Letterbox + Grain (overlay)', group: 'Studio', durationSec: 60, load: () => import('../studio/fx/Letterbox') },
  { key: 'story.1', title: 'Waking the Lanterns', group: 'Studio', durationSec: 10, load: () => import('../studio/story/shots/S1_WakingTheLanterns') },
  { key: 'story.2', title: 'The Follower', group: 'Studio', durationSec: 10, load: () => import('../studio/story/shots/S2_TheFollower') },
  { key: 'story.2-B', title: 'The Follower (anime toon)', group: 'Studio', durationSec: 10, load: () => import('../studio/story/shots/S2_TheFollower_Toon') },
  { key: 'story.3', title: 'The Bridge', group: 'Studio', durationSec: 10, load: () => import('../studio/story/shots/S3_TheBridge') },
  { key: 'story.4', title: 'The Climb', group: 'Studio', durationSec: 10, load: () => import('../studio/story/shots/S4_TheClimb') },
  { key: 'story.5', title: 'The Passing', group: 'Studio', durationSec: 10, load: () => import('../studio/story/shots/S5_ThePassing') },
  { key: 'story.6', title: 'First Light', group: 'Studio', durationSec: 10, load: () => import('../studio/story/shots/S6_FirstLight') },
  { key: 'story.1-B', title: 'Waking the Lanterns (anime)', group: 'Studio', durationSec: 10, load: () => import('../studio/story/shots/S1_WakingTheLanterns_Toon') },
  { key: 'story.3-B', title: 'The Bridge (anime)', group: 'Studio', durationSec: 10, load: () => import('../studio/story/shots/S3_TheBridge_Toon') },
  { key: 'story.4-B', title: 'The Climb (anime)', group: 'Studio', durationSec: 10, load: () => import('../studio/story/shots/S4_TheClimb_Toon') },
  { key: 'story.5-B', title: 'The Passing (anime)', group: 'Studio', durationSec: 10, load: () => import('../studio/story/shots/S5_ThePassing_Toon') },
  { key: 'story.6-B', title: 'First Light (anime)', group: 'Studio', durationSec: 10, load: () => import('../studio/story/shots/S6_FirstLight_Toon') },
  // ── The film ────────────────────────────────────────────────
  // 190 is TOTAL_DURATION_SEC from src/remotion/timeline.ts, typed out rather
  // than imported: this file is regex-parsed by the tooling (scripts/lib/acts.mjs
  // and the Remotion registration in remotion/Root.tsx read these lines as
  // literals), so the number has to be here in the row. It is the ONE entry
  // in this list that has to be kept in step with another file by hand —
  // change the timeline's total and this needs the same edit or ?act=film and
  // the 'film' composition run past the end of the last slot on a frozen 8.55.
  { key: 'film', label: 'FILM', title: 'Every act in sequence, with the song', group: 'Film', durationSec: 190, load: () => import('./FullFilm') },
  // ── Acts 1–3: one take ──────────────────────────────────────
  // Every key from here to 3.4 is a WINDOW into the same 96-second flight
  // (src/scenes/actB/flight.ts) — `makeFlightScene(offset)` reads its
  // opening camera pose out of the flight itself, so a window opens on
  // exactly the frame the previous one closed on and playing them back to
  // back is frame-identical to playing 'flight' straight through. Retiming any
  // of it means editing KEYS in flight.ts and nothing else.
  // NOT keyed '1-3': composition ids replace every non-alphanumeric with a
  // dash, so '1-3' and '1.3' would both sanitise to '1-3' and Root.tsx would
  // (correctly) refuse to build. The viewer does not sanitise, so a clash
  // like that renders fine in the browser and only fails at render time.
  { key: 'flight', label: '1–3', title: 'Acts 1–3 — the whole take, 0:00–1:03.8', group: 'Act 1', durationSec: 63.8, load: () => import('./actB/Flight') },
  { key: '1', title: 'The Approach (0:00–0:26)', group: 'Act 1', durationSec: 26, load: () => import('./actB/Act1') },
  { key: '1.1', title: 'The Range', group: 'Act 1', durationSec: 8, load: () => import('./actB/Act1_1') },
  { key: '1.2', title: 'The City', group: 'Act 1', durationSec: 8, load: () => import('./actB/Act1_2') },
  { key: '1.3', title: 'The Stadium', group: 'Act 1', durationSec: 4.4, load: () => import('./actB/Act1_3') },
  { key: '1.4', title: 'Inside', group: 'Act 1', durationSec: 5.6, load: () => import('./actB/Act1_4') },
  // Variants. Same world, same clock, an alternate camera over 0:07.5–0:20.3
  // only (src/scenes/actB/flightApproachB.ts) — nothing the film renders.
  // This is the approach the film USED to have: it slows into the stadium,
  // leans early and half as far, and hangs all four words on the axis. The
  // cut that replaced it is in flight.ts and plays at '1' / '1.2'.
  { key: '1-B', title: 'The Approach — alt cut (the decelerating arrival)', group: 'Act 1', durationSec: 26, load: () => import('./actB/Act1B') },
  { key: '1.2-B', title: 'The City + The Wall — alt cut, high and slowing (0:08–0:22)', group: 'Act 1', durationSec: 14, load: () => import('./actB/Act1_2B') },
  { key: '2', title: 'The Show (0:26–0:37.5)', group: 'Act 2', durationSec: 11.5, load: () => import('./actB/Act2') },
  { key: '2.1', title: 'The Seven', group: 'Act 2', durationSec: 5, load: () => import('./actB/Act2_1') },
  { key: '2.2', title: 'Pull Out — the whole way home', group: 'Act 2', durationSec: 6.5, load: () => import('./actB/Act2_2') },
  { key: '3', title: 'Coming Home (0:37.5–1:04.8)', group: 'Act 3', durationSec: 27.3, load: () => import('./actB/Act3') },
  { key: '3.1', title: 'The Valley — golden hour', group: 'Act 3', durationSec: 3, load: () => import('./actB/Act3_1') },
  { key: '3.2', title: 'The Tree — and the sky', group: 'Act 3', durationSec: 11.5, load: () => import('./actB/Act3_2') },
  { key: '3.3', title: 'The Road Home', group: 'Act 3', durationSec: 6, load: () => import('./actB/Act3_3') },
  { key: '3.4', title: 'The Table', group: 'Act 3', durationSec: 5.8, load: () => import('./actB/Act3_4') },
  // ── Gemini Auto ───────────────────────────────────────────────────
  { key: 'g1', title: 'Act 1 Rebuild', group: 'Gemini Auto', durationSec: 13, load: () => import('../scenes_gemini/act1/Scene1') },
  { key: 'g2', title: 'Act 2 Rebuild', group: 'Gemini Auto', load: () => import('../scenes_gemini/act2/Scene2') },
  { key: 'g3', title: 'Act 3 Rebuild', group: 'Gemini Auto', load: () => import('../scenes_gemini/act3/Scene3') },
  // ── Archive ─────────────────────────────────────────────────
  { key: '4.1', label: '4.1 (retired)', title: 'Industrial Timelapse — absorbed into 4.5', group: 'Archive', durationSec: 6, load: () => import('./act4/Act4_1') },
  // ── Act 4 ───────────────────────────────────────────────────
  { key: '4.2', title: 'First Steps', group: 'Act 4', durationSec: 2.7, load: () => import('./act4/Act4_2') },
  { key: '4.2r', title: 'First Steps, Reversed — walking out', group: 'Act 4', durationSec: 1.7, load: () => import('./act4/Act4_2r') },
  { key: '4.3', title: 'Persimmon Lift', group: 'Act 4', durationSec: 2.5, load: () => import('./act4/Act4_3') },
  { key: '4.4', title: 'Sickbed Care', group: 'Act 4', durationSec: 1, load: () => import('./act4/Act4_4') },
  { key: '4.5', title: 'The Doorway — growing up (one shot, superseded by 4.5a/b/c)', group: 'Act 4', durationSec: 7, load: () => import('./act4/Act4_5') },
  { key: '4.5a', title: 'The Doorway — first measure', group: 'Act 4', durationSec: 2, load: () => import('./act4/Act4_5a') },
  { key: '4.5b', title: 'The Doorway — second measure', group: 'Act 4', durationSec: 2, load: () => import('./act4/Act4_5b') },
  { key: '4.5c', title: 'The Doorway — third measure', group: 'Act 4', durationSec: 2, load: () => import('./act4/Act4_5c') },
  { key: '4.6', title: 'Sickbed Reversed', group: 'Act 4', durationSec: 1, load: () => import('./act4/Act4_6') },
  { key: '4.7', title: 'Persimmon Hand-down', group: 'Act 4', durationSec: 1, load: () => import('./act4/Act4_7') },
  { key: '4.9', title: 'Piggyback Inversion', group: 'Act 4', durationSec: 1, load: () => import('./act4/Act4_9') },
  { key: '4.10', title: 'The Pat', group: 'Act 4', durationSec: 1.8, load: () => import('./act4/Act4_10') },
  // ── Act 5 ───────────────────────────────────────────────────
  { key: '6.1', title: 'The Waiting Room', group: 'Act 6', durationSec: 2.6, load: () => import('./act6/Act6_1') },
  // 6.2 is 6.75s, not 7.2: 0.35s off the tail for the un-splice and another
  // 0.10 for 6.85's transition, both taken from the hold after the hand
  // lands and neither from the gesture. The timeline is gapless, so those
  // trims are what slide 6.3 and everything after them earlier.
  // (Act6_2.tsx's own SHOT_DUR has to agree — it is not this file's to set.)
  { key: '6.2', title: 'The Audition', group: 'Act 6', durationSec: 6.75, load: () => import('./act6/Act6_2') },
  { key: '6.3', title: 'Busking — nobody stops', group: 'Act 6', durationSec: 3.7, load: () => import('./act6/Act6_3') },
  // ── Act 6B: the rise, and the grandmother ───────────────────────
  { key: '6.4', title: 'Phone Call I — before the door', group: 'Act 6B', durationSec: 3.1, load: () => import('./act6b/Act6_4') },
  { key: '6.5', title: 'Small Stage — first gig', group: 'Act 6B', durationSec: 2.9, load: () => import('./act6b/Act6_5') },
  { key: '6.6', title: 'The Interview — hello, in the background', group: 'Act 6B', durationSec: 3.9, load: () => import('./act6b/Act6_6') },
  { key: '6.7', title: 'Arena — the wave into the lens', group: 'Act 6B', durationSec: 3.1, load: () => import('./act6b/Act6_7') },
  { key: '6.8', title: 'The Last Call', group: 'Act 6B', durationSec: 8, load: () => import('./act6b/Act6_8') },
  { key: '6.9', title: 'Gray Montage — the world keeps moving', group: 'Act 6B', durationSec: 8, load: () => import('./act6b/Act6_9') },
  { key: '6.95', title: 'The Trophy', group: 'Act 6B', durationSec: 5.5, load: () => import('./act6b/Act6_95') },
  // Not "The Silence" any more — there is no silence. The song plays straight
  // through the death now, and the clip is 9.05s where it was 20.5: it was
  // the only scene in the film whose length was set by an audio edit.
  { key: '6.85', title: 'The Call — apartment, huddle, arena, trophy, one piece', group: 'Act 6B', durationSec: 12.25, load: () => import('./act6b/Act6_85') },
  { key: '5.1', title: 'The Wave', group: 'Act 5', durationSec: 4, load: () => import('./act5/Act5_1') },
  { key: '5.15', title: 'Through the Mountains', group: 'Act 5', durationSec: 1.5, load: () => import('./act5/Act5_15') },
  { key: '5.2', title: 'The Streets', group: 'Act 5', durationSec: 8, load: () => import('./act5/Act5_2') },
  { key: '5.3', title: 'The Apartment', group: 'Act 5', durationSec: 7, load: () => import('./act5/Act5_3') },
  { key: '5.4', title: 'The Empty Table', group: 'Act 5', durationSec: 8, load: () => import('./act5/Act5_4') },
  // ── Act 7 ───────────────────────────────────────────────────
  { key: '7.1', title: 'The Road Back — Dusk', group: 'Act 7', durationSec: 10, load: () => import('./act7r/Act7_1') },
  { key: '7.2', title: 'The Road Back — Night', group: 'Act 7', durationSec: 15.1, load: () => import('./act7r/Act7_2') },
  { key: '7.3', title: 'Night Market — Fireworks (test)', group: 'Act 7', durationSec: 14, load: () => import('./act7r/Act7_3') },
  { key: '7.4', title: 'The Walk Home', group: 'Act 7', durationSec: 6.5, load: () => import('./act7r/Act7_4') },
  // ── Act 8 ───────────────────────────────────────────────────
  // 8.55 is the shipping cut — one 48s shot that carries the Arirang and the
  // finale together. 8, 8.5 and 8.51–8.54 are the iterations that led to it
  // and now live in Legacy; 8b is a separate idea, not a draft of this one.
  { key: '8.55', title: 'Ascension VI — Ocean of People', group: 'Act 8', durationSec: 48, load: () => import('./act8_55/Act8_55') },
  // 8.56 is 8.51's camera (the decisive beat-landing pan up) over 8.55's
  // world — the base the finale gets edited from now.
  { key: '8.56', title: 'Ascension VII — Ignition Return', group: 'Act 8', durationSec: 48, load: () => import('./act8_56/Act8_56') },
  // ── Lab ─────────────────────────────────────────────────────
  // The lantern line. 8b is a separate IDEA for Act 8 — a release of paper
  // lanterns rather than an ascension of people — and the rest are its
  // design sheets: shape studies, the palette sets, and the reference-match
  // plate. None of it is in the cut and none of it is a draft of 8.55, so it
  // does not belong under Act 8 or in Archive.
  { key: '8b', title: 'The Lantern Release', group: 'Lab', durationSec: 48, load: () => import('./act8b/Act8b') },
  { key: '8b-lab', title: 'Lantern Lab — design sheet', group: 'Lab', durationSec: 12, load: () => import('./act8b/LanternLab') },
  { key: '8b-lab2', title: 'Lantern Lab II — Tangled set', group: 'Lab', durationSec: 12, load: () => import('./act8b/LanternLab2') },
  { key: '8b-air', title: 'In the Air — the mix', group: 'Lab', durationSec: 20, load: () => import('./act8b/LanternAir') },
  { key: '8b-air-drum', title: 'In the Air — drums only', group: 'Lab', durationSec: 20, load: () => import('./act8b/LanternAirDrum') },
  { key: '8b-air-act1', title: 'In the Air — Act 1 lanterns only', group: 'Lab', durationSec: 20, load: () => import('./act8b/LanternAirAct1') },
  { key: '8b-air-tangled', title: 'In the Air — multicoloured (Tangled set)', group: 'Lab', durationSec: 20, load: () => import('./act8b/LanternAirTangled') },
  { key: '8b-plate', title: 'The Plate — reference match', group: 'Lab', durationSec: 20, load: () => import('./act8b/LanternPlate') },
  { key: 'char-hats', label: 'Hats', title: 'The parent’s hat — six, side by side', group: 'Lab', durationSec: 12, load: () => import('./characters/HatStudy') },
  // ── Homages ─────────────────────────────────────────────────
  { key: 'yourname', label: 'Your Name', title: '君の名は zoom', group: 'Homages', load: () => import('./yourname/YourNameScene') },
  { key: 'yourname_replicate', label: 'Your Name Replica', title: 'procedural reconstruction', group: 'Homages', load: () => import('./yourname_replicate/YourNameReplicateScene') },
  { key: 'yourname_cutouts', label: 'Your Name Cutouts', title: 'layered parallax', group: 'Homages', load: () => import('./yourname_cutouts/YourNameCutoutsScene') },
  // ── Legacy ──────────────────────────────────────────────────
  //
  // THE RETIRED OPENING. Acts 1, 2 and 3 used to be eleven separate scenes
  // stitched together — a DOM depth-chain of SVG mountain layers, a 3D city
  // built as flat rows, a CSS portal that punched a pre-rendered stadium
  // over the top, and then three hand-cut scenes for the road home. All of
  // it is replaced by one continuous flight through a single world, so none
  // of it is in the film any more.
  //
  // They are keyed by what they ARE rather than by the act numbers they used
  // to own, because those numbers belong to the flight now. Nothing in the
  // timeline references them; they are here to be looked at.
  { key: 'old-mountains', title: 'The mountains (SVG) — was 1.1', group: 'Legacy', durationSec: 13, load: () => import('./act1/Scene1') },
  { key: 'old-mountains-lanterns', title: 'Mountains + lanterns (2D+3D) — was 1.1-B', group: 'Legacy', load: () => import('./act1/Scene1_B') },
  { key: 'old-mountains-city', title: 'Mountains → city, full — was 1.1-C', group: 'Legacy', load: () => import('./act1/Scene1_StarsToCity') },
  { key: 'old-mountains-stars3d', title: 'Mountains + 3D stars — was 1.1-D', group: 'Legacy', load: () => import('./act1/Scene1_D') },
  { key: 'old-depth-chain', title: 'The depth chain, mountains → stadium — was 1.2', group: 'Legacy', durationSec: 21, load: () => import('./zoom/DepthComposition') },
  { key: 'old-stadium', title: 'The stadium (SVG) — was 2.1', group: 'Legacy', durationSec: 11, load: () => import('./act2/Scene2') },
  { key: 'old-stadium-dive', title: 'The dive to the stage — was 2.1-zoom', group: 'Legacy', transition: true, durationSec: 16, load: () => import('./act2/Act2Zoom') },
  { key: 'old-arirang-cosmos', title: 'Arirang cosmos backdrop — was 2.2', group: 'Legacy', durationSec: 15, load: () => import('./act2/Act2_2_B') },
  { key: 'old-seven-stage', title: 'The seven on the stage — was 2.2-B', group: 'Legacy', load: () => import('./act2/Act2_2') },
  { key: 'old-stage-to-mountains', title: 'Stage → mountains, the way out — was 2.3', group: 'Legacy', transition: true, durationSec: 14, load: () => import('./act2/Act2_3') },
  { key: 'old-stage-to-mountains-prev', title: 'Stage → mountains, earlier — was 2.3-old', group: 'Legacy', load: () => import('./act2/Act2_3_Old') },
  { key: 'old-road-sunset', title: 'The sunset road — was 3.1', group: 'Legacy', durationSec: 8, load: () => import('./act3/Act3_1') },
  { key: 'old-road-night', title: 'Night, child on shoulders — was 3.2', group: 'Legacy', durationSec: 7, load: () => import('./act3/Act3_2') },
  { key: 'old-table', title: 'The table — was 3.3', group: 'Legacy', durationSec: 16, load: () => import('./act3/Act3_3') },
  { key: 'old-road-arcane', title: 'Sunset road, Arcane style', group: 'Legacy', nav: false, load: () => import('./act3/Act3_1_Arcane') },
  { key: 'old-road-spiderverse', title: 'Sunset road, Spider-Verse style', group: 'Legacy', nav: false, load: () => import('./act3/Act3_1_SpiderVerse') },
  { key: 'old-svg-stage', title: 'The SVG stage — was 2.2-old', group: 'Legacy', load: () => import('./act2/Scene3') },
  { key: '3-old', title: 'Scene 3 old', group: 'Legacy', load: () => import('./act2/Scene3Old') },
  { key: '3-afterimage', title: 'Afterimage', group: 'Legacy', nav: false, load: () => import('./act2/Scene3Afterimage') },
  { key: '3-lightpaint', title: 'Light paint', group: 'Legacy', load: () => import('./act2/Scene3LightPaint') },
  { key: '3-lightpaint-dance', title: 'Light paint dance', group: 'Legacy', nav: false, load: () => import('./act2/Scene3LightPaintDance') },
  { key: '3-lightpaint-dance2', title: 'Light paint dance 2', group: 'Legacy', nav: false, load: () => import('./act2/Scene3LightPaintDance2') },
  { key: '3-brush', title: 'Brush', group: 'Legacy', nav: false, load: () => import('./act2/Scene3Brush') },
  { key: '3-constellation', title: 'Constellation', group: 'Legacy', load: () => import('./act2/Scene3Constellation') },
  // Style studies for the old sunset road. The flight's valley inherited the
  // look that came out of these.
  { key: 'old-road-kuwahara', title: 'Sunset road, watercolor', group: 'Legacy', load: () => import('./act3/Act3_1_Kuwahara') },
  { key: 'old-road-painterly', title: 'Sunset road, painterly stack', group: 'Legacy', load: () => import('./act3/Act3_1_Painterly') },
  { key: 'old-road-linocut', title: 'Sunset road, linocut print', group: 'Legacy', load: () => import('./act3/Act3_1_Linocut') },
  { key: 'old-table-alt', title: 'The table (alt) — was 3.3-B', group: 'Legacy', load: () => import('./act3/Act3_3_B') },
  // 4.1 style studies + the pre-timeline 18s draft of the timelapse.
  { key: '4.1-B', title: '4.1 draft (18s)', group: 'Legacy', load: () => import('./act4/Act4_1_B') },
  { key: '4.1-C', title: '4.1 Cell-Shaded Toon', group: 'Legacy', load: () => import('./act4/Act4_1_C') },
  { key: '4.1-Sobel', title: '4.1 Sobel Line Art', group: 'Legacy', load: () => import('./act4/Act4_1_Sobel') },
  { key: '4.1-Halftone', title: '4.1 Comic Halftone', group: 'Legacy', load: () => import('./act4/Act4_1_Halftone') },
  { key: '4.1-Matcap', title: '4.1 Matcap Art', group: 'Legacy', load: () => import('./act4/Act4_1_Matcap') },
  { key: '4.1-ASCII', title: '4.1 ASCII Render', group: 'Legacy', load: () => import('./act4/Act4_1_ASCII') },
  { key: '4.1-Kuwahara', title: '4.1 Watercolor', group: 'Legacy', load: () => import('./act4/Act4_1_Kuwahara') },
  { key: '4.1-Painterly', title: '4.1 Painterly Stack', group: 'Legacy', load: () => import('./act4/Act4_1_Painterly') },
  { key: '4.1-Linocut', title: '4.1 Linocut Print', group: 'Legacy', load: () => import('./act4/Act4_1_Linocut') },
  // Act 5's whole-act drafts and the slow-fisheye street variant — 5.1–5.4
  // are the shipping version of that stretch (5.2 carries the quick fisheye
  // itself now).
  { key: '5', title: 'Leaving (legacy)', group: 'Legacy', load: () => import('./act5/Act5') },
  { key: '5-B', title: 'Threshold (legacy)', group: 'Legacy', load: () => import('./act5/Act5_B') },
  { key: '5.2-B', title: 'Streets (fisheye)', group: 'Legacy', load: () => import('./act5/Act5_2_B') },
  // 6's whole-act road, its alternate, and the two Somebody cuts — 6.1–6.3
  // and 7.1–7.3 are the shipping version of that stretch, these are what it
  // was before.
  { key: '6', title: 'Empty Road', group: 'Legacy', durationSec: 3, load: () => import('./act6/Act6') },
  { key: '6-B', title: 'Empty Road (alt)', group: 'Legacy', load: () => import('./act6/Act6_B') },
  { key: '7', title: 'Somebody (archive)', group: 'Legacy', durationSec: 31, load: () => import('./act7/Act7') },
  { key: '7-B', title: 'Somebody (alt)', group: 'Legacy', load: () => import('./act7/Act7_B') },
  // The Ascension line — six iterations, superseded by 8.55.
  { key: '8', title: 'Arirang', group: 'Legacy', durationSec: 34, load: () => import('./act8/Act8') },
  { key: '8-B', title: 'Arirang (alt)', group: 'Legacy', load: () => import('./act8/Act8_B') },
  { key: '8.5', title: 'Ascension I', group: 'Legacy', durationSec: 48, load: () => import('./act8_5/Act8_5') },
  { key: '8.51', title: 'Ascension II — Ignition', group: 'Legacy', durationSec: 48, load: () => import('./act8_51/Act8_51') },
  { key: '8.52', title: 'Ascension III — Long Ascent', group: 'Legacy', durationSec: 48, load: () => import('./act8_52/Act8_52') },
  { key: '8.53', title: 'Ascension IV — The Vast Field', group: 'Legacy', durationSec: 48, load: () => import('./act8_53/Act8_53') },
  { key: '8.54', title: 'Ascension V — Pulse', group: 'Legacy', durationSec: 48, load: () => import('./act8_54/Act8_54') },
  // 8.55 as it stood before it moved into Act B's valley — its own ground, its
  // own sky, and the shot still looking UP the road. Frozen for comparison.
  { key: '8.55-old', title: 'Ascension VI — old (pre-valley)', group: 'Legacy', durationSec: 48, load: () => import('./act8_55_old/Act8_55') },
  // 8.55 exactly as it stood before the tail's 111° azimuth sweep was taken
  // out of the camera and put into the sky. A whole-directory copy, so it
  // keeps its own CameraRig, its own sky and its own world and cannot be
  // changed from under itself by later work on the live act. Frozen for
  // comparison: ?act=8.55-P against ?act=8.55, same t.
  { key: '8.55-P', title: 'Ascension VI — before the sky turn', group: 'Legacy', durationSec: 48, load: () => import('./act8_55_prev/Act8_55') },
  // The old standalone finale — absorbed into 8.55.
  { key: '9', title: 'Finale', group: 'Legacy', durationSec: 14, load: () => import('./act9/Act9') },
  { key: '9-B', title: 'Finale (alt)', group: 'Legacy', load: () => import('./act9/Act9_B') },
  // ── 아리랑 ─────────────────────────────────────────────────────
  { key: 'arirang_symbol', label: 'Static', title: 'No animation', group: '아리랑', load: () => import('./arirang/ArirangSymbol') },
  { key: 'arirang_animated', label: 'v1', title: 'Full effects', group: '아리랑', load: () => import('./arirang/ArirangSymbolAnimated') },
  { key: 'arirang_v1.1', label: 'v1.1', title: 'Cleaned up', group: '아리랑', load: () => import('./arirang/ArirangSymbolAnimatedV2') },
  { key: 'arirang_ink', label: 'Ink Wash', title: '수묵화', group: '아리랑', load: () => import('./arirang/ArirangAnimatedInkWash') },
  { key: 'arirang_water', label: 'Moon Water', title: '달빛', group: '아리랑', load: () => import('./arirang/ArirangAnimatedMoonWater') },
  { key: 'arirang_smoke', label: 'Smoke', title: '향', group: '아리랑', load: () => import('./arirang/ArirangAnimatedSmoke') },
  { key: 'arirang_calligraphy', label: 'Calligraphy', title: '서예', group: '아리랑', load: () => import('./arirang/ArirangAnimatedCalligraphy') },
  { key: 'arirang_zen', label: 'Zen Ripple', title: '파문', group: '아리랑', load: () => import('./arirang/ArirangAnimatedZenRipple') },
  // ── Figures ─────────────────────────────────────────────────
  { key: 'char-crystal', label: 'Crystal', title: 'Geometric facets', group: 'Figures', load: () => import('./characters/CharCrystal') },
  { key: 'char-silhouette', label: 'Silhouette', title: 'Paper-cut backlit', group: 'Figures', load: () => import('./characters/CharSilhouette') },
  { key: 'char-particle', label: 'Particle', title: 'Gold stardust', group: 'Figures', load: () => import('./characters/CharParticle') },
  { key: 'char-wireframe', label: 'Wireframe', title: 'Hologram', group: 'Figures', load: () => import('./characters/CharWireframe') },
  { key: 'char-brushstroke', label: 'Brush', title: 'Calligraphy', group: 'Figures', load: () => import('./characters/CharBrushStroke') },
  { key: 'char-human-a', label: 'Human A', title: 'Male idle', group: 'Figures', load: () => import('./characters/CharHumanA') },
  { key: 'char-human-b', label: 'Human B', title: 'Female idle', group: 'Figures', load: () => import('./characters/CharHumanB') },
  { key: 'char-gallery', label: 'Gallery', title: 'All side-by-side', group: 'Figures', load: () => import('./characters/CharGallery') },
  { key: 'char-stick-gold', label: 'Stick Gold', title: 'Classic gold', group: 'Figures', load: () => import('./characters/CharStickGold') },
  { key: 'char-stick-neon', label: 'Stick Neon', title: 'Mannequin', group: 'Figures', load: () => import('./characters/CharStickNeon') },
  { key: 'char-stick-gold2', label: 'Stick Gold 2', title: 'Dynamic pose', group: 'Figures', load: () => import('./characters/CharStickGold2') },
  { key: 'char-stick-gold3', label: 'Stick Gold 3', title: 'Shorter legs', group: 'Figures', load: () => import('./characters/CharStickGold3') },
  { key: 'char-stick-gold4', label: 'Stick Gold 4', title: 'Yeats proportions', group: 'Figures', load: () => import('./characters/CharStickGold4') },
  { key: 'char-stick-gold5', label: 'Stick Gold 5', title: 'Yeats + dynamic pose', group: 'Figures', load: () => import('./characters/CharStickGold5') },
  { key: 'char-stick-gold5k', label: 'Stick Gold 5K', title: 'Keyframe dance', group: 'Figures', load: () => import('./characters/CharStickGold5K') },
  { key: 'char-stick-gold5r', label: 'Stick Gold 5R', title: 'Rigged walk cycle', group: 'Figures', load: () => import('./characters/CharStickGold5R') },
  { key: 'char-stick-gold5g', label: 'Stick Gold 5G', title: 'Glowing body', group: 'Figures', load: () => import('./characters/CharStickGold5G') },
  { key: 'char-stick-gallery', label: 'Stick Gallery', title: 'Sticks only', group: 'Figures', load: () => import('./characters/StickGallery') },
]

export function sceneByKey(key: string): SceneEntry | undefined {
  return SCENES.find(s => s.key === key)
}

/**
 * Start fetching a scene's module without mounting it.
 *
 * A scene is a dynamic import, so the first time the playhead reaches a
 * clip the browser has to fetch (and in dev, transform) that module plus
 * everything it pulls in — a waterfall that shows up as a black stall at
 * the cut while the clock keeps running. Calling the loader early puts the
 * module in the ES module cache; React.lazy then resolves without
 * suspending.
 *
 * Idempotent and safe to spam: memoised per key, and the module registry
 * would dedupe anyway. Rejections are swallowed — a failed preload is not
 * an error, the real mount will report it.
 */
const preloads = new Map<string, Promise<unknown>>()

export function preloadScene(key: string): Promise<unknown> {
  const hit = preloads.get(key)
  if (hit) return hit
  const entry = sceneByKey(key)
  if (!entry) return Promise.resolve()
  const job = entry.load().catch(() => undefined)
  preloads.set(key, job)
  return job
}

/** Has this scene's module already been fetched? */
export function isScenePreloaded(key: string): boolean {
  return preloads.has(key)
}

/** Scene warming, addressable from the studio console and CDP tooling:
 *  `window.__scenes.preload('8.55')` / `.isPreloaded(k)` / `.warmed()`. */
declare global {
  interface Window {
    __scenes?: {
      preload: (key: string) => Promise<unknown>
      isPreloaded: (key: string) => boolean
      warmed: () => string[]
    }
  }
}

if (typeof window !== 'undefined') {
  window.__scenes = {
    preload: preloadScene,
    isPreloaded: isScenePreloaded,
    warmed: () => [...preloads.keys()],
  }
}

/**
 * Warm a list of scenes ONE AT A TIME during idle, in order.
 *
 * Sequential on purpose: firing 25 dynamic imports at once buries the dev
 * server in transform work and makes the scene you are currently watching
 * janky, which is the opposite of the point. Returns a cancel function.
 */
export function preloadSceneQueue(keys: string[]): () => void {
  let cancelled = false
  const idle = (cb: () => void) => {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(() => cb(), { timeout: 2000 })
    else setTimeout(cb, 200)
  }

  const pending = keys.filter(k => !preloads.has(k))
  const step = (i: number) => {
    if (cancelled || i >= pending.length) return
    idle(() => {
      if (cancelled) return
      void preloadScene(pending[i]).then(() => step(i + 1))
    })
  }
  step(0)
  return () => { cancelled = true }
}

/**
 * Remotion composition ids only allow [a-zA-Z0-9-], so '3.2' → '3-2',
 * 'arirang_v1.1' → 'arirang-v1-1'.
 */
export function compositionId(key: string): string {
  return key.replace(/[^a-zA-Z0-9-]/g, '-')
}

/**
 * Keys must be unique AFTER sanitising, not just as written.
 *
 * The viewer routes on the raw key and never sanitises, so a pair like
 * '1-3' and '1.3' works perfectly in the browser, sweeps clean, and then
 * takes down every segment of a render with "composition id '1-3'
 * collides". Root.tsx has always asserted this; asserting it here means the
 * dev server and the screenshot tooling refuse it too, at the moment the
 * manifest line is added rather than an hour later.
 */
{
  const seen = new Map<string, string>()
  for (const s of SCENES) {
    const id = compositionId(s.key)
    const clash = seen.get(id)
    if (clash) {
      throw new Error(
        `scene keys '${clash}' and '${s.key}' both sanitise to the composition id '${id}' — rename one`,
      )
    }
    seen.set(id, s.key)
  }
}
