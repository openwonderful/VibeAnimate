/**
 * env.hanok — traditional Korean house: stone base, timber posts, paper
 * windows (optionally lit from inside), and the characteristic upswept
 * tiled roof built from a curved extruded profile.
 */
import { useMemo } from 'react'
import * as THREE from 'three'

export type HanokProps = {
  position?: [number, number, number]
  rotationY?: number
  scale?: number
  /** Warm interior glow through the paper windows. */
  windowsLit?: boolean
  windowColor?: string
  roofColor?: string
  wallColor?: string
}

/** Curved roof cross-section: gentle concave sweep with lifted eaves. */
function makeRoofGeometry(width: number, depth: number): THREE.ExtrudeGeometry {
  const s = new THREE.Shape()
  const half = depth / 2
  s.moveTo(-half - 0.5, 0)
  s.quadraticCurveTo(-half * 0.5, 0.32, 0, 1.0)
  s.quadraticCurveTo(half * 0.5, 0.32, half + 0.5, 0)
  s.quadraticCurveTo(half * 0.55, 0.52, 0, 1.14)
  s.quadraticCurveTo(-half * 0.55, 0.52, -half - 0.5, 0)
  const geo = new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: false })
  geo.rotateY(Math.PI / 2)
  geo.translate(-width / 2, 0, 0)
  return geo
}

export function Hanok({
  position = [0, 0, 0],
  rotationY = 0,
  scale = 1,
  windowsLit = false,
  windowColor = '#FFC873',
  roofColor = '#2E3138',
  wallColor = '#B8A184',
}: HanokProps) {
  const roofGeo = useMemo(() => makeRoofGeometry(4.6, 3.4), [])

  const windowMat = useMemo(() => windowsLit
    ? new THREE.MeshStandardMaterial({ color: windowColor, emissive: new THREE.Color(windowColor), emissiveIntensity: 1.4, roughness: 1 })
    : new THREE.MeshStandardMaterial({ color: '#D8CBB0', roughness: 1 }), [windowsLit, windowColor])

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      {/* Stone platform */}
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[4.4, 0.3, 3.2]} />
        <meshStandardMaterial color="#6E6A62" roughness={1} />
      </mesh>
      {/* Wall body */}
      <mesh position={[0, 1.05, 0]}>
        <boxGeometry args={[4.0, 1.5, 2.8]} />
        <meshStandardMaterial color={wallColor} roughness={1} />
      </mesh>
      {/* Timber posts */}
      {[-1.9, 1.9].flatMap(x => [-1.3, 1.3].map(z => (
        <mesh key={`${x}:${z}`} position={[x, 1.05, z]}>
          <boxGeometry args={[0.18, 1.6, 0.18]} />
          <meshStandardMaterial color="#5A3A22" roughness={0.9} />
        </mesh>
      )))}
      {/* Paper windows (front face) */}
      {[-1.05, 0, 1.05].map(x => (
        <mesh key={x} position={[x, 1.02, 1.41]} material={windowMat}>
          <boxGeometry args={[0.72, 0.9, 0.02]} />
        </mesh>
      ))}
      {/* Window lattice */}
      {[-1.05, 0, 1.05].map(x => (
        <group key={`lat${x}`}>
          <mesh position={[x, 1.02, 1.43]}>
            <boxGeometry args={[0.04, 0.9, 0.015]} />
            <meshStandardMaterial color="#4A3020" roughness={1} />
          </mesh>
          <mesh position={[x, 1.02, 1.43]}>
            <boxGeometry args={[0.72, 0.04, 0.015]} />
            <meshStandardMaterial color="#4A3020" roughness={1} />
          </mesh>
        </group>
      ))}
      {/* Roof */}
      <mesh geometry={roofGeo} position={[0, 1.78, 0]}>
        <meshStandardMaterial color={roofColor} roughness={0.85} />
      </mesh>
      {/* Ridge cap */}
      <mesh position={[0, 2.92, 0]}>
        <boxGeometry args={[4.7, 0.12, 0.28]} />
        <meshStandardMaterial color="#22252B" roughness={0.85} />
      </mesh>
    </group>
  )
}

export function HanokPreview() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 4, 3]} intensity={0.9} />
      <group scale={0.42} position={[0, -0.68, 0]} rotation={[0.06, 0.35, 0]}>
        <Hanok windowsLit />
      </group>
    </>
  )
}
