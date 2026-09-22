import { useRef, useMemo, forwardRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { Effect } from 'postprocessing'
import * as THREE from 'three'
import type { Group, PerspectiveCamera } from 'three'
import { SceneCanvas } from '../SceneCanvas'
import { getAnimTime } from '../../hooks/useAnimTime'
import { GREY_CROWD, GREY_CROWD_DARK, GREY_TOWER, GREY_TOWER_WIN } from './shared'
import { GoldFigure } from '../characters/goldFigure'
import { CrowdPeg, PEG_PER_GOLD, type Archetype } from '../characters/CrowdPeg'
import GradientEnvironment from '../effects/GradientEnvironment'

/**
 * Act 5.2-B — THE STREETS, fisheye variant (8s loop)
 *
 * Same street as 5.2, but the lens slowly morphs from a normal perspective
 * into a fisheye over the loop and then holds — the street collapses inward as
 * the world wraps around him.
 *
 * ── The crowd ─────────────────────────────────────────────────────────
 * Everyone he passes is a CrowdPeg: the capsule-and-sphere silhouette Act 8.55
 * uses for its field of thousands. It used to be grey GoldFigures — the same
 * articulated stick body as the hero, in a different colour — which quietly
 * undercut the entire scene. If the strangers are built like he is, the only
 * thing separating him from them is a hue, and the shot becomes "a gold person
 * among grey people" instead of "the one person here who is a person".
 *
 * Now the difference is structural and readable at a glance, and it is the
 * same grammar the film ends on: in 8.55 he stands in an ocean of these pegs
 * and lights them. Here they walk past him and nothing happens. That is the
 * whole distance the story has to travel.
 */

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

// ── Fisheye post-process effect ────────────────────────────────
const fisheyeFragmentShader = /* glsl */ `
  uniform float strength;

  void mainUv(inout vec2 uv) {
    vec2 c = uv - 0.5;
    float r2 = dot(c, c);
    // Barrel distortion — corners pull toward center as strength rises,
    // creating the bulged fisheye look.
    c *= 1.0 - strength * r2 * 2.0;
    uv = c + 0.5;
  }
`

class FisheyeEffectImpl extends Effect {
  constructor() {
    super('FisheyeEffect', fisheyeFragmentShader, {
      uniforms: new Map<string, THREE.Uniform<number>>([
        ['strength', new THREE.Uniform(0)],
      ]),
    })
  }
}

const Fisheye = forwardRef<FisheyeEffectImpl>(function Fisheye(_props, ref) {
  const effect = useMemo(() => new FisheyeEffectImpl(), [])
  useFrame(() => {
    const t = getAnimTime()
    // Ramp from 0 to ~0.28 over the first 6s, then hold with a gentle breath.
    const ramp = THREE.MathUtils.smoothstep(t, 0.5, 6.0)
    const breath = Math.sin(t * 0.6) * 0.015
    const s = ramp * 0.28 + (ramp > 0.98 ? breath : 0)
    ;(effect.uniforms.get('strength') as THREE.Uniform<number>).value = s
  })
  return <primitive ref={ref} object={effect} dispose={null} />
})

// ── Camera narrows (zooms in) alongside the fisheye ────────────
function FisheyeCamera() {
  const { camera } = useThree()
  useFrame(() => {
    const ramp = THREE.MathUtils.smoothstep(getAnimTime(), 0.5, 6.0)
    const persp = camera as PerspectiveCamera
    persp.fov = THREE.MathUtils.lerp(55, 46, ramp)
    persp.updateProjectionMatrix()
  })
  return null
}

// ── Shared crowd materials (built once, reused) ────────────────
// One material per shade for the whole crowd: a peg is two meshes, so a
// per-figure material would mean 140 draw-call groups for no visual gain.
const CROWD_MAT = new THREE.MeshStandardMaterial({
  color: GREY_CROWD, emissive: GREY_CROWD, emissiveIntensity: 0.05, roughness: 0.9,
})
const CROWD_DARK_MAT = new THREE.MeshStandardMaterial({
  color: GREY_CROWD_DARK, emissive: GREY_CROWD_DARK, emissiveIntensity: 0.05, roughness: 0.9,
})

type Walker = {
  laneZ: number
  speed: number
  phaseOffset: number
  /** GoldFigure-equivalent height, converted to peg scale on use. */
  scale: number
  archetype: Archetype
  dark: boolean
}

/**
 * One stranger crossing the frame.
 *
 * A peg has no legs, so the walk has to live entirely in the body: a two-step
 * vertical bob and a matching side-to-side lean, running at a stride rate
 * proportional to how fast they are actually moving. Slow figures amble and
 * fast ones hurry, which is what stops thirty identical capsules from reading
 * as one repeated object sliding past.
 */
function PegWalker({ laneZ, speed, phaseOffset, scale, archetype, dark }: Walker) {
  const groupRef = useRef<Group>(null)
  const swayRef = useRef(0)
  const pegRef = useRef<Group>(null)

  useFrame(() => {
    const t = getAnimTime()
    const travel = 16
    const raw = ((t * Math.abs(speed) + phaseOffset) % travel)
    const x = speed > 0 ? raw - 8 : 8 - raw
    // Stride rate follows walking speed — a peg moving 2.8 u/s taking the same
    // number of steps as one moving 1.0 u/s reads as ice-skating.
    const stride = t * Math.abs(speed) * 3.4 + phaseOffset * 5.1
    if (groupRef.current) {
      groupRef.current.position.set(x, Math.abs(Math.sin(stride)) * 0.035 * scale, laneZ)
      groupRef.current.rotation.y = speed > 0 ? Math.PI / 2 : -Math.PI / 2
    }
    // Lean is on the peg itself so it tips about the hips, not the feet.
    swayRef.current = Math.sin(stride) * 0.045
    if (pegRef.current) pegRef.current.rotation.z = swayRef.current
  })

  return (
    <group ref={groupRef}>
      <group ref={pegRef}>
        <CrowdPeg
          archetype={archetype}
          scale={scale * PEG_PER_GOLD}
          material={dark ? CROWD_DARK_MAT : CROWD_MAT}
          castShadow
        />
      </group>
    </group>
  )
}

// Body types, weighted the way a street actually looks. No 'carrying' or
// 'child' — this is a commuter pavement at the hour he walks it.
const STREET_TYPES: Archetype[] = [
  'tall', 'tall', 'short', 'thin', 'wide', 'hunched', 'tall', 'short',
]

function Crowd() {
  const figures = useMemo(() => {
    const rng = seeded(42)
    const result: Walker[] = []
    // 70, not 35. Pegs cost two meshes each where a stick figure costs a
    // dozen, so twice the crowd is still cheaper than what was here before —
    // and "surrounded by thousands who don't see you" needs the density.
    for (let i = 0; i < 70; i++) {
      const dir = rng() > 0.5 ? 1 : -1
      // Everyone walks BEHIND him. A peg is a wide capsule where a stick
      // figure was a few thin limbs, so the lane band that worked for 5.2
      // (z up to +2, a metre off the lens) put frame-filling grey shapes
      // between the camera and the only thing the shot is about. He is now
      // the nearest body in the frame and the crowd is the river past him.
      // Squaring the sample also thins the near lanes and packs the far ones,
      // which is what a crowded pavement looks like down a long lens.
      const depth = rng() ** 2
      result.push({
        laneZ: 0.2 - depth * 4.0,
        speed: dir * (1.0 + rng() * 1.8),
        phaseOffset: rng() * 20,
        scale: 0.78 + rng() * 0.34,
        archetype: STREET_TYPES[Math.floor(rng() * STREET_TYPES.length)],
        dark: rng() > 0.55,
      })
    }
    return result
  }, [])

  return (
    <group>
      {figures.map((f, i) => (
        <PegWalker key={i} {...f} />
      ))}
    </group>
  )
}

// The arc's gold, matching 5.2 — he is the same figure who walked the road in
// Act 3 and who will stand in the field in 8.55.
const CHILD_MAT = new THREE.MeshStandardMaterial({
  color: '#FFB938', emissive: '#E89B1F', emissiveIntensity: 1.45, roughness: 0.55,
})

const BEAT_DUR = 8.0

function ChildCenter() {
  const groupRef = useRef<Group>(null)

  useFrame(() => {
    const t = getAnimTime()
    const phase = (t % BEAT_DUR) / BEAT_DUR
    const jostleT = t * 0.667
    const jostle = Math.sin(jostleT * Math.PI * 2) * 0.1 + Math.sin(jostleT * 3.7) * 0.04
    const droop = phase * 0.08
    if (groupRef.current) {
      groupRef.current.position.x = jostle
      groupRef.current.position.y = 0
      groupRef.current.rotation.z = -droop * 0.3
    }
  })

  return (
    <group ref={groupRef} position={[0, 0, 0.5]} rotation={[0, Math.PI, 0]} scale={0.75}>
      <GoldFigure
        kind="child"
        pose="walking"
        animate
        inPlace
        material={CHILD_MAT}
        headForwardTilt={0.04}
      />
    </group>
  )
}

function Tower({
  position,
  scale,
  seed,
}: {
  position: [number, number, number]
  scale: [number, number, number]
  seed: number
}) {
  const rng = useMemo(() => seeded(seed), [seed])
  const windows = useMemo(() => {
    const rows = 12
    const cols = 4
    const result: { x: number; y: number; lit: boolean }[] = []
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        result.push({
          x: (col - (cols - 1) / 2) * 0.22,
          y: row * 0.5 + 0.4,
          lit: rng() > 0.3,
        })
      }
    }
    return result
  }, [rng])

  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 3, 0]}>
        <boxGeometry args={[1, 6, 1]} />
        <meshStandardMaterial color={GREY_TOWER} roughness={0.85} />
      </mesh>
      {windows.map((w, i) => (
        <mesh key={i} position={[w.x, w.y, 0.51]}>
          <planeGeometry args={[0.12, 0.22]} />
          <meshStandardMaterial
            color={GREY_TOWER_WIN}
            emissive={w.lit ? '#5A6878' : '#1A1E24'}
            emissiveIntensity={w.lit ? 0.4 : 0.1}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}

function Towers() {
  const towersL = useMemo(() => {
    const rng = seeded(11)
    const t: { pos: [number, number, number]; scale: [number, number, number]; seed: number }[] = []
    for (let i = 0; i < 5; i++) {
      t.push({
        pos: [-3 - rng() * 0.5, 0, -1 - i * 2.3],
        scale: [1.2 + rng() * 0.5, 1.5 + rng() * 1.0, 1.2 + rng() * 0.4],
        seed: i * 13 + 1,
      })
    }
    return t
  }, [])
  const towersR = useMemo(() => {
    const rng = seeded(29)
    const t: { pos: [number, number, number]; scale: [number, number, number]; seed: number }[] = []
    for (let i = 0; i < 5; i++) {
      t.push({
        pos: [3 + rng() * 0.5, 0, -1 - i * 2.3],
        scale: [1.2 + rng() * 0.5, 1.5 + rng() * 1.0, 1.2 + rng() * 0.4],
        seed: i * 17 + 2,
      })
    }
    return t
  }, [])
  return (
    <>
      {towersL.map((t, i) => (
        <Tower key={`l${i}`} position={t.pos} scale={t.scale} seed={t.seed} />
      ))}
      {towersR.map((t, i) => (
        <Tower key={`r${i}`} position={t.pos} scale={t.scale} seed={t.seed} />
      ))}
    </>
  )
}

function SceneContents() {
  return (
    <>
      <color attach="background" args={['#0C1018']} />
      {/* A sliver of cold sky overhead and dark glass all round — the same
          canyon light 5.2 uses. Without it the pegs had no key at all and the
          crowd went to flat black shapes against flat black towers. */}
      <GradientEnvironment
        zenith="#2B3A55" horizon="#141C2A" ground="#0A0D14" intensity={1.0}
      />
      <ambientLight color="#3A4558" intensity={0.42} />
      <directionalLight position={[0, 5, 5]} color="#6A7590" intensity={0.9} />
      <directionalLight position={[-5, 3, -2]} color="#3A4560" intensity={0.45} />
      <fog attach="fog" args={['#0C1018', 8, 28]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#1A1E26" roughness={1} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -5]}>
        <planeGeometry args={[4, 20]} />
        <meshStandardMaterial color="#22262E" roughness={1} />
      </mesh>

      <Towers />
      <Crowd />
      <ChildCenter />

      <mesh position={[0, 8, -15]}>
        <planeGeometry args={[20, 6]} />
        <meshBasicMaterial color="#182230" depthWrite={false} />
      </mesh>
    </>
  )
}

export default function Act5_2_B() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0C1018' }}>
      <SceneCanvas
        style={{ width: '100%', height: '100%' }}
        shadows
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
        camera={{ position: [0, 1.74, 3.5], fov: 55, near: 0.1, far: 50 }}
        onCreated={({ camera }) => camera.lookAt(0, 1.08, -5)}
      >
        <FisheyeCamera />
        <SceneContents />
        <EffectComposer>
          {/* Threshold up from 0.5: at 0.5 the tower windows bloomed as hard
              as the one figure who is supposed to be the only warm thing in
              the frame. */}
          <Bloom intensity={0.5} luminanceThreshold={0.62} luminanceSmoothing={0.6} mipmapBlur />
          <Fisheye />
          <Vignette eskil={false} offset={0.2} darkness={0.7} />
        </EffectComposer>
      </SceneCanvas>
    </div>
  )
}
