/**
 * Fireworks over the valley — 불꽃놀이.
 *
 * A shell is three things in sequence and they all live in one buffer: a
 * rising ember with a short trail, a hard white flash at the apex, and a
 * sphere of sparks that fly out, slow in air and fall. Everything is a glow
 * sprite in a single `points`, so a sky full of them is one draw call.
 *
 * Deterministic: launches, colours and spark directions are all built from a
 * seeded LCG at mount, then evaluated as a pure function of the clock. Nothing
 * accumulates frame to frame, so the scene scrubs and freezes like the rest of
 * the film and renders identically in every Remotion tab.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getAnimTime } from '../../hooks/useAnimTime'
import { seededRandom } from '../act8_55/world'
import { makeGlowMaterial, updateGlowScale } from '../act8_55/glow'

/** Sparks per shell. */
const SPARKS = 104
/** Trail samples drawn behind a rising shell. */
const TRAIL = 5

const BURST_COLORS = [
  '#FFD9A0', '#FF9E5E', '#FFE9C4', '#9FD8FF', '#E5A8FF',
  '#FFC46B', '#B8FFD0', '#FF8FA3',
]

type Shell = {
  t0: number
  /** Ground launch point and apex. */
  x: number; z: number
  apexX: number; apexY: number; apexZ: number
  rise: number
  life: number
  color: THREE.Color
  /** Secondary colour a fraction of the sparks burn instead. */
  color2: THREE.Color
  spread: number
  seed: number
}

function smooth01(x: number): number {
  const c = Math.min(1, Math.max(0, x))
  return c * c * (3 - 2 * c)
}

