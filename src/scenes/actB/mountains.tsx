/**
 * Act B — the range, and the ground the whole act stands on.
 *
 * These are Korean minhwa mountains, not alpine ones: rounded domes in flat
 * saturated greens and teals, stacked in bands from near-black at the front
 * to a bright jade on the horizon, with pines along the ridges and cranes
 * crossing the valley. It is the same language as Act 1.1's painted
 * landscape and Act 3.1's hills behind the farm road, so the flight passes
 * through the world the rest of the film lives in.
 *
 * The first version of this was craggy noise-displaced rock lit by a single
 * moon — technically a mountain range, and completely wrong: cold, grey and
 * frightening, when the scene it opens is supposed to be a bright night.
 * The fix is not more light. It is flat UNLIT colour: MeshBasicMaterial with
 * vertex colours, so every hill is a clean saturated shape exactly like the
 * painted layers, and the fog alone carries the depth. Nothing here is shaded.
 *
 * Everything in the act sits on ONE ground plane running from behind the
 * camera to the far side of the stadium, shaded by world z — valley floor
 * under the range, a lattice of streets under the city, the stadium's apron
 * at the end. You never see a horizon change, so you never feel a cut.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { seededRandom } from '../../utils/svgHelpers'
import { worldTime } from './time'
import {
  RIDGE_BANDS, CITY_Z_NEAR, CITY_Z_FAR, STADIUM_Z, dayTint, nightFall,
} from './flight'

/** Bearing of the moon in plan, so the hills can be shaded toward it. */
const MOON_BEARING = Math.atan2(0.80, -0.44)

/* ── One hill ─────────────────────────────────────────────────────── */
/**
 * A dome revolved from a cosine profile: flat-topped at the summit,
 * steepening toward the base. Two octaves of very gentle angular ripple keep
 * it from being a perfect solid of revolution without ever making it jagged
 * — these are hills in a painting, and a painting's hills have no scree.
 */
