/**
 * act6b/call.tsx — the set pieces the two phone-call scenes share.
 *
 * 6.4 (Phone Call I, the porch at dusk) and 6.8 (The Last Call, the hospital)
 * are deliberately the SAME shot twice: same device, same raise, same seated
 * grandmother grammar — warm the first time, gray the second. The rhyme only
 * lands if the phone is one prop and the gesture one path, so they live here
 * and both scenes import them.
 */
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getAnimTime } from '../../hooks/useAnimTime'
import {
  v, buildSolvedArmPoints,
  type Curve, type Sphere, type Proportions,
} from '../characters/goldFigure'
import { smooth } from './shared'

export type V3 = [number, number, number]

/* ── the phone gesture ────────────────────────────────────────────── */

/** Right-hand rest by the hip — Act 4.10's resting hand, the film's idle. */
export const PHONE_REST: V3 = [0.17, 0.92, 0.05]
/**
 * Phone-to-ear on the STANDING adult head sphere's surface (center
 * [0, 1.73, 0.03], r 0.16) — never the center, or the forearm becomes a
 * spike through the skull.
 */
export const EAR_R: V3 = [0.19, 1.68, 0.1]

/**
 * The raise: rest → ear with a small outward/forward arc so the forearm
 * swings clear of the hip instead of dragging through it. `up` is the raise
 * envelope 0..1 (feed it a ramp); pass a custom `ear` when the head has
 * moved (6.8's droop lowers it).
 */
export function phoneRaise(up: number, ear: V3 = EAR_R, rest: V3 = PHONE_REST): V3 {
  const u = smooth(up)
  const arc = Math.sin(u * Math.PI)
  return [
    rest[0] + (ear[0] - rest[0]) * u + arc * 0.09,
    rest[1] + (ear[1] - rest[1]) * u,
    rest[2] + (ear[2] - rest[2]) * u + arc * 0.13,
  ]
}

/* ── the phone itself ─────────────────────────────────────────────── */

type HandSource = V3 | { current: V3 | null | undefined } | ((t: number) => V3)

function resolveHand(h: HandSource, t: number): V3 | null {
  if (typeof h === 'function') return h(t)
  if (Array.isArray(h)) return h
  return h.current ?? null
}

/**
 * A thin dark slab riding a hand target, inside the figure's own group (all
 * coordinates figure-local). As the hand rises past the chest the phone
 * rolls in against the head. `screen` is a per-frame emissive level — 6.8's
 * two-pulse buzz; leave it off for a phone already answered.
 */
export function Phone({
  hand, mirror = false, screen,
}: {
  hand: HandSource
  mirror?: boolean
  screen?: (t: number) => number
}) {
  const group = useRef<THREE.Group>(null)
  const mat = useRef<THREE.MeshStandardMaterial>(null)

  useFrame(() => {
    const t = getAnimTime()
    const g = group.current
    const p = resolveHand(hand, t)
    if (!g || !p) return
    g.position.set(p[0], p[1], p[2])
    // How far up the raise we are, straight from the hand height.
    const up = Math.min(1, Math.max(0, (p[1] - 1.05) / 0.5))
    const s = mirror ? -1 : 1
    g.rotation.set(0.1 * up, 0, s * 0.35 * up)
    if (mat.current) mat.current.emissiveIntensity = screen ? screen(t) : 0
  })

  return (
    <group ref={group}>
      <mesh>
        <boxGeometry args={[0.034, 0.15, 0.072]} />
        <meshStandardMaterial
          ref={mat}
          color="#101118" roughness={0.35} metalness={0.3}
          emissive="#AFC4FF" emissiveIntensity={0} toneMapped={false}
        />
      </mesh>
    </group>
  )
}

/* ── keeping the panel inside its half ────────────────────────────── */

