/**
 * Shared machinery for the lantern lab sheets (`?act=8b-lab`, `?act=8b-lab2`).
 *
 * Labels, the envelope material, one lantern, a row of them, the in-the-hand
 * strip, and the canvas wrapper that puts all of it under 8b's exact
 * background, exposure, bloom and vignette — because a lantern judged under
 * different post is a lantern judged in a different scene.
 *
 * Nothing in here is imported by 8b itself.
 */
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { getAnimTime } from '../../hooks/useAnimTime'
import { SceneCanvas } from '../SceneCanvas'
import { NIGHT_BG } from '../act8_55/constants'
import { LANTERN_SIZE } from './lanterns'
import {
  buildLanternGeometry, makeEnvelopeMaterial,
  type EnvelopeOpts, type LanternDesign,
} from './lanternShapes'

/** Display size for the catalogue rows — about 3× what the scene draws. */
export const SHEET_SCALE = 1.6
/** Every row heading hangs off the same left margin. */
export const HEADING_X = -11.1

/* ── Labels ──────────────────────────────────────────────────────── */

function makeLabelTexture(lines: string[], size = 40, color = '#F0DCB4'): THREE.CanvasTexture {
  const w = 768
  const h = 224
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  lines.forEach((line, i) => {
    ctx.font = i === 0
      ? `600 ${size}px "Noto Sans CJK KR", "Noto Serif CJK KR", sans-serif`
      : `400 ${size * 0.76}px "Noto Sans CJK KR", "Noto Serif CJK KR", sans-serif`
    ctx.fillStyle = i === 0 ? color : 'rgba(214,196,164,0.72)'
    ctx.fillText(line, w / 2, h * (0.34 + i * 0.34))
  })
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

export function Label({ position, lines, width = 2.4, size, color }: {
  position: [number, number, number]
  lines: string[]
  width?: number
  size?: number
  color?: string
}) {
  const texture = useMemo(() => makeLabelTexture(lines, size, color), [lines, size, color])
  return (
    <mesh position={position}>
      <planeGeometry args={[width, width * (224 / 768)]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

/* ── The envelope material ───────────────────────────────────────── */

/**
 * 1.1-B's colours for the wooden caps and the tassel cord — the parts a
 * lantern does NOT glow through. Act 1 paints these near-black and gets away
 * with it because they sit inside a point light; under 8b's unlit materials a
 * near-black cap against a night sky is not dark detail, it is nothing. So
 * they carry the tone the lantern would throw on them.
 */
const CAP_MATERIAL = new THREE.MeshBasicMaterial({ color: '#6E4A26', toneMapped: false })
const TASSEL_MATERIAL = new THREE.MeshBasicMaterial({ color: '#9A7844', toneMapped: false })

/* ── One lantern on the sheet ────────────────────────────────────── */

export function LabLantern({
  design, position, scale, hex, lit = 0.78, phase = 0, spin = true, envelope,
}: {
  design: LanternDesign
  position: [number, number, number]
  scale: number
  hex: string
  lit?: number
  phase?: number
  spin?: boolean
  /** Override the shading model — used to show a scene's own treatment. */
  envelope?: EnvelopeOpts
}) {
  const ref = useRef<THREE.Group>(null)
  const geometry = useMemo(() => buildLanternGeometry(design), [design])
  const material = useMemo(
    () => makeEnvelopeMaterial(hex, lit, design, envelope), [hex, lit, design, envelope])
  const hw = design.hardware

  useFrame(() => {
    if (ref.current) ref.current.rotation.y = (spin ? getAnimTime() * 0.42 : 0) + phase
  })

  return (
    <group ref={ref} position={position} scale={scale}>
      <mesh geometry={geometry} material={material} />
      {hw && (
        <>
          <mesh position={[0, hw.capY, 0]} material={CAP_MATERIAL}>
            <cylinderGeometry args={[hw.capR, hw.capR, hw.capH, 12]} />
          </mesh>
          <mesh position={[0, -hw.capY, 0]} material={CAP_MATERIAL}>
            <cylinderGeometry args={[hw.capR * 0.846, hw.capR * 0.846, hw.capH, 12]} />
          </mesh>
          <mesh position={[0, hw.tasselY, 0]} material={TASSEL_MATERIAL}>
            <cylinderGeometry args={[hw.tasselR, hw.tasselR, hw.tasselLen, 6]} />
          </mesh>
        </>
      )}
    </group>
  )
}

/** Row of designs plus their captions. */
export function DesignRow({ designs, y, spacing, heading, hex, lit, subheading }: {
  designs: LanternDesign[]
  y: number
  spacing: number
  heading: string
  subheading?: string
  hex: string
  lit?: number
}) {
  const x0 = -((designs.length - 1) / 2) * spacing
  return (
    <group>
      <Label
        position={[HEADING_X, y, 0]}
        lines={subheading ? [heading, subheading] : [heading]} width={2.7} size={44}
      />
      {designs.map((d, i) => (
        <group key={d.id}>
          <LabLantern
            design={d} scale={SHEET_SCALE} phase={i * 0.7} hex={hex} lit={lit}
            position={[x0 + i * spacing, y, 0]}
          />
          <Label
            position={[x0 + i * spacing, y - 1.15, 0]}
            lines={[`${d.id}  ${d.label}`, d.note]}
            width={spacing * 0.98}
          />
        </group>
      ))}
    </group>
  )
}

/* ── True scale: what a figure actually holds ────────────────────── */

/**
 * The strip that keeps a sheet honest. A crowd figure is a capsule of
 * `archetypeHeight('tall') · 0.7 · 3` and the lantern beside it is at
 * `LANTERN_SIZE · 0.7` — the exact proportions 8b renders. Judged at 3× on the
 * rows above, a drum and a sky lantern are different objects; at this size they
 * are four pixels each, and the only question is which silhouette survives.
 */
export function TrueScaleStrip({ designs, y, spacing, hex, lit, shownAt = 1.25 }: {
  designs: LanternDesign[]
  y: number
  spacing: number
  hex: string
  lit?: number
  shownAt?: number
}) {
  const bodyH = 0.55 * 0.7 * 3
  const bodyW = 0.14 * 0.7 * 3
  const headR = 0.13 * 0.7
  const lanternScale = 0.7 * LANTERN_SIZE
  const x0 = -((designs.length - 1) / 2) * spacing
  const gl = useThree(s => s.gl)

  // The crowd capsule is half buried — 8b hides the bottom in the ground, and
  // without one these read as sticks twice their real height. A dark card
  // across the front hid it, and also hid everything on the sheet BELOW the
  // strip, which is fatal once a sheet scrolls. A clipping plane at the feet
  // line cuts the capsule and nothing else.
  useEffect(() => { gl.localClippingEnabled = true }, [gl])
  const bodyMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color('#F0CE7E').multiplyScalar(0.68), toneMapped: false,
    clippingPlanes: [new THREE.Plane(new THREE.Vector3(0, 1, 0), -y)],
  }), [y])

  return (
    <group>
      <Label
        position={[HEADING_X, y + 1.5, 0]}
        lines={['IN THE HAND', `8b's proportions, shown ${shownAt}×`]} width={2.8} size={40}
      />
      {designs.map((d, i) => (
        <group key={d.id} position={[x0 + i * spacing, y, 0]} scale={shownAt}>
          <mesh position={[0, bodyH * 0.5, 0]} scale={[bodyW, bodyH, bodyW]} material={bodyMat}>
            <capsuleGeometry args={[0.5, 1, 4, 8]} />
          </mesh>
          <mesh position={[0, bodyH * 1.5 + headR * 0.9, 0]} scale={headR} material={bodyMat}>
            <sphereGeometry args={[1, 8, 6]} />
          </mesh>
          <LabLantern
            design={d} scale={lanternScale} phase={i * 0.7} hex={hex} lit={lit}
            position={[0.5, bodyH * 0.95, 0.12]}
          />
        </group>
      ))}

      {designs.map((d, i) => (
        <Label
          key={d.id} position={[x0 + i * spacing, y - 0.42, 0.9]}
          lines={[d.id]} width={0.9} size={54}
        />
      ))}
    </group>
  )
}

/* ── Scrolling ───────────────────────────────────────────────────── */

/**
 * Wheel / drag / arrow-key vertical pan, so a sheet can be taller than the
 * frame. The camera opens looking straight down −z, so moving it in y pans
 * without tilting — no lookAt, no rotation, and the whole sheet keeps the same
 * perspective wherever you are on it.
 *
 * `?scroll=<y>` sets the position up front and skips the easing, which is how
 * a screenshot of the bottom of a sheet stays deterministic: `shot.mjs` gets
 * the frame it asked for rather than one mid-glide.
 */
function ScrollPan({ min, max }: { min: number; max: number }) {
  const gl = useThree(s => s.gl)
  const initial = useMemo(() => {
    const raw = new URLSearchParams(window.location.search).get('scroll')
    const v = raw === null ? max : Number(raw)
    return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : max
  }, [min, max])
  const target = useRef(initial)
  const current = useRef(initial)

  useEffect(() => {
    const el = gl.domElement
    const clamp = (v: number) => Math.min(max, Math.max(min, v))
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      target.current = clamp(target.current - e.deltaY * 0.012)
    }
    let dragY: number | null = null
    const onDown = (e: PointerEvent) => { dragY = e.clientY }
    const onMove = (e: PointerEvent) => {
      if (dragY === null) return
      target.current = clamp(target.current + (dragY - e.clientY) * -0.02)
      dragY = e.clientY
    }
    const onUp = () => { dragY = null }
    const onKey = (e: KeyboardEvent) => {
      const step = e.key === 'PageDown' || e.key === 'PageUp' ? 6 : 1.4
      if (e.key === 'ArrowDown' || e.key === 'PageDown') target.current = clamp(target.current - step)
      else if (e.key === 'ArrowUp' || e.key === 'PageUp') target.current = clamp(target.current + step)
      else if (e.key === 'Home') target.current = max
      else if (e.key === 'End') target.current = min
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('keydown', onKey)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('keydown', onKey)
    }
  }, [gl, min, max])

  useFrame(({ camera }) => {
    current.current += (target.current - current.current) * 0.18
    camera.position.y = current.current
  })
  return null
}

