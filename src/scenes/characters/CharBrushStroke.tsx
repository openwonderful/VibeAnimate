/**
 * CharBrushStroke — Tube/Brush-Stroke Figure (Variation 5)
 *
 * Figure made from flowing TubeGeometry along CatmullRomCurve3 paths,
 * like Korean calligraphy (seoye / 서예) or ink wash painting (suhwa / 수화).
 * Each body part is a single flowing brush stroke rather than rigid geometry.
 *
 * v3: Hanji (Korean paper) backdrop, refined ink-on-paper aesthetic,
 *     asymmetric calligraphic taper, subtle arm sway, drip streaks.
 */

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, DepthOfField, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { DebugCamera } from '../DebugCamera'

/* ─── Seeded random ──────────────────────────────────────────────── */

function makeRng(initial: number) {
  let s = initial
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

/* ─── Tapered Tube Component ─────────────────────────────────────── */

interface TaperedTubeProps {
  curve: THREE.CatmullRomCurve3
  maxRadius?: number
  segments?: number
  material: THREE.Material
  /** Taper profile: 'bell' (default), 'head' (thick start, thin end), 'tail' (thin start, thick end) */
  taper?: 'bell' | 'head' | 'tail'
}

function TaperedTube({ curve, maxRadius = 0.04, segments = 12, material, taper = 'bell' }: TaperedTubeProps) {
  const tubes = useMemo(() => {
    const points = curve.getPoints(segments)
    const result: { curve: THREE.LineCurve3; radius: number }[] = []
    for (let i = 0; i < points.length - 1; i++) {
      const t = i / (points.length - 1)
      let factor: number
      switch (taper) {
        case 'head':
          // Thick at start, thin at end (like pressing down then lifting brush)
          factor = 0.15 + 0.85 * (1 - t * t)
          break
        case 'tail':
          // Thin at start, thick in middle, thinner at end
          factor = 0.15 + 0.85 * Math.sin(t * Math.PI * 0.8)
          break
        default:
          // Bell: thick in middle, thin at both ends
          factor = 0.15 + 0.85 * Math.sin(t * Math.PI)
      }
      const radius = maxRadius * factor
      const subCurve = new THREE.LineCurve3(points[i], points[i + 1])
      result.push({ curve: subCurve, radius })
    }
    return result
  }, [curve, maxRadius, segments, taper])

  return (
    <group>
      {tubes.map((t, i) => (
        <mesh key={i} material={material}>
          <tubeGeometry args={[t.curve, 6, t.radius, 12, false]} />
        </mesh>
      ))}
    </group>
  )
}

/* ─── Body Curves ────────────────────────────────────────────────── */

function useBodyCurves() {
  return useMemo(() => {
    // Spine + head (main vertical stroke — dominant calligraphy line)
    const spineCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.5, 0),        // pelvis
      new THREE.Vector3(0.01, -0.1, 0.04),  // lower back (slight S-curve)
      new THREE.Vector3(0, 0.3, 0),         // chest
      new THREE.Vector3(-0.01, 0.65, -0.02),// upper chest
      new THREE.Vector3(0, 0.85, 0),        // neck
      new THREE.Vector3(0, 1.0, 0.02),      // head top
    ])

    // Left arm — flowing outward with elegant calligraphic sweep
    const leftArmCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.1, 0.55, 0),      // shoulder
      new THREE.Vector3(-0.3, 0.42, 0.07),   // upper arm
      new THREE.Vector3(-0.46, 0.24, 0.04),  // elbow
      new THREE.Vector3(-0.54, 0.06, -0.03), // forearm
      new THREE.Vector3(-0.48, -0.1, 0),     // hand
    ])

    // Right arm — slightly different pose for asymmetry (more relaxed)
    const rightArmCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.1, 0.55, 0),
      new THREE.Vector3(0.26, 0.46, 0.05),
      new THREE.Vector3(0.4, 0.34, 0.03),
      new THREE.Vector3(0.48, 0.18, -0.04),
      new THREE.Vector3(0.44, 0.0, 0.01),
    ])

    // Left leg — wider stance for better separation
    const leftLegCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.07, -0.5, 0),     // hip
      new THREE.Vector3(-0.14, -0.72, 0.02), // upper thigh
      new THREE.Vector3(-0.18, -0.95, 0),    // knee
      new THREE.Vector3(-0.16, -1.18, -0.02),// shin
      new THREE.Vector3(-0.18, -1.4, 0.04),  // foot
    ])

    // Right leg
    const rightLegCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.07, -0.5, 0),
      new THREE.Vector3(0.14, -0.72, 0.02),
      new THREE.Vector3(0.18, -0.95, 0),
      new THREE.Vector3(0.16, -1.18, -0.02),
      new THREE.Vector3(0.18, -1.4, 0.04),
    ])

    // Shoulder bridge
    const shoulderCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.14, 0.58, 0),
      new THREE.Vector3(-0.05, 0.63, 0.02),
      new THREE.Vector3(0.05, 0.63, 0.02),
      new THREE.Vector3(0.14, 0.58, 0),
    ])

    // Hip bridge
    const hipCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.09, -0.48, 0),
      new THREE.Vector3(0, -0.44, 0.02),
      new THREE.Vector3(0.09, -0.48, 0),
    ])

    return {
      spineCurve, leftArmCurve, rightArmCurve,
      leftLegCurve, rightLegCurve,
      shoulderCurve, hipCurve,
    }
  }, [])
}

