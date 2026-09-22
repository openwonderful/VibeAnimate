/**
 * CharWireframe — Wireframe Hologram Figure (Variation 4)
 *
 * Glowing wireframe/holographic humanoid. Tron / sci-fi scanning aesthetic.
 * Self-illuminated cyan wireframe with bloom glow, chromatic aberration,
 * scan lines, and floating HUD elements.
 */

import { useRef, useMemo, type FC } from 'react'
import { Canvas, useFrame, useThree, type ThreeElements } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { DebugCamera } from '../DebugCamera'

/* three.js <line> primitive — cast so TSX doesn't resolve it as the SVG element */
const Line = 'line' as unknown as FC<ThreeElements['threeLine']>

/* ─── Set scene background and camera target ────────────────────── */
function SceneSetup() {
  const { scene, camera } = useThree()
  useMemo(() => {
    scene.background = new THREE.Color('#020408')
    // Point camera at figure's vertical center (feet ~0.09, head ~1.72 → mid ~0.9)
    camera.lookAt(0, 0.9, 0)
    camera.updateProjectionMatrix()
  }, [scene, camera])
  return null
}

/* ─── Build the humanoid wireframe body ──────────────────────────── */
function WireBody({ color = '#00E5FF', offsetX = 0, opacity = 0.9, glowOpacity = 0.2 }: {
  color?: string
  offsetX?: number
  opacity?: number
  glowOpacity?: number
}) {
  const geos = useMemo(() => ({
    head: new THREE.SphereGeometry(0.14, 8, 8),
    neck: new THREE.CylinderGeometry(0.03, 0.03, 0.08, 6),
    torso: new THREE.CylinderGeometry(0.16, 0.12, 0.5, 6),
    chest: new THREE.CylinderGeometry(0.18, 0.16, 0.12, 6),
    shoulder: new THREE.SphereGeometry(0.045, 6, 6),
    upperArm: new THREE.CylinderGeometry(0.03, 0.025, 0.28, 6),
    elbow: new THREE.SphereGeometry(0.03, 6, 6),
    forearm: new THREE.CylinderGeometry(0.025, 0.02, 0.26, 6),
    hand: new THREE.SphereGeometry(0.025, 6, 6),
    pelvis: new THREE.CylinderGeometry(0.12, 0.1, 0.1, 6),
    upperLeg: new THREE.CylinderGeometry(0.045, 0.038, 0.36, 6),
    knee: new THREE.SphereGeometry(0.038, 6, 6),
    lowerLeg: new THREE.CylinderGeometry(0.038, 0.028, 0.34, 6),
    foot: new THREE.BoxGeometry(0.06, 0.03, 0.12, 2, 1, 2),
  }), [])

  const WP = ({ position, geometry }: {
    position: [number, number, number]
    geometry: THREE.BufferGeometry
  }) => (
    <group position={[position[0] + offsetX, position[1], position[2]]}>
      <mesh geometry={geometry}>
        <meshBasicMaterial color={color} wireframe transparent opacity={opacity} />
      </mesh>
      <mesh geometry={geometry} scale={1.12}>
        <meshBasicMaterial color={color} wireframe transparent opacity={glowOpacity} />
      </mesh>
    </group>
  )

  return (
    <>
      <WP position={[0, 1.72, 0]} geometry={geos.head} />
      <WP position={[0, 1.56, 0]} geometry={geos.neck} />
      <WP position={[0, 1.44, 0]} geometry={geos.chest} />
      <WP position={[0, 1.2, 0]} geometry={geos.torso} />

      <WP position={[-0.22, 1.48, 0]} geometry={geos.shoulder} />
      <WP position={[0.22, 1.48, 0]} geometry={geos.shoulder} />

      <WP position={[-0.26, 1.32, 0]} geometry={geos.upperArm} />
      <WP position={[-0.28, 1.16, 0]} geometry={geos.elbow} />
      <WP position={[-0.30, 0.99, 0]} geometry={geos.forearm} />
      <WP position={[-0.31, 0.84, 0]} geometry={geos.hand} />

      <WP position={[0.26, 1.32, 0]} geometry={geos.upperArm} />
      <WP position={[0.28, 1.16, 0]} geometry={geos.elbow} />
      <WP position={[0.30, 0.99, 0]} geometry={geos.forearm} />
      <WP position={[0.31, 0.84, 0]} geometry={geos.hand} />

      <WP position={[0, 0.9, 0]} geometry={geos.pelvis} />

      <WP position={[-0.1, 0.68, 0]} geometry={geos.upperLeg} />
      <WP position={[-0.1, 0.47, 0]} geometry={geos.knee} />
      <WP position={[-0.1, 0.27, 0]} geometry={geos.lowerLeg} />
      <WP position={[-0.1, 0.09, 0.02]} geometry={geos.foot} />

      <WP position={[0.1, 0.68, 0]} geometry={geos.upperLeg} />
      <WP position={[0.1, 0.47, 0]} geometry={geos.knee} />
      <WP position={[0.1, 0.27, 0]} geometry={geos.lowerLeg} />
      <WP position={[0.1, 0.09, 0.02]} geometry={geos.foot} />
    </>
  )
}

