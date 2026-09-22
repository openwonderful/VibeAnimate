/**
 * Act 6.85 — "THE SILENCE" (12.25s, film 123.25 → 135.50).
 *
 * ONE connected piece where 6.8 / 6.9 / 6.95 used to be three cuts. The song
 * NEVER STOPS any more — the 8s splice is gone and the film runs on the
 * untouched original. It was 20.5s, then 9.05, and it is 12.25: 6.7's slot
 * and 0.10 off 6.2's tail bought the stage beat and the world-turn back the
 * room the 9.05 cut squeezed out of them. The hero never cuts: the man on
 * the phone IS the man the world swaps around IS the man on the stage IS the
 * man who turns and walks down the road into 7.4's first frame.
 *
 *   t 0–7.68  THE LAST CALL, with the whole room to itself now: the grey city
 *             apartment — HIS room, the one he eats alone in (5.3's, out of
 *             `sets/apartment`) — the phone lit in his hand from frame one,
 *             the buzz, the raise, the gray hospital panel; her line goes
 *             flat, he turns gray, the panel slides off while he is still
 *             draining, the phone comes down, and his head SWEEPS down alone
 *             in the dark as the room's light dies around him. The huddle
 *             that used to interleave here is UNLINKED (see the backlog note
 *             at HuddleVignette) — the note was "more airtime for the call,
 *             it's confusing" and "just go immediately to the award scene",
 *             and its 1.6s is what bought both.
 *   t 7.68–10.75 THE STAGE, swapped in ON "Somebody like you, oh" (song
 *             130.93): the rig teleports into the ACT-1 STADIUM (`actB`'s own
 *             Bowl / Facade / Stage, the 0:20 bowl) while the frame is black,
 *             and the camera DOLLIES BACK to reveal it — the runway, the pit
 *             crowd both flanks, the three 아리랑 discs, and a CURTAIN-CALL
 *             LINE: all seven in one rank across the deck, the six with both
 *             arms over their heads and the trophy APPEARING on a flare in
 *             JIMIN'S raised hand, not his. Four STREAMER CANNONS fire from
 *             the deck edges — colourless paper arcing in from the sides like
 *             fireworks, not a burst in the centre ("for the confetti…
 *             streamers that go on the side") and not the drizzle it was
 *             ("it's a measly confetti, it's tiny, it's nothing"). He stands
 *             in the middle of the victory line with an empty hand, in the
 *             followspot, waving into the broadcast lens — which is the whole
 *             beat. Then ONE slow push from the wide to chest-up, across the
 *             wave — and the wave NEVER COMES DOWN again.
 *   t 10.0–12.25 THE SWEEP HOME: he stops being framed and starts being
 *             orbited — the camera leaves the push and ARCS 152° around the
 *             standing man ("the character stays in the same place… the
 *             background changes… and then the camera rotates to what the
 *             start of 7.4 is. The character itself does not move"), at his
 *             own eye height the whole way and slowly ("I don't want to go up
 *             in the sky… a more slow rotation to the back"), the crowd
 *             wheeling behind him; at 10.75, a quarter of the way round,
 *             under a fast dim, the world swaps to 7.4's dusk valley — the
 *             market lights and the walkers sweep past behind him — and the
 *             lens keeps going until it settles behind his shoulder onto
 *             7.4's opening key at 12.1, holding for the seam. The hook
 *             (135.02 → local 11.77) lands late in the arc, on the valley
 *             wheeling in around him. The final frame IS 7.4's t=0 — same
 *             world, same functions, same camera key, by construction — and
 *             he is STANDING on 7.4's start mark, still waving.
 *
 * HOW THE NO-CUT WORKS — the rig. The hero lives inside one `spaceGroup`
 * whose transform teleports between three world frames at two swap instants:
 * the apartment (STOP_POS, yaw 0.62, ×1), the stadium (HERO_POS, yaw π, ×17),
 * the valley (toWorld(walk), yaw 0, ×20). The camera is authored in RIG-LOCAL
 * coordinates and mapped through the same transform — so at each swap the
 * hero's screen position, size and facing are IDENTICAL (the relative
 * construction is scale-invariant) and only the world behind him changes.
 *
 * WHO TURNS, AND WHY IT IS THE LENS. KEY0 sits BEHIND him and the stage beat
 * is played into a lens in FRONT of him, so something has to carry 180° at
 * this join. Three cuts have now spent it three ways. First an elliptical
 * orbit whose real job was to undo a one-frame yaw snap — a cut in everything
 * but name. Then a 0.5s BODY turn straddling the swap, which bought the
 * second the clip did not have and cost the thing the shot is about: "the
 * character starts moving in place… no, the character stays in the same
 * place… the camera rotates to what the start of 7.4 is. The character itself
 * does not move." A man pivoting 180° mid-frame is the most legible motion in
 * the shot and it read as staging, not as a transition.
 *
 * So the LENS spends all of it. The valley frame is authored at yaw 0 rather
 * than π — the same world pose for him either way, since the body no longer
 * counter-rotates inside it — and the arc's rig-local endpoint is KEY0's
 * offset turned by π, i.e. exactly where the lens has to be to see his back.
 * The camera sweeps the full 152° from his face to over his shoulder; the
 * hero's transform is a CONSTANT from the moment he lands on stage to the
 * seam. Nothing about him moves through the transition but the wave, which is
 * continuous into 7.4 by construction.
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette, HueSaturation } from '@react-three/postprocessing'
import * as THREE from 'three'
import type { Group } from 'three'
// Value imports, not `import type`: PostDriver finds the effects with
// `instanceof` rather than holding a ref to each one — see the note there.
import {
  BloomEffect, HueSaturationEffect, VignetteEffect,
  type EffectComposer as PPEffectComposer,
} from 'postprocessing'

import { createScene } from '../createScene'
import { getAnimTime } from '../../hooks/useAnimTime'
import { useCameraHandoff } from '../DebugCamera'
import { publishSceneLookAt } from '../cameraHandoff'
import {
  GoldFigure, ADULT, v, buildPose, footState, buildLegPoints, buildArmPoints,
  buildSolvedArmPoints, buildHat,
  type Sphere, type PoseGeometry, type Proportions,
} from '../characters/goldFigure'
import { LyingFigure } from '../sets/hanok'
import { Apartment, APT_CEILING, APT_WALL, APT_BACK_Z, APT_CEIL_Y, COUNTER_Y } from '../sets/apartment'

import { Bowl, Stage, Facade, seatSample, makeCrowdMaterial } from '../actB/stadium'
import { buildCloud, updateGlow, type PointCloud } from '../actB/points'
import { GlowPoints } from '../actB/GlowPoints'
import { STADIUM_Z, STAGE_Z, BOWL_RX, BOWL_RZ } from '../actB/flight'
import { setFlightOffset } from '../actB/time'
import { PARENT_HAT } from '../actB/valley'

import { toWorld, S, GroundShadow } from '../act8_55/locale'
import { FOG_COLOR, NIGHT_BG } from '../act8_55/constants'
import {
  heroX as heroX74, heroZ as heroZ74,
  KEYS_74, worldAt,
} from '../act7r/journey74'
import { WalkWorld74, HERO74_START, hero74Pose, lerpPose } from '../act7r/Act7_4'

import { CrowdPeg, PEG_PER_GOLD } from '../characters/CrowdPeg'
import { BroadcastCamera } from './venue'
import { SplitPanel } from './SplitCall'
import { Phone, phoneRaise, PanelBackstop, type V3 } from './call'
import {
  ramp, smooth, clamp01, gutterSag, waveHand,
  HERO_GRAY, HERO_GRAY_EMISSIVE, HERO_THAW,
  GRIEF_DARK, GRIEF_MID, GRIEF_BODY, GRIEF_LIGHT,
  SOUL_GRAYS, SOUL_BOMB_GRAY,
} from './shared'

/** t74 = t − HANDOFF: journey74's clock, negative through this scene.
 *  THIS IS THE SLOT DURATION and must match timeline.ts's 6.85 row. The
 *  12.25 retime left it at the old 9.05, which silently broke everything
 *  derived from it: WALK_W went negative (he froze 0.9 units past his mark
 *  for the last 1.4s and jumped at the cut), ValleyWorld ran 3.2s ahead
 *  (the grandmother was mid-yard on the seam frame and snapped back to the
 *  porch on 7.4's first), and the poof's fade-out ramp inverted. */
const HANDOFF = 12.25
const smooth01 = (x: number) => smooth(clamp01(x))

/* ══ THE BEATS ═══════════════════════════════════════════════════════
 *
 * Re-solved AGAIN for the notes round of 2026-08-13: "more airtime for the
 * call, it's confusing", "more airtime for the stage", "remove the huddle",
 * "the transition into the new scene is too soon". The huddle's 1.6s is the
 * currency; the rules, in order of who wins:
 *
 *   1. The 2.0s GOLD DRAIN is untouched, and its start is PINNED: song
 *      127.21 lands one breath after GRAY0. Everything before 3.85 can only
 *      shuffle, not stretch.
 *   2. The head sweep keeps its 0.95s floor; the 0.15s of held flat line
 *      before he registers it keeps its 0.15s.
 *   3. The huddle is GONE from the cut (unlinked, kept in the file as
 *      backlog). Everything it covered — the death's aftermath, the room
 *      dying, the desat — now happens on him alone, slower: the panel leaves
 *      at 5.35–6.1, the phone comes down 5.6–6.25, the sweep runs 5.85–6.95,
 *      and the room takes until 7.4 to die. The call owns 0 → 7.68 outright
 *      (it owned 0 → 5.6 before, with the huddle fading up through its end).
 *   4. The stage owns 7.68 → 10.75 (3.07s, against 3.65 shared with nothing
 *      it has to dissolve through). The last 0.75s of it is already under the
 *      arc, which is the point: the world changes inside a move.
 *   5. The transition is the camera's ARC around a standing man — ALL of it,
 *      including the 180° that used to be his body turn — not a walk-off,
 *      and it is the one beat allowed to grow. 2.1s of sweep plus a 0.15s
 *      hold on 7.4's key, because 152° taken slowly enough not to be
 *      dizzying does not fit in less; the push gives up the 0.35s.
 *
 * SONG LANDINGS (the untouched original, slot from = 123.25):
 *   127.21 "Everybody like you, ayy"  → local 3.96, the first breath of the
 *          gold drain.
 *   130.93 "Somebody like you, oh"    → local 7.68 — THE SWAP FRAME: the
 *          vocal hits as the black turns into the stadium.
 *   135.02 "Somebody like you, ayy"   → local 11.77, late in the arc: the
 *          hook lands on the home valley wheeling in around him.
 */

/* — phase 1: the call (0–7.68) — 6.8's sheet, given room to breathe — */
const BUZZ: [number, number][] = [[0.35, 0.5], [0.72, 0.87]]
const STOP1 = 0.85
const RAISE0 = 0.7
const RAISE1 = 1.35
/**
 * The phone is IN FRAME from the first frame: he opens the scene holding it
 * half-raised at his chest, screen lit, the way a person stands when they are
 * waiting for news — and the buzz then carries it the rest of the way to his
 * ear. It used to hang at his side until RAISE0, dark, inside his own body
 * glow, and the note came back "at the start they're not holding a phone or
 * anything". 0.42 of the raise arc is chest height.
 */
const PHONE_HOLD = 0.42
const PANEL_IN: [number, number] = [1.6, 2.25]
const BOW0 = 2.25  // the doctor's head — 0.75s, the re-solve's floor
const BOW1 = 3.0
const FLAT0 = 3.05 // her line goes flat
const FLAT1 = 3.7
/**
 * HER DEATH, SAID IN THE FILM'S OWN LANGUAGE — gold is alive, grey is not.
 *
 * She used to be GRIEF_BODY grey from the frame the panel opened, which gave
 * the whole thing away and left the death with nothing to actually happen ON:
 * a hairline on a 250px monitor changed shape, and that was the event. So she
 * is GOLD while she is alive — the second gold thing in a grey film, and the
 * only other one is him — and at FLAT0 the gold LEAVES HER as an orb that
 * floats up out of the bed while her body drains to the room's own value.
 * Same gold, same drain, same grammar as his own turn 0.8s later: her light
 * goes, then his does. Nothing is ever stated and the read is unmistakable.
 *
 * SOUL1 is before PANEL_OUT (5.35) on purpose — the orb has to finish leaving
 * inside the hospital, not get carried off by the panel slide.
 */
const SOUL0 = 3.05 // the orb detaches — the same frame the line goes flat
/** It is still climbing when the panel leaves at 5.35–6.1 and clears the top
 *  of frame around 6.6, ahead of the black the stadium swap hides in (7.68).
 *  SOUL1 is where the animation stops, off screen — not where it fades. */
const SOUL1 = 7.2
const HER_GRAY1 = 4.15 // her body is grey well before the panel goes
/** SplitPanel's geometry, hoisted: SoulOrb re-derives the panel transform so
 *  it can outlive the panel, and the two must agree. */
const PANEL_Z = 1.6
const PANEL_ROOM_H = 3.0
const GRAY0 = 3.85 // his turn — 2.00s exactly, and not negotiable
const GRAY1 = 5.85
/** The aftermath, unhurried now the huddle is not waiting for the frame:
 *  the hospital leaves while he is still going grey (0.5s before the drain
 *  ends), the phone comes down after it, and the sweep happens ALONE. */
const PANEL_OUT: [number, number] = [5.35, 6.1]
const PHONE0 = 5.6 // the phone comes down
const PHONE1 = 6.25
const SWEEP0 = 5.85 // THE HEAD SWEEP: droop 0.6 → 0.95, alone in the dark
const SWEEP1 = 6.95

/* — phase 2: the room dies around him (the huddle is unlinked) — */
/** The apartment's light, dying under the sweep's tail into the black the
 *  swap hides in. */
const env0 = (t: number) => 1 - ramp(t, 6.45, 7.4)
/** The montage bridge's own air, and the window MontageStage is mounted for.
 *  It has to outlive T_SW: with the bed and the huddle gone there is nothing
 *  else lighting him between the room going out and HallLights coming up. */
const montageGate = (t: number) =>
  ramp(t, 6.7, 7.45) * (1 - ramp(t, T_SW, STAGE_IN1))

/* — phase 3: THE ARENA (7.68–10.95; the last 0.6s of it is under the arc) —
 *
 * 6.7's shot is here now. Its 3.10s went into this clip and so did its
 * staging: the pedestal BROADCAST CAMERA out on the runway and the other six
 * on the deck are mounted in this scene's stadium — same bowl, same marks,
 * the same `bowl()` transform, because 6.7 was blocked against 6.85's own
 * HERO_POS in the first place — and the beat they were built for happens
 * here instead of 3.1s earlier.
 *
 * That is why the shot was worth moving rather than keeping. The wave into a
 * broadcast lens is the arc's spine: he does it at every stage he plays so
 * that she can pick him out of seven identical boys on a screen. Playing it
 * whole at 2:03 and then playing a second, emptier stage after her death
 * spent the image twice, and spent it in the wrong order. Once, here, into a
 * camera she is not watching — the gesture intact and the only thing missing
 * from it is her — is the shot.
 */
const T_SW = 7.68        // space swap: apartment → stadium, ON "Somebody
                         // like you, oh" (song 130.93) — the vocal IS the cut
const STAGE_IN0 = 7.73   // the stadium fades up under the reveal dolly…
const STAGE_IN1 = 8.53   // …fully revealed
const T_LIFT0 = 7.8      // the head lifts as the light finds him
const T_LIFT1 = 8.6
/** THE TROPHY, in JIMIN'S hand (see ARENA_BAND) and held straight up. Not a
 *  cross-dissolve (the old one was a hardcoded 0.55s opacity ramp): the
 *  emissive spikes 0.3 → 2.2 through Bloom's 0.62 threshold and the cup
 *  condenses out of the flare.
 *
 *  It lands INSIDE the reveal with the streamers, per the standing note —
 *  "the moment he goes on stage, he has the trophy and the confetti is coming
 *  in" — so the cup arrives while the light is still finding the rank. The
 *  palm-up anticipation grip that used to precede it (GRIP0/GRIP1, 7.85–8.15)
 *  went with the cup: it was his hand preparing for a prop he no longer
 *  receives. */
const TROPHY_IN0 = 8.2
const TROPHY_IN1 = 8.38  // opacity/scale settled; the emissive decays after
/** The STREAMER CANNONS fire right behind the cup — from the deck edges,
 *  arcing up and inward like stage pyro ("streamers that go on the side like
 *  fireworks"), replacing the old centre-of-frame poof. All paper is out of
 *  the air well before the swap: the arc, not the confetti, covers it now. */
const STREAM_T0 = 8.45
const STREAM_OUT: [number, number] = [10.3, 10.9]
const SAT0 = 6.9         // HueSaturation −0.92 fades in under the room's
const SAT1 = 7.45        // death — its cover now that huddle and bed are cut
/** THE WAVE, into the pedestal lens. His LEFT hand — the cup is in the right
 *  and never changes hands. Up over 0.6s, oscillating through the hold — and
 *  it NEVER COMES DOWN: the note was "the character should keep waving, all
 *  the way into 7.4". It is the ONLY thing moving on him through the whole
 *  transition — the arc sweeps a man who is otherwise a still frame — and it
 *  is a wave at the crowd, then a wave at the house, then 7.4 releases it in
 *  its own first quarter. The oscillator runs on the t74 clock (t − HANDOFF)
 *  so the shake is phase-continuous across the seam. */
const WAVE_UP0 = 9.5
const WAVE_UP1 = 10.1
const STAGE_DIM0 = 10.56 // a fast dim right under the swap — the arc is
const STAGE_DIM1 = 10.72 // moving by now, and the dip reads as the sweep
                         // passing through the dark of the bowl. Lands 0.03s
                         // before T_SW2: every additive gain must be 0 there.

