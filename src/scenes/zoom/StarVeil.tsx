import { useLayoutEffect, useMemo, useRef } from 'react'
import { seededRandom } from '../../utils/svgHelpers'
import { useDepthCamera } from './DepthCamera'

/**
 * StarVeil — the thing the camera punches out through at 0:07.24.
 *
 * WHY THIS PROJECTS, AND WHY ONTO A CANVAS
 *
 * Projecting: the obvious build is a <DomDepthLayer> wrapping an SVG of
 * stars, letting CSS scale the whole thing. A viewport-sized layer never
 * *leaves* the frame though — it only gets bigger — so it has to be faded
 * out, and a fade is exactly what a punch-through is not. It reads as the
 * stars going transparent rather than as the camera going past them. Each
 * star is therefore projected individually: a star at screen offset d from
 * the vanishing point sits at d · depth/(depth − camZ), runs off the edge of
 * frame, and is simply not drawn any more. Full opacity the whole way.
 *
 * Canvas: the first cut of that projection emitted ~1000 <circle> elements
 * whose cx/cy/r all changed every frame. Chrome re-rasterized the whole SVG
 * on each one, and scene 1.2 went from 159s to over half an hour. A canvas
 * with one pre-rendered glow sprite blitted per star is the right shape for
 * "hundreds of small moving sprites" — a few hundred drawImage calls a frame,
 * no layout, no DOM churn.
 */

/** Vanishing point in 1920×1080 space — matches DepthCamera's transform
 *  origin (50%, 24%), so the field expands from where the camera is aimed. */
const VP_X = 960
const VP_Y = 259

/** Stars nearer the vanishing point than this would barely move and never
 *  leave the frame; nudge them out so everything eventually clears. */
const MIN_RADIUS = 26

const CANVAS_W = 1920
const CANVAS_H = 1080

/** Cool whites, with the occasional warmer one so the field isn't sterile. */
const TINTS = ['#FFFFFF', '#FFFFFF', '#E8F0FF', '#D6E4FF', '#FFF4DC']

/** Sprite is drawn at this pixel size and scaled down per star. */
const SPRITE_PX = 64

interface Star {
  dx: number   // offset from the vanishing point, unscaled
  dy: number
  r: number
  o: number
  tint: number
}

export interface Shell {
  depth: number
  count: number
  seed: number
  opacity?: number
}

const DEFAULT_SHELLS: Shell[] = [
  { depth: 4.03, count: 210, seed: 7001, opacity: 1 },
  { depth: 3.84, count: 170, seed: 7002, opacity: 0.85 },
  { depth: 3.65, count: 130, seed: 7003, opacity: 0.7 },
]

function makeStars(count: number, seed: number): Star[] {
  const rand = seededRandom(seed)
  const out: Star[] = []
  for (let i = 0; i < count; i++) {
    const angle = rand() * Math.PI * 2
    // Packed toward the vanishing point (radius ∝ u^1.4) because that is
    // where they linger longest — a uniform spread thins to nothing the
    // moment it starts growing. Don't push the exponent much past this or
    // the concentration reads as a blob behind the title on frame one.
    const radius = MIN_RADIUS + Math.pow(rand(), 1.4) * 1450
    const bright = rand()
    out.push({
      dx: Math.cos(angle) * radius,
      dy: Math.sin(angle) * radius * 0.62, // frame is wider than tall
      r: 0.8 + bright * bright * 1.7,
      o: 0.5 + bright * 0.5,
      tint: Math.floor(rand() * TINTS.length),
    })
  }
  return out
}

/** One soft glow per tint: bright core falling off to nothing, so a star
 *  still reads as light rather than as a grey disc when it is 20× overhead. */
function makeSprites(): HTMLCanvasElement[] {
  return TINTS.map((tint) => {
    const c = document.createElement('canvas')
    c.width = SPRITE_PX
    c.height = SPRITE_PX
    const ctx = c.getContext('2d')!
    const h = SPRITE_PX / 2
    const g = ctx.createRadialGradient(h, h, 0, h, h, h)
    g.addColorStop(0, '#FFFFFF')
    g.addColorStop(0.16, tint)
    g.addColorStop(0.42, `${tint}66`)
    g.addColorStop(1, `${tint}00`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, SPRITE_PX, SPRITE_PX)
    return c
  })
}

export default function StarVeil({
  shells = DEFAULT_SHELLS,
  zIndex = 160,
}: {
  shells?: Shell[]
  zIndex?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { cameraZ } = useDepthCamera()

  const sprites = useMemo(makeSprites, [])
  const fields = useMemo(
    () => shells.map((s) => ({ shell: s, stars: makeStars(s.count, s.seed) })),
    [shells],
  )

  // Layout effect, not an effect: this has to have painted before Remotion
  // captures the frame.
  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

    for (const { shell, stars } of fields) {
      const relD = shell.depth - cameraZ
      if (relD <= 0.02) continue          // camera is past this shell entirely
      const scale = shell.depth / relD
      const shellOpacity = shell.opacity ?? 1

      for (const s of stars) {
        const x = VP_X + s.dx * scale
        const y = VP_Y + s.dy * scale
        // Radius of the drawn glow, not of the star's core.
        const size = s.r * scale * 5.2
        if (x + size < 0 || x - size > CANVAS_W || y + size < 0 || y - size > CANVAS_H) continue
        ctx.globalAlpha = s.o * shellOpacity
        ctx.drawImage(sprites[s.tint], x - size / 2, y - size / 2, size, size)
      }
    }
    ctx.globalAlpha = 1
  }, [cameraZ, fields, sprites])

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex,
      }}
    />
  )
}
