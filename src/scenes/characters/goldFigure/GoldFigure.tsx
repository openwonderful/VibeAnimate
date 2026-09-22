import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Group, Mesh } from 'three'

import { buildBody } from './buildBody'
import { type FigureKind, proportionsFor, type Proportions } from './proportions'
import { type PoseName, type PoseGeometry, buildPose } from './poses'
import { type MaterialPreset, buildMaterialFromPreset, getPresetSpec } from './materials'
import { type HatName, buildHat, onHeadSeat } from './hats'

export type { FigureKind } from './proportions'
export type { PoseName } from './poses'
export type { MaterialPreset } from './materials'
export type { HatName } from './hats'

/**
 * A hand target may be a fixed local coordinate triple, a ref whose
 * `.current` is read every frame, or undefined. Refs allow callers to
 * animate the hand position via useFrame without re-rendering.
 */
export type HandTarget =
  | [number, number, number]
  | { current: [number, number, number] | undefined | null }

/** Custom per-frame skeleton builder (escape hatch for fully custom poses). */
export type SkeletonBuilder = (ctx: { P: Proportions; t: number; phase: number }) => PoseGeometry

export type GoldFigureProps = {
  kind?: FigureKind
  /** Pose preset. Defaults to 'walking'. Ignored if `skeleton` is provided. */
  pose?: PoseName
  /**
   * Escape hatch: a per-frame function that returns full skeleton curves and
   * spheres. When provided, `pose` is ignored and the returned geometry is
   * used directly. Useful for scenes whose pose doesn't fit any preset.
   */
  skeleton?: SkeletonBuilder
  /**
   * If true, rebuild geometry every frame for live walk cycle / pulse.
   * If false, geometry is built once per input change (cheap static figure).
   * Defaults to true when pose === 'walking' or when `skeleton` or hand-ref
   * targets are provided, false otherwise.
   */
  animate?: boolean
  /** For walking only — if true, figure walks in place (no z-loop locomotion). */
  inPlace?: boolean
  /** Walk cycle phase offset in [0, 1]. Desync multiple figures with this. */
  phaseOffset?: number
  /** Pin the left hand. Accepts a triple or a ref (read every frame). */
  leftHandAt?: HandTarget
  /** Pin the right hand. Accepts a triple or a ref (read every frame). */
  rightHandAt?: HandTarget
  /**
   * Solve a pinned arm as two bones of fixed length rather than lerping the
   * elbow along the shoulder→hand line. Off by default; turn it on for any
   * reach that leaves the body, where the elbow has to trail the hand rather
   * than swing with it. See `buildSolvedArmPoints`.
   */
  solvedArms?: boolean
  /** Standing/reaching only: open the stance by moving the ankles this far
   *  outward (default 0, feet together). */
  stanceSpread?: number
  /** Positive = nudge head forward along +z. */
  headForwardTilt?: number
  /** Seated lean amount at shoulders (default 0.12). */
  seatedLean?: number
  /** Enable shadow casting on the figure mesh. */
  castShadow?: boolean
  /** Material: preset name, or a caller-supplied THREE.Material. */
  material?: MaterialPreset | THREE.Material
  /**
   * Override emissive intensity (applied when `material` is a preset).
   * Default is the preset's baked value.
   */
  glow?: number
  /**
   * Per-frame multiplier on the resolved emissive intensity — a figure whose
   * light is going out, or coming up. Applied after the preset's pulse, and
   * to the hat's shell in the same proportion, so headwear never survives
   * its wearer's dimming.
   *
   * The argument is the SCENE's anim time; a caller on a different clock
   * (Act B's `worldTime()`) should ignore it and read its own.
   *
   * NB this writes to the material, so a caller-supplied material instance
   * shared between figures will dim all of them.
   */
  glowScale?: (t: number) => number
  /**
   * Headwear, riding the head sphere. See ./hats.ts — four real pieces, two
   * of them conical. Sized for the adult; a child in one looks like a child
   * in an adult's hat, which is correct.
   */
  hat?: HatName
  /**
   * Tilt the hat about its wearer's x, radians. NEGATIVE tips the brim back
   * off the brow; POSITIVE pulls it down over the eyes. (The sign is the
   * three.js one — a point on the front of the brim is at +z, and a positive
   * rotation about x takes +z downward.)
   */
  hatTilt?: number
  /**
   * Cant the hat sideways, radians — positive drops the brim on the wearer's
   * LEFT (-x) and lifts it on their right.
   *
   * A tilt alone can only take the brim out of the way fore and aft, and a
   * 삿갓's brim is 0.42 units in radius: on this rig that is wider than a
   * head and a shoulder together, so anything beside the wearer's head — a
   * doorpost, or the head of the person carrying them — is inside the disc
   * whatever the tilt is. The roll is what takes the plane off it, and it is
   * also just what happens to a hat worn by somebody being carried.
   */
  hatRoll?: number
  /**
   * Uniform size multiplier on the hat, about its seat on the head.
   *
   * Hats are authored at ABSOLUTE size (see ./hats.ts) so that the same
   * 삿갓 is the same physical object on an adult, a child, and a figure
   * mounted at 20×. That is right for a figure read at distance and wrong
   * for one filling frame: a 0.42-radius brim on a floor-seated adult is
   * wider than the body is tall, and any camera above her eyeline sees a
   * disc with a spine under it and no head at all. Scale it down for the
   * close shots; leave it alone everywhere else.
   */
  hatScale?: number
}

