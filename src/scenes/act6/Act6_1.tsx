/**
 * Act 6.1 — "THE WAITING ROOM"
 *
 * Establishes where we are and who he is, in under three seconds and without
 * a word: a corridor of moulded plastic chairs under strip fluorescents, one
 * numbered paper tag, and a door at the end with a light over it. Nobody
 * else is in the corridor — the queue is him.
 *
 * Deliberately the coldest scene in the film so far. Everything before this
 * has been sunset gold, lamplight and moonlight; this is 5000K on grey vinyl
 * flooring. He is the only warm thing in the frame, and he is dim — the
 * child's glow from Act 3 has been down for years by now.
 *
 * The other chairs are empty but not unused: the row stretches off past the
 * frame, because there is always someone before you and someone after you.
 *
 * SCALE. The set is built in metres — 2.1 m door, 3.65 m ceiling, 0.465 m
 * seat. GoldFigure is already authored at human height (head top ≈ 1.89), so
 * every figure in this act is at scale 1. It used to be at 2.05, which is why
 * the pair stood four metres tall with their heads inside the light fittings.
 *
 * The tag reads 1230 — 12/30, which is the number V uses for himself.
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { createScene } from '../createScene'
import { useCameraHandoff } from '../DebugCamera'
import { GoldFigure } from '../characters/goldFigure'
import { getAnimTime } from '../../hooks/useAnimTime'
import GradientEnvironment from '../effects/GradientEnvironment'
import { NumberTag } from './signage'
import { chairSitSkeleton, SEAT_TOP } from './chairSit'
import { GLOW_DORMANT } from './Act6_2'

const clamp01 = (t: number) => Math.max(0, Math.min(1, t))
const easeInOut = (t: number) => t * t * (3 - 2 * t)

/** Scene length. The corridor push is authored against this, so retiming the
 *  slot in timeline.ts rescales the whole move instead of clipping its tail. */
const DUR = 2.6

const WALL = '#20242E'
const FLOOR = '#262A32'
const CHAIR_SHELL = '#2E4258'
const CHAIR_FRAME = '#161A22'

/** Chair row geometry, shared by the row itself and by whoever sits in it. */
const ROW_X = -2.2
const ROW_Z = -1.5
const ROW_PITCH = 0.62
const chairX = (i: number) => ROW_X + i * ROW_PITCH

