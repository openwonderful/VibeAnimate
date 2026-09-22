/**
 * Act 3.3 — "The Table" (1:00 – 1:14)
 *
 * Inside the hanok, after the walk home. Two figures — the parent from the
 * road and the child who rode home on their shoulders — sit across a low
 * soban and eat together. Nothing else happens. That is the whole scene.
 *
 * Continuity with Act 3.2: the same <GoldFigure material="goldAmber"> bodies,
 * the same warm-gold glow, the same two characters. 3.2 put them against a
 * cold blue road; 3.3 puts the cold blue *behind* them — moonlight in the open
 * paper screen — so the warm pocket of the room reads as the safe place.
 *
 * Composition notes:
 *  - The paper lantern hangs behind and above the table, so the steam off the
 *    stew pot is backlit and the figures get a rim from the lamp.
 *  - No depth-of-field. Depth comes from light falloff, a dressed room and a
 *    slow push-in, not from blur.
 *  - Everything is a pure function of the anim clock (getAnimTime) — no
 *    Date.now(), no bare Math.random() — so the scene scrubs, freezes and
 *    renders identically across Remotion's parallel tabs.
 */

import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'

import { createScene } from '../createScene'
import SeededSparkles from '../effects/SeededSparkles'
import {
  // set
  HanokShell, HanokDressing, HanokLighting, Steam, Diner,
  Soban, Bowl, Dish, Utensils, StewPot, BrassKettle,
  // palette + helpers
  NIGHT, SOUP_GREEN, KIMCHI, CLAY_DARK, ROOM_BACK, TABLE_TOP, ramp,
} from '../sets/hanok'

// Where the two of them sit. Both are behind the far edge of the soban,
// facing us and turned slightly toward each other. Sitting them at opposite
// *ends* looked like two people crowding the lens: folded legs read as sprawl
// in profile, and the table stopped being the thing between them. From here
// the table carries the foreground, the legs tuck behind it, and the lean
// lands as a lean.
const PARENT_X = -0.50
const CHILD_X = +0.46
const SEAT_Z = -0.74

// ════════════════════════════════════════════════════════════════════
// THE TABLE
// ════════════════════════════════════════════════════════════════════
function TableSetting() {
  return (
    <group>
      <Soban />
      <StewPot position={[0, TABLE_TOP, 0.06]} />

      {/* Parent's place — directly under their reaching hand */}
      <Bowl position={[-0.29, TABLE_TOP + 0.028, -0.31]} />
      <Bowl position={[-0.46, TABLE_TOP + 0.024, -0.23]} r={0.062} h={0.048} fill={SOUP_GREEN} glow={0.12} clay={CLAY_DARK} />
      <Utensils position={[-0.36, TABLE_TOP, -0.10]} />

      {/* Child's place */}
      <Bowl position={[0.25, TABLE_TOP + 0.026, -0.24]} r={0.066} h={0.05} />
      <Bowl position={[0.44, TABLE_TOP + 0.023, -0.23]} r={0.056} h={0.044} fill={SOUP_GREEN} glow={0.12} clay={CLAY_DARK} />
      <Utensils position={[0.32, TABLE_TOP, -0.10]} flip />

      {/* Banchan across the near half, closest to the lens */}
      <Dish position={[-0.30, TABLE_TOP + 0.012, 0.22]} r={0.058} fill={KIMCHI} />
      <Dish position={[-0.09, TABLE_TOP + 0.012, 0.26]} r={0.052} fill="#4A5A2A" />
      <Dish position={[0.14, TABLE_TOP + 0.012, 0.25]} r={0.055} fill="#8A6A28" />
      <Dish position={[0.35, TABLE_TOP + 0.012, 0.20]} r={0.05} fill="#7A3A18" />
      <Dish position={[-0.50, TABLE_TOP + 0.012, 0.09]} r={0.048} fill="#5A4A22" />

      <BrassKettle position={[0.52, TABLE_TOP, 0.14]} />
    </group>
  )
}

