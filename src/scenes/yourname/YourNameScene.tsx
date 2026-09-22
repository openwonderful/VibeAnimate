/**
 * "Your Name" — Kimi no Na wa homage scene.
 *
 * Layered 2.5D parallax in Three.js. The reference painting sits as a far
 * background plane; the camera dollies forward past floating 3D objects
 * (comet sparks, dust motes, a central light beam) so depth emerges from
 * parallax rather than rebuilding the painting in geometry.
 */

import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { DebugCamera, useCameraHandoff } from '../DebugCamera'

const BG_URL = '/images/yourname-bg.png'

// Preload so the texture is decoded before the Canvas mounts — avoids
// suspense-driven remount that can drop the WebGL context on some setups.
useTexture.preload(BG_URL)

/* ─── Far background plane holding the painted reference ──────────── */
function BackgroundPlate() {
  const texture = useTexture(BG_URL)

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 4
    texture.needsUpdate = true
  }, [texture])

  const img = texture.image as { width: number; height: number } | undefined
  const aspect = img ? img.width / img.height : 1920 / 1200

  // The plane sits far back (z = -40). Width must be large enough to cover
  // the camera frustum at that depth. At fov=50 and z=-40, vertical extent
  // is ~2 * 40 * tan(25°) ≈ 37. Width = 37 * aspect ≈ 59.
  const height = 42
  const width = height * aspect

  return (
    <mesh position={[0, 0, -40]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}

/* ─── Context-loss recovery — log + attempt restore ──────────────── */
function ContextGuard() {
  const { gl } = useThree()
  useEffect(() => {
    const canvas = gl.domElement
    const onLost = (e: Event) => {
      e.preventDefault()
      // eslint-disable-next-line no-console
      console.warn('[YourNameScene] WebGL context lost — browser will attempt restore')
    }
    const onRestored = () => {
      // eslint-disable-next-line no-console
      console.log('[YourNameScene] WebGL context restored')
    }
    canvas.addEventListener('webglcontextlost', onLost)
    canvas.addEventListener('webglcontextrestored', onRestored)
    return () => {
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', onRestored)
    }
  }, [gl])
  return null
}

/* ─── Central light beam — emissive cylinder with bloom kick ──────── */
function LightBeam() {
  const ref = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }) => {
    // Breathing intensity — sells the "alive" feel of the Taki/Mitsuha bond.
    const t = clock.getElapsedTime()
    const mat = ref.current.material as THREE.MeshBasicMaterial
    const pulse = 0.75 + 0.25 * Math.sin(t * 1.4)
    mat.opacity = pulse
  })

  return (
    <mesh ref={ref} position={[0, 0, -20]}>
      <cylinderGeometry args={[0.18, 0.18, 60, 16, 1, true]} />
      <meshBasicMaterial
        color="#FFE6B8"
        transparent
        opacity={0.9}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

/* ─── Comet fragments — blue-teal sparks in upper left, falling ──── */
function CometFragments() {
  const group = useRef<THREE.Group>(null!)

  const fragments = useMemo(() => {
    const arr: { pos: [number, number, number]; scale: number; speed: number; phase: number }[] = []
    for (let i = 0; i < 24; i++) {
      arr.push({
        pos: [
          -6 + Math.random() * 3,
          4 + Math.random() * 5,
          -15 - Math.random() * 10,
        ],
        scale: 0.05 + Math.random() * 0.12,
        speed: 0.4 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
      })
    }
    return arr
  }, [])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    group.current.children.forEach((child, i) => {
      const f = fragments[i]
      child.position.x = f.pos[0] + Math.sin(t * f.speed + f.phase) * 0.3
      child.position.y = f.pos[1] - ((t * f.speed * 0.2) % 3)
    })
  })

  return (
    <group ref={group}>
      {fragments.map((f, i) => (
        <mesh key={i} position={f.pos}>
          <sphereGeometry args={[f.scale, 8, 8]} />
          <meshBasicMaterial
            color="#7FE4FF"
            transparent
            opacity={0.9}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}

/* ─── Near-camera dust motes — drift past as we dolly forward ────── */
function DustMotes({ count = 80 }: { count?: number }) {
  const points = useRef<THREE.Points>(null!)

  const { geometry, material } = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30        // x
      positions[i * 3 + 1] = (Math.random() - 0.5) * 18    // y
      positions[i * 3 + 2] = -2 - Math.random() * 18       // z (scattered through depth)
    }
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const m = new THREE.PointsMaterial({
      color: '#FFD9A8',
      size: 0.08,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
      toneMapped: false,
    })

    return { geometry: g, material: m }
  }, [count])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const pos = points.current.geometry.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < count; i++) {
      const base = (i * 0.37) % 1
      pos.array[i * 3 + 1] = ((base + t * 0.04) % 1 - 0.5) * 18
    }
    pos.needsUpdate = true
  })

  return <points ref={points} geometry={geometry} material={material} />
}

/* ─── Distant stars — static scatter, visible in the sky half ─────── */
function StarField({ count = 120 }: { count?: number }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 50
      positions[i * 3 + 1] = Math.random() * 15 + 2       // upper half only
      positions[i * 3 + 2] = -25 - Math.random() * 10
    }
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [count])

  const material = useMemo(() => new THREE.PointsMaterial({
    color: '#FFFFFF',
    size: 0.06,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
    toneMapped: false,
  }), [])

  return <points geometry={geometry} material={material} />
}

/* ─── Camera dolly — slow forward push with subtle sway ──────────── */
function CameraRig() {
  const yieldCamera = useCameraHandoff()
  useFrame(({ camera, clock }) => {
    if (yieldCamera()) return
    const t = clock.getElapsedTime()
    // Slow 20-second loop: dolly from z=8 toward z=-4 via sin wrap.
    const cycle = (t % 30) / 30
    camera.position.z = 8 - cycle * 12
    camera.position.x = Math.sin(t * 0.1) * 0.3
    camera.position.y = Math.sin(t * 0.07) * 0.15
    camera.lookAt(0, 0, -20)
  })
  return null
}

/* ─── Main scene ─────────────────────────────────────────────────── */
export default function YourNameScene() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0A0818' }}>
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true, toneMapping: THREE.NoToneMapping, powerPreference: 'high-performance' }}
        camera={{ fov: 50, position: [0, 0, 8], near: 0.1, far: 200 }}
      >
        <ContextGuard />
        <DebugCamera />
        <BackgroundPlate />
        <StarField />
        <CometFragments />
        <LightBeam />
        <DustMotes />
        <CameraRig />

        <EffectComposer>
          <Bloom intensity={0.7} luminanceThreshold={0.6} luminanceSmoothing={0.3} />
          <Vignette eskil={false} offset={0.25} darkness={0.55} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
