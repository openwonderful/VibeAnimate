/**
 * CharCrystal — Geometric/Crystal Figure (Variation 1)
 *
 * Low-poly faceted humanoid built from basic Three.js geometries with
 * flat shading. Crystal golem / gem construct aesthetic.
 *
 * v4 final: MeshPhysicalMaterial with transmission for glass-crystal hybrid,
 * floating crystal shards, inner glow core, ambient sparkle dust,
 * head crown glow, enhanced 6-light rig.
 */

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { DebugCamera } from '../DebugCamera'

const BG = '#0A0E1A'

/* ─── Physical crystal material (glass-crystal hybrid) ───────────── */
function useCrystalMaterial() {
  return useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#D4A843'),
      emissive: new THREE.Color('#D4A843'),
      emissiveIntensity: 0.35,
      roughness: 0.1,
      metalness: 0.3,
      flatShading: true,
      transmission: 0.3,
      ior: 1.5,
      thickness: 0.5,
      transparent: true,
      opacity: 0.92,
    })
  }, [])
}

/* ─── Opaque gold core material (for inner glow) ─────────────────── */
function useCoreMaterial() {
  return useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#FFD060'),
      emissive: new THREE.Color('#FFB844'),
      emissiveIntensity: 1.2,
      roughness: 0.4,
      metalness: 0.1,
    })
  }, [])
}

/* ─── Floating crystal shards ────────────────────────────────────── */
const SHARD_COUNT = 8

interface ShardDef {
  radius: number
  height: number
  speed: number
  phase: number
  size: number
  bobSpeed: number
  bobAmp: number
}

function FloatingShards() {
  const mat = useCrystalMaterial()

  // Seeded random for deterministic layout
  const shards = useMemo<ShardDef[]>(() => {
    let seed = 77
    const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    const out: ShardDef[] = []
    for (let i = 0; i < SHARD_COUNT; i++) {
      out.push({
        radius: 0.55 + rand() * 0.55,
        height: 0.5 + rand() * 1.3,
        speed: 0.25 + rand() * 0.45,
        phase: (i / SHARD_COUNT) * Math.PI * 2,
        size: 0.02 + rand() * 0.04,
        bobSpeed: 0.8 + rand() * 1.6,
        bobAmp: 0.03 + rand() * 0.06,
      })
    }
    return out
  }, [])

  const meshRefs = useRef<(THREE.Mesh | null)[]>([])

  const geos = useMemo(() =>
    shards.map(s => new THREE.IcosahedronGeometry(s.size, 0)),
  [shards])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    shards.forEach((s, i) => {
      const mesh = meshRefs.current[i]
      if (!mesh) return
      const angle = s.phase + t * s.speed
      mesh.position.x = Math.cos(angle) * s.radius
      mesh.position.z = Math.sin(angle) * s.radius
      mesh.position.y = s.height + Math.sin(t * s.bobSpeed + s.phase) * s.bobAmp
      mesh.rotation.x = t * 0.5 + s.phase
      mesh.rotation.z = t * 0.3 + s.phase * 2
    })
  })

  return (
    <group>
      {shards.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => { meshRefs.current[i] = el }}
          geometry={geos[i]}
          material={mat}
        />
      ))}
    </group>
  )
}

/* ─── Inner glow core (visible through translucent crystal shell) ── */
function InnerCore() {
  const coreRef = useRef<THREE.Mesh>(null!)
  const coreMat = useCoreMaterial()

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (coreRef.current) {
      const pulse = 1 + Math.sin(t * 2) * 0.12
      coreRef.current.scale.setScalar(pulse)
    }
  })

  return (
    <mesh ref={coreRef} position={[0, 1.15, 0]}>
      <icosahedronGeometry args={[0.1, 1]} />
      <primitive object={coreMat} attach="material" />
    </mesh>
  )
}

/* ─── Head crown glow (small emissive ring above head) ───────────── */
function HeadCrown() {
  const crownRef = useRef<THREE.Mesh>(null!)
  const crownMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color('#FFD060'),
    emissive: new THREE.Color('#FFB844'),
    emissiveIntensity: 1.0,
    transparent: true,
    opacity: 0.6,
  }), [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (crownRef.current) {
      crownRef.current.rotation.y = t * 0.3
      const pulse = 1 + Math.sin(t * 1.8 + 1) * 0.08
      crownRef.current.scale.setScalar(pulse)
    }
  })

  return (
    <mesh ref={crownRef} position={[0, 1.88, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.08, 0.012, 6, 6]} />
      <primitive object={crownMat} attach="material" />
    </mesh>
  )
}

