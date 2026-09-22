/**
 * Scene 1.1-B — Mountains + Floating Paper Lanterns (2D + 3D hybrid)
 *
 * Same ancient Korean landscape as Scene 1 (reused via Act1Backdrop),
 * with a transparent Three.js layer on top carrying a drift of
 * traditional paper lanterns (청사초롱) rising slowly through the frame.
 * Each lantern is an emissive mesh with a colocated point-light, so the
 * frame's only warm elements become a whole gentle constellation of
 * warmth suspended in depth against the cold indigo mountains.
 *
 * Camera is static for now — push-in / zoom treatment comes later.
 */

import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { DebugCamera } from '../DebugCamera'
import Act1Backdrop from './Act1Backdrop'
import { seededRandom } from '../../utils/svgHelpers'

/* ─── Single lantern ────────────────────────────────────────────── */
function PaperLantern({
  x,
  z,
  phase,
  speed,
  driftAmp,
  driftFreq,
  scale,
  bodyColor,
  emissiveColor,
}: {
  x: number
  z: number
  phase: number
  speed: number
  driftAmp: number
  driftFreq: number
  scale: number
  bodyColor: string
  emissiveColor: string
}) {
  const groupRef = useRef<THREE.Group>(null)

  // Lanterns loop through this vertical range; starting y offset is
  // derived from `phase` so lanterns are spread across the cycle.
  const LOOP_HEIGHT = 9
  const Y_MIN = -1.5

  useFrame(({ clock }) => {
    const g = groupRef.current
    if (!g) return
    const t = clock.getElapsedTime()
    // Rise & wrap
    const raw = ((t * speed + phase * LOOP_HEIGHT) % LOOP_HEIGHT)
    const y = Y_MIN + raw
    // Gentle horizontal drift + subtle bob on top of rise
    const driftX = Math.sin(t * driftFreq + phase * 6.28) * driftAmp
    const bobY = Math.sin(t * 0.8 + phase * 5.0) * 0.03
    g.position.set(x + driftX, y + bobY, z)
  })

  return (
    <group ref={groupRef} scale={scale}>
      {/* Paper body — warm gold emissive sphere, slightly oblong */}
      <mesh scale={[1, 1.3, 1]}>
        <sphereGeometry args={[0.22, 20, 14]} />
        <meshStandardMaterial
          color={bodyColor}
          emissive={emissiveColor}
          emissiveIntensity={4.5}
          transparent
          opacity={0.88}
        />
      </mesh>
      {/* Wooden top + bottom caps */}
      <mesh position={[0, 0.29, 0]}>
        <cylinderGeometry args={[0.065, 0.065, 0.025, 10]} />
        <meshStandardMaterial color="#2A1A10" />
      </mesh>
      <mesh position={[0, -0.29, 0]}>
        <cylinderGeometry args={[0.055, 0.055, 0.025, 10]} />
        <meshStandardMaterial color="#2A1A10" />
      </mesh>
      {/* Thin tassel below */}
      <mesh position={[0, -0.42, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.2, 4]} />
        <meshStandardMaterial color="#8B6D3F" />
      </mesh>
      {/* Point light — gives the lantern real-world light spill */}
      <pointLight
        color={emissiveColor}
        intensity={1.0}
        distance={4}
        decay={2}
      />
    </group>
  )
}

/* ─── Lantern field (procedural drift) ──────────────────────────── */
function LanternField() {
  const lanterns = useMemo(() => {
    const rand = seededRandom(1777)
    const COUNT = 20
    // Slight warm-palette variety — all warm, but not monochrome
    const palette = [
      { body: '#F9DF9E', emissive: '#E8B54C' }, // pure gold
      { body: '#FBE5B0', emissive: '#E6A03A' }, // amber
      { body: '#F5CF8C', emissive: '#D49538' }, // deeper gold
      { body: '#FFE8B8', emissive: '#F0B858' }, // cream-gold
    ]
    const arr: Array<{
      x: number
      z: number
      phase: number
      speed: number
      driftAmp: number
      driftFreq: number
      scale: number
      bodyColor: string
      emissiveColor: string
    }> = []
    for (let i = 0; i < COUNT; i++) {
      const p = palette[Math.floor(rand() * palette.length)]
      arr.push({
        x: (rand() - 0.5) * 11,            // -5.5..5.5 (stays in frame)
        z: -5 + rand() * 4.5,               // -5..-0.5 (all behind focal plane)
        phase: rand(),                      // 0..1
        speed: 0.12 + rand() * 0.12,        // 0.12..0.24 units/sec (slow)
        driftAmp: 0.08 + rand() * 0.10,     // 0.08..0.18
        driftFreq: 0.35 + rand() * 0.5,     // 0.35..0.85 rad/sec
        scale: 0.85 + rand() * 0.45,        // 0.85..1.3 size variety
        bodyColor: p.body,
        emissiveColor: p.emissive,
      })
    }
    return arr
  }, [])

  return (
    <>
      {lanterns.map((l, i) => (
        <PaperLantern key={i} {...l} />
      ))}
    </>
  )
}

/* ─── Main export ───────────────────────────────────────────────── */
export default function Scene1_B() {
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
      {/* 2D SVG landscape — mountains, moon, stars, cranes, blossoms */}
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}>
        <Act1Backdrop />
      </div>
      {/* 3D lantern layer — transparent Canvas on top */}
      <Canvas
        style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'transparent' }}
        camera={{
          position: [0, 1.6, 9],
          fov: 42,
          near: 0.1,
          far: 200,
        }}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
        onCreated={({ camera, gl }) => {
          camera.lookAt(0, 2.0, -10)
          gl.setClearColor(0x000000, 0)
        }}
      >
        <DebugCamera />
        <ambientLight intensity={0.15} color="#2A3550" />
        <LanternField />
        <EffectComposer>
          <Bloom
            intensity={2.4}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.92}
            radius={0.9}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.15} darkness={0.55} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