export function Fireworks({ count = 15, duration = 14 }: { count?: number; duration?: number }) {
  const ref = useRef<THREE.Points>(null)
  const material = useMemo(() => makeGlowMaterial({ depthTest: true }), [])

  const { shells, dirs, jitter, buffers, N } = useMemo(() => {
    const rand = seededRandom(770301)
    const shells: Shell[] = []
    for (let i = 0; i < count; i++) {
      // Evenly spaced with a jitter, then squeezed toward the end: the last
      // third goes up at roughly double the rate. A display that thins out is
      // a display that has stopped.
      const u = i / count
      const packed = u < 0.62 ? u : 0.62 + (u - 0.62) * 0.72
      const t0 = 0.55 + packed * (duration - 1.9) + rand() * 0.45
      const side = rand() > 0.5 ? 1 : -1
      // Fired from the paddies either side of the market, and deliberately LOW
      // and NEAR: village z −22…−32 is Act B world −480…−280, the last clear
      // stretch of valley floor before the first ridge band's fill-hills start
      // at −258. They used to go up from −13…−37 and burst at eleven to twenty
      // units, which in this valley is four hundred units up inside a mountain —
      // `depthTest` then quietly ate every shell in the display.
      //
      // Low bursts close to the lens also put them at the 16–19° the camera
      // actually tilts to. A shell at a "proper" firework height out here would
      // sit at forty-seven degrees, i.e. above the top of the frame.
      const x = side * (3 + rand() * 9)
      const z = -22 - rand() * 10
      shells.push({
        t0,
        x, z,
        apexX: x + (rand() - 0.5) * 5,
        apexY: 7 + rand() * 5,
        apexZ: z + (rand() - 0.5) * 5,
        rise: 1.1 + rand() * 0.5,
        life: 2.7 + rand() * 1.6,
        color: new THREE.Color(BURST_COLORS[Math.floor(rand() * BURST_COLORS.length)]),
        color2: new THREE.Color(BURST_COLORS[Math.floor(rand() * BURST_COLORS.length)]),
        spread: 10 + rand() * 9,
        seed: rand(),
      })
    }

    // Spark directions on a sphere, area-uniform, with a per-spark speed
    // spread so the shell reads as a ball of embers rather than a wire frame.
    const dirs = new Float32Array(count * SPARKS * 3)
    const jitter = new Float32Array(count * SPARKS * 2) // speed, lifetime scale
    for (let s = 0; s < count; s++) {
      for (let p = 0; p < SPARKS; p++) {
        const y = 1 - 2 * ((p + 0.5) / SPARKS)
        const r = Math.sqrt(Math.max(0, 1 - y * y))
        // Golden-angle spiral: even coverage without clumping at the poles.
        const th = p * 2.399963
        const k = (s * SPARKS + p) * 3
        dirs[k] = Math.cos(th) * r
        dirs[k + 1] = y
        dirs[k + 2] = Math.sin(th) * r
        const j = (s * SPARKS + p) * 2
        jitter[j] = 0.62 + ((p * 37 + s * 11) % 23) / 23 * 0.55
        jitter[j + 1] = 0.7 + ((p * 53 + s * 7) % 19) / 19 * 0.6
      }
    }

    const N = count * (SPARKS + TRAIL + 1)
    const buffers = {
      positions: new Float32Array(N * 3),
      colors: new Float32Array(N * 3),
      sizes: new Float32Array(N),
      alphas: new Float32Array(N),
      phases: new Float32Array(N),
    }
    for (let i = 0; i < N; i++) {
      buffers.phases[i] = (i * 0.618) % (Math.PI * 2)
      buffers.positions[i * 3 + 1] = -50
    }
    return { shells, dirs, jitter, buffers, N }
  }, [count, duration])

  useFrame(({ camera, size, gl }) => {
    const pts = ref.current
    if (!pts) return
    const t = getAnimTime()
    updateGlowScale(material, camera, size.height * gl.getPixelRatio(), t)

    const g = pts.geometry
    const pos = (g.getAttribute('position') as THREE.BufferAttribute).array as Float32Array
    const col = (g.getAttribute('aColor') as THREE.BufferAttribute).array as Float32Array
    const siz = (g.getAttribute('aSize') as THREE.BufferAttribute).array as Float32Array
    const alp = (g.getAttribute('aAlpha') as THREE.BufferAttribute).array as Float32Array
    const per = SPARKS + TRAIL + 1

    for (let s = 0; s < shells.length; s++) {
      const sh = shells[s]
      const base = s * per
      const dt = t - sh.t0
      const burstAt = sh.rise

      // ── Rising ember + trail ──────────────────────────────────────
      for (let q = 0; q < TRAIL + 1; q++) {
        const i = base + q
        // The trail is the shell's own position a moment ago, which is what a
        // real trail is — no separate simulation, and it scrubs backwards.
        const lag = q * 0.055
        const rq = (dt - lag) / burstAt
        const live = dt >= 0 && rq > 0 && rq < 1
        if (!live) {
          alp[i] = 0
          pos[i * 3 + 1] = -50
          continue
        }
        // Decelerating climb — the shell is coasting by the time it bursts.
        const e = 1 - Math.pow(1 - rq, 2)
        pos[i * 3] = sh.x + (sh.apexX - sh.x) * e
        pos[i * 3 + 1] = 0.4 + (sh.apexY - 0.4) * e
        pos[i * 3 + 2] = sh.z + (sh.apexZ - sh.z) * e
        col[i * 3] = 1.0; col[i * 3 + 1] = 0.82; col[i * 3 + 2] = 0.55
        const fade = 1 - q / (TRAIL + 1)
        siz[i] = (0.42 - q * 0.055) * (0.6 + 0.4 * rq)
        alp[i] = 0.85 * fade * fade * smooth01(rq * 6)
      }

      // ── The burst ─────────────────────────────────────────────────
      const bt = dt - burstAt
      for (let p = 0; p < SPARKS; p++) {
        const i = base + TRAIL + 1 + p
        const j = (s * SPARKS + p) * 2
        const life = sh.life * jitter[j + 1]
        if (bt < 0 || bt > life) {
          alp[i] = 0
          pos[i * 3 + 1] = -50
          continue
        }
        const k = (s * SPARKS + p) * 3
        const speed = sh.spread * jitter[j]
        // Air drag: distance is the integral of an exponentially decaying
        // velocity, so sparks shoot out and coast to a stop instead of
        // travelling in straight lines forever.
        const drag = 1.35
        const d = (speed / drag) * (1 - Math.exp(-drag * bt))
        const gravity = 2.0 * bt * bt
        pos[i * 3] = sh.apexX + dirs[k] * d
        pos[i * 3 + 1] = sh.apexY + dirs[k + 1] * d - gravity
        pos[i * 3 + 2] = sh.apexZ + dirs[k + 2] * d

        const u = bt / life
        // A sprinkle of the sparks burn the second colour — that two-tone
        // break is most of what makes a burst read as a firework.
        const c = (p % 5 === 0) ? sh.color2 : sh.color
        // White-hot at the instant of the burst, settling into its colour.
        const hot = Math.exp(-bt * 5.5)
        col[i * 3] = c.r + (1 - c.r) * hot
        col[i * 3 + 1] = c.g + (1 - c.g) * hot
        col[i * 3 + 2] = c.b + (1 - c.b) * hot
        siz[i] = (0.3 + 0.62 * hot) * (1 - 0.45 * u)
        // Crackle: the tail of a spark flickers as it dies.
        const crackle = 1 + 0.45 * Math.sin(bt * (34 + (p % 13)) + p)
        alp[i] = Math.pow(1 - u, 1.7) * (0.55 + 0.45 * hot) * crackle
      }
    }

    ;(g.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
    ;(g.getAttribute('aColor') as THREE.BufferAttribute).needsUpdate = true
    ;(g.getAttribute('aSize') as THREE.BufferAttribute).needsUpdate = true
    ;(g.getAttribute('aAlpha') as THREE.BufferAttribute).needsUpdate = true
  })

  return (
    <>
      <points ref={ref} material={material} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[buffers.positions, 3]} />
          <bufferAttribute attach="attributes-aColor" args={[buffers.colors, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[buffers.sizes, 1]} />
          <bufferAttribute attach="attributes-aAlpha" args={[buffers.alphas, 1]} />
          <bufferAttribute attach="attributes-aPhase" args={[buffers.phases, 1]} />
        </bufferGeometry>
      </points>
      <BurstLights shells={shells} />
      {/* N is derived, not asserted — keep it referenced so a future change to
          the buffer layout can't silently desync the two. */}
      <group userData={{ pointCount: N }} />
    </>
  )
}

/**
 * Three real lights, recycled across every shell: whichever bursts are
 * currently brightest get one. A firework that doesn't light the ground it is
 * over reads as a decal pasted on the sky, and this is a scene about a valley
 * full of people looking up at them.
 */
function BurstLights({ shells }: { shells: Shell[] }) {
  const lights = useRef<(THREE.PointLight | null)[]>([])

  useFrame(() => {
    const t = getAnimTime()
    // Rank the live bursts by brightness, take the top three.
    const live: { i: number; v: number }[] = []
    for (let s = 0; s < shells.length; s++) {
      const bt = t - shells[s].t0 - shells[s].rise
      if (bt < 0 || bt > 1.6) continue
      live.push({ i: s, v: Math.exp(-bt * 2.4) })
    }
    live.sort((a, b) => b.v - a.v)
    for (let n = 0; n < 3; n++) {
      const l = lights.current[n]
      if (!l) continue
      const e = live[n]
      if (!e) { l.intensity = 0; continue }
      const sh = shells[e.i]
      l.position.set(sh.apexX, sh.apexY, sh.apexZ)
      l.color.copy(sh.color)
      l.intensity = e.v * 260
    }
  })

  return (
    <>
      {[0, 1, 2].map(n => (
        <pointLight
          key={n}
          ref={el => { lights.current[n] = el }}
          intensity={0} distance={95} decay={1.5}
        />
      ))}
    </>
  )
}
