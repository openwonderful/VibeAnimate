/**
 * Act 7.3 — "불꽃놀이" (experimental, not in the master timeline)
 *
 * The night market from inside it: the hero has stopped on Act B's road among a
 * few thousand strangers, and the valley is putting fireworks up over the
 * paddies. The camera stands at his shoulder and tilts up with him.
 *
 * A test scene, deliberately. 7.2 still cuts straight to 8.55 — this is the
 * same world and the same crowd on a held clock, to see what the festival looks
 * like when nobody is walking anywhere.
 *
 * Staged in Act B's valley like the rest of the act: `ValleyStill` at world time
 * 70 (Act B's own night, and the window its walking pair are off the road),
 * everything this scene draws inside `<Village>`, and the camera mapped out
 * through `toWorld`. Its own `SkyDome` and `Terrain` are gone — the sky the
 * shells go up into is Act B's.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { getAnimTime } from '../../hooks/useAnimTime'
import { SceneCanvas } from '../SceneCanvas'
import { useCameraHandoff } from '../DebugCamera'
import { NIGHT_BG, roadX } from '../act8_55/constants'
import { generateWorld } from '../act8_55/world'
import { Village, toWorld } from '../act8_55/locale'
import { NightMarket } from '../act8_55/NightMarket'
import { Fireflies } from '../act8_55/Crowd'
import { ValleyStill } from '../actB/still'
import { GoldFigure } from '../characters/goldFigure'
import { heroSkeleton } from '../act8_55/hero'
import { Walkers } from './Walkers'
import { Fireworks } from './Fireworks'

export const DUR = 14
/**
 * Where he has stopped: mid-market, past the banner and well short of the quiet
 * pocket. Past the banner matters — behind it, tilting up puts four square
 * metres of red cloth across the entire sky. The market now runs from village
 * z=16 down to −13 (it was −56, most of which is a mountain in this valley), so
 * "past the banner" is −9 rather than −10.
 */
const WATCH_Z = -9
const WATCH_X = roadX(WATCH_Z)

/**
 * Crowd clock. 8.55's shared components take a `timeOffset`; the crowd takes an
 * act offset. 16 puts the market at its brightest and the drift in full swing —
 * and `settle={false}` keeps it there for the whole shot instead of draining
 * toward a handoff this scene doesn't have.
 */
const ACT_OFF = 16
const T_OFF = -15

type Key = { t: number; pos: [number, number, number]; tgt: [number, number, number]; fov: number }

/**
 * He is looking at the stalls, then something goes up and he follows it. The
 * camera is over his right shoulder the whole way and barely moves — the shot
 * is the tilt, not a move.
 *
 * The tilt stops well short of the zenith on purpose. Aimed at the bursts
 * themselves the frame is a black rectangle with confetti in one corner; held
 * at ~25° the market and the heads of the crowd stay along the bottom edge and
 * the fireworks are over SOMETHING.
 */
const KEYS: Key[] = [
  { t: 0, pos: [WATCH_X + 1.55, 1.78, WATCH_Z + 3.4], tgt: [WATCH_X - 0.5, 1.35, WATCH_Z - 9], fov: 48 },
  { t: 3.2, pos: [WATCH_X + 1.5, 1.74, WATCH_Z + 3.2], tgt: [WATCH_X - 0.7, 3.8, WATCH_Z - 13], fov: 50 },
  { t: 7.0, pos: [WATCH_X + 1.35, 1.66, WATCH_Z + 3.0], tgt: [WATCH_X - 0.9, 7.4, WATCH_Z - 17], fov: 55 },
  { t: 11.0, pos: [WATCH_X + 1.1, 1.6, WATCH_Z + 2.8], tgt: [WATCH_X - 1.1, 9.4, WATCH_Z - 20], fov: 58 },
  { t: 14.0, pos: [WATCH_X + 0.9, 1.58, WATCH_Z + 2.7], tgt: [WATCH_X - 1.3, 10.4, WATCH_Z - 22], fov: 60 },
]

/** Act B's own night — see `Act8_55` for why 70, and why it barely moves. */
const NIGHT = 70
const worldClock = (t: number) => NIGHT + t * 0.1

