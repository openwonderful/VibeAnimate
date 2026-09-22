/**
 * env.persimmonTree — the persimmon tree: crooked trunk built from
 * stacked leaning segments, foliage cloud, and glowing orange fruit.
 * `season` morphs it: 'summer' full green, 'autumn' sparse + fruit,
 * 'winter' bare branches with a few stubborn persimmons.
 */
import { useMemo } from 'react'
import { seededRandom } from '../../utils/svgHelpers'

export type PersimmonTreeProps = {
  position?: [number, number, number]
  scale?: number
  seed?: number
  season?: 'summer' | 'autumn' | 'winter'
}

export function PersimmonTree({
  position = [0, 0, 0],
  scale = 1,
  seed = 7,
  season = 'autumn',
}: PersimmonTreeProps) {
  const { trunkSegs, leaves, fruit } = useMemo(() => {
    const rnd = seededRandom(seed)
    const trunkSegs: { pos: [number, number, number]; rot: number; len: number; r: number }[] = []
    let x = 0, y = 0, lean = 0
    for (let i = 0; i < 5; i++) {
      const len = 0.55 - i * 0.06
      lean += (rnd() - 0.45) * 0.5
      trunkSegs.push({ pos: [x, y + len / 2, 0], rot: lean * 0.55, len, r: 0.11 - i * 0.016 })
      x += Math.sin(lean * 0.55) * len
      y += Math.cos(lean * 0.55) * len
    }
    const crown: [number, number, number] = [x, y + 0.25, 0]
    const leafCount = season === 'summer' ? 9 : season === 'autumn' ? 6 : 0
    const leaves = Array.from({ length: leafCount }, () => ({
      pos: [
        crown[0] + (rnd() - 0.5) * 1.7,
        crown[1] + (rnd() - 0.3) * 0.9,
        crown[2] + (rnd() - 0.5) * 1.4,
      ] as [number, number, number],
      r: 0.34 + rnd() * 0.3,
    }))
    const fruitCount = season === 'summer' ? 0 : season === 'autumn' ? 7 : 3
    const fruit = Array.from({ length: fruitCount }, () => ({
      pos: [
        crown[0] + (rnd() - 0.5) * 1.5,
        crown[1] + (rnd() - 0.4) * 0.8,
        crown[2] + (rnd() - 0.5) * 1.2,
      ] as [number, number, number],
    }))
    return { trunkSegs, leaves, fruit }
  }, [seed, season])

  const leafColor = season === 'summer' ? '#4A7A3E' : '#8A6A2E'

  return (
    <group position={position} scale={scale}>
      {trunkSegs.map((s, i) => (
        <mesh key={i} position={s.pos} rotation={[0, 0, s.rot]}>
          <cylinderGeometry args={[s.r * 0.82, s.r, s.len * 1.15, 7]} />
          <meshStandardMaterial color="#4E3625" roughness={1} />
        </mesh>
      ))}
      {leaves.map((l, i) => (
        <mesh key={`l${i}`} position={l.pos}>
          <sphereGeometry args={[l.r, 10, 8]} />
          <meshStandardMaterial color={leafColor} roughness={1} flatShading />
        </mesh>
      ))}
      {fruit.map((f, i) => (
        <mesh key={`f${i}`} position={f.pos}>
          <sphereGeometry args={[0.09, 10, 8]} />
          <meshStandardMaterial
            color="#E8762E"
            emissive="#C24E10"
            emissiveIntensity={0.5}
            roughness={0.6}
          />
        </mesh>
      ))}
    </group>
  )
}

export function PersimmonTreePreview() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 4, 2]} intensity={0.9} />
      <group scale={0.5} position={[0, -0.95, 0]}>
        <PersimmonTree season="autumn" />
      </group>
    </>
  )
}
