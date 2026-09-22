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
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Sparkles } from '@react-three/drei'
import { EffectComposer, wrapEffect } from '@react-three/postprocessing'
import { LinocutEffect } from '../../shaders/LinocutEffect'
import * as THREE from 'three'
import { DebugCamera } from '../DebugCamera'
import { GoldGlowFigure } from '../characters/GoldGlowFigure'
import Act1Backdrop from '../act1/Act1Backdrop'

/* ─── Color palette ─────────────────────────────────────────────── */
const DIRT_ROAD = '#9B7B5A'
const PERSIMMON_TRUNK = '#5A3E28'
const PERSIMMON_FRUIT = '#E85520'

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

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const SPEED = 1.2
    const LOOP = 6.0
    const FADE = 0.6 // world units faded at each end of the loop
    const START_Z = -1.5
    const t = clock.getElapsedTime()
    const phase = (t * SPEED) % LOOP // 0..LOOP
    groupRef.current.position.z = START_Z - phase

    // Fade opacity in first FADE and last FADE of each loop so the z-teleport
    // happens while the pair is invisible.
    let alpha = 1
    if (phase < FADE) alpha = phase / FADE
    else if (phase > LOOP - FADE) alpha = (LOOP - phase) / FADE

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

/* ─── Jangseung (장승) — carved wooden totem guardian post ─────── */
// Traditional village-boundary marker. Simplified as: weathered post +
// block-carved head + small hat. Usually paired as "grandfather / grandmother".
function Jangseung({
  position,
  variant = 'grandfather',
}: {
  position: [number, number, number]
  variant?: 'grandfather' | 'grandmother'
}) {
  const eyeColor = '#1A140E'
  const mouthColor = variant === 'grandfather' ? '#C23B22' : '#2A1818'
  const hatColor = variant === 'grandfather' ? '#2A1A10' : '#5A3030'

  return (
    <group position={position}>
      {/* Trunk */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.17, 2.0, 10]} />
        <meshStandardMaterial color="#5A4328" roughness={0.9} />
      </mesh>
      {/* Carved head block */}
      <mesh position={[0, 2.2, 0]} castShadow>
        <boxGeometry args={[0.38, 0.42, 0.36]} />
        <meshStandardMaterial color="#6A4E30" roughness={0.85} />
      </mesh>
      {/* Hat / cap on top */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.22, 0.12, 10]} />
        <meshStandardMaterial color={hatColor} roughness={0.9} />
      </mesh>
      {/* Eyes — tiny dark nooks */}
      {[-0.09, 0.09].map((x, i) => (
        <mesh key={i} position={[x, 2.28, 0.19]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshStandardMaterial color={eyeColor} roughness={1} />
        </mesh>
      ))}
      {/* Mouth — hint of color */}
      <mesh position={[0, 2.08, 0.185]}>
        <boxGeometry args={[0.14, 0.04, 0.01]} />
        <meshStandardMaterial color={mouthColor} roughness={0.9} />
      </mesh>
    </group>
  )
}

function JangseungPair({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <Jangseung position={[0, 0, 0]} variant="grandfather" />
      <Jangseung position={[0.55, 0, -0.15]} variant="grandmother" />
    </group>
  )
}

/* ─── Sotdae (솟대) — tall pole with wooden bird atop ───────────── */
// Shamanic village marker. A slender pole topped with a stylized goose/duck
// that gazes at the horizon — a prayer for bountiful harvest and safe travel.
function Sotdae({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Pole */}
      <mesh position={[0, 1.9, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.05, 3.8, 8]} />
        <meshStandardMaterial color="#4A3520" roughness={0.9} />
      </mesh>
      {/* Bird body */}
      <mesh position={[0.03, 3.88, 0.12]} rotation={[0, 0, 0.1]} castShadow>
        <sphereGeometry args={[0.11, 14, 10]} />
        <meshStandardMaterial color="#6A5538" roughness={0.85} />
        {/* Stretch on z for elongated body */}
      </mesh>
      {/* Bird neck — short diagonal */}
      <mesh position={[0.09, 3.95, 0.22]} rotation={[0.3, 0, 0.2]} castShadow>
        <cylinderGeometry args={[0.028, 0.035, 0.14, 8]} />
        <meshStandardMaterial color="#6A5538" roughness={0.85} />
      </mesh>
      {/* Bird head */}
      <mesh position={[0.13, 4.02, 0.28]} castShadow>
        <sphereGeometry args={[0.055, 10, 10]} />
        <meshStandardMaterial color="#6A5538" roughness={0.85} />
      </mesh>
      {/* Beak */}
      <mesh position={[0.2, 4.0, 0.33]} rotation={[0, -0.5, 0]} castShadow>
        <coneGeometry args={[0.022, 0.08, 6]} />
        <meshStandardMaterial color="#C8A060" roughness={0.7} />
      </mesh>
    </group>
  )
}

