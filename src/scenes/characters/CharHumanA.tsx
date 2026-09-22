/**
 * CharHumanA — Realistic Human Male (RPM Avatar)
 *
 * Cinematic rendering pipeline:
 * - 3-point studio lighting (warm key, cool fill, rim/back light)
 * - Hemisphere light for natural ambient wrap
 * - ACES Filmic tone mapping for cinematic color
 * - Subtle bloom on specular highlights only
 * - Vignette for cinematic framing
 * - Dark reflective ground plane with contact shadows
 * - Slightly low camera angle for heroic framing
 */

import { Suspense, useEffect, useRef, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, useAnimations, ContactShadows } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { DebugCamera } from '../DebugCamera'

/* Dark warm grey — not pure black */
const BG = '#111115'

const PARAMS = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
const LIGHT_MODE = PARAMS.get('nopp') === '1'
const USE_SOLDIER = PARAMS.get('model') === 'soldier'

/* ---------- gold material (only when goldOverride=true) ---------- */
function useGoldMaterial() {
  return useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#D4A843'),
    emissive: new THREE.Color('#8B6914'),
    emissiveIntensity: 0.15,
    roughness: 0.35,
    metalness: 0.85,
    clearcoat: 0.3,
    clearcoatRoughness: 0.2,
  }), [])
}

/* ---------- RPM avatar ---------- */
function RPMHuman({ goldOverride = false }: { goldOverride?: boolean }) {
  const group = useRef<THREE.Group>(null!)
  const goldMat = useGoldMaterial()
  const meshGltf = useGLTF('/models/asian_male.glb')
  const walkGltf = useGLTF('/models/rpm/M_Walk_001.glb')
  const idleGltf = useGLTF('/models/rpm/M_Standing_Idle_001.glb')
  const clonedScene = useMemo(() => cloneSkeleton(meshGltf.scene), [meshGltf.scene])

  const allAnimations = useMemo(
    () => [...meshGltf.animations, ...walkGltf.animations, ...idleGltf.animations],
    [meshGltf.animations, walkGltf.animations, idleGltf.animations],
  )
  const { actions, names } = useAnimations(allAnimations, group)

  useEffect(() => {
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        mesh.castShadow = true
        mesh.receiveShadow = true
        if (goldOverride) {
          mesh.material = goldMat
        }
      }
    })
  }, [clonedScene, goldOverride, goldMat])

  useEffect(() => {
    console.log('[CharHumanA] RPM animations:', names)
    const walkName = names.find((n) => n.toLowerCase().includes('walk'))
    const idleName = names.find((n) => n.toLowerCase().includes('idle'))
    const actionName = walkName ?? idleName ?? names[0] ?? ''
    const action = actions[actionName] ?? null
    if (action) {
      console.log('[CharHumanA] Playing:', actionName)
      action.reset().fadeIn(0.3).play()
      action.timeScale = 0.8
    }
  }, [actions, names])

  // Cancel root motion so character walks in place
  const hipsRef = useRef<THREE.Object3D | null>(null)
  useEffect(() => {
    clonedScene.traverse((node) => {
      if (node.name === 'Hips') hipsRef.current = node
    })
  }, [clonedScene])

  useFrame(({ clock }) => {
    if (group.current) group.current.rotation.y = Math.sin(clock.elapsedTime * 0.3) * 0.12
    if (hipsRef.current) { hipsRef.current.position.x = 0; hipsRef.current.position.z = 0 }
  })

  return <group ref={group} position={[0, 0, 0]}><primitive object={clonedScene} /></group>
}

/* ---------- Soldier fallback ---------- */
function SoldierHuman({ goldOverride = false }: { goldOverride?: boolean }) {
  const group = useRef<THREE.Group>(null!)
  const goldMat = useGoldMaterial()
  const { scene, animations } = useGLTF('/models/human_a.glb')
  const clonedScene = useMemo(() => cloneSkeleton(scene), [scene])
  const { actions, names } = useAnimations(animations, group)

  useEffect(() => {
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        mesh.castShadow = true
        mesh.receiveShadow = true
        if (goldOverride) mesh.material = goldMat
      }
    })
  }, [clonedScene, goldOverride, goldMat])

  useEffect(() => {
    const idleName = names.find((n) => n.toLowerCase().includes('idle'))
    const action = actions[idleName ?? names[0] ?? ''] ?? null
    if (action) { action.reset().fadeIn(0.3).play(); action.timeScale = 0.6 }
  }, [actions, names])

  useFrame(({ clock }) => {
    if (group.current) group.current.rotation.y = Math.sin(clock.elapsedTime * 0.3) * 0.12
  })

  return <group ref={group} position={[0, 0, 0]}><primitive object={clonedScene} /></group>
}

function IdleHuman({ goldOverride = false }: { goldOverride?: boolean }) {
  return USE_SOLDIER ? <SoldierHuman goldOverride={goldOverride} /> : <RPMHuman goldOverride={goldOverride} />
}

