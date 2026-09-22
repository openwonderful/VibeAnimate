import { useMemo } from 'react'

/**
 * Stone wall with chalk hash marks — the "wall measure" motif used in
 * Act 4 yard vignettes. Hash marks accumulate from bottom (early in
 * the child's life) toward the top (grown). Pass markCount + maxMarkHeight
 * to advance the motif across beats.
 *
 *   4.3 (Persimmon Lift): markCount=2, maxMarkHeight=0.7
 *   4.7 (Persimmon Hand-down): markCount=8, maxMarkHeight=1.85
 */
export function StoneWall({
  position = [0, 0, 0],
  markCount = 3,
  maxMarkHeight = 1.0,
  length = 3.0,
  height = 1.2,
}: {
  position?: [number, number, number]
  markCount?: number
  maxMarkHeight?: number
  length?: number
  height?: number
}) {
  // Random-ish stone pattern (seeded so it doesn't reshuffle on re-render).
  const stones = useMemo(() => {
    const result: { x: number; y: number; w: number; h: number; tilt: number }[] = []
    let seed = 7
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }
    let y = 0.04
    while (y < height) {
      const rowH = 0.18 + rand() * 0.08
      let x = -length / 2
      while (x < length / 2) {
        const w = 0.22 + rand() * 0.18
        result.push({
          x: x + w / 2,
          y: y + rowH / 2,
          w,
          h: rowH,
          tilt: (rand() - 0.5) * 0.08,
        })
        x += w + 0.02
      }
      y += rowH + 0.02
    }
    return result
  }, [length, height])

  // Hash marks — short horizontal chalk dashes climbing up the wall.
  const marks = useMemo(() => {
    const list: { y: number }[] = []
    for (let i = 0; i < markCount; i++) {
      const t = markCount > 1 ? i / (markCount - 1) : 0
      list.push({ y: 0.25 + t * (maxMarkHeight - 0.25) })
    }
    return list
  }, [markCount, maxMarkHeight])

  return (
    <group position={position}>
      {stones.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, 0]} rotation={[0, 0, s.tilt]} receiveShadow>
          <boxGeometry args={[s.w, s.h, 0.22]} />
          <meshStandardMaterial color={`hsl(28, 8%, ${28 + (i % 5) * 4}%)`} roughness={0.95} />
        </mesh>
      ))}
      {/* Top capstone */}
      <mesh position={[0, height + 0.06, 0]} receiveShadow>
        <boxGeometry args={[length + 0.12, 0.12, 0.28]} />
        <meshStandardMaterial color="#3A332A" roughness={0.95} />
      </mesh>
      {/* Hash marks — bright chalk against dark stone */}
      {marks.map((m, i) => (
        <mesh key={`mark-${i}`} position={[length / 2 - 0.35, m.y, 0.13]}>
          <boxGeometry args={[0.18, 0.025, 0.01]} />
          <meshBasicMaterial color="#F5E6C8" toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}
