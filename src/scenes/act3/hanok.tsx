/**
 * Hanok farmhouse — the warm beacon at the end of the road.
 *
 * Written for Act 3.2 and now also standing at the foot of the range in
 * Act B, which flies past it in the opening seconds and walks toward it in
 * the last thirty. Authored in Act 3's units (the body is 2.4 wide), so a
 * caller at another world scale wraps it in a scaled <group>.
 *
 * `lightRange` exists because three.js does NOT scale a PointLight's
 * `distance` with its parent group: drop this into a group at scale 20 and
 * the interior lamp still only reaches 26 world units — about a tenth of the
 * way across the house — so the windows glow and nothing around them does.
 * Callers at scale pass their factor here.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const WARM_AMBER = '#F5C36C'
const HOUSE_GLOW = '#FFBA42'
const HOUSE_WALL = '#4A5A70'
const HOUSE_ROOF = '#2A3848'

export function Hanok({
  position,
  rotation,
  lightRange = 1,
  lights = true,
  foundation = true,
  groundGlow = true,
  glowLevel,
}: {
  position: [number, number, number]
  rotation?: [number, number, number]
  /** Multiplier on every point light's `distance` — set to the group's scale. */
  lightRange?: number
  lights?: boolean
  /**
   * The raised wooden floor slab. It reads as a foundation from the road,
   * where the ground glow washes over it — but seen close and side-lit (6.4's
   * panel) it is a low box with a lit top face standing in front of the
   * door, and it reads as a bench, or the back of a chair. Off there.
   */
  foundation?: boolean
  /**
   * The two translucent amber quads that fake light spill on the ground.
   * They are authored to be seen from a distance down the road; up close
   * they are hard-edged trapezoids that lie OVER whoever is standing in
   * them (depthWrite off), and they veil the porch.
   */
  groundGlow?: boolean
  /**
   * Live multiplier (0..1) on the ground-glow quads, read every frame. They
   * are unlit basic materials, so dimming the house's lamps does not touch
   * them — a scene that turns the porch down has to turn these down too.
   * The door and windows follow it HALF way: they are the wall a figure on
   * the porch is seen against, but a house with dark windows is an empty one.
   */
  glowLevel?: () => number
}) {
  const windowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: WARM_AMBER,
        transparent: true,
        opacity: 0.95,
        toneMapped: false,
      }),
    [],
  )

  const outerGlow = useRef<THREE.MeshBasicMaterial>(null)
  const innerGlow = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(() => {
    if (!glowLevel) return
    const k = glowLevel()
    if (outerGlow.current) outerGlow.current.opacity = 0.2 * k
    if (innerGlow.current) innerGlow.current.opacity = 0.24 * k
    windowMat.color.set(WARM_AMBER).multiplyScalar(0.5 + 0.5 * k)
  })

  return (
    <group position={position} rotation={rotation}>
      {/* Main body */}
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 1.2, 1.8]} />
        <meshStandardMaterial color={HOUSE_WALL} roughness={0.85} />
      </mesh>
      {/* Raised wooden floor / foundation */}
      {foundation && (
        <mesh position={[0, -0.1, 0]} receiveShadow>
          <boxGeometry args={[2.6, 0.2, 2.0]} />
          <meshStandardMaterial color="#3A4050" roughness={0.9} />
        </mesh>
      )}
      {/* Roof — traditional hanok shape */}
      <mesh position={[0, 1.45, 0]} castShadow>
        <boxGeometry args={[3.0, 0.15, 2.4]} />
        <meshStandardMaterial color={HOUSE_ROOF} roughness={0.7} />
      </mesh>
      {/* Roof ridge */}
      <mesh position={[0, 1.58, 0]} castShadow>
        <boxGeometry args={[2.6, 0.12, 0.3]} />
        <meshStandardMaterial color={HOUSE_ROOF} roughness={0.7} />
      </mesh>
      {/* Eave overhang — front */}
      <mesh position={[0, 1.3, 1.1]} castShadow>
        <boxGeometry args={[3.2, 0.06, 0.5]} />
        <meshStandardMaterial color={HOUSE_ROOF} roughness={0.7} />
      </mesh>
      {/* Eave overhang — back */}
      <mesh position={[0, 1.3, -1.1]} castShadow>
        <boxGeometry args={[3.2, 0.06, 0.5]} />
        <meshStandardMaterial color={HOUSE_ROOF} roughness={0.7} />
      </mesh>

      {/* Door — warm amber glow, brightest element */}
      <mesh material={windowMat} position={[0, 0.5, 0.91]}>
        <boxGeometry args={[0.6, 0.8, 0.02]} />
      </mesh>
      {/* Window left — warm glow */}
      <mesh material={windowMat} position={[-0.7, 0.7, 0.91]}>
        <boxGeometry args={[0.4, 0.4, 0.02]} />
      </mesh>
      {/* Window right — warm glow */}
      <mesh material={windowMat} position={[0.7, 0.7, 0.91]}>
        <boxGeometry args={[0.4, 0.4, 0.02]} />
      </mesh>

      {groundGlow && <>
      {/* Warm ground glow in front of door — light spill */}
      <mesh position={[0, 0.11, 2.5]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <planeGeometry args={[4, 5]} />
        <meshBasicMaterial
          ref={outerGlow}
          color="#F5A030"
          transparent
          opacity={0.2}
          depthWrite={false}
          side={THREE.DoubleSide}
          polygonOffset
          polygonOffsetFactor={-4}
          polygonOffsetUnits={-4}
        />
      </mesh>
      {/* Smaller brighter inner glow */}
      <mesh position={[0, 0.15, 1.5]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
        <planeGeometry args={[1.5, 2]} />
        <meshBasicMaterial
          ref={innerGlow}
          color={WARM_AMBER}
          transparent
          opacity={0.24}
          depthWrite={false}
          side={THREE.DoubleSide}
          polygonOffset
          polygonOffsetFactor={-6}
          polygonOffsetUnits={-6}
        />
      </mesh>
      </>}

      {lights && (
        <>
          {/* Strong warm point light pouring from inside the house */}
          <pointLight
            position={[0, 0.8, 2.0]}
            color={HOUSE_GLOW}
            intensity={130 * lightRange * lightRange}
            distance={26 * lightRange}
            decay={1.5}
            castShadow
          />
          {/* Secondary interior glow — softer, wider */}
          <pointLight
            position={[0, 0.6, 0.5]}
            color="#FFA830"
            intensity={20 * lightRange * lightRange}
            distance={12 * lightRange}
            decay={1.5}
          />
          {/* Light spill on the ground in front */}
          <pointLight
            position={[0, 0.15, 3.5]}
            color={WARM_AMBER}
            intensity={15 * lightRange * lightRange}
            distance={10 * lightRange}
            decay={1.8}
          />
        </>
      )}
    </group>
  )
}
