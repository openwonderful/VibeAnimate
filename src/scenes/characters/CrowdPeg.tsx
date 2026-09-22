/**
 * CrowdPeg — the anonymous body.
 *
 * This film has exactly two ways of drawing a person, and the difference
 * carries meaning:
 *
 *   GoldFigure  — an articulated stick figure with a spine, arms and legs.
 *                 Reserved for people the story knows: the child, the
 *                 caregiver, the Seven.
 *   CrowdPeg    — a capsule and a sphere. Everyone else.
 *
 * Act 8.55 established this. Its crowd is an instanced field of capsule bodies
 * and sphere heads, and the one articulated figure standing in it is the point
 * of the shot: "the crowd are capsule-and-sphere silhouettes; he is the kid
 * from Act 3 grown up." The proportions here are 8.55's, imported from its
 * `world` module rather than copied, so the two can never drift apart.
 *
 * 8.55 draws thousands of these and needs InstancedMesh; scenes with a few
 * dozen want them as ordinary nodes they can position and animate one by one.
 * This component is that second case. The geometry is identical.
 *
 * ── Sizing ────────────────────────────────────────────────────────────
 * `scale` is 8.55's per-figure scale, and it is NOT interchangeable with the
 * scale you would put on a GoldFigure. A stick figure's crown sits at 1.89
 * world units at scale 1; a 'tall' peg's crown is at 1.5·bodyH + 1.9·headR,
 * which reaches 1.89 at scale ≈ 0.7. So a peg at 0.7 stands eye-to-eye with a
 * GoldFigure at 1.0 — see PEG_PER_GOLD below, and use it rather than guessing.
 *
 * ── Ground line ───────────────────────────────────────────────────────
 * The capsule is centred at bodyH·0.5, so its lower half sits below y=0. That
 * is deliberate and inherited: the peg has no legs, and cutting the silhouette
 * flat at the floor is what sells it as a standing body rather than a pill
 * lying on the ground. It requires an opaque floor to cut against.
 */

import { forwardRef, useMemo } from 'react'
import * as THREE from 'three'
import { archetypeHeight, archetypeWidth, type Archetype } from '../act8_55/world'

export type { Archetype }

/**
 * Multiply a GoldFigure scale by this to get the peg scale that stands the
 * same height. Derived in the header comment; asserted by eye in 8.55, where
 * the hero at scale 1 has to match the tall pegs beside him.
 */
export const PEG_PER_GOLD = 0.7

/** Crown height of a peg, in world units, for a given archetype and scale. */
export function pegHeight(archetype: Archetype, scale: number): number {
  const bodyH = archetypeHeight(archetype) * scale * 3
  const headR = 0.13 * scale * (archetype === 'child' ? 1.15 : 1)
  return bodyH * 1.5 + headR * 1.9
}

export type CrowdPegProps = {
  archetype?: Archetype
  /** 8.55's per-figure scale. Multiply a GoldFigure scale by PEG_PER_GOLD. */
  scale?: number
  /** Shared material — pass one instance across the whole crowd. */
  material?: THREE.Material
  /** Lean/sway in radians about z, applied to body and head together. */
  sway?: number
  castShadow?: boolean
}

/**
 * One peg. `material` should be shared across the crowd — a fresh material per
 * figure costs a shader compile and a draw-call group each.
 */
export const CrowdPeg = forwardRef<THREE.Group, CrowdPegProps>(function CrowdPeg(
  { archetype = 'tall', scale = 0.7, material, sway = 0, castShadow = false },
  ref,
) {
  const { bodyH, bodyW, headR } = useMemo(() => ({
    bodyH: archetypeHeight(archetype) * scale * 3,
    bodyW: archetypeWidth(archetype) * scale * 3,
    headR: 0.13 * scale * (archetype === 'child' ? 1.15 : 1),
  }), [archetype, scale])

  return (
    <group ref={ref}>
      <mesh
        position={[0, bodyH * 0.5, 0]}
        rotation={[0, 0, sway * 1.5]}
        scale={[bodyW, bodyH, bodyW]}
        material={material}
        castShadow={castShadow}
      >
        <capsuleGeometry args={[0.5, 1, 4, 8]} />
        {!material && <meshStandardMaterial color="#4A4F58" roughness={0.9} />}
      </mesh>
      <mesh
        position={[sway * 0.15, bodyH * 1.5 + headR * 0.9, 0]}
        rotation={[0, 0, sway * 0.8]}
        scale={headR}
        material={material}
        castShadow={castShadow}
      >
        <sphereGeometry args={[1, 8, 6]} />
        {!material && <meshStandardMaterial color="#4A4F58" roughness={0.9} />}
      </mesh>
    </group>
  )
})
