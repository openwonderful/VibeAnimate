/**
 * "Your Name" comet-scene — faithful procedural reinterpretation.
 *
 * No painted reference plate. Every element — sky gradient, clouds, horizon
 * sun, vertical light pillar, diagonal comet streak, water reflection,
 * foreground rocks, and the two character silhouettes — is built from
 * shaders or canvas-drawn textures and composited in Three.js with heavy
 * bloom. Camera drifts almost imperceptibly so the image reads as a
 * painting that's breathing, not a static still.
 */

import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { DebugCamera, useCameraHandoff } from '../DebugCamera'
import {
  SKY_VERTEX, SKY_FRAGMENT,
  CLOUD_VERTEX, CLOUD_FRAGMENT,
  FLARE_VERTEX, FLARE_FRAGMENT,
  PILLAR_VERTEX, PILLAR_FRAGMENT,
  COMET_VERTEX, COMET_FRAGMENT,
  WATER_VERTEX, WATER_FRAGMENT,
} from './shaders'
import { takiTexture, mitsuhaTexture, rocksTexture } from './characters'

/* ─── Sky backdrop ─────────────────────────────────────────────────── */
function SkyBackdrop() {
  const matRef = useRef<THREE.ShaderMaterial>(null!)
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: SKY_VERTEX,
    fragmentShader: SKY_FRAGMENT,
    uniforms: { uTime: { value: 0 } },
    depthWrite: false,
    toneMapped: false,
  }), [])

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.getElapsedTime()
  })

  return (
    <mesh position={[0, 0, -60]} renderOrder={-100}>
      <planeGeometry args={[140, 80]} />
      <primitive object={material} ref={matRef} attach="material" />
    </mesh>
  )
}

/* ─── Cloud layer — a single painterly band ────────────────────────── */
type CloudBandProps = {
  z: number
  y: number
  width: number
  height: number
  density: number
  stretch: number
  drift: number
  warm: string
  cool: string
  seed: number
}
function CloudBand({ z, y, width, height, density, stretch, drift, warm, cool, seed }: CloudBandProps) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: CLOUD_VERTEX,
    fragmentShader: CLOUD_FRAGMENT,
    uniforms: {
      uTime: { value: 0 },
      uDensity: { value: density },
      uStretch: { value: stretch },
      uDrift:   { value: drift },
      uWarmColor: { value: new THREE.Color(warm) },
      uCoolColor: { value: new THREE.Color(cool) },
      uSeed: { value: seed },
    },
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  }), [density, stretch, drift, warm, cool, seed])

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.getElapsedTime()
  })

  return (
    <mesh position={[0, y, z]}>
      <planeGeometry args={[width, height]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

/* ─── Vertical light pillar — the scene's signature element ───────── */
function LightPillar() {
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: PILLAR_VERTEX,
    fragmentShader: PILLAR_FRAGMENT,
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
  }), [])

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.getElapsedTime()
  })

  return (
    <mesh position={[0, 0, -22]}>
      {/* Tall narrow plane — bloom widens the apparent thickness */}
      <planeGeometry args={[6, 48]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

/* ─── Horizon sun burst — radial + cross flare at the beam's base ─── */
function HorizonBurst() {
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: FLARE_VERTEX,
    fragmentShader: FLARE_FRAGMENT,
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
  }), [])

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.getElapsedTime()
  })

  return (
    <mesh position={[0, -2.0, -24]}>
      <planeGeometry args={[28, 11]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

/* ─── Comet streak — diagonal trail entering from upper sky ───────── */
function CometStreak() {
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: COMET_VERTEX,
    fragmentShader: COMET_FRAGMENT,
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
  }), [])

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.getElapsedTime()
  })

  // Plane is long/thin; rotate so tail enters from upper-left and head
  // points down toward the pillar's apex just above the horizon.
  return (
    <mesh position={[-0.9, 5.5, -26]} rotation={[0, 0, Math.PI / 2 + 0.22]}>
      <planeGeometry args={[22, 2.6]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

/* ─── Sparks — small additive points scattered near comet / pillar ── */
function CometSparks({ count = 40 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null!)

  const { geometry, material, speeds } = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    const sp = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      // Clustered near beam entry point — upper third of frame, center-x
      positions[i * 3]     = (Math.random() - 0.5) * 3.5
      positions[i * 3 + 1] = 2 + Math.random() * 7
      positions[i * 3 + 2] = -20 - Math.random() * 6
      sp[i] = 0.3 + Math.random() * 1.2
    }
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const m = new THREE.PointsMaterial({
      color: '#BFE6FF',
      size: 0.08,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
      toneMapped: false,
    })
    return { geometry: g, material: m, speeds: sp }
  }, [count])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const pos = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < count; i++) {
      const drift = ((t * speeds[i] * 0.15) % 1)
      pos.array[i * 3 + 1] = 2 + ((i * 0.31 + drift) % 1) * 7
    }
    pos.needsUpdate = true
  })

  return <points ref={pointsRef} geometry={geometry} material={material} />
}

