/**
 * In the Air — `?act=8b-air`. The mix, full frame.
 *
 * Not a swatch sheet. A sky of the five chosen shapes (R6 drum, R7 청사초롱,
 * R2 풍등, A2 hexagonal, A1 square box) in amber, each at its own brightness
 * between 1.4 and 2.0, drifting up past a camera tilted into them — which is
 * the only view that answers whether the SET works. A row on a black card
 * tells you which shape you like; this tells you what four thousand of them
 * will feel like.
 *
 * Under 8b's exact background, exposure, bloom and vignette.
 *
 * `?set=tangled` swaps in the Tangled designs and palette for a side-by-side,
 * `?set=all` throws everything in at once. `?t=` freezes it; the rise is a
 * pure function of the clock, so any frame is reproducible.
 *
 * Still nothing 8b imports. When a set is chosen, `LanternCrowd` picks up
 * `MIX` / `MIX_HEX` / `mixLit` from `lanternShapes.ts` and this file stays a
 * preview.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getAnimTime } from '../../hooks/useAnimTime'
import { seededRandom } from '../act8_55/constants'
import {
  MIX, MIX_HEX, TANGLED, TANGLED_COLORS, TANGLED_MIX,
  buildLanternGeometry, makeEnvelopeMaterial, mixLit, type LanternDesign,
} from './lanternShapes'
import { LabCanvas } from './labKit'

const COUNT = 430
/** Vertical span the field wraps through. Both ends sit outside the frame. */
const Y_LOW = -16
const Y_HIGH = 34

type Item = {
  design: LanternDesign
  hex: string
  lit: number
  x: number
  z: number
  /** Starting height inside the wrap, and how fast it climbs. */
  y0: number
  speed: number
  drift: number
  driftRate: number
  scale: number
  phase: number
  rock: number
}

type SetSpec = {
  designs: LanternDesign[]
  hexAt: (r: () => number) => string
  litAt: (r: () => number) => number
}

/**
 * `set` is either a preset name or a comma-separated list of design IDs, so
 * `?set=R6` is a sky of nothing but drums and `?set=R6,R7` is those two.
 * Single-shape skies are the useful ones: a mix always looks livelier than any
 * of its members, and the question is whether a member can carry the scene on
 * its own.
 */
function pickSet(explicit?: string): SetSpec {
  const set = explicit ?? new URLSearchParams(window.location.search).get('set') ?? 'mix'
  if (set === 'tangled') {
    return {
      designs: TANGLED,
      hexAt: r => TANGLED_COLORS[TANGLED_MIX[Math.floor(r() * TANGLED_MIX.length)]].hex,
      // Rolled, not fixed at lab2's 1.15: across a whole frame one value reads
      // as a printed pattern, and the reference plates plainly have a spread.
      litAt: r => 0.95 + r() * 0.55,
    }
  }
  if (set === 'all') {
    return {
      designs: [...MIX, ...TANGLED],
      hexAt: r => (r() < 0.55 ? MIX_HEX
        : TANGLED_COLORS[TANGLED_MIX[Math.floor(r() * TANGLED_MIX.length)]].hex),
      litAt: mixLit,
    }
  }
  // A list of design IDs.
  const ids = set.split(',').map(v => v.trim().toUpperCase()).filter(Boolean)
  const pool = [...MIX, ...TANGLED]
  const picked = ids.map(id => pool.find(d => d.id === id)).filter(Boolean) as LanternDesign[]
  if (picked.length) {
    const tangledOnly = picked.every(d => d.style === 'tangled')
    return {
      designs: picked,
      hexAt: tangledOnly
        ? r => TANGLED_COLORS[TANGLED_MIX[Math.floor(r() * TANGLED_MIX.length)]].hex
        : () => MIX_HEX,
      litAt: tangledOnly ? (r: () => number) => 0.95 + r() * 0.55 : mixLit,
    }
  }
  return { designs: MIX, hexAt: () => MIX_HEX, litAt: mixLit }
}

/**
 * One lantern, rising. Position is recomputed from the clock every frame
 * rather than integrated, so the scene scrubs backwards and freezes exactly —
 * the same rule the rest of the film plays by.
 */
