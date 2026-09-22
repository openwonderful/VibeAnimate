import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getAnimTime } from '../../hooks/useAnimTime'

/**
 * WaterSurface — a rippling paddy, built from a procedural normal map.
 *
 * A flat mirror plane reads as polished plastic: the sky reflection is
 * perfect, so the eye gets no cue that the surface is liquid. Real still
 * water is a mirror *broken up* by a slow breeze, and that break-up is
 * almost entirely a normal-map effect — the geometry stays flat.
 *
 * The map is generated here rather than loaded: tileable value noise summed
 * over a few octaves, differentiated into a normal field, encoded to RGB.
 * Two copies are scrolled across each other at different speeds and scales,
 * which is the standard trick for stopping a single scrolling layer from
 * reading as a conveyor belt — three.js gives `normalMap` and `roughnessMap`
 * independent transforms, so one carries the ripple and the other carries a
 * slow wander in glossiness, and the interference between them is what sells
 * it as moving water.
 */

const TEX = 256

/** Hash-based value noise on a wrapping lattice, so the texture tiles. */
function makeNoise(seed: number) {
  const hash = (x: number, y: number) => {
    // The third constant is the 64-bit golden-ratio hash prime; a double
    // can't hold it, so it is written as the value JS actually uses
    // (…963300, not …963407). Same numbers at runtime as before — spelled
    // out so it doesn't read as precision silently going missing.
    let h = x * 374761393 + y * 668265263 + seed * 1442695040888963300
    h = (h ^ (h >>> 13)) * 1274126177
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296
  }
  const smooth = (t: number) => t * t * (3 - 2 * t)
  return (x: number, y: number, period: number) => {
    const xi = Math.floor(x), yi = Math.floor(y)
    const xf = x - xi, yf = y - yi
    const wrap = (v: number) => ((v % period) + period) % period
    const x0 = wrap(xi), x1 = wrap(xi + 1)
    const y0 = wrap(yi), y1 = wrap(yi + 1)
    const u = smooth(xf), v = smooth(yf)
    const a = hash(x0, y0), b = hash(x1, y0)
    const c = hash(x0, y1), d = hash(x1, y1)
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v
  }
}

/** Height field → normal map, encoded RGB, tileable. */
function makeRippleNormalMap(seed: number, strength: number): THREE.DataTexture {
  const noise = makeNoise(seed)
  const octaves = [
    { period: 4, amp: 1.0 },
    { period: 8, amp: 0.5 },
    { period: 16, amp: 0.25 },
    { period: 32, amp: 0.12 },
  ]

  const height = new Float32Array(TEX * TEX)
  for (let y = 0; y < TEX; y++) {
    for (let x = 0; x < TEX; x++) {
      let h = 0
      for (const o of octaves) {
        const s = o.period / TEX
        h += noise(x * s, y * s, o.period) * o.amp
      }
      height[y * TEX + x] = h
    }
  }

  const data = new Uint8Array(TEX * TEX * 4)
  const at = (x: number, y: number) =>
    height[((y + TEX) % TEX) * TEX + ((x + TEX) % TEX)]

  for (let y = 0; y < TEX; y++) {
    for (let x = 0; x < TEX; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength
      const len = Math.hypot(-dx, -dy, 1)
      const i = (y * TEX + x) * 4
      data[i] = ((-dx / len) * 0.5 + 0.5) * 255
      data[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255
      data[i + 2] = (1 / len) * 0.5 * 255 + 127
      data[i + 3] = 255
    }
  }

  const tex = new THREE.DataTexture(data, TEX, TEX, THREE.RGBAFormat)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.generateMipmaps = true
  tex.needsUpdate = true
  return tex
}

export interface WaterSurfaceProps {
  width: number
  depth: number
  /** Base tint. Mostly overridden by what the surface reflects. */
  color?: string
  /** Lower = glassier. Paddy water at dusk sits around 0.10–0.18. */
  roughness?: number
  metalness?: number
  envMapIntensity?: number
  opacity?: number
  /** Ripple depth. Keep small — this is a still field, not open sea. */
  normalScale?: number
  /** World units per tile of ripple. */
  rippleScale?: number
  /** Drift speed multiplier. */
  speed?: number
  seed?: number
}

export default function WaterSurface({
  width,
  depth,
  color = '#6E6A62',
  roughness = 0.13,
  metalness = 0.95,
  envMapIntensity = 2.6,
  opacity = 0.92,
  normalScale = 0.13,
  rippleScale = 2.4,
  speed = 1,
  seed = 1,
}: WaterSurfaceProps) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null)

  const normalMap = useMemo(() => makeRippleNormalMap(seed, 26), [seed])
  // Second copy for the roughness wander — same field, different seed, so
  // the two never line up and the surface never looks like it is sliding.
  const roughnessMap = useMemo(() => makeRippleNormalMap(seed + 977, 12), [seed])

  const repeatX = Math.max(1, width / rippleScale)
  const repeatY = Math.max(1, depth / rippleScale)

  useFrame(() => {
    const m = matRef.current
    if (!m) return
    const t = getAnimTime() * speed
    if (m.normalMap) {
      m.normalMap.repeat.set(repeatX, repeatY)
      m.normalMap.offset.set(t * 0.010, t * 0.016)
    }
    if (m.roughnessMap) {
      m.roughnessMap.repeat.set(repeatX * 0.55, repeatY * 0.55)
      m.roughnessMap.offset.set(-t * 0.007, t * 0.005)
    }
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial
        ref={matRef}
        color={color}
        roughness={roughness}
        metalness={metalness}
        envMapIntensity={envMapIntensity}
        transparent
        opacity={opacity}
        normalMap={normalMap}
        normalScale={new THREE.Vector2(normalScale, normalScale)}
        roughnessMap={roughnessMap}
      />
    </mesh>
  )
}
