/**
 * The road home — the other recurring location in the arc, after the hanok.
 *
 * Act 3.2 walks up it carrying a child. Act 4.9 walks back down it with the
 * load inverted. Act 6 holds on it with nobody on it at all, and Act 7 puts
 * him back on it. It has to be recognisably the *same* road each time, which
 * is why the geometry lives here rather than being rebuilt per scene.
 *
 * `hour` moves it through the day. The road, the paddies and the ridges never
 * change; only the sky and what the light does to the water.
 */

import { useMemo } from 'react'
import * as THREE from 'three'
import { rand, type V3 } from './hanok'
import {
  createFarMountainShape,
  createMidMountainShape,
} from '../act1/mountainShapes'

export type RoadHour = 'dusk' | 'dawn' | 'night'

type SkySpec = {
  high: string
  mid: string
  low: string
  ridgeNear: string
  ridgeFar: string
  water: string
  ground: string
  fog: [string, number, number]
}

const SKIES: Record<RoadHour, SkySpec> = {
  dusk: {
    high: '#141A38', mid: '#4A3A5E', low: '#8A4A44',
    ridgeNear: '#0D1124', ridgeFar: '#11162B',
    water: '#2E3A52', ground: '#2A3226',
    fog: ['#1E2440', 12, 46],
  },
  dawn: {
    // Cold up top, a thin warm line on the horizon. Deliberately *not* the
    // gold of dusk — the arc's dawns are the lonely ones.
    high: '#1D2848', mid: '#5A6488', low: '#D89A72',
    ridgeNear: '#0A0E1C', ridgeFar: '#101628',
    water: '#3A4460', ground: '#333A2E',
    fog: ['#2A3450', 16, 58],
  },
  night: {
    high: '#080C1C', mid: '#1A2340', low: '#2A3454',
    ridgeNear: '#070A16', ridgeFar: '#0A0E1E',
    water: '#1A2338', ground: '#1E2420',
    fog: ['#101828', 10, 40],
  },
}

export function roadSky(hour: RoadHour): SkySpec {
  return SKIES[hour]
}

/**
 * Ground, dirt road, flanking paddies, ridge line and sky. The road runs along
 * -z, so a camera at +z looks down it toward the horizon.
 */