/* ─── Stone cairn (서낭당) — travelers' prayer pile ─────────────── */
// A pile of stones by the roadside; each traveler adds one for safe passage.
function StoneCairn({ position }: { position: [number, number, number] }) {
  const stones = useMemo(() => {
    // Deterministic stack of stones, roughly conical.
    const out: { x: number; y: number; z: number; rx: number; ry: number; rz: number; r: number }[] = []
    const rows = [
      { count: 5, y: 0.06, spread: 0.28 },
      { count: 4, y: 0.18, spread: 0.22 },
      { count: 3, y: 0.30, spread: 0.16 },
      { count: 2, y: 0.40, spread: 0.10 },
      { count: 1, y: 0.50, spread: 0.0 },
    ]
    let seed = 0
    const r = () => {
      const s = Math.sin(seed++ * 12.9898) * 43758.5453
      return s - Math.floor(s)
    }
    for (const row of rows) {
      for (let i = 0; i < row.count; i++) {
        const a = (i / row.count) * Math.PI * 2 + r() * 0.5
        const rad = row.spread * (0.5 + r() * 0.5)
        out.push({
          x: Math.cos(a) * rad,
          y: row.y,
          z: Math.sin(a) * rad,
          rx: r() * 0.8, ry: r() * Math.PI, rz: r() * 0.8,
          r: 0.075 + r() * 0.05,
        })
      }
    }
    return out
  }, [])

  return (
    <group position={position}>
      {stones.map((s, i) => (
        <mesh key={i}
          position={[s.x, s.y, s.z]}
          rotation={[s.rx, s.ry, s.rz]}
          castShadow receiveShadow>
          <dodecahedronGeometry args={[s.r, 0]} />
          <meshStandardMaterial color="#706860" roughness={0.92} />
        </mesh>
      ))}
    </group>
  )
}

/* ─── Rice straw stack (볏가리) — harvest bundle in the paddy ──── */
// Conical stack of harvested rice straw. Warm-emissive-tinted so the
// sunset picks them out like lanterns in the field.
function RiceStrawStack({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      {/* Main straw cone */}
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <coneGeometry args={[0.45, 1.1, 12, 1, true]} />
        <meshStandardMaterial
          color="#C89A42"
          emissive="#8B6A20"
          emissiveIntensity={0.25}
          roughness={0.95}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Secondary inner cone — gives depth + catches light at tip */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <coneGeometry args={[0.28, 0.7, 10]} />
        <meshStandardMaterial
          color="#D4AC5C"
          emissive="#A07828"
          emissiveIntensity={0.3}
          roughness={0.9}
        />
      </mesh>
      {/* Base ring at the ground */}
      <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.48, 0.5, 0.08, 14]} />
        <meshStandardMaterial color="#8B6A3A" roughness={0.95} />
      </mesh>
    </group>
  )
}


/* ─── Persimmon tree ────────────────────────────────────────────── */
function PersimmonTree({ position }: { position: [number, number, number] }) {
  const fruits = useMemo(() => {
    const out: { pos: [number, number, number]; size: number }[] = []
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2 + i * 0.5
      const r = 0.3 + (i % 4) * 0.22
      const y = 3.0 + Math.sin(i * 1.7) * 0.5 - (i % 3) * 0.15
      out.push({ pos: [Math.cos(angle) * r, y, Math.sin(angle) * r], size: 0.055 + (i % 3) * 0.015 })
    }
    return out
  }, [])

  return (
    <group position={position}>
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.12, 2.4, 8]} />
        <meshStandardMaterial color={PERSIMMON_TRUNK} roughness={0.9} />
      </mesh>
      {[
        { p: [-0.4, 2.4, 0] as const, r: [0, 0, -0.6] as const, l: 1.2 },
        { p: [0.35, 2.5, 0.15] as const, r: [0, 0.3, 0.5] as const, l: 1.1 },
        { p: [-0.2, 2.8, -0.3] as const, r: [-0.3, 0, -0.4] as const, l: 0.9 },
        { p: [0.1, 2.6, 0.3] as const, r: [0.4, 0, 0.3] as const, l: 1.0 },
      ].map((b, i) => (
        <mesh key={i} position={[...b.p]} rotation={[...b.r]} castShadow>
          <cylinderGeometry args={[0.02, 0.04, b.l, 6]} />
          <meshStandardMaterial color={PERSIMMON_TRUNK} roughness={0.9} />
        </mesh>
      ))}
      {/* Canopy cluster */}
      {[
        { p: [0, 3.0, 0] as const, s: 0.85 },
        { p: [-0.3, 2.8, 0.2] as const, s: 0.6 },
        { p: [0.35, 2.9, -0.15] as const, s: 0.55 },
      ].map((c, i) => (
        <mesh key={i} position={[...c.p]} castShadow>
          <sphereGeometry args={[c.s, 16, 12]} />
          <meshStandardMaterial
            color={i === 0 ? '#2A4A15' : '#335A1A'}
            roughness={0.85}
            transparent
            opacity={0.8}
          />
        </mesh>
      ))}
      {fruits.map((f, i) => (
        <Float key={i} speed={0.5 + (i % 3) * 0.2} floatIntensity={0.02}>
          <mesh position={f.pos} castShadow>
            <sphereGeometry args={[f.size, 10, 10]} />
            <meshStandardMaterial
              color={PERSIMMON_FRUIT}
              emissive={PERSIMMON_FRUIT}
              emissiveIntensity={0.35}
              roughness={0.5}
            />
          </mesh>
        </Float>
      ))}
    </group>
  )
}

