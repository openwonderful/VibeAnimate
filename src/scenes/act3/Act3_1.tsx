/**
 * Act 3.1 — "The Road Home" (SUNSET, STILL ON THE WAY)
 *
 * Golden hour. The glowing parent + child walk hand-in-hand down a dirt
 * road through rice paddies — destination out of sight. The ancient
 * Baekdu-style mountain range from Act 1 is the dominant backdrop, a
 * callback to the opening frame of the video. Roadside Korean countryside
 * elements (jangseung + sotdae, stone cairn, rice straw stacks, lone
 * persimmon tree) read as "village territory, not home yet." Cranes glide,
 * cherry blossoms drift. Fireflies. Warm, unhurried, nostalgic.
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { SceneCanvas } from '../SceneCanvas'
import SeededSparkles from '../effects/SeededSparkles'
import GradientEnvironment from '../effects/GradientEnvironment'
import StylizedWater from '../effects/StylizedWater'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { GoldGlowFigure } from '../characters/GoldGlowFigure'
import Act1Backdrop from '../act1/Act1Backdrop'
import { getAnimTime } from '../../hooks/useAnimTime'
import { useCameraHandoff } from '../DebugCamera'
import {
  JangseungPair, Sotdae, StoneCairn, RiceStrawStack, PersimmonTree,
} from './roadside'

const clamp01 = (t: number) => Math.max(0, Math.min(1, t))

/* ─── Color palette ─────────────────────────────────────────────── */
const DIRT_ROAD = '#9B7B5A'

/* ─── The walk, and the camera move built around it ─────────────
 *
 * ONE unbroken walk fills the 8s slot. The pair starts well down the near end
 * of the road — close enough that the two figures read clearly — and walks
 * away from us the whole way, ending small against the mountains. Cutting the
 * slot into two 4s passes (what this used to do) meant they walked a short
 * stretch, vanished, and restarted from the same mark; the reset read as a
 * loop rather than as a journey.
 *
 * The camera travels with them at the same speed (see CameraRig), so they hold
 * their size in frame and the road, paddies and roadside markers stream past
 * on either side — the shot is about the ground being covered.
 */
/** Seconds the walk takes — the whole slot, start to finish. */
const WALK_PASS = 8
/** World units travelled, near end of the road to far. */
const WALK_LOOP = 10.0
/** Where they start: nearest the camera, which sits at z ≈ +8.5. */
const WALK_START_Z = 1.0

/** z centres of the repeating paddy blocks flanking the road. */
const PADDY_ROWS = [-2, -10, -18, -26]

/** 0..WALK_LOOP — how far along the road the pair is. */
function walkPhase(t: number): number {
  return Math.max(0, Math.min(1, t / WALK_PASS)) * WALK_LOOP
}

