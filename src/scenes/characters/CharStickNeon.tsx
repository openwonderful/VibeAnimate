/**
 * CharStickNeon — Smooth Mannequin Figure
 *
 * Quaternius animated mannequin model with walk animation.
 * Neon cyan glow treatment with heavy bloom.
 */

import { Suspense, useRef, useEffect, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { DebugCamera } from '../DebugCamera'

const BG = '#030308'
const NEON_CYAN = '#00E5FF'
const NEON_PURPLE = '#9B59B6'

function MannequinFigure() {
  const group = useRef<THREE.Group>(null!)
  const { scene, animations } = useGLTF('/models/mannequin.glb')
  const cloned = useMemo(() => scene.clone(true), [scene])
  const { actions, names } = useAnimations(animations, group)

  // Apply neon material to all meshes
  useEffect(() => {
    const neonMat = new THREE.MeshStandardMaterial({
      color: NEON_CYAN,
      emissive: NEON_CYAN,
      emissiveIntensity: 0.6,
      roughness: 0.3,
      metalness: 0.1,
      toneMapped: false,
    })
    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = neonMat
      }
    })
  }, [cloned])

  // Play idle animation
  useEffect(() => {
    console.log('Mannequin animations:', names)
    // Try idle first for vibing, fall back to walk
    const idleName = names.find(n => n.toLowerCase().includes('idle') && n.toLowerCase().includes('loop'))
    const walkName = names.find(n => n.toLowerCase().includes('walk') && n.toLowerCase().includes('loop'))
    const actionName = idleName ?? walkName ?? names[0] ?? ''
    const action = actions[actionName]
    if (action) {
      action.reset().fadeIn(0.3).play()
      action.timeScale = 0.7
      console.log('Playing:', actionName)
    }
  }, [actions, names])

  // Gentle rotation
  useFrame(({ clock }) => {
    if (group.current) {
      group.current.rotation.y = Math.sin(clock.elapsedTime * 0.3) * 0.15
    }
  })

  return (
    <group ref={group}>
      <primitive object={cloned} scale={1} position={[0, 0, 0]} />
    </group>
  )
}

function SceneSetup() {
  const { camera, scene } = useThree()
  useEffect(() => {
    scene.background = new THREE.Color(BG)
    camera.lookAt(0, 1.0, 0)
  }, [camera, scene])
  return null
}

export default function CharStickNeon() {
  return (
    <div style={{ width: '100%', height: '100%', background: BG }}>
      <Canvas
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.8, preserveDrawingBuffer: true }}
        camera={{ position: [0, 1.0, 2.8], fov: 45, near: 0.1, far: 100 }}
      >
        <DebugCamera />
        <SceneSetup />
        <ambientLight intensity={0.1} />
        <pointLight position={[0, 0.1, 0]} color={NEON_PURPLE} intensity={0.5} distance={4} decay={2} />
        <directionalLight position={[-2, 3, 4]} color={NEON_CYAN} intensity={0.3} />
        <Suspense fallback={null}>
          <MannequinFigure />
        </Suspense>
        {/* Ground */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#050510" roughness={0.8} />
        </mesh>
        <EffectComposer>
          <Bloom intensity={1.5} luminanceThreshold={0.1} luminanceSmoothing={0.9} mipmapBlur />
          <Vignette eskil={false} offset={0.1} darkness={0.6} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