/* — phase 4: THE SWEEP HOME (10.35–12.25) —
 *
 * The transition stopped being his walk-off, became the camera's arc, and is
 * now ONLY the camera's arc. Two rounds of notes got it here. First: "way too
 * center of a transition… the character is staying still, the camera was
 * shifting position, rotating to the left" — which killed the walk-off. Then,
 * against the cut that answered it: "the character starts moving in place…
 * no, the character stays in the same place… the background changes… and then
 * the camera rotates to what the start of 7.4 is. The character itself does
 * not move." That kills the half-turn, which was the last thing on him that
 * moved and by far the loudest.
 *
 * So the rig's transform is a CONSTANT here. He STANDS — on 7.4's exact start
 * mark, facing the house, waving — from the moment the stage lands him to the
 * seam, and the LENS carries the whole 152° from his face to over his right
 * shoulder: out through his flank with the bowl wheeling behind him, through
 * the fast dim and the world swap a third of the way round, the market and
 * its walkers wheeling in on the other side, settling onto KEYS_74[0] at ARC1.
 *
 * It is 1.7s instead of 1.0 because it is now 152° instead of 28° — the same
 * angular rate, spent on the lens rather than split between the lens and a
 * pivoting man. The push gives up 0.65s for it (PUSH1 lands on ARC0) and the
 * swap moves 0.33s earlier with it, so the stage still holds 3.27s.
 *
 * "Somebody like you, ayy" (song 135.02, local 11.77) lands LATE in the arc —
 * the hook is the home valley wheeling in around him — and the camera eases
 * onto 7.4's key with 0.2s to spare.
 */
const ARC0 = 10.0        // the camera leaves the push and starts the sweep
const T_SW2 = 10.75      // space swap: stadium frame → valley frame — EARLY
                         // in the arc ("the people around them should fade
                         // into the new scene sooner"): 0.75s of the sweep is
                         // stadium, 44° of the 152°; the market and its
                         // walkers own the rest of the ride onto 7.4's key
const ARC1 = 12.1        // the sweep settles on KEYS_74[0]; held to the seam
/** The pose settle. It used to be the one unavoidable move on him — 6.85's
 *  right arm held the cup and 7.4's hangs — and it is very nearly a no-op now
 *  the cup is in somebody else's hand: both sides are a standing man with the
 *  left arm waving on the same clock and the right at his side. Kept, because
 *  the seam has to be exact, and spent under the dim and the swap anyway. */
const BLEND0 = 10.65     // custom pose → hero74Pose (7.4's standing wave)
const BLEND1 = 11.25
const CHIN0 = 10.6       // the lifted chin settles back to 7.4's carriage
const CHIN1 = 11.15

/* ══ THE RIG — three world frames, one hero ══════════════════════════ */

/**
 * Where he is standing when the phone goes off, and his facing.
 *
 * Not the farmhouse: he is in the CITY APARTMENT, the grey rented box from
 * 5.3 with a counter, a stool, one window and a bare bulb — the room the city
 * gave him, and the room he eats alone in while the chorus asks for a body.
 * Two things make it the right room rather than a set change. First, the
 * rhyme: 5.3 puts him in the RIGHT third with the empty half of the counter
 * beside him, and this shot puts him in the LEFT third with her deathbed
 * filling the half he ate next to. Second, and this is the measurable one:
 * the drain reads off the RATIO between him and the room, and this room is
 * SATAVG 2.1 from this lens against the farmhouse's 20.1. In the farmhouse he
 * drained gold → warm cream under an amber lantern and was still the most
 * saturated object in frame; here he drains onto the room's own value and
 * becomes the grey room, which is the whole thesis of the sequence in one
 * image. There is deliberately NO desaturation grade on phase 1 — the film's
 * one full-desaturation move is spent ten seconds later, at SAT0.
 *
 * z = +0.15, not −0.75: at −0.75 he stands INSIDE the counter (base box
 * z ∈ [−0.92, −0.52], top surface y = 0.92 against ADULT.HIP_Y 0.93), which
 * would sink him to the hip and hide all three hip-height beats — the phone
 * hanging through BUZZ, the raise arc off the hip, and the phone coming back
 * down. He stands 0.76 in front of the counter's front face. The camera pays
 * for that step forward by sitting further back (see pos2 in CameraRig): his
 * distance down the lens is within 0.15 of what it was.
 */
const STOP_POS: V3 = [-0.85, 0, 0.15]
const WALK_ROT = 0.62
/**
 * The apartment set's own origin.
 *
 * The farmhouse offset it replaces existed for one reason — that set's
 * ceiling runs the full length of the room and any of it hanging over the
 * camera drew across the top of the hospital panel — and that reason is gone.
 * What this offset has to do now is only: keep the counter's +x end out of
 * the panel's depth slab (its nearest corner is 4.6 down the lens axis
 * against a backdrop at 2.98, so it is comfortably behind it), and put the
 * window frame-LEFT of him rather than behind his head.
 */
const APT_POS: V3 = [-0.55, 0, -0.3]
/** 6.95's marks: centre of the thrust, and the figure scale. */
const HERO_POS: V3 = [0, 14, STAGE_Z - 74]
const HERO_SCALE = 17
/** The stadium's pinned flight clock: worldTime = t − 7 keeps every beat
 *  function asleep (beatPulse wakes at 12.65) through the visible window. */
const FLIGHT_OFF = -7

/**
 * There is NO run-up any more. journey74's trajectory holds Z_START for all
 * t74 ≤ 0 (he accelerates from rest on 7.4's own clock), so this scene's
 * valley frame is simply the trajectory evaluated at t − HANDOFF — a
 * standstill on 7.4's start mark. Position and speed are continuous across
 * the seam because both are the same constant and the same zero on both
 * sides. The eased-run-up cubic this replaces existed to weld a moving
 * handoff; a standing one needs nothing.
 */
/**
 * His facing in the valley: down the road, at the house, and he arrives
 * already pointed that way — HE NEVER TURNS IN THIS SCENE.
 *
 * The number is π off the stadium frame's, and every previous cut paid for
 * that π with the man. First as an instantaneous snap on the swap frame,
 * hidden by mirroring the camera to his other side and then rotating it a
 * full half-turn back — 1.7s of orbit whose only job was to undo a one-frame
 * flip, i.e. a cut. Then as a 0.5s body turn straddling the swap, which was
 * honest but was still 180° of man pivoting in the middle of the frame, and
 * the note on it was flat: the character does not move.
 *
 * So the π is spent on the FRAME, not on him. `VILLAGE_YAW` folds into the
 * valley space frame's own yaw (π + −π = 0) instead of counter-rotating the
 * body inside it. His world pose at the seam is bit-for-bit what it was —
 * 7.4 still gets the facing it needs — and the rig-local camera path absorbs
 * the difference by ending at KEY0's offset turned by π (see ARC_TH1). What
 * used to be geometry on the actor is geometry on the lens.
 */
const VILLAGE_YAW = -Math.PI

type SpaceFrame = { pos: V3; yaw: number; s: number }

/** Which world frame the rig (hero + camera + confetti) lives in at time t. */
function spaceFrame(t: number): SpaceFrame {
  if (t < T_SW) return { pos: STOP_POS, yaw: WALK_ROT, s: 1 }
  if (t < T_SW2) return { pos: HERO_POS, yaw: Math.PI, s: HERO_SCALE }
  const t74 = t - HANDOFF // ≤ 0 through this scene: a standstill on Z_START
  const p = toWorld(heroX74(t74), 0, heroZ74(t74))
  // yaw 0, not π: the half-turn lives here rather than on his body. The frame
  // carries the hero AND the camera, so flipping it changes nothing on screen
  // at the swap — only which way the rig faces the world it just arrived in.
  return { pos: p, yaw: Math.PI + VILLAGE_YAW, s: S }
}

/** Rig-local point → world, through the current space frame. */
function rigToWorld(c: V3, f: SpaceFrame, out: THREE.Vector3): THREE.Vector3 {
  const cos = Math.cos(f.yaw)
  const sin = Math.sin(f.yaw)
  const x = c[0] * f.s
  const y = c[1] * f.s
  const z = c[2] * f.s
  return out.set(
    f.pos[0] + x * cos + z * sin,
    f.pos[1] + y,
    f.pos[2] - x * sin + z * cos,
  )
}

/* ══ THE HERO — one skeleton, nine seconds ═══════════════════════════ */

/* — the opening stance —
 *
 * He does NOT walk in. 6.8 opened on him covering a metre of corridor in
 * the first second and it read as a man arriving somewhere, which is the
 * opposite of this beat: the phone goes off and finds him already standing
 * still. WALK_DIST 0 and no gait amplitude leaves the rest of the machinery
 * (the stance blend, the phase, the bob) in place and simply gives it
 * nothing to do. */
const WALK_DIST = 0
const PHASE0 = 0.32
function walkDist(t: number) {
  const u = clamp01(t / STOP1)
  return WALK_DIST * (1 - (1 - u) * (1 - u))
}
const walkAmp = (_t: number) => 0

/** The head's whole journey: 6.8's turn (→0.6), the sweep (→0.95), released
 *  by the lift on stage (→0). The extra 0.02 of droop that used to be added
 *  "deepest at the bed" went with the bed. */
function droopK(t: number): number {
  const down = 0.6 * ramp(t, GRAY0, GRAY1)
    + 0.35 * ramp(t, SWEEP0, SWEEP1)
  return down * (1 - ramp(t, T_LIFT0, T_LIFT1))
}

/** Chin past neutral once the spine is straight — he faces the lens — then
 *  settling back to the walk's carriage as the lens leaves his face. The
 *  +0.05/+0.45 offsets are re-solved against a 0.65s lift; the old +0.1/+0.9
 *  were tuned to a 1.9s window that no longer exists, and at this length the
 *  chin would still be rising when CHIN0 started pulling it back. */
function chinUp(t: number): number {
  return ramp(t, T_LIFT1 + 0.05, T_LIFT1 + 0.45) * (1 - ramp(t, CHIN0, CHIN1))
}

/** The 6.9 droop recipe — the head comes DOWN the neck, not forward on it. */
function headPose(t: number, P: Proportions) {
  const k = droopK(t)
  const chin = chinUp(t)
  const torso = P.SHOULDER_Y - P.HIP_Y
  const neck = P.HEAD_Y - P.SHOULDER_Y
  const hipY = P.HIP_Y - 0.05 * k
  const shoulderY = hipY + torso * (1 - 0.06 * k)
  const shoulderZ = 0.13 * k
  return {
    k, chin, hipY, shoulderY, shoulderZ,
    headY: shoulderY + neck * (1 - 0.42 * k) + 0.012 * chin,
    headZ: shoulderZ + 0.10 * k + 0.03 - 0.025 * chin,
  }
}

/**
 * Both hand targets + the trophy anchor, one pure function so the skeleton,
 * the phone and the trophy can never disagree. Figure-local.
 *
 * THE WAVE IS BACK, and it is the only one in the arc now. It was cut when
 * 6.7 played 3.1s earlier — two waves inside four seconds is one too many —
 * and 6.7 is inside this clip instead of before it, so the objection is gone
 * and the gesture belongs to the shot it was always for. Left hand: the cup
 * is in the right and never changes hands.
 */
function handState(t: number) {
  const h = headPose(t, ADULT)

  // A hand hanging dead at the side, tracking the DROOPED spine rather than
  // a fixed height. The rest used to be a constant tuned for the upright
  // figure, so once the head sweep folded him down the "resting" hand sat
  // up near his ear with the elbow cocked, and for the whole montage he
  // looked like a man still holding a phone to his head.
  const hangY = h.shoulderY - 0.53
  const hangZ = h.shoulderZ - 0.04
  const restR: V3 = [+0.09, hangY, hangZ]
  const hangL: V3 = [-0.09, hangY, hangZ]

  // LEFT: hangs, then THE WAVE into the pedestal lens — and it stays up for
  // the rest of the scene (7.4 owns its release). waveHand's own `up` scales
  // the oscillation, so feeding it the envelope gives a shake that grows in
  // with the arm; the outer mix is what carries the hand off this figure's
  // DROOPED rest rather than the standing one waveHand assumes. The
  // oscillator runs on t − HANDOFF: the same clock hero74Pose shakes on, so
  // the blend into 7.4's arm crossfades between two in-phase sines.
  const wUp = ramp(t, WAVE_UP0, WAVE_UP1)
  const wv = waveHand(t - HANDOFF, wUp, { mirror: true, freq: 6.5, amp: 0.10 })
  const left: V3 = [
    hangL[0] + (wv[0] - hangL[0]) * wUp,
    hangL[1] + (wv[1] - hangL[1]) * wUp,
    hangL[2] + (wv[2] - hangL[2]) * wUp,
  ]

  // RIGHT: the phone arc, and then nothing — it comes down to his side after
  // the call and STAYS there.
  //
  // It used to take the trophy. The cup is somebody else's now — the award
  // goes to the man beside him in the line (see ARENA_BAND) and he is the one
  // in the rank with an empty hand — and losing it bought two things besides
  // the staging. The palm-up "anticipation" grip went with it, a gesture
  // whose only job was to prepare a prop that no longer arrives; and the
  // tail's pose blend into 7.4 collapsed to almost nothing, because a
  // standing man waving with his left and hanging his right IS 7.4's opening
  // body. The one unavoidable motion on him through the transition is gone.
  const phoneUp = clamp01(Math.max(PHONE_HOLD, ramp(t, RAISE0, RAISE1)) - ramp(t, PHONE0, PHONE1))
  const ear: V3 = [0.19, h.headY - 0.05, h.headZ + 0.07]
  const right = phoneRaise(phoneUp, ear, restR)

  return { ...h, left, right, phone: right }
}

/** The whole figure, per frame — stop, raise, droop, grip — blending into
 *  the REAL walking skeleton for the last stretch. */
function heroSkeleton685({ P, t }: { P: Proportions; t: number; phase: number }): PoseGeometry {
  const w = walkAmp(t)
  const phase = PHASE0 + walkDist(t) / (4 * P.STRIDE)
  const hs = handState(t)
  const k = hs.k
  const breathe = Math.sin(t * 2.2) * 0.005 * (1 - k * 0.4)
  const bob = -Math.cos(phase * 4 * Math.PI) * 0.02 * w

  const hipY = hs.hipY + bob
  const shoulder = v(0, hs.shoulderY + bob + breathe, hs.shoulderZ + breathe * 0.4)
  const head = v(0, hs.headY + bob + breathe, hs.headZ)
  const neckTip = shoulder.clone().lerp(head, 0.5)

  const spine = [
    v(0, hipY, -0.02 * k),
    v(0, hipY + (shoulder.y - hipY) * 0.33, -0.02 * k + (shoulder.z + 0.02 * k) * 0.25),
    v(0, hipY + (shoulder.y - hipY) * 0.7, -0.02 * k + (shoulder.z + 0.02 * k) * 0.68),
    shoulder,
    neckTip,
  ]

  // Legs: the walk cycle blending into a slightly staggered stance (6.8).
  const stance = (side: 1 | -1) => (side > 0 ? -0.035 : 0.055)
  const leg = (side: 1 | -1, p: number): THREE.Vector3[] => {
    const f = footState(p, P)
    const fBlend = {
      y: P.FOOT_Y + (f.y - P.FOOT_Y) * w,
      z: f.z * w + stance(side) * (1 - w),
      bend: f.bend * w + 0.06 * (1 - w),
    }
    return buildLegPoints(side * 0.03, fBlend, hipY)
  }

  // Arms. Right: swings until the raise, then solved onto the shared target
  // for the rest of the film (6.8's own switch). Left: swings until the raise
  // begins, then hangs off the drooped spine.
  //
  // The shoulder roots are ±0.02 — INSIDE the torso tube, which is what
  // every other figure in the film uses and what makes an arm read as
  // growing out of a body. This whole family (6.4, 6.8, and here) had them
  // at ±0.1, two full body radii clear of the spine, and every arm in the
  // sequence hung in the air beside the man with daylight behind it.
  // Floored at PHONE_HOLD so the right arm is solved onto the phone from the
  // first frame — the half-raised hold needs the arm as well as the prop.
  const raise = Math.max(PHONE_HOLD, ramp(t, RAISE0, RAISE1))
  const fR = footState(phase + 0.5, P)
  const fL = footState(phase, P)
  const armSwingL = buildArmPoints(-0.02, (-fR.z / P.STRIDE) * w * 0.9, shoulder.y, P)
  const armR = raise <= 0.001
    ? buildArmPoints(0.02, (-fL.z / P.STRIDE) * w * 0.9, shoulder.y, P)
    : buildSolvedArmPoints(0.02, shoulder.y, v(...hs.right), P, shoulder.z)
  // The left comes onto the solved path as soon as the right does, so both
  // arms hang off the drooped spine for the montage instead of one of them
  // holding a walk-cycle pose the body left behind.
  const gBlend = raise
  let armL: THREE.Vector3[]
  if (gBlend <= 0.001) {
    armL = armSwingL
  } else {
    const solvedL = buildSolvedArmPoints(-0.02, shoulder.y, v(...hs.left), P, shoulder.z)
    armL = solvedL.map((p, i) => armSwingL[i].clone().lerp(p, gBlend))
  }

  const custom: PoseGeometry = {
    curves: [
      { points: spine, radius: P.R, segments: 16 },
      { points: armL, radius: P.R, segments: 14 },
      { points: armR, radius: P.R, segments: 14 },
      { points: leg(-1, phase), radius: P.R, segments: 16 },
      { points: leg(1, phase + 0.5), radius: P.R, segments: 16 },
    ],
    spheres: [{ center: head, radius: P.RH }] as Sphere[],
  }

  // The last stretch: point-blend onto 7.4's exact opening body — the
  // standing wave (hero74Pose at t74 ≤ 0: stride closed, left arm up on the
  // same waveHand clock). At the seam wb = 1 and both files evaluate the
  // same function at the same argument.
  const wb = ramp(t, BLEND0, BLEND1)
  if (wb <= 0.001) return custom
  return lerpPose(custom, hero74Pose(t - HANDOFF), wb)
}

