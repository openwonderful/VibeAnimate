import { useMemo } from 'react'
import * as THREE from 'three'

/**
 * Signage for Act 6 — the BestHit Entertainment audition.
 *
 * Text in this project has to be generated, not loaded: there is no font
 * asset in the tree and the render pipeline runs offline, so drei's <Text>
 * (which fetches a typeface) is not an option. Canvas textures on plain
 * quads are, they mip properly, and they let the sign carry its own emissive
 * so it reads as a lit acrylic panel rather than a painted board.
 */

export const BESTHIT = 'BESTHIT'
export const ENTERTAINMENT = 'ENTERTAINMENT'

export interface TextTextureOptions {
  /** Pixel width of the backing canvas. Height is derived from `aspect`. */
  width?: number
  aspect?: number
  color?: string
  background?: string
  font?: string
  /** 0..1 of canvas width used by the text. */
  fill?: number
  letterSpacing?: number
  align?: 'center' | 'left'
}

/** Draws a single line of text to a transparent (or filled) canvas texture. */
export function makeTextTexture(text: string, opts: TextTextureOptions = {}): THREE.CanvasTexture {
  const {
    width = 1024,
    aspect = 6,
    color = '#FFFFFF',
    background = 'transparent',
    font = '700 200px Georgia, "Times New Roman", serif',
    fill = 0.86,
    letterSpacing = 0,
    align = 'center',
  } = opts

  const height = Math.round(width / aspect)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  if (background !== 'transparent') {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, width, height)
  }

  ctx.font = font
  ctx.textBaseline = 'middle'
  ctx.fillStyle = color

  // Manual letter spacing: canvas letterSpacing is not available everywhere,
  // and the sign needs the wide tracking that corporate logotypes use.
  const chars = [...text]
  const widths = chars.map((c) => ctx.measureText(c).width)
  const raw = widths.reduce((a, b) => a + b, 0) + letterSpacing * (chars.length - 1)
  const scale = (width * fill) / raw

  ctx.save()
  ctx.translate(align === 'center' ? width / 2 - (raw * scale) / 2 : width * 0.06, height / 2)
  ctx.scale(scale, scale)
  let x = 0
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], x, 0)
    x += widths[i] + letterSpacing
  }
  ctx.restore()

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  tex.needsUpdate = true
  return tex
}

/**
 * The company wordmark, as a lit sign. Two lines: BESTHIT large over
 * ENTERTAINMENT small and widely tracked, which is how agency logotypes in
 * this world are set — and, practically, makes the name unmistakable at a
 * glance even in a two-second cut.
 */
export function BestHitSign({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 6,
  color = '#F2F4FF',
  emissive = 1.4,
  showPanel = true,
  panelColor = '#141A2A',
}: {
  position?: [number, number, number]
  rotation?: [number, number, number]
  width?: number
  color?: string
  emissive?: number
  showPanel?: boolean
  panelColor?: string
}) {
  const bigTex = useMemo(
    () => makeTextTexture(BESTHIT, {
      width: 1400, aspect: 4.6, color,
      font: '700 260px Georgia, "Times New Roman", serif', letterSpacing: 14, fill: 0.9,
    }),
    [color],
  )
  const smallTex = useMemo(
    () => makeTextTexture(ENTERTAINMENT, {
      width: 1400, aspect: 13, color,
      font: '400 120px Georgia, "Times New Roman", serif', letterSpacing: 68, fill: 0.94,
    }),
    [color],
  )

  const bigH = width / 4.6
  const smallH = width / 13

  return (
    <group position={position} rotation={rotation}>
      {showPanel && (
        <mesh position={[0, 0, -0.05]}>
          <planeGeometry args={[width * 1.22, bigH + smallH * 3.4]} />
          <meshStandardMaterial color={panelColor} roughness={0.75} metalness={0.1} />
        </mesh>
      )}
      <mesh position={[0, smallH * 0.9, 0]}>
        <planeGeometry args={[width, bigH]} />
        <meshStandardMaterial
          map={bigTex}
          transparent
          emissive={color}
          emissiveMap={bigTex}
          emissiveIntensity={emissive}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      {/* Hairline rule between the two lines — the detail that makes it read
          as a designed mark rather than two stacked words. */}
      <mesh position={[0, smallH * 0.05, 0]}>
        <planeGeometry args={[width * 0.94, 0.012 * width]} />
        <meshStandardMaterial
          color={color} emissive={color} emissiveIntensity={emissive * 0.7}
          toneMapped={false} transparent opacity={0.75} depthWrite={false}
        />
      </mesh>
      <mesh position={[0, -smallH * 0.75, 0]}>
        <planeGeometry args={[width, smallH]} />
        <meshStandardMaterial
          map={smallTex}
          transparent
          emissive={color}
          emissiveMap={smallTex}
          emissiveIntensity={emissive * 0.85}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

/** A small printed card — audition number pinned to the chest. */
export function NumberTag({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  number = '074',
  size = 0.34,
}: {
  position?: [number, number, number]
  rotation?: [number, number, number]
  number?: string
  size?: number
}) {
  const tex = useMemo(
    () => makeTextTexture(number, {
      width: 512, aspect: 1.5, color: '#1A1A22', background: '#F6F3E8',
      font: '700 240px Georgia, serif', letterSpacing: 8, fill: 0.7,
    }),
    [number],
  )
  // Printed on one side only. It used to be DoubleSide, which meant any shot
  // that came round behind the figure read the number back-to-front through
  // the card — so the back is now a blank sheet of the same paper.
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <planeGeometry args={[size, size / 1.5]} />
        <meshStandardMaterial map={tex} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0, -0.002]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[size, size / 1.5]} />
        <meshStandardMaterial color="#EDE8DB" roughness={0.9} />
      </mesh>
    </group>
  )
}
