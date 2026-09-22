/**
 * CharSilhouette — Variation 2: Silhouette / Paper-Cut Figure
 *
 * A flat human silhouette with dramatic backlight rim glow.
 * Inspired by Korean shadow puppetry (geurimmja nori / 그림자놀이).
 * The figure is near-black from the front, with a beautiful golden
 * rim/halo around the edges created by a strong backlight + bloom.
 */

import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { DebugCamera } from '../DebugCamera'

/* ─── Colors ─────────────────────────────────────────────────────── */
const GOLD = '#D4A843'
const BACKLIGHT_GOLD = '#F5C36C'
const BG_DARK = '#050A14'

/* ─── Silhouette Figure ──────────────────────────────────────────── */
function SilhouetteFigure() {
  const groupRef = useRef<THREE.Group>(null!)
  const headRef = useRef<THREE.Group>(null!)
  const upperBodyRef = useRef<THREE.Group>(null!)

  // Idle "vibe" animation — gentle sway, breathing, head movement
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (groupRef.current) {
      // Gentle lateral sway (whole body)
      groupRef.current.position.x = Math.sin(t * 0.5) * 0.012
      // Breathing — subtle vertical
      groupRef.current.position.y = Math.sin(t * 0.8) * 0.008
      // Very slight body rotation (vibing)
      groupRef.current.rotation.z = Math.sin(t * 0.6) * 0.015
      groupRef.current.rotation.y = Math.sin(t * 0.35) * 0.03
    }
    if (headRef.current) {
      // Independent head tilt/nod
      headRef.current.rotation.z = Math.sin(t * 0.7 + 0.5) * 0.04
      headRef.current.rotation.x = Math.sin(t * 0.45 + 1.0) * 0.02
    }
    if (upperBodyRef.current) {
      // Slight upper body lean with different phase
      upperBodyRef.current.rotation.z = Math.sin(t * 0.55 + 0.8) * 0.01
    }
  })

  // Dark front material — the silhouette body
  const darkMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#080808',
        roughness: 0.95,
        metalness: 0.0,
      }),
    []
  )

  // Gold rim material — BackSide rendering on a slightly larger mesh
  const glowMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: GOLD,
        emissive: GOLD,
        emissiveIntensity: 0.5,
        roughness: 0.3,
        metalness: 0.2,
        side: THREE.BackSide,
      }),
    []
  )

  type PartDef = {
    geo: THREE.BufferGeometry
    pos: [number, number, number]
    rot?: [number, number, number]
    rimScale?: number
  }

  const parts: PartDef[] = useMemo(() => {
    return [
      // Head
      {
        geo: new THREE.SphereGeometry(0.14, 32, 32),
        pos: [0, 1.7, 0],
        rot: [0, 0, 0.05],
        rimScale: 1.12,
      },
      // Neck
      {
        geo: new THREE.CylinderGeometry(0.04, 0.05, 0.1, 16),
        pos: [0, 1.55, 0],
        rimScale: 1.25,
      },
      // Torso
      {
        geo: new THREE.CylinderGeometry(0.12, 0.14, 0.45, 16),
        pos: [0, 1.25, 0],
        rimScale: 1.08,
      },
      // Hips
      {
        geo: new THREE.CylinderGeometry(0.14, 0.11, 0.15, 16),
        pos: [0, 0.97, 0],
        rimScale: 1.08,
      },
      // Left upper arm
      {
        geo: new THREE.CylinderGeometry(0.035, 0.03, 0.28, 12),
        pos: [-0.19, 1.35, 0],
        rot: [0, 0, 0.15],
        rimScale: 1.25,
      },
      // Left forearm
      {
        geo: new THREE.CylinderGeometry(0.03, 0.025, 0.26, 12),
        pos: [-0.22, 1.08, 0],
        rot: [0, 0, 0.08],
        rimScale: 1.3,
      },
      // Right upper arm
      {
        geo: new THREE.CylinderGeometry(0.035, 0.03, 0.28, 12),
        pos: [0.19, 1.35, 0],
        rot: [0, 0, -0.15],
        rimScale: 1.25,
      },
      // Right forearm
      {
        geo: new THREE.CylinderGeometry(0.03, 0.025, 0.26, 12),
        pos: [0.22, 1.08, 0],
        rot: [0, 0, -0.08],
        rimScale: 1.3,
      },
      // Left thigh
      {
        geo: new THREE.CylinderGeometry(0.06, 0.045, 0.38, 12),
        pos: [-0.07, 0.7, 0],
        rot: [0, 0, 0.03],
        rimScale: 1.15,
      },
      // Left shin
      {
        geo: new THREE.CylinderGeometry(0.04, 0.035, 0.38, 12),
        pos: [-0.08, 0.33, 0],
        rot: [0, 0, 0.01],
        rimScale: 1.2,
      },
      // Right thigh
      {
        geo: new THREE.CylinderGeometry(0.06, 0.045, 0.38, 12),
        pos: [0.07, 0.7, 0],
        rot: [0, 0, -0.03],
        rimScale: 1.15,
      },
      // Right shin
      {
        geo: new THREE.CylinderGeometry(0.04, 0.035, 0.38, 12),
        pos: [0.08, 0.33, 0],
        rot: [0, 0, -0.01],
        rimScale: 1.2,
      },
      // Left hand
      {
        geo: new THREE.SphereGeometry(0.03, 12, 12),
        pos: [-0.23, 0.94, 0],
        rimScale: 1.4,
      },
      // Right hand
      {
        geo: new THREE.SphereGeometry(0.03, 12, 12),
        pos: [0.23, 0.94, 0],
        rimScale: 1.4,
      },
      // Left foot
      {
        geo: new THREE.BoxGeometry(0.06, 0.03, 0.1),
        pos: [-0.08, 0.13, 0.02],
        rimScale: 1.35,
      },
      // Right foot
      {
        geo: new THREE.BoxGeometry(0.06, 0.03, 0.1),
        pos: [0.08, 0.13, 0.02],
        rimScale: 1.35,
      },
    ]
  }, [])

  // Emissive material for lattice cutout dots — bright gold glow that catches bloom
  const cutoutMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#FFD470',
        emissive: '#FFD470',
        emissiveIntensity: 2.5,
        roughness: 0.1,
        metalness: 0.0,
      }),
    []
  )

  // Korean lattice (격자) pattern cutouts in the torso
  // Glowing dots/shapes on the torso surface that simulate backlight peeking through
  const latticeCutouts = useMemo(() => {
    const cutouts: { pos: [number, number, number]; scale: number }[] = []
    const zFront = 0.13 // push to front surface of torso cylinder (radius ~0.13)

    // Diamond lattice pattern on the torso (y: 1.05 to 1.45)
    // Row 1 (top of torso — shoulders)
    cutouts.push({ pos: [0, 1.42, zFront], scale: 0.018 })
    cutouts.push({ pos: [-0.06, 1.42, 0.11], scale: 0.014 })
    cutouts.push({ pos: [0.06, 1.42, 0.11], scale: 0.014 })

    // Row 2
    cutouts.push({ pos: [-0.07, 1.36, 0.10], scale: 0.016 })
    cutouts.push({ pos: [0, 1.36, zFront], scale: 0.016 })
    cutouts.push({ pos: [0.07, 1.36, 0.10], scale: 0.016 })

    // Row 3 — wider
    cutouts.push({ pos: [-0.09, 1.30, 0.09], scale: 0.014 })
    cutouts.push({ pos: [-0.03, 1.30, zFront], scale: 0.018 })
    cutouts.push({ pos: [0.03, 1.30, zFront], scale: 0.018 })
    cutouts.push({ pos: [0.09, 1.30, 0.09], scale: 0.014 })

    // Row 4 — center (largest dot)
    cutouts.push({ pos: [-0.07, 1.24, 0.10], scale: 0.016 })
    cutouts.push({ pos: [0, 1.24, zFront], scale: 0.022 })
    cutouts.push({ pos: [0.07, 1.24, 0.10], scale: 0.016 })

    // Row 5
    cutouts.push({ pos: [-0.09, 1.18, 0.09], scale: 0.014 })
    cutouts.push({ pos: [-0.03, 1.18, zFront], scale: 0.018 })
    cutouts.push({ pos: [0.03, 1.18, zFront], scale: 0.018 })
    cutouts.push({ pos: [0.09, 1.18, 0.09], scale: 0.014 })

    // Row 6
    cutouts.push({ pos: [-0.07, 1.12, 0.10], scale: 0.016 })
    cutouts.push({ pos: [0, 1.12, zFront], scale: 0.016 })
    cutouts.push({ pos: [0.07, 1.12, 0.10], scale: 0.016 })

    // Row 7 (bottom)
    cutouts.push({ pos: [0, 1.06, zFront], scale: 0.018 })
    cutouts.push({ pos: [-0.06, 1.06, 0.11], scale: 0.014 })
    cutouts.push({ pos: [0.06, 1.06, 0.11], scale: 0.014 })

    // Connecting lines — glowing bars between dots (vertical)
    const lines: { pos: [number, number, number]; size: [number, number, number] }[] = []
    const zLine = zFront - 0.005
    // Vertical spine
    lines.push({ pos: [0, 1.39, zLine], size: [0.005, 0.04, 0.005] })
    lines.push({ pos: [0, 1.33, zLine], size: [0.005, 0.04, 0.005] })
    lines.push({ pos: [0, 1.27, zLine], size: [0.005, 0.04, 0.005] })
    lines.push({ pos: [0, 1.21, zLine], size: [0.005, 0.04, 0.005] })
    lines.push({ pos: [0, 1.15, zLine], size: [0.005, 0.04, 0.005] })
    lines.push({ pos: [0, 1.09, zLine], size: [0.005, 0.04, 0.005] })
    // Horizontal bars
    lines.push({ pos: [-0.035, 1.36, zLine], size: [0.06, 0.005, 0.005] })
    lines.push({ pos: [0.035, 1.36, zLine], size: [0.06, 0.005, 0.005] })
    lines.push({ pos: [-0.035, 1.24, zLine], size: [0.06, 0.005, 0.005] })
    lines.push({ pos: [0.035, 1.24, zLine], size: [0.06, 0.005, 0.005] })
    lines.push({ pos: [-0.035, 1.12, zLine], size: [0.06, 0.005, 0.005] })
    lines.push({ pos: [0.035, 1.12, zLine], size: [0.06, 0.005, 0.005] })
    // Diagonal connections (Korean window lattice style)
    lines.push({ pos: [-0.035, 1.30, zLine], size: [0.005, 0.08, 0.005] })
    lines.push({ pos: [0.035, 1.30, zLine], size: [0.005, 0.08, 0.005] })
    lines.push({ pos: [-0.035, 1.18, zLine], size: [0.005, 0.08, 0.005] })
    lines.push({ pos: [0.035, 1.18, zLine], size: [0.005, 0.08, 0.005] })

    return { cutouts, lines }
  }, [])

  // Helper to render a single body part (dark mesh + glow rim)
  const renderPart = (part: PartDef, i: number) => (
    <group key={i} position={part.pos} rotation={part.rot ?? [0, 0, 0]}>
      <mesh geometry={part.geo} material={darkMat} />
      <mesh geometry={part.geo} material={glowMat} scale={part.rimScale ?? 1.1} />
    </group>
  )

  // Split parts into groups: head (0-1), upper body (2-7), lower body (8-15)
  const headParts = parts.slice(0, 2)
  const upperParts = parts.slice(2, 8)
  const lowerParts = parts.slice(8)

  return (
    <group ref={groupRef}>
      {/* Head group — independent subtle nod/tilt */}
      <group ref={headRef}>
        {headParts.map((p, i) => renderPart(p, i))}
      </group>

      {/* Upper body — torso, hips, arms */}
      <group ref={upperBodyRef}>
        {upperParts.map((p, i) => renderPart(p, i + 2))}

        {/* Korean lattice pattern cutouts — glowing dots on the torso */}
        {latticeCutouts.cutouts.map((c, i) => (
          <mesh key={`cutout-${i}`} position={c.pos} material={cutoutMat}>
            <sphereGeometry args={[c.scale, 8, 8]} />
          </mesh>
        ))}

        {/* Lattice connecting lines */}
        {latticeCutouts.lines.map((l, i) => (
          <mesh key={`line-${i}`} position={l.pos} material={cutoutMat}>
            <boxGeometry args={l.size} />
          </mesh>
        ))}
      </group>

      {/* Lower body — legs, feet */}
      {lowerParts.map((p, i) => renderPart(p, i + 8))}
    </group>
  )
}

