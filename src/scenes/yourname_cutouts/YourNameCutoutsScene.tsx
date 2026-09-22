/**
 * "Your Name" — layered cutouts version.
 *
 * Each painting element lives on its own textured plane at a distinct depth,
 * so the camera dolly produces real parallax between sky → clouds → rocks →
 * figures, instead of zooming a flat still image.
 *
 * Nano Banana can't output transparent PNGs, so layers get flat backgrounds
 * that we strip at load time:
 *   sky.png       — fully opaque, no processing (it's the back layer)
 *   clouds.png    — generated on PURE BLACK, composited with additive blend
 *                   so dark pixels drop out naturally
 *   rocks.png     — generated on PURE MAGENTA (#FF00FF), chroma-keyed to alpha
 *   figures.png   — generated on PURE MAGENTA (#FF00FF), chroma-keyed to alpha
 *
 * Layers render cleanly when missing — scene degrades gracefully so you can
 * drop PNGs in one at a time as Nano Banana spits them out.
 */

import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { DebugCamera, useCameraHandoff } from '../DebugCamera'

const ASSETS = {
  sky: '/images/yourname/sky.png',
  clouds: '/images/yourname/clouds.png',
  rocks: '/images/yourname/rocks.png',
  figures: '/images/yourname/figures.png',
} as const

type KeyColor = { r: number; g: number; b: number }
const MAGENTA: KeyColor = { r: 255, g: 0, b: 255 }

/**
 * Pipe an image through a <canvas> that turns the key color into transparency.
 * Tolerance uses RGB euclidean distance so JPEG-ish compression doesn't leave
 * hard magenta halos. softness fades alpha over the tolerance band to avoid
 * 1-pixel jagged edges.
 */
function stripChromaKey(image: HTMLImageElement, key: KeyColor, tolerance = 60, softness = 20): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(image, 0, 0)
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const px = img.data
  for (let i = 0; i < px.length; i += 4) {
    const dr = px[i] - key.r
    const dg = px[i + 1] - key.g
    const db = px[i + 2] - key.b
    const dist = Math.sqrt(dr * dr + dg * dg + db * db)
    if (dist <= tolerance - softness) {
      px[i + 3] = 0
    } else if (dist <= tolerance) {
      // Smooth alpha falloff across softness band.
      px[i + 3] = Math.round(((dist - (tolerance - softness)) / softness) * 255)
    }
  }
  ctx.putImageData(img, 0, 0)
  return canvas
}

type LoadOpts = { chromaKey?: KeyColor }

/**
 * Load a texture but resolve to null on 404 / error instead of throwing.
 * Optionally strips a chroma-key color to alpha via an offscreen canvas.
 */
function useOptionalTexture(url: string, opts: LoadOpts = {}): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  const keyRef = useRef(opts.chromaKey)
  keyRef.current = opts.chromaKey

  useEffect(() => {
    let cancelled = false
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (cancelled) return
      const source = keyRef.current
        ? stripChromaKey(img, keyRef.current)
        : img
      const t = new THREE.Texture(source as HTMLImageElement | HTMLCanvasElement)
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 4
      t.needsUpdate = true
      setTex(t)
    }
    img.onerror = () => {
      // eslint-disable-next-line no-console
      console.warn(`[YourNameCutouts] missing asset: ${url}`)
    }
    img.src = url
    return () => { cancelled = true }
  }, [url])

  return tex
}

/* ─── Layered cutout plane ────────────────────────────────────────── */
function CutoutLayer({
  url,
  z,
  height = 42,
  opacity = 1,
  chromaKey,
  additive = false,
}: {
  url: string
  z: number
  height?: number
  opacity?: number
  chromaKey?: KeyColor
  additive?: boolean
}) {
  const texture = useOptionalTexture(url, { chromaKey })
  if (!texture) return null

  const img = texture.image as { width: number; height: number } | undefined
  const aspect = img ? img.width / img.height : 16 / 9
  const width = height * aspect

  return (
    <mesh position={[0, 0, z]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={opacity}
        toneMapped={false}
        depthWrite={false}
        blending={additive ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </mesh>
  )
}

/* ─── Central light beam — emissive cylinder, breathes with bloom ── */
function LightBeam() {
  const ref = useRef<THREE.Mesh>(null!)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const mat = ref.current.material as THREE.MeshBasicMaterial
    mat.opacity = 0.75 + 0.25 * Math.sin(t * 1.4)
  })
  return (
    <mesh ref={ref} position={[0, 0, -18]}>
      <cylinderGeometry args={[0.22, 0.22, 70, 16, 1, true]} />
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

/* ─── Warm dust motes drifting between layers ─────────────────────── */
function DustMotes({ count = 80 }: { count?: number }) {
  const points = useRef<THREE.Points>(null!)
  const { geometry, material } = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30
      positions[i * 3 + 1] = (Math.random() - 0.5) * 18
      positions[i * 3 + 2] = -2 - Math.random() * 20
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
    const arr = pos.array as Float32Array
    for (let i = 0; i < count; i++) {
      const base = (i * 0.37) % 1
      arr[i * 3 + 1] = ((base + t * 0.04) % 1 - 0.5) * 18
    }
    pos.needsUpdate = true
  })

  return <points ref={points} geometry={geometry} material={material} />
}

/* ─── Camera dolly — slow forward push with tiny sway ────────────── */
function CameraRig() {
  const yieldCamera = useCameraHandoff()
  useFrame(({ camera, clock }) => {
    if (yieldCamera()) return
    const t = clock.getElapsedTime()
    const cycle = (t % 30) / 30
    camera.position.z = 8 - cycle * 12
    camera.position.x = Math.sin(t * 0.1) * 0.3
    camera.position.y = Math.sin(t * 0.07) * 0.15
    camera.lookAt(0, 0, -18)
  })
  return null
}

/* ─── Context-loss guard — keeps GL alive on re-renders ──────────── */
function ContextGuard() {
  const { gl } = useThree()
  useEffect(() => {
    const canvas = gl.domElement
    const onLost = (e: Event) => {
      e.preventDefault()
      // eslint-disable-next-line no-console
      console.warn('[YourNameCutouts] WebGL context lost — browser will attempt restore')
    }
    canvas.addEventListener('webglcontextlost', onLost)
    return () => canvas.removeEventListener('webglcontextlost', onLost)
  }, [gl])
  return null
}

/* ─── Main scene ─────────────────────────────────────────────────── */
export default function YourNameCutoutsScene() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0A0818' }}>
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true, toneMapping: THREE.NoToneMapping, powerPreference: 'high-performance' }}
        camera={{ fov: 50, position: [0, 0, 8], near: 0.1, far: 200 }}
      >
        <ContextGuard />
        <DebugCamera />

        {/* Depth-ordered layers, back to front.
            Heights picked so each plane covers the frustum at its z.
            Sky is fully opaque; clouds use additive blending (black drops
            out); rocks + figures use magenta chroma-key to alpha. */}
        <CutoutLayer url={ASSETS.sky}     z={-40} height={42} />
        <CutoutLayer url={ASSETS.clouds}  z={-28} height={32} additive />
        <LightBeam />
        <CutoutLayer url={ASSETS.rocks}   z={-14} height={20} chromaKey={MAGENTA} />
        <CutoutLayer url={ASSETS.figures} z={-10} height={16} chromaKey={MAGENTA} />
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
