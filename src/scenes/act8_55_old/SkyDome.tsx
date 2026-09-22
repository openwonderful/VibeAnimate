/**
 * Act 8.5 sky — gradient night dome, ancient background stars, the moon,
 * and the soft nebula bed the Milky-Way river of souls settles into.
 * Everything here ignores scene fog (it IS the far distance).
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getAnimTime } from '../../hooks/useAnimTime'
import { MOON_COLOR, SKY_CENTER, T_DROP } from './constants'
import { bandPoint, dir } from './sky'
import { seededRandom } from './world'
import { makeGlowMaterial, setGlowGlobal, updateGlowScale } from './glow'

function smooth01(x: number): number {
  const c = Math.min(1, Math.max(0, x))
  return c * c * (3 - 2 * c)
}

/* ── Gradient dome ───────────────────────────────────────────────── */

/** The 8.55 night sky — the values every dusk lerp has to land on. */
export const NIGHT_TOP = '#01030A'
export const NIGHT_HORIZON = '#0B1526'
export const NIGHT_HAZE = '#16233C'
/** Act 7's sunset end of the same lerp. */
export const DUSK_TOP = '#1E2450'
export const DUSK_HORIZON = '#E0834A'
export const DUSK_HAZE = '#FFB070'

function Dome({ duskAt, tOff }: { duskAt?: (t: number) => number; tOff: number }) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTop: { value: new THREE.Color(NIGHT_TOP) },
      uHorizon: { value: new THREE.Color(NIGHT_HORIZON) },
      uHaze: { value: new THREE.Color(NIGHT_HAZE) },
    },
    vertexShader: /* glsl */ `
      varying float vY;
      void main() {
        vY = normalize(position).y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop;
      uniform vec3 uHorizon;
      uniform vec3 uHaze;
      varying float vY;
      void main() {
        float k = pow(clamp(vY, 0.0, 1.0), 0.5);
        vec3 col = mix(uHorizon, uTop, k);
        col += uHaze * exp(-abs(vY) / 0.055) * 0.55;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  }), [])

  // Dusk is a per-frame lerp away from the night values, so dusk=0 leaves the
  // uniforms bit-identical to what 8.55 has always rendered.
  const ramp = useMemo(() => ({
    top: [new THREE.Color(NIGHT_TOP), new THREE.Color(DUSK_TOP)] as const,
    horizon: [new THREE.Color(NIGHT_HORIZON), new THREE.Color(DUSK_HORIZON)] as const,
    haze: [new THREE.Color(NIGHT_HAZE), new THREE.Color(DUSK_HAZE)] as const,
  }), [])

  useFrame(() => {
    if (!duskAt) return
    const k = duskAt(getAnimTime() + tOff)
    const u = material.uniforms
    ;(u.uTop.value as THREE.Color).copy(ramp.top[0]).lerp(ramp.top[1], k)
    ;(u.uHorizon.value as THREE.Color).copy(ramp.horizon[0]).lerp(ramp.horizon[1], k)
    ;(u.uHaze.value as THREE.Color).copy(ramp.haze[0]).lerp(ramp.haze[1], k)
  })

  return (
    <mesh position={SKY_CENTER} renderOrder={-10} material={material} frustumCulled={false}>
      <sphereGeometry args={[142, 48, 24]} />
    </mesh>
  )
}

/* ── Ancient background stars ────────────────────────────────────── */

function BackgroundStars({ count = 950, duskAt, tOff }: { count?: number; duskAt?: (t: number) => number; tOff: number }) {
  const material = useMemo(() => makeGlowMaterial({ depthTest: true }), [])

  const { positions, colors, sizes, alphas, phases } = useMemo(() => {
    const rand = seededRandom(90210)
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const alphas = new Float32Array(count)
    const phases = new Float32Array(count)
    const c = new THREE.Color()
    const tints = ['#E8E4D8', '#D8DCE8', '#E8D8C0', '#C8D4E8', '#F0ECE0']
    for (let i = 0; i < count; i++) {
      const az = rand() * 360
      const elev = 2 + Math.pow(rand(), 0.75) * 86
      const d = dir(az, elev)
      const r = 118 + rand() * 14
      positions[i * 3] = SKY_CENTER[0] + d[0] * r
      positions[i * 3 + 1] = SKY_CENTER[1] + d[1] * r
      positions[i * 3 + 2] = SKY_CENTER[2] + d[2] * r
      c.set(tints[Math.floor(rand() * tints.length)])
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b
      sizes[i] = 0.45 + Math.pow(rand(), 2.4) * 1.5
      alphas[i] = 0.22 + rand() * 0.42
      phases[i] = rand() * Math.PI * 2
    }
    return { positions, colors, sizes, alphas, phases }
  }, [count])

  useFrame(({ camera, size, gl }) => {
    const t = getAnimTime() + tOff
    updateGlowScale(material, camera, size.height * gl.getPixelRatio(), t)
    // Stars wash out in a sunset sky and come back as it deepens.
    if (duskAt) setGlowGlobal(material, 1 - duskAt(t))
  })

  return (
    <points material={material} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[colors, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-aAlpha" args={[alphas, 1]} />
        <bufferAttribute attach="attributes-aPhase" args={[phases, 1]} />
      </bufferGeometry>
    </points>
  )
}

/* ── The moon ────────────────────────────────────────────────────── */

function Moon({ duskAt, tOff }: { duskAt?: (t: number) => number; tOff: number }) {
  const material = useMemo(() => makeGlowMaterial({ depthTest: false }), [])
  const core = useRef<THREE.MeshBasicMaterial>(null)
  const bloom = useRef<THREE.MeshBasicMaterial>(null)
  const d = dir(46, 26)
  const base: [number, number, number] = [
    SKY_CENTER[0] + d[0] * 126, SKY_CENTER[1] + d[1] * 126, SKY_CENTER[2] + d[2] * 126,
  ]

  // Single soft radial halo via a glow sprite — no banded shells.
  const halo = useMemo(() => {
    const c = new THREE.Color('#E4D8B4')
    return {
      positions: new Float32Array([0, 0, 0]),
      colors: new Float32Array([c.r, c.g, c.b]),
      sizes: new Float32Array([26]),
      alphas: new Float32Array([0.34]),
      phases: new Float32Array([1.3]),
    }
  }, [])

  useFrame(({ camera, size, gl }) => {
    const t = getAnimTime() + tOff
    updateGlowScale(material, camera, size.height * gl.getPixelRatio(), t * 0.12)
    // The moon washes out of a sunset sky along with the stars.
    if (duskAt && core.current && bloom.current) {
      const vis = 1 - duskAt(t)
      setGlowGlobal(material, vis)
      core.current.opacity = vis
      bloom.current.opacity = 0.16 * vis
    }
  })

  return (
    <group position={base}>
      <mesh>
        <sphereGeometry args={[3.1, 32, 32]} />
        <meshBasicMaterial ref={core} color={MOON_COLOR} transparent toneMapped={false} fog={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[3.9, 24, 24]} />
        <meshBasicMaterial
          ref={bloom} color="#E8DCB8" transparent opacity={0.16} depthWrite={false}
          blending={THREE.AdditiveBlending} fog={false}
        />
      </mesh>
      <points material={material} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[halo.positions, 3]} />
          <bufferAttribute attach="attributes-aColor" args={[halo.colors, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[halo.sizes, 1]} />
          <bufferAttribute attach="attributes-aAlpha" args={[halo.alphas, 1]} />
          <bufferAttribute attach="attributes-aPhase" args={[halo.phases, 1]} />
        </bufferGeometry>
      </points>
    </group>
  )
}

/* ── Nebula bed under the river of souls ─────────────────────────── */

function NebulaBand({ count = 130, tOff }: { count?: number; tOff: number }) {
  const material = useMemo(() => makeGlowMaterial({ depthTest: true }), [])

  const { positions, colors, sizes, alphas, phases } = useMemo(() => {
    const rand = seededRandom(5150)
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const alphas = new Float32Array(count)
    const phases = new Float32Array(count)
    const c = new THREE.Color()
    const tints = ['#2A3352', '#383052', '#443B2E', '#2E3B52']
    for (let i = 0; i < count; i++) {
      const s = rand()
      const off = (rand() + rand() - 1) * 0.05
      const p = bandPoint(s, off, 108)
      positions[i * 3] = p[0]; positions[i * 3 + 1] = p[1]; positions[i * 3 + 2] = p[2]
      c.set(tints[Math.floor(rand() * tints.length)])
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b
      sizes[i] = 10 + rand() * 11
      alphas[i] = 0.04 + rand() * 0.05
      phases[i] = rand() * Math.PI * 2
    }
    return { positions, colors, sizes, alphas, phases }
  }, [count])

  useFrame(({ camera, size, gl }) => {
    const t = getAnimTime() + tOff
    updateGlowScale(material, camera, size.height * gl.getPixelRatio(), t)
    // The river bed reveals itself as the souls rise into it.
    setGlowGlobal(material, smooth01((t - (T_DROP + 2)) / 8))
  })

  return (
    <points material={material} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[colors, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-aAlpha" args={[alphas, 1]} />
        <bufferAttribute attach="attributes-aPhase" args={[phases, 1]} />
      </bufferGeometry>
    </points>
  )
}

/**
 * `timeOffset` shifts everything time-driven here, so a scene that runs
 * *before* this one (Act 7) can render the same sky and have its final frame
 * arrive at exactly this sky's t=0. `duskAt` dials the dome from night toward
 * sunset and washes out the stars and moon; omit both and nothing changes.
 */
export function SkyDome({
  timeOffset = 0,
  duskAt,
}: { timeOffset?: number; duskAt?: (t: number) => number } = {}) {
  return (
    <group>
      <Dome duskAt={duskAt} tOff={timeOffset} />
      <BackgroundStars duskAt={duskAt} tOff={timeOffset} />
      <Moon duskAt={duskAt} tOff={timeOffset} />
      <NebulaBand tOff={timeOffset} />
    </group>
  )
}
