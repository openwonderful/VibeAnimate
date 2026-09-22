/**
 * env.dirtRoad — the recurring country road: a long warm-earth strip with
 * wheel ruts, scattered edge stones and grass tufts. This is the shared
 * replacement for the 12 near-identical local DirtRoad functions across
 * act3/act4/act5/act6 (migration tracked in MIGRATION.md).
 */
import { useMemo } from 'react'
import * as THREE from 'three'
import { seededRandom } from '../../utils/svgHelpers'
import { Instances } from '../worlds/instancing'

const stoneGeo = new THREE.DodecahedronGeometry(1, 0)
const tuftGeo = new THREE.ConeGeometry(1, 2, 5)

export type DirtRoadProps = {
  position?: [number, number, number]
  rotationY?: number
  length?: number
  width?: number
  seed?: number
  color?: string
  /** Scatter density multiplier for stones/grass. */
  detail?: number
}

export function DirtRoad({
  position = [0, 0, 0],
  rotationY = 0,
  length = 40,
  width = 3,
  seed = 11,
  color = '#6E5638',
  detail = 1,
}: DirtRoadProps) {
  const { stones, tufts } = useMemo(() => {
    const rnd = seededRandom(seed)
    const stoneCount = Math.round(length * 0.9 * detail)
    const stones = Array.from({ length: stoneCount }, () => ({
      pos: [
        (rnd() - 0.5) * width * 1.35,
        0.03,
        (rnd() - 0.5) * length,
      ] as [number, number, number],
      s: 0.05 + rnd() * 0.1,
      rot: rnd() * Math.PI,
    }))
    const tuftCount = Math.round(length * 0.6 * detail)
    const tufts = Array.from({ length: tuftCount }, () => {
      const side = rnd() > 0.5 ? 1 : -1
      return {
        pos: [
          side * (width / 2 + 0.2 + rnd() * 0.7),
          0.06,
          (rnd() - 0.5) * length,
        ] as [number, number, number],
        s: 0.1 + rnd() * 0.16,
      }
    })
    return { stones, tufts }
  }, [seed, length, width, detail])

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Road bed */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
      {/* Wheel ruts */}
      {[-width * 0.22, width * 0.22].map(x => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.018, 0]}>
          <planeGeometry args={[width * 0.13, length]} />
          <meshStandardMaterial color="#584428" roughness={1} />
        </mesh>
      ))}
      {/* Scatter as two InstancedMeshes — one draw call per family. */}
      <Instances
        specs={stones.map(st => ({ position: st.pos, scale: st.s, rotationY: st.rot }))}
        geometry={stoneGeo}
        color="#7A7268"
        flatShading
      />
      <Instances
        specs={tufts.map(tf => ({ position: tf.pos, scale: [tf.s, tf.s * 1.6, tf.s] as [number, number, number] }))}
        geometry={tuftGeo}
        color="#55683A"
        flatShading
      />
    </group>
  )
}

export function DirtRoadPreview() {
  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight position={[2, 4, 2]} intensity={0.9} />
      <group rotation={[0.42, 0.5, 0]} position={[0, -0.35, 0]} scale={0.32}>
        <DirtRoad length={14} />
      </group>
    </>
  )
}