/* ─── Parent + child holding hands, walking as a unit ──────────── */
// The adult (scale 2.2) and child (scale 1.5) are wrapped in one group
// that slides toward the house. Both figures walk in place; the group's
// translation provides locomotion. Inside arms are pinned via
// rightHandAt / leftHandAt so the hands meet at a shared world point.
//
// Hold math (with walking-group-local centre, each figure rotated Y=π):
//   world_hand_x = group_origin.x − scale · local_hand.x
// so for hands to meet at local-x = 0 (midway):
//   adult.local_hand.x =  +offset_x / scale_adult
//   child.local_hand.x = −|offset_x| / scale_child
// (hands meet at walking-group-local (0, hold_y, 0) in every frame).
// Soft radial-gradient shadow texture (generated once, shared by both figures)
function makeShadowTexture(): THREE.Texture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.85)')
  grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.45)')
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function HandHoldingPair() {
  const groupRef = useRef<THREE.Group>(null)
  const shadowMat = useMemo(() => new THREE.MeshBasicMaterial({
    map: makeShadowTexture(),
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  }), [])

  useFrame(() => {
    if (!groupRef.current) return
    const FADE = 0.6 // world units of fade-in at the top of the walk
    const t = getAnimTime()
    const phase = walkPhase(t)
    groupRef.current.position.z = WALK_START_Z - phase

    // Fade in over the first stretch so the pair arrives into the shot rather
    // than popping in on the cut. No fade at the far end: they walk out of
    // this scene and straight into 3.2 as the same two people.
    const alpha = phase < FADE ? phase / FADE : 1

    groupRef.current.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if ((mesh as THREE.Mesh).isMesh && mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        mats.forEach((m) => {
          const mat = m as THREE.Material & { opacity?: number; transparent?: boolean }
          mat.transparent = true
          mat.opacity = alpha
        })
      }
    })
  })

  return (
    <group ref={groupRef} position={[-0.15, -0.05, -1.5]}>
      {/* Soft contact shadows — sun is ahead of the camera (far −z) and
          slightly right, so shadows stretch toward the camera (+z) and a
          hair left. Long, narrow in x, extending in z. */}
      <mesh position={[0.2, 0.03, 1.5]} rotation={[-Math.PI / 2, 0, 0]} material={shadowMat}>
        <planeGeometry args={[1.2, 3.4]} />
      </mesh>
      <mesh position={[-0.3, 0.03, 1.2]} rotation={[-Math.PI / 2, 0, 0]} material={shadowMat}>
        <planeGeometry args={[0.9, 2.5]} />
      </mesh>
      {/* Adult on world +x side (body-right arm reaches toward child) */}
      <group position={[0.25, 0, 0]} rotation={[0, Math.PI, 0]} scale={2.2}>
        <GoldGlowFigure castShadow inPlace glow={0.9} rightHandAt={[0.114, 0.80, 0]} />
      </group>
      {/* Child on world −x side (body-left arm reaches toward adult) */}
      <group position={[-0.25, 0, 0]} rotation={[0, Math.PI, 0]} scale={1.5}>
        <GoldGlowFigure kind="child" castShadow inPlace phaseOffset={0.25} leftHandAt={[-0.167, 1.173, 0]} />
      </group>
    </group>
  )
}