/* ─── Crystal Figure ─────────────────────────────────────────────── */
function CrystalFigure() {
  const groupRef = useRef<THREE.Group>(null!)
  const torsoRef = useRef<THREE.Mesh>(null!)
  const mat = useCrystalMaterial()

  useFrame((state) => {
    const t = state.clock.elapsedTime
    // Slow Y rotation
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.1
    }
    // Subtle breathing on torso
    if (torsoRef.current) {
      const breath = 1 + Math.sin(t * 1.5) * 0.02
      torsoRef.current.scale.set(0.6 * breath, 1.5 * breath, 0.4 * breath)
    }
  })

  // Memoize geometries
  const geos = useMemo(() => ({
    head: new THREE.IcosahedronGeometry(0.14, 0),
    neck: new THREE.OctahedronGeometry(0.05, 0),
    torso: new THREE.OctahedronGeometry(0.3, 0),
    shoulder: new THREE.TetrahedronGeometry(0.12, 0),
    upperArm: new THREE.OctahedronGeometry(0.06, 0),
    elbowJoint: new THREE.IcosahedronGeometry(0.04, 0),
    forearm: new THREE.OctahedronGeometry(0.05, 0),
    hand: new THREE.DodecahedronGeometry(0.04, 0),
    pelvis: new THREE.OctahedronGeometry(0.08, 0),
    upperLeg: new THREE.OctahedronGeometry(0.07, 0),
    kneeJoint: new THREE.IcosahedronGeometry(0.05, 0),
    lowerLeg: new THREE.OctahedronGeometry(0.06, 0),
    foot: new THREE.DodecahedronGeometry(0.045, 0),
  }), [])

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* ── Inner glow core (in torso) ───────────────────────── */}
      <InnerCore />

      {/* ── Head crown glow ──────────────────────────────────── */}
      <HeadCrown />

      {/* ── Head ─────────────────────────────────────────────── */}
      <mesh geometry={geos.head} material={mat} position={[0, 1.7, 0]} />

      {/* ── Neck ─────────────────────────────────────────────── */}
      <mesh geometry={geos.neck} material={mat} position={[0, 1.58, 0]} scale={[1, 1.5, 1]} />

      {/* ── Torso ────────────────────────────────────────────── */}
      <mesh ref={torsoRef} geometry={geos.torso} material={mat} position={[0, 1.15, 0]} scale={[0.6, 1.5, 0.4]} />

      {/* ── Shoulders ────────────────────────────────────────── */}
      <mesh geometry={geos.shoulder} material={mat} position={[-0.32, 1.48, 0]} rotation={[0, 0, 0.3]} />
      <mesh geometry={geos.shoulder} material={mat} position={[0.32, 1.48, 0]} rotation={[0, 0, -0.3]} />

      {/* ── Left Arm ─────────────────────────────────────────── */}
      <mesh geometry={geos.upperArm} material={mat} position={[-0.38, 1.3, 0]} scale={[0.6, 2.0, 0.6]} />
      <mesh geometry={geos.elbowJoint} material={mat} position={[-0.42, 1.12, 0]} />
      <mesh geometry={geos.forearm} material={mat} position={[-0.45, 0.95, 0]} scale={[0.6, 2.0, 0.6]} />
      <mesh geometry={geos.hand} material={mat} position={[-0.47, 0.78, 0]} />

      {/* ── Right Arm ────────────────────────────────────────── */}
      <mesh geometry={geos.upperArm} material={mat} position={[0.38, 1.3, 0]} scale={[0.6, 2.0, 0.6]} />
      <mesh geometry={geos.elbowJoint} material={mat} position={[0.42, 1.12, 0]} />
      <mesh geometry={geos.forearm} material={mat} position={[0.45, 0.95, 0]} scale={[0.6, 2.0, 0.6]} />
      <mesh geometry={geos.hand} material={mat} position={[0.47, 0.78, 0]} />

      {/* ── Pelvis ───────────────────────────────────────────── */}
      <mesh geometry={geos.pelvis} material={mat} position={[0, 0.72, 0]} scale={[1.5, 0.8, 1]} />

      {/* ── Left Leg ─────────────────────────────────────────── */}
      <mesh geometry={geos.upperLeg} material={mat} position={[-0.14, 0.52, 0]} scale={[0.7, 2.2, 0.7]} />
      <mesh geometry={geos.kneeJoint} material={mat} position={[-0.14, 0.32, 0]} />
      <mesh geometry={geos.lowerLeg} material={mat} position={[-0.14, 0.15, 0]} scale={[0.7, 2.2, 0.7]} />
      <mesh geometry={geos.foot} material={mat} position={[-0.14, 0.0, 0.02]} />

      {/* ── Right Leg ────────────────────────────────────────── */}
      <mesh geometry={geos.upperLeg} material={mat} position={[0.14, 0.52, 0]} scale={[0.7, 2.2, 0.7]} />
      <mesh geometry={geos.kneeJoint} material={mat} position={[0.14, 0.32, 0]} />
      <mesh geometry={geos.lowerLeg} material={mat} position={[0.14, 0.15, 0]} scale={[0.7, 2.2, 0.7]} />
      <mesh geometry={geos.foot} material={mat} position={[0.14, 0.0, 0.02]} />
    </group>
  )
}