/* ─── Wireframe Figure with chromatic aberration ─────────────────── */
function WireframeFigure() {
  const groupRef = useRef<THREE.Group>(null!)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.15
      // Subtle vertical jitter every few frames
      groupRef.current.position.y = Math.random() < 0.1 ? (Math.random() - 0.5) * 0.005 : 0
    }
  })

  return (
    <group ref={groupRef}>
      {/* Main cyan body */}
      <WireBody color="#00E5FF" opacity={0.9} glowOpacity={0.2} />
      {/* Red chromatic aberration — offset slightly right */}
      <WireBody color="#FF2020" offsetX={0.012} opacity={0.2} glowOpacity={0.06} />
      {/* Blue chromatic aberration — offset slightly left */}
      <WireBody color="#4040FF" offsetX={-0.008} opacity={0.14} glowOpacity={0.04} />
    </group>
  )
}

/* ─── Scan Lines — camera-facing with soft alpha gradient at edges ── */
function ScanLines() {
  const meshRef = useRef<THREE.Mesh>(null!)

  const texture = useMemo(() => {
    const height = 512
    const width = 64
    const data = new Uint8Array(width * height * 4)
    for (let y = 0; y < height; y++) {
      const isScanLine = y % 4 === 0
      const baseAlpha = isScanLine ? 18 : 0
      for (let x = 0; x < width; x++) {
        // Horizontal fade at edges for soft falloff
        const edgeDist = Math.min(x, width - 1 - x) / (width * 0.3)
        const fade = Math.min(1, edgeDist)
        const idx = (y * width + x) * 4
        data[idx] = 0
        data[idx + 1] = 229
        data[idx + 2] = 255
        data[idx + 3] = Math.floor(baseAlpha * fade)
      }
    }
    const tex = new THREE.DataTexture(data, width, height, THREE.RGBAFormat)
    tex.wrapS = THREE.ClampToEdgeWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(1, 5)
    tex.needsUpdate = true
    return tex
  }, [])

  useFrame((state) => {
    texture.offset.y = state.clock.elapsedTime * 0.1
    if (meshRef.current) {
      meshRef.current.quaternion.copy(state.camera.quaternion)
    }
  })

  return (
    <mesh ref={meshRef} position={[0, 1.0, 0]}>
      <planeGeometry args={[1.6, 2.8]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

/* ─── Floating HUD element — wireframe rectangle outline ─────────── */
function HudPanel({
  position,
  size,
  color = '#00E5FF',
  opacity = 0.3,
  barCount = 3,
}: {
  position: [number, number, number]
  size: [number, number]
  color?: string
  opacity?: number
  barCount?: number
}) {
  const groupRef = useRef<THREE.Group>(null!)

  // Build the rectangular outline using line segments
  const outlineGeo = useMemo(() => {
    const [w, h] = size
    const hw = w / 2, hh = h / 2
    const pts = [
      new THREE.Vector3(-hw, -hh, 0),
      new THREE.Vector3(hw, -hh, 0),
      new THREE.Vector3(hw, hh, 0),
      new THREE.Vector3(-hw, hh, 0),
      new THREE.Vector3(-hw, -hh, 0), // close the loop
    ]
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [size])

  // Small horizontal bars inside the panel
  const barGeos = useMemo(() => {
    const [w, h] = size
    const bars: THREE.BufferGeometry[] = []
    const margin = w * 0.15
    const barSpacing = h / (barCount + 1)
    for (let i = 0; i < barCount; i++) {
      const y = -h / 2 + barSpacing * (i + 1)
      const barWidth = (w - margin * 2) * (0.4 + Math.random() * 0.5)
      const pts = [
        new THREE.Vector3(-w / 2 + margin, y, 0),
        new THREE.Vector3(-w / 2 + margin + barWidth, y, 0),
      ]
      bars.push(new THREE.BufferGeometry().setFromPoints(pts))
    }
    return bars
  }, [size, barCount])

  useFrame((state) => {
    if (groupRef.current) {
      // Subtle float animation
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.8 + position[0] * 5) * 0.02
      // Always face camera
      groupRef.current.quaternion.copy(state.camera.quaternion)
    }
  })

  return (
    <group ref={groupRef} position={position}>
      <Line geometry={outlineGeo}>
        <lineBasicMaterial color={color} transparent opacity={opacity} />
      </Line>
      {barGeos.map((geo, i) => (
        <Line key={i} geometry={geo}>
          <lineBasicMaterial color={color} transparent opacity={opacity * 0.7} />
        </Line>
      ))}
    </group>
  )
}

/* ─── HUD Ring — circle around the figure at a given height ──────── */
function HudRing({ y, radius, color = '#00E5FF', opacity = 0.15 }: {
  y: number
  radius: number
  color?: string
  opacity?: number
}) {
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = []
    const segs = 32
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius))
    }
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [radius])

  return (
    <Line geometry={geo} position={[0, y, 0]}>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </Line>
  )
}