/* ─── Ink Splatters + Drip Streaks ───────────────────────────────── */

interface SplatterDot {
  pos: [number, number, number]
  radius: number
}

interface DripStreak {
  start: [number, number, number]
  length: number
  radius: number
}

function useInkSplatters(dotCount: number = 45, dripCount: number = 8) {
  return useMemo(() => {
    const dots: SplatterDot[] = []
    const drips: DripStreak[] = []
    const hotspots: [number, number, number][] = [
      [0, 1.0, 0],          // head top
      [-0.48, -0.1, 0],     // left hand
      [0.44, 0.0, 0],       // right hand
      [-0.18, -1.4, 0.04],  // left foot
      [0.18, -1.4, 0.04],   // right foot
      [0, -0.5, 0],         // pelvis
      [-0.46, 0.24, 0],     // left elbow
      [0.4, 0.34, 0],       // right elbow
      [-0.18, -0.95, 0],    // left knee
      [0.18, -0.95, 0],     // right knee
    ]

    const rand = makeRng(42)

    // Dot splatters
    for (let i = 0; i < dotCount; i++) {
      const hs = hotspots[Math.floor(rand() * hotspots.length)]
      const spread = i < 20 ? 0.1 : 0.2
      dots.push({
        pos: [
          hs[0] + (rand() - 0.5) * spread,
          hs[1] + (rand() - 0.5) * spread,
          hs[2] + (rand() - 0.5) * 0.06,
        ] as [number, number, number],
        radius: 0.003 + rand() * 0.014,
      })
    }

    // Drip streaks (small vertical lines dripping from stroke endpoints)
    for (let i = 0; i < dripCount; i++) {
      const hs = hotspots[Math.floor(rand() * hotspots.length)]
      drips.push({
        start: [
          hs[0] + (rand() - 0.5) * 0.08,
          hs[1],
          hs[2] + (rand() - 0.5) * 0.04,
        ] as [number, number, number],
        length: 0.05 + rand() * 0.12,
        radius: 0.002 + rand() * 0.004,
      })
    }

    return { dots, drips }
  }, [dotCount, dripCount])
}

/* ─── Hanji (Korean Paper) Backdrop ──────────────────────────────── */

function HanjiBackdrop() {
  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#F5E6D0'),
      roughness: 0.95,
      metalness: 0.0,
      transparent: true,
      opacity: 0.04,
      side: THREE.DoubleSide,
    })
  }, [])

  return (
    <mesh position={[0, 0, -2]} material={material}>
      <planeGeometry args={[10, 8]} />
    </mesh>
  )
}

/* ─── Brush Stroke Figure ────────────────────────────────────────── */

