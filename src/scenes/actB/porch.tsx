/**
 * The rocking chair on the porch — and the parent in it.
 *
 * The film opens on the lit house at the end of the black road, and now
 * somebody is home: the parent, in a rocking chair beside the door, facing
 * out down the road the whole story is about to fly along. The chair is part
 * of the house from then on — it stands empty through the golden hour and
 * the walk home — but the figure belongs to the opening only.
 *
 * Authored in GoldFigure units (an adult is 1.89 tall) so the chair is
 * proportioned to its sitter by construction; the caller wraps it to their
 * world scale exactly as the walking pair is wrapped. Everything moves on
 * the caller's clock (`time`), because this mounts inside Act B where the
 * film's clock and the story's clock are different numbers — see
 * `worldTime()` — and a chair rocking on the wrong one would drift against
 * every render window.
 *
 * Exported in two parts so the finale can bookend it: `RockingChair` is the
 * empty chair (it does not rock — an empty chair rocking on its own is a
 * different film), `PorchRocker` is chair + parent + the rock.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { GoldFigure, type HatName } from '../characters/goldFigure'
import { v, type Curve, type Sphere } from '../characters/goldFigure/buildBody'
import { type Proportions } from '../characters/goldFigure/proportions'
import { buildSolvedArmPoints } from '../characters/goldFigure/skeleton'
import { worldTime } from './time'

/* ── The chair ─────────────────────────────────────────────────────── */

const SEAT_Y = 0.52
const WOOD = '#5A4430'
const WOOD_DARK = '#3E3226'

/** Rocker runner: a shallow arc along z, flat-bottomed at y=0. */
function rockerCurve(): THREE.CatmullRomCurve3 {
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= 8; i++) {
    const z = -0.48 + (i / 8) * 1.0
    pts.push(v(0, ((z - 0.02) * (z - 0.02)) / 2.2, z))
  }
  return new THREE.CatmullRomCurve3(pts)
}