/* — colours: gold → gray → thaw → 7.4's exact start state — */
const GOLD = new THREE.Color('#FFB938')
const GRAY_C = new THREE.Color(HERO_GRAY)
const THAW_C = new THREE.Color(HERO_THAW)
const TMP = new THREE.Color()
/** His personal key light, and where it goes when he does. The cold end is
 *  the apartment window's own blue (`WINDOW_COOL` in sets/apartment) — the
 *  one light left in the room after his goes out. */
const KEY_GOLD = new THREE.Color('#FFC24E')
const KEY_COLD = new THREE.Color('#93A8D6')

/** The screen is lit from frame one — a standing glow so the phone in his
 *  hand reads as a phone BEFORE it buzzes. It used to be dark until the
 *  first buzz, i.e. a black slab against a black room at his side, and the
 *  note came back "at the start they're not holding a phone or anything".
 *  The buzz spikes over the floor; the floor dies as the phone comes down. */
function buzzLevel(t: number) {
  for (const [a, b] of BUZZ) if (t >= a && t <= b) return 2.8
  return 0.6 * (1 - ramp(t, PHONE0, PHONE1))
}

function Hero() {
  const space = useRef<Group>(null)
  const body = useRef<Group>(null)
  const walkIn = useRef<Group>(null)
  const phoneWrap = useRef<Group>(null)
  const lightRef = useRef<THREE.PointLight>(null)

  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#FFB938', emissive: '#FFB938',
    emissiveIntensity: 1.0, roughness: 0.35, toneMapped: false,
  }), [])

  useFrame(() => {
    const t = getAnimTime()
    const f = spaceFrame(t)
    if (space.current) {
      space.current.position.set(f.pos[0], f.pos[1], f.pos[2])
      space.current.rotation.y = f.yaw
      space.current.scale.setScalar(f.s)
    }
    // The walk-in offset + gait wobble (rig-local), dying with the stop.
    if (walkIn.current) {
      const back = WALK_DIST - walkDist(t)
      walkIn.current.position.set(0, 0, -back)
      const phase = PHASE0 + walkDist(t) / (4 * 0.18)
      walkIn.current.rotation.y = Math.sin(phase * 2 * Math.PI) * 0.04 * walkAmp(t)
    }
    // NO TURN. There is no body yaw in this scene at all any more — the π
    // between the stadium frame and the valley frame is the FRAME's (see
    // spaceFrame), and the lens spends it (see ARC_TH1). He stands.
    // No walking lean: he stands through the whole tail. 7.4's own lean is
    // 0.055 × motion, and motion is 0 at its t=0 — the seam agrees at zero.
    if (body.current) body.current.rotation.x = 0

    if (phoneWrap.current) phoneWrap.current.visible = t < PHONE1 + 0.2

    // ── the material's whole arc ──
    const u = ramp(t, GRAY0, GRAY1)               // the gray turn
    const thaw = ramp(t, T_LIFT0 + 0.05, T_LIFT1 + 0.25) // the first thaw
    const home = ramp(t, T_SW2, HANDOFF - 0.2)    // → 7.4's start state
    TMP.copy(GOLD).lerp(GRAY_C, u).lerp(THAW_C, thaw * 0.85)
    mat.color.copy(TMP).lerp(HERO74_START.color, home)
    mat.emissive.copy(TMP).lerp(HERO74_START.emissive, home)
    // 6.8's gutterSag drains him; the sag itself settles once the montage
    // holds him; the lift warms him; the valley hands him to 7.4's numbers.
    const sagSettle = ramp(t, SWEEP1 - 0.7, SWEEP1 + 0.3)
    const sag = gutterSag(t, u) * (1 - sagSettle) + sagSettle
    const gray = THREE.MathUtils.lerp(1.0, HERO_GRAY_EMISSIVE, u) * sag
    const lift = (gray + thaw * 0.10) * (1 + 0.06 * Math.sin(t * 2.4) * thaw)
    mat.emissiveIntensity = THREE.MathUtils.lerp(lift, HERO74_START.emissiveIntensity, home)
    mat.roughness = THREE.MathUtils.lerp(0.35, HERO74_START.roughness, home)
    // His own key light. The floor under it is load-bearing: with the crowd
    // and the bed vignettes cut, env0 hitting 0 at 6.0 used to leave him with
    // NO directional light at all until the stadium arrived at 7.25 — visible
    // on his emissive, but a flat cutout for a second and a half.
    //
    // The floor came at a price, and it took a frame to see it. This lamp is
    // #FFC24E and it sits 0.3 units off his chest at throat height, so through
    // the huddle it was blowing a small AMBER disc onto a body that has just
    // finished going grey — one warm thing in a rank of seven, and the warm
    // thing was him. Exactly the failure the apartment's bare bulb had to be
    // talked out of, in miniature, from his own fixture.
    //
    // So the lamp goes cold on the same ramp his body does. It is HIS light:
    // when his gold goes out, it has no business still being gold. Intensity
    // keeps the floor (he stays modelled), hue does not (he stays grey), and
    // the thaw at the lift walks both back up together.
    //
    // KNOWN, MEASURED, NOT FIXED — and this lamp is not the tool for it. As
    // the stadium dies to cover the world swap, the followspot is the only
    // thing lighting him, so there is a trough where nothing is. Shading on
    // his HEAD across the window: sd 23.4 at 8.40, 5.1 at 8.47, 10.1 at 8.53,
    // 12.8 by 8.57 — about two frames of near-flat sphere. His body is fine
    // throughout (sd 27 at the trough); it is the head that goes lambert-flat.
    //
    // Two fixes were tried and MEASURED as no-ops, so neither is in the file:
    // landing STAGE_DIM1 on T_SW2 (the trough is at 8.47, where dimOut is
    // only 70% through, so the endpoint is downstream of the problem), and
    // floating this lamp on `dimOut` (5.07 → 5.50 — it is 0.3 units off his
    // chest with decay 2 and multiplied by `gray` ≈ 0.12 once he is drained,
    // so it is a proximity ember, not a key). A real fix means overlapping
    // the valley's lights with the stadium's death, and the stadium's death
    // IS the cover for the swap — that is a restructure, not a constant.
    if (lightRef.current) {
      lightRef.current.intensity = 3.2 * gray * Math.max(env0(t), 0.3 * montageGate(t))
      lightRef.current.color.copy(KEY_GOLD).lerp(KEY_COLD, u * (1 - thaw))
    }

    // ── THE TROPHY APPEARS ──
    // Was `ramp(t, 15.15, 15.7)` — a hardcoded cross-dissolve five seconds
    // past the end of this cut, i.e. a cup that would simply never have
    // arrived. It is an APPEARANCE now: 0.18s of opacity under an emissive
    // spike that clears Bloom's 0.62 threshold for about three frames, and a
    // 0.70 → 1.06 → 1.00 scale pop. The flare IS the appearance.
  })

  return (
    <group ref={space} position={STOP_POS} rotation={[0, WALK_ROT, 0]}>
      {/*
        THE STREAMER CANNONS live in the rig's space group — scale-invariant
        across the world frames by construction, like everything on the rig.
        Two of them, at the deck edges either side of him, firing up and
        inward so the paper ARCS across the top of frame and falls — "it
        should be like streamers that go on the side, like fireworks", not
        the old 340-flake burst dead centre around his hands. They fire right
        behind the trophy flare and every flake is faded out before the swap:
        the camera arc covers the transition now, not the confetti.
      */}
      {STREAM_CANNONS.map(c => (
        <PoofCloud
          key={c.seed}
          count={900} seed={c.seed} t0={STREAM_T0}
          origin={c.origin} axis={c.axis} spread={0.22} stagger={0.95}
          speed={8.4} drag={1.7} gravity={0.55} life={3.4}
          sizeMin={0.035} sizeMax={0.11} maxPx={90}
          colors={POOF_NEUTRALS} square fadeOut={STREAM_OUT}
        />
      ))}
      {/* No yaw group between the space frame and the body: he does not turn
          in this scene. The half-turn the seam needs is the frame's. */}
      <group ref={walkIn}>
        <GroundShadow />
        <group ref={body}>
          <GoldFigure skeleton={heroSkeleton685} material={mat} />
        </group>
        <group ref={phoneWrap}>
          <Phone hand={(t: number) => handState(t).phone} screen={buzzLevel} />
        </group>
        <pointLight ref={lightRef} position={[0, 1.35, 0.3]} color="#FFC24E"
          intensity={3.2} distance={5} decay={2} />
      </group>
    </group>
  )
}

/** 6.95's trophy, to the vertex. */
function Trophy({ material }: { material: THREE.Material }) {
  return (
    <group>
      <mesh material={material} position={[0, 0.0175, 0]}>
        <boxGeometry args={[0.11, 0.035, 0.11]} />
      </mesh>
      <mesh material={material} position={[0, 0.062, 0]}>
        <cylinderGeometry args={[0.016, 0.024, 0.055, 12]} />
      </mesh>
      <mesh material={material} position={[0, 0.163, 0]}>
        <cylinderGeometry args={[0.085, 0.046, 0.15, 20]} />
      </mesh>
      {[-1, 1].map(s => (
        <mesh key={s} material={material} position={[s * 0.102, 0.175, 0]}>
          <torusGeometry args={[0.047, 0.011, 8, 20]} />
        </mesh>
      ))}
    </group>
  )
}

/* ══ PHASE 1 SET — the grey city apartment (5.3's room, dissolvable) ══ */

/**
 * The room goes out on a real CROSS-DISSOLVE, which the farmhouse could not
 * do: it is a shared set dressed with dozens of independent props, so it had
 * to be faded on its LIGHT instead. `sets/apartment` is one small set of
 * materials behind a `fade` prop, so the whole room dissolves as one object
 * while the huddle comes up through it.
 *
 * THE BULB IS THE ONE CONDITION on putting him in this room. At 5.3's values
 * (#FFD2A0 at 7.2) it relights the drained figure warm from a metre away and
 * hands back the entire point of the swap — the same failure the farmhouse's
 * lantern causes, from a different fixture. It comes down to a fifth and
 * drifts toward the window's blue across the drain, so what is left on him at
 * the end is the cold key through the glass. Do not "fix" the room getting
 * darker as he greys: that IS the beat.
 *
 * `walls="none"` and no ceiling, and 6.85 supplies its own. The module's shell
 * is cut for 5.3's tighter lens — a 4.4-wide back wall and side walls at
 * x = ±1.85 — and this shot is wider and further back: the +x side wall lands
 * 2.4 down the lens axis, INSIDE the hospital panel's depth slab and at
 * screen-x +0.19, so it draws straight through the hospital; and with it
 * dropped, the back wall's left edge sits at 49% of half-frame with black
 * beyond it. Two oversize planes at the module's own dimensions and palette
 * close both problems and cost one material each.
 */
function TheRoom() {
  const root = useRef<Group>(null)
  const amb = useRef<THREE.AmbientLight>(null)
  const skin = useRef<THREE.Material[]>([])
  const mats = useMemo(() => ({
    wall: new THREE.MeshStandardMaterial({
      color: APT_WALL, roughness: 0.95, side: THREE.DoubleSide,
    }),
    ceil: new THREE.MeshStandardMaterial({
      color: APT_CEILING, roughness: 1, side: THREE.DoubleSide,
    }),
  }), [])

  useFrame(() => {
    const t = getAnimTime()
    const e = env0(t)
    if (root.current) root.current.visible = e > 0.002
    if (!root.current?.visible) return
    // 5.3 gets its wall bounce from a GradientEnvironment; AtmosDriver pins
    // scene.environmentIntensity to 0 for the whole of phase 1 (the hospital
    // panel is self-lit and an environment would leak onto it), so the room's
    // ambient carries that load instead — 0.45 against 5.3's 0.20.
    if (amb.current) amb.current.intensity = 0.45 * e

    // EVERY material under the room, not just the shell's.
    //
    // The module drives its own `fade` across the eight shell materials, and
    // that is not the whole room: the bulb's flex and glass, the window's
    // frame and mullions and pane, and the bundle each own materials declared
    // inline in their own JSX. Left to the shell's fade they stay solid, and
    // what you get at the end of the dissolve is a cord, a knot of cloth and a
    // window frame hanging in mid-air over the huddle, lit by the montage's
    // own ambient — verified on out/screenshots/recut685 before this loop
    // existed. One traverse, cached after the first frame.
    if (skin.current.length === 0) {
      root.current.traverse(o => {
        const m = (o as THREE.Mesh).material
        if (!m) return
        for (const one of Array.isArray(m) ? m : [m]) {
          if (!skin.current.includes(one)) skin.current.push(one)
        }
      })
    }
    const tr = e < 1
    for (const m of skin.current) {
      m.opacity = e
      if (m.transparent !== tr) {
        m.transparent = tr
        m.depthWrite = !tr
        m.needsUpdate = true
      }
    }
  })

  return (
    <group ref={root} position={APT_POS}>
      <Apartment
        fade={env0}
        walls="none"
        ceiling={false}
        floorSize={14}
        bulb={{
          // Down to 22% and toward the window's blue as the gold leaves him.
          dim: (t: number) => env0(t) * (1 - 0.78 * ramp(t, GRAY0, GRAY1)),
          cool: (t: number) => ramp(t, GRAY0, GRAY1),
          castShadow: false,
        }}
        window={{ dawn: 0, intensity: 1.9 }}
        // Her cloth bundle, still on his counter while she dies in the other
        // half of frame. It is the room's one warm object and the only thing
        // in it that came from the house — and it is what replaces the table
        // still laid for two that the farmhouse version of this shot had.
        bundle={[-0.98, COUNTER_Y, -0.42]}
      />
      <mesh position={[0, 2.0, APT_BACK_Z]} material={mats.wall}>
        <planeGeometry args={[16, 7]} />
      </mesh>
      <mesh position={[0, APT_CEIL_Y, 0.6]} rotation={[Math.PI / 2, 0, 0]} material={mats.ceil}>
        <planeGeometry args={[16, 10]} />
      </mesh>
      <ambientLight ref={amb} color="#3C3C4E" intensity={0.45} />
    </group>
  )
}

/* ══ PHASE 1 — the hospital room in the panel (6.8's, + the flatline) ═ */

const BED_Z = -1.0
const MATTRESS_TOP = 0.6
const PILLOW_X = -0.78
/** What she drains TO: the room's own body value, not the hero's grey. She
 *  becomes part of the grey world; he stays the subject inside it. */
const HER_DEAD = new THREE.Color(GRIEF_BODY)
/** And what she drains FROM. NOT the hero's full gold — at GOLD she read as a
 *  healthy woman asleep and the orb looked like it was leaving a well person
 *  ("shouldn't be that yellow in the first place"). Half value keeps the hue,
 *  so she is unmistakably the same living gold he is, with almost none of it
 *  left; the guttering emissive does the rest. */
const HER_ALIVE = new THREE.Color(GRIEF_BODY).lerp(new THREE.Color('#FFB938'), 0.55)

/**
 * The satgat, off its wearer — in HER gold, not straw's.
 *
 * It was authored as a standalone grey-gold (#8C8168 over #A29677), which is
 * the one thing a hat is never allowed to be in this film: a hat is the
 * PARENT's mark, and everywhere else it carries the wearer's own material —
 * `GoldFigure` clones the body material and dims the shell by the hat's
 * `shellDim`, because straw catches the figure's light rather than making its
 * own. Authored separately it read as a prop somebody else had left on the
 * bed, which is exactly the identity the hat exists to carry.
 *
 * So it derives from `herMat` on the same grammar, and it drains on the same
 * ramp she does: the gold in this room is hers, and all of it goes. It does
 * NOT take her gutter — the flicker is a body failing, not a hat.
 */
function HatOnChair({ material }: { material: THREE.MeshStandardMaterial }) {
  const build = useMemo(() => buildHat(PARENT_HAT, 0.16), [])
  const shellMat = useMemo(() => {
    const m = material.clone()
    m.roughness = Math.min(1, material.roughness + 0.25)
    m.side = THREE.DoubleSide
    if (build.shellOpacity < 1) {
      m.transparent = true
      m.opacity = build.shellOpacity
      m.depthWrite = false
    }
    return m
  }, [material, build])
  const trimMat = useMemo(() => material.clone(), [material])
  useEffect(() => () => {
    build.shell.dispose(); build.trim.dispose()
    shellMat.dispose(); trimMat.dispose()
  }, [build, shellMat, trimMat])

  useFrame(() => {
    // Track her colour, skip her flicker: hold the emissive at the value she
    // idles on (0.2 alive → 0.04 dead) rather than copying the gutter.
    const u = smooth01((getAnimTime() - SOUL0) / (HER_GRAY1 - SOUL0))
    const glow = THREE.MathUtils.lerp(0.2, 0.04, u)
    shellMat.color.copy(material.color)
    shellMat.emissive.copy(material.emissive)
    shellMat.emissiveIntensity = glow * build.shellDim
    trimMat.color.copy(material.color)
    trimMat.emissive.copy(material.emissive)
    trimMat.emissiveIntensity = glow
  })

  return (
    <group position={[0, 0.02, 0]} rotation={[0, 0.6, 0]}>
      <mesh geometry={build.shell} material={shellMat} />
      <mesh geometry={build.trim} material={trimMat} />
    </group>
  )
}

