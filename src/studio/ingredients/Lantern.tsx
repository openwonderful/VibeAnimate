/**
 * prop.lantern — glowing paper lantern (cheong-sachorong style): warm
 * emissive paper body, dark caps, hanging cord. The heart of the story
 * film's night scenes; designed to read at both close and far range.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getAnimTime } from '../../hooks/useAnimTime'

export type LanternProps = {
  position?: [number, number, number]
  scale?: number
  /** Paper glow color. */
  color?: string
  /** Emissive strength (bloom picks this up). */
  intensity?: number
  /** Length of the hanging cord above the lantern; 0 = none. */
  cordLength?: number
  /** Sway phase offset so rows of lanterns don't move in lockstep. */
  swayPhase?: number
  /** Add a real point light (use sparingly — a few per scene). */
  light?: boolean
}

export function Lantern({
  position = [0, 0, 0],
  scale = 1,
  color = '#FFB84D',
  intensity = 2.2,
  cordLength = 0.5,
  swayPhase = 0,
  light = false,
}: LanternProps) {
  const group = useRef<THREE.Group>(null)

  const paperMat = useMemo(() => new THREE.MeshStandardMaterial({
    color,
    emissive: new THREE.Color(color),
    emissiveIntensity: intensity,
    roughness: 0.9,
  }), [color, intensity])

  useFrame(() => {
    if (!group.current) return
    const t = getAnimTime()
    group.current.rotation.z = Math.sin(t * 0.9 + swayPhase) * 0.06
    group.current.rotation.x = Math.cos(t * 0.7 + swayPhase * 1.3) * 0.04
  })

  return (
    <group position={position} scale={scale}>
      <group ref={group}>
        {cordLength > 0 && (
          <mesh position={[0, 0.36 + cordLength / 2, 0]}>
            <cylinderGeometry args={[0.008, 0.008, cordLength, 5]} />
            <meshStandardMaterial color="#2A1E14" roughness={1} />
          </mesh>
        )}
        {/* Paper body */}
        <mesh material={paperMat}>
          <sphereGeometry args={[0.3, 20, 16]} />
        </mesh>
        <mesh material={paperMat} scale={[1, 0.72, 1]}>
          <sphereGeometry args={[0.31, 20, 16]} />
        </mesh>
        {/* Ribs */}
        {[-0.12, 0, 0.12].map(y => (
          <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[Math.sqrt(Math.max(0.02, 0.09 - y * y * 2.2)), 0.006, 6, 24]} />
            <meshStandardMaterial color="#B8763A" roughness={0.8} />
          </mesh>
        ))}
        {/* Caps */}
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.1, 0.14, 0.08, 12]} />
          <meshStandardMaterial color="#3A2A1A" roughness={0.9} />
        </mesh>
        <mesh position={[0, -0.3, 0]}>
          <cylinderGeometry args={[0.14, 0.1, 0.08, 12]} />
          <meshStandardMaterial color="#3A2A1A" roughness={0.9} />
        </mesh>
        {/* Tassel */}
        <mesh position={[0, -0.42, 0]}>
          <cylinderGeometry args={[0.02, 0.035, 0.14, 8]} />
          <meshStandardMaterial color="#C24545" roughness={1} />
        </mesh>
        {light && <pointLight color={color} intensity={intensity * 1.2} distance={6 * scale} decay={2} />}
      </group>
    </group>
  )
}

export function LanternPreview() {
  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[2, 3, 2]} intensity={0.5} />
      <Lantern position={[0, 0.05, 0]} scale={1.5} light />
    </>
  )
}