/* ---------- Cinematic 3-point lighting + hemisphere ---------- */
function CinematicLighting() {
  const keyRef = useRef<THREE.DirectionalLight>(null!)

  useEffect(() => {
    if (keyRef.current) {
      /* Shadow map for key light */
      keyRef.current.shadow.mapSize.set(1024, 1024)
      keyRef.current.shadow.camera.near = 0.1
      keyRef.current.shadow.camera.far = 20
      keyRef.current.shadow.camera.left = -3
      keyRef.current.shadow.camera.right = 3
      keyRef.current.shadow.camera.top = 3
      keyRef.current.shadow.camera.bottom = -1
      keyRef.current.shadow.bias = -0.002
      keyRef.current.shadow.normalBias = 0.02
    }
  }, [])

  return (
    <>
      {/* Ambient: very subtle so shadows stay dark */}
      <ambientLight color="#1a1520" intensity={0.15} />

      {/* Hemisphere: warm from above (sky), cool from below (ground bounce) */}
      <hemisphereLight
        color="#FDE8C8"       /* warm sky */
        groundColor="#0A1428" /* cool ground bounce */
        intensity={0.25}
      />

      {/* KEY: Strong warm directional from upper-left (golden hour) */}
      <directionalLight
        ref={keyRef}
        color="#FFDCA4"
        intensity={4.5}
        position={[-3, 4, 3]}
        castShadow
      />

      {/* FILL: Cool blue from opposite side — point light positioned near figure height */}
      <pointLight
        color="#6088BB"
        intensity={3.0}
        position={[3, 1.5, 2]}
        distance={8}
        decay={2}
      />

      {/* RIM / BACK LIGHT: Strong edge light from behind for depth separation */}
      <directionalLight
        color="#99BBEE"
        intensity={3.5}
        position={[-1, 3, -4]}
      />

      {/* Secondary rim from other side — warm golden edge */}
      <pointLight
        color="#D4A843"
        intensity={2.5}
        position={[2, 2, -3]}
        distance={10}
        decay={2}
      />

      {/* Subtle warm kicker under face — softens harsh shadows */}
      <pointLight
        color="#FFE0B0"
        intensity={0.4}
        position={[0, 0.8, 1.5]}
        distance={5}
        decay={2}
      />
    </>
  )
}

/* ---------- Dark reflective ground + contact shadow ---------- */
function GroundPlane() {
  return (
    <>
      {/* Large dark floor — mostly matte, subtle sheen near center only */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial
          color="#050404"
          roughness={0.85}
          metalness={0.1}
        />
      </mesh>

      {/* Subtle warm glow circle at figure's feet */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <circleGeometry args={[1.0, 64]} />
        <meshStandardMaterial
          color="#D4A843"
          emissive="#D4A843"
          emissiveIntensity={0.05}
          transparent
          opacity={0.04}
        />
      </mesh>

      {/* Contact shadows for grounding */}
      {!LIGHT_MODE && (
        <ContactShadows
          position={[0, 0.001, 0]}
          opacity={0.8}
          scale={6}
          blur={2.0}
          far={2.5}
          color="#000000"
          resolution={256}
        />
      )}
    </>
  )
}

/* ---------- Background: dark warm grey ---------- */
function SceneBackground() {
  const { scene } = useThree()

  useEffect(() => {
    scene.background = new THREE.Color(BG)
    return () => { scene.background = null }
  }, [scene])

  return null
}

/* ---------- Scene setup (lookAt, renderer config) ---------- */
function SceneSetup() {
  const done = useRef(false)
  const { gl } = useThree()

  useFrame(({ camera }) => {
    if (!done.current) {
      /* Camera looks at upper chest for portrait framing */
      camera.lookAt(0, 1.0, 0)

      /* Renderer shadow setup */
      gl.shadowMap.enabled = true
      gl.shadowMap.type = THREE.PCFShadowMap

      done.current = true
    }
  })

  return null
}

/* ---------- WebGL context guard ---------- */
function ContextGuard() {
  const { gl } = useThree()
  useEffect(() => {
    const canvas = gl.domElement
    const handler = (e: Event) => { e.preventDefault(); console.warn('[CharHumanA] WebGL context lost') }
    canvas.addEventListener('webglcontextlost', handler)
    return () => canvas.removeEventListener('webglcontextlost', handler)
  }, [gl])
  return null
}

/* ---------- Main export ---------- */
export default function CharHumanA() {
  return (
    <div style={{ width: '100%', height: '100%', background: BG, position: 'fixed', inset: 0 }}>
      <Canvas
        shadows
        style={{ width: '100%', height: '100%' }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.9,
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance',
        }}
        camera={{
          position: [0.35, 1.2, 4.0],   /* pulled back so walk doesn't leave frame */
          fov: 40,                        /* tighter FOV = more cinematic, less distortion */
          near: 0.1,
          far: 100,
        }}
      >
        <DebugCamera />
        <SceneSetup />
        <ContextGuard />
        <SceneBackground />

        {/* Fog for depth — hides ground-to-background transition */}
        <fog attach="fog" args={['#111115', 5, 18]} />

        <CinematicLighting />

        <Suspense fallback={null}>
          <IdleHuman goldOverride={false} />
        </Suspense>

        <GroundPlane />

        {/* Post-processing: subtle bloom + vignette */}
        {!LIGHT_MODE && (
          <EffectComposer>
            <Bloom
              intensity={0.3}
              luminanceThreshold={0.72}
              luminanceSmoothing={0.85}
              mipmapBlur
            />
            <Vignette
              eskil={false}
              offset={0.3}
              darkness={0.65}
            />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  )
}