/**
 * THE SOUL — her gold, leaving, in Act 8.55's own visual language.
 *
 * It lifts off her chest on the frame the line goes flat and climbs UP AND OUT
 * OF FRAME. It never fades: the panel slides the whole hospital off to the
 * right underneath it (PANEL_OUT) and the orb keeps going, alone, over the
 * dying apartment — which is the point. The room is what leaves him; the soul
 * is what leaves the room.
 *
 * WHY IT IS NOT A SPHERE. 8.55's sky is 30,000 of these and every one is a
 * `glow.ts` additive point sprite — `pow(1 - d, k)` falloff, no geometry — so
 * they read as fat blown discs with a solid centre and no edge anywhere. A
 * lit sphere reads as a ball-bearing next to that, and this orb is the same
 * thing 47 seconds early. Same falloff, same additive blend, three layers
 * (wide halo / body / blown core) because one layer is either a hard disc or
 * a smudge, and HDR colour so Bloom's mipmap chain builds the flare.
 *
 * WHY IT LIVES OUTSIDE THE PANEL. Parented into the room it was a child of
 * SplitPanel's group, so at PANEL_OUT it slid off the right edge with the
 * furniture. It has to outlive the room, so it carries its own copy of the
 * panel transform — using the ENTER ramp ONLY. That one omission is the whole
 * trick: the orb sits exactly where the room's coordinates say it does while
 * the panel is parked, and simply does not hear about the exit.
 *
 * `SOUL_FROM` is her chest solved off ADULT laid flat: the figure's head is
 * its anchor at (PILLOW_X, MATTRESS_TOP, BED_Z) with the body running toward
 * +x, so mid-trunk is ~0.45 down the bed and ~0.07 above the mattress.
 * `SOUL_TO.y` is past PANEL_ROOM_H (the content metre that maps to the top of
 * frame), because "out of frame" is a real number here, not a fade.
 */
const SOUL_FROM = new THREE.Vector3(-0.33, 0.68, -1.0)
const SOUL_TO = new THREE.Vector3(0.75, 3.55, -0.42)
const SOUL_GOLD = new THREE.Color('#FFC24E')
/** Both in ROOM metres — see the conversion note in the useFrame. The reach
 *  has to die inside the ~0.96m between the orb's path and the monitor. */
const SOUL_LIGHT_REACH = 0.8
const SOUL_LIGHT_ROOM = 2.2
const V_ORB = new THREE.Vector3()

