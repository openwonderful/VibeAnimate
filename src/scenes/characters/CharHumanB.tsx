/**
 * CharHumanB — Cinematic Human Figure (Female)
 *
 * RPM feminine avatar with walk animation. Original textures (skin, clothing)
 * preserved — no material overrides. Professional three-point lighting setup
 * with subtle post-processing for a cinematic 3D render look.
 *
 * NO gold material override, NO additive blending, NO light cones,
 * NO spotlights with intensity > 3.
 */

import { Suspense, useRef, useEffect, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, useAnimations, ContactShadows } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, BrightnessContrast } from '@react-three/postprocessing'
import * as THREE from 'three'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { DebugCamera } from '../DebugCamera'

/* Unified dark color used for background, fog, and ground edges */
const BG = '#12101a'

/* ---------- Walking avatar ---------- */
function WalkingHumanInner() {
  const group = useRef<THREE.Group>(null!)
  const meshGltf = useGLTF('/models/asian_female.glb')
  const walkGltf = useGLTF('/models/rpm/F_Walk_002.glb')
  const clonedScene = useMemo(() => cloneSkeleton(meshGltf.scene), [meshGltf.scene])

  /* Enable shadows on all meshes, keep original materials */
  useEffect(() => {
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        mesh.castShadow = true
        mesh.receiveShadow = true
        /* Subtle env map boost for material depth — does NOT override textures */
        const mat = mesh.material as THREE.MeshStandardMaterial
        if (mat?.isMeshStandardMaterial) {
          mat.envMapIntensity = 0.6
          mat.needsUpdate = true
        }
      }
    })
  }, [clonedScene])

  const allAnimations = useMemo(
    () => [...meshGltf.animations, ...walkGltf.animations],
    [meshGltf.animations, walkGltf.animations],
  )
  const { actions, names } = useAnimations(allAnimations, group)

  useEffect(() => {
    const walkName = names.find(n => n.toLowerCase().includes('walk'))
    const actionName = walkName ?? names[0] ?? ''
    const action = actions[actionName] ?? null
    if (action) {
      action.reset().fadeIn(0.5).play()
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

  /* Gentle slow rotation + root motion cancel */
  useFrame(({ clock }) => {
    if (group.current) {
      group.current.rotation.y = Math.sin(clock.elapsedTime * 0.2) * 0.12
    }
    if (hipsRef.current) { hipsRef.current.position.x = 0; hipsRef.current.position.z = 0 }
  })

  return <group ref={group}><primitive object={clonedScene} /></group>
}

/* ---------- Scene init ---------- */
function SceneSetup() {
  const { camera, scene, gl } = useThree()
  useEffect(() => {
    scene.background = new THREE.Color(BG)
    camera.lookAt(0, 1.05, 0)
    gl.shadowMap.enabled = true
    gl.shadowMap.type = THREE.PCFSoftShadowMap
  }, [camera, scene, gl])
  return null
}

/* ---------- Studio cyclorama (curved wall → floor, single mesh) ---------- */
function Cyclorama() {
  const geo = useMemo(() => {
    /* Build a half-pipe shape: vertical back wall curving into a horizontal floor.
       Using a simple parametric approach with segments along the curve. */
    const segs = 60
    const width = 50
    const wallHeight = 12
    const radius = 6       /* curve radius at the bottom of the wall */
    const floorExtent = 16 /* how far the floor extends toward camera */

    const positions: number[] = []
    const uvs: number[] = []
    const indices: number[] = []

    /* Generate strip: from top of wall, down, around curve, along floor */
    const totalSteps = segs
    for (let col = 0; col <= 1; col++) {
      const x = (col - 0.5) * width
      for (let row = 0; row <= totalSteps; row++) {
        const t = row / totalSteps
        let y: number, z: number
        if (t < 0.4) {
          /* Vertical wall section */
          const wallT = t / 0.4
          y = wallHeight - wallT * (wallHeight - radius)
          z = -radius
        } else if (t < 0.7) {
          /* Curved section (quarter circle) */
          const curveT = (t - 0.4) / 0.3
          const angle = (Math.PI / 2) * curveT
          y = radius * Math.cos(angle)
          z = -radius + radius * Math.sin(angle)
        } else {
          /* Floor section */
          const floorT = (t - 0.7) / 0.3
          y = 0
          z = floorT * floorExtent
        }
        positions.push(x, y, z)
        uvs.push(col, 1 - t)
      }
    }

    /* Build triangles between the two columns */
    const rowCount = totalSteps + 1
    for (let row = 0; row < totalSteps; row++) {
      const a = row
      const b = row + 1
      const c = rowCount + row
      const d = rowCount + row + 1
      indices.push(a, b, c, b, d, c)
    }

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    g.setIndex(indices)
    g.computeVertexNormals()
    return g
  }, [])

  const mat = useMemo(() => {
    /* Gradient texture: dark purple at top → near-black at bottom/floor */
    const canvas = document.createElement('canvas')
    canvas.width = 2
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    const grad = ctx.createLinearGradient(0, 0, 0, 512)
    grad.addColorStop(0, '#28203a')    /* warm purple at top of wall */
    grad.addColorStop(0.25, '#1e1830')
    grad.addColorStop(0.45, '#161224')
    grad.addColorStop(0.65, '#100d1a')
    grad.addColorStop(1, '#0a0810')    /* floor: near-black */
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 2, 512)
    const tex = new THREE.CanvasTexture(canvas)
    return new THREE.MeshBasicMaterial({ map: tex, side: THREE.FrontSide })
  }, [])

  return (
    <mesh geometry={geo} material={mat} position={[0, 0, -8]} />
  )
}

/* ---------- Ground (reflective) + contact shadows ---------- */
function Ground() {
  return (
    <group>
      {/* Reflective ground — subtle mirror effect for cinematic feel */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.003, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial
          color="#0a0912"
          metalness={0.7}
          roughness={0.25}
        />
      </mesh>
      {/* Contact shadows for soft grounding — no harsh edges */}
      <ContactShadows
        position={[0, 0.001, 0]}
        opacity={0.65}
        scale={8}
        blur={2.5}
        far={4}
        color="#000000"
      />
    </group>
  )
}

/* ---------- Main export ---------- */
export default function CharHumanB() {
  return (
    <div style={{ width: '100%', height: '100%', background: BG, position: 'fixed', inset: 0 }}>
      <Canvas
        shadows
        style={{ width: '100%', height: '100%' }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
          preserveDrawingBuffer: true,
        }}
        camera={{ position: [0.2, 1.15, 4.2], fov: 40, near: 0.1, far: 100 }}
      >
        <DebugCamera />
        <SceneSetup />

        {/* Studio cyclorama — seamless wall-to-floor with gradient */}
        <Cyclorama />

        {/* ===== THREE-POINT CINEMATIC LIGHTING ===== */}

        {/* Ambient — very low, just prevents absolute black in shadows */}
        <ambientLight color="#201828" intensity={0.35} />

        {/* KEY light — warm golden, from upper-left (like golden-hour sun) */}
        <directionalLight
          position={[-3, 4, 4]}
          color="#F5D8B5"
          intensity={1.8}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={0.5}
          shadow-camera-far={20}
          shadow-camera-left={-5}
          shadow-camera-right={5}
          shadow-camera-top={5}
          shadow-camera-bottom={-5}
          shadow-bias={-0.0005}
        />

        {/* FILL light — cool blue from the right, softer than key */}
        <directionalLight
          position={[3, 2, 2]}
          color="#8EAAC8"
          intensity={0.65}
        />

        {/* RIM / BACK light — behind and above, creates edge separation from BG */}
        <directionalLight
          position={[0.5, 3, -3.5]}
          color="#C8B8D8"
          intensity={0.9}
        />

        {/* Subtle under-fill — prevents chin/neck from going too dark */}
        <directionalLight
          position={[0, -1, 2]}
          color="#3D2A42"
          intensity={0.25}
        />

        {/* ===== CHARACTER ===== */}
        <Suspense fallback={null}>
          <WalkingHumanInner />
        </Suspense>

        {/* ===== GROUND ===== */}
        <Ground />

        {/* ===== POST-PROCESSING ===== */}
        <EffectComposer>
          <Bloom
            intensity={0.2}
            luminanceThreshold={0.7}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
          <BrightnessContrast brightness={-0.02} contrast={0.08} />
          <Vignette eskil={false} offset={0.15} darkness={0.55} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
