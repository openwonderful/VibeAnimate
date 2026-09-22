/**
 * CharParticle — Particle Cloud Figure (Variation 3)
 *
 * Human form made entirely of floating gold particles. Like a person
 * materialized from stardust or a firefly swarm. ~900 particles
 * arranged in human shape with subtle Brownian drift animation.
 */

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, DepthOfField, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { DebugCamera } from '../DebugCamera'

/* ─── Seeded random for deterministic particle placement ────────── */
function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return s / 2147483647
  }
}

/* ─── Generate particle positions + vertex colors ───────────────── */
function generateHumanParticles(): { positions: Float32Array; colors: Float32Array } {
  const rand = seededRandom(42)
  const particles: number[] = []
  const colorData: number[] = []

  // Color palette: bright gold at head → amber at extremities
  const brightGold = new THREE.Color('#FFD700')
  const midGold = new THREE.Color('#D4A843')
  const amber = new THREE.Color('#8B6914')

  // Push color based on body-height (0=feet, 1.82=top of head)
  function pushColor(y: number, isOutlier = false) {
    // Normalize y position: feet (~0.0) to head (~1.82)
    const headCenter = 1.71
    const distFromHead = Math.abs(y - headCenter)
    // 0 at head, 1 at feet
    const t = Math.min(distFromHead / 1.7, 1.0)
    const c = new THREE.Color()
    if (t < 0.3) {
      c.lerpColors(brightGold, midGold, t / 0.3)
    } else {
      c.lerpColors(midGold, amber, (t - 0.3) / 0.7)
    }
    // Outliers are slightly dimmer
    if (isOutlier) {
      c.multiplyScalar(0.6)
    }
    colorData.push(c.r, c.g, c.b)
  }

  // Helper: random point in sphere
  function spherePoint(cx: number, cy: number, cz: number, r: number) {
    const u = rand()
    const v = rand()
    const theta = 2 * Math.PI * u
    const phi = Math.acos(2 * v - 1)
    const rr = r * Math.cbrt(rand())
    const x = cx + rr * Math.sin(phi) * Math.cos(theta)
    const y = cy + rr * Math.cos(phi)
    const z = cz + rr * Math.sin(phi) * Math.sin(theta)
    particles.push(x, y, z)
    pushColor(y)
  }

  // Helper: random point in ellipsoid
  function ellipsoidPoint(cx: number, cy: number, cz: number, rx: number, ry: number, rz: number) {
    const u = rand()
    const v = rand()
    const theta = 2 * Math.PI * u
    const phi = Math.acos(2 * v - 1)
    const rr = Math.cbrt(rand())
    const x = cx + rx * rr * Math.sin(phi) * Math.cos(theta)
    const y = cy + ry * rr * Math.cos(phi)
    const z = cz + rz * rr * Math.sin(phi) * Math.sin(theta)
    particles.push(x, y, z)
    pushColor(y)
  }

  // Helper: random point along a cylinder (tapered)
  function cylinderPoint(
    x1: number, y1: number, z1: number,
    x2: number, y2: number, z2: number,
    r1: number, r2: number
  ) {
    const t = rand()
    const cx = x1 + (x2 - x1) * t
    const cy = y1 + (y2 - y1) * t
    const cz = z1 + (z2 - z1) * t
    const r = r1 + (r2 - r1) * t
    const angle = rand() * 2 * Math.PI
    const rr = r * Math.sqrt(rand())
    const py = cy
    particles.push(cx + rr * Math.cos(angle), py, cz + rr * Math.sin(angle))
    pushColor(py)
  }

  // ── Head: ~80 particles in sphere, radius 0.12 ──
  for (let i = 0; i < 80; i++) {
    spherePoint(0, 1.71, 0, 0.12)
  }

  // ── Neck: ~20 particles, thin cylinder ──
  for (let i = 0; i < 20; i++) {
    cylinderPoint(0, 1.55, 0, 0, 1.6, 0, 0.04, 0.04)
  }

  // ── Torso: ~200 particles, ellipsoid (wider shoulders, narrower waist) ──
  // Upper torso (shoulders) — wider
  for (let i = 0; i < 100; i++) {
    ellipsoidPoint(0, 1.35, 0, 0.22, 0.12, 0.1)
  }
  // Lower torso (waist) — narrower
  for (let i = 0; i < 100; i++) {
    ellipsoidPoint(0, 1.1, 0, 0.15, 0.15, 0.08)
  }

  // ── Left arm: ~80 particles ──
  // Shoulder to elbow
  for (let i = 0; i < 40; i++) {
    cylinderPoint(-0.25, 1.42, 0, -0.38, 1.15, 0, 0.05, 0.04)
  }
  // Elbow to hand
  for (let i = 0; i < 40; i++) {
    cylinderPoint(-0.38, 1.15, 0, -0.42, 0.82, 0.05, 0.04, 0.03)
  }

  // ── Right arm: ~80 particles (mirrored) ──
  for (let i = 0; i < 40; i++) {
    cylinderPoint(0.25, 1.42, 0, 0.38, 1.15, 0, 0.05, 0.04)
  }
  for (let i = 0; i < 40; i++) {
    cylinderPoint(0.38, 1.15, 0, 0.42, 0.82, -0.05, 0.04, 0.03)
  }

  // ── Left leg: ~100 particles ──
  // Hip to knee
  for (let i = 0; i < 50; i++) {
    cylinderPoint(-0.1, 0.95, 0, -0.13, 0.52, 0, 0.06, 0.05)
  }
  // Knee to foot
  for (let i = 0; i < 50; i++) {
    cylinderPoint(-0.13, 0.52, 0, -0.14, 0.05, 0.02, 0.05, 0.04)
  }

  // ── Right leg: ~100 particles (mirrored) ──
  for (let i = 0; i < 50; i++) {
    cylinderPoint(0.1, 0.95, 0, 0.13, 0.52, 0, 0.06, 0.05)
  }
  for (let i = 0; i < 50; i++) {
    cylinderPoint(0.13, 0.52, 0, 0.14, 0.05, -0.02, 0.05, 0.04)
  }

  // ── Floating outliers: ~140 particles scattered near body ──
  for (let i = 0; i < 140; i++) {
    const baseY = rand() * 1.8 + 0.05
    const bodyWidth = baseY > 1.5 ? 0.12 : baseY > 0.9 ? 0.2 : 0.15
    const offsetDist = 0.1 + rand() * 0.2
    const angle = rand() * 2 * Math.PI
    const x = bodyWidth * (rand() - 0.5) + offsetDist * Math.cos(angle) * (rand() > 0.5 ? 1 : -1)
    const z = 0.08 * (rand() - 0.5) + offsetDist * Math.sin(angle) * 0.5
    particles.push(x, baseY, z)
    pushColor(baseY, true)
  }

  return {
    positions: new Float32Array(particles),
    colors: new Float32Array(colorData),
  }
}