export function RoadGround({
  hour = 'dusk', paddies = true,
}: { hour?: RoadHour; paddies?: boolean }) {
  const s = SKIES[hour]

  const farRidge = useMemo(() => createFarMountainShape(150, 7.5), [])
  const midRidge = useMemo(() => createMidMountainShape(120, 4.6), [])

  // Wheel ruts and stones, so the road is not a flat brown ribbon.
  const stones = useMemo(() => {
    const r = rand(2207)
    return Array.from({ length: 60 }, () => ({
      p: [(r() - 0.5) * 2.3, 0.016, -r() * 46 + 2] as V3,
      s: 0.02 + r() * 0.05,
    }))
  }, [])

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[90, 110]} />
        <meshStandardMaterial color={s.ground} roughness={1} />
      </mesh>

      {/* The road itself */}
      <mesh position={[0, 0.012, -14]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2.5, 80]} />
        <meshStandardMaterial color="#5A5140" roughness={0.98} />
      </mesh>
      {/* Two ruts worn down the middle */}
      {[-0.52, 0.52].map(x => (
        <mesh key={x} position={[x, 0.014, -14]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.42, 80]} />
          <meshStandardMaterial color="#4A4234" roughness={1} />
        </mesh>
      ))}
      {stones.map((st, i) => (
        <mesh key={i} position={st.p} scale={st.s}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#6A6252" roughness={1} />
        </mesh>
      ))}

      {paddies && [-3.6, 3.6].map(x => (
        <mesh key={x} position={[x, 0.02, -13]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[4.6, 30]} />
          <meshStandardMaterial color={s.water} roughness={0.5} metalness={0.35} />
        </mesh>
      ))}

      {/* Sky, banded soft rather than in hard stripes. */}
      <mesh position={[0, 12, -40]}>
        <planeGeometry args={[260, 60]} />
        <meshBasicMaterial color={s.high} />
      </mesh>
      {/* Four overlapping bands of falling opacity, so the gradient does not
          break into visible stripes the way two hard planes did. */}
      <mesh position={[0, 9.0, -39.9]}>
        <planeGeometry args={[260, 14.0]} />
        <meshBasicMaterial color={s.mid} transparent opacity={0.38} />
      </mesh>
      <mesh position={[0, 5.2, -39.8]}>
        <planeGeometry args={[260, 7.0]} />
        <meshBasicMaterial color={s.mid} transparent opacity={0.45} />
      </mesh>
      <mesh position={[0, 3.0, -39.7]}>
        <planeGeometry args={[260, 4.4]} />
        <meshBasicMaterial color={s.low} transparent opacity={0.45} />
      </mesh>
      <mesh position={[0, 1.6, -39.6]}>
        <planeGeometry args={[260, 2.6]} />
        <meshBasicMaterial color={s.low} transparent opacity={0.85} />
      </mesh>

      {/* Ridges — the Act 1 silhouettes, so this is the same skyline the
          video opened on. Always darker than the sky behind them, or they
          read as buildings sitting on the horizon instead of hills. */}
      <mesh position={[-6, -0.6, -36]}>
        <shapeGeometry args={[farRidge]} />
        <meshBasicMaterial color={s.ridgeFar} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[8, -0.9, -31]}>
        <shapeGeometry args={[midRidge]} />
        <meshBasicMaterial color={s.ridgeNear} side={THREE.DoubleSide} />
      </mesh>
    </>
  )
}

/** The hanok, seen small from the road — a warm door and not much else. */
export function DistantHanok({
  position, doorGlow = 1,
}: { position: V3; doorGlow?: number }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.62, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 1.24, 1.8]} />
        <meshStandardMaterial color="#2E2A28" roughness={0.95} />
      </mesh>
      <mesh position={[0, 1.42, 0]} castShadow>
        <boxGeometry args={[3.1, 0.16, 2.4]} />
        <meshStandardMaterial color="#181412" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.28, 1.12]} castShadow>
        <boxGeometry args={[3.3, 0.07, 0.5]} />
        <meshStandardMaterial color="#181412" roughness={0.9} />
      </mesh>

      {/* The open door. In Act 6 this is the door 5.4 was looking through, so
          it stays lit and stays open — that is the whole point of the beat. */}
      <mesh position={[0, 0.52, 0.92]}>
        <planeGeometry args={[0.72, 1.0]} />
        <meshBasicMaterial color="#F0A845" />
      </mesh>
      <pointLight
        position={[0, 0.7, 1.6]} color="#FFA830"
        intensity={7 * doorGlow} distance={7} decay={2.1}
      />
      {/* Light spilling onto the dirt in front of it. */}
      <mesh position={[0, 0.03, 2.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.2, 3.0]} />
        <meshBasicMaterial
          color="#F5A030" transparent opacity={0.07 * doorGlow} depthWrite={false}
        />
      </mesh>
    </group>
  )
}

/** Bare roadside tree — a vertical to break the horizon. */
export function RoadsideTree({ position, scale = 1 }: { position: V3; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.25, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.13, 2.5, 8]} />
        <meshStandardMaterial color="#1A1512" roughness={0.95} />
      </mesh>
      {([[-0.42, 2.45, -0.6], [0.38, 2.6, 0.5], [0.05, 2.85, -0.2]] as const).map(
        ([x, y, rot], i) => (
          <mesh key={i} position={[x, y, 0]} rotation={[0, 0, rot]} castShadow>
            <cylinderGeometry args={[0.022, 0.045, 1.1, 6]} />
            <meshStandardMaterial color="#1A1512" roughness={0.95} />
          </mesh>
        ),
      )}
    </group>
  )
}