/* ─── Lighting rig ───────────────────────────────────────────────── */
function Lighting() {
  return (
    <>
      {/* Cool blue ambient */}
      <ambientLight color="#1A2540" intensity={0.6} />
      {/* Warm golden key light from upper-left */}
      <pointLight
        color="#FFB844"
        intensity={5}
        position={[-3, 4, 2]}
        distance={20}
        decay={2}
      />
      {/* Secondary warm from front-right */}
      <pointLight
        color="#E8920A"
        intensity={2}
        position={[2, 3, 3]}
        distance={15}
        decay={2}
      />
      {/* Cold rim light from behind-right for crystal edge catch */}
      <pointLight
        color="#4488CC"
        intensity={3}
        position={[3, 2, -3]}
        distance={20}
        decay={2}
      />
      {/* Cold rim from behind-left */}
      <pointLight
        color="#2255AA"
        intensity={1.5}
        position={[-2, 1.5, -2.5]}
        distance={15}
        decay={2}
      />
      {/* Subtle warm fill from below for dramatic uplighting */}
      <pointLight
        color="#D4A843"
        intensity={0.8}
        position={[0, -0.5, 1.5]}
        distance={10}
        decay={2}
      />
      {/* Top light for head highlight */}
      <pointLight
        color="#FFFFFF"
        intensity={1.2}
        position={[0, 4, 0]}
        distance={12}
        decay={2}
      />
    </>
  )
}

/* ─── Ground reflection plane ────────────────────────────────────── */
function GroundPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
      <planeGeometry args={[20, 20]} />
      <meshPhysicalMaterial
        color="#080C16"
        roughness={0.3}
        metalness={0.7}
        transparent
        opacity={0.8}
      />
    </mesh>
  )
}

/* ─── Scene background setter + camera aim ───────────────────────── */
function SceneSetup() {
  const done = useRef(false)
  useFrame(({ scene, camera }) => {
    if (!done.current) {
      scene.background = new THREE.Color(BG)
      camera.lookAt(0, 1.0, 0)
      done.current = true
    }
  })
  return null
}

/* ─── Main component ─────────────────────────────────────────────── */
export default function CharCrystal() {
  return (
    <div style={{ width: '100%', height: '100%', background: BG, position: 'fixed', inset: 0 }}>
      <Canvas
        style={{ width: '100%', height: '100%' }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
          preserveDrawingBuffer: true,
        }}
        camera={{ position: [0, 1.15, 3.2], fov: 45, near: 0.1, far: 100 }}
      >
        <DebugCamera />
        <SceneSetup />
        <fog attach="fog" args={[BG, 6, 25]} />
        <Lighting />
        <CrystalFigure />
        <FloatingShards />
        {/* Ambient sparkle dust around the figure */}
        <Sparkles
          count={40}
          scale={3}
          size={1.5}
          speed={0.3}
          color="#D4A843"
          opacity={0.4}
          position={[0, 1.0, 0]}
        />
        <GroundPlane />
        <EffectComposer>
          <Bloom
            intensity={0.8}
            luminanceThreshold={0.3}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.15} darkness={0.5} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
