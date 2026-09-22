/* eslint-disable react-refresh/only-export-components -- world module: geometry components + WorldDef in one file by design */
/**
 * Lantern Valley — the story film's home world: a mountain-ringed valley
 * village of hanok along a dirt road strung with paper lanterns, a river
 * with a wooden bridge, and a shrine hill under an old persimmon tree.
 *
 * One world, many shots: every story scene set here mounts THIS component
 * with a different camera/lighting/region config (see ./shots/).
 */
import { useMemo } from 'react'
import * as THREE from 'three'
import { seededRandom } from '../../../utils/svgHelpers'
import { Instances } from '../instancing'
import { Lantern } from '../../ingredients/Lantern'
import { Hanok } from '../../ingredients/Hanok'
import { PersimmonTree } from '../../ingredients/PersimmonTree'
import { DirtRoad } from '../../ingredients/DirtRoad'
import { StoneWall } from '../../../scenes/act4/StoneWall'
import { Region } from '../World'
import type { WorldDef } from '../types'

/** Poles + hanging lanterns along the road. */
function LanternLine({ night }: { night: boolean }) {
  const posts: { x: number; z: number; phase: number }[] = []
  for (let i = 0; i < 6; i++) {
    posts.push({ x: -1.9, z: 8 - i * 4, phase: i * 1.7 })
    posts.push({ x: 1.9, z: 6 - i * 4, phase: i * 1.3 + 0.9 })
  }
  return (
    <>
      {posts.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]}>
          <mesh position={[0, 1.25, 0]}>
            <cylinderGeometry args={[0.05, 0.07, 2.5, 7]} />
            <meshStandardMaterial color="#3E2C1C" roughness={1} />
          </mesh>
          <mesh position={[0, 2.45, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.035, 0.035, 0.7, 6]} />
            <meshStandardMaterial color="#3E2C1C" roughness={1} />
          </mesh>
          <Lantern
            position={[p.x > 0 ? -0.35 : 0.35, 2.0, 0]}
            scale={0.8}
            swayPhase={p.phase}
            intensity={night ? 2.6 : 0.7}
            light={night && i % 3 === 0}
          />
        </group>
      ))}
    </>
  )
}

function Terrain() {
  return (
    <>
      {/* Valley floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[70, 48]} />
        <meshStandardMaterial color="#3A4A32" roughness={1} />
      </mesh>
      {/* Gentle meadow mounds */}
      {[[-14, -6, 9], [10, 4, 7], [-8, -18, 11], [18, -22, 13]].map(([x, z, r], i) => (
        <mesh key={i} position={[x, -r * 0.82, z]}>
          <sphereGeometry args={[r, 20, 14]} />
          <meshStandardMaterial color="#425240" roughness={1} />
        </mesh>
      ))}
    </>
  )
}

function MountainRing() {
  // One InstancedMesh: unit cone scaled per peak (single draw call).
  const { geometry, specs } = useMemo(() => {
    const rnd = seededRandom(42)
    const specs = Array.from({ length: 14 }, (_, i) => {
      const angle = (i / 14) * Math.PI * 2 + rnd() * 0.3
      const dist = 48 + rnd() * 14
      const h = 14 + rnd() * 16
      const r = 10 + rnd() * 8
      return {
        position: [Math.cos(angle) * dist, h / 2 - 1, Math.sin(angle) * dist] as [number, number, number],
        scale: [r, h, r] as [number, number, number],
      }
    })
    return { geometry: new THREE.ConeGeometry(1, 1, 7), specs }
  }, [])
  return <Instances specs={specs} geometry={geometry} color="#232E3E" flatShading />
}

function Village() {
  return (
    <>
      <Hanok position={[-5.2, 0, -2]} rotationY={0.35} windowsLit />
      <Hanok position={[5, 0, -5.5]} rotationY={-0.5} windowsLit />
      <Hanok position={[-6.5, 0, -9]} rotationY={0.9} />
      <Hanok position={[4.5, 0, 0.8]} rotationY={-0.15} windowsLit />
      <Hanok position={[7.5, 0, -11]} rotationY={-0.8} />
      <StoneWall position={[-2.6, 0, 2.6]} length={3.4} markCount={3} />
      <StoneWall position={[2.8, 0, -8.4]} length={2.6} markCount={0} />
      <PersimmonTree position={[-3.4, 0, -5.6]} seed={7} season="autumn" scale={1.15} />
      <PersimmonTree position={[6.8, 0, -2.4]} seed={12} season="autumn" scale={0.9} />
      <PersimmonTree position={[-7.5, 0, 1.5]} seed={3} season="autumn" scale={1.3} />
    </>
  )
}