function resolveHandTarget(t?: HandTarget): [number, number, number] | undefined {
  if (!t) return undefined
  if (Array.isArray(t)) return t
  return t.current ?? undefined
}

function isRef(t?: HandTarget): boolean {
  return !!t && !Array.isArray(t)
}

const DEFAULTS = {
  pose: 'walking' as PoseName,
  kind: 'adult' as FigureKind,
  phaseOffset: 0,
  seatedLean: 0.12,
}

export function GoldFigure(props: GoldFigureProps) {
  const {
    kind = DEFAULTS.kind,
    pose = DEFAULTS.pose,
    skeleton,
    inPlace = false,
    phaseOffset = DEFAULTS.phaseOffset,
    leftHandAt,
    rightHandAt,
    solvedArms = false,
    stanceSpread = 0,
    headForwardTilt = 0,
    seatedLean = DEFAULTS.seatedLean,
    castShadow = false,
    material,
    glow,
    glowScale,
    hat,
    hatTilt = 0,
    hatRoll = 0,
    hatScale = 1,
  } = props

  const animate = props.animate ?? (
    pose === 'walking' || !!skeleton || isRef(leftHandAt) || isRef(rightHandAt)
  )

  const P = proportionsFor(kind)
  const groupRef = useRef<Group>(null)
  const meshRef = useRef<Mesh>(null)
  const geoRef = useRef<THREE.BufferGeometry | null>(null)
  const hatRef = useRef<Group>(null)

  // Material: preset → build once with optional glow override. Instance → use as-is.
  const bodyMat = useMemo(() => {
    if (material && typeof material !== 'string') return material
    const preset = (material ?? 'goldAmber') as MaterialPreset
    const mat = buildMaterialFromPreset(preset)
    if (glow != null) mat.emissiveIntensity = glow
    return mat
  }, [material, glow])

  // Pulse metadata — only preset-originated materials with pulse=true pulse.
  const pulseSpec = useMemo(() => {
    if (material && typeof material !== 'string') return null
    const preset = (material ?? 'goldAmber') as MaterialPreset
    const spec = getPresetSpec(preset)
    return spec.pulse ? { base: glow ?? spec.emissiveIntensity ?? 1.0, amp: spec.pulseAmp ?? 0.3 } : null
  }, [material, glow])

  // The unmodulated emissive. `glowScale` has to multiply THIS rather than
  // whatever is on the material right now, or each frame scales the last
  // frame's result and the figure decays to black in about a second.
  const baseGlow = useMemo(() => {
    if (material && typeof material !== 'string') {
      return material instanceof THREE.MeshStandardMaterial ? material.emissiveIntensity : 1
    }
    return glow ?? getPresetSpec((material ?? 'goldAmber') as MaterialPreset).emissiveIntensity ?? 1
  }, [material, glow])

  // ── Hat ──────────────────────────────────────────────────────────────
  // Static geometry — a hat rides the head, it does not deform — and a shell
  // material derived from the body's: same colour, a fraction of the
  // emissive, because straw and paper and horsehair are surfaces catching
  // the figure's light rather than a second source of it.
  const hatBuild = useMemo(() => (hat ? buildHat(hat, P.RH) : null), [hat, P.RH])
  // A caged hat has a fixed seat; an uncaged one rests where this head and
  // this hatScale put it, so it is re-solved whenever either of them moves.
  const hatSeat = useMemo(() => {
    if (!hatBuild) return 0
    return hatBuild.seatOnHead ? onHeadSeat(hatBuild.profile, P.RH, hatScale) : hatBuild.seat
  }, [hatBuild, P.RH, hatScale])
  const hatShellMat = useMemo(() => {
    if (!hatBuild) return null
    const src = bodyMat instanceof THREE.MeshStandardMaterial ? bodyMat : null
    const m = src ? src.clone() : new THREE.MeshStandardMaterial({ color: '#FFB938' })
    m.emissiveIntensity = (src?.emissiveIntensity ?? 1) * hatBuild.shellDim
    m.roughness = Math.min(1, (src?.roughness ?? 0.7) + 0.25)
    m.side = THREE.DoubleSide
    if (hatBuild.shellOpacity < 1) {
      m.transparent = true
      m.opacity = hatBuild.shellOpacity
      m.depthWrite = false
    }
    return m
  }, [hatBuild, bodyMat])
  useEffect(() => () => {
    hatBuild?.shell.dispose()
    hatBuild?.trim.dispose()
    hatShellMat?.dispose()
  }, [hatBuild, hatShellMat])

  // Static pose geometry built once (when animate === false).
  // Only fixed-coord hand targets matter here; ref targets force animate=true.
  const staticPose = useMemo(() => {
    if (animate) return null
    const left = resolveHandTarget(leftHandAt)
    const right = resolveHandTarget(rightHandAt)
    const { curves, spheres } = buildPose(pose, {
      P,
      phase: phaseOffset,
      leftHandAt: left,
      rightHandAt: right,
      headForwardTilt,
      lean: seatedLean,
      solvedArms,
      stanceSpread,
    })
    return { geo: buildBody(curves, spheres), head: spheres[0]?.center }
  }, [animate, pose, P, phaseOffset, leftHandAt, rightHandAt, headForwardTilt, seatedLean, solvedArms, stanceSpread])

  // Assign static geometry on mount, and seat the hat on the static head.
  useEffect(() => {
    if (animate || !staticPose) return
    if (meshRef.current) meshRef.current.geometry = staticPose.geo
    const head = staticPose.head
    if (hatRef.current && head && hatBuild) {
      hatRef.current.position.set(head.x, head.y + hatSeat * hatScale, head.z)
    }
  }, [animate, staticPose, hatBuild, hatSeat, hatScale])

  // Dispose geometries on unmount.
  useEffect(() => () => {
    geoRef.current?.dispose()
    staticPose?.geo.dispose()
  }, [staticPose])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()

    // Emissive. `glowScale` runs even for a figure posed once and never
    // rebuilt — a figure whose light is going out need not be a moving one —
    // but the preset PULSE stays behind the animate gate, where it has always
    // been. Letting it out would quietly relight every static figure in the
    // film.
    if (bodyMat instanceof THREE.MeshStandardMaterial && (glowScale || (animate && pulseSpec))) {
      let e = animate && pulseSpec
        ? (pulseSpec.base - 0.15) + (0.5 + 0.5 * Math.sin(t * 1.0)) * pulseSpec.amp
        : baseGlow
      if (glowScale) e *= glowScale(t)
      bodyMat.emissiveIntensity = e
      if (hatShellMat && hatBuild) hatShellMat.emissiveIntensity = e * hatBuild.shellDim
    }

    // Keep the hat's shell locked to whatever the body material is doing. The
    // shell is a CLONE taken at mount, so a caller animating its own material
    // — Act 8.55's parent is dark until the touch and then comes up — would
    // light the body and leave the hat behind at its mount value, which is a
    // black disc floating over a glowing head.
    if (hatShellMat && hatBuild && bodyMat instanceof THREE.MeshStandardMaterial) {
      hatShellMat.emissiveIntensity = bodyMat.emissiveIntensity * hatBuild.shellDim
      hatShellMat.color.copy(bodyMat.color)
      hatShellMat.emissive.copy(bodyMat.emissive)
      hatShellMat.opacity = bodyMat.opacity * hatBuild.shellOpacity
    }

    if (!animate) return
    const phase = ((t / P.CYCLE) + phaseOffset) % 1

    const { curves, spheres } = skeleton
      ? skeleton({ P, t, phase })
      : buildPose(pose, {
          P,
          phase,
          leftHandAt: resolveHandTarget(leftHandAt),
          rightHandAt: resolveHandTarget(rightHandAt),
          headForwardTilt,
          lean: seatedLean,
          solvedArms,
          stanceSpread,
        })
    const newGeo = buildBody(curves, spheres)

    geoRef.current?.dispose()
    geoRef.current = newGeo
    if (meshRef.current) meshRef.current.geometry = newGeo

    // The hat rides whatever the pose calls a head — including a custom
    // skeleton's, which is why this reads the built sphere rather than
    // P.HEAD_Y. It bobs with the walk because the head does.
    const head = spheres[0]?.center
    if (hatRef.current && head && hatBuild) {
      // The seat rides the scale with the hat — the geometry is authored with
      // the head centre at hat-local -seat, so shrinking the group about its
      // origin has to bring the origin down by the same factor or the crown
      // floats off the skull.
      hatRef.current.position.set(head.x, head.y + hatSeat * hatScale, head.z)
    }

    // Locomotion belongs to the built-in walking pose only. A caller that
    // supplies `skeleton` owns the figure's pose *and* its placement, so
    // driving the inner group from here would silently slide their figure
    // down a 3-unit loop underneath whatever transform they set — the kind of
    // drift that only shows up seconds into a shot.
    if (groupRef.current && pose === 'walking' && !skeleton) {
      if (!inPlace) {
        const WALK_SPEED = (4 * P.STRIDE) / P.CYCLE
        const dist = ((t + phaseOffset * P.CYCLE) * WALK_SPEED) % P.LOOP_DIST
        groupRef.current.position.z = P.LOOP_START_Z + dist
      }
      groupRef.current.rotation.y = Math.sin(phase * 2 * Math.PI) * 0.04
    }

  })

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} material={bodyMat} castShadow={castShadow} />
      {hatBuild && hatShellMat && (
        <group ref={hatRef} rotation={[hatTilt, 0, hatRoll]} scale={hatScale}>
          <mesh geometry={hatBuild.shell} material={hatShellMat} castShadow={castShadow} />
          <mesh geometry={hatBuild.trim} material={bodyMat} castShadow={castShadow} />
        </group>
      )}
    </group>
  )
}