/* ─── Rice paddy ────────────────────────────────────────────────── */
function RicePaddy({
  position,
  width,
  depth,
}: {
  position: [number, number, number]
  width: number
  depth: number
}) {
  const waterRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!waterRef.current) return
    const mat = waterRef.current.material as THREE.MeshStandardMaterial
    mat.roughness = 0.12 + Math.sin(clock.getElapsedTime() * 0.5) * 0.04
  })

  const stalks = useMemo(() => {
    const out: { x: number; z: number; h: number; rot: number }[] = []
    const rows = Math.floor(depth / 0.45)
    const cols = Math.floor(width / 0.45)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        out.push({
          x: (c - cols / 2) * 0.45 + (r % 2) * 0.22,
          z: (r - rows / 2) * 0.45,
          h: 0.2 + Math.sin(r * 3.7 + c * 2.1) * 0.05,
          rot: Math.sin(r * 1.3 + c * 0.7) * 0.15,
        })
      }
    }
    return out
  }, [width, depth])

  return (
    <group position={position}>
      {/* Earth berm */}
      <mesh position={[0, 0.04, 0]} receiveShadow>
        <boxGeometry args={[width + 0.1, 0.08, depth + 0.1]} />
        <meshStandardMaterial color="#5A6B30" roughness={0.95} />
      </mesh>
      {/* Water surface — base layer with warm tone */}
      <mesh ref={waterRef} position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          color="#5A6A78"
          roughness={0.12}
          metalness={0.85}
          envMapIntensity={2.0}
          transparent
          opacity={0.85}
        />
      </mesh>
      {/* Sunset reflection — warm orange covering the water */}
      <mesh position={[0, 0.085, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial
          color="#CC7722"
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* Brighter golden band in center of paddy (sky reflection) */}
      <mesh position={[0, 0.086, -depth * 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width * 0.5, depth * 0.4]} />
        <meshBasicMaterial
          color="#FFBB44"
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* Rice stalks */}
      {stalks.map((s, i) => (
        <mesh key={i} position={[s.x, s.h / 2 + 0.08, s.z]} rotation={[0, i * 1.3, s.rot]}>
          <cylinderGeometry args={[0.004, 0.006, s.h, 4]} />
          <meshStandardMaterial color="#7A9A40" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

/* ─── Dirt road with perspective ────────────────────────────────── */
function DirtRoad() {
  const roadShape = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-2.0, -8)
    s.lineTo(2.0, -8)
    s.lineTo(0.6, 12)
    s.lineTo(-0.6, 12)
    s.closePath()
    return s
  }, [])

  return (
    <group>
      <mesh position={[0, 0.02, 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <shapeGeometry args={[roadShape]} />
        <meshStandardMaterial color={DIRT_ROAD} roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

/* ─── Ground ────────────────────────────────────────────────────── */
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color="#4A5528" roughness={1.0} />
    </mesh>
  )
}

/* ─── Fireflies ─────────────────────────────────────────────────── */
function Fireflies() {
  return (
    <>
      <Sparkles count={50} scale={[20, 3, 20]} size={4} speed={0.3} color="#FFD866" opacity={0.6} position={[0, 1.2, -4]} />
      <Sparkles count={20} scale={[10, 2, 6]} size={5} speed={0.25} color="#FFCC44" opacity={0.5} position={[0, 0.8, 3]} />
      <Sparkles count={25} scale={[8, 2, 8]} size={3} speed={0.2} color="#FFAA33" opacity={0.4} position={[0, 0.6, -10]} />
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
      {Array.from({ length: 8 }, (_, i) => {
        const z = -10 + i * 2
        return (
          <group key={i}>
            <mesh position={[0, 0.25, z]} castShadow>
              <cylinderGeometry args={[0.03, 0.035, 0.5, 6]} />
              <meshStandardMaterial color="#6A5535" roughness={0.9} />
            </mesh>
            {i < 7 && (
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
    Array.from({ length: 40 }, (_, i) => ({
      x: -8 + (i % 12) * 1.4 + Math.sin(i * 3.7) * 0.5,
      z: 6 + Math.floor(i / 12) * 1.2 + Math.sin(i * 2.1) * 0.3,
      h: 0.18 + Math.sin(i * 1.3) * 0.1,
      rot: Math.sin(i * 0.7) * 0.2,
    })),
  [])

  return (
    <group>
      {tufts.map((t, i) => (
        <mesh key={i} position={[t.x, t.h / 2, t.z]} rotation={[0, i * 0.8, t.rot]}>
          <cylinderGeometry args={[0.003, 0.012, t.h, 4]} />
          <meshStandardMaterial color="#5A7A30" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

/* ─── Wildflowers along the road edges ──────────────────────────── */
function Wildflowers() {
  const flowers = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      x: (i % 2 === 0 ? -1 : 1) * (1.8 + Math.sin(i * 2.3) * 0.4),
      z: -6 + i * 0.8 + Math.sin(i * 1.7) * 0.3,
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
            <cylinderGeometry args={[0.004, 0.004, f.h, 4]} />
            <meshStandardMaterial color="#5A7A30" roughness={0.9} />
          </mesh>
          {/* Flower head */}
          <mesh position={[0, f.h + 0.02, 0]}>
            <sphereGeometry args={[0.02, 8, 8]} />
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

/* ─── Scene content ─────────────────────────────────────────────── */
function SceneContent() {
  return (
    <>
      {/* Lighting — golden hour. Low, warm directional sun rakes across the
          scene from the upper right (matching the backdrop's sun position),
          with a warm amber ambient fill so shadows stay honey-toned. */}
      <ambientLight intensity={0.6} color="#EFA868" />
      <hemisphereLight intensity={0.4} color="#FFCC80" groundColor="#5E3820" />
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
      <RicePaddy position={[-4.5, 0, -4]} width={5.0} depth={12} />
      <RicePaddy position={[4.5, 0, -4]} width={5.0} depth={12} />
      <RicePaddy position={[-3.8, 0, 5]} width={4.0} depth={5} />
      <RicePaddy position={[3.8, 0, 5]} width={4.0} depth={5} />

      {/* Korean countryside roadside markers */}
      <JangseungPair position={[-1.85, 0, -7]} />
      <Sotdae position={[2.4, 0, -6]} />
      <StoneCairn position={[1.7, 0, -10]} />
      <PersimmonTree position={[-3.8, 0, -7.5]} />

      {/* Rice straw harvest bundles catching the sunset */}
      <RiceStrawStack position={[-2.5, 0, -3]} scale={0.9} />
      <RiceStrawStack position={[3.2, 0, -5.5]} scale={1.0} />
      <RiceStrawStack position={[-4.1, 0, -9]} scale={0.85} />
      <RiceStrawStack position={[3.6, 0, -9.5]} scale={0.95} />

      {/* Nature, trees */}
      <DistantTrees />
      <WoodenFence />

      {/* Glowing amber parent + child holding hands, walking the road */}
      <HandHoldingPair />

      {/* Atmosphere & details (the Act 1 Scene1 backdrop provides mountains,
          cranes, blossoms, stars, moon — rendered behind the Canvas) */}
      <Fireflies />
      <ForegroundGrass />
      <Wildflowers />
    </>
  )
}

/* ─── Main export ───────────────────────────────────────────────── */
const Linocut = wrapEffect(LinocutEffect, {
  scale: 0.85,
  noiseScale: 0.1,
  rotation: 0,
  center: [0.5, 0.5],
})

export default function Act3_1_Linocut() {
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
      <Canvas
        shadows
        style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'transparent' }}
        camera={{
          position: [0.3, 1.45, 8.5],
          fov: 42,
          near: 0.1,
          far: 300,
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
        <DebugCamera />
        <SceneContent />
        <EffectComposer>
          <Linocut />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
