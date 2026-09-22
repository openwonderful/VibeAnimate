/**
 * Act 3 — roadside dressing, shared.
 *
 * Jangseung, sotdae, cairns, straw stacks and persimmon trees were written
 * for Act 3.1 and they are most of the reason that shot reads as a Korean
 * country road rather than as a brown strip between two green rectangles.
 * Act B's pull-out now lands in the same valley, so they live here and both
 * scenes import them.
 *
 * Everything is authored in 3.1's units — an adult figure is ~3.8 tall, the
 * road ~3.1 wide — and is positioned by its own <group>, so a caller working
 * at a different world scale just wraps it and sets `scale`.
 */
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getAnimTime } from '../../hooks/useAnimTime'

const PERSIMMON_TRUNK = '#5A3E28'
const PERSIMMON_FRUIT = '#E85520'

/* ─── Jangseung (장승) — carved wooden totem guardian post ─────── */
// Traditional village-boundary marker. Simplified as: weathered post +
// block-carved head + small hat. Usually paired as "grandfather / grandmother".
export function Jangseung({
  position,
  variant = 'grandfather',
}: {
  position: [number, number, number]
  variant?: 'grandfather' | 'grandmother'
}) {
  const eyeColor = '#1A140E'
  const mouthColor = variant === 'grandfather' ? '#C23B22' : '#2A1818'
  const hatColor = variant === 'grandfather' ? '#2A1A10' : '#5A3030'

  return (
    <group position={position}>
      {/* Trunk */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.17, 2.0, 10]} />
        <meshStandardMaterial color="#5A4328" roughness={0.9} />
      </mesh>
      {/* Carved head block */}
      <mesh position={[0, 2.2, 0]} castShadow>
        <boxGeometry args={[0.38, 0.42, 0.36]} />
        <meshStandardMaterial color="#6A4E30" roughness={0.85} />
      </mesh>
      {/* Hat / cap on top */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.22, 0.12, 10]} />
        <meshStandardMaterial color={hatColor} roughness={0.9} />
      </mesh>
      {/* Eyes — tiny dark nooks */}
      {[-0.09, 0.09].map((x, i) => (
        <mesh key={i} position={[x, 2.28, 0.19]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshStandardMaterial color={eyeColor} roughness={1} />
        </mesh>
      ))}
      {/* Mouth — hint of color */}
      <mesh position={[0, 2.08, 0.185]}>
        <boxGeometry args={[0.14, 0.04, 0.01]} />
        <meshStandardMaterial color={mouthColor} roughness={0.9} />
      </mesh>
    </group>
  )
}

export function JangseungPair({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <Jangseung position={[0, 0, 0]} variant="grandfather" />
      <Jangseung position={[0.55, 0, -0.15]} variant="grandmother" />
    </group>
  )
}

/* ─── Sotdae (솟대) — tall pole with wooden bird atop ───────────── */
// Shamanic village marker. A slender pole topped with a stylized goose/duck
// that gazes at the horizon — a prayer for bountiful harvest and safe travel.
export function Sotdae({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Pole */}
      <mesh position={[0, 1.9, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.05, 3.8, 8]} />
        <meshStandardMaterial color="#4A3520" roughness={0.9} />
      </mesh>
      {/* Bird body */}
      <mesh position={[0.03, 3.88, 0.12]} rotation={[0, 0, 0.1]} castShadow>
        <sphereGeometry args={[0.11, 14, 10]} />
        <meshStandardMaterial color="#6A5538" roughness={0.85} />
      </mesh>
      {/* Bird neck — short diagonal */}
      <mesh position={[0.09, 3.95, 0.22]} rotation={[0.3, 0, 0.2]} castShadow>
        <cylinderGeometry args={[0.028, 0.035, 0.14, 8]} />
        <meshStandardMaterial color="#6A5538" roughness={0.85} />
      </mesh>
      {/* Bird head */}
      <mesh position={[0.13, 4.02, 0.28]} castShadow>
        <sphereGeometry args={[0.055, 10, 10]} />
        <meshStandardMaterial color="#6A5538" roughness={0.85} />
      </mesh>
      {/* Beak */}
      <mesh position={[0.2, 4.0, 0.33]} rotation={[0, -0.5, 0]} castShadow>
        <coneGeometry args={[0.022, 0.08, 6]} />
        <meshStandardMaterial color="#C8A060" roughness={0.7} />
      </mesh>
    </group>
  )
}

/* ─── Stone cairn (서낭당) — travelers' prayer pile ─────────────── */
// A pile of stones by the roadside; each traveler adds one for safe passage.
export function StoneCairn({ position }: { position: [number, number, number] }) {
  const stones = useMemo(() => {
    // Deterministic stack of stones, roughly conical.
    const out: { x: number; y: number; z: number; rx: number; ry: number; rz: number; r: number }[] = []
    const rows = [
      { count: 5, y: 0.06, spread: 0.28 },
      { count: 4, y: 0.18, spread: 0.22 },
      { count: 3, y: 0.30, spread: 0.16 },
      { count: 2, y: 0.40, spread: 0.10 },
      { count: 1, y: 0.50, spread: 0.0 },
    ]
    let seed = 0
    const r = () => {
      const s = Math.sin(seed++ * 12.9898) * 43758.5453
      return s - Math.floor(s)
    }
    for (const row of rows) {
      for (let i = 0; i < row.count; i++) {
        const a = (i / row.count) * Math.PI * 2 + r() * 0.5
        const rad = row.spread * (0.5 + r() * 0.5)
        out.push({
          x: Math.cos(a) * rad,
          y: row.y,
          z: Math.sin(a) * rad,
          rx: r() * 0.8, ry: r() * Math.PI, rz: r() * 0.8,
          r: 0.075 + r() * 0.05,
        })
      }
    }
    return out
  }, [])

  return (
    <group position={position}>
      {stones.map((s, i) => (
        <mesh key={i}
          position={[s.x, s.y, s.z]}
          rotation={[s.rx, s.ry, s.rz]}
          castShadow receiveShadow>
          <dodecahedronGeometry args={[s.r, 0]} />
          <meshStandardMaterial color="#706860" roughness={0.92} />
        </mesh>
      ))}
    </group>
  )
}