function River() {
  return (
    <>
      {/* Water strip crossing the road */}
      <mesh rotation={[-Math.PI / 2, 0, 0.12]} position={[0, 0.02, 9.5]}>
        <planeGeometry args={[80, 4.4]} />
        <meshStandardMaterial color="#2A4A66" roughness={0.25} metalness={0.35} />
      </mesh>
      {/* Wooden bridge over the river on the road line */}
      <group position={[0, 0, 9.5]}>
        <mesh position={[0, 0.42, 0]} rotation={[0, 0, 0]}>
          <boxGeometry args={[3.2, 0.14, 5.4]} />
          <meshStandardMaterial color="#5A3E26" roughness={1} />
        </mesh>
        {[-1.45, 1.45].map(x => (
          <mesh key={x} position={[x, 0.78, 0]}>
            <boxGeometry args={[0.1, 0.6, 5.4]} />
            <meshStandardMaterial color="#4A3220" roughness={1} />
          </mesh>
        ))}
        {[-2.2, 0, 2.2].flatMap(z => [-1.45, 1.45].map(x => (
          <mesh key={`${x}:${z}`} position={[x, 0.35, z]}>
            <cylinderGeometry args={[0.07, 0.09, 0.85, 6]} />
            <meshStandardMaterial color="#4A3220" roughness={1} />
          </mesh>
        )))}
      </group>
    </>
  )
}

function ShrineHill() {
  return (
    <group position={[15, 0, -15]}>
      {/* The hill — top of the sphere sits at y ≈ 4.5 */}
      <mesh position={[0, -4, 0]}>
        <sphereGeometry args={[8.5, 24, 16]} />
        <meshStandardMaterial color="#3E5040" roughness={1} />
      </mesh>
      {/* Stone steps suggestion */}
      {[0, 1, 2, 3, 4].map(i => (
        <mesh key={i} position={[-3.9 + i * 0.68, 1.6 + i * 0.62, 3.2 - i * 0.75]} rotation={[0, 0.5, 0]}>
          <boxGeometry args={[1.1, 0.16, 0.5]} />
          <meshStandardMaterial color="#6E6A62" roughness={1} />
        </mesh>
      ))}
      {/* Shrine — a small hanok on the crown */}
      <group position={[0, 4.4, 0]} scale={0.55}>
        <Hanok rotationY={0.6} windowsLit windowColor="#FFD9A0" />
      </group>
      {/* The old persimmon tree beside it */}
      <PersimmonTree position={[2.7, 4.15, -1.2]} seed={21} season="autumn" scale={1.7} />
      {/* Shrine lanterns */}
      <Lantern position={[-1.7, 5.9, 1.7]} scale={0.9} swayPhase={0.4} light />
      <Lantern position={[1.3, 6.0, 2.2]} scale={0.75} swayPhase={2.1} light />
    </group>
  )
}

/** Lighting rigs — lights + fog only; scene background comes from the shot. */
function DuskLighting() {
  return (
    <>
      <fog attach="fog" args={['#2A1E3A', 26, 95]} />
      <ambientLight color="#8A6AAE" intensity={0.9} />
      <directionalLight position={[-30, 12, 12]} color="#FF9E6E" intensity={2.0} />
      <hemisphereLight args={['#5A4A8E', '#3A3020', 0.8]} />
    </>
  )
}

function NightLighting() {
  return (
    <>
      <fog attach="fog" args={['#0A1020', 16, 60]} />
      <ambientLight color="#24304E" intensity={0.55} />
      <directionalLight position={[20, 26, -12]} color="#A8C8E8" intensity={0.4} />
      <hemisphereLight args={['#1A2A4E', '#0A0E14', 0.35]} />
    </>
  )
}

function DawnLighting() {
  return (
    <>
      <fog attach="fog" args={['#3A2E42', 30, 110]} />
      <ambientLight color="#A87A8E" intensity={0.9} />
      <directionalLight position={[30, 10, 8]} color="#FFB88E" intensity={1.9} />
      <hemisphereLight args={['#8E5A6E', '#3A3020', 0.7]} />
    </>
  )
}

function LanternValleyBody() {
  return (
    <>
      <Region id="ground"><Terrain /></Region>
      <Region id="mountains"><MountainRing /></Region>
      <Region id="road">
        <DirtRoad length={44} width={3.2} seed={11} />
        <LanternLine night />
      </Region>
      <Region id="village"><Village /></Region>
      <Region id="river"><River /></Region>
      <Region id="hill"><ShrineHill /></Region>
    </>
  )
}

export const LANTERN_VALLEY: WorldDef = {
  id: 'lanternValley',
  name: 'Lantern Valley',
  description: 'Mountain-ringed village along a lantern-strung road: river + bridge, hanok cluster, shrine hill with the old persimmon tree.',
  regions: ['ground', 'mountains', 'road', 'village', 'river', 'hill'],
  anchors: {
    gate: { id: 'gate', pos: [0, 1.5, 6], description: 'village entrance where the road meets the bridge' },
    lane: { id: 'lane', pos: [0, 1.6, -4], description: 'mid-village lane between the hanok' },
    bridge: { id: 'bridge', pos: [0, 1.2, 9.5], description: 'wooden bridge over the river' },
    shrine: { id: 'shrine', pos: [15, 4.5, -15], description: 'hilltop shrine under the persimmon tree' },
  },
  lightingPresets: { dusk: DuskLighting, night: NightLighting, dawn: DawnLighting },
  Component: LanternValleyBody,
}