/* ─── Generate atmospheric haze particles ───────────────────────── */
function generateHazeParticles(): { positions: Float32Array; colors: Float32Array } {
  const rand = seededRandom(777)
  const particles: number[] = []
  const colorData: number[] = []
  const hazeColor = new THREE.Color('#D4A843')

  for (let i = 0; i < 200; i++) {
    // Distribute around the body center (0, ~0.9, 0)
    const angle = rand() * Math.PI * 2
    const radius = 0.3 + rand() * 0.5
    const y = rand() * 1.9 - 0.1
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    particles.push(x, y, z)

    // Warm dim gold
    const brightness = 0.3 + rand() * 0.3
    colorData.push(
      hazeColor.r * brightness,
      hazeColor.g * brightness,
      hazeColor.b * brightness
    )
  }

  return {
    positions: new Float32Array(particles),
    colors: new Float32Array(colorData),
  }
}

/* ─── Atmospheric Haze layer ────────────────────────────────────── */
function HazeLayer() {
  const posRef = useRef<THREE.BufferAttribute>(null!)

  const { positions, basePositions, colors } = useMemo(() => {
    const data = generateHazeParticles()
    return {
      positions: data.positions,
      basePositions: new Float32Array(data.positions),
      colors: data.colors,
    }
  }, [])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (!posRef.current) return
    const pos = posRef.current.array as Float32Array
    for (let i = 0; i < pos.length; i += 3) {
      const idx = i / 3
      // Slow orbital motion around the figure
      const orbitSpeed = 0.08 + (idx % 5) * 0.02
      const orbitRadius = Math.sqrt(
        basePositions[i] * basePositions[i] + basePositions[i + 2] * basePositions[i + 2]
      )
      const baseAngle = Math.atan2(basePositions[i + 2], basePositions[i])
      const angle = baseAngle + t * orbitSpeed
      pos[i] = Math.cos(angle) * orbitRadius + Math.sin(t * 0.2 + idx) * 0.01
      pos[i + 1] = basePositions[i + 1] + Math.sin(t * 0.15 + idx * 0.5) * 0.03
      pos[i + 2] = Math.sin(angle) * orbitRadius + Math.cos(t * 0.25 + idx) * 0.01
    }
    posRef.current.needsUpdate = true
  })

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          ref={posRef}
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        transparent
        opacity={0.2}
        depthWrite={false}
        sizeAttenuation
        vertexColors
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