/* ─── Rice straw stack (볏가리) — harvest bundle in the paddy ──── */
// Conical stack of harvested rice straw. Warm-emissive-tinted so the
// sunset picks them out like lanterns in the field.
export function RiceStrawStack({
  position, scale = 1,
}: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      {/* Main straw cone */}
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <coneGeometry args={[0.45, 1.1, 12, 1, true]} />
        <meshStandardMaterial
          color="#C89A42"
          emissive="#8B6A20"
          emissiveIntensity={0.25}
          roughness={0.95}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Secondary inner cone — gives depth + catches light at tip */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <coneGeometry args={[0.28, 0.7, 10]} />
        <meshStandardMaterial
          color="#D4AC5C"
          emissive="#A07828"
          emissiveIntensity={0.3}
          roughness={0.9}
        />
      </mesh>
      {/* Base ring at the ground */}
      <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.48, 0.5, 0.08, 14]} />
        <meshStandardMaterial color="#8B6A3A" roughness={0.95} />
      </mesh>
    </group>
  )
}

/* ─── Persimmon tree ────────────────────────────────────────────── */
function DriftingFruit({
  pos, size, phase, speed,
}: { pos: [number, number, number]; size: number; phase: number; speed: number }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(() => {
    if (!ref.current) return
    const t = getAnimTime()
    ref.current.position.y = pos[1] + Math.sin(t * speed + phase) * 0.02
  })
  return (
    <mesh ref={ref} position={pos} castShadow>
      <sphereGeometry args={[size, 10, 10]} />
      <meshStandardMaterial
        color={PERSIMMON_FRUIT}
        emissive={PERSIMMON_FRUIT}
        emissiveIntensity={0.35}
        roughness={0.5}
      />
    </mesh>
  )
}

export function PersimmonTree({
  position, rotation, opaqueCanopy = false,
}: {
  position: [number, number, number]
  rotation?: [number, number, number]
  /** 3.1 keeps the canopy at 0.8 alpha, which is invisible at the size it
   *  reads there. Seen close up — Act B walks past one — a big translucent
   *  sphere with fruit hanging inside it looks like a glass bauble. */
  opaqueCanopy?: boolean
}) {
  const fruits = useMemo(() => {
    const out: { pos: [number, number, number]; size: number }[] = []
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2 + i * 0.5
      const r = 0.3 + (i % 4) * 0.22
      const y = 3.0 + Math.sin(i * 1.7) * 0.5 - (i % 3) * 0.15
      out.push({ pos: [Math.cos(angle) * r, y, Math.sin(angle) * r], size: 0.055 + (i % 3) * 0.015 })
    }
    return out
  }, [])

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.12, 2.4, 8]} />
        <meshStandardMaterial color={PERSIMMON_TRUNK} roughness={0.9} />
      </mesh>
      {[
        { p: [-0.4, 2.4, 0] as const, r: [0, 0, -0.6] as const, l: 1.2 },
        { p: [0.35, 2.5, 0.15] as const, r: [0, 0.3, 0.5] as const, l: 1.1 },
        { p: [-0.2, 2.8, -0.3] as const, r: [-0.3, 0, -0.4] as const, l: 0.9 },
        { p: [0.1, 2.6, 0.3] as const, r: [0.4, 0, 0.3] as const, l: 1.0 },
      ].map((b, i) => (
        <mesh key={i} position={[...b.p]} rotation={[...b.r]} castShadow>
          <cylinderGeometry args={[0.02, 0.04, b.l, 6]} />
          <meshStandardMaterial color={PERSIMMON_TRUNK} roughness={0.9} />
        </mesh>
      ))}
      {/* Canopy cluster */}
      {[
        { p: [0, 3.0, 0] as const, s: 0.85 },
        { p: [-0.3, 2.8, 0.2] as const, s: 0.6 },
        { p: [0.35, 2.9, -0.15] as const, s: 0.55 },
      ].map((c, i) => (
        <mesh key={i} position={[...c.p]} castShadow>
          <sphereGeometry args={[c.s, 16, 12]} />
          <meshStandardMaterial
            color={i === 0 ? '#2A4A15' : '#335A1A'}
            roughness={0.85}
            transparent={!opaqueCanopy}
            opacity={opaqueCanopy ? 1 : 0.8}
          />
        </mesh>
      ))}
      {/* Deterministic sway instead of drei's <Float>, which seeds its phase
          with `Math.random() * 10000` at mount. A Remotion render splits the
          frame range across parallel browser tabs, so every tab gave the
          persimmons a different offset and the fruit jumped position from one
          frame to the next — they read as flickering on the tree. */}
      {fruits.map((f, i) => (
        <DriftingFruit key={i} pos={f.pos} size={f.size} phase={i * 1.7} speed={0.5 + (i % 3) * 0.2} />
      ))}
    </group>
  )
}