/* ─── Water reflection — mirrored sky gradient with rippled beam ──── */
function WaterReflection() {
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: WATER_VERTEX,
    fragmentShader: WATER_FRAGMENT,
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  }), [])

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.getElapsedTime()
  })

  // Positioned below horizon, in front of sky, behind rocks/characters.
  // Large and pushed way down so the top edge hugs the horizon line and
  // the bottom edge extends far past the bottom of the frame.
  return (
    <mesh position={[0, -18, -25]}>
      <planeGeometry args={[80, 34]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

/* ─── Foreground rocks ─────────────────────────────────────────────── */
function Rocks() {
  const texture = useMemo(() => rocksTexture(), [])
  // Big plane whose bottom edge extends past the bottom of the frame so
  // the rock silhouette reads as standing on solid ground, not floating.
  return (
    <mesh position={[0, -1.8, -5.5]}>
      <planeGeometry args={[28, 7]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

/* ─── Character silhouettes ────────────────────────────────────────── */
function Characters() {
  const takiTex   = useMemo(() => takiTexture(), [])
  const mitsuhaTex = useMemo(() => mitsuhaTexture(), [])

  // Feet sit on jagged rock top at world y ≈ -2.15; plane bottom = feet.
  return (
    <group>
      {/* Taki — left, reaching right toward the beam */}
      <mesh position={[-1.05, -0.78, -5]}>
        <planeGeometry args={[1.5, 3.0]} />
        <meshBasicMaterial
          map={takiTex}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Mitsuha — right, slightly smaller / closer to horizon */}
      <mesh position={[0.88, -0.95, -5]}>
        <planeGeometry args={[1.3, 2.6]} />
        <meshBasicMaterial
          map={mitsuhaTex}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

/* ─── Atmospheric haze — warm peach wash across mid-distance ─────── */
function AtmosphericHaze() {
  // A very low-opacity warm plane that sits between the characters and
  // the horizon. It softens the transition from foreground silhouettes to
  // the bright horizon, tying the scene together the way sunset haze does
  // in real landscapes. Without this the scene reads as discrete layers.
  return (
    <mesh position={[0, -0.6, -12]}>
      <planeGeometry args={[50, 14]} />
      <meshBasicMaterial
        color="#FFC490"
        transparent
        opacity={0.10}
        depthWrite={false}
        toneMapped={false}
        blending={THREE.NormalBlending}
      />
    </mesh>
  )
}

/* ─── Subtle camera breathing — almost imperceptible ──────────────── */
function CameraRig() {
  const yieldCamera = useCameraHandoff()
  useFrame(({ camera, clock }) => {
    if (yieldCamera()) return
    const t = clock.getElapsedTime()
    camera.position.x = Math.sin(t * 0.15) * 0.05
    camera.position.y = Math.sin(t * 0.11) * 0.03
    camera.position.z = 6 + Math.sin(t * 0.08) * 0.15
    camera.lookAt(0, -0.2, -20)
  })
  return null
}

/* ─── Main scene ─────────────────────────────────────────────────── */
export default function YourNameReplicateScene() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0A0818' }}>
      <Canvas
        gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
        camera={{ fov: 50, position: [0, 0, 6], near: 0.1, far: 200 }}
      >
        <DebugCamera />

        {/* ── Far background ── */}
        <SkyBackdrop />

        {/* ── Back cloud strata (high, soft mauve wisps) ── */}
        <CloudBand
          z={-48} y={6} width={120} height={28}
          density={0.55} stretch={4.5} drift={0.008}
          warm="#E4B0A8" cool="#9A7A8E" seed={1.3}
        />

        {/* ── Mid clouds — warm orange-lit band hugging horizon ── */}
        <CloudBand
          z={-40} y={-0.2} width={110} height={18}
          density={0.44} stretch={3.0} drift={0.012}
          warm="#FFC28A" cool="#E48F88" seed={4.1}
        />

        {/* ── Water reflection below horizon ── */}
        <WaterReflection />

        {/* ── Comet streak (behind beam) ── */}
        <CometStreak />
        <CometSparks />

        {/* ── Horizon sun burst ── */}
        <HorizonBurst />

        {/* ── Vertical light pillar — signature element ── */}
        <LightPillar />

        {/* ── Foreground cloud wisps in front of pillar for depth ── */}
        <CloudBand
          z={-18} y={-1.1} width={50} height={5}
          density={0.62} stretch={2.2} drift={0.018}
          warm="#FFD8A0" cool="#E49F95" seed={7.7}
        />

        {/* ── Atmospheric haze — ties the image together ── */}
        <AtmosphericHaze />

        {/* ── Rocks and characters ── */}
        <Rocks />
        <Characters />

        <CameraRig />

        <EffectComposer>
          <Bloom
            intensity={0.95}
            luminanceThreshold={0.55}
            luminanceSmoothing={0.5}
            mipmapBlur
            radius={0.92}
          />
          <Vignette eskil={false} offset={0.32} darkness={0.48} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
