/**
 * The parent's hat — four real pieces, side by side on the actual rig.
 *
 * Not a mock-up. These are `GoldFigure`s wearing `buildHat()` geometry under
 * the film's own material and bloom, walking the film's own cycle, so what is
 * on screen here is what will be on screen in the valley.
 *
 * The camera does one slow orbit from three-quarter front to dead astern,
 * because astern is how Act B actually sees this figure — the pair walk AWAY
 * up the road for the whole last minute — and a hat that only works from the
 * front is no use here. It ends wide, at roughly the distance the flight
 * holds them, which is the test that matters: at forty lines tall a face is
 * gone and a silhouette is not.
 *
 *   ?act=char-hats            the orbit
 *   ?act=char-hats&t=1        near three-quarter (fidelity)
 *   ?act=char-hats&t=7        astern (silhouette)
 *   ?act=char-hats&t=12       wide, at the film's distance
 */
import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { getAnimTime } from '../../hooks/useAnimTime'
import { createScene } from '../createScene'
import { useCameraHandoff } from '../DebugCamera'
import { GoldFigure, HAT_NAMES, HAT_LABELS, type HatName } from './goldFigure'

const GAP = 1.45
const GROUND = '#0E1118'

/** Where each figure stands, centred on the row. */
const X = (i: number) => (i - (HAT_NAMES.length - 1) / 2) * GAP

/* ══ Plaque ═════════════════════════════════════════════════════════════
 * Hangeul, romanisation and one line of what the thing is, drawn into a
 * canvas so it needs no font loading and survives a headless render.
 */
function makePlaque(hat: HatName): THREE.Texture {
  const L = HAT_LABELS[hat]
  const W = 512
  const H = 192
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const ctx = cv.getContext('2d')!
  ctx.clearRect(0, 0, W, H)
  ctx.textAlign = 'center'
  ctx.fillStyle = '#FFE2A8'
  ctx.font = '600 74px "Noto Sans CJK KR", "Noto Sans KR", sans-serif'
  ctx.fillText(L.hangeul, W / 2, 74)
  ctx.fillStyle = '#FFB938'
  ctx.font = '500 40px Helvetica, Arial, sans-serif'
  ctx.fillText(L.roman, W / 2, 126)
  ctx.fillStyle = '#8A7A5E'
  ctx.font = '400 27px Helvetica, Arial, sans-serif'
  ctx.fillText(L.note, W / 2, 168)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function Plaque({ hat, x }: { hat: HatName; x: number }) {
  const tex = useMemo(() => makePlaque(hat), [hat])
  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    map: tex, transparent: true, depthWrite: false, toneMapped: false,
  }), [tex])
  // Billboarded ABOVE the hat: on the ground it foreshortened into a smear
  // the moment the camera dropped to figure height, and anywhere beside the
  // figure it crosses the silhouette the study is about.
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ camera }) => ref.current?.quaternion.copy(camera.quaternion))
  return (
    <mesh ref={ref} position={[x, 2.34, 0]} material={mat}>
      <planeGeometry args={[1.15, 0.43]} />
    </mesh>
  )
}

/* ══ Camera ═════════════════════════════════════════════════════════════
 * One orbit, hand-keyed rather than a straight lerp: a lerp from the front
 * to the back runs the camera THROUGH the row.
 */
type Key = { t: number; az: number; r: number; y: number; look: number; fov: number }
const KEYS: Key[] = [
  // Long lens and a long way back, so the four sit on one plane and can be
  // compared rather than raked by perspective.
  { t: 0.0, az: 0.42, r: 11.6, y: 1.60, look: 1.20, fov: 27 },
  { t: 3.0, az: 1.25, r: 11.3, y: 1.20, look: 1.20, fov: 27 },
  { t: 5.5, az: 2.25, r: 11.5, y: 0.90, look: 1.20, fov: 27 },
  { t: 7.5, az: 3.14, r: 11.6, y: 1.60, look: 1.20, fov: 27 },
  { t: 9.5, az: 3.14, r: 16.5, y: 2.20, look: 1.15, fov: 26 },
  // And the only test that counts: the distance the flight actually holds
  // them at, where the figure is fifty-odd lines tall and a face is gone.
  { t: 12.0, az: 3.14, r: 38.0, y: 3.60, look: 1.00, fov: 30 },
]

function lerpKey(t: number): Key {
  if (t <= KEYS[0].t) return KEYS[0]
  if (t >= KEYS[KEYS.length - 1].t) return KEYS[KEYS.length - 1]
  let i = 0
  while (i < KEYS.length - 2 && KEYS[i + 1].t < t) i++
  const a = KEYS[i]
  const b = KEYS[i + 1]
  const u = (t - a.t) / (b.t - a.t)
  const k = u * u * (3 - 2 * u)
  const m = (p: number, q: number) => p + (q - p) * k
  return { t, az: m(a.az, b.az), r: m(a.r, b.r), y: m(a.y, b.y), look: m(a.look, b.look), fov: m(a.fov, b.fov) }
}

function StudyCamera() {
  const { camera } = useThree()
  const yieldCamera = useCameraHandoff()
  const tgt = useRef(new THREE.Vector3())
  useFrame(() => {
    if (yieldCamera()) return
    const k = lerpKey(getAnimTime())
    camera.position.set(Math.sin(k.az) * k.r, k.y, Math.cos(k.az) * k.r)
    tgt.current.set(0, k.look, 0)
    camera.lookAt(tgt.current)
    if ('fov' in camera) {
      const c = camera as THREE.PerspectiveCamera
      if (c.fov !== k.fov) { c.fov = k.fov; c.updateProjectionMatrix() }
    }
  })
  return null
}

/* ══ Set ════════════════════════════════════════════════════════════════ */

function Ground() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[26, 64]} />
        <meshStandardMaterial color={GROUND} roughness={1} />
      </mesh>
      {/* The road they are on, so the figures are standing on a surface with
          a direction to it rather than in a void. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
        <planeGeometry args={[9, 44]} />
        <meshStandardMaterial color="#181A1E" roughness={1} />
      </mesh>
    </>
  )
}

export default createScene({
  background: '#05070C',
  three: {
    camera: { position: [1.9, 1.55, 3.0], fov: 38 },
    gl: { antialias: true },
    debugTarget: [0, 1.3, 0],
  },
}, function HatStudy() {
  return (
    <>
      <StudyCamera />
      {/* Night, and the figures are the light in it: a whisper of ambient, a
          cold key from the sky side so the hats have a shaded face, and their
          own emissive doing the rest. */}
      <ambientLight intensity={0.16} color="#5A6B92" />
      <directionalLight position={[-5, 7, 4]} intensity={0.30} color="#8FA8E0" />
      <pointLight position={[0, 1.5, 2.4]} intensity={2.4} distance={16} decay={1.8} color="#FFC24E" />
      <Ground />
      {HAT_NAMES.map((hat, i) => (
        <group key={hat} position={[X(i), 0, 0]}>
          {/* Held well under the film's own level. At Act B's brightness the
              bloom eats every course and rib in the thing and all four read
              as the same white lozenge — which is a fine look and a useless
              study. */}
          <GoldFigure inPlace hat={hat} glow={0.62} phaseOffset={i * 0.17} />
        </group>
      ))}
      {HAT_NAMES.map((hat, i) => <Plaque key={hat} hat={hat} x={X(i)} />)}
      <EffectComposer>
        <Bloom intensity={0.42} luminanceThreshold={0.55} luminanceSmoothing={0.4} mipmapBlur radius={0.6} />
        <Vignette eskil={false} offset={0.22} darkness={0.72} />
      </EffectComposer>
    </>
  )
})