/* ─── Paper-Cut Mountain Silhouette Layers ───────────────────────── */
/** Creates a mountain ridge shape using extruded geometry */
function MountainLayer({
  z,
  color,
  peaks,
  baseY,
  heightScale,
}: {
  z: number
  color: string
  peaks: { x: number; h: number }[]
  baseY: number
  heightScale: number
}) {
  const geo = useMemo(() => {
    const shape = new THREE.Shape()
    const w = 12 // total width of the mountain plane

    // Start at bottom-left
    shape.moveTo(-w / 2, baseY - 0.5)

    // Build mountain ridge from left to right using smooth curves
    const points: { x: number; y: number }[] = [{ x: -w / 2, y: baseY }]
    for (const pk of peaks) {
      points.push({ x: pk.x, y: baseY + pk.h * heightScale })
    }
    points.push({ x: w / 2, y: baseY })

    // Use quadratic curves through the points for smooth ridgeline
    for (let i = 0; i < points.length; i++) {
      const p = points[i]
      if (i === 0) {
        shape.lineTo(p.x, p.y)
      } else {
        const prev = points[i - 1]
        const cpx = (prev.x + p.x) / 2
        const cpy = Math.max(prev.y, p.y) * 1.05
        shape.quadraticCurveTo(cpx, cpy, p.x, p.y)
      }
    }

    // Close the shape at the bottom
    shape.lineTo(w / 2, baseY - 0.5)
    shape.lineTo(-w / 2, baseY - 0.5)

    const geometry = new THREE.ShapeGeometry(shape, 32)
    return geometry
  }, [peaks, baseY, heightScale])

  return (
    <mesh geometry={geo} position={[0, 0, z]}>
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

/** Three layered paper-cut mountain silhouettes behind the figure */
function PaperCutBackdrop() {
  return (
    <group>
      {/* Layer 1: Closest mountains — very dark navy, z=-2 */}
      <MountainLayer
        z={-2}
        color="#081220"
        baseY={-1.5}
        heightScale={1.0}
        peaks={[
          { x: -4.5, h: 0.7 },
          { x: -3, h: 1.1 },
          { x: -1.5, h: 0.7 },
          { x: -0.5, h: 0.5 },
          { x: 0.8, h: 0.8 },
          { x: 2, h: 1.2 },
          { x: 3.5, h: 0.9 },
          { x: 4.5, h: 0.6 },
        ]}
      />
      {/* Layer 2: Mid-distance — medium blue, z=-4 */}
      <MountainLayer
        z={-4}
        color="#0F2040"
        baseY={-0.5}
        heightScale={1.0}
        peaks={[
          { x: -5, h: 0.9 },
          { x: -3.5, h: 1.4 },
          { x: -2, h: 1.0 },
          { x: -0.3, h: 1.7 },
          { x: 1.5, h: 1.1 },
          { x: 3, h: 1.5 },
          { x: 4.5, h: 0.8 },
        ]}
      />
      {/* Layer 3: Furthest mountains — lighter blue, z=-6 */}
      <MountainLayer
        z={-6}
        color="#1A3260"
        baseY={-0.2}
        heightScale={1.0}
        peaks={[
          { x: -5, h: 1.3 },
          { x: -3, h: 2.0 },
          { x: -1, h: 1.5 },
          { x: 0.5, h: 2.3 },
          { x: 2.5, h: 1.7 },
          { x: 4, h: 2.1 },
          { x: 5.5, h: 1.2 },
        ]}
      />
    </group>
  )
}

function CameraSetup() {
  const { camera } = useThree()
  useEffect(() => {
    camera.lookAt(0, 0.9, 0) // center on figure midpoint (feet ~0.13, head ~1.7)
  }, [camera])
  return null
}

/* ─── Main Component ─────────────────────────────────────────────── */
export default function CharSilhouette() {
  return (
    <div style={{ width: '100%', height: '100%', background: BG_DARK }}>
      <Canvas
        style={{ width: '100%', height: '100%' }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
          preserveDrawingBuffer: true,
        }}
        camera={{ position: [0, 0.85, 4.5], fov: 55, near: 0.1, far: 100 }}
      >
        <DebugCamera />
        {/* Center camera on figure midpoint */}
        <CameraSetup />
        {/* Dark background color */}
        <color attach="background" args={[BG_DARK]} />

        {/* Very dim ambient — silhouette should be almost entirely backlit */}
        <ambientLight intensity={0.03} color="#667799" />

        {/* THE KEY LIGHT: strong backlight from directly behind */}
        <directionalLight
          position={[0, 1.8, -4]}
          intensity={3.0}
          color={BACKLIGHT_GOLD}
        />

        {/* Secondary rim lights from behind-sides for wider rim coverage */}
        <pointLight position={[-1, 1.5, -2.5]} intensity={1.0} color={BACKLIGHT_GOLD} distance={8} />
        <pointLight position={[1, 1.5, -2.5]} intensity={1.0} color={BACKLIGHT_GOLD} distance={8} />

        {/* Subtle warm glow from below-behind */}
        <pointLight position={[0, 0.2, -1.5]} intensity={0.6} color={BACKLIGHT_GOLD} distance={6} />

        <PaperCutBackdrop />
        <SilhouetteFigure />

        <EffectComposer>
          <Bloom
            intensity={1.2}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.1} darkness={0.85} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