/** 8.55's halo falloff, on a billboard quad instead of a Points sprite. */
function makeOrbGlow(color: THREE.Color, power: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: color }, uAlpha: { value: 1 }, uPow: { value: power } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      uniform vec3 uColor;
      uniform float uAlpha;
      uniform float uPow;
      void main() {
        float d = length(vUv - 0.5) * 2.0;
        float a = pow(max(0.0, 1.0 - d), uPow) * uAlpha;
        gl_FragColor = vec4(uColor * a, a);
      }
    `,
    transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.AdditiveBlending,
  })
}

/** Wide soft halo → body → blown core. Sizes are ROOM metres (quad width). */
const ORB_LAYERS: [size: number, power: number, gain: number][] = [
  [1.05, 2.6, 1.5],
  [0.40, 1.5, 3.0],
  [0.15, 0.7, 6.0],
]

function SoulOrb() {
  const grp = useRef<Group>(null)
  const light = useRef<THREE.PointLight>(null)
  const camera = useThree(s => s.camera) as THREE.PerspectiveCamera
  const size = useThree(s => s.size)
  const mats = useMemo(
    () => ORB_LAYERS.map(([, power, gain]) =>
      makeOrbGlow(SOUL_GOLD.clone().multiplyScalar(gain), power)),
    [],
  )

  useFrame(() => {
    const t = getAnimTime()
    const g = grp.current
    if (!g) return
    // Nothing before the flatline: while she is alive the gold is IN her.
    g.visible = t >= SOUL0 && t < SOUL1
    if (!g.visible) return

    const u = clamp01((t - SOUL0) / (SOUL1 - SOUL0))
    // Nearly linear, a shade slow off the chest. It used to be (1-u)^2.4 —
    // most of the climb spent in the first second, which read as launched
    // rather than released.
    const e = Math.pow(u, 1.25)
    // The SIDEWAYS move runs on its own, much faster, ease. The monitor is
    // 1.2m of the 1.94m bed wall and the orb is born under the middle of it,
    // so on one shared ease it climbs the full height of the screen it is
    // standing in front of — a hot additive blob parked on the flat line for
    // a second and a half. Off to the side first, then up slowly.
    const ex = Math.pow(u, 0.5)
    const rx = SOUL_FROM.x + (SOUL_TO.x - SOUL_FROM.x) * ex + Math.sin(t * 0.9) * 0.05 * e
    const ry = SOUL_FROM.y + (SOUL_TO.y - SOUL_FROM.y) * e
    const rz = SOUL_FROM.z + (SOUL_TO.z - SOUL_FROM.z) * e

    /*
     * SplitPanel's transform, re-derived here on the ENTER ramp only.
     * A room point p (content coords, origin floor-centre) sits at camera-space
     * (xPanel + s·p.x, s·(p.y − roomH/2), −panelZ + s·p.z), rotated by the
     * camera. Keep this in step with SplitCall.tsx if that math ever moves.
     */
    const aspect = size.width / Math.max(1, size.height)
    const vph = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * PANEL_Z
    const vpw = vph * aspect
    const s = vph / PANEL_ROOM_H
    const k = ramp(t, PANEL_IN[0], PANEL_IN[1])
    const xPanel = THREE.MathUtils.lerp(vpw / 2 + vpw / 4 + vph * 0.06, vpw / 4, k)

    camera.updateMatrixWorld()
    g.position.copy(
      V_ORB.set(xPanel + s * rx, s * (ry - PANEL_ROOM_H / 2), -PANEL_Z + s * rz)
        .applyMatrix4(camera.matrixWorld),
    )
    g.quaternion.copy(camera.quaternion)

    // Swells out of her over a quarter-second and then NEVER fades — it leaves
    // by leaving frame. A fade here would be the film saying the soul stopped
    // existing, which is the opposite of what 8.55 goes on to say.
    const born = smooth01((t - SOUL0) / 0.28)
    g.scale.setScalar(s * born * (1 + e * 0.3))
    for (const m of mats) m.uniforms.uAlpha.value = born

    /*
     * THE PANEL IS A SCALED SUBTREE AND LIGHT RANGE IS NOT.
     *
     * three.js does `distance` and `decay` in WORLD units, and nothing
     * rescales them — so the room's metres are not the light's metres, and a
     * `distance` of 0.75 is really 0.75/s ≈ 1.7 metres of hospital. That is a
     * metre past the bed, onto the monitor, whose screen is a roughness-0.3
     * plane: it took the spill as one fat specular highlight and the panel
     * showed a gold blob on the glass beside the gold orb on the wall — two
     * souls, at the exact second there is one. Shrinking the constant chases
     * it forever (2.6 → 1.7 → 1.0 → 0.75 all still reached); convert instead,
     * and spend the numbers in ROOM metres like the rest of the staging.
     * Intensity goes as s² because decay is inverse-square.
     */
    if (light.current) {
      light.current.distance = SOUL_LIGHT_REACH * s
      light.current.intensity = SOUL_LIGHT_ROOM * s * s * born
    }
  })

  return (
    <group ref={grp} visible={false}>
      {ORB_LAYERS.map(([sz], i) => (
        <mesh key={i} material={mats[i]} renderOrder={20 + i}>
          <planeGeometry args={[sz, sz]} />
        </mesh>
      ))}
      <pointLight ref={light} color={SOUL_GOLD} intensity={0} distance={0.4} decay={2} />
    </group>
  )
}

function BedsideChair() {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3A3F4A', roughness: 0.7 }), [])
  return (
    <group position={[0.98, 0, -0.45]} rotation={[0, -0.5, 0]}>
      <mesh material={mat} position={[0, 0.44, 0]}>
        <boxGeometry args={[0.42, 0.035, 0.4]} />
      </mesh>
      {([[-0.18, -0.17], [0.18, -0.17], [-0.18, 0.17], [0.18, 0.17]] as const).map(([x, z], i) => (
        <mesh key={i} material={mat} position={[x, 0.22, z]}>
          <cylinderGeometry args={[0.016, 0.016, 0.44, 8]} />
        </mesh>
      ))}
      <mesh material={mat} position={[0, 0.72, -0.185]} rotation={[-0.08, 0, 0]}>
        <boxGeometry args={[0.42, 0.5, 0.03]} />
      </mesh>
      {/* The hat used to sit here; it lies beside her head on the bed now. */}
    </group>
  )
}

function IVPole() {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#585E6A', roughness: 0.4, metalness: 0.6 }), [])
  return (
    <group position={[-1.12, 0, -1.35]}>
      <mesh material={mat} position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.16, 0.18, 0.035, 12]} />
      </mesh>
      <mesh material={mat} position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.013, 0.013, 1.78, 8]} />
      </mesh>
      <mesh material={mat} position={[0, 1.76, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.01, 0.01, 0.42, 8]} />
      </mesh>
      <mesh position={[0.17, 1.6, 0]}>
        <boxGeometry args={[0.09, 0.16, 0.04]} />
        <meshStandardMaterial color="#9BA0AC" emissive="#9BA0AC" emissiveIntensity={0.08} roughness={0.4} />
      </mesh>
    </group>
  )
}

/** The bedside monitor. One pale line, and at FLAT0 it stops meaning her. */
const ECG_N = 64
const ECG_W = 0.86
/** Alive green → the grey it leaves behind. The colour change IS the event. */
const ECG_LIVE = new THREE.Color('#C4E8D8')
const ECG_DEAD = new THREE.Color('#9AA0A6')
function ecgY(u: number, t: number): number {
  // A sweeping trace: one beat per 0.9s of sweep-space, QRS-ish spike.
  const s = u * 2.2 - t * 1.1
  const c = s - Math.floor(s)
  let y = 0.011 * Math.sin(c * Math.PI * 2 * 3.1)
  if (c > 0.42 && c < 0.5) y += 0.14 * Math.sin(((c - 0.42) / 0.08) * Math.PI)
  if (c > 0.5 && c < 0.56) y -= 0.056 * Math.sin(((c - 0.5) / 0.06) * Math.PI)
  return y
}

function MonitorLine() {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ECG_N * 3), 3))
    return g
  }, [])
  const mat = useMemo(() => new THREE.LineBasicMaterial({
    color: ECG_LIVE.clone(), toneMapped: false, transparent: true, opacity: 0.95,
  }), [])
  const line = useMemo(() => new THREE.Line(geo, mat), [geo, mat])

  useFrame(() => {
    const t = getAnimTime()
    const flat = ramp(t, FLAT0, FLAT1)
    const amp = 1 - flat
    // The line loses its colour as it loses its beat: green while it is her,
    // grey once it is only a line. Same ramp, so they land on the same frame.
    mat.color.copy(ECG_LIVE).lerp(ECG_DEAD, flat)
    const pos = geo.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < ECG_N; i++) {
      const u = i / (ECG_N - 1)
      pos.setXYZ(i, -ECG_W / 2 + u * ECG_W, ecgY(u, t) * amp, 0)
    }
    pos.needsUpdate = true
  })
  return <primitive object={line} />
}

/*
 * There used to be a BIG TRACE here — the same ECG as a bold additive ribbon
 * sweeping the full width of the panel over the bed, half scenography, half
 * title card. It was added because the bedside monitor was ninety pixels of
 * the delivered frame and nobody read the event. The monitor is nearly twice
 * that size now and it pushes in as the line flattens, which is enough; the
 * ribbon was reading as a caption on the shot. Removed on purpose — the death
 * is allowed to stay ambiguous, carried by the monitor alone.
 */

/**
 * The bedside monitor — big, because it is the only thing in this scene
 * that says the word. It was a 0.58-metre box on a far wall inside a
 * half-frame panel, i.e. about ninety pixels of the delivered picture, and
 * the one event the whole silence is built around was happening at that
 * size. It is nearly twice as wide now, hung lower and further forward, and
 * it grows another notch as the line goes flat.
 */
function BedsideMonitor() {
  const push = useRef<Group>(null)
  useFrame(() => {
    const t = getAnimTime()
    push.current?.scale.setScalar(1 + 0.14 * ramp(t, FLAT0 - 0.5, FLAT1))
  })
  return (
    <group ref={push} position={[-0.34, 1.42, -1.86]}>
      <mesh position={[0, 0, -0.04]}>
        <boxGeometry args={[1.06, 0.74, 0.08]} />
        <meshStandardMaterial color="#2E323C" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh>
        <planeGeometry args={[0.96, 0.64]} />
        <meshStandardMaterial color="#0A0F12" emissive="#101C1A" emissiveIntensity={0.7}
          roughness={0.3} toneMapped={false} />
      </mesh>
      <group position={[0, -0.03, 0.006]}>
        <MonitorLine />
      </group>
    </group>
  )
}

function HospitalRoom() {
  const doctorBow = useRef<Group>(null)
  useFrame(() => {
    const t = getAnimTime()
    if (doctorBow.current) doctorBow.current.rotation.x = ramp(t, BOW0, BOW1) * 0.035
  })
  const doctorMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: GRIEF_LIGHT, emissive: GRIEF_LIGHT, emissiveIntensity: 0.06, roughness: 0.6,
  }), [])

  /*
   * Her: a GUTTERING gold, not a lit one — then the room's own grey.
   *
   * She was lit at 0.62 flat and read as healthy, which made the orb look
   * like it was leaving a well person; the note was "shouldn't be that
   * yellow… very dimly flickering at the start". So the emissive idles near
   * 0.17 and wanders on three detuned sines, a candle with nothing left in
   * it. The flicker is what makes the frame BEFORE the death do work: it is
   * already failing, so the flatline is a confirmation instead of a surprise.
   *
   * Both the flicker and the colour die on the same ramp the orb is born on
   * — she stops being a light source at the moment the light leaves her.
   */
  const herMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: HER_ALIVE.clone(), emissive: GOLD.clone(), emissiveIntensity: 0.2, roughness: 0.55,
  }), [])
  useFrame(() => {
    const t = getAnimTime()
    const u = smooth01((t - SOUL0) / (HER_GRAY1 - SOUL0))
    const gutter = 0.5 + 0.5 * (
      0.55 * Math.sin(t * 4.7) + 0.3 * Math.sin(t * 9.3 + 1.1) + 0.15 * Math.sin(t * 17.7 + 2.3)
    )
    herMat.color.copy(HER_ALIVE).lerp(HER_DEAD, u)
    herMat.emissive.copy(GOLD).lerp(HER_DEAD, u)
    herMat.emissiveIntensity = THREE.MathUtils.lerp(0.34 * gutter, 0.04, u)
  })

  return (
    <group>
      <PanelBackstop />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.8, 0.002, -1]}>
        <planeGeometry args={[4.4, 3.4]} />
        <meshStandardMaterial color="#26262C" roughness={0.85} />
      </mesh>
      <mesh position={[0.8, 1.6, -2.1]}>
        <planeGeometry args={[4.4, 3.4]} />
        <meshStandardMaterial color={GRIEF_MID} roughness={0.92} />
      </mesh>
      <mesh position={[0.8, 0.5, -2.09]}>
        <planeGeometry args={[4.4, 1.0]} />
        <meshStandardMaterial color={GRIEF_DARK} roughness={0.92} />
      </mesh>
      <mesh position={[1.45, 1.05, -2.08]}>
        <planeGeometry args={[0.8, 2.1]} />
        <meshStandardMaterial color="#31313A" roughness={0.9} />
      </mesh>

      <group position={[0, 0, BED_Z]}>
        <mesh position={[-0.05, 0.38, 0]}>
          <boxGeometry args={[1.9, 0.22, 0.85]} />
          <meshStandardMaterial color="#3E3E46" roughness={0.7} />
        </mesh>
        <mesh position={[-0.05, 0.545, 0]}>
          <boxGeometry args={[1.94, 0.11, 0.88]} />
          <meshStandardMaterial color="#8A8E98" emissive="#8A8E98" emissiveIntensity={0.03} roughness={0.8} />
        </mesh>
        <mesh position={[-1.03, 0.62, 0]}>
          <boxGeometry args={[0.05, 0.75, 0.88]} />
          <meshStandardMaterial color="#43434C" roughness={0.7} />
        </mesh>
        {([[-0.95, -0.36], [0.85, -0.36], [-0.95, 0.36], [0.85, 0.36]] as const).map(([x, z], i) => (
          <mesh key={i} position={[x, 0.14, z]}>
            <boxGeometry args={[0.05, 0.28, 0.05]} />
            <meshStandardMaterial color="#2E2E36" roughness={0.6} />
          </mesh>
        ))}
        <mesh position={[-0.76, 0.63, 0]} rotation={[0, 0, 0.02]}>
          <boxGeometry args={[0.36, 0.055, 0.42]} />
          <meshStandardMaterial color="#A2A6B0" emissive="#A2A6B0" emissiveIntensity={0.03} roughness={0.85} />
        </mesh>
      </group>
      {/* Her. Gold while she is alive, and the breath STOPS with the line. */}
      <LyingFigure
        position={[PILLOW_X, MATTRESS_TOP, BED_Z]}
        facing={-Math.PI / 2}
        kind="adult"
        material={herMat}
        pillowY={0.06} headTurn={0.3}
        stillFrom={FLAT0} stillTo={FLAT1}
      />
      {/* The satgat, beside her head on the FAR side of the pillow. It kept
          its old note ("put the hat next to their head instead") and stopped
          blocking her, which on this bed are only compatible on this side: the
          brim is 0.85 across on a 1.94 mattress, so anywhere on the near half
          it covers her — it was over her chest, which is both the body the
          beat is about and the exact spot the soul comes out of. Behind her it
          reads at the same size, and her body passes in front of it. */}
      <group position={[-0.7, MATTRESS_TOP + 0.055, -1.3]}>
        <HatOnChair material={herMat} />
      </group>

      <group position={[1.38, 0, -1.7]} rotation={[0, -0.55, 0]}>
        <group ref={doctorBow}>
          <GoldFigure
            pose="standing"
            material={doctorMat}
            rightHandAt={[0.19, 1.68, 0.1]}
            solvedArms
            animate={false}
          />
          <Phone hand={[0.19, 1.68, 0.1]} />
        </group>
      </group>

      <BedsideChair />
      <IVPole />
      <BedsideMonitor />

      <group position={[-0.1, 2.58, -1.15]}>
        <mesh>
          <boxGeometry args={[1.1, 0.04, 0.2]} />
          <meshStandardMaterial color="#D6DEEE" emissive="#DCE6FF" emissiveIntensity={1.5} toneMapped={false} />
        </mesh>
        <pointLight position={[0, -0.25, 0]} color="#DCE6FF" intensity={5} distance={3.6} decay={1.8} />
      </group>
      <ambientLight intensity={0.14} color="#8A94A8" />
    </group>
  )
}

/* ══ THE HUDDLE — UNLINKED, kept as backlog ══════════════════════════
 *
 * NOT MOUNTED. Director's note 2026-08-13: "remove the scene where there are
 * all hands around the character — you can unlink it somehow, keep it in the
 * backlog in case we ever want to use it — then just go immediately to the
 * award scene." Its 1.6s went to the call and the stage. Everything below
 * (env1, the rank, the chain solve, HuddleVignette) is the working version
 * that shipped in the 2026-08-12 cut; to restore it, mount <HuddleVignette />
 * inside MontageStage again and give env1 a window between the sweep and
 * T_SW. */

/** The huddle's own fade envelope (backlog — nothing evaluates it while the
 *  vignette is unmounted). */
const HUD0 = 6.0
const HUD1 = 7.25
const env1 = (t: number) => ramp(t, HUD0, HUD0 + 0.45) * (1 - ramp(t, HUD1, HUD1 + 0.3))

/**
 * A LINE, facing the lens, arms across each other's backs — and HE IS NOT
 * HELD. He stands in it, in the middle, grey, head down, and nothing rests on
 * his shoulders. That is the whole note: they are together and he is with
 * them and he is still the one who is not okay.
 *
 * It was a horseshoe with the two nearest him putting an arm around his
 * shoulders. Two things were wrong with that and only one of them was the
 * staging. The other was measurable: `ARM = 0.55` and the solver puts the
 * hand on the target unconditionally (past full extension `elbow_out` goes to
 * zero and the arm simply STRETCHES), and the horseshoe's neighbour links ran
 * 0.66–0.72 apart — 119% and 131% of the arm. Every one of them rendered as a
 * dead-straight horizontal tube at neck height crossing the front of the next
 * man's chest: a paper chain, not an embrace.
 *
 * One rank at s = 0.42 with the hand target 0.05 PAST the neighbour's centre
 * line and 0.13 BEHIND it solves at d = 0.472 = 86% of the arm with
 * `elbow_out` = 0.141 — the first bent arm this shot has ever had — and the
 * z = −0.13 is what routes the forearm behind the neighbour's neck instead of
 * across their chest. The two inner members reach across HIS BACK at y = 1.24,
 * which is 0.15 below his drooped shoulder, so the forearm disappears behind
 * his flank and nothing crosses his head or shoulder line.
 */
const HUDDLE = [
  { name: 'Jin',   color: '#FFA3C9', x: -1.26 },
  { name: 'RM',    color: '#5B7BFF', x: -0.84 },
  { name: 'V',     color: '#B876FF', x: -0.42 },
  { name: 'Jimin', color: '#7BE838', x:  0.42 },
  { name: 'Suga',  color: '#6FEDC4', x:  0.84 },
  { name: 'JHope', color: '#FF6B4D', x:  1.26 },
] as const
/** The chain along the rank. The hero occupies x = 0 and the two inner
 *  members bridge him with the BACK link below — the chain is unbroken and
 *  he is not part of it. */
const HUD_LINKS: [number, number][] = [[0, 1], [1, 2], [3, 4], [4, 5]]
/** Which two reach behind him. */
const HUD_BACKS = [2, 3]

const GLOW_HUDDLE = 0.5

/** All seven face the lens. This is a REPLACEMENT for the old
 *  `atan2(-x, -z)`, not a re-feeding of it: with z = 0 that expression
 *  evaluates to ±π/2 and the rank would render as a row of profiles. */
function huddleYaw(_i: number): number {
  return 0
}

/** A point in the huddle's frame, expressed in member i's local space. Kept
 *  general (it costs nothing) so a toe-in stays available — though not
 *  advisable: the reach budget is already 86–96% of the arm and rotating the
 *  root eats straight into it. */
function localOf(i: number, wx: number, wy: number, wz: number): V3 {
  const yaw = huddleYaw(i)
  const dx = wx - HUDDLE[i].x
  const dz = wz
  const cos = Math.cos(yaw)
  const sin = Math.sin(yaw)
  return [dx * cos - dz * sin, wy, dx * sin + dz * cos]
}

/** The neighbour's far deltoid, reached from BEHIND the neck. */
function shoulderTarget(i: number, j: number, t: number): V3 {
  const breatheJ = Math.sin(t * 0.8 + j * 1.1) * 0.012
  const dir = Math.sign(HUDDLE[j].x - HUDDLE[i].x)
  return localOf(i, HUDDLE[j].x + 0.05 * dir, 1.5 + breatheJ, -0.13)
}

/** The bridge across HIS back — not his shoulders. y = 1.24 sits 0.15 below
 *  the shoulder his droop actually puts him at (headPose's shoulderY at
 *  k ≈ 0.95), so the arm passes behind his flank at mid-back. */
function heroBackTarget(i: number): V3 {
  const dir = -Math.sign(HUDDLE[i].x)
  return localOf(i, 0.05 * dir, 1.24, -0.15)
}

function makeHuddleSkeleton(i: number) {
  const linked = HUD_LINKS.filter(l => l.includes(i)).map(l => (l[0] === i ? l[1] : l[0]))
  const backs = HUD_BACKS.includes(i)
  return ({ P, t }: { P: Proportions; t: number; phase: number }): PoseGeometry => {
    // Undefined, not a pinned default: `buildPose('standing')` then falls back
    // to a real resting arm at the side. The old code pinned BOTH hands
    // always, so the two ends of the chain stood there with a kinked stump
    // across their own body.
    let leftHandAt: [number, number, number] | undefined
    let rightHandAt: [number, number, number] | undefined
    for (const j of linked) {
      const tgt = shoulderTarget(i, j, t)
      if (tgt[0] < 0) leftHandAt = tgt
      else rightHandAt = tgt
    }
    if (backs) {
      const tgt = heroBackTarget(i)
      if (tgt[0] < 0) leftHandAt = tgt
      else rightHandAt = tgt
    }
    const breathe = Math.sin(t * 0.8 + i * 1.1) * 0.012
    if (leftHandAt) leftHandAt = [leftHandAt[0], leftHandAt[1] + breathe, leftHandAt[2]]
    if (rightHandAt) rightHandAt = [rightHandAt[0], rightHandAt[1] + breathe, rightHandAt[2]]
    return buildPose('standing', {
      P, phase: 0,
      leftHandAt, rightHandAt, solvedArms: true,
      // Near-neutral: the old 0.055 was a bow toward a centre that no longer
      // exists. The per-member phase stays as the only variety in a rank of
      // otherwise identical bodies.
      headForwardTilt: 0.02 + 0.012 * Math.sin(t * 0.6 + i),
    })
  }
}

// Backlog: referenced here so the unmounted vignette survives
// noUnusedLocals without being exported.
void HuddleVignette

function HuddleVignette() {
  const root = useRef<Group>(null)
  const lightRef = useRef<THREE.PointLight>(null)

  const mats = useMemo(() => ({
    members: HUDDLE.map(m => new THREE.MeshStandardMaterial({
      color: m.color, emissive: m.color, emissiveIntensity: GLOW_HUDDLE,
      roughness: 0.55, transparent: true,
    })),
    disc: new THREE.MeshBasicMaterial({
      color: '#000000', transparent: true, opacity: 0.3, depthWrite: false,
    }),
  }), [])
  const skeletons = useMemo(() => HUDDLE.map((_, i) => makeHuddleSkeleton(i)), [])

  useFrame(() => {
    const t = getAnimTime()
    const e = env1(t)
    if (root.current) root.current.visible = e > 0.004
    if (!root.current?.visible) return
    for (const m of mats.members) {
      m.opacity = e
      m.emissiveIntensity = GLOW_HUDDLE * e
    }
    mats.disc.opacity = 0.3 * e
    if (lightRef.current) lightRef.current.intensity = 4.2 * e
  })

  return (
    <group ref={root}>
      {HUDDLE.map((m, i) => (
        <group key={m.name} position={[m.x, 0, 0]} rotation={[0, huddleYaw(i), 0]}>
          <GoldFigure skeleton={skeletons[i]} material={mats.members[i]} />
          {/* r = 0.18, not 0.3: at a 0.42 spacing a 0.3 disc overlaps its
              neighbour by 0.18, and these are depthWrite:false MeshBasic at
              0.3 opacity, so every overlap doubles up into a visible dark
              band under the rank. */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
            <circleGeometry args={[0.18, 16]} />
            <primitive object={mats.disc} attach="material" />
          </mesh>
        </group>
      ))}
      <pointLight ref={lightRef} position={[0, 2.7, 1.3]} color="#FFD9A8" intensity={0} distance={9} />
    </group>
  )
}

/* ══ MONTAGE STAGE-DRESSING — floor, backstop, air ═══════════════════ */

function MontageAtmosphere() {
  const amb = useRef<THREE.AmbientLight>(null)
  const fill = useRef<THREE.PointLight>(null)
  useFrame(() => {
    const g = montageGate(getAnimTime())
    if (amb.current) amb.current.intensity = 0.3 * g
    if (fill.current) fill.current.intensity = 1.5 * g
  })
  return (
    <>
      <ambientLight ref={amb} color="#8E96A8" intensity={0} />
      <pointLight ref={fill} position={[1.3, 2.5, 2.7]} color="#9AA6BE" intensity={0} distance={9} />
    </>
  )
}

function MontageStage() {
  const root = useRef<Group>(null)
  useFrame(() => {
    const t = getAnimTime()
    // The gate runs to STAGE_IN1, not to T_SW: MontageAtmosphere lives inside
    // it, an invisible group's lights do not render, and its AMBIENT is the
    // only general light on him across the swap until HallLights are up.
    // (Its geometry is 5,900 units and one `cam.far` behind the lens by then,
    // so the extra second costs nothing to look at.)
    if (root.current) root.current.visible = t > 6.35 && t < STAGE_IN1
  })
  return (
    // The montage frame IS the rig's human-phase frame: everything here is
    // authored around the hero (6.9's origin) and mounted on his mark.
    <group ref={root} visible={false} position={STOP_POS} rotation={[0, WALK_ROT, 0]}>
      {/*
        Opaque floor. It survived the deletion of the crowd and the bed for a
        reason that is not decoration: the members' ground discs and the hero's
        GroundShadow are unlit black MeshBasic discs with depthWrite:false, so
        with no opaque surface behind them they are black-on-black and the rank
        floats; and it is the only surface carrying the huddle light's falloff.
        Down from 40×24 — that was sized for the corridor's 12-unit travel and
        its 15-wide carpet, both gone.
      */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, 0]}>
        <planeGeometry args={[10, 8]} />
        <meshStandardMaterial color="#0D0E13" roughness={0.95} />
      </mesh>
      <mesh position={[0, 2.2, -3.6]}>
        <planeGeometry args={[8, 5]} />
        <meshStandardMaterial color={GRIEF_DARK} roughness={1} />
      </mesh>
      <MontageAtmosphere />
      {/* <HuddleVignette /> — unlinked to the backlog; see its header. */}
    </group>
  )
}

/* ══ THE STADIUM (Act 1's, gain-driven for the fade-up and the death) ═ */

const stageIn = (t: number) => ramp(t, STAGE_IN0, STAGE_IN1)
const dimOut = (t: number) => ramp(t, STAGE_DIM0, STAGE_DIM1)

/** Silent-cheer envelope (6.95's), waking with the fade-up. The 0.65 was 1.2,
 *  which is nearly the whole stage window — the grey souls would have reached
 *  full silent-jump one frame before the world swapped, i.e. a frozen crowd
 *  for the entire reveal. */
function jumpEnv(t: number): number {
  const arc = 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / 0.5)
  const breathe = 0.86 + 0.14 * Math.sin(t * 0.53 + 1.2)
  const surge = 1 + 0.22 * ramp(t, T_LIFT0 + 0.12, T_LIFT1 + 0.18)
  return arc * clamp01((t - T_SW) / 0.65) * breathe * surge
}

const RX = BOWL_RX
const RZ = BOWL_RZ

function GraySouls() {
  const tierMat = useMemo(() => makeCrowdMaterial(), [])
  const floorMat = useMemo(() => makeCrowdMaterial(), [])

  const tiers = useMemo<PointCloud>(() => buildCloud(
    30000, 8821, SOUL_GRAYS,
    rand => {
      const [x, y, z] = seatSample(rand)
      if (z > RZ * 1.2 && Math.abs(x) < RX * 1.15) return null
      const bright = rand() < 0.16
      return [
        x + (rand() - 0.5) * 4, y, z + (rand() - 0.5) * 4,
        bright ? 5.4 + rand() * 2.4 : 6.4 + rand() * 3.0,
        bright ? 0.72 + rand() * 0.24 : 0.42 + rand() * 0.4,
      ]
    },
  ), [])

  const bombs = useMemo<PointCloud>(() => buildCloud(
    5200, 8822, [SOUL_BOMB_GRAY, '#7A7390'],
    rand => {
      const [x, y, z] = seatSample(rand)
      if (z > RZ * 1.2 && Math.abs(x) < RX * 1.15) return null
      return [x, y + 5.5 + rand() * 3, z, 3.2 + rand() * 2.0, 0.34 + rand() * 0.28]
    },
  ), [])

  const floor = useMemo<PointCloud>(() => buildCloud(
    12000, 8823, SOUL_GRAYS,
    rand => {
      const a = rand() * Math.PI * 2
      const r = Math.sqrt(rand())
      const x = Math.cos(a) * r * RX * 0.96
      const z = Math.sin(a) * r * RZ * 0.96
      if (z > RZ * 0.30 && Math.abs(x) < RX * 0.80) return null
      if (Math.abs(x) < 26 && z > -RZ * 0.55) return null
      return [x, 4.5, z, 6.2 + rand() * 3.0, 0.4 + rand() * 0.42]
    },
  ), [])

  useFrame(({ camera, size, gl }) => {
    const t = getAnimTime()
    const px = size.height * gl.getPixelRatio()
    const env = jumpEnv(t)
    // 1.0, not 0.96: every gain in this subtree has to reach EXACTLY zero by
    // STAGE_DIM1, which lands 0.05s before the world swap. A 4% residue is
    // 47,200 additive points still on screen on the frame the stadium is
    // deleted, and that residue is what makes a covered swap read as a cut.
    const global = stageIn(t) * (1 - dimOut(t))
    for (const m of [tierMat, floorMat]) {
      updateGlow(m, camera, px, t)
      m.uniforms.uPulse.value = 0
      m.uniforms.uJumpEnv.value = env
      m.uniforms.uGlobal.value = global
    }
    floorMat.uniforms.uJump.value = 4.6
    tierMat.uniforms.uJump.value = 2.6
  })

  return (
    <group position={[0, 0, STADIUM_Z]}>
      <GlowPoints cloud={tiers} material={tierMat} />
      <GlowPoints cloud={bombs} material={tierMat} />
      <GlowPoints cloud={floor} material={floorMat} />
    </group>
  )
}

/* — the confetti —
 *
 * Two clouds and one shader. The far RAIN over the bowl is the stadium's own
 * celebration, falling for the whole reveal; the POOF is the burst around his
 * hands, and it is the thing that covers the world swap.
 */

function makeConfettiMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uScale: { value: 700 },
      uGlobal: { value: 1 },
      uMaxPx: { value: 34 },
    },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute vec3 aColor;
      attribute float aAlpha;
      attribute float aPhase;
      uniform float uTime;
      uniform float uScale;
      uniform float uMaxPx;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float span = 175.0;
        float speed = 9.0 + fract(aPhase * 7.31) * 7.0;
        float fall = mod(position.y + uTime * speed, span);
        vec3 p = vec3(position.x, 190.0 - fall, position.z);
        p.x += sin(uTime * (0.4 + fract(aPhase * 3.7) * 0.6) + aPhase * 41.0) * 7.0;
        p.z += cos(uTime * (0.3 + fract(aPhase * 2.9) * 0.5) + aPhase * 27.0) * 5.0;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vColor = aColor;
        vAlpha = aAlpha * (0.42 + 0.58 * abs(sin(uTime * (2.2 + fract(aPhase * 5.3) * 2.6) + aPhase * 61.0)));
        gl_PointSize = clamp(aSize * uScale / max(1.0, -mv.z), 0.0, uMaxPx);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vAlpha;
      uniform float uGlobal;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv) * 2.0;
        float a = pow(max(0.0, 1.0 - d), 2.2) * vAlpha * uGlobal;
        if (a < 0.004) discard;
        gl_FragColor = vec4(vColor * a, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  })
}

function GrayConfetti() {
  const mat = useMemo(() => makeConfettiMaterial(), [])
  // The far rain, in stadium units — the paper falling everywhere the cannons
  // are not. Trebled and doubled in size with the cannons ("it's tiny, it's
  // nothing"): at 650 flakes 1.5–2.8 units across a 300×175×210 volume the
  // bowl read as clean air with a few specks in it.
  const cloud = useMemo<PointCloud>(() => buildCloud(
    1900, 8824, ['#C9CED8', '#AAB0BA', '#8E939E', '#B8BDC6'],
    rand => [
      (rand() - 0.5) * 300,
      rand() * 175,
      -40 + rand() * 210,
      3.2 + rand() * 2.8,
      0.5 + rand() * 0.35,
    ],
  ), [])

  useFrame(({ camera, size, gl }) => {
    const t = getAnimTime()
    updateGlow(mat, camera, size.height * gl.getPixelRatio(), t)
    mat.uniforms.uGlobal.value = stageIn(t) * (1 - dimOut(t))
  })

  return (
    <group position={[0, 0, STADIUM_Z]}>
      <GlowPoints cloud={cloud} material={mat} frustumCulled={false} />
    </group>
  )
}

/**
 * TRUE neutrals, not the blue-greys the far rain uses (#C9CED8 and friends
 * only look colourless because HueSaturation is sitting at −0.92 when they
 * are on screen). The poof is authored neutral so it stays colourless
 * whatever later happens to the grade — the direction was "colorless
 * confetti", and this is the cheapest way to mean it.
 */
const POOF_NEUTRALS = ['#E6E6E6', '#C2C2C2', '#9C9C9C', '#787878']
const FLASH_WHITES = ['#FFFFFF', '#F2F4F8', '#E4E9F2']

/**
 * The cannons: rig-local mouths at the deck edges, axes crossing up and
 * inward over his head. Terminal distance under drag ≈ 5.6·jit units, so the
 * jets arc across the upper third and rain through the push.
 *
 * FOUR of them, not two, and everything about the paper is bigger — "it's a
 * measly confetti, it's tiny, it's nothing". The old pair threw 560 flakes at
 * 0.015–0.044 units capped at 26 screen pixels, from a lens 2.5 units away at
 * a figure 1.8 tall: about a pixel and a half each, which at the wide is
 * drizzle. It is 3,600 flakes now at 0.035–0.11 and a 90px cap, over four
 * mouths (the outer pair further out and flatter, so the jets cross at two
 * different heights instead of making one arch), with a wider cone and a
 * longer stagger so the fall keeps coming instead of arriving as one puff.
 */
const STREAM_CANNONS: { seed: number; origin: V3; axis: V3 }[] = [
  { seed: 8831, origin: [-3.3, 0.1, 0.55], axis: [0.52, 1.0, -0.05] },
  { seed: 8833, origin: [3.3, 0.1, 0.55], axis: [-0.52, 1.0, -0.05] },
  { seed: 8835, origin: [-5.1, 0.1, -0.35], axis: [0.78, 1.0, 0.12] },
  { seed: 8837, origin: [5.1, 0.1, -0.35], axis: [-0.78, 1.0, 0.12] },
]

/**
 * A burst, evaluated entirely in the vertex shader so it stays ONE draw call
 * and zero per-frame CPU — the way every other cloud in this scene is written.
 *
 * The maths is lifted from `src/scenes/act7r/Fireworks.tsx` (the air-drag
 * integral at :186–191 and the gravity term after it), which is the only real
 * burst in the repo; its packaging is not reusable here (valley-unit shell
 * positions, a rise phase, five-sample trails, three point lights and a CPU
 * rewrite of five Float32Arrays a frame) so only the six lines of maths came
 * across. Directions are a seeded uniform sphere with y remapped to
 * [−0.15, 1.0], so it poofs UP and outward rather than as a ball.
 *
 * `uRigScale` is not decoration. `gl_PointSize` is in PIXELS and does not
 * inherit the model matrix, so a cloud living inside the rig — which is ×1 in
 * the apartment, ×17 in the stadium and ×20 in the valley — would shrink to a
 * quarter of a pixel the moment the rig scaled up, and would then change size
 * again at the world swap. Feeding the frame's own scale in cancels both: the
 * flake's screen size is identical in all three frames, exactly like
 * everything else on the rig.
 *
 * Every `pow` here guards its base. A single NaN in an additively-composited
 * quad gets smeared over the entire frame by Bloom's mipmap chain and the shot
 * renders black — see the trap list in CLAUDE.md and stadium.tsx:511.
 */
function makePoofMaterial(p: {
  square: boolean; additive: boolean; maxPx: number
  t0: number; origin: V3; speed: number; drag: number; gravity: number; life: number
  stagger: number
}): THREE.ShaderMaterial {
  const { square, additive } = p
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uScale: { value: 700 },
      uGlobal: { value: 0 },
      uMaxPx: { value: p.maxPx },
      uRigScale: { value: 1 },
      uT0: { value: p.t0 },
      uOrigin: { value: new THREE.Vector3(p.origin[0], p.origin[1], p.origin[2]) },
      uSpeed: { value: p.speed },
      uDrag: { value: p.drag },
      uG: { value: p.gravity },
      uLife: { value: p.life },
      uStagger: { value: p.stagger },
    },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute vec3 aColor;
      attribute float aAlpha;
      attribute float aPhase;
      uniform float uTime, uScale, uMaxPx, uRigScale, uT0, uSpeed, uDrag, uG, uLife, uStagger;
      uniform vec3 uOrigin;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        // Per-particle launch delay: a cannon STREAMS paper for uStagger
        // seconds rather than throwing one instantaneous puff.
        float bt = max(0.0, uTime - uT0 - fract(aPhase * 9.17) * uStagger);
        float jit = 0.55 + fract(aPhase * 13.1) * 0.70;
        // Fireworks.tsx:186-191 — distance under linear air drag, then gravity.
        float d = (uSpeed * jit / uDrag) * (1.0 - exp(-uDrag * bt));
        vec3 p = uOrigin + normalize(position) * d;
        p.y -= uG * bt * bt;
        // A little flutter, growing with time in the air (paper, not shot).
        p.x += sin(bt * (1.7 + fract(aPhase * 3.7) * 1.6) + aPhase * 41.0) * 0.06 * bt;
        p.z += cos(bt * (1.5 + fract(aPhase * 2.9) * 1.4) + aPhase * 27.0) * 0.06 * bt;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vColor = aColor;
        float u = clamp(bt / uLife, 0.0, 1.0);
        vAlpha = aAlpha * smoothstep(0.0, 0.05, bt) * pow(max(0.0, 1.0 - u), 1.3);
        gl_PointSize = clamp(aSize * uRigScale * uScale / max(1.0, -mv.z), 0.0, uMaxPx);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vAlpha;
      uniform float uGlobal;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        ${square
          ? 'float d = max(abs(uv.x), abs(uv.y)) * 2.0;'
          : 'float d = length(uv) * 2.0;'}
        float a = pow(max(0.0, 1.0 - d), ${square ? '0.7' : '2.2'}) * vAlpha * uGlobal;
        if (a < 0.004) discard;
        gl_FragColor = vec4(vColor * a, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  })
}

function PoofCloud({
  count, seed, t0, origin, speed, drag, gravity, life,
  sizeMin, sizeMax, maxPx, colors, square = false, additive = false,
  axis, spread = 0.18, stagger = 0, fadeOut,
}: {
  count: number
  seed: number
  t0: number
  origin: V3
  speed: number
  drag: number
  gravity: number
  life: number
  sizeMin: number
  sizeMax: number
  maxPx: number
  colors: string[]
  square?: boolean
  additive?: boolean
  /** Directional CONE instead of the fountain: every particle flies along
   *  `axis` (need not be normalised) jittered by `spread` — this is what
   *  makes a burst read as a streamer CANNON rather than a poof. */
  axis?: V3
  spread?: number
  /** Seconds over which particles launch (0 = one instantaneous burst). */
  stagger?: number
  /** [t0, t1] over which the whole cloud goes out, independent of its physics
   *  life. The poof's flakes drift for over two seconds; the clip is over in
   *  half of one, and the seam frame has to be 7.4's t=0, which has no
   *  confetti in it. Without this the last frame of 6.85 carries thirty white
   *  flakes that vanish on 7.4's first — a pop on the one join that is
   *  supposed to be invisible by construction. */
  fadeOut?: [number, number]
}) {
  const root = useRef<Group>(null)
  const mat = useMemo(
    () => makePoofMaterial({ square, additive, maxPx, t0, origin, speed, drag, gravity, life, stagger }),
    [square, additive, maxPx, t0, origin, speed, drag, gravity, life, stagger],
  )
  const cloud = useMemo<PointCloud>(() => buildCloud(count, seed, colors, rand => {
    // Uniform sphere first — either the fountain's raw material or the
    // cone's jitter.
    const uz = rand() * 2 - 1
    const a = rand() * Math.PI * 2
    const s = Math.sqrt(Math.max(0, 1 - uz * uz))
    let dx = Math.cos(a) * s
    let dz = Math.sin(a) * s
    let dy: number
    if (axis) {
      // The cannon: axis plus jitter. Sphere point scaled by spread.
      dx = axis[0] + dx * spread
      dy = axis[1] + uz * spread
      dz = axis[2] + dz * spread
    } else {
      // The fountain: y remapped upward — a ball of paper reads as an
      // explosion, a fountain reads as confetti.
      dy = -0.15 + (uz + 1) * 0.575
    }
    const n = Math.max(1e-4, Math.hypot(dx, dy, dz))
    return [dx / n, dy / n, dz / n, sizeMin + rand() * (sizeMax - sizeMin), 0.55 + rand() * 0.45]
  }), [count, seed, colors, sizeMin, sizeMax, axis, spread])

  useFrame(({ camera, size, gl }) => {
    const t = getAnimTime()
    const out = fadeOut ? 1 - ramp(t, fadeOut[0], fadeOut[1]) : 1
    const live = t > t0 && t < t0 + life + stagger && out > 0.004
    if (root.current) root.current.visible = live
    if (!live) return
    updateGlow(mat, camera, size.height * gl.getPixelRatio(), t)
    mat.uniforms.uRigScale.value = spaceFrame(t).s
    mat.uniforms.uGlobal.value = out
  })

  return (
    <group ref={root} visible={false}>
      <GlowPoints cloud={cloud} material={mat} frustumCulled={false} />
    </group>
  )
}

function makeShaftMaterial(color: string, strength: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uAmount: { value: strength },
    },
    vertexShader: /* glsl */ `
      varying float vY;
      varying vec3 vView;
      varying vec3 vNrm;
      void main() {
        vY = uv.y;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = normalize(-mv.xyz);
        vNrm = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vY;
      varying vec3 vView;
      varying vec3 vNrm;
      uniform vec3 uColor;
      uniform float uAmount;
      void main() {
        float along = pow(max(0.0, vY), 2.0);
        float rim = 1.0 - abs(dot(normalize(vNrm), normalize(vView)));
        float a = along * (0.34 + 0.66 * pow(max(0.0, rim), 1.6)) * uAmount;
        gl_FragColor = vec4(uColor * a, a);
      }
    `,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, fog: false,
  })
}

function Followspot() {
  const shaftMat = useMemo(() => makeShaftMaterial('#C8CEDC', 0.4), [])
  const shaftGeo = useMemo(() => {
    const g = new THREE.ConeGeometry(26, 190, 20, 1, true)
    g.translate(0, -95, 0)
    return g
  }, [])
  const poolMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#3A404E', transparent: true, opacity: 0.2, toneMapped: false,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }), [])

  useFrame(() => {
    const t = getAnimTime()
    const g = stageIn(t) * (1 - dimOut(t))
    const lift = 1 + 0.18 * ramp(t, T_LIFT0, T_LIFT1 + 0.06)
    shaftMat.uniforms.uAmount.value = 0.4 * lift * g
    // The pool is a flat additive disc: fine from the push's high frontal
    // stand-off, but the ARC drops the lens to its height and a disc seen
    // edge-on is a hard bright LINE across the frame. It bows out as the
    // sweep starts — the shaft carries the followspot from there.
    poolMat.opacity = 0.2 * lift * g * (1 - ramp(t, ARC0, ARC0 + 0.28))
  })

  return (
    <group position={[HERO_POS[0], 0, HERO_POS[2]]}>
      <mesh geometry={shaftGeo} material={shaftMat} position={[0, 204, 0]} />
      {/* ONE pool, not two concentric discs. From the montage's old 50-unit
          stand-off the pair read as a soft glow; from the reveal's 250 they
          read as a hard-edged target painted on the deck. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, HERO_POS[1] + 0.3, 0]} material={poolMat}>
        <circleGeometry args={[20, 48]} />
      </mesh>
    </group>
  )
}

function HallLights() {
  const amb = useRef<THREE.AmbientLight>(null)
  const arena = useRef<THREE.PointLight>(null)
  const key = useRef<THREE.PointLight>(null)
  const rim = useRef<THREE.PointLight>(null)
  const scrim = useRef<THREE.MeshBasicMaterial>(null)

  useFrame(() => {
    const t = getAnimTime()
    const f = stageIn(t) * (1 - dimOut(t))
    if (amb.current) amb.current.intensity = 0.32 * f
    if (arena.current) arena.current.intensity = 60 * f
    if (key.current) key.current.intensity = 950 * f
    if (rim.current) rim.current.intensity = 420 * f
    if (scrim.current) {
      // 0.80, not 0.65: the old term bottomed out at 0.30, keeping the LED
      // wall permanently a third blacked — and the three 아리랑 discs are the
      // one object in this frame that says "this is the stadium from 0:20".
      // Recognition is bought with luminance here, not by relaxing the grade.
      // …and 0.85 on the way out, so the wall is fully blacked again by
      // STAGE_DIM1. The old 0.64 left it 21% visible at the swap, which on
      // screen is three faintly glowing discs sitting behind the confetti.
      scrim.current.opacity = Math.min(
        0.97, 0.95 - 0.80 * stageIn(t) + 0.85 * dimOut(t))
    }
  })

  return (
    <>
      <ambientLight ref={amb} intensity={0} color="#8C93A8" />
      <pointLight ref={arena} position={[0, 165, STADIUM_Z]} color="#8E96B4"
        intensity={0} distance={2600} decay={1.4} />
      <pointLight ref={key} position={[0, 58, STAGE_Z - 145]} color="#C7CEDF"
        intensity={0} distance={420} decay={1.6} />
      <pointLight ref={rim} position={[0, 80, STAGE_Z + 30]} color="#9FA8C2"
        intensity={0} distance={320} decay={1.6} />
      {/* 660×300 at y=96, up from 392×128. At the reveal's stand-off the frame
          is ~458×258 at the wall's depth, so the old scrim's four edges were
          INSIDE it and the fade-up showed a hard dark rectangle with lit tiers
          past its ends — a matte, not a dark room. */}
      <mesh position={[0, 96, STAGE_Z + 44.5]}>
        <planeGeometry args={[660, 300]} />
        <meshBasicMaterial ref={scrim} color="#000000" transparent opacity={0.95}
          side={THREE.DoubleSide} depthWrite={false} toneMapped={false} fog={false} />
      </mesh>
      <mesh position={[0, 17, STAGE_Z - 49.6]}>
        <boxGeometry args={[334, 3.4, 0.7]} />
        <meshStandardMaterial color="#15121F" roughness={0.9} />
      </mesh>
    </>
  )
}

/**
 * Act 1's bowl, facade and stage — and a gain on the parts of them that no
 * light can reach.
 *
 * `Facade` and `Stage` carry four self-lit pieces: the marquee band round the
 * concourse, the fourteen lit gate slots, the rim lip, and the strip light
 * along the front of the deck (stadium.tsx:410, :425, :436, :831). They are
 * `meshBasicMaterial toneMapped={false}`, which is correct for Act 1 — at
 * three kilometres they are what says "there is a stadium there" — and it
 * means they answer to NOTHING this scene does with light. Measured at the
 * punch-in framing: with every HallLights gain at zero and the scrim at 0.97,
 * the deck's lip strip was still a blown-out white bar across the lower third
 * on the frame before the world swap, i.e. the one object that stayed lit
 * while the stadium was supposed to be gone. They are mounted only here, so
 * driving their opacity is scoped to this scene and cannot reach Act 1.
 */
function StadiumStructure() {
  const root = useRef<Group>(null)
  const lit = useRef<{ m: THREE.Material; base: number }[]>([])
  useFrame(() => {
    if (!root.current) return
    if (lit.current.length === 0) {
      root.current.traverse(o => {
        const mm = (o as THREE.Mesh).material
        if (!mm) return
        for (const m of Array.isArray(mm) ? mm : [mm]) {
          if ((m as THREE.MeshBasicMaterial).toneMapped === false
            && !lit.current.some(e => e.m === m)) {
            lit.current.push({ m, base: m.opacity })
          }
        }
      })
    }
    const t = getAnimTime()
    const k = stageIn(t) * (1 - dimOut(t))
    for (const { m, base } of lit.current) {
      m.opacity = base * k
      const tr = m.opacity < 1
      if (m.transparent !== tr) {
        m.transparent = tr
        m.depthWrite = !tr
        m.needsUpdate = true
      }
    }
  })
  return (
    <group ref={root}>
      <Bowl />
      <Facade />
      <Stage />
    </group>
  )
}

/* ── 6.7's staging, on this deck ─────────────────────────────────────
 *
 * Lifted whole, not re-blocked. 6.7 authored its arena in metres and put it
 * on the bowl with one similarity transform whose origin is 6.85's own
 * HERO_POS — so the marks below are the same numbers 6.7 uses, through the
 * same `bowl()`, and the pedestal camera's lens lands exactly where it landed
 * there: 0.24 m over his head, off a 12-unit runway base.
 */
const M0_Z = 2.6
const RUNWAY_Y = 12
function bowl(x: number, y: number, z: number): [number, number, number] {
  return [-x * HERO_SCALE, y, HERO_POS[2] + (M0_Z - z) * HERO_SCALE]
}
const PROP_CAM = bowl(0.5, RUNWAY_Y, 6.7)
const PROP_CAM_SCALE = 25.2
/** The operator's body — 6.7's pit grey, its own instance so this scene's
 *  grade cannot reach back into 6.7's materials. */
const OPERATOR_MAT = new THREE.MeshStandardMaterial({
  color: '#332E38', emissive: '#332E38', emissiveIntensity: 0.05, roughness: 0.9,
})
/**
 * The other six on the deck — 6.7's table, 6.3's stadium palette. Under the
 * −0.92 HueSaturation they read as six grey bodies, which is the point: they
 * are still there, and the film has stopped being able to see colour.
 *
 * A LINE, and BOTH ARMS UP. They used to be a loose scatter across the deck,
 * standing at ease at z from −1.9 to +1.2, breathing — which is a group of
 * men waiting rather than a group of men who have just won something. The
 * note: "make all the figures stand up with their arms up in a victory pose,
 * like in a line on stage". So one rank, level with him at z = M0_Z, three
 * either side at 0.85 apart, hands over their heads.
 *
 * AND THE CUP IS NOT HIS. "Make one of the other figures hold the trophy" —
 * it goes to V, THIRD FROM THE LEFT, held up rather than hanging off a hand:
 * "so we can see it at the start", i.e. the cup has to be legible in the wide
 * reveal, before the push has gone anywhere near it. Which slot took three
 * tries. At +0.85 the pedestal broadcast camera — out on the runway at bowl x
 * 0.5, four times nearer the lens than the rank is — covered that man for the
 * whole reveal, so the arrival flare, which is the beat, happened behind a
 * camera head; the right-hand three stepped OUT to 1.15/2.0/2.85 to drop the
 * pedestal into the gap beside him instead, and the cup moved to 1.15. But
 * frame-right is the far side of a seven-man rank and the cup was small and
 * beside a camera prop there. At −0.85 it is clear of everything and it is
 * where the eye already is.
 *
 * The catch at −0.85 is the WAVE, which goes to frame-left too: with the cup
 * in the inner hand his raised hand and its stem land in the same twenty
 * pixels at the tight framing and read as the two of them holding it. So the
 * cup is always in the OUTER hand — `cupSide` below — 0.79 rig units clear of
 * where his hand gets to.
 *
 * Which is the better staging of the beat anyway,
 * and not by a small margin: the shot has never been about him winning. He
 * waves into a broadcast lens at every stage he plays because that is how she
 * finds him on a screen full of seven identical boys, and this is the one
 * where she is not on the other end of it. A man in a victory line with an
 * empty hand, waving at nobody, is that. A man holding the award is a
 * different, smaller scene.
 */
const ARENA_LINE_Z = M0_Z
const ARENA_BAND = [
  { name: 'Jin', color: '#FFA3C9', x: -2.55, phase: 0.11, cup: false },
  { name: 'RM', color: '#5B7BFF', x: -1.70, phase: 0.37, cup: false },
  { name: 'V', color: '#B876FF', x: -0.85, phase: 0.81, cup: true },
  { name: 'Jimin', color: '#7BE838', x: 1.15, phase: 0.24, cup: false },
  { name: 'Suga', color: '#6FEDC4', x: 2.00, phase: 0.52, cup: false },
  { name: 'J-Hope', color: '#FF6B4D', x: 2.85, phase: 0.63, cup: false },
] as const

/**
 * The victory arms, in figure-local units, and they are solved to a REACH
 * BUDGET rather than eyeballed: ADULT.ARM is 0.55 and `buildSolvedArmPoints`
 * puts the hand on the target unconditionally — past full extension the elbow
 * simply straightens and the arm STRETCHES (the huddle learned this the hard
 * way at 119–131% and rendered a rank of paper chains).
 *
 * Shoulder roots sit at (±0.02, 1.47, 0). The open V is 0.508 from the root =
 * 92% of the arm, so both elbows keep a real bend. Hands land at y ≈ 1.90
 * against a head that tops out at 1.89, so every hand clears every head.
 *
 * The cup hand is 0.516 (94%) and sits a fraction higher, at the same 0.29
 * out. It was 0.15 — near vertical, the truer "held aloft" gesture and
 * completely wrong on screen: the cup's bowl is 0.085 across with handles to
 * ±0.102, so it landed on top of the man's head and read as balanced there.
 *
 * AND THE FEET OPEN. `buildStandingLegPoints` is an idle stance — ankles at
 * ±0.032, all but touching — which is fine for a man waiting and wrong under
 * a pair of raised arms: it reads as attention, not as celebration ("their
 * legs are closed right now for the ones with arms up, can you open up a
 * teeny bit"). `stanceSpread` is a new opt-in pose input, defaulted to 0 so
 * no other figure in the film moves, that opens the ankles and leaves the
 * hips: the leg splays down its length rather than the body widening.
 *
 * It is a POSE input and not a per-scene skeleton on purpose. `skeleton`
 * forces GoldFigure's animate path, which rebuilds and re-merges the whole
 * body geometry every frame — six figures' worth, for a stance that never
 * changes. Through the pose it is built once.
 */
const VIC_L: [number, number, number] = [-0.29, 1.90, 0.02]
const VIC_R: [number, number, number] = [0.29, 1.90, 0.02]
const CUP_Y = 1.91
/** Ankle spread added to the idle stance: 0.032 → 0.102, i.e. feet about a
 *  fifth of a body width apart. A teeny bit. */
const VIC_SPREAD = 0.07

function ArenaBandMember({ color, x, phase, cup }: (typeof ARENA_BAND)[number]) {
  const ref = useRef<Group>(null)
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 0.5, roughness: 0.55,
    transparent: true,
  }), [color])
  const trophyMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#B8BDC6', emissive: '#B8BDC6', emissiveIntensity: 0.3,
    roughness: 0.3, metalness: 0.75, toneMapped: false,
    transparent: true, opacity: 0,
  }), [])
  const trophyRef = useRef<Group>(null)
  // The cup goes in the OUTER hand — the one further from him — so its stem
  // never shares screen space with his raised one. Local +x is frame-right
  // for every member, so the sign of the mark IS the outer side.
  const cupSide = x < 0 ? -1 : 1
  const cupHand = useMemo<[number, number, number]>(
    () => [cupSide * 0.29, CUP_Y, 0.02], [cupSide])
  useFrame(() => {
    const t = getAnimTime()
    const k = stageIn(t) * (1 - dimOut(t))
    material.opacity = k
    material.emissiveIntensity = 0.5 * k
    // The only motion is breath — a slow sway on a per-member phase.
    // (They WALKED in place here for a cut; "the other characters nearby
    // just walking — it's a little bit weird… have them stationary". They
    // hold their marks and the focus stays on him.)
    if (ref.current) ref.current.rotation.z = Math.sin(t * 1.8 + phase * 6.3) * 0.03
    if (!cup) return
    // THE CUP'S ARRIVAL, unchanged in mechanic, only in whose hand: the
    // emissive spikes 0.3 → 2.2 through Bloom's 0.62 threshold and the cup
    // condenses out of the flare. It leaves with the stage rather than on its
    // own ramp — the dim takes the whole rank at once.
    const inK = ramp(t, TROPHY_IN0, TROPHY_IN1)
    trophyMat.opacity = inK * k
    const spike = ramp(t, TROPHY_IN0, TROPHY_IN0 + 0.08)
      * (1 - ramp(t, TROPHY_IN0 + 0.08, TROPHY_IN0 + 0.35))
    trophyMat.emissiveIntensity = 0.3 + 1.9 * spike
    if (trophyRef.current) {
      trophyRef.current.visible = trophyMat.opacity > 0.004
      const grow = ramp(t, TROPHY_IN0, TROPHY_IN0 + 0.10)
      const settle = ramp(t, TROPHY_IN0 + 0.10, TROPHY_IN0 + 0.35)
      trophyRef.current.scale.setScalar(0.70 + 0.36 * grow - 0.06 * settle)
    }
  })
  return (
    <group position={bowl(x, HERO_POS[1], ARENA_LINE_Z)} rotation={[0, Math.PI, 0]}
      scale={HERO_SCALE}>
      <group ref={ref} rotation={[0, -x * 0.06, 0]}>
        <GoldFigure pose="standing" animate={false} material={material}
          leftHandAt={cup && cupSide < 0 ? cupHand : VIC_L}
          rightHandAt={cup && cupSide > 0 ? cupHand : VIC_R}
          solvedArms stanceSpread={VIC_SPREAD} />
        {cup && (
          <>
            <group ref={trophyRef} visible={false}
              position={[cupHand[0] - cupSide * 0.02, cupHand[1] - 0.175, cupHand[2] + 0.01]}>
              <Trophy material={trophyMat} />
            </group>
            {/* The spark ring the cup condenses out of. Same burst maths as
                the streamers, a tenth of the radius, additive and round
                rather than paper. */}
            <PoofCloud
              count={48} seed={8832} t0={TROPHY_IN0}
              origin={[cupHand[0], cupHand[1] - 0.05, cupHand[2]]}
              speed={1.6} drag={6.0} gravity={0.5} life={0.45}
              sizeMin={0.008} sizeMax={0.018} maxPx={18}
              colors={FLASH_WHITES} additive
            />
          </>
        )}
      </group>
    </group>
  )
}

/**
 * The pedestal camera out on the runway, and the operator at its viewfinder.
 *
 * It is what the wave is FOR. Without a lens in the frame a man raising his
 * hand at a stadium is greeting a crowd; with one, four times nearer our lens
 * than he is, he is doing the only thing this arc has ever had him do on a
 * stage — finding the camera his grandmother is on the other end of.
 */
function ArenaBroadcast() {
  const root = useRef<Group>(null)
  useFrame(() => {
    const t = getAnimTime()
    if (root.current) root.current.visible = stageIn(t) * (1 - dimOut(t)) > 0.02
  })
  return (
    <group ref={root} visible={false}>
      <BroadcastCamera position={PROP_CAM} scale={PROP_CAM_SCALE} pedestal
        aimAt={[HERO_POS[0], HERO_POS[1] + 1.72 * HERO_SCALE, HERO_POS[2]]} />
      <group position={bowl(1.1, RUNWAY_Y, 7.45)} rotation={[0, Math.PI, 0]} scale={HERO_SCALE}>
        <CrowdPeg archetype="thin" scale={0.96 * PEG_PER_GOLD} material={OPERATOR_MAT} />
      </group>
      {ARENA_BAND.map(m => <ArenaBandMember key={m.name} {...m} />)}
    </group>
  )
}

function StadiumWorld() {
  const root = useRef<Group>(null)
  useFrame(() => {
    const t = getAnimTime()
    // Off-camera before the swap-in (the montage camera faces away from +z and
    // cam.far is 140 through phase 1); hidden the instant the valley frame
    // takes over, before the road's sightline could find it on the horizon.
    // 1.4s of mount lead for the 47,200-point clouds, under the huddle hold.
    if (root.current) root.current.visible = t > T_SW - 1.4 && t < T_SW2
  })
  return (
    <group ref={root} visible={false}>
      <HallLights />
      <StadiumStructure />
      <ArenaBroadcast />
      <GraySouls />
      <GrayConfetti />
      <Followspot />
    </group>
  )
}

/* ══ THE VALLEY (7.4's world, on 7.4's clock, shifted −HANDOFF) ══════ */

function ValleyWorld() {
  const root = useRef<Group>(null)
  useFrame(() => {
    // EXACTLY at the swap, with no lead. The old gate opened 0.2s early, which
    // was harmless when the stadium camera was 50 units off the deck and is
    // not harmless at the punch-in: the valley is 5,900 units away but it is
    // Act B's ground it stands on, and that ground runs the whole length of
    // the world — it came up as a blown-out horizontal bar across the lower
    // third of the last three stadium frames. Verified by shooting 8.30
    // (clean) against 8.50 (barred) with the gate at T_SW2 − 0.2.
    // The subtree is React-mounted from t=0 either way, so nothing here
    // changes when geometry is uploaded; only when it is drawn.
    if (root.current) root.current.visible = getAnimTime() >= T_SW2
  })
  return (
    <group ref={root} visible={false}>
      <WalkWorld74 shift={-HANDOFF} driveWorldClock={false} />
    </group>
  )
}

/* ══ DRIVERS — one clock, one fog, one camera, one post chain ════════ */

/** Arbitrates the module-global flight clock between the stadium (pinned
 *  pre-beat window) and the valley (7.4's worldAt on the shifted clock). */
function WorldClockDriver() {
  setFlightOffset(FLIGHT_OFF)
  useFrame(() => {
    const t = getAnimTime()
    setFlightOffset(t < T_SW2 ? FLIGHT_OFF : worldAt(t - HANDOFF) - t)
  })
  return null
}

const C_FOG_A = new THREE.Color('#141821')
const C_FOG_M = new THREE.Color('#0B0C12')
const C_FOG_S = new THREE.Color('#0E0F16')
const C_FOG_V = new THREE.Color(FOG_COLOR)
const C_BG_A = new THREE.Color('#0B0E14')
const C_BG_M = new THREE.Color('#08080D')
const C_BG_S = new THREE.Color('#06070B')
const C_BG_V = new THREE.Color(NIGHT_BG)

/** Fog + background + exposure + environment gate, per phase. Mounted LAST so
 *  its useFrame outruns ValleyStill's Atmosphere (same trick as 7.4's fog). */
function AtmosDriver() {
  const { scene, gl } = useThree()
  const fog = useMemo(() => new THREE.Fog('#141821', 9, 26), [])
  const bg = useMemo(() => new THREE.Color('#0B0E14'), [])

  useFrame(() => {
    const t = getAnimTime()
    scene.fog = fog
    scene.background = bg
    if (t < T_SW) {
      // The fog opening under the head sweep. Was (7.5, 1.1) = SWEEP0 + 0.1
      // over the sweep's length; same relationship at the new sheet.
      const m = smooth01((t - (SWEEP0 + 0.1)) / (SWEEP1 - SWEEP0 - 0.1))
      fog.color.copy(C_FOG_A).lerp(C_FOG_M, m)
      fog.near = 9 + 21 * m
      fog.far = 26 + 54 * m
      bg.copy(C_BG_A).lerp(C_BG_M, m)
      gl.toneMappingExposure = 1.05
      scene.environmentIntensity = 0
    } else if (t < T_SW2) {
      fog.color.copy(C_FOG_S)
      fog.near = 900
      fog.far = 2400
      bg.copy(C_BG_S)
      gl.toneMappingExposure = 1.05
      scene.environmentIntensity = 0
    } else {
      // PRE-ROLLED. These ramps used to START at T_SW2, so the valley faded up
      // into its own look over about a second after appearing — which is a new
      // shot beginning, and is half of why this join read as a cut. Driving
      // them from BEFORE the swap costs nothing (none of it is visible while
      // the stadium branch owns the look) and means the countryside's first
      // frame is already the countryside.
      const m = smooth01((t - (T_SW2 - 0.5)) / 0.7)
      fog.color.copy(C_FOG_V)
      fog.near = 500 + (2000 - 500) * m
      fog.far = 5200 + (26000 - 5200) * m
      bg.copy(C_BG_S).lerp(C_BG_V, smooth01((t - (T_SW2 - 0.35)) / 0.55))
      // Must reach 1.25 — 7.4's exposureAt — before the seam, or the handoff
      // frame is graded darker than 7.4's t=0.
      gl.toneMappingExposure = 1.05 + 0.20 * smooth01((t - (T_SW2 - 0.35)) / 0.75)
      // scene.environmentIntensity: ValleyEnvironment's own per-frame value
      // stands — it ran before us this frame and the valley owns the look.
    }
  })
  return null
}

/* — the camera: 6.8's push, one rig-local path, and the landing key — */

const CAM68_TGT = new THREE.Vector3(0.10, 0.95, -1.60)
const KEY0 = KEYS_74[0]

/**
 * Three rig-local stand-offs, and everything between them is an ease. Because
 * they are rig-local they mean the same FRAMING in all three world frames —
 * ×1 in the apartment, ×17 on the stadium deck, ×20 in the valley.
 *
 *   MONTAGE  the huddle's stand-off: seven bodies 2.52 wide across 52% of frame
 *   WIDE     the reveal. World [0, 62, 5082] looking at [0, 40, 5296] — the
 *            runway leading to his thrust, the pit crowd packing both flanks,
 *            the three 아리랑 discs, the moving-head shafts, him alone in the
 *            followspot. This IS "the same stage as the start at 20 seconds,
 *            zoomed into the stage", and it is the Act-1 geometry, not a
 *            lookalike.
 *   TIGHT    the slow push's end, reached just before the turn. Chest-up, so
 *            the frame the world swaps behind is mostly him — and the landing
 *            branch starts from here, as it always has.
 */
const CAM_MONTAGE: V3 = [0, 1.80, 3.55]
const CAM_WIDE: V3 = [0, 2.80, 12.60]
const CAM_TIGHT: V3 = [0, 1.55, 2.55]
const FOV_MONTAGE = 43
const FOV_WIDE = 39
const FOV_TIGHT = 36
/** Branch 1's exit aim, written out: `ramp(t, T_LIFT0, T_LIFT1)` is 1 by
 *  T_SW2, so branch 2 MUST start here or the swap frame steps vertically.
 *  (It used to start at 1.44 — 2.2° of pitch, 6% of frame height, on the one
 *  join the whole cover exists to hide.) */
const A_T: V3 = [0, 1.52, 0]
/**
 * TWO moves for the stage beat — the reveal dolly-back ("zoom out is okay"),
 * then one slow push from WIDE to TIGHT across the trophy, the streamers and
 * the wave — and then THE ARC. (The four-move version died a round ago:
 * "way too many camera cuts at the end".)
 */
const REVEAL1 = 8.95
const PUSH0 = 8.95
/** PUSH1 must equal ARC0 or branch 1 hands branch 2 a lens that is not yet
 *  on CAM_TIGHT and the sweep opens with a jump. It gave up 0.65s when the
 *  arc grew to 152°; 1.2s is still a push and not a snap-in. */
const PUSH1 = ARC0

/**
 * THE ARC — the transition itself, in polar form around him. θ is measured
 * off his FACE: θ=0 is the lens dead in front of him (where the stage beat
 * leaves it), θ=±π is the lens at his back.
 *
 * It carries the whole join now. He does not turn (see spaceFrame), so the
 * 180°-ish that has to happen between "waving into a broadcast lens" and
 * "seen from over his right shoulder, walking home" is entirely angle on the
 * camera: 152° of it, out through his right flank with the bowl wheeling
 * behind him, through the fast dim and the world swap at T_SW2 a third of the
 * way round, and on into the market and the walkers sweeping past until the
 * lens lands on KEY0.
 *
 * ARC_TH1 is KEY0's rig-local azimuth TURNED BY π — atan2 of the negated
 * offset — because the valley frame is authored at yaw 0 now instead of π.
 * Negating both components leaves the radius alone, so the endpoint is the
 * same world pose it always was, reached from the other side. It comes out
 * NEGATIVE, which is also the direction the last cut's bulge went and the one
 * the note asked for ("the camera should move arcing left").
 *
 * There is no separate swing term any more — the sweep IS the swing. Radius
 * and height still bulge on a sine so the middle of the move stands off far
 * enough for the world to wheel, and every term collapses to exactly KEY0 at
 * u=1 — the seam key — with no residue.
 */
const ARC_TH1 = Math.atan2(-KEY0.d[0], -KEY0.d[2])
const ARC_R0 = Math.hypot(CAM_TIGHT[0], CAM_TIGHT[2])
const ARC_R1 = Math.hypot(KEY0.d[0], KEY0.d[2])
/**
 * The mid-arc stand-off, and NO RISE.
 *
 * A cut of this arc craned: the lens went up to ~5.6 units at the peak and
 * looked down on him, on the reasoning that a 152° orbit has to pass his
 * flank and his flank in the valley is the market — two deep lines of
 * villagers a unit off the verge — so going over the top was the only way to
 * miss them. The note on it was "when you do the rotation, I don't want to go
 * up in the sky, you can stay at the same eye level position", and it is the
 * right call: a jib in the middle of a shot whose whole subject is a man
 * standing still turns the transition into a camera move about itself.
 *
 * So the lens stays at his eye. ARC_LIFT is 0 and the height simply eases
 * CAM_TIGHT's 1.55 onto KEY0's 1.35 — 0.2 of a unit across the whole move,
 * which is not a rise, it is the landing. What pays for the flank instead is
 * TIME: the sweep is 2.1s (see ARC0/ARC1) and the angle is single-eased, so
 * nothing whips past and the crowd we do see reads as the market rather than
 * as smear. ARC_BULGE keeps a unit of extra stand-off through the middle so
 * the near villagers are not in the lens.
 */
const ARC_BULGE = 1.1
const ARC_LIFT = 0

/**
 * WHERE HE SITS IN FRAME — one continuous drift, not two stages.
 *
 * The aim used to be a POINT lerp: hold dead on him (A_T) for the first 68%
 * of the sweep, then run A_T→B_T over the last 32%. On the clock that is 1.4s
 * pinned in the centre and then the whole slide to the left edge in 0.67s, and
 * the note on it was exactly that — "it doesn't feel smooth, there's two
 * stages... we should be gradually moving the camera so the character is on
 * the left side over time".
 *
 * So the aim is built from HIS DIRECTION instead of from a point. The lens
 * looks straight at him and is then yawed off him by an angle that grows on
 * the sweep's own ease. A subject's horizontal screen position is
 * tan(offAxisAngle)/tan(fovH/2), so driving the angle smoothly and
 * monotonically drives screen x smoothly and monotonically: he leaves centre
 * the moment the arc starts and arrives at the left edge exactly as it lands.
 * That is also why the earlier "release at 0.5" attempt failed — lerping the
 * aim POINT while the lens is itself arcing is not monotone in screen space,
 * which is how he slid off the left edge at u≈0.75 and got pulled back.
 *
 * `s` is u itself, NOT an ease on top of it. u is already eased in time, and
 * the angle uses it raw for the same reason (see `th`) — the drift and the
 * orbit then share one velocity profile, which is what makes the two read as
 * a single move rather than a pan happening during an orbit.
 *
 * The end angles are MEASURED, not authored: at u=1 the arc's position is
 * exactly END_C and the aim must be exactly B_T, so YAW_END/PITCH_END are that
 * pair's yaw/pitch difference and adding them at s=1 reproduces B_T to the
 * bit. The seam key is still hit by construction.
 */
const B_T: V3 = [-KEY0.t[0], KEY0.t[1], -KEY0.t[2]]
/** The arc's own position at u=1: bulge is sin(π)=0 there, so it collapses to
 *  KEY0's stand-off negated — the same π turn B_T takes. */
const END_C: V3 = [-KEY0.d[0], KEY0.d[1], -KEY0.d[2]]
const yawOf = (dx: number, dz: number) => Math.atan2(dx, dz)
const pitchOf = (dx: number, dy: number, dz: number) => Math.atan2(dy, Math.hypot(dx, dz))
/** Shortest signed difference of two angles — a raw subtraction of two atan2s
 *  can come back the long way round and would sweep 208° instead of 152°. */
const wrapPi = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))
const [YAW_END, PITCH_END] = (() => {
  const h = [A_T[0] - END_C[0], A_T[1] - END_C[1], A_T[2] - END_C[2]]
  const b = [B_T[0] - END_C[0], B_T[1] - END_C[1], B_T[2] - END_C[2]]
  return [
    wrapPi(yawOf(b[0], b[2]) - yawOf(h[0], h[2])),
    pitchOf(b[0], b[1], b[2]) - pitchOf(h[0], h[1], h[2]),
  ]
})()

function camRigLocal(t: number): { c: V3; tgt: V3; fov: number } {
  if (t < ARC0) {
    // Hold the montage stand-off through T_SW (the frame is black there
    // anyway), then DOLLY BACK: the pull-out IS the reveal, and it is the
    // same "swap the background with a camera move" grammar as the other
    // join. Then the one slow push.
    const r = smooth01((t - T_SW) / (REVEAL1 - T_SW))
    const p = smooth01((t - PUSH0) / (PUSH1 - PUSH0))
    const at = (i: 0 | 1 | 2) =>
      CAM_MONTAGE[i] + (CAM_WIDE[i] - CAM_MONTAGE[i]) * r
      + (CAM_TIGHT[i] - CAM_WIDE[i]) * p
    return {
      c: [at(0), at(1), at(2)],
      tgt: [0, 1.28 + 0.24 * ramp(t, T_LIFT0, T_LIFT1), 0],
      fov: FOV_MONTAGE + (FOV_WIDE - FOV_MONTAGE) * r + (FOV_TIGHT - FOV_WIDE) * p,
    }
  }
  const u = smooth01((t - ARC0) / (ARC1 - ARC0))
  const bulge = Math.sin(Math.PI * Math.pow(u, 0.85))
  // ONE ease, not two. A cut of this sprinted the angle through the middle
  // (`ARC_TH1 * smooth01(u)`, a second S on top of u's own) to spend as few
  // frames as possible on the flank; at 200°/s peak the note came back that
  // it was dizzying, and it was — the picture is a man standing perfectly
  // still, so every degree of it is legible as speed. Single-eased and given
  // 2.1s the peak is 108°/s: a rotation you can follow, which is what was
  // asked for ("a more slow rotation to the back").
  const th = ARC_TH1 * u
  const rr = ARC_R0 + (ARC_R1 - ARC_R0) * u + ARC_BULGE * bulge
  const cy = CAM_TIGHT[1] + (KEY0.d[1] - CAM_TIGHT[1]) * u + ARC_LIFT * bulge
  const t74 = t - HANDOFF
  // 7.4's own hand-held breath, at the same phase. It must be 0 while the
  // arc is still in the stadium and 1 by the seam, where 7.4's bk is 1.
  // NEGATED in x: the valley frame is yaw 0 now, so a rig-local +x is the
  // opposite world direction it used to be, and this term has to agree with
  // 7.4's world-space breath across the seam, not merely be small.
  const bIn = ramp(t, T_SW2, HANDOFF - 0.1)
  const bx = -Math.sin(t74 * 0.29) * 0.05 * bIn
  const by = Math.sin(t74 * 0.41 + 1.2) * 0.04 * bIn
  // The aim, as an angle off him rather than a point (see YAW_END above). It
  // is measured from the BREATH-FREE position: the hand-held wobble then
  // translates the lens without steering it — which is what 7.4 does too, its
  // breath is on the position only — and u=1 still lands on B_T exactly.
  const cx = Math.sin(th) * rr
  const cz = Math.cos(th) * rr
  const vx = A_T[0] - cx, vy = A_T[1] - cy, vz = A_T[2] - cz
  const yaw = yawOf(vx, vz) + YAW_END * u
  const pitch = pitchOf(vx, vy, vz) + PITCH_END * u
  // lookAt throws the distance away, but publishSceneLookAt does not — this is
  // the pivot the debug camera orbits, so walk it from him onto B_T as well.
  const dist = Math.hypot(vx, vy, vz)
    + (Math.hypot(B_T[0] - cx, B_T[1] - cy, B_T[2] - cz) - Math.hypot(vx, vy, vz)) * u
  const cp = Math.cos(pitch)
  return {
    c: [cx + bx, cy + by, cz],
    tgt: [
      cx + Math.sin(yaw) * cp * dist,
      cy + Math.sin(pitch) * dist,
      cz + Math.cos(yaw) * cp * dist,
    ],
    fov: FOV_TIGHT + (KEY0.fov - FOV_TIGHT) * u,
  }
}

/** 6.8's corridor push, and the window over which it hands the lens to the
 *  rig path. The blend has to COMPLETE before T_SW — leave it half done and
 *  the hard switch is a camera jump. It runs later than it used to (the call
 *  owns the room to 7.68 now) so the off-axis apartment framing holds
 *  through the whole death and only centres on him as the room dies. */
const CAM_BLEND0 = 5.9
const CAM_BLEND1 = 7.45

function CameraRig() {
  const yieldCamera = useCameraHandoff()
  const pos = useRef(new THREE.Vector3())
  const tgt = useRef(new THREE.Vector3())
  const pos2 = useRef(new THREE.Vector3())
  const tgt2 = useRef(new THREE.Vector3())

  useFrame(({ camera }) => {
    if (yieldCamera()) return
    const t = getAnimTime()
    const cam = camera as THREE.PerspectiveCamera

    const f = spaceFrame(t)
    const rig = camRigLocal(t)
    rigToWorld(rig.c, f, pos.current)
    rigToWorld(rig.tgt, f, tgt.current)
    let fov = rig.fov

    if (t < CAM_BLEND1) {
      // The apartment lens: him in the left third, the empty half of his own
      // counter beside him until the hospital fills it. z = 3.90 rather than
      // 2.85 because he now stands 0.90 further forward, out of the counter —
      // it holds his size down the lens to within 0.15 of what it was.
      const u = smooth(clamp01(t / CAM_BLEND1))
      pos2.current.set(1.62 - u * 0.22, 1.46 - u * 0.05, 3.90 - u * 0.50)
      tgt2.current.copy(CAM68_TGT)
      const k = smooth01((t - CAM_BLEND0) / (CAM_BLEND1 - CAM_BLEND0))
      pos.current.lerpVectors(pos2.current, pos.current, k)
      tgt.current.lerpVectors(tgt2.current, tgt.current, k)
      // Blend the fov too. Hard-setting 44 across this whole block used to be
      // free because the rig path was also at ~43.94 at the old gate; at the
      // new one it is 43, and an uncrossfaded switch is a visible step.
      fov = 44 + (fov - 44) * k
    }

    camera.position.copy(pos.current)
    camera.lookAt(tgt.current)
    // The debug camera orbits this if you take over. lookAt keeps the
    // direction and throws the distance away, and this rig's stand-off is
    // ×17 / ×20 out in the stadium and valley frames — a pivot a few units
    // off the nose would orbit empty air.
    publishSceneLookAt(tgt.current.x, tgt.current.y, tgt.current.z)
    cam.fov = fov
    if (t < T_SW) { cam.near = 0.05; cam.far = 140 }
    else if (t < T_SW2) { cam.near = 1; cam.far = 4000 }
    else { cam.near = 1; cam.far = 24000 }
    cam.updateProjectionMatrix()
  })
  return null
}

/* — the post chain: three approved grades, one continuous drive —
 *
 * The effects are FOUND through the composer rather than captured with a ref
 * on each one, which is the same thing actB/World.tsx does and for a reason
 * that is not stylistic:
 *
 * `@react-three/postprocessing` wraps every effect in a component that
 * memoises its constructor args on `JSON.stringify(props)`. Under React 19
 * `ref` IS a prop, so once React has populated it that stringify walks the
 * live effect — and a BloomEffect with `mipmapBlur` owns a KawaseBlurPass
 * whose `resolution.resizable` points back at the pass. Circular structure,
 * thrown out of render, and the error takes the whole <Canvas> down with it:
 *
 *     TypeError: Converting circular structure to JSON
 *       --> starting at object with constructor 'KawaseBlurPass'
 *
 * It only fires on a RE-render, because the ref is null on the first one —
 * which is why a frozen `?act=6.85` looked fine and the studio, where the
 * scene re-renders, did not.
 */

function PostDriver({ composer }: { composer: React.RefObject<PPEffectComposer | null> }) {
  const found = useRef<{
    bloom?: BloomEffect; vig?: VignetteEffect; hue?: HueSaturationEffect
  }>({})

  useFrame(() => {
    const f = found.current
    if (!f.bloom && composer.current?.passes) {
      for (const pass of composer.current.passes) {
        for (const e of (pass as { effects?: unknown[] }).effects ?? []) {
          if (e instanceof BloomEffect) f.bloom = e
          if (e instanceof VignetteEffect) f.vig = e
          if (e instanceof HueSaturationEffect) f.hue = e
        }
      }
    }
    const t = getAnimTime()
    const toStage = ramp(t, T_SW - 0.4, T_SW + 0.5)
    const toValley = ramp(t, T_SW2 - 0.2, HANDOFF - 0.1)
    const b = f.bloom
    if (b) {
      b.intensity = 0.6 + 0.12 * toStage + (1.0 - 0.72) * toValley
      b.luminanceMaterial.threshold = 0.62 - 0.14 * toStage - (0.48 - 0.2) * toValley
      b.luminanceMaterial.smoothing = 0.85 - 0.2 * toStage + 0.2 * toValley
    }
    const vg = f.vig
    if (vg) {
      // The extra closure used to ride the huddle's fade-in; it rides the
      // room's death now — same screen moment, different owner.
      vg.darkness = 0.62 + 0.04 * ramp(t, 6.6, 7.2) - 0.04 * toStage - 0.14 * toValley
      vg.offset = 0.22 - 0.04 * toValley
    }
    const h = f.hue
    if (h) {
      // In under the huddle's dissolve — its cover now the bed is gone — and
      // OUT under the confetti veil, starting just before the swap so colour
      // is already returning as the world changes. Left at the old absolute
      // numbers this never released at all and 6.85 handed 7.4 a monochrome
      // frame against 7.4's full-colour t=0.
      h.saturation = -0.92 * ramp(t, SAT0, SAT1)
        * (1 - ramp(t, T_SW2 - 0.15, HANDOFF - 0.15))
    }
  })
  return null
}

/* ══ ASSEMBLY ════════════════════════════════════════════════════════ */

function SceneBody() {
  const composer = useRef<PPEffectComposer>(null)

  return (
    <>
      <CameraRig />
      <WorldClockDriver />

      <TheRoom />
      {/* panelZ 1.6, not the 2.6 default: the panel is real geometry a fixed
          distance down the lens, and the backdrop that closes it sits 1.38
          world units behind the plane, i.e. 2.98 down the axis. Everything
          this room owns is further out than that — the counter's near right
          corner, which is the closest thing to the lens on the panel's side,
          is 4.6 — so nothing of the apartment can draw through the hospital.
          (At the 2.6 default the backdrop lands at 4.8 and the counter does.) */}
      <SplitPanel enter={PANEL_IN} exit={PANEL_OUT} panelZ={PANEL_Z}
        roomH={PANEL_ROOM_H} backdrop="#232329" divider="#0B0B10">
        <HospitalRoom />
      </SplitPanel>
      {/* OUTSIDE the panel on purpose — it has to outlive the room. */}
      <SoulOrb />

      <MontageStage />
      <Hero />
      <StadiumWorld />
      <ValleyWorld />

      <AtmosDriver />

      <EffectComposer ref={composer}>
        <Bloom intensity={0.6} luminanceThreshold={0.62}
          luminanceSmoothing={0.85} mipmapBlur />
        <HueSaturation saturation={0} />
        <Vignette eskil={false} offset={0.22} darkness={0.62} />
      </EffectComposer>
      <PostDriver composer={composer} />
    </>
  )
}

export default createScene({
  background: '#0B0E14',
  three: {
    camera: { position: [1.62, 1.46, 3.90], fov: 44, near: 0.05, far: 140 },
    gl: {
      antialias: true,
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 1.05,
    },
    onCreated: ({ camera }) => camera.lookAt(0.10, 0.95, -1.60),
    debugTarget: [0.10, 0.95, -1.60],
  },
}, function Act6_85() {
  return <SceneBody />
})