/* ─── Ground Grid ────────────────────────────────────────────────── */
function GroundGrid() {
  const lines = useMemo(() => {
    const lineData: { start: [number, number, number]; end: [number, number, number] }[] = []
    const size = 2
    const divisions = 12
    const step = size / divisions

    for (let i = -divisions / 2; i <= divisions / 2; i++) {
      const z = i * step
      lineData.push({ start: [-size / 2, 0, z], end: [size / 2, 0, z] })
    }
    for (let i = -divisions / 2; i <= divisions / 2; i++) {
      const x = i * step
      lineData.push({ start: [x, 0, -size / 2], end: [x, 0, size / 2] })
    }
    return lineData
  }, [])

  return (
    <group position={[0, 0.05, 0]}>
      {lines.map((l, i) => {
        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(...l.start),
          new THREE.Vector3(...l.end),
        ])
        return (
          <Line key={i} geometry={geo}>
            <lineBasicMaterial color="#00E5FF" transparent opacity={0.04} />
          </Line>
        )
      })}
    </group>
  )
}

/* ─── Base Platform — subtle circular highlight under the figure ──── */
function BasePlatform() {
  const ringGeo = useMemo(() => {
    const pts: THREE.Vector3[] = []
    const segs = 48
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(a) * 0.4, 0, Math.sin(a) * 0.4))
    }
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [])

  return (
    <group position={[0, 0.06, 0]}>
      <Line geometry={ringGeo}>
        <lineBasicMaterial color="#00E5FF" transparent opacity={0.3} />
      </Line>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <circleGeometry args={[0.4, 32]} />
        <meshBasicMaterial color="#00E5FF" transparent opacity={0.03} />
      </mesh>
    </group>
  )
}

/* ─── Main component ─────────────────────────────────────────────── */
export default function CharWireframe() {
  return (
    <div style={{ width: '100%', height: '100%', background: '#020408', position: 'fixed', inset: 0 }}>
      <Canvas
        style={{ width: '100%', height: '100%' }}
        gl={{
          antialias: true,
          toneMapping: THREE.NoToneMapping,
          preserveDrawingBuffer: true,
        }}
        camera={{ position: [0.2, 1.1, 3.0], fov: 48, near: 0.1, far: 100 }}
      >
        <DebugCamera />
        <SceneSetup />
        <ambientLight intensity={0.05} />

        <WireframeFigure />
        <ScanLines />
        <GroundGrid />
        <BasePlatform />

        {/* HUD rings at different heights */}
        <HudRing y={0.5} radius={0.35} opacity={0.2} />
        <HudRing y={1.2} radius={0.3} opacity={0.15} />
        <HudRing y={1.72} radius={0.22} opacity={0.12} />

        {/* Floating HUD panels — 5 panels around the figure */}
        <HudPanel position={[-0.7, 1.6, 0.3]} size={[0.24, 0.16]} barCount={3} opacity={0.45} />
        <HudPanel position={[0.68, 1.4, 0.25]} size={[0.20, 0.12]} barCount={2} opacity={0.4} />
        <HudPanel position={[-0.62, 0.7, 0.35]} size={[0.22, 0.14]} barCount={4} opacity={0.35} />
        <HudPanel position={[0.72, 0.85, 0.3]} size={[0.26, 0.12]} barCount={3} opacity={0.38} />
        <HudPanel position={[0.0, 1.92, 0.35]} size={[0.32, 0.10]} barCount={2} opacity={0.3} />

        <EffectComposer>
          <Bloom
            intensity={2.0}
            luminanceThreshold={0.05}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.15} darkness={0.6} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