// ════════════════════════════════════════════════════════════════════
// SCENE
// ════════════════════════════════════════════════════════════════════
function TableScene() {
  return (
    <>
      <color attach="background" args={[NIGHT]} />
      {/* Light haze only — the room is small, so fog stays out of the way. */}
      <fog attach="fog" args={['#160C06', 4.5, 11]} />

      {/* Evening: lamp lit, family home, moon in the open panel. */}
      <HanokLighting />
      <HanokShell />
      <HanokDressing />

      {/* ── The table ────────────────────────────────────────────── */}
      <TableSetting />
      <Steam position={[0, TABLE_TOP + 0.14, 0.06]} count={120} spread={0.11} rise={1.05} size={5.2} opacity={0.20} seed={5} />
      <Steam position={[-0.29, TABLE_TOP + 0.09, -0.31]} count={30} spread={0.05} rise={0.40} size={3.0} opacity={0.13} seed={11} />
      <Steam position={[0.25, TABLE_TOP + 0.085, -0.31]} count={30} spread={0.045} rise={0.38} size={2.8} opacity={0.13} seed={13} />

      {/* ── The two of them ──────────────────────────────────────── */}
      {/* Parent — cross-legged on the left, three-quarters toward the camera. */}
      <Diner
        kind="adult"
        x={PARENT_X}
        z={SEAT_Z}
        facing={0.16}
        hipY={0.18}
        legs="cross"
        cycle={5.2}
        cycleOffset={0.13}
        bowl={[0.13, 0.35, 0.36]}
        mouth={[0.05, 0.87, 0.22]}
        restHand={[-0.10, 0.33, 0.30]}
        // Puts something in the child's bowl around 8s, then goes back to
        // their own — the one gesture in the scene that is for someone else.
        serveTo={[0.55, 0.355, 0.56]}
        serveAt={[7.4, 10.6]}
        glow={1.25}
        leanTo={t => ramp(t, 5.4, 7.4) * 0.50}
      />
      {/* Child — up on their knees to reach the table, opposite. */}
      <Diner
        kind="child"
        // The rig's CHILD is already 69% of ADULT; across a soban from a
        // cross-legged adult that still read as a small grown-up.
        scale={0.84}
        x={CHILD_X}
        z={SEAT_Z}
        facing={-0.16}
        hipY={0.17}
        legs="kneel"
        cycle={4.1}
        cycleOffset={0.61}
        mirrored
        bowl={[0.13, 0.345, 0.30]}
        mouth={[0.04, 0.685, 0.17]}
        restHand={[-0.13, 0.325, 0.24]}
        glow={1.45}
        // Leans in against the parent from ~4s, and stays there.
        leanTo={t => ramp(t, 3.8, 6.4) * 1.0}
        // "Everybody like you" — the child brightens for one beat.
        flare={t => ramp(t, 12.4, 13.3) * (1 - ramp(t, 13.6, 14.6)) * 0.85}
      />

      {/* ── Air ──────────────────────────────────────────────────── */}
      {/* Dust turning slowly in the lamp light. */}
      <SeededSparkles
        seed={71} count={110} scale={[3.0, 1.6, 1.8]} size={1.15} speed={0.14}
        color="#FFCE8A" opacity={0.5} position={[0, 1.0, -0.45]}
      />
      {/* Fireflies outside, seen through the open panel. */}
      <SeededSparkles
        seed={73} count={30} scale={[1.1, 1.0, 0.6]} size={2.2} speed={0.3}
        color="#CFE07A" opacity={0.75} position={[0.72, 0.7, ROOM_BACK - 0.5]}
      />
    </>
  )
}

// ════════════════════════════════════════════════════════════════════
export default createScene({
  background: NIGHT,
  three: {
    camera: { position: [0.05, 0.90, 2.46], fov: 42, near: 0.05, far: 40 },
    gl: {
      antialias: true,
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 1.06,
    },
    shadows: true,
    onCreated: ({ camera }) => camera.lookAt(0, 0.60, -0.36),
    debugTarget: [0, 0.55, -0.1],
  },
  // Slow, continuous push toward the table — the whole 14s is one breath in.
  cameraMoves: [{
    a: { pos: [0.05, 0.90, 2.46], target: [0, 0.60, -0.36], fov: 42 },
    b: { pos: [0.0, 0.86, 2.16], target: [0, 0.58, -0.38], fov: 41.5 },
    t0: 0,
    t1: 14,
    ease: 'inout',
  }],
}, function Act3_3() {
  return (
    <>
      <TableScene />
      <EffectComposer>
        {/* High threshold: only the figures, the lamp and the broth bloom.
            No depth-of-field — the scene reads better sharp. */}
        <Bloom intensity={0.62} luminanceThreshold={0.62} luminanceSmoothing={0.4} mipmapBlur />
        <Vignette eskil={false} offset={0.22} darkness={0.68} />
      </EffectComposer>
    </>
  )
})