function makeHillGeometry(
  seed: number, radius: number, height: number,
  top: string, base: string,
): THREE.BufferGeometry {
  const RAD = 40
  const ROWS = 14
  const rand = seededRandom(seed)
  const k0 = rand() * 6.28, k1 = rand() * 6.28
  const squash = 0.78 + rand() * 0.5      // ellipse in plan
  const lean = (rand() - 0.5) * 0.16

  const pos: number[] = []
  const col: number[] = []
  const idx: number[] = []
  const cTop = new THREE.Color(top)
  const cBase = new THREE.Color(base)
  const c = new THREE.Color()

  for (let r = 0; r <= ROWS; r++) {
    const u = r / ROWS                                  // 0 = summit
    const y = height * Math.pow(Math.cos(u * Math.PI / 2), 1.35)
    for (let a = 0; a <= RAD; a++) {
      const th = (a / RAD) * Math.PI * 2
      const wob = 1 + 0.055 * Math.sin(th * 3 + k0) + 0.03 * Math.sin(th * 7 + k1)
      const rr = radius * u * wob
      pos.push(Math.cos(th) * rr + lean * y, y, Math.sin(th) * rr * squash)
      // Lighter toward the summit, and a soft moon-side wash baked straight
      // into the vertex colour. Unlit flat fills are the right look, but with
      // NO form at all a hill passing under the lens reads as a 2D shape
      // sliding off the bottom of the frame rather than as something the
      // camera flew over.
      const facing = 0.5 + 0.5 * Math.cos(th - MOON_BEARING)
      const form = 0.80 + 0.30 * facing * Math.pow(u, 0.6)
      c.copy(cBase).lerp(cTop, Math.pow(1 - u, 1.6)).multiplyScalar(form)
      col.push(c.r, c.g, c.b)
    }
  }
  for (let r = 0; r < ROWS; r++) {
    for (let a = 0; a < RAD; a++) {
      const i0 = r * (RAD + 1) + a
      const i1 = i0 + 1
      const j0 = (r + 1) * (RAD + 1) + a
      const j1 = j0 + 1
      idx.push(i0, j0, i1, i1, j0, j1)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  g.setIndex(idx)
  return g
}

type HillSpec = {
  pos: [number, number, number]
  radius: number
  height: number
  seed: number
  top: string
  base: string
}

/**
 * Bands front to back. The palette is the reason the shot reads as
 * cheerful: near-black jade at the front, brightening through green to a
 * light jade on the horizon — the stack Act 1.1 paints.
 *
 * `gap` is the half-width of the pass kept clear at the centre of each band.
 * The filler hills DO cross the pass, at a height the flight clears, which
 * is what makes it a pass rather than a hole in a wall.
 */
const BANDS = [
  { z: RIDGE_BANDS[0], gap: 300, count: 7, r: [250, 430], h: [230, 400], seed: 3101, fill: 5, fillH: [40, 90], base: '#0D2A26', top: '#18493F' },
  { z: RIDGE_BANDS[1], gap: 265, count: 8, r: [270, 470], h: [280, 470], seed: 3102, fill: 6, fillH: [36, 78], base: '#16473E', top: '#246A57' },
  { z: RIDGE_BANDS[2], gap: 250, count: 8, r: [300, 510], h: [330, 560], seed: 3103, fill: 6, fillH: [32, 66], base: '#20604F', top: '#328B72' },
  { z: RIDGE_BANDS[3], gap: 300, count: 9, r: [340, 580], h: [380, 640], seed: 3104, fill: 7, fillH: [28, 58], base: '#2B7A64', top: '#47A88C' },
]

function buildBand(b: typeof BANDS[number]): HillSpec[] {
  const rand = seededRandom(b.seed)
  const out: HillSpec[] = []
  for (let i = 0; i < b.count; i++) {
    const side = i % 2 === 0 ? -1 : 1
    const radius = b.r[0] + rand() * (b.r[1] - b.r[0])
    const height = b.h[0] + rand() * (b.h[1] - b.h[0])
    const rank = Math.floor(i / 2)
    const x = side * (b.gap + radius * 0.5 + rank * (radius * 1.05 + 60) + rand() * 110)
    out.push({
      pos: [x, -14, b.z + (rand() - 0.5) * 150],
      radius, height, seed: b.seed * 31 + i, base: b.base, top: b.top,
    })
  }
  for (let i = 0; i < b.fill; i++) {
    out.push({
      pos: [(rand() - 0.5) * (b.gap * 2.4), -12, b.z - 40 + rand() * 120],
      radius: 170 + rand() * 260,
      height: b.fillH[0] + rand() * (b.fillH[1] - b.fillH[0]),
      seed: b.seed * 97 + i, base: b.base, top: b.top,
    })
  }
  return out
}

/* ── The surface, for other acts to stand things on ───────────────── */

/**
 * One hill's private shape numbers, drawn exactly as `makeHillGeometry` draws
 * them — same seed, same order — so a surface point computed here lands on the
 * rendered mesh to the vertex.
 */
function hillShape(seed: number) {
  const rand = seededRandom(seed)
  const k0 = rand() * 6.28
  const k1 = rand() * 6.28
  const squash = 0.78 + rand() * 0.5
  const lean = (rand() - 0.5) * 0.16
  return { k0, k1, squash, lean }
}

/** `alt` is the point's RELATIVE altitude on its own hill (0 at the skirt,
 *  1 at the summit — y / that hill's peak height), so a consumer can stage
 *  something up the slopes without knowing which dome a point landed on. */
export type RidgeSurfacePoint = { x: number; y: number; z: number; alt: number }

/**
 * World-space points on the valley-facing slopes of the first two ridge bands
 * — the domes 8.55 looks at past the house. Act 8.55's far crowd stands its
 * mountain lights on these; its own old terrain (whose silhouette that cloud
 * was built against) is no longer mounted, and points placed by the old
 * profile sat INSIDE these hills, depth-tested away to nothing.
 *
 * Sampling favours the lower slopes — people climb a mountainside from the
 * bottom — and clips anything below `minY`, which is where the valley's own
 * crowd and fog take over.
 */
export function sampleRidgeFaces(count: number, seed = 20260813): RidgeSurfacePoint[] {
  const hills = [...buildBand(BANDS[0]), ...buildBand(BANDS[1])]
  const shapes = hills.map(h => hillShape(h.seed))
  // The nearer band carries twice the weight: band 1 shows only over band 0's
  // shoulders, and lights buried behind the front crest are wasted points.
  const weights = hills.map((h, i) => h.radius * (i < BANDS[0].count + BANDS[0].fill ? 1 : 0.5))
  const totalW = weights.reduce((a, b) => a + b, 0)
  const rand = seededRandom(seed)
  const out: RidgeSurfacePoint[] = []
  let guard = 0
  while (out.length < count && guard++ < count * 40) {
    let pick = rand() * totalW
    let hi = 0
    while (pick > weights[hi] && hi < hills.length - 1) { pick -= weights[hi]; hi++ }
    const h = hills[hi]
    const s = shapes[hi]
    // u: 0 = summit … 1 = base, per the dome profile. Cluster low, thin high.
    const u = 0.20 + Math.pow(rand(), 0.8) * 0.74
    // Valley-facing half: local −z faces the house. A little short of the
    // full half so no light hangs right on the silhouette edge.
    const th = Math.PI + 0.25 + rand() * (Math.PI - 0.5)
    const y = h.height * Math.pow(Math.cos((u * Math.PI) / 2), 1.35)
    const wob = 1 + 0.055 * Math.sin(th * 3 + s.k0) + 0.03 * Math.sin(th * 7 + s.k1)
    const rr = h.radius * u * wob
    const x = h.pos[0] + Math.cos(th) * rr + s.lean * y
    const z = h.pos[2] + Math.sin(th) * rr * s.squash
    const wy = h.pos[1] + y
    if (wy < 30) continue            // below the crowd / valley fog line
    if (Math.abs(x) > 1900) continue // outside the width the shot ever frames
    out.push({ x, y: wy, z, alt: y / h.height })
  }
  return out
}

/** Shared basic material, so the whole range can be tinted in one place —
 *  the pull-out at the end of the act warms it from night to dusk. */
function useRangeMaterial() {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    vertexColors: true, fog: true,
  }), [])
  useFrame(() => {
    const w = worldTime()
    // Warm and bright through the golden hour, then back down into the blue
    // for Act 3.2 — and darker than they started, because by then the only
    // light on them is a moon.
    const t = dayTint(w) * (1 - nightFall(w))
    const night = nightFall(w)
    mat.color.setRGB(
      (1.06 + t * 0.62) * (1 - night * 0.72),
      (1.10 + t * 0.14) * (1 - night * 0.66),
      (1.10 - t * 0.46) * (1 - night * 0.52),
    )
  })
  return mat
}

