/**
 * The yard outside the hanok, shared by 4.3 (Persimmon Lift) and 4.7
 * (Persimmon Hand-down).
 *
 * Like the sickbed pair, these two beats only work if they are unmistakably
 * the *same yard* — same tree, same stone wall, same camera — so that four
 * beats later the audience recognises the reach has inverted. The geometry is
 * declared once here; the scenes supply only the light and the people.
 *
 * The stone wall carries the height log: a hash mark per year. 4.3 shows two,
 * low down. 4.7 shows eight, the top one well above the caregiver's head. It
 * states the whole passage of time without a caption.
 */

import { useMemo } from 'react'
import * as THREE from 'three'
import { rand, type V3 } from '../sets/hanok'

export const TREE_POS: V3 = [1.02, 0, -1.15]
export const WALL_Z = -2.30
export const CAMERA = {
  position: [0.20, 1.95, 4.45] as V3,
  target: [0.34, 1.40, -1.20] as V3,
  fov: 46,
}

/** Persimmon tree — bare-ish branches, fruit heavy on the low boughs. */
export function PersimmonTree({ position }: { position: V3 }) {
  const fruit = useMemo(() => {
    const r = rand(4703)
    return Array.from({ length: 16 }, () => {
      const a = r() * Math.PI * 2
      const rad = 0.35 + r() * 0.72
      return {
        p: [Math.cos(a) * rad, 1.55 + r() * 0.85, Math.sin(a) * rad * 0.7] as V3,
        s: 0.055 + r() * 0.022,
      }
    })
  }, [])

  return (
    <group position={position}>
      <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.09, 0.15, 1.7, 10]} />
        <meshStandardMaterial color="#2E2018" roughness={0.95} />
      </mesh>
      {([[-0.42, 1.85, -0.5], [0.40, 1.95, 0.42], [0.05, 2.15, -0.25]] as const).map(
        ([x, y, rot], i) => (
          <mesh key={i} position={[x, y, 0]} rotation={[0, 0, rot]} castShadow>
            <cylinderGeometry args={[0.035, 0.06, 1.1, 8]} />
            <meshStandardMaterial color="#2E2018" roughness={0.95} />
          </mesh>
        ),
      )}
      {/* Canopy — thin, so the fruit reads against the sky. */}
      <mesh position={[0, 2.05, 0]} scale={[1, 0.66, 0.85]} castShadow>
        <sphereGeometry args={[1.05, 18, 14]} />
        <meshStandardMaterial color="#2A3A1E" roughness={0.95} transparent opacity={0.86} />
      </mesh>
      {fruit.map((f, i) => (
        <mesh key={i} position={f.p} castShadow>
          <sphereGeometry args={[f.s, 12, 10]} />
          <meshStandardMaterial
            color="#D2601C" emissive="#8A2E08" emissiveIntensity={0.5} roughness={0.7}
          />
        </mesh>
      ))}
    </group>
  )
}

/**
 * The stone wall with the height log. `marks` is how many years have been
 * scratched into it — the one number that differs between the two beats.
 */
export function StoneWall({ marks }: { marks: number }) {
  const stones = useMemo(() => {
    const r = rand(919)
    const out: { p: V3; s: V3 }[] = []
    for (let row = 0; row < 5; row++) {
      let x = -3.2
      while (x < 3.2) {
        const w = 0.30 + r() * 0.26
        out.push({
          p: [x + w / 2, 0.11 + row * 0.21, (r() - 0.5) * 0.05],
          s: [w, 0.19, 0.34],
        })
        x += w + 0.015
      }
    }
    return out
  }, [])

  return (
    <group position={[0, 0, WALL_Z]}>
      {stones.map((s, i) => (
        <mesh key={i} position={s.p} scale={s.s} castShadow receiveShadow>
          <boxGeometry />
          <meshStandardMaterial color="#584A3E" roughness={0.98} />
        </mesh>
      ))}
      {/* Capstones */}
      <mesh position={[0, 1.12, 0]} castShadow>
        <boxGeometry args={[6.6, 0.11, 0.42]} />
        <meshStandardMaterial color="#463A30" roughness={0.95} />
      </mesh>

      {/* The height log. Each mark is a year; the gaps get bigger as the child
          grows faster, which is the detail that sells it as a real record. */}
      {Array.from({ length: marks }, (_, i) => {
        const y = 0.34 + i * 0.145 + i * i * 0.012
        return (
          <mesh key={i} position={[-1.62, y, 0.19]} castShadow>
            <boxGeometry args={[0.20, 0.022, 0.012]} />
            <meshStandardMaterial
              color="#D8C49A" emissive="#8A7448" emissiveIntensity={0.25} roughness={0.9}
            />
          </mesh>
        )
      })}
    </group>
  )
}

/** Smooth vertical sky gradient as a texture, memoised per colour pair. */
function useSkyGradient(top: string, low: string): THREE.Texture {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 4
    c.height = 256
    const ctx = c.getContext('2d')!
    const g = ctx.createLinearGradient(0, 0, 0, 256)
    g.addColorStop(0, top)
    g.addColorStop(0.52, top)
    g.addColorStop(0.78, low)
    g.addColorStop(1, low)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 4, 256)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.needsUpdate = true
    return tex
  }, [top, low])
}

/** Ground, the hanok's eave line behind the wall, and the far ridge. */
export function YardGround({ skyTop, skyLow }: { skyTop: string; skyLow: string }) {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#4A3A24" roughness={1} />
      </mesh>

      {/* Sky. This was four stacked planes at graded opacity, which produced
          visible hard bands straight across the frame — the exteriors were
          the weakest thing in Act 4 because of it. One plane carrying a
          canvas gradient reads as actual sky and costs less. */}
      <mesh position={[0, 8, -18]}>
        <planeGeometry args={[70, 30]} />
        <meshBasicMaterial map={useSkyGradient(skyTop, skyLow)} toneMapped={false} />
      </mesh>
      {/* Far ridge. A flat 36-unit bar read as exactly that — a bar straight
          across the frame. Overlapping wide cones give it a horizon line. */}
      <group position={[-2, 0, -15]}>
        {([[-13, 2.5, 7], [-6, 3.4, 9], [1.5, 2.9, 8], [9, 3.8, 10], [16, 2.6, 7.5]] as const)
          .map(([x, h, w], i) => (
            <mesh key={i} position={[x, h * 0.42, i % 2 ? 0 : -0.6]}>
              <coneGeometry args={[w * 0.5, h, 4]} />
              <meshBasicMaterial color={i % 2 ? '#241F33' : '#2B2540'} />
            </mesh>
          ))}
      </group>

      {/* The house's eave, just clipping the top of frame on the left. */}
      <group position={[-3.75, 0, -2.1]}>
        <mesh position={[0, 1.35, 0]} castShadow>
          <boxGeometry args={[2.6, 2.7, 2.4]} />
          <meshStandardMaterial color="#33251C" roughness={0.95} />
        </mesh>
        {/* A lit paper door, so the house has a warm eye in it. */}
        <mesh position={[1.31, 1.02, 0.45]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.82, 1.34]} />
          <meshStandardMaterial
            color="#C99A5E" emissive="#FFBC63" emissiveIntensity={0.75} roughness={1}
          />
        </mesh>
        <mesh position={[0.35, 2.82, 0]} rotation={[0, 0, -0.06]} castShadow>
          <boxGeometry args={[3.6, 0.18, 3.0]} />
          <meshStandardMaterial color="#241A14" roughness={0.9} />
        </mesh>
      </group>
    </>
  )
}