export function RockingChair() {
  const wood = useMemo(() => new THREE.MeshStandardMaterial({
    color: WOOD, roughness: 0.8,
    // Just enough self-light to keep the silhouette readable when the house
    // lamp is down to its pilot-light daytime value.
    emissive: '#7A5230', emissiveIntensity: 0.12,
  }), [])
  const rocker = useMemo(() => new THREE.TubeGeometry(rockerCurve(), 24, 0.026, 6), [])

  return (
    <group>
      {/* Runners */}
      <mesh geometry={rocker} material={wood} position={[-0.27, 0, 0]} />
      <mesh geometry={rocker} material={wood} position={[+0.27, 0, 0]} />
      {/* Posts, runner to seat */}
      {([-0.24, 0.24] as const).map(x => (
        <group key={x}>
          <mesh material={wood} position={[x, 0.265, 0.24]}>
            <cylinderGeometry args={[0.022, 0.022, 0.47, 8]} />
          </mesh>
          <mesh material={wood} position={[x, 0.265, -0.20]}>
            <cylinderGeometry args={[0.022, 0.022, 0.47, 8]} />
          </mesh>
        </group>
      ))}
      {/* Seat */}
      <mesh material={wood} position={[0, SEAT_Y - 0.02, 0.02]}>
        <boxGeometry args={[0.62, 0.04, 0.54]} />
      </mesh>
      {/* Back, raked */}
      <group position={[0, SEAT_Y - 0.02, -0.24]} rotation={[-0.20, 0, 0]}>
        {([-0.28, 0.28] as const).map(x => (
          <mesh key={x} material={wood} position={[x, 0.33, 0]}>
            <cylinderGeometry args={[0.022, 0.022, 0.66, 8]} />
          </mesh>
        ))}
        {[0.22, 0.36, 0.50].map(y => (
          <mesh key={y} material={wood} position={[0, y, 0]}>
            <boxGeometry args={[0.56, 0.055, 0.018]} />
          </mesh>
        ))}
        <mesh material={wood} position={[0, 0.63, 0]}>
          <boxGeometry args={[0.64, 0.07, 0.022]} />
        </mesh>
      </group>
      {/* Armrests and their front supports */}
      {([-0.315, 0.315] as const).map(x => (
        <group key={x}>
          <mesh material={wood} position={[x, 0.72, 0.06]}>
            <boxGeometry args={[0.055, 0.03, 0.46]} />
          </mesh>
          <mesh material={wood} position={[x, 0.61, 0.24]}>
            <cylinderGeometry args={[0.02, 0.02, 0.20, 8]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ── The sitter ────────────────────────────────────────────────────── */

/**
 * Chair-seated skeleton: hips at seat height, back against the rake, shins
 * down to the deck, hands on the armrests. No pose preset sits on furniture
 * — 'seated' is the floor around a soban — hence the custom builder.
 */
function porchSkeleton({ P, t }: { P: Proportions; t: number }): { curves: Curve[]; spheres: Sphere[] } {
  const hipY = SEAT_Y + 0.04
  const shY = hipY + 0.52
  const breath = 0.010 * Math.sin(t * 0.9)

  const spine = [
    v(0, hipY, 0.02),
    v(0, hipY + 0.16, -0.01),
    v(0, hipY + 0.32, -0.045),
    v(0, hipY + 0.45, -0.075),
    v(0, shY + 0.06 + breath, -0.095),
  ]

  const leg = (side: 1 | -1): THREE.Vector3[] => {
    const hip = v(side * 0.02, hipY, 0)
    const knee = v(side * 0.15, 0.54, 0.40)
    const ankle = v(side * 0.17, 0.08, 0.47)
    return [hip, hip.clone().lerp(knee, 0.5), knee, knee.clone().lerp(ankle, 0.5), ankle]
  }

  const arm = (side: 1 | -1): THREE.Vector3[] =>
    buildSolvedArmPoints(side * 0.02, shY + breath, v(side * 0.27, 0.76, 0.18), P, -0.09)

  return {
    curves: [
      { points: spine, radius: P.R, segments: 16 },
      { points: arm(-1), radius: P.R, segments: 14 },
      { points: arm(1), radius: P.R, segments: 14 },
      { points: leg(-1), radius: P.R, segments: 16 },
      { points: leg(1), radius: P.R, segments: 16 },
    ],
    spheres: [{ center: v(0, shY + 0.27 + breath, -0.03), radius: P.RH }],
  }
}

/* ── Chair + parent + the rock ─────────────────────────────────────── */

/**
 * Module-level override so a scene can drive the built-in porch rocker on its
 * own clock without editing ValleyHouse (which mounts this with Act B's
 * defaults). Act 7.4 uses it for the grandmother's rise: `time` replaces the
 * rocker's clock, and `sitter: false` hides the built-in sitter while the
 * chair still rocks — the scene stages its own figure in the chair so the one
 * who rises can be the one who walks. Pass null to restore default behaviour;
 * exactly one scene is ever mounted at a time, same contract as
 * `setFlightOffset`.
 */
let porchOverride: { time: () => number; sitter?: boolean } | null = null
export function setPorchClock(o: { time: () => number; sitter?: boolean } | null) {
  porchOverride = o
}

export function PorchRocker({
  hat,
  time = worldTime,
  /** The figure sits until this time on the caller's clock, then the chair
   *  is empty. Act B's opening window ends at 7; the margin is for stills. */
  occupiedUntil = 12,
}: {
  hat?: HatName
  time?: () => number
  occupiedUntil?: number
}) {
  const rock = useRef<THREE.Group>(null)
  const sitter = useRef<THREE.Group>(null)

  useFrame(() => {
    const t = (porchOverride?.time ?? time)()
    const occupied = t < occupiedUntil
    if (sitter.current) sitter.current.visible = occupied && (porchOverride?.sitter ?? true)
    if (rock.current) {
      // A calm rock: one swing about every 3.6 seconds, pivoting where the
      // runners meet the deck. When the sitter leaves it keeps rocking a few
      // beats and dies away — a chair does not stop with the person.
      const amp = occupied ? 0.045 : 0.045 * Math.exp(-Math.max(0, t - occupiedUntil) * 0.6)
      rock.current.rotation.x = Math.sin(t * 1.75) * amp
    }
  })

  return (
    <group>
      {/* A low wooden deck under the runners — the terrain out front is not
          level, and a rocker needs a floor. Sunk so its top is the y=0 the
          chair and skeleton are authored against. */}
      <mesh position={[0, -0.08, 0.04]}>
        <boxGeometry args={[1.7, 0.16, 1.35]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
      </mesh>
      <group ref={rock}>
        <RockingChair />
        <group ref={sitter}>
          <GoldFigure
            skeleton={porchSkeleton}
            material="goldParent"
            glow={0.9}
            hat={hat}
            hatTilt={-0.12}
          />
        </group>
      </group>
    </group>
  )
}