/** Cubic Hermite with finite-difference tangents — the rig every scene uses. */
function sample(t: number, out: { pos: THREE.Vector3; tgt: THREE.Vector3; fov: number }) {
  const n = KEYS.length
  const tc = Math.min(Math.max(t, KEYS[0].t), KEYS[n - 1].t - 1e-4)
  let i = 0
  while (i < n - 2 && tc >= KEYS[i + 1].t) i++
  const a = KEYS[i]
  const b = KEYS[i + 1]
  const dt = b.t - a.t
  const s = (tc - a.t) / dt
  const h00 = (1 + 2 * s) * (1 - s) * (1 - s)
  const h10 = s * (1 - s) * (1 - s)
  const h01 = s * s * (3 - 2 * s)
  const h11 = s * s * (s - 1)
  const tan = (k: number, get: (key: Key) => number) => {
    const p = KEYS[Math.max(0, k - 1)]
    const q = KEYS[Math.min(n - 1, k + 1)]
    return (get(q) - get(p)) / (q.t - p.t)
  }
  const smp = (get: (key: Key) => number) =>
    h00 * get(a) + h10 * dt * tan(i, get) + h01 * get(b) + h11 * dt * tan(i + 1, get)
  out.pos.set(smp(k => k.pos[0]), smp(k => k.pos[1]), smp(k => k.pos[2]))
  out.tgt.set(smp(k => k.tgt[0]), smp(k => k.tgt[1]), smp(k => k.tgt[2]))
  out.fov = smp(k => k.fov)
}

function Rig() {
  const yieldCamera = useCameraHandoff()
  const state = useRef({ pos: new THREE.Vector3(), tgt: new THREE.Vector3(), fov: 48 })
  const world = useRef({ pos: new THREE.Vector3(), tgt: new THREE.Vector3() })

  useFrame(({ camera }) => {
    if (yieldCamera()) return
    const t = getAnimTime()
    const s = state.current
    sample(t, s)
    s.pos.x += Math.sin(t * 0.6) * 0.014
    s.pos.y += Math.sin(t * 0.83) * 0.011
    const w = world.current
    // Authored in village units; Act B's valley is 20× that. The camera cannot
    // ride inside `<Village>` — a camera in a scaled group has its near plane,
    // far plane and fov scaled with it.
    w.pos.set(...toWorld(s.pos.x, s.pos.y, s.pos.z))
    w.tgt.set(...toWorld(s.tgt.x, s.tgt.y, s.tgt.z))
    camera.position.copy(w.pos)
    camera.lookAt(w.tgt)
    const cam = camera as THREE.PerspectiveCamera
    if (Math.abs(cam.fov - s.fov) > 1e-3) {
      cam.fov = s.fov
      cam.updateProjectionMatrix()
    }
  })
  return null
}

/** The hero, standing still and dark, chin coming up as the camera tilts. */
function Watcher() {
  const body = useRef<THREE.Group>(null)
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#C79A5E', emissive: '#F0CE7E', emissiveIntensity: 0, roughness: 0.4, toneMapped: false,
  }), [])
  const standing = useMemo(() => () => heroSkeleton(0, 0), [])

  useFrame(() => {
    const t = getAnimTime()
    // He follows the shells up. Tracks the camera's tilt rather than leading
    // it — you notice him looking up a beat after you already are.
    const up = Math.min(1, Math.max(0, (t - 3.6) / 4.5))
    if (body.current) body.current.rotation.x = -0.42 * (up * up * (3 - 2 * up))
  })

  return (
    <group position={[WATCH_X, 0, WATCH_Z]} rotation={[0, Math.PI, 0]}>
      <group ref={body}>
        <GoldFigure skeleton={standing} material={material} inPlace />
      </group>
    </group>
  )
}

function SceneContent() {
  const world = useMemo(() => generateWorld(), [])
  return (
    <>
      <Rig />
      <ValleyStill at={NIGHT} atFn={worldClock} people={false} />
      <Village>
        <NightMarket stalls={world.stalls} timeOffset={T_OFF} />
        <Walkers world={world} actOffset={ACT_OFF} settle={false} />
        <Fireflies tOff={T_OFF} />
        <Watcher />
        <Fireworks duration={DUR} count={30} />
      </Village>
    </>
  )
}

export default function Act7_3() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: NIGHT_BG, overflow: 'hidden' }}>
      <SceneCanvas
        style={{ width: '100%', height: '100%' }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.25,
          preserveDrawingBuffer: true,
        }}
        // Act B's planes: this valley is kilometres deep and 420 clips the range.
        camera={{ position: toWorld(...KEYS[0].pos), fov: KEYS[0].fov, near: 1, far: 24000 }}
        debugTarget={toWorld(WATCH_X, 6, WATCH_Z - 14)}
      >
        <SceneContent />
        <EffectComposer>
          <Bloom intensity={1.15} luminanceThreshold={0.18} luminanceSmoothing={0.85} mipmapBlur />
          <Vignette eskil={false} offset={0.18} darkness={0.48} />
        </EffectComposer>
      </SceneCanvas>
    </div>
  )
}