/**
 * The split line lives at panel-local x = −0.75·aspect (the screen-center
 * plane; fov cancels out) — about −1.33 at 16:9. SplitPanel's own oversize
 * backdrop is 7.2m wide and centered, so it floods well past the divider
 * into the caller's half of frame. Mount this INSIDE the panel and it
 * reshapes that backdrop every frame to run from just behind the divider to
 * past the window's right edge — and nothing else. Panel content should
 * respect the same bound: keep everything at local x ≥ −1.4.
 */
export const PANEL_LEFT = -1.36

export function PanelBackstop() {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    // Walk up from wherever the caller mounted us to the panel group, and
    // reshape its backdrop. The backdrop's signature: a PlaneGeometry wider
    // than 6m sitting behind the panel plane (content planes are narrower).
    let n: THREE.Object3D | null | undefined = ref.current
    for (let hop = 0; n && hop < 6; hop++, n = n.parent) {
      for (const child of n.children) {
        const m = child as THREE.Mesh
        if (!m.isMesh || m.position.z >= 0) continue
        const geo = m.geometry as THREE.PlaneGeometry
        if (geo.type !== 'PlaneGeometry' || (geo.parameters?.width ?? 0) < 6) continue
        m.scale.x = 0.72
        m.position.x = 1.2
        return
      }
    }
  })
  return <group ref={ref} />
}

/* ── the grandmother, seated in the rocking chair ─────────────────── */

/** Seat height of actB/porch's RockingChair (its SEAT_Y). */
export const ROCKER_SEAT_Y = 0.52
/** Head-sphere center of the rocker-seated adult, figure-local. */
export const ROCKER_HEAD: V3 = [0, 1.35, -0.03]
/**
 * Phone-to-ear for the seated figure — jaw height rather than eye height,
 * because the satgat brim (r 0.42) swallows anything beside the head.
 */
export const ROCKER_EAR_R: V3 = [0.15, 1.28, 0.07]

/**
 * Chair-seated skeleton on the porch rocker, with caller-driven hands —
 * porch.tsx's porchSkeleton (hips at the seat, back on the rake, shins to
 * the deck) opened up the way sets/hanok's SeatedFigure is: a per-frame
 * `hands` callback owns both hand targets plus a small head nod, which is
 * the entire acting interface a phone call needs.
 */
export function rockerSitSkeleton(
  hands: (t: number) => { left: V3; right: V3; headNod?: number },
) {
  return ({ P, t }: { P: Proportions; t: number; phase: number }): { curves: Curve[]; spheres: Sphere[] } => {
    const hipY = ROCKER_SEAT_Y + 0.04
    const shY = hipY + 0.52
    const breath = 0.01 * Math.sin(t * 0.9)
    const h = hands(t)
    const nod = h.headNod ?? 0

    const spine = [
      v(0, hipY, 0.02),
      v(0, hipY + 0.16, -0.01),
      v(0, hipY + 0.32, -0.045),
      v(0, hipY + 0.45, -0.075),
      v(0, shY + 0.06 + breath, -0.095),
    ]

    const leg = (side: 1 | -1): THREE.Vector3[] => {
      const hip = v(side * 0.02, hipY, 0)
      const knee = v(side * 0.15, 0.54, 0.4)
      const ankle = v(side * 0.17, 0.08, 0.47)
      return [hip, hip.clone().lerp(knee, 0.5), knee, knee.clone().lerp(ankle, 0.5), ankle]
    }

    const arm = (side: 1 | -1, at: V3): THREE.Vector3[] =>
      buildSolvedArmPoints(side * 0.03, shY + breath, v(at[0], at[1], at[2]), P, -0.07)

    return {
      curves: [
        { points: spine, radius: P.R, segments: 16 },
        { points: arm(-1, h.left), radius: P.R, segments: 14 },
        { points: arm(1, h.right), radius: P.R, segments: 14 },
        { points: leg(-1), radius: P.R, segments: 16 },
        { points: leg(1), radius: P.R, segments: 16 },
      ],
      spheres: [{
        center: v(
          0,
          shY + 0.27 + breath - nod * 0.05,
          -0.03 + nod * 0.09,
        ),
        radius: P.RH,
      }],
    }
  }
}
