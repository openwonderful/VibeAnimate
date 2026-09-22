import { useRef, useMemo, forwardRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { Effect } from 'postprocessing'
import * as THREE from 'three'
import type { Group, PerspectiveCamera } from 'three'
import { SceneCanvas } from '../SceneCanvas'
import { getAnimTime } from '../../hooks/useAnimTime'
import { seededRandom } from '../../utils/svgHelpers'
import { GREY_CROWD, GREY_CROWD_DARK } from './shared'
import { GoldFigure } from '../characters/goldFigure'
import { CrowdPeg, PEG_PER_GOLD, type Archetype } from '../characters/CrowdPeg'
import { TowerField, type Tower } from '../actB/city'
import GradientEnvironment from '../effects/GradientEnvironment'

/**
 * Act 5.2 — THE STREETS (1:31–1:36, 5s)
 *
 * City canyon, in BLACK AND WHITE. Grey strangers streaming past in both
 * directions; the child (gold) walks INTO the city — he starts near the
 * lens, at the mouth of the canyon, and walks away down it while the towers
 * rise ahead of him. Every light in the street — windows, neon, signs,
 * shopfronts — is monochrome; he is the only colour in the frame.
 *
 * ── The crowd ─────────────────────────────────────────────────────────
 * Everyone he passes is a CrowdPeg — the capsule-and-sphere silhouette Act
 * 8.55 uses for its field of thousands. They used to be grey GoldFigures: the
 * same articulated stick body as the hero, in a different colour, which
 * quietly undercut the whole scene. If the strangers are built like he is, the
 * only thing separating him from them is a hue, and the shot becomes "a gold
 * person among grey people" instead of "the one person here who is a person".
 *
 * It is also the grammar the film ends on. In 8.55 he stands in an ocean of
 * these pegs and lights them. Here they walk past and nothing happens. That is
 * the whole distance the story has to travel.
 *
 * ── The city ──────────────────────────────────────────────────────────
 * The buildings are Act B's buildings — the same `TowerField`, the same
 * per-window shader, the same block palette and neon edge stripes — laid out
 * as a street canyon instead of a flight corridor. Act B is authored at about
 * four units to the metre, so the layout below is in ACT B UNITS and the whole
 * group is scaled by STREET_SCALE; that is what keeps a window here the same
 * physical size as a window seen from the air at 0:11.
 */

// ── The city ───────────────────────────────────────────────────
/** Act B units per metre. A window is 9.5 × 12 up there, so a unit is ~0.25 m. */
const STREET_SCALE = 0.25
/**
 * Half-width of the street, in Act B units — 14 m of road and pavement either
 * side of the centre line. At 8 m the near facade ran off toward the fog at
 * such a grazing angle that it was mostly window-grid aliasing, and a curtain
 * wall a stride away is a lobby, not a street.
 */
const STREET_HALF = 44

/**
 * A canyon: two continuous rows of frontage running away down the street. The
 * buildings tile along z by their own frontage width rather than sitting on a
 * fixed pitch, so the block reads as one built-up terrace instead of a row of
 * evenly spaced towers.
 *
 * Height RISES with distance. Partly because that is what a street looks like
 * from inside a low-rise block, and partly for the lens: a 75 m tower fourteen
 * metres away is seen at nearly eighty degrees up, and at that foreshortening
 * the window grid crosses the whole partially-resolved band of the shader and
 * boils. Keep the near frontage at four to nine storeys and the towers stay
 * where they read — down the street, above the fog.
 */
function layoutStreet(): Tower[] {
  const rand = seededRandom(5252)
  const out: Tower[] = []
  for (const side of [-1, 1] as const) {
    let z = 70
    while (z > -430) {
      const d = 44 + rand() * 92          // frontage on the street, 11–34 m
      // Depth is CONSTANT, and that is the other half of the alley problem.
      // A deeper building behind a shallower one leaves a strip of its own
      // z-facing flank sticking out past its neighbour, square-on to the lens
      // and lit — the same three-pixel resolved window grid, streaking. From
      // the pavement you cannot see how deep a block is anyway.
      const w = 150                       // depth into the block, 37 m
      const away = Math.min(1, Math.max(0, (60 - z) / 320))
      const h = 34 + rand() * 44 + away * away * (95 + rand() * 260)
      out.push({
        x: side * (STREET_HALF + w / 2),
        z: z - d / 2,
        w, d, h,
        seed: rand() * 1000,
      })
      // FLUSH. Not "z -= d + a sliver of alley": those two-metre gaps let you
      // see each building's z-facing FLANK, and a flank is square-on to the
      // lens, so its window grid is fully resolved while being three pixels
      // wide — one random colour per column, forty times down the street.
      // Every vertical streak crawling up this shot was an alley.
      z -= d
    }
  }
  // The end of the street. Without it the canyon vanishes into flat black,
  // and a walk INTO the city needs somewhere visible to be walking to: two
  // staggered rows of genuinely tall towers (65–130 m) closing the view,
  // square across the axis, half-swallowed by the fog.
  for (const [rowZ, lift] of [[-330, 0], [-395, 90]] as const) {
    let x = -420
    while (x < 420) {
      const d = 90 + rand() * 80
      out.push({
        x: x + d / 2,
        z: rowZ - rand() * 20,
        w: d, d: 150,
        h: 240 + lift + rand() * 190,
        seed: rand() * 1000,
      })
      x += d
    }
  }
  return out
}

function City() {
  const towers = useMemo(() => layoutStreet(), [])
  return (
    <group scale={STREET_SCALE}>
      <TowerField
        towers={towers} winW={19} winH={15} lit={0.95} resK={12} floorMin={1} colorSeed={5253}
        mono={1}
      />
    </group>
  )
}

/**
 * Shopfronts, and the light they throw.
 *
 * Act B's facade has a `floorFade` that dims the bottom 28% of every tower —
 * correct from the air, where a lit ground floor two kilometres below is
 * noise, and exactly backwards from the pavement, where that dimmed band is
 * the ONLY part of the building in frame. Without something at eye level the
 * street is a pair of black slabs with a lit ceiling.
 *
 * So the ground floor is built here instead, in metres rather than Act B
 * units: lit windows and hanging signs along both frontages, plus the handful
 * of point lights they spill onto the pavement. That spill is also what gives
 * the crowd any form at all — they were flat grey cut-outs on the ambient
 * alone.
 */
/** Black and white only. The shop glass sits in the greys; the signs get
 *  the full range up to white — brightness does the work hue used to do. */
const FRONT_COLORS = ['#D8D8D8', '#B8B8B8', '#E8E8E8', '#A8A8A8', '#CCCCCC', '#DEDEDE']
const SIGN_COLORS = [
  '#FFFFFF', '#DADADA', '#F2F2F2', '#9E9E9E', '#EFEFEF', '#C4C4C4', '#FFFFFF',
]

type Panel = {
  pos: [number, number, number]
  rot: number
  w: number
  h: number
  color: string
  glow: number
}

function Shopfronts() {
  const { fronts, mullions, signs } = useMemo(() => {
    const rand = seededRandom(9111)
    // Stand-off from the tower face. The shopfront, its glazing bars and the
    // curtain wall behind were within six centimetres of each other, and seen
    // along the street that is three coplanar surfaces fighting for the depth
    // buffer — the bright striped band that used to sit at the frame edge was
    // z-fighting, not aliasing.
    const X = STREET_HALF * STREET_SCALE - 0.16
    const fronts: Panel[] = []
    const mullions: Panel[] = []
    const signs: Panel[] = []
    for (const side of [-1, 1] as const) {
      const rot = side > 0 ? -Math.PI / 2 : Math.PI / 2
      let z = 9
      while (z > -36) {
        const w = 2.4 + rand() * 4.4
        const h = 1.9 + rand() * 1.0
        const cz = z - w / 2
        const y = 0.18 + h / 2
        fronts.push({
          pos: [side * X, y, cz], rot, w: w - 0.3, h,
          color: FRONT_COLORS[Math.floor(rand() * FRONT_COLORS.length)],
          glow: 0.30 + rand() * 0.34,
        })
        // Frame and glazing bars. Without them the front is a glowing
        // rectangle floating on a black wall — a billboard, not a window.
        const bays = 2 + Math.floor(rand() * 3)
        for (let b = 1; b < bays; b++) {
          mullions.push({
            pos: [side * (X - 0.09), y, cz - w / 2 + 0.15 + (b / bays) * (w - 0.3)],
            rot, w: 0.09, h, color: '#0E1016', glow: 1,
          })
        }
        mullions.push({
          pos: [side * (X - 0.09), 0.18 + h * 0.34, cz], rot,
          w: w - 0.3, h: 0.07, color: '#0E1016', glow: 1,
        })
        // The banner over the door, and then the stack of vertical boards
        // climbing the wall above it. This is the part that actually reads as
        // a Korean street — and it is doing the framing work too: the only
        // part of the tower above is two or three storeys of mostly-dark
        // curtain wall, so if the signs do not carry the canyon nothing does.
        signs.push({
          pos: [side * (X - 0.09), 0.24 + h + 0.28, cz], rot,
          w: w - 0.4, h: 0.44 + rand() * 0.22,
          color: SIGN_COLORS[Math.floor(rand() * SIGN_COLORS.length)],
          glow: 0.62 + rand() * 0.34,
        })
        let sy = h + 1.1
        const stack = 1 + Math.floor(rand() * 3)
        for (let k = 0; k < stack; k++) {
          const sh = 0.9 + rand() * 1.5
          signs.push({
            pos: [side * (X - 0.30 - k * 0.04), sy + sh / 2, cz + (rand() - 0.5) * w * 0.5],
            rot, w: 0.30 + rand() * 0.26, h: sh,
            color: SIGN_COLORS[Math.floor(rand() * SIGN_COLORS.length)],
            glow: 0.5 + rand() * 0.45,
          })
          sy += sh + 0.35 + rand() * 0.7
        }
        z -= w + 0.3 + rand() * 1.8
      }
    }
    return { fronts, mullions, signs }
  }, [])

  const panel = (p: Panel, key: string) => (
    <mesh key={key} position={p.pos} rotation={[0, p.rot, 0]}>
      <planeGeometry args={[p.w, p.h]} />
      <meshBasicMaterial
        color={p.color} toneMapped={false}
        opacity={p.glow} transparent={p.glow < 1}
      />
    </mesh>
  )

  return (
    <group>
      {fronts.map((p, i) => panel(p, `f${i}`))}
      {mullions.map((p, i) => panel(p, `m${i}`))}
      {signs.map((p, i) => panel(p, `s${i}`))}
      {/* The spill. Four is the whole budget — every one of these is a per-mesh
          cost across seventy pegs. Cold white now: warm spill was the last
          colour the street had. */}
      {[2, -6, -14, -24].map((z, i) => (
        <pointLight
          key={z} position={[i % 2 === 0 ? 10 : -10, 2.6, z]}
          color="#D6D9DE" intensity={34} distance={26} decay={2}
        />
      ))}
    </group>
  )
}

// ── Fisheye zoom-in ────────────────────────────────────────────
// 5.2-B's lens, on 5.2's clock: the street collapses inward around him as
// the lens bulges — but QUICK, the whole morph done in the first three
// seconds of the loop, then held. (5.2-B takes six leisurely seconds; this
// is the default street now, and the move has to land before the cut.)
const FISHEYE_T0 = 0.2
const FISHEYE_T1 = 3.0

const fisheyeFragmentShader = /* glsl */ `
  uniform float strength;

  void mainUv(inout vec2 uv) {
    vec2 c = uv - 0.5;
    float r2 = dot(c, c);
    // Barrel distortion — corners pull toward center as strength rises,
    // creating the bulged fisheye look.
    c *= 1.0 - strength * r2 * 2.0;
    uv = c + 0.5;
  }
`

class FisheyeEffectImpl extends Effect {
  constructor() {
    super('FisheyeEffect', fisheyeFragmentShader, {
      uniforms: new Map<string, THREE.Uniform<number>>([
        ['strength', new THREE.Uniform(0)],
      ]),
    })
  }
}

const Fisheye = forwardRef<FisheyeEffectImpl>(function Fisheye(_props, ref) {
  const effect = useMemo(() => new FisheyeEffectImpl(), [])
  useFrame(() => {
    const t = getAnimTime()
    const ramp = THREE.MathUtils.smoothstep(t, FISHEYE_T0, FISHEYE_T1)
    const breath = Math.sin(t * 0.6) * 0.015
    // 0.22, not 0.28. Now that the figure is full adult height the barrel was
    // cropping his feet AND squeezing both shopfront rows out of frame, so the
    // back half of the slot was a black surround with nothing in it.
    const s = ramp * 0.22 + (ramp > 0.98 ? breath : 0)
    ;(effect.uniforms.get('strength') as THREE.Uniform<number>).value = s
  })
  return <primitive ref={ref} object={effect} dispose={null} />
})

/** The camera narrows (zooms in) alongside the barrel — the "zoom" half of
 *  the fisheye zoom. Starts a touch wide so the push-in has room to travel. */
function FisheyeCamera() {
  const { camera } = useThree()
  useFrame(() => {
    const ramp = THREE.MathUtils.smoothstep(getAnimTime(), FISHEYE_T0, FISHEYE_T1)
    const persp = camera as PerspectiveCamera
    persp.fov = THREE.MathUtils.lerp(55, 48, ramp)
    persp.updateProjectionMatrix()
  })
  return null
}

// ── The crowd ──────────────────────────────────────────────────
// One material per shade for the whole crowd: a peg is two meshes, so a
// per-figure material would mean 140 draw-call groups for no visual gain.
const CROWD_MAT = new THREE.MeshStandardMaterial({
  color: GREY_CROWD, emissive: GREY_CROWD, emissiveIntensity: 0.05, roughness: 0.9,
})
const CROWD_DARK_MAT = new THREE.MeshStandardMaterial({
  color: GREY_CROWD_DARK, emissive: GREY_CROWD_DARK, emissiveIntensity: 0.05, roughness: 0.9,
})

type Walker = {
  laneZ: number
  speed: number
  phaseOffset: number
  /** GoldFigure-equivalent height, converted to peg scale on use. */
  scale: number
  archetype: Archetype
  dark: boolean
}

/**
 * One stranger crossing the frame.
 *
 * A peg has no legs, so the walk lives entirely in the body: a two-step
 * vertical bob and a matching side-to-side lean, at a stride rate proportional
 * to how fast they are actually moving. Slow figures amble and fast ones hurry,
 * which is what stops thirty identical capsules reading as one repeated object
 * sliding past.
 */
function PegWalker({ laneZ, speed, phaseOffset, scale, archetype, dark }: Walker) {
  const groupRef = useRef<Group>(null)
  const pegRef = useRef<Group>(null)

  useFrame(() => {
    const t = getAnimTime()
    const travel = 18
    const raw = ((t * Math.abs(speed) + phaseOffset) % travel)
    const x = speed > 0 ? raw - 9 : 9 - raw
    const stride = t * Math.abs(speed) * 3.4 + phaseOffset * 5.1
    if (groupRef.current) {
      groupRef.current.position.set(x, Math.abs(Math.sin(stride)) * 0.035 * scale, laneZ)
      groupRef.current.rotation.y = speed > 0 ? Math.PI / 2 : -Math.PI / 2
    }
    // Lean is on the peg itself so it tips about the hips, not the feet.
    if (pegRef.current) pegRef.current.rotation.z = Math.sin(stride) * 0.045
  })

  return (
    <group ref={groupRef}>
      <group ref={pegRef}>
        <CrowdPeg
          archetype={archetype}
          scale={scale * PEG_PER_GOLD}
          material={dark ? CROWD_DARK_MAT : CROWD_MAT}
        />
      </group>
    </group>
  )
}

// Body types, weighted the way a street actually looks. No 'carrying' or
// 'child' — this is a commuter pavement at the hour he walks it.
const STREET_TYPES: Archetype[] = [
  'tall', 'tall', 'short', 'thin', 'wide', 'hunched', 'tall', 'short',
]

function Crowd() {
  const figures = useMemo(() => {
    const rng = seededRandom(42)
    const result: Walker[] = []
    // 70, not 35. Pegs cost two meshes each where a stick figure costs a dozen,
    // so twice the crowd is cheaper than what was here before — and "surrounded
    // by thousands who don't see you" needs the density.
    for (let i = 0; i < 70; i++) {
      const dir = rng() > 0.5 ? 1 : -1
      // Everyone walks BEHIND him. A peg is a wide capsule where a stick figure
      // was a few thin limbs, so the lane band that worked before (z up to +2,
      // a metre off the lens) put frame-filling grey shapes between the camera
      // and the only thing the shot is about. Squaring the sample thins the
      // near lanes and packs the far ones, which is what a crowded pavement
      // looks like down a long lens.
      const depth = rng() ** 2
      result.push({
        laneZ: 0.2 - depth * 4.4,
        speed: dir * (1.0 + rng() * 1.8),
        phaseOffset: rng() * 20,
        scale: 0.78 + rng() * 0.34,
        archetype: STREET_TYPES[Math.floor(rng() * STREET_TYPES.length)],
        dark: rng() > 0.55,
      })
    }
    return result
  }, [])

  return (
    <group>
      {figures.map((f, i) => (
        <PegWalker key={i} {...f} />
      ))}
    </group>
  )
}

// ── The one person in the frame who is a person ────────────────
//
// He is an ADULT rig, at full scale, and that is a continuity fix rather than
// a taste call. This figure used to be `kind="child"` (HEAD_Y 1.20) scaled to
// 0.75 — 0.90 m tall, in a street of pegs standing 1.35–1.94 m. He had just
// been seen at 1.73 m in 4.10 (where the caregiver has to reach UP to pat him)
// and again at 1.73 m walking out of the yard in 5.1, so the cut into this
// scene halved him. "Small in a big city" is the *staging's* job — the canyon,
// the seventy strangers, the lens — not the rig's, and buying it by shrinking
// the person makes him a different person.
const BEAT_DUR = 5.0

const CHILD_MAT = new THREE.MeshStandardMaterial({
  color: '#FFB938', emissive: '#E89B1F', emissiveIntensity: 1.45, roughness: 0.55,
})

/** Where the walk-in starts and how fast it travels. 0.72 m/s is the rig's
 *  own gait (4 × STRIDE per 1 s cycle at adult scale) — matching it is what
 *  keeps the feet planted rather than skating. */
const WALK_FROM_Z = 2.45
const WALK_SPEED = 0.72

function ChildCenter() {
  const groupRef = useRef<Group>(null)

  useFrame(() => {
    const t = getAnimTime()
    const phase = Math.min(1, t / BEAT_DUR)
    const jostleT = t * 0.667
    const jostle = Math.sin(jostleT * Math.PI * 2) * 0.1 + Math.sin(jostleT * 3.7) * 0.04
    const droop = phase * 0.08
    if (groupRef.current) {
      groupRef.current.position.x = jostle
      groupRef.current.position.y = 0
      // INTO the city: from the canyon mouth at the lens, away down the
      // street, at his own walking pace. He merges into the crowd band
      // (z 0.2 … −4.4) rather than standing apart from it.
      groupRef.current.position.z = WALK_FROM_Z - t * WALK_SPEED
      groupRef.current.rotation.z = -droop * 0.3
    }
  })

  return (
    <group ref={groupRef} position={[0, 0, WALK_FROM_Z]} rotation={[0, Math.PI, 0]}>
      <GoldFigure
        pose="walking"
        animate
        inPlace
        material={CHILD_MAT}
        headForwardTilt={0.04}
      />
    </group>
  )
}

function SceneContents() {
  return (
    <>
      <color attach="background" args={['#0C1018']} />
      {/* A sliver of cold sky overhead and dark glass all round — what a street
          canyon actually gives you to see by. */}
      <GradientEnvironment
        zenith="#2B3A55" horizon="#141C2A" ground="#0A0D14" intensity={1.0}
      />
      <ambientLight color="#3A4558" intensity={0.40} />
      <directionalLight position={[0, 5, 5]} color="#6A7590" intensity={0.85} />
      <directionalLight position={[-5, 3, -2]} color="#3A4560" intensity={0.42} />
      {/* 6→21 hid everything past the second shopfront — the canyon read as
          a corridor with a black wall at the end. The far end is the point
          now: the towers rise with distance, and the walk-in needs somewhere
          visible to be walking to. */}
      <fog attach="fog" args={['#0C1018', 8, 96]} />

      {/* Road, then the two pavements the crowd is on. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[120, 140]} />
        <meshStandardMaterial color="#15181F" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -30]}>
        <planeGeometry args={[9, 130]} />
        <meshStandardMaterial color="#1D212A" roughness={1} />
      </mesh>
      {[-6.4, 6.4].map(x => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, -30]}>
          <planeGeometry args={[3.2, 130]} />
          <meshStandardMaterial color="#24272F" roughness={1} />
        </mesh>
      ))}

      <City />
      <Shopfronts />
      <Crowd />
      <ChildCenter />
    </>
  )
}

export default function Act5_2() {
  return (
    <div style={{ width: '100%', height: '100%', background: '#0C1018' }}>
      <SceneCanvas
        style={{ width: '100%', height: '100%' }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
        // Pulled back from 3.55 and tipped up a touch: the shot starts
        // OUTSIDE the canyon mouth with him close to the lens, and the tilt
        // buys the tower tops down the street without losing his feet.
        camera={{ position: [0, 1.30, 5.1], fov: 55, near: 0.1, far: 160 }}
        onCreated={({ camera }) => camera.lookAt(0, 1.75, -8)}
      >
        <FisheyeCamera />
        <SceneContents />
        <EffectComposer>
          {/* No depth-of-field: at bokehScale 2 it smeared the crowd, the
              buildings and the one gold figure into the same soft mush, which
              is the opposite of "surrounded by thousands who don't see you". */}
          <Bloom intensity={0.6} luminanceThreshold={0.62} luminanceSmoothing={0.4} mipmapBlur />
          <Fisheye />
          <Vignette eskil={false} offset={0.16} darkness={0.88} />
        </EffectComposer>
      </SceneCanvas>
    </div>
  )
}
