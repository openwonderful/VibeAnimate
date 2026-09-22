/**
 * Toon Shader Lab — manifest key 'lab.toon' (group 'Studio', 12s).
 *
 * Turntable showcase of the Flow Studio toon toolkit
 * (src/studio/materials/): banded showpieces on pedestals at 2/3/5 ramp
 * bands, GoldFigures cel-shaded via <ToonSwap> with a cool fresnel rim,
 * ink outlines via <ToonOutlineRenderer overlay>, bloom + vignette via
 * @react-three/postprocessing. Camera orbits on the shared anim clock
 * (getAnimTime), so the scene scrubs/freezes with ?t= and renders
 * deterministically in Remotion.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { getAnimTime } from '../../hooks/useAnimTime'
import { SceneCanvas } from '../../scenes/SceneCanvas'
import { useSceneMode } from '../../scenes/sceneMode'
import { useDebugCameraEnabled } from '../../scenes/DebugCamera'
import { GoldFigure } from '../../scenes/characters/goldFigure'
import { ToonSwap, toonMaterial } from '../materials/toon'
import { ToonOutlineRenderer } from '../materials/ToonOutline'

const BG = '#0A1628'
const KEY_WARM = '#FFD9A6'
const FILL_COOL = '#5F7FD6'
const RIM_COOL = '#A8D8FF'
const INK = '#06090F'

/* ─── Camera — slow turntable orbit on the anim clock ─────────────── */
function TurntableCamera() {
  const debug = useDebugCameraEnabled()
  useFrame(({ camera }) => {
    if (debug) return // stand down for the debug orbit / URL camera moves
    const t = getAnimTime()
    const az = -0.52 + t * 0.088          // ~60° sweep over 12s
    const r = 7.8 - Math.min(t * 0.045, 0.55) // gentle push-in
    const y = 2.35 + Math.sin(t * 0.32) * 0.22
    camera.position.set(Math.sin(az) * r, y, Math.cos(az) * r)
    camera.lookAt(0, 1.05, 0)
  })
  return null
}

/* ─── Banded showpieces — 2/3/5 band ramps on pedestals ───────────── */
function Showpiece({
  position,
  pedestalHeight,
  bands,
  color,
  shape,
  spin = 0.35,
  spinOffset = 0,
}: {
  position: [number, number, number]
  pedestalHeight: number
  bands: number
  color: string
  shape: 'sphere' | 'torusKnot'
  spin?: number
  spinOffset?: number
}) {
  const pieceRef = useRef<THREE.Mesh>(null)

  const pieceMat = useMemo(
    () =>
      toonMaterial({
        color,
        bands,
        emissive: color,
        emissiveIntensity: 0.14,
        rim: { color: RIM_COOL, power: 2.6, intensity: 0.55 },
      }),
    [color, bands],
  )
  const pedestalMat = useMemo(
    () => toonMaterial({ color: '#22314C', bands: 3 }),
    [],
  )

  useFrame(() => {
    if (!pieceRef.current) return
    const t = getAnimTime()
    pieceRef.current.rotation.y = spinOffset + t * spin
    pieceRef.current.rotation.x = 0.35 + Math.sin(t * 0.4 + spinOffset) * 0.12
  })

  const pieceY = pedestalHeight + (shape === 'sphere' ? 0.62 : 0.66)
  return (
    <group position={position}>
      <mesh position={[0, pedestalHeight / 2, 0]} material={pedestalMat} castShadow receiveShadow>
        <cylinderGeometry args={[0.55, 0.66, pedestalHeight, 28]} />
      </mesh>
      <mesh ref={pieceRef} position={[0, pieceY, 0]} material={pieceMat} castShadow>
        {shape === 'sphere' ? (
          <sphereGeometry args={[0.52, 48, 32]} />
        ) : (
          <torusKnotGeometry args={[0.38, 0.13, 160, 24]} />
        )}
      </mesh>
    </group>
  )
}

