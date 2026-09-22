/**
 * CharStickGold5G — Standalone scene wrapping the shared GoldGlowFigure.
 *
 * Glowing amber figure with keyframe walk cycle; bloom tuned to preserve
 * yellow hue (low-ish threshold, Cineon tone-map, wide radius halo).
 */

import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import type { Mesh, Points } from 'three'
import { DebugCamera } from '../DebugCamera'
import { GoldGlowFigure, GOLD_GLOW_AMBER } from './GoldGlowFigure'

const AMBER = GOLD_GLOW_AMBER
const PEACH = '#FFC7A8'
const AMBIENT = '#6B5878'
const BG = '#1E1A2A'

function GoldParticles() {
  const pointsRef = useRef<Points>(null)
  const COUNT = 35
  const { positions, speeds, phases } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3); const spd = new Float32Array(COUNT); const ph = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) {
      const a = Math.random() * Math.PI * 2; const r = 0.4 + Math.random() * 1.1
      pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = Math.random() * 2.0; pos[i * 3 + 2] = Math.sin(a) * r
      spd[i] = 0.15 + Math.random() * 0.25; ph[i] = Math.random() * Math.PI * 2
    }
    return { positions: pos, speeds: spd, phases: ph }
  }, [])
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3)); return g }, [positions])
  const mat = useMemo(() => new THREE.PointsMaterial({ color: AMBER, size: 0.020, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }), [])
  useFrame(({ clock }) => {
    if (!pointsRef.current) return
    const t = clock.getElapsedTime()
    const arr = (pointsRef.current.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3 + 1] = positions[i * 3 + 1] + Math.sin(t * speeds[i] + phases[i]) * 0.15
      arr[i * 3] = positions[i * 3] + Math.sin(t * 0.3 + phases[i]) * 0.06
      arr[i * 3 + 2] = positions[i * 3 + 2] + Math.cos(t * 0.25 + phases[i]) * 0.06
    }
    ;(pointsRef.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true
  })
  return <points ref={pointsRef} geometry={geo} material={mat} />
}

function GroundGlow() {
  const meshRef = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const s = 1.0 + Math.sin(clock.getElapsedTime() * 0.6) * 0.04
    meshRef.current.scale.set(s, s, 1)
  })
  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0.03]}>
      <circleGeometry args={[0.7, 48]} />
      <meshStandardMaterial color="#2D2438" emissive={AMBER} emissiveIntensity={0.45}
        transparent opacity={0.6} roughness={1} side={THREE.DoubleSide} />
    </mesh>
  )
}

function SceneSetup() {
  const { camera } = useThree()
  useEffect(() => { camera.lookAt(0, 1.0, 0) }, [camera])
  return null
}

export default function CharStickGold5G() {
  return (
    <div style={{ width: '100%', height: '100%', background: BG }}>
      <Canvas
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, toneMapping: THREE.CineonToneMapping, toneMappingExposure: 0.95, preserveDrawingBuffer: true }}
        camera={{ position: [1.8, 1.2, 2.5], fov: 45, near: 0.1, far: 100 }}
      >
        <SceneSetup />
        <DebugCamera />
        <color attach="background" args={[BG]} />
        <fog attach="fog" args={[BG, 5, 16]} />
        <ambientLight color={AMBIENT} intensity={0.55} />
        <directionalLight position={[-2, 3, 3]} color="#FFE7BC" intensity={0.9} castShadow />
        <pointLight position={[1.5, 2.5, 2]} color={AMBER} intensity={0.7} distance={8} decay={2} />
        <pointLight position={[-1, 0.5, 2]} color={PEACH} intensity={0.5} distance={5} decay={2} />
        <pointLight position={[0, 1.5, -2]} color={PEACH} intensity={0.35} distance={6} decay={2} />
        <GoldGlowFigure />
        <GroundGlow />
        <GoldParticles />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#2A2336" roughness={0.95} />
        </mesh>
        <EffectComposer>
          <Bloom intensity={1.1} luminanceThreshold={0.18} luminanceSmoothing={0.9} mipmapBlur radius={0.85} />
          <Vignette eskil={false} offset={0.25} darkness={0.35} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
