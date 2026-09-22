/**
 * The parent — waiting on the yard, then walking down to meet him.
 *
 * Rendered in WORLD space (not inside the farmhouse group) because the walk
 * ends out on the road, and driven entirely by `homecoming.ts`, so Act 7.2 and
 * Act 8.55 place them identically on the frame they share.
 *
 * Three things about this figure are deliberate:
 *
 *   - A STICK FIGURE, like the hero. The crowd are capsule-and-sphere
 *     silhouettes; the two people this story is about are drawn as people.
 *   - TALLER than him (`PARENT_SCALE`). He left as a child.
 *   - DARK until he touches them. They are lit by the house they are standing
 *     in front of and by nothing else — which is the whole point: the light in
 *     this valley starts at two hands, not at one person who arrives carrying
 *     it.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getAnimTime } from '../../hooks/useAnimTime'
import { ADULT, buildPose, GoldFigure } from '../characters/goldFigure'
import { PARENT_SCALE, PARENT_WARM } from './constants'
import { makeGlowMaterial, updateGlowScale } from './glow'
import {
  parentGlow, parentMotion, parentPhase, parentPos, parentReach, reachHandWorld,
} from './homecoming'

/** Same gait the hero walks with — see hero.ts for why STRIDE is lengthened. */
const PARENT_PROPS = { ...ADULT, STRIDE: 0.34, FOOT_LIFT: 0.13 }
/** Hand at rest, in figure-local coordinates (from buildRestingArmPoints). */
const REST_HAND: [number, number, number] = [0.105, ADULT.SHOULDER_Y - 0.55, 0.01]

export function ParentFigure({ tOff = 0 }: { tOff?: number }) {
  const group = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const light = useRef<THREE.PointLight>(null)
  const alphaRef = useRef<THREE.BufferAttribute>(null)
  const glowMat = useMemo(() => makeGlowMaterial({ depthTest: false }), [])

  // Same two-sprite halo the hero carries — a transparent sphere at this size
  // reads as a hard disc pasted over the frame, which is what it was doing.
  const halo = useMemo(() => {
    const c = new THREE.Color(PARENT_WARM)
    const c2 = new THREE.Color('#E8A030')
    return {
      positions: new Float32Array([0, 1.35, 0, 0, 1.4, 0]),
      colors: new Float32Array([c.r, c.g, c.b, c2.r, c2.g, c2.b]),
      sizes: new Float32Array([1.5, 3.2]),
      alphas: new Float32Array([0, 0]),
      phases: new Float32Array([1.4, 3.1]),
    }
  }, [])

  /**
   * Held in a ref and mutated per frame rather than re-rendered: the reach is a
   * continuous move and React has no business in it.
   */
  const handRef = useRef<[number, number, number] | undefined>(undefined)

  const material = useMemo(() => new THREE.MeshStandardMaterial({
    // Dark, warm, ordinary — a person standing in someone else's light. The
    // emissive is driven to zero until the touch, so before then this reads
    // purely as whatever the doorway throws on them.
    color: '#7C5C38', emissive: PARENT_WARM, emissiveIntensity: 0, roughness: 0.72,
  }), [])

  const skeleton = useMemo(() => () => {
    const t = getAnimTime() + tOff
    const m = parentMotion(t)
    return buildPose('walking', {
      P: {
        ...PARENT_PROPS,
        // Floored, not zeroed: the walking pose divides by STRIDE for the arm
        // swing, and 0/0 puts NaN into the geometry.
        STRIDE: Math.max(0.02, PARENT_PROPS.STRIDE * m),
        FOOT_LIFT: PARENT_PROPS.FOOT_LIFT * m,
      },
      phase: m > 0.02 ? parentPhase(t) : 0,
      headForwardTilt: 0.03,
      rightHandAt: handRef.current,
    })
  }, [tOff])

  useFrame(({ camera, size, gl }) => {
    const t = getAnimTime() + tOff
    const [px, pz] = parentPos(t)
    const motion = parentMotion(t)
    const reach = parentReach(t)
    const lit = parentGlow(t)
    updateGlowScale(glowMat, camera, size.height * gl.getPixelRatio(), t)

    // The reach is authored in WORLD space (it has to land on a point defined
    // between two figures), so it comes back through the group transform: the
    // group is unrotated, so that is a translate and a uniform scale.
    if (reach > 0.001) {
      const w = reachHandWorld(
        [px, pz], reach,
        REST_HAND[0] * PARENT_SCALE, REST_HAND[1] * PARENT_SCALE, REST_HAND[2] * PARENT_SCALE,
      )
      handRef.current = [
        (w[0] - px) / PARENT_SCALE, w[1] / PARENT_SCALE, (w[2] - pz) / PARENT_SCALE,
      ]
    } else {
      handRef.current = undefined
    }

    if (group.current) {
      group.current.position.set(px, 0, pz)
      // Facing up the road the whole time — first because they are watching for
      // him, then because they are walking toward him. Both are +z.
      group.current.rotation.y = 0
    }
    if (body.current) {
      // Leaning into the walk, then straightening as they stop in front of him.
      body.current.rotation.x = 0.05 * motion
    }

    // No touch flash here. He lights at the contact; they light a beat after —
    // the whole point of the two-step is that you watch it pass from him to
    // them, and a flash on both at T_TOUCH collapses it into one event.
    material.emissiveIntensity = lit * 1.55
    // Someone standing and waiting shifts their weight. Without this the parent
    // is a statue on the lawn, which is its own kind of unsettling.
    if (group.current) {
      group.current.rotation.z = Math.sin(t * 0.31) * 0.016 * (1 - motion)
    }
    if (alphaRef.current) {
      const arr = alphaRef.current.array as Float32Array
      const dCam = Math.hypot(camera.position.x - px, camera.position.z - pz)
      const far = Math.min(1, Math.max(0, (dCam - 3.5) / 6))
      arr[0] = 0.45 * lit
      arr[1] = 0.13 * lit * (far * far * (3 - 2 * far))
      alphaRef.current.needsUpdate = true
    }
    if (light.current) light.current.intensity = lit * 1.9
  })

  return (
    <group ref={group}>
      <group ref={body} scale={PARENT_SCALE}>
        <GoldFigure skeleton={skeleton} material={material} inPlace />
      </group>
      <points material={glowMat} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[halo.positions, 3]} />
          <bufferAttribute attach="attributes-aColor" args={[halo.colors, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[halo.sizes, 1]} />
          <bufferAttribute ref={alphaRef} attach="attributes-aAlpha" args={[halo.alphas, 1]} />
          <bufferAttribute attach="attributes-aPhase" args={[halo.phases, 1]} />
        </bufferGeometry>
      </points>
      <pointLight ref={light} color={PARENT_WARM} intensity={0} distance={7} decay={1.8} position={[0, 1.3, 0.3]} />
    </group>
  )
}