export function Ridges() {
  const hills = useMemo(() => BANDS.flatMap(buildBand), [])
  const geos = useMemo(
    () => hills.map(h => makeHillGeometry(h.seed, h.radius, h.height, h.top, h.base)),
    [hills],
  )
  const mat = useRangeMaterial()

  return (
    <group>
      {hills.map((h, i) => (
        <mesh key={i} position={h.pos} geometry={geos[i]} material={mat} />
      ))}
    </group>
  )
}

/* ── Foreground hills ─────────────────────────────────────────────── */
/**
 * Three hills right on top of the lens at t=0. They exist for parallax: they
 * blow past in the first two seconds and give the opening a sense of speed
 * the moment the camera starts to move.
 */
export function ForegroundCrags() {
  const specs = useMemo<HillSpec[]>(() => [
    { pos: [-360, -30, 70], radius: 220, height: 300, seed: 7701, base: '#050F10', top: '#0A2020' },
    { pos: [450, -40, 165], radius: 250, height: 330, seed: 7702, base: '#050F10', top: '#0A2020' },
    { pos: [-620, -30, 280], radius: 280, height: 300, seed: 7703, base: '#061312', top: '#0C2523' },
  ], [])
  const geos = useMemo(
    () => specs.map(p => makeHillGeometry(p.seed, p.radius, p.height, p.top, p.base)),
    [specs],
  )
  const mat = useRangeMaterial()
  return (
    <group>
      {specs.map((p, i) => (
        <mesh key={i} position={p.pos} geometry={geos[i]} material={mat} />
      ))}
    </group>
  )
}