/* ─── Particle Figure inner component ───────────────────────────── */
function ParticleFigure() {
  const posRef = useRef<THREE.BufferAttribute>(null!)
  const groupRef = useRef<THREE.Group>(null!)

  const { positions, basePositions, colors } = useMemo(() => {
    const data = generateHumanParticles()
    return {
      positions: data.positions,
      basePositions: new Float32Array(data.positions),
      colors: data.colors,
    }
  }, [])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (!posRef.current) return
    const pos = posRef.current.array as Float32Array
    for (let i = 0; i < pos.length; i += 3) {
      const idx = i / 3
      // --- Visible Brownian shimmer (10x previous amplitude) ---
      const driftX = Math.sin(t * 1.2 + i * 0.37) * 0.0025
                   + Math.sin(t * 2.7 + i * 1.1) * 0.0015
      const driftY = Math.cos(t * 0.9 + i * 0.53) * 0.002
                   + Math.cos(t * 2.1 + i * 0.9) * 0.0012
      const driftZ = Math.sin(t * 1.0 + i * 1.3) * 0.0025
                   + Math.cos(t * 2.5 + i * 0.6) * 0.0015

      // --- "Living cloud" — occasional particles drift further and return ---
      // Use a slow sine per-particle that occasionally peaks, pushing them out
      const wanderPhase = Math.sin(t * 0.3 + idx * 2.47) // -1..1
      // When wanderPhase > 0.7 the particle drifts further (about 15% of particles at any time)
      const wanderAmp = wanderPhase > 0.7
        ? (wanderPhase - 0.7) * 0.06 // up to ~0.018 extra displacement
        : 0
      const wanderX = Math.sin(t * 0.7 + idx * 3.1) * wanderAmp
      const wanderY = Math.cos(t * 0.5 + idx * 1.9) * wanderAmp * 0.6
      const wanderZ = Math.sin(t * 0.6 + idx * 2.3) * wanderAmp

      pos[i]     = basePositions[i]     + driftX + wanderX
      pos[i + 1] = basePositions[i + 1] + driftY + wanderY
      pos[i + 2] = basePositions[i + 2] + driftZ + wanderZ
    }
    posRef.current.needsUpdate = true

    // Group-level animation: breathing + sway + slow rotation
    if (groupRef.current) {
      // Slow rotation
      groupRef.current.rotation.y = Math.sin(t * 0.15) * 0.3
      // Breathing: gentle scale pulse 0.97 – 1.03
      const breath = 1.0 + Math.sin(t * 0.6) * 0.03
      groupRef.current.scale.set(breath, breath, breath)
      // Gentle side-to-side sway
      groupRef.current.position.x = Math.sin(t * 0.4) * 0.05
    }
  })

  return (
    <group ref={groupRef}>
      {/* Primary body particles */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            ref={posRef}
            attach="attributes-position"
            args={[positions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[colors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.035}
          transparent
          opacity={0.9}
          depthWrite={false}
          sizeAttenuation
          vertexColors
        />
      </points>
      {/* Atmospheric haze — larger, dimmer, orbiting */}
      <HazeLayer />
    </group>
  )
}

/* ─── Camera aim at figure centre ────────────────────────────────── */
function SceneSetup() {
  const done = useRef(false)
  useFrame(({ camera }) => {
    if (!done.current) {
      camera.lookAt(0, 0.9, 0)
      done.current = true
    }
  })
  return null
}

/* ─── Main component ─────────────────────────────────────────────── */
export default function CharParticle() {
  return (
    <div style={{ width: '100%', height: '100%', background: '#050A14', position: 'fixed', inset: 0 }}>
      <Canvas
        style={{ width: '100%', height: '100%' }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
          preserveDrawingBuffer: true,
        }}
        camera={{ position: [0, 0.9, 3.5], fov: 50, near: 0.1, far: 100 }}
      >
        <DebugCamera />
        <color attach="background" args={['#050A14']} />
        <SceneSetup />
        <ParticleFigure />
        <EffectComposer>
          <Bloom
            intensity={1.2}
            luminanceThreshold={0.1}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
          <DepthOfField
            focusDistance={0.04}
            focalLength={0.05}
            bokehScale={3}
          />
          <Vignette eskil={false} offset={0.15} darkness={0.5} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