function BrushStrokeFigure() {
  const groupRef = useRef<THREE.Group>(null!)
  const leftArmRef = useRef<THREE.Group>(null!)
  const rightArmRef = useRef<THREE.Group>(null!)
  const curves = useBodyCurves()
  const { dots, drips } = useInkSplatters(45, 8)

  // Dark ink body — nearly black with warm gold emissive glow along edges
  const inkMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#080808'),
      roughness: 0.95,
      metalness: 0.0,
      emissive: new THREE.Color('#D4A843'),
      emissiveIntensity: 0.12,
    })
  }, [])

  const splatterMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0A0A0A'),
      roughness: 0.95,
      metalness: 0.0,
      emissive: new THREE.Color('#D4A843'),
      emissiveIntensity: 0.08,
    })
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    // Slow sculpture rotation
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.05
    }
    // Subtle arm sway — like brush being lifted by wind
    if (leftArmRef.current) {
      leftArmRef.current.rotation.z = Math.sin(t * 0.8) * 0.02
      leftArmRef.current.rotation.x = Math.sin(t * 0.6 + 1) * 0.015
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.z = Math.sin(t * 0.7 + 2) * 0.02
      rightArmRef.current.rotation.x = Math.sin(t * 0.5 + 0.5) * 0.015
    }
  })

  return (
    <group ref={groupRef} position={[0, 0.2, 0]}>
      {/* Spine — dominant vertical stroke, 'head' taper (thick at base) */}
      <TaperedTube curve={curves.spineCurve} maxRadius={0.065} segments={18} material={inkMaterial} taper="tail" />

      {/* Arms — 'head' taper (thick at shoulder, thin at hand) */}
      <group ref={leftArmRef}>
        <TaperedTube curve={curves.leftArmCurve} maxRadius={0.04} segments={12} material={inkMaterial} taper="head" />
      </group>
      <group ref={rightArmRef}>
        <TaperedTube curve={curves.rightArmCurve} maxRadius={0.04} segments={12} material={inkMaterial} taper="head" />
      </group>

      {/* Legs — 'bell' taper (thick in middle at thigh) */}
      <TaperedTube curve={curves.leftLegCurve} maxRadius={0.05} segments={12} material={inkMaterial} taper="bell" />
      <TaperedTube curve={curves.rightLegCurve} maxRadius={0.05} segments={12} material={inkMaterial} taper="bell" />

      {/* Connecting strokes — thin calligraphic bridges */}
      <TaperedTube curve={curves.shoulderCurve} maxRadius={0.025} segments={8} material={inkMaterial} taper="bell" />
      <TaperedTube curve={curves.hipCurve} maxRadius={0.03} segments={8} material={inkMaterial} taper="bell" />

      {/* Head — ink circle */}
      <mesh position={[0, 0.92, 0]} material={inkMaterial}>
        <sphereGeometry args={[0.1, 16, 16]} />
      </mesh>

      {/* Dot splatters */}
      {dots.map((s, i) => (
        <mesh key={`dot-${i}`} position={s.pos} material={splatterMaterial}>
          <sphereGeometry args={[s.radius, 6, 6]} />
        </mesh>
      ))}

      {/* Drip streaks — small vertical tubes falling from endpoints */}
      {drips.map((d, i) => {
        const dripCurve = new THREE.LineCurve3(
          new THREE.Vector3(...d.start),
          new THREE.Vector3(d.start[0], d.start[1] - d.length, d.start[2]),
        )
        return (
          <mesh key={`drip-${i}`} material={splatterMaterial}>
            <tubeGeometry args={[dripCurve, 3, d.radius, 6, false]} />
          </mesh>
        )
      })}
    </group>
  )
}

/* ─── Lighting ───────────────────────────────────────────────────── */

function Lighting() {
  return (
    <>
      <ambientLight intensity={0.08} />
      {/* Subtle warm key from upper-left — just enough to show form */}
      <directionalLight
        color="#F5E6D0"
        intensity={0.6}
        position={[-3, 4, 5]}
      />
      {/* Gold rim light from behind-left — catches edges */}
      <pointLight
        color="#D4A843"
        intensity={2.5}
        position={[-2, 1, -3]}
        distance={8}
        decay={2}
      />
      {/* Gold rim light from behind-right */}
      <pointLight
        color="#D4A843"
        intensity={2.0}
        position={[2, 0, -3]}
        distance={8}
        decay={2}
      />
      {/* Subtle cool top light for silhouette definition */}
      <directionalLight
        color="#8090AA"
        intensity={0.25}
        position={[0, 5, 1]}
      />
    </>
  )
}

/* ─── Main Component ─────────────────────────────────────────────── */

export default function CharBrushStroke() {
  return (
    <div style={{ width: '100%', height: '100%', background: '#0E0A06', position: 'fixed', inset: 0 }}>
      <Canvas
        style={{ width: '100%', height: '100%' }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
          preserveDrawingBuffer: true,
        }}
        camera={{ position: [0, 0.55, 3.8], fov: 50, near: 0.1, far: 100 }}
      >
        <DebugCamera />
        <color attach="background" args={['#0E0A06']} />
        <Lighting />
        <HanjiBackdrop />
        <BrushStrokeFigure />
        <EffectComposer>
          <Bloom
            intensity={0.6}
            luminanceThreshold={0.3}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
          <DepthOfField
            focusDistance={0.04}
            focalLength={0.05}
            bokehScale={2}
          />
          <Vignette eskil={false} offset={0.15} darkness={0.45} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