/* ─── Ground — toon disc, outline suppressed at its rim ───────────── */
function Ground() {
  const mat = useMemo(() => {
    const m = toonMaterial({ color: '#101E33', bands: 3 })
    // No inverted-hull ring at the horizon edge of the disc.
    m.userData.outlineParameters = { visible: false }
    return m
  }, [])
  const daisMat = useMemo(() => toonMaterial({ color: '#1A2C48', bands: 3 }), [])
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} material={mat} receiveShadow>
        <circleGeometry args={[26, 64]} />
      </mesh>
      <mesh position={[0, 0.055, 0.7]} material={daisMat} receiveShadow>
        <cylinderGeometry args={[1.9, 2.05, 0.11, 48]} />
      </mesh>
    </>
  )
}

/* ─── Lighting — one warm key, one cool fill ──────────────────────── */
function Lighting() {
  return (
    <>
      <ambientLight intensity={0.5} color="#26324A" />
      <directionalLight
        position={[5, 7, 4]}
        intensity={2.4}
        color={KEY_WARM}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={40}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
      />
      <directionalLight position={[-6, 3.5, -3]} intensity={0.8} color={FILL_COOL} />
    </>
  )
}

/* ─── Scene body ──────────────────────────────────────────────────── */
function LabScene() {
  return (
    <>
      {/* Cel-shade every MeshStandardMaterial (the GoldFigures) and give
          the swapped-in toon materials a cool fresnel rim. */}
      <ToonSwap bands={4} rim={{ color: RIM_COOL, power: 2.2, intensity: 0.85 }} />

      <TurntableCamera />
      <Lighting />
      <Ground />

      {/* Center: gold figures walking in place on the dais. */}
      <group position={[0, 0, 0.7]}>
        <GoldFigure pose="walking" inPlace castShadow />
        <group position={[0.85, 0, 0.15]}>
          <GoldFigure kind="child" pose="walking" inPlace phaseOffset={0.45} castShadow />
        </group>
      </group>

      {/* Back arc: ramp-band study — 2 / 3 / 5 bands. */}
      <Showpiece position={[-2.3, 0, -3.1]} pedestalHeight={0.85} bands={2}
        color="#C73E3A" shape="torusKnot" spinOffset={1.1} />
      <Showpiece position={[0, 0, -3.9]} pedestalHeight={1.25} bands={3}
        color="#3FA8A0" shape="sphere" spin={0.22} />
      <Showpiece position={[2.3, 0, -3.1]} pedestalHeight={0.85} bands={5}
        color="#7A5FD0" shape="torusKnot" spinOffset={3.9} spin={-0.35} />

      {/* Post: bloom catches the emissive gold + showpiece highlights;
          vignette pulls focus to the dais. Ink outlines land on top. */}
      <EffectComposer>
        <Bloom mipmapBlur intensity={0.75} luminanceThreshold={0.65} luminanceSmoothing={0.25} />
        <Vignette eskil={false} offset={0.22} darkness={0.82} />
      </EffectComposer>
      <ToonOutlineRenderer overlay thickness={0.0035} color={INK} />
    </>
  )
}

/* ─── Shell — full-viewport live, composition-sized in render mode ── */
export default function ToonLab() {
  const mode = useSceneMode()
  const size = mode.kind === 'render'
    ? { width: mode.width, height: mode.height }
    : { width: '100vw', height: '100vh' }

  return (
    <div style={{ ...size, position: 'relative', overflow: 'hidden', background: BG }}>
      <SceneCanvas
        shadows
        camera={{ position: [-3.7, 2.4, 6.7], fov: 42, near: 0.1, far: 120 }}
        gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
        debugTarget={[0, 1.05, 0]}
      >
        <LabScene />
      </SceneCanvas>
      <div
        style={{
          position: 'absolute',
          left: '3.2%',
          bottom: '4.5%',
          color: 'rgba(214, 226, 244, 0.55)',
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          fontSize: 13,
          letterSpacing: '0.42em',
          textTransform: 'uppercase',
          pointerEvents: 'none',
        }}
      >
        Flow Studio — Toon Lab
      </div>
    </div>
  )
}