/* ── Pines ────────────────────────────────────────────────────────── */
/**
 * Stylised pines along the ridges — the detail that turns a coloured dome
 * into a mountain. One InstancedMesh for the lot, sitting on the hill
 * surface, computed from the same cosine profile the geometry uses.
 */
export function Pines() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const COUNT = 300

  /**
   * Act 1.1's pine: a trunk and three stacked tiers, widest at the bottom.
   * A single cone — what this was — is a spike, and a hillside of spikes
   * reads as a threat rather than as a forest.
   */
  const geo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = []
    const trunk = new THREE.CylinderGeometry(0.055, 0.075, 0.62, 5)
    trunk.translate(0, 0.31, 0)
    parts.push(trunk)
    const tiers: [number, number, number][] = [
      [0.52, 0.72, 0.50],   // radius, height, base y
      [0.40, 0.66, 0.92],
      [0.27, 0.60, 1.34],
    ]
    for (const [r, h, y] of tiers) {
      const c = new THREE.ConeGeometry(r, h, 8)
      c.translate(0, y + h / 2, 0)
      parts.push(c)
    }
    // Merge by hand — one buffer, no BufferGeometryUtils dependency.
    // Expand to non-indexed FIRST and size the buffer from those counts:
    // an indexed cone has far fewer vertices than triangle corners, and
    // sizing from the indexed count overruns the moment you copy.
    const flat = parts.map(g => (g.index ? g.toNonIndexed() : g))
    let n = 0
    for (const g of flat) n += (g.attributes.position as THREE.BufferAttribute).count
    const pos = new Float32Array(n * 3)
    let o = 0
    for (const g of flat) {
      const a = g.attributes.position as THREE.BufferAttribute
      pos.set(a.array as Float32Array, o)
      o += a.count * 3
    }
    const out = new THREE.BufferGeometry()
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return out
  }, [])
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#0A2A22', fog: true }), [])

  const matrices = useMemo(() => {
    const rand = seededRandom(6301)
    const hills = BANDS.flatMap(buildBand)
    const out: THREE.Matrix4[] = []
    const m = new THREE.Matrix4()
    for (let i = 0; i < COUNT; i++) {
      const h = hills[Math.floor(rand() * hills.length)]
      if (h.height < 120) continue
      // Somewhere on the flank, mostly upper — a pine reads against the sky,
      // not against more hill.
      const u = 0.18 + Math.pow(rand(), 0.7) * 0.66
      const th = rand() * Math.PI * 2
      const y = h.height * Math.pow(Math.cos(u * Math.PI / 2), 1.35)
      const rr = h.radius * u
      const s = 12 + rand() * 22
      m.compose(
        new THREE.Vector3(h.pos[0] + Math.cos(th) * rr, h.pos[1] + y - 2, h.pos[2] + Math.sin(th) * rr),
        new THREE.Quaternion(),
        new THREE.Vector3(s * 0.5, s, s * 0.5),
      )
      out.push(m.clone())
    }
    return out
  }, [])

  useFrame(() => {
    const mesh = ref.current
    if (!mesh || mesh.userData.placed) return
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m))
    mesh.count = matrices.length
    mesh.instanceMatrix.needsUpdate = true
    mesh.userData.placed = true
  })

  return <instancedMesh ref={ref} args={[geo, mat, COUNT]} frustumCulled={false} />
}