function Flyer({ item }: { item: Item }) {
  const ref = useRef<THREE.Group>(null)
  const geometry = useMemo(() => buildLanternGeometry(item.design), [item.design])
  const material = useMemo(
    () => makeEnvelopeMaterial(item.hex, item.lit, item.design), [item.hex, item.lit, item.design])
  const hw = item.design.hardware

  useFrame(() => {
    const g = ref.current
    if (!g) return
    const t = getAnimTime()
    const span = Y_HIGH - Y_LOW
    const y = Y_LOW + (((item.y0 - Y_LOW) + t * item.speed) % span + span) % span
    g.position.set(
      item.x + Math.sin(t * item.driftRate + item.phase) * item.drift,
      y,
      item.z,
    )
    g.rotation.set(
      Math.sin(t * 0.5 + item.phase) * item.rock,
      t * 0.12 + item.phase,
      Math.cos(t * 0.43 + item.phase * 1.3) * item.rock * 0.7,
      'YXZ',
    )
  })

  return (
    <group ref={ref} scale={item.scale}>
      <mesh geometry={geometry} material={material} />
      {hw && (
        <>
          <mesh position={[0, hw.capY, 0]}>
            <cylinderGeometry args={[hw.capR, hw.capR, hw.capH, 10]} />
            <meshBasicMaterial color="#6E4A26" toneMapped={false} />
          </mesh>
          <mesh position={[0, -hw.capY, 0]}>
            <cylinderGeometry args={[hw.capR * 0.846, hw.capR * 0.846, hw.capH, 10]} />
            <meshBasicMaterial color="#6E4A26" toneMapped={false} />
          </mesh>
          <mesh position={[0, hw.tasselY, 0]}>
            <cylinderGeometry args={[hw.tasselR, hw.tasselR, hw.tasselLen, 5]} />
            <meshBasicMaterial color="#9A7844" toneMapped={false} />
          </mesh>
        </>
      )}
    </group>
  )
}

function Sky({ set }: { set?: string }) {
  const items = useMemo(() => {
    const { designs, hexAt, litAt } = pickSet(set)
    const rand = seededRandom(60613)
    const out: Item[] = []
    for (let i = 0; i < COUNT; i++) {
      // Spread through a wedge that widens with depth, so the field fills the
      // frame instead of thinning at the edges of the far plane.
      const z = 3 - Math.pow(rand(), 0.8) * 52
      // Track the frustum: at 58° fov and this aspect the visible half-width
      // is about 1.2 × the distance, so a fixed spread leaves the far field
      // clustered up the middle with bare edges.
      const spread = 6.5 + (3 - z) * 1.05
      out.push({
        design: designs[Math.floor(rand() * designs.length)],
        hex: hexAt(rand),
        lit: litAt(rand),
        x: (rand() - 0.5) * 2 * spread,
        z,
        y0: Y_LOW + rand() * (Y_HIGH - Y_LOW),
        // A WIDE spread of climb rates — narrow, and four hundred lanterns
        // rise as one rigid sheet.
        speed: 0.35 + rand() * 1.5,
        drift: 0.3 + rand() * 1.1,
        driftRate: 0.12 + rand() * 0.3,
        scale: 0.72 + rand() * 0.75,
        phase: rand() * Math.PI * 2,
        rock: 0.04 + rand() * 0.1,
      })
    }
    // Far first, so the transparent envelopes stack back to front.
    return out.sort((a, b) => a.z - b.z)
  }, [set])

  return <group>{items.map((it, i) => <Flyer key={i} item={it} />)}</group>
}

/**
 * A ridge along the bottom. Not decoration — a sky with no ground in it has no
 * scale, and every one of these designs looks fine floating in a void. This is
 * roughly where 8b's mountains sit relative to the swarm.
 */
function Horizon() {
  const shape = useMemo(() => {
    const rand = seededRandom(515)
    const pts: THREE.Vector2[] = [new THREE.Vector2(-90, -30)]
    for (let x = -90; x <= 90; x += 5) {
      const h = 5 * Math.exp(-Math.pow((x + 34) / 20, 2))
        + 8 * Math.exp(-Math.pow((x - 4) / 16, 2))
        + 6 * Math.exp(-Math.pow((x - 46) / 22, 2)) + rand() * 0.7
      pts.push(new THREE.Vector2(x, -13 + h))
    }
    pts.push(new THREE.Vector2(90, -30))
    return new THREE.Shape(pts)
  }, [])
  return (
    <mesh geometry={useMemo(() => new THREE.ShapeGeometry(shape), [shape])} position={[0, 0, -56]}>
      <meshBasicMaterial color="#0A1020" toneMapped={false} />
    </mesh>
  )
}

/** The sky, with an optional fixed set — used by the single-shape variants. */
export function AirScene({ set, background }: { set?: string; background?: string }) {
  return (
    <LabCanvas
      camera={{ position: [0, 0.5, 9], fov: 58 }} target={[0, 9, -20]}
      background={background}
    >
      <Horizon />
      <Sky set={set} />
      <TiltUp />
    </LabCanvas>
  )
}

export default function LanternAir() {
  return <AirScene />
}

/** The camera looks up into the field and stays there. */
function TiltUp() {
  useFrame(({ camera }) => {
    const t = getAnimTime()
    camera.position.set(Math.sin(t * 0.09) * 0.6, 0.5 + Math.sin(t * 0.13) * 0.3, 9)
    camera.lookAt(0, 9.5, -20)
  })
  return null
}