/* ── The page ────────────────────────────────────────────────────── */

export function LabCanvas({ children, background = NIGHT_BG, scroll, camera, target }: {
  children: ReactNode
  background?: string
  /** [min, max] camera-y travel. Omit for a sheet that fits the frame. */
  scroll?: [number, number]
  camera?: { position: [number, number, number]; fov: number }
  target?: [number, number, number]
}) {
  const cam = camera ?? { position: [0, 0, 16.4] as [number, number, number], fov: 42 }
  return (
    <div style={{ width: '100vw', height: '100vh', background, overflow: 'hidden' }}>
      <SceneCanvas
        style={{ width: '100%', height: '100%' }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.25,
          preserveDrawingBuffer: true,
        }}
        camera={{ position: cam.position, fov: cam.fov, near: 0.1, far: 400 }}
        debugTarget={target ?? [0, 0, 0]}
      >
        <color attach="background" args={[background]} />
        {scroll && <ScrollPan min={scroll[0]} max={scroll[1]} />}
        {children}
        {/* 8b's post chain exactly. */}
        <EffectComposer>
          <Bloom intensity={0.92} luminanceThreshold={0.24} luminanceSmoothing={0.85} mipmapBlur />
          <Vignette eskil={false} offset={0.18} darkness={0.48} />
        </EffectComposer>
      </SceneCanvas>
    </div>
  )
}
