import { seededRandom } from '../../utils/svgHelpers'

/**
 * 3D Stadium zone — atmospheric purple glow and ARMY bomb dots.
 * Provides ambient lighting during the approach gap (t=15.5-17s)
 * before the clip-path rectangle reveals Scene 2.
 */

const rand = seededRandom(333)

// ARMY bomb dots — floating purple atmosphere
const armyDots = Array.from({ length: 60 }, (_, i) => {
  const side = i < 30 ? -1 : 1
  return {
    x: side * (6.5 + rand() * 1),
    y: -5 + rand() * 10,
    z: -1 + rand() * 2,
    color: rand() < 0.5 ? '#A855F7' : '#818CF8',
    size: 0.04 + rand() * 0.04,
  }
})

export default function StadiumFrame3D() {
  // Stadium zone at end of corridor — atmospheric glow only (no solid geometry)
  const Z = 69.4

  return (
    <group position={[0, 0, Z]}>
      {/* Entrance glow spilling out toward approaching camera */}
      <pointLight position={[0, -1, -1.5]} color="#7B2FBE" intensity={3} distance={8} />
      <pointLight position={[0, 2, -1.5]} color="#9B59B6" intensity={2} distance={6} />

      {/* Interior ambient purple — creates atmospheric glow in the gap */}
      <pointLight position={[0, 0, 0.3]} color="#7B2FBE" intensity={5} distance={12} />
      <pointLight position={[0, -4, 0]} color="#9B59B6" intensity={2} distance={8} />

      {/* ARMY bomb dots — subtle purple atmosphere preview */}
      {armyDots.map((dot, i) => (
        <mesh key={`ab-${i}`} position={[dot.x, dot.y, dot.z]}>
          <sphereGeometry args={[dot.size, 6, 6]} />
          <meshBasicMaterial color={dot.color} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}