/* ── Hillside flowers ─────────────────────────────────────────────── */
/**
 * Act 1.1 dots its slopes with little five-petal blooms; without them the
 * hills are large empty fields of one colour. Instanced discs, scattered on
 * the same cosine surface the pines stand on.
 */
export function HillFlowers() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const COUNT = 340
  const geo = useMemo(() => new THREE.CircleGeometry(1, 5), [])
  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#FFFFFF', fog: true, side: THREE.DoubleSide,
  }), [])
  const PALETTE = ['#F6C7D6', '#FFE7A8', '#FFFFFF', '#F2A6C0', '#CFE9D8']

  const placed = useMemo(() => {
    const rand = seededRandom(6602)
    const hills = BANDS.flatMap(buildBand)
    const out: { m: THREE.Matrix4; c: THREE.Color }[] = []
    const m = new THREE.Matrix4()
    for (let i = 0; i < COUNT; i++) {
      const h = hills[Math.floor(rand() * hills.length)]
      // Only on the real hills. On the low fillers that cross the pass they
      // sit right under the lens and read as a drift of confetti.
      if (h.height < 180) continue
      const u = 0.25 + Math.pow(rand(), 0.8) * 0.66
      const th = rand() * Math.PI * 2
      const y = h.height * Math.pow(Math.cos(u * Math.PI / 2), 1.35)
      const rr = h.radius * u
      const s = 2.6 + rand() * 4.4
      m.compose(
        new THREE.Vector3(
          h.pos[0] + Math.cos(th) * rr,
          h.pos[1] + y + 1.5,
          h.pos[2] + Math.sin(th) * rr,
        ),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.5 + rand() * 0.4, rand() * 3, 0)),
        new THREE.Vector3(s, s, s),
      )
      out.push({ m: m.clone(), c: new THREE.Color(PALETTE[Math.floor(rand() * PALETTE.length)]) })
    }
    return out
  }, [])

  useFrame(() => {
    const mesh = ref.current
    if (!mesh || mesh.userData.placed) return
    placed.forEach((p, i) => { mesh.setMatrixAt(i, p.m); mesh.setColorAt(i, p.c) })
    mesh.count = placed.length
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.userData.placed = true
  })

  return <instancedMesh ref={ref} args={[geo, mat, COUNT]} frustumCulled={false} />
}

/* ── Cranes ───────────────────────────────────────────────────────── */
/**
 * White cranes crossing the valley — the single most important thing in
 * making this range feel like Act 1.1's rather than like a mountaineering
 * documentary.
 *
 * They are billboards, not models. A modelled crane's wings are horizontal
 * surfaces, so from the camera's height they present edge-on and the bird
 * reads as a thrown paper dart; a painted silhouette that always faces the
 * lens reads as a crane from every angle, which is also exactly how Act 1.1
 * draws them. Four wingbeat frames live in one texture and each bird steps
 * through them on its own phase.
 */
const CRANE_FRAMES = 4