/* ─── A run of bolted-together chairs ───────────────────────────── */
function ChairRow({
  position, count = 8, rotation = [0, 0, 0],
}: {
  position: [number, number, number]
  count?: number
  rotation?: [number, number, number]
}) {
  const pitch = 0.62
  return (
    <group position={position} rotation={rotation}>
      {/* Continuous rail the shells bolt onto */}
      <mesh position={[(count - 1) * pitch / 2, 0.30, 0]}>
        <boxGeometry args={[count * pitch, 0.05, 0.06]} />
        <meshStandardMaterial color={CHAIR_FRAME} roughness={0.45} metalness={0.7} />
      </mesh>
      {Array.from({ length: count }, (_, i) => (
        <group key={i} position={[i * pitch, 0, 0]}>
          <mesh position={[0, 0.44, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.5, 0.05, 0.46]} />
            <meshStandardMaterial color={CHAIR_SHELL} roughness={0.72} />
          </mesh>
          <mesh position={[0, 0.71, -0.21]} rotation={[-0.12, 0, 0]} castShadow>
            <boxGeometry args={[0.5, 0.5, 0.05]} />
            <meshStandardMaterial color={CHAIR_SHELL} roughness={0.72} />
          </mesh>
        </group>
      ))}
      {/* Legs every other chair, like real bench seating */}
      {Array.from({ length: Math.ceil(count / 2) + 1 }, (_, i) => (
        <mesh key={i} position={[i * pitch * 2 - 0.25, 0.15, 0]}>
          <boxGeometry args={[0.04, 0.3, 0.34]} />
          <meshStandardMaterial color={CHAIR_FRAME} roughness={0.5} metalness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

/* ─── Ceiling strip lights ──────────────────────────────────────── */
function Fluorescents() {
  return (
    <group>
      {[-2, -7, -12, -17].map((z, i) => (
        <group key={i} position={[0, 3.5, z]}>
          <mesh>
            <boxGeometry args={[3.0, 0.06, 0.26]} />
            <meshStandardMaterial
              color="#F0F4FF" emissive="#EAF0FF" emissiveIntensity={2.6} toneMapped={false}
            />
          </mesh>
          <mesh position={[0, 0.07, 0]}>
            <boxGeometry args={[3.2, 0.08, 0.36]} />
            <meshStandardMaterial color="#31363F" roughness={0.6} metalness={0.4} />
          </mesh>
          <pointLight position={[0, -0.3, 0]} color="#DCE6FF" intensity={11} distance={9} decay={1.6} />
        </group>
      ))}
    </group>
  )
}

/* ─── Him, waiting his turn ─────────────────────────────────────── */
function WaitingHero() {
  const heroMat = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: '#FFB938', emissive: '#FFB938',
      emissiveIntensity: GLOW_DORMANT, roughness: 0.35, toneMapped: false,
    }),
    [],
  )

  // Built once: the pose function reads the clock itself, so it does not need
  // to be rebuilt per render.
  const sit = useMemo(() => chairSitSkeleton({ lean: 0.14, hands: 'knees' }), [])

  useFrame(() => {
    const t = getAnimTime()
    // Nerves: the glow ticks up a fraction and settles, over and over — he is
    // running the song in his head and it keeps almost catching.
    heroMat.emissiveIntensity = GLOW_DORMANT + Math.max(0, Math.sin(t * 2.1)) * 0.10
  })

  // Seat centre, turned a few degrees off the row so we get a three-quarter of
  // him rather than a flat front-on.
  return (
    <group position={[chairX(3), 0, ROW_Z]} rotation={[0, 0.20, 0]}>
      <GoldFigure skeleton={sit} material={heroMat} castShadow />
      {/* Tag pinned square to the middle of the chest, turned a little toward
          the lens. Two things had it clipped: it was 0.19 wide across a body
          tube 0.10 wide and pushed off to one side, so most of the card hung
          in mid-air; and at z = 0.192 with a 0.16 pitch its top edge fell
          BEHIND the trunk's front surface — the leaning spine is out at
          z ≈ 0.13 up here and the tube adds another 0.05 — so the body ate
          the top of the card. Now: narrower than before, centred, and far
          enough forward that the pitched top edge still clears. The old
          off-centre placement was dodging the near forearm; the arm now
          breaks backwards at the elbow and passes outboard of the card. */}
      <NumberTag position={[0, SEAT_TOP + 0.485, 0.208]} rotation={[0.13, 0.22, 0]} number="1230" size={0.15} />
    </group>
  )
}

/* ─── The door they are waiting on ──────────────────────────────── */
function AuditionDoor({ position }: { position: [number, number, number] }) {
  const lampRef = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(() => {
    // The "in session" lamp — steady, indifferent.
    if (lampRef.current) lampRef.current.emissiveIntensity = 3.2
  })
  return (
    <group position={position}>
      <mesh position={[0, 1.05, 0]} receiveShadow>
        <boxGeometry args={[1.15, 2.1, 0.09]} />
        <meshStandardMaterial color="#171B24" roughness={0.7} />
      </mesh>
      <mesh position={[0.44, 1.02, 0.07]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial color="#8A8F9C" roughness={0.35} metalness={0.85} />
      </mesh>
      {/* Lamp over the door */}
      <mesh position={[0, 2.32, 0.03]}>
        <boxGeometry args={[0.38, 0.14, 0.08]} />
        <meshStandardMaterial
          ref={lampRef}
          color="#FF5B48" emissive="#FF3A20" emissiveIntensity={3.2} toneMapped={false}
        />
      </mesh>
      <pointLight position={[0, 2.2, 0.5]} color="#FF6A50" intensity={5} distance={4.5} decay={1.8} />
    </group>
  )
}

/* ─── Camera: a slow push down the corridor ─────────────────────── */
function CameraRig() {
  const yieldCamera = useCameraHandoff()
  const target = useRef(new THREE.Vector3())
  useFrame(({ camera }) => {
    if (yieldCamera()) return
    const t = getAnimTime()
    const u = easeInOut(clamp01(t / DUR))
    // Three-quarter view down the row rather than head-on: the corridor only
    // reads as a corridor if you can see it running away past him. Eyeline is
    // a little above his seated head, so the empty chairs stay in frame.
    camera.position.set(2.32 - u * 0.50, 1.44 - u * 0.05, 1.42 - u * 0.72)
    target.current.set(-0.26, 1.05, -2.20)
    camera.lookAt(target.current)
  })
  return null
}

function SceneContent() {
  return (
    <>
      <CameraRig />
      <GradientEnvironment zenith="#2A3040" horizon="#333A48" ground="#1A1E26" intensity={0.85} />
      <ambientLight intensity={0.35} color="#9FB0D0" />
      <fog attach="fog" args={['#141821', 9, 30]} />

      {/* Floor + walls — a corridor running away from camera */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[26, 60]} />
        <meshStandardMaterial color={FLOOR} roughness={0.55} metalness={0.06} />
      </mesh>
      <mesh position={[-2.6, 2.0, -8]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[40, 4.6]} />
        <meshStandardMaterial color={WALL} roughness={0.92} />
      </mesh>
      <mesh position={[3.4, 2.0, -8]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[40, 4.6]} />
        <meshStandardMaterial color="#1B1F27" roughness={0.94} />
      </mesh>
      {/* End wall */}
      <mesh position={[0.4, 2.0, -19]}>
        <planeGeometry args={[9, 4.6]} />
        <meshStandardMaterial color="#1D222C" roughness={0.94} />
      </mesh>
      {/* Ceiling, so the strips have something to hang from */}
      <mesh position={[0.4, 3.65, -8]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[26, 40]} />
        <meshStandardMaterial color="#191D25" roughness={0.96} />
      </mesh>

      <Fluorescents />
      <ChairRow position={[ROW_X, 0, ROW_Z]} count={9} />
      <WaitingHero />
      <AuditionDoor position={[0.4, 0, -18.9]} />

    </>
  )
}

export default createScene({
  background: '#0B0E14',
  three: {
    camera: { position: [2.32, 1.44, 1.42], fov: 46, near: 0.3, far: 90 },
    gl: {
      antialias: true,
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 1.05,
    },
    onCreated: ({ camera }) => camera.lookAt(-0.26, 1.05, -2.20),
    debugTarget: [-0.26, 1.05, -2.20],
  },
}, function Act6_1() {
  return (
    <>
      <SceneContent />
      <EffectComposer>
        <Bloom intensity={0.6} luminanceThreshold={0.62} luminanceSmoothing={0.85} mipmapBlur />
        <Vignette eskil={false} offset={0.22} darkness={0.6} />
      </EffectComposer>
    </>
  )
})