/* ─── Rice paddy ────────────────────────────────────────────────── */
function RicePaddy({
  position,
  width,
  depth,
  stalkSpacing = 0.45,
}: {
  position: [number, number, number]
  width: number
  depth: number
  /** World units between stalks. Coarsen for paddies far down the road —
   *  each one is a few hundred individual meshes at full density. */
  stalkSpacing?: number
}) {
  const waterRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!waterRef.current) return
    const mat = waterRef.current.material as THREE.MeshStandardMaterial
    mat.roughness = 0.12 + Math.sin(clock.getElapsedTime() * 0.5) * 0.04
  })

  // Stalk gauge is a *shimmer* decision, not an art decision. At the old
  // 4–6 mm radius each stalk covered a fraction of a pixel from the camera's
  // distance, so it flickered on and off frame to frame — worst across the
  // paddies at the top of the shot. Four times thicker and a quarter as many
  // reads the same at this distance and holds still, because every stalk is
  // now several pixels wide.
  const stalks = useMemo(() => {
    const out: { x: number; z: number; h: number; rot: number }[] = []
    if (stalkSpacing <= 0) return out
    const rows = Math.floor(depth / stalkSpacing)
    const cols = Math.floor(width / stalkSpacing)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        out.push({
          x: (c - cols / 2) * stalkSpacing + (r % 2) * stalkSpacing / 2,
          z: (r - rows / 2) * stalkSpacing,
          h: 0.3 + Math.sin(r * 3.7 + c * 2.1) * 0.07,
          rot: Math.sin(r * 1.3 + c * 0.7) * 0.15,
        })
      }
    }
    return out
  }, [width, depth, stalkSpacing])

  return (
    <group position={position}>
      {/* Earth berm. Its top face has to clear the water plane by a real
          margin — see the note on the water surface below. */}
      <mesh position={[0, 0.025, 0]} receiveShadow>
        <boxGeometry args={[width + 0.1, 0.05, depth + 0.1]} />
        <meshStandardMaterial color="#5A6B30" roughness={0.95} />
      </mesh>
      {/* Water surface. Now that GradientEnvironment gives the scene a sky to
          mirror, this is a genuine reflection rather than a dark rectangle
          with warm decals painted on top — the paddies pick up the sunset
          band along the horizon and go coppery near the sun. */}
      {/* Z-FIGHTING — the reason the fields strobed.
          The berm's top face was at y=0.080 and this plane was at y=0.080
          too, i.e. exactly coplanar, with the two decals below at 0.085 and
          0.086. At near=0.1/far=300 the depth buffer cannot resolve
          millimetres out at the 20–40 units where the mid and far paddies
          sit, so the surfaces interleaved and flickered over whole fields as
          the camera moved. Everything here is now separated by centimetres,
          the decals are polygon-offset toward the lens, and the camera's near
          plane has been pulled out to 0.3 for ~3× the depth precision. */}
      <group position={[0, 0.10, 0]}>
        <StylizedWater
          width={width}
          depth={depth}
          deep="#585378"
          sky="#D2571C"
          ripple="#F0A05A"
          glow="#FFC078"
          glowX={2.8}
          glowWidth={2.3}
          glowStrength={0.5}
          rippleScale={3.4}
          rippleSpeed={0.5}
          rippleStrength={0.34}
        />
      </group>
      {/* Sunset reflection — warm orange covering the water */}
      <mesh position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial
          color="#CC7722"
          transparent
          opacity={0.13}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-4}
          polygonOffsetUnits={-4}
        />
      </mesh>
      {/* Brighter golden band in center of paddy (sky reflection) */}
      <mesh position={[0, 0.19, -depth * 0.2]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
        <planeGeometry args={[width * 0.5, depth * 0.4]} />
        <meshBasicMaterial
          color="#FFBB44"
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-6}
          polygonOffsetUnits={-6}
        />
      </mesh>
      {/* Rice stalks */}
      {stalks.map((s, i) => (
        <mesh key={i} position={[s.x, s.h / 2 + 0.10, s.z]} rotation={[0, i * 1.3, s.rot]}>
          <cylinderGeometry args={[0.016, 0.026, s.h, 4]} />
          <meshStandardMaterial color="#7A9A40" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

/* ─── Dirt road with perspective ────────────────────────────────── */
function DirtRoad() {
  // A long strip of near-constant width. The old shape narrowed sharply from
  // 4.0 to 1.2 to fake perspective, which only looks right from one fixed
  // camera position — under a moving camera the road visibly pinches. Real
  // perspective does the job now, so the geometry just has to be long enough
  // for the dolly: local y maps to world −z, so this spans z ≈ +12 → −30.
  const roadShape = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-1.55, -10)
    s.lineTo(1.55, -10)
    s.lineTo(1.25, 32)
    s.lineTo(-1.25, 32)
    s.closePath()
    return s
  }, [])

  return (
    <group>
      <mesh position={[0, 0.05, 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <shapeGeometry args={[roadShape]} />
        <meshStandardMaterial color={DIRT_ROAD} roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

/* ─── Ground ────────────────────────────────────────────────────── */
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color="#4A5528" roughness={1.0} />
    </mesh>
  )
}

/* ─── Fireflies ─────────────────────────────────────────────────── */
function Fireflies() {
  return (
    <>
      <SeededSparkles seed={31} count={50} scale={[20, 3, 20]} size={4} speed={0.3} color="#FFD866" opacity={0.6} position={[0, 1.2, -4]} />
      <SeededSparkles seed={32} count={20} scale={[10, 2, 6]} size={5} speed={0.25} color="#FFCC44" opacity={0.5} position={[0, 0.8, 3]} />
      <SeededSparkles seed={33} count={25} scale={[8, 2, 8]} size={3} speed={0.2} color="#FFAA33" opacity={0.4} position={[0, 0.6, -10]} />
    </>
  )
}

/* ─── Distant trees ─────────────────────────────────────────────── */
function DistantTrees() {
  const trees = useMemo(() => [
    { x: -8, z: -18, s: 0.7 }, { x: -10, z: -22, s: 0.9 },
    { x: 7, z: -20, s: 0.8 }, { x: 9, z: -25, s: 0.6 },
    { x: -6, z: -28, s: 0.5 }, { x: 5, z: -30, s: 0.55 },
    { x: -12, z: -15, s: 0.65 }, { x: 11, z: -16, s: 0.6 },
    // Second belt, for once the dolly has closed ten units on the first.
    { x: -9, z: -36, s: 0.75 }, { x: 8, z: -38, s: 0.7 },
    { x: -13, z: -42, s: 0.85 }, { x: 12, z: -45, s: 0.8 },
    { x: -5, z: -48, s: 0.6 }, { x: 6, z: -52, s: 0.65 },
  ], [])

  return (
    <group>
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]} scale={t.s}>
          <mesh position={[0, 0.8, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.08, 1.6, 6]} />
            <meshStandardMaterial color="#4A3A25" roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.8, 0]} castShadow>
            <sphereGeometry args={[0.6, 10, 8]} />
            <meshStandardMaterial color={i % 2 === 0 ? '#2A4518' : '#354E1E'} roughness={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ─── Wooden fence along one side of the road ───────────────────── */
function WoodenFence() {
  return (
    <group position={[2.0, 0, 0]}>
      {Array.from({ length: 20 }, (_, i) => {
        const z = -30 + i * 2
        return (
          <group key={i}>
            <mesh position={[0, 0.25, z]} castShadow>
              <cylinderGeometry args={[0.03, 0.035, 0.5, 6]} />
              <meshStandardMaterial color="#6A5535" roughness={0.9} />
            </mesh>
            {i < 19 && (
              <mesh position={[0, 0.3, z + 1]} castShadow>
                <boxGeometry args={[0.03, 0.025, 2]} />
                <meshStandardMaterial color="#7A6540" roughness={0.9} />
              </mesh>
            )}
          </group>
        )
      })}
    </group>
  )
}

/* ─── Foreground grass tufts ────────────────────────────────────── */
function ForegroundGrass() {
  const tufts = useMemo(() =>
    Array.from({ length: 96 }, (_, i) => ({
      x: -8 + (i % 12) * 1.4 + Math.sin(i * 3.7) * 0.5,
      z: 9 - Math.floor(i / 12) * 3.4 + Math.sin(i * 2.1) * 0.6,
      h: 0.18 + Math.sin(i * 1.3) * 0.1,
      rot: Math.sin(i * 0.7) * 0.2,
    })),
  [])

  return (
    <group>
      {tufts.map((t, i) => (
        <mesh key={i} position={[t.x, t.h / 2, t.z]} rotation={[0, i * 0.8, t.rot]}>
          <cylinderGeometry args={[0.012, 0.03, t.h, 4]} />
          <meshStandardMaterial color="#5A7A30" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

/* ─── Wildflowers along the road edges ──────────────────────────── */
function Wildflowers() {
  const flowers = useMemo(() =>
    Array.from({ length: 48 }, (_, i) => ({
      x: (i % 2 === 0 ? -1 : 1) * (1.8 + Math.sin(i * 2.3) * 0.4),
      z: 7 - i * 0.78 + Math.sin(i * 1.7) * 0.3,
      color: ['#E8AA30', '#D46040', '#E8C050', '#CC5540'][i % 4],
      h: 0.12 + Math.sin(i * 3.1) * 0.04,
    })),
  [])

  return (
    <group>
      {flowers.map((f, i) => (
        <group key={i} position={[f.x, 0, f.z]}>
          {/* Stem */}
          <mesh position={[0, f.h / 2, 0]}>
            <cylinderGeometry args={[0.012, 0.012, f.h, 4]} />
            <meshStandardMaterial color="#5A7A30" roughness={0.9} />
          </mesh>
          {/* Flower head */}
          <mesh position={[0, f.h + 0.02, 0]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshStandardMaterial
              color={f.color}
              emissive={f.color}
              emissiveIntensity={0.2}
              roughness={0.6}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ─── Camera: a tracking dolly, travelling with the pair ───────
 *
 * The camera holds station behind the pair and moves down the road at their
 * pace, so the two of them stay the same size in frame while the world streams
 * past on either side. That is what sells the walk as a journey. The previous
 * build swung out to the right on an arc and back again — nicely framed, but
 * it made the shot about the camera's move rather than about the ground they
 * were covering.
 *
 * The road and its dressing were extended to z ≈ −30 to give the dolly
 * somewhere to go — see DirtRoad, PADDY_ROWS and LANDMARKS below.
 */
const CAM_START_Z = 8.5
/** Equal to WALK_LOOP, so the gap between camera and pair never changes. */
const CAM_TRAVEL = WALK_LOOP
const CAM_X = 0.3
const CAM_Y = 1.45
/** How far ahead of the camera the aim point sits. */
const CAM_LOOK_AHEAD = 12

function CameraRig() {
  const yieldCamera = useCameraHandoff()
  const target = useRef(new THREE.Vector3())

  useFrame(({ camera }) => {
    if (yieldCamera()) return
    const t = getAnimTime()
    const z = CAM_START_Z - clamp01(t / WALK_PASS) * CAM_TRAVEL

    // A slow, shallow sway on top of the dolly — enough that the move reads as
    // carried rather than railed, small enough not to draw attention to itself.
    camera.position.set(
      CAM_X + Math.sin(t * 0.55) * 0.11,
      CAM_Y + Math.sin(t * 0.37 + 1.2) * 0.035,
      z,
    )
    target.current.set(0, 2.2, z - CAM_LOOK_AHEAD)
    camera.lookAt(target.current)
  })

  return null
}

/* ─── Scene content ─────────────────────────────────────────────── */
function SceneContent() {
  return (
    <>
      <CameraRig />
      {/* A dusk sky for the water and every standard material to bounce off.
          Azimuth is a touch right of straight-down-the-road to match the sun
          in the painted backdrop and the raking directional light. */}
      <GradientEnvironment
        zenith="#4E5C92"
        horizon="#FF9A47"
        ground="#7A4B24"
        sun={{ color: '#FFE7B8', azimuthDeg: 14, elevationDeg: 7, sizeDeg: 4, glowDeg: 46 }}
        intensity={1.15}
      />
      {/* Lighting — golden hour. Low, warm directional sun rakes across the
          scene from the upper right (matching the backdrop's sun position),
          with a warm amber ambient fill so shadows stay honey-toned. */}
      <ambientLight intensity={0.16} color="#EFA868" />
      <hemisphereLight intensity={0.14} color="#FFCC80" groundColor="#5E3820" />
      <directionalLight
        position={[3, 4, -30]}
        intensity={2.6}
        color="#FF9E48"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={80}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={15}
        shadow-camera-bottom={-5}
      />
      <pointLight position={[0, 2, 2]} intensity={0.9} color="#F5C060" decay={2} distance={12} />

      {/* Warm dusty fog picks up the sunset light and hazes the distance */}
      <fog attach="fog" args={['#D28448', 25, 70]} />

      {/* Terrain */}
      <Ground />
      <DirtRoad />

      {/* Rice paddies */}
      {/* Paddies repeat down the length of the road so the dolly always has
          field on both sides. Stalk spacing coarsens with distance — the far
          rows are several hundred draw calls each at full density and read
          identically at half. */}
      <RicePaddy position={[-3.8, 0, 5]} width={4.0} depth={5} stalkSpacing={0.7} />
      <RicePaddy position={[3.8, 0, 5]} width={4.0} depth={5} stalkSpacing={0.7} />
      {PADDY_ROWS.map((z, i) => (
        <group key={i}>
          <RicePaddy position={[-4.5, 0, z]} width={5.0} depth={8} stalkSpacing={i < 2 ? 0.8 : i < 3 ? 1.5 : 0} />
          <RicePaddy position={[4.5, 0, z]} width={5.0} depth={8} stalkSpacing={i < 2 ? 0.8 : i < 3 ? 1.5 : 0} />
        </group>
      ))}

      {/* Korean countryside roadside markers */}
      <JangseungPair position={[-1.85, 0, -7]} />
      <Sotdae position={[2.4, 0, -6]} />
      <StoneCairn position={[1.7, 0, -10]} />
      <PersimmonTree position={[-3.8, 0, -7.5]} />
      {/* A second set further down, so the camera has landmarks to pass. */}
      <JangseungPair position={[2.0, 0, -19]} />
      <Sotdae position={[-2.5, 0, -16]} />
      <StoneCairn position={[-1.8, 0, -24]} />
      <PersimmonTree position={[4.0, 0, -21]} />

      {/* Rice straw harvest bundles catching the sunset */}
      <RiceStrawStack position={[-2.5, 0, -3]} scale={0.9} />
      <RiceStrawStack position={[3.2, 0, -5.5]} scale={1.0} />
      <RiceStrawStack position={[-4.1, 0, -9]} scale={0.85} />
      <RiceStrawStack position={[3.6, 0, -9.5]} scale={0.95} />
      <RiceStrawStack position={[-3.4, 0, -14]} scale={0.9} />
      <RiceStrawStack position={[3.0, 0, -17.5]} scale={0.95} />
      <RiceStrawStack position={[-4.3, 0, -22]} scale={0.85} />
      <RiceStrawStack position={[2.7, 0, -26]} scale={0.9} />

      {/* Nature, trees */}
      <DistantTrees />
      <WoodenFence />

      {/* Glowing amber parent + child holding hands, walking the road */}
      <HandHoldingPair />

      {/* Atmosphere & details (the Act 1 Scene1 backdrop provides mountains,
          cranes, blossoms, stars, moon — rendered behind the Canvas) */}
      <Fireflies />
      {/* Pollen and dust hanging in the low sun — the thing that makes a
          golden-hour shot read as air rather than as clean geometry. */}
      <SeededSparkles seed={34} count={70} scale={[26, 5, 34]} size={2.6} speed={0.12}
        color="#FFD9A0" opacity={0.5} position={[0, 2.2, -9]} />
      <SeededSparkles seed={35} count={40} scale={[14, 2.5, 12]} size={3.4} speed={0.1}
        color="#FFC780" opacity={0.4} position={[1.5, 1.2, 1]} />
      <ForegroundGrass />
      <Wildflowers />
    </>
  )
}

/* ─── Main export ───────────────────────────────────────────────── */
export default function Act3_1() {
  useEffect(() => {
    const prev = document.body.style.background
    document.body.style.background = '#080E1F'
    return () => { document.body.style.background = prev }
  }, [])

  return (
    <div style={{
      width: '100%',
      height: '100%',
      minHeight: '100vh',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'hidden',
      zIndex: 9999,
    }}>
      {/* Act 1 backdrop — literally pulled from the opening scene (mountains,
          moon, stars, cranes, blossoms, waves, clouds). Landscape-only variant
          without the decorative frame, so the 3.1 foreground stays clean. */}
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}>
        <Act1Backdrop showBlossoms={false} mountainBlur={3} atmosphere="sunset" />
      </div>
      <SceneCanvas
        shadows
        style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'transparent' }}
        camera={{
          position: [0.3, 1.45, 8.5],
          fov: 42,
          near: 0.3,
          far: 220,
        }}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
        onCreated={({ camera, gl }) => {
          camera.lookAt(0, 2.2, -10)
          gl.setClearColor(0x000000, 0)
        }}
      >
        <SceneContent />
        <EffectComposer>
          <Bloom
            intensity={0.75}
            luminanceThreshold={0.62}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.15} darkness={0.6} />
        </EffectComposer>
      </SceneCanvas>
    </div>
  )
}