function makeCraneTexture(): THREE.CanvasTexture {
  const S = 256                     // per frame
  const VB = 120                    // Act 1.1 draws the crane in a 120x72 box
  const k = S / VB
  const cv = document.createElement('canvas')
  cv.width = S; cv.height = S * CRANE_FRAMES
  const ctx = cv.getContext('2d')!

  const WHITE = '#FFFFFF'
  const HEUK = '#1A1A1A'
  const JEOK = '#C23B22'

  /** Wing scaleY through the beat, exactly as CraneLayer animates it. */
  const wingScale = (phase: number) => {
    const c = Math.cos(phase * Math.PI * 2)
    return -0.85 + (1 - -0.85) * ((c + 1) / 2)
  }

  const wing = (
    body: string, tipA: string, tipB: string,
    originX: number, originY: number, sy: number,
  ) => {
    ctx.save()
    ctx.translate(originX, originY)
    // scaleX(-1) rakes the wings BACK toward the tail — without it the crane
    // reads as flying backwards, wings crossing over its own beak.
    ctx.scale(-1, sy)
    ctx.translate(-originX, -originY)
    ctx.fillStyle = WHITE
    ctx.fill(new Path2D(body))
    ctx.globalAlpha = 0.85
    ctx.fillStyle = HEUK
    ctx.fill(new Path2D(tipA))
    ctx.globalAlpha = 0.65
    ctx.fill(new Path2D(tipB))
    ctx.globalAlpha = 1
    ctx.restore()
  }

  for (let f = 0; f < CRANE_FRAMES; f++) {
    ctx.save()
    ctx.translate(0, f * S)
    ctx.scale(k, k)
    ctx.lineCap = 'round'

    const phase = f / CRANE_FRAMES

    // Legs, trailing.
    ctx.strokeStyle = '#888888'
    ctx.lineWidth = 0.6
    ctx.beginPath(); ctx.moveTo(52, 42); ctx.lineTo(62, 60); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(48, 43); ctx.lineTo(58, 62); ctx.stroke()

    // Tail feathers.
    ctx.strokeStyle = HEUK
    ctx.lineWidth = 1
    ctx.stroke(new Path2D('M 64 38 Q 72 34 78 36'))
    ctx.lineWidth = 0.8
    ctx.stroke(new Path2D('M 64 40 Q 74 38 80 39'))
    ctx.stroke(new Path2D('M 63 42 Q 71 42 76 43'))

    // Body — elongated teardrop.
    ctx.fillStyle = WHITE
    ctx.fill(new Path2D('M 30 38 C 36 30 56 28 64 36 C 68 40 66 46 60 46 C 50 48 36 46 30 38 Z'))

    // Upper wing, with the serrated feather notches.
    wing(
      'M 48 34 C 44 20 36 10 20 6 C 24 10 28 14 30 18 C 28 14 26 18 28 22 C 26 20 24 24 27 26 C 24 26 22 30 26 30 C 30 30 40 32 48 34 Z',
      'M 20 6 C 22 8 26 10 30 18 C 28 14 24 10 20 6 Z',
      'M 20 6 C 18 8 20 14 28 22 L 30 18 C 28 14 24 10 20 6 Z',
      48, 34, wingScale(phase),
    )
    // Lower wing, a shade behind in phase.
    wing(
      'M 48 42 C 44 54 36 62 22 64 C 24 60 28 56 30 52 C 28 56 26 52 28 48 C 26 50 24 46 27 44 C 30 44 40 42 48 42 Z',
      'M 22 64 C 24 60 28 56 30 52 C 28 56 24 60 22 64 Z',
      'M 22 64 C 20 60 22 54 28 48 L 30 52 C 28 56 24 60 22 64 Z',
      48, 42, wingScale(phase - 0.15),
    )

    // Neck, head, 단정학 crown, beak, eye.
    ctx.strokeStyle = WHITE
    ctx.lineWidth = 2.2
    ctx.stroke(new Path2D('M 32 36 C 26 32 18 28 14 22'))
    ctx.fillStyle = WHITE
    ctx.beginPath(); ctx.arc(14, 22, 3, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = JEOK
    ctx.beginPath(); ctx.arc(14, 19.5, 2, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = HEUK
    ctx.lineWidth = 1.2
    ctx.beginPath(); ctx.moveTo(14, 22); ctx.lineTo(8, 20); ctx.stroke()
    ctx.fillStyle = HEUK
    ctx.beginPath(); ctx.arc(13, 21.5, 0.6, 0, Math.PI * 2); ctx.fill()

    ctx.restore()
  }

  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.repeat.set(1, 1 / CRANE_FRAMES)
  return tex
}

type CraneSpec = {
  from: [number, number, number]
  to: [number, number, number]
  t0: number
  dur: number
  scale: number
  flap: number
}

export function Cranes() {
  const baseTex = useMemo(() => makeCraneTexture(), [])

  const cranes = useMemo<CraneSpec[]>(() => {
    const rand = seededRandom(4210)
    const out: CraneSpec[] = []
    for (let i = 0; i < 9; i++) {
      const y = 190 + rand() * 320
      const z = 200 + rand() * 780
      const dir = rand() < 0.5 ? -1 : 1
      out.push({
        from: [dir * (900 + rand() * 500), y, z],
        to: [-dir * (900 + rand() * 500), y + (rand() - 0.5) * 90, z - 240 - rand() * 280],
        t0: -6 - rand() * 9,
        dur: 26 + rand() * 16,
        scale: 58 + rand() * 44,
        flap: 1.5 + rand() * 0.9,
      })
    }
    return out
  }, [])

  /** One texture clone per bird so each can hold its own frame offset. */
  const mats = useMemo(() => cranes.map((_c, _i) => {
    const t = baseTex.clone()
    t.needsUpdate = true
    return new THREE.MeshBasicMaterial({
      map: t, transparent: true, fog: true, depthWrite: false,
      side: THREE.DoubleSide,
    })
  }), [cranes, baseTex])

  const meshes = useRef<(THREE.Mesh | null)[]>([])

  useFrame(({ camera }) => {
    const t = worldTime()
    cranes.forEach((c, i) => {
      const m = meshes.current[i]
      if (!m) return
      const u = Math.max(0, Math.min(1, (t - c.t0) / c.dur))
      m.position.set(
        c.from[0] + (c.to[0] - c.from[0]) * u,
        c.from[1] + (c.to[1] - c.from[1]) * u + Math.sin(t * 0.7 + i) * 8,
        c.from[2] + (c.to[2] - c.from[2]) * u,
      )
      m.quaternion.copy(camera.quaternion)
      // Face the way they are going.
      const heading = c.to[0] > c.from[0] ? 1 : -1
      m.scale.set(c.scale * heading, c.scale, c.scale)
      const frame = Math.floor(((t * c.flap + i * 0.37) % 1) * CRANE_FRAMES)
      const map = (mats[i].map as THREE.Texture)
      map.offset.y = 1 - (frame + 1) / CRANE_FRAMES
    })
  })

  return (
    <group>
      {cranes.map((_c, i) => (
        <mesh key={i} ref={el => { meshes.current[i] = el }} material={mats[i]}>
          <planeGeometry args={[1, 1]} />
        </mesh>
      ))}
    </group>
  )
}

/* ── Blossom drift ────────────────────────────────────────────────── */
/**
 * Petals on the wind, close to the lens. Act 1.1 has them falling across the
 * whole frame; here they are mostly very near-field parallax while the
 * camera is still creeping.
 */
export function Blossoms() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const COUNT = 90
  const geo = useMemo(() => new THREE.CircleGeometry(1, 5), [])
  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#F7C9D6', fog: true, side: THREE.DoubleSide, transparent: true, opacity: 0.7,
  }), [])

  const seeds = useMemo(() => {
    const rand = seededRandom(5507)
    return Array.from({ length: COUNT }, () => ({
      x: (rand() - 0.5) * 1500,
      y: 60 + rand() * 420,
      z: 40 + rand() * 900,
      s: 1.5 + rand() * 2.6,
      sp: 0.5 + rand() * 1.4,
      ph: rand() * 6.28,
    }))
  }, [])

  const m = useMemo(() => new THREE.Matrix4(), [])
  const q = useMemo(() => new THREE.Quaternion(), [])
  const e = useMemo(() => new THREE.Euler(), [])
  const v = useMemo(() => new THREE.Vector3(), [])
  const sv = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    const mesh = ref.current
    if (!mesh) return
    const t = worldTime()
    seeds.forEach((p, i) => {
      v.set(
        p.x + Math.sin(t * 0.5 * p.sp + p.ph) * 30,
        p.y - ((t * 9 * p.sp) % 260),
        p.z + Math.cos(t * 0.4 * p.sp + p.ph) * 24,
      )
      e.set(t * p.sp * 1.6 + p.ph, t * p.sp + p.ph, 0)
      q.setFromEuler(e)
      sv.setScalar(p.s)
      m.compose(v, q, sv)
      mesh.setMatrixAt(i, m)
    })
    mesh.instanceMatrix.needsUpdate = true
  })

  return <instancedMesh ref={ref} args={[geo, mat, COUNT]} frustumCulled={false} />
}

/* ── The ground ───────────────────────────────────────────────────── */
const Z0 = -900
const Z1 = 6400
const X_HALF = 4200

/**
 * One plane for the entire act, vertex-coloured along z: valley floor under
 * the range, a warm street lattice under the city, then the stadium's apron.
 * The lattice is analytic (two sets of stripes with a soft falloff) so the
 * city has streets running under it without a texture and without a single
 * extra draw call.
 */
export function Ground() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(X_HALF * 2, Z1 - Z0, 96, 150)
    g.rotateX(-Math.PI / 2)
    g.translate(0, 0, (Z0 + Z1) / 2)
    const pos = g.attributes.position as THREE.BufferAttribute
    const colors = new Float32Array(pos.count * 3)
    const valley = new THREE.Color('#08201D')
    const plain = new THREE.Color('#06131A')
    const street = new THREE.Color('#0C0818')
    const streetHot = new THREE.Color('#4A3020')
    const apron = new THREE.Color('#0A0814')
    const c = new THREE.Color()
    const rand = seededRandom(9911)

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      pos.setY(i, Math.sin(x * 0.0031 + 1.1) * 7 + Math.sin(z * 0.0026) * 6 - 6)

      const cityT = Math.max(0, Math.min(1,
        (z - (CITY_Z_NEAR - 500)) / 700)) * (1 - Math.max(0, Math.min(1, (z - CITY_Z_FAR) / 500)))
      const apronT = Math.max(0, Math.min(1, (z - (STADIUM_Z - 1400)) / 700))
      c.copy(valley).lerp(plain, Math.max(0, Math.min(1, (z + 200) / 1400)))
      if (cityT > 0.01) {
        const gx = Math.abs(((x + 75) % 150) - 75)
        const gz = Math.abs(((z + 100) % 200) - 100)
        const line = Math.max(
          Math.max(0, 1 - gx / 16),
          Math.max(0, 1 - gz / 20) * 0.8,
        )
        c.lerp(street, cityT * 0.8)
        c.lerp(streetHot, cityT * line * (0.25 + rand() * 0.35))
      }
      if (apronT > 0.01) c.lerp(apron, apronT * 0.85)
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    g.computeVertexNormals()
    return g
  }, [])

  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 1, metalness: 0,
  }), [])

  return <mesh geometry={geo} material={mat} position={[0, -18, 0]} />
}

/**
 * The river in the pass — a jade ribbon between the second and third bands,
 * carrying the moon. The one bright thing in the first eight seconds, and
 * somewhere for the eye to rest while the camera creeps.
 */
export function MoonLake() {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#123F44', fog: true }), [])
  const glint = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#7FD9CE', fog: true, transparent: true, opacity: 0.45,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }), [])
  return (
    <group position={[-40, -15, 640]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={mat}>
        <planeGeometry args={[760, 320]} />
      </mesh>
      {/* Moon path on the water, offset toward the moon's bearing. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-150, 0.6, 0]} material={glint}>
        <planeGeometry args={[110, 280]} />
      </mesh>
    </group>
  )
}
