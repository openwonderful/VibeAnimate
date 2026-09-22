/**
 * Act B — the valley. Act 3.1's world, at the end of the pull-out.
 *
 * The act flies all the way back out of the stadium, past the range, and
 * keeps going until the fields ARE the frame; then it turns around and comes
 * back down onto the road, ending four figure-heights behind the parent and
 * child as they walk home toward the farmhouse at the foot of the pass. The
 * range that has been the background of the whole act is the range behind
 * them, and the last frame of Act B is the first frame of Act 3.1.
 *
 * ── Why this is built out of 3.1's own parts ─────────────────────────
 * The first two versions of this were lookalikes — hand-rolled figures,
 * lobed-icosahedron trees, flat unlit blocks — and they did not stand within
 * a mile of 3.1's frame. So this imports the real things:
 *
 *   - `GoldGlowFigure`, the film's figure rig, in 3.1's exact hand-holding
 *     layout. The old walkers were capsules parented to a group with visible
 *     gaps at every joint: "the characters' arms and legs aren't attached to
 *     their torso". This one is a single swept body.
 *   - the roadside set — jangseung, sotdae, cairns, straw stacks, persimmon
 *     trees (`../act3/roadside`) — and the hanok from 3.2.
 *   - `StylizedWater` on every paddy the closing camera can read, with 3.1's
 *     dusk palette. It is most of what makes that shot glow.
 *   - `GradientEnvironment`, so every standard material in the valley has a
 *     sky to bounce off instead of one directional light and a guess.
 *
 * All of that is authored in 3.1's units (an adult is 1.73 tall), so it goes
 * in wrapped in a group at `S`. Act B's own units are ~20× bigger.
 *
 * ── Why the fields are enormous ──────────────────────────────────────
 * The camera now travels 11,000 units backwards. The old 2,500-unit strip of
 * paddy ran out under it around 0:50 and left the shot flying over bare
 * plane, so the valley is sixteen times the area it was. It cannot be built
 * out of meshes at that size: everything past the near band is two instanced
 * draw calls whose cells grow with distance, which is also what a real
 * patchwork looks like from 800 units up.
 */
import { useCallback, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { seededRandom } from '../../utils/svgHelpers'
import SeededSparkles from '../effects/SeededSparkles'
import StylizedWater from '../effects/StylizedWater'
import { GoldFigure, type HatName } from '../characters/goldFigure'
import { JangseungPair, Sotdae, StoneCairn, RiceStrawStack, PersimmonTree } from '../act3/roadside'
import { Hanok } from '../act3/hanok'
import { PorchRocker } from './porch'
import { worldTime, flightOffset } from './time'
import {
  dayTint, clamp01, sunRise, nightFall, walkZ, ramp,
  parentGlow, childGlow,
  VALLEY_Y, VALLEY_Z0, VALLEY_Z1, VALLEY_X_HALF,
  HOUSE_X, HOUSE_Z, WALK_31_Z, TREE_X, TREE_Z, T_TREE, T_32,
} from './flight'
import { buildCloud, makeGlowMaterial, updateGlow } from './points'
import { GlowPoints } from './GlowPoints'
import { GREY_CROWD, GREY_CROWD_DARK } from '../act5/shared'
import { archetypeHeight, archetypeWidth, type Archetype } from '../act8_55/world'

/** Act B units per Act 3.1 unit. Fixes the road at 62 wide and an adult at
 *  ~34.6 tall, which is what the act was already built around. */
export const S = 20
const ROAD_W = 62
const ROAD_HALF = ROAD_W / 2
/**
 * Everything nearer than this is drawn properly; everything beyond it is
 * instanced. The band has to reach past the 3.1 beat at z=-6,800, because
 * the camera does not just visit that spot — it walks the entire seven
 * kilometres back from it while the light goes.
 */
const NEAR_Z = -7600
/**
 * The bare yard around the house. Nothing is planted where the family
 * lives — the verge grass, the wildflowers and the rice all stop at this
 * rectangle, which is also what keeps the paddies out of the porch (the
 * rocking chair stands at world x≈-32, z≈-449, which is otherwise inside
 * the verge band). Excluded instances are collapsed to scale 0, never
 * skipped, so every population keeps its seeded layout downstream.
 */
const YARD_X = 75
const YARD_Z = 85
const inYard = (x: number, z: number) =>
  Math.abs(x - HOUSE_X) < YARD_X && Math.abs(z - HOUSE_Z) < YARD_Z
const LEN = VALLEY_Z1 - VALLEY_Z0
/** The earth runs well past both ends of the road: past the far edge so the
 *  wide never finds it, and past the house so there is no seam where the
 *  valley floor stops and the act's own ground takes over. */
const EARTH_Z0 = VALLEY_Z0 - 7000
const EARTH_Z1 = VALLEY_Z1 + 940

/* ══ The floor ══════════════════════════════════════════════════════ */

type Bay = { x: number; z: number; w: number; d: number; wet: boolean }

/**
 * How much of this valley is still being farmed.
 *
 * `full` is the valley the whole film is set in and is the default
 * everywhere — nothing changes unless a scene asks. The other two exist for
 * Act 4.5, whose three measurings straddle an industrialisation: the fields
 * go out of production between the first mark and the third, and by the last
 * one there is nothing around the house but worked-over dirt.
 *
 * It is deliberately a state and not a 0–1 amount. "Half a paddy" is not a
 * thing; a bay is either flooded and planted or it is bare earth, and what
 * changes between the three is HOW MANY of them are which.
 */
export type Farmland = 'full' | 'partial' | 'none'

/**
 * What each state does to the populations that ARE the farming: the flooded
 * bays, the rice standing in them, the hedges that only exist because there
 * is a boundary between one field and the next, and the planted verge along
 * the road.
 *
 * The water is the thing that goes FIRST. `partial` keeps the parcelling and
 * keeps the crop — dry bays with rice still standing in them — but there is
 * no standing water anywhere in it: an irrigated valley is a valley somebody
 * is still maintaining the channels of, and that is the first job to stop
 * being done. By `none` the crop is gone too and the verge along the road has
 * been scraped back to dirt.
 */
const NEAR_WET: Record<Farmland, number> = { full: 1, partial: 0, none: 0 }
const RICE_AMOUNT: Record<Farmland, number> = { full: 1, partial: 0.42, none: 0 }
const HEDGE_AMOUNT: Record<Farmland, number> = { full: 1, partial: 0.72, none: 0.22 }
const VERGE_AMOUNT: Record<Farmland, number> = { full: 1, partial: 0.78, none: 0 }

/**
 * Take bays out of production. Same layout, same seed, same rectangles — the
 * parcelling of a valley outlives its farming, and that is most of why the
 * `none` frame reads as land that used to be fields rather than as a desert.
 *
 * Both non-full states drain every bay. The per-instance tint in `FarFields`
 * is what keeps the patchwork readable once they are all dry: a field of
 * turned earth is never twice the same brown either.
 */
function applyFarmland(bays: Bay[], farmland: Farmland): Bay[] {
  if (farmland === 'full') return bays
  return bays.map(b => ({ ...b, wet: false }))
}

/**
 * The patchwork. Bays are laid in rows either side of the road and grow with
 * distance, so the far end of the valley is a dozen big blocks rather than
 * ten thousand invisible ones. Gaps between bays are left open and the earth
 * plane shows through them — those gaps ARE the bunds, which saves drawing
 * a second rectangle per field.
 */
function layoutBays(): Bay[] {
  const rand = seededRandom(7712)
  const out: Bay[] = []
  let z = VALLEY_Z1 - 40
  while (z > VALLEY_Z0) {
    const away = VALLEY_Z1 - z
    const rowD = 150 + away * 0.03
    const colW = 140 + away * 0.03
    for (const side of [-1, 1]) {
      let x = ROAD_HALF + 30
      while (x < VALLEY_X_HALF) {
        const w = colW * (0.8 + rand() * 0.45)
        out.push({
          x: side * (x + w / 2),
          z: z - rowD / 2,
          w,
          d: rowD * (0.78 + rand() * 0.34),
          // Roughly a third of the fields are between crops: dry earth, and
          // the contrast is what makes the patchwork read AS a patchwork
          // rather than as one big sheet of water.
          wet: rand() > 0.34,
        })
        x += w + 16 + rand() * 26
      }
    }
    z -= rowD + 14
  }
  return out
}

/** The instanced far fields: two draw calls for the entire valley. */
function FarFields({ bays }: { bays: Bay[] }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1)
    g.rotateX(-Math.PI / 2)
    return g
  }, [])

  const wet = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#8E7A86', roughness: 0.74, metalness: 0.10,
  }), [])
  const tint = useMemo(() => new THREE.Color(), [])
  // Between crops the earth is warm and turned.
  const dry = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#8A6446', roughness: 1, metalness: 0,
  }), [])

  useFrame(() => {
    // The far fields go to a hard, dark mirror at night so the moon key
    // actually lands on them instead of being soaked up by a matte plane.
    const n = nightFall(worldTime())
    wet.roughness = 0.74 - n * 0.56
    wet.metalness = 0.10 + n * 0.62
    wet.color.copy(tint.setRGB(0.56 - n * 0.36, 0.48 - n * 0.28, 0.53 - n * 0.24))
  })

  const groups = useMemo(() => ({
    wet: bays.filter(b => b.wet),
    dry: bays.filter(b => !b.wet),
  }), [bays])

  const place = useCallback((list: Bay[], seed: number) =>
    (mesh: THREE.InstancedMesh | null) => {
      if (!mesh || mesh.userData.placed) return
      const rand = seededRandom(seed)
      const m = new THREE.Matrix4()
      const q = new THREE.Quaternion()
      const c = new THREE.Color()
      list.forEach((b, i) => {
        m.compose(
          new THREE.Vector3(b.x, VALLEY_Y + 3, b.z),
          q,
          new THREE.Vector3(b.w, 1, b.d),
        )
        mesh.setMatrixAt(i, m)
        // Per-field tint. Real paddies are never the same colour twice
        // running — different crops, different water depth, different day
        // since flooding — and a flat field of one value reads as lino.
        const v = 0.74 + rand() * 0.5
        c.setRGB(v, v * (0.94 + rand() * 0.12), v * (0.9 + rand() * 0.2))
        mesh.setColorAt(i, c)
      })
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      mesh.userData.placed = true
    }, [])

  return (
    <group>
      <instancedMesh ref={place(groups.wet, 331)} args={[geo, wet, groups.wet.length]}
        frustumCulled={false} />
      <instancedMesh ref={place(groups.dry, 332)} args={[geo, dry, groups.dry.length]}
        frustumCulled={false} />
    </group>
  )
}

/**
 * The near paddies, on 3.1's stylized water. Only the ones the closing
 * camera can actually read — a shader mesh each, so the count matters.
 */
type NearBay = { x: number; z: number; w: number; d: number }

function nearBays(): NearBay[] {
  const rand = seededRandom(4417)
  const out: NearBay[] = []
  for (const side of [-1, 1]) {
    // `x` is the bay's CENTRE, so the first column has to clear the road by
    // half its own width — offsetting by the verge alone put a 190-wide bay
    // centred 34 from the kerb, i.e. thirty units of flooded paddy laid
    // straight over the road, with the rice planted in it.
    let edge = ROAD_HALF + 30
    for (let c = 0; c < 2; c++) {
      const w = 210 + c * 90
      const x = side * (edge + w / 2)
      for (let r = 0; r < 14; r++) {
        out.push({ x, z: VALLEY_Z1 - 120 - r * 560 - rand() * 70, w, d: 400 + rand() * 110 })
      }
      edge += w + 26
    }
  }
  return out
}

/**
 * Which near bays are still under water. Seeded rather than sliced, so the
 * ones that go dry are scattered through the block instead of the near rows
 * draining first and leaving a tide line across the valley.
 *
 * `Rice` plants into the SAME list, so a bay that stops being flooded stops
 * being planted in the same frame.
 */
function wetNearBays(amount: number): NearBay[] {
  if (amount >= 1) return nearBays()
  if (amount <= 0) return []
  const rand = seededRandom(5542)
  return nearBays().filter(() => rand() < amount)
}

function NearPaddies({ amount = 1 }: { amount?: number }) {
  const bays = useMemo(() => wetNearBays(amount), [amount])
  const off = flightOffset()
  const mats = useRef<THREE.ShaderMaterial[]>([])

  /** Golden-hour paddy → night paddy. The water is the biggest surface in
   *  the frame at both ends of this stretch, and a field of dusk-orange
   *  water under a night sky reads as a mistake rather than as water. */
  const grade = useMemo(() => ({
    deep: [new THREE.Color('#585378'), new THREE.Color('#141E36')],
    sky: [new THREE.Color('#D2571C'), new THREE.Color('#22314E')],
    ripple: [new THREE.Color('#F0A05A'), new THREE.Color('#5C74A6')],
    glow: [new THREE.Color('#FFC078'), new THREE.Color('#8FA6D8')],
  }), [])
  const tmp = useMemo(() => new THREE.Color(), [])

  useFrame(() => {
    // Night is where this act STARTS as well as where it ends — the opening
    // is the lit house in a black valley — so the paddies key off "is it
    // dark" rather than off nightFall alone.
    const t = worldTime()
    const n = Math.max(1 - dayTint(t), nightFall(t))
    for (const m of mats.current) {
      if (!m) continue
      // The moon's column. 3.1 lays a sun down the paddies with uGlow* and
      // at night those were left on the sun's bearing at a daylight
      // strength, so the water had nothing on it — which is exactly why the
      // night read as dead. The column swings to the moon's side and gets
      // stronger, because a moon on water is a harder, narrower line than a
      // sun on water.
      m.uniforms.uGlowX.value = 56 - n * 320
      m.uniforms.uGlowWidth.value = 46 - n * 18
      m.uniforms.uGlowStrength.value = 0.5 + n * 0.95
      m.uniforms.uRippleStrength.value = 0.34 + n * 0.22
      for (const k of ['Deep', 'Sky', 'Ripple', 'Glow'] as const) {
        const pair = grade[k.toLowerCase() as 'deep' | 'sky' | 'ripple' | 'glow']
        ;(m.uniforms['u' + k].value as THREE.Color).copy(
          tmp.copy(pair[0]).lerp(pair[1], n),
        )
      }
    }
  })

  const collect = useCallback((i: number) => (m: THREE.ShaderMaterial | null) => {
    if (m) mats.current[i] = m
  }, [])

  return (
    <group>
      {bays.map((b, i) => (
        <group key={i} position={[b.x, VALLEY_Y + 4, b.z]}>
          <StylizedWater
            materialRef={collect(i)}
            width={b.w}
            depth={b.d}
            deep="#585378"
            sky="#D2571C"
            ripple="#F0A05A"
            glow="#FFC078"
            glowX={56}
            glowWidth={46}
            glowStrength={0.5}
            /* uRippleScale multiplies WORLD coordinates, so 3.1's 3.4 has to
               come down by the same 20× the valley is scaled up — otherwise
               every paddy is a solid block of interference. */
            rippleScale={0.17}
            rippleSpeed={0.5}
            rippleStrength={0.34}
            timeOffset={off}
          />
        </group>
      ))}
    </group>
  )
}

function Floor({ bays, farmland = 'full' }: { bays: Bay[]; farmland?: Farmland }) {
  const earth = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#5A3B2A', roughness: 1, metalness: 0,
  }), [])
  const road = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#9B7B5A', roughness: 0.95, metalness: 0.02,
  }), [])

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}
        position={[0, VALLEY_Y, (EARTH_Z0 + EARTH_Z1) / 2]} material={earth}>
        <planeGeometry args={[VALLEY_X_HALF * 4.2, EARTH_Z1 - EARTH_Z0]} />
      </mesh>
      {/* Once nobody is farming it, the parcelling goes with the farming. The
          bay rectangles and the lanes between them are the only things
          drawing lines on this ground, and a valley that has been worked over
          and abandoned is plain dirt — the field boundaries are the last
          thing a bulldozer leaves. */}
      {farmland !== 'none' && <FarFields bays={bays} />}
      <NearPaddies amount={NEAR_WET[farmland]} />
      {/* The road. Runs the whole valley so the far shot has a line through
          it — a patchwork with no path in it reads as wallpaper. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}
        position={[0, VALLEY_Y + 6, (VALLEY_Z0 + VALLEY_Z1) / 2]} material={road}>
        <planeGeometry args={[ROAD_W, LEN]} />
      </mesh>
    </group>
  )
}

/* ══ What is out there ══════════════════════════════════════════════ */
/**
 * The wide at 0:54 looks at eleven kilometres of valley, and a patchwork on
 * its own is wallpaper: it has the right texture and nothing in it. Three
 * instanced populations give it contents — lanes crossing between the
 * fields, hedgerow trees along the bunds, and farmsteads.
 *
 * The farmsteads are the ones that earn their keep twice. In daylight they
 * are pale boxes that give the eye something to measure the distance by; at
 * night their windows come on, and the twelve seconds of dark travelling
 * between Act 3.1 and Act 3.2 pass over a valley with fifty lit houses
 * scattered across it instead of a black plane.
 */
function Lanes({ bays }: { bays: Bay[] }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1)
    g.rotateX(-Math.PI / 2)
    return g
  }, [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#7A5B42', roughness: 1, metalness: 0,
  }), [])

  const lanes = useMemo(() => {
    // One lane per handful of field rows, running the width of the valley,
    // plus short spurs joining them back to the main road.
    const rand = seededRandom(9021)
    const out: { x: number; z: number; w: number; d: number }[] = []
    const rows = [...new Set(bays.map(b => Math.round(b.z / 40) * 40))].sort((a, b) => b - a)
    rows.forEach((z, i) => {
      if (i % 4 !== 2) return
      out.push({ x: 0, z: z + 30, w: VALLEY_X_HALF * 2, d: 16 + rand() * 10 })
    })
    for (let i = 0; i < 26; i++) {
      const x = (rand() < 0.5 ? -1 : 1) * (400 + rand() * VALLEY_X_HALF * 0.8)
      out.push({
        x, z: VALLEY_Z0 + rand() * (VALLEY_Z1 - VALLEY_Z0),
        w: 14 + rand() * 8, d: 900 + rand() * 2200,
      })
    }
    return out
  }, [bays])

  const place = useCallback((mesh: THREE.InstancedMesh | null) => {
    if (!mesh || mesh.userData.placed) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    lanes.forEach((l, i) => {
      m.compose(new THREE.Vector3(l.x, VALLEY_Y + 4, l.z), q,
        new THREE.Vector3(l.w, 1, l.d))
      mesh.setMatrixAt(i, m)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.userData.placed = true
  }, [lanes])

  return <instancedMesh ref={place} args={[geo, mat, lanes.length]} frustumCulled={false} />
}

function Hedgerows({ amount = 1 }: { amount?: number }) {
  const COUNT = Math.round(2400 * amount)
  const geo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 0)
    g.scale(1, 1.25, 1)
    g.translate(0, 1, 0)
    return g
  }, [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#2E4A24', roughness: 1, metalness: 0, flatShading: true,
  }), [])

  const place = useCallback((mesh: THREE.InstancedMesh | null) => {
    if (!mesh || mesh.userData.placed) return
    const rand = seededRandom(9022)
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const c = new THREE.Color()
    for (let i = 0; i < COUNT; i++) {
      // Clumped: pick a spot, then drop a short run of trees along z from it,
      // which is what a hedge between two fields looks like from the air.
      // Kept well off the road: at 120 there were 30-unit icosahedra sitting
      // beside the lens in the opening frame, reading as black hexagons.
      const x = (rand() < 0.5 ? -1 : 1) * (300 + rand() * VALLEY_X_HALF)
      const z = VALLEY_Z0 + rand() * (VALLEY_Z1 - VALLEY_Z0)
      const s = 12 + rand() * 20
      m.compose(new THREE.Vector3(x, VALLEY_Y + 4, z), q, new THREE.Vector3(s, s * (0.8 + rand() * 0.6), s))
      mesh.setMatrixAt(i, m)
      const v = 0.75 + rand() * 0.5
      c.setRGB(v * 0.9, v, v * 0.8)
      mesh.setColorAt(i, c)
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.userData.placed = true
  }, [])

  return <instancedMesh ref={place} args={[geo, mat, COUNT]} frustumCulled={false} />
}

function Farmsteads() {
  const COUNT = 54
  const wall = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#8E8578', roughness: 0.9, metalness: 0,
  }), [])
  const roof = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#3A3A42', roughness: 0.8, metalness: 0,
  }), [])
  /** The lit face. Emissive ramps with the night, so these come on across
   *  the valley as the sun goes. */
  const lit = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#3A2C18', emissive: new THREE.Color('#FFBA42'), emissiveIntensity: 0,
    roughness: 1, metalness: 0, toneMapped: true,
  }), [])

  const steads = useMemo(() => {
    const rand = seededRandom(9023)
    return Array.from({ length: COUNT }, () => ({
      x: (rand() < 0.5 ? -1 : 1) * (320 + rand() * VALLEY_X_HALF * 0.92),
      z: VALLEY_Z0 + 200 + rand() * (VALLEY_Z1 - VALLEY_Z0 - 400),
      ry: rand() * Math.PI * 2,
      s: 0.75 + rand() * 0.8,
    }))
  }, [])

  useFrame(() => {
    const t = worldTime()
    lit.emissiveIntensity = 2.6 * Math.max(1 - dayTint(t), nightFall(t))
  })

  return (
    <group>
      {steads.map((f, i) => (
        <group key={i} position={[f.x, VALLEY_Y + 4, f.z]} rotation={[0, f.ry, 0]} scale={f.s}>
          <mesh position={[0, 13, 0]} material={wall}>
            <boxGeometry args={[54, 26, 38]} />
          </mesh>
          <mesh position={[0, 29, 0]} material={roof}>
            <boxGeometry args={[64, 6, 48]} />
          </mesh>
          <mesh position={[0, 14, 19.4]} material={lit}>
            <planeGeometry args={[30, 14]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ══ Rice ═══════════════════════════════════════════════════════════ */
/**
 * Stalks, planted IN the flooded bays rather than scattered over the whole
 * valley — the first pass put 7,000 of them on a 26-unit pitch across
 * everything including the bunds and the verge, and at that spacing a rice
 * crop reads as a field of shrubs.
 */
function Rice({ amount = 1 }: { amount?: number }) {
  const COUNT = 38000
  const geo = useMemo(() => {
    const g = new THREE.ConeGeometry(0.26, 3.6, 4)
    g.translate(0, 1.8, 0)
    return g
  }, [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#93A445', roughness: 0.95, metalness: 0,
  }), [])

  const place = useCallback((mesh: THREE.InstancedMesh | null) => {
    if (!mesh || mesh.userData.placed) return
    const rand = seededRandom(8801)
    const bays = wetNearBays(amount)
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    // Density is per BAY, not per instance budget: a valley half out of
    // production is half as many planted fields, not the same fields planted
    // thin. Divided by the full layout's count so the number never changes
    // with `amount`.
    const per = Math.floor(COUNT / nearBays().length)
    let i = 0
    for (const b of bays) {
      // Rows across the bay, jittered — a paddy is planted, not sown.
      const rows = Math.max(2, Math.round(b.d / 13))
      for (let n = 0; n < per; n++) {
        const row = Math.floor(rand() * rows)
        const x = b.x + (rand() - 0.5) * (b.w - 10)
        const z = b.z - b.d / 2 + 5 + (row / rows) * (b.d - 10) + (rand() - 0.5) * 4
        if (Math.abs(x - TREE_X) < 100 && Math.abs(z - TREE_Z) < 100) continue
        const sc = (0.8 + rand() * 0.5) * (inYard(x, z) ? 0 : 1)
        e.set((rand() - 0.5) * 0.24, rand() * 3, (rand() - 0.5) * 0.24)
        q.setFromEuler(e)
        m.compose(new THREE.Vector3(x, VALLEY_Y + 4.2, z), q,
          new THREE.Vector3(sc, sc * (0.8 + rand() * 0.5), sc))
        mesh.setMatrixAt(i++, m)
      }
    }
    // Unused instances are collapsed to nothing rather than parked on the
    // last matrix — with the fields out of production that leftover is most
    // of the budget, and thirty thousand stalks stacked on one spot is a
    // green spike in the middle of the valley.
    m.makeScale(0, 0, 0)
    for (; i < COUNT; i++) mesh.setMatrixAt(i, m)
    mesh.instanceMatrix.needsUpdate = true
    mesh.userData.placed = true
  }, [amount])

  return <instancedMesh ref={place} args={[geo, mat, COUNT]} frustumCulled={false} />
}

const FLOWER_COLORS = ['#E8AA30', '#D46040', '#E8C050', '#CC5540']
const GRASS = 13000
const FLOWERS = 900
/** The verge is planted the whole length of the near band — the camera
 *  travels every metre of it during the night transit. */
const VERGE_Z0 = NEAR_Z
const VERGE_Z1 = VALLEY_Z1 - 60

/* ══ The verges ═════════════════════════════════════════════════════ */
/**
 * Grass tufts and wildflowers along the road edge. 3.1 has both and they do
 * a specific job: they are the only things in the frame CLOSE to the lens,
 * so they are what gives the shot a foreground at all. Without them the
 * nearest object is thirty metres away and the whole image sits at one
 * depth.
 *
 * `amount` thins the planting out and, at 0, takes it away entirely — the
 * road edge scraped bare, which is where Act 4.5's third measure leaves this
 * ground. Both populations are laid on their own seed and simply cut short,
 * so what is left is a subset of the film's own verge rather than a
 * different one.
 */
function Verges({ amount = 1 }: { amount?: number }) {
  const nGrass = Math.round(GRASS * amount)
  const nFlowers = Math.round(FLOWERS * amount)
  const grassGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.12, 0.34, 2.4, 4)
    g.translate(0, 1.2, 0)
    return g
  }, [])
  const grassMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#6E8A38', roughness: 0.9, metalness: 0,
  }), [])
  const stemGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.11, 0.11, 1.8, 4)
    g.translate(0, 0.9, 0)
    return g
  }, [])
  const stemMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#5A7A30', roughness: 0.9, metalness: 0,
  }), [])
  const headGeo = useMemo(() => new THREE.SphereGeometry(0.38, 8, 8), [])
  const headMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#FFFFFF', emissive: '#8A5020', emissiveIntensity: 0.35, roughness: 0.6,
  }), [])
  const placeGrass = useCallback((mesh: THREE.InstancedMesh | null) => {
    if (!mesh || mesh.userData.placed) return
    const rand = seededRandom(2277)
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    for (let i = 0; i < nGrass; i++) {
      const side = rand() < 0.5 ? -1 : 1
      const x = side * (ROAD_HALF + 0.5 + rand() * rand() * 22)
      const z = VERGE_Z0 + rand() * (VERGE_Z1 - VERGE_Z0)
      const s = (0.6 + rand() * 0.9) * (inYard(x, z) ? 0 : 1)
      e.set(0, rand() * 3, (rand() - 0.5) * 0.4)
      q.setFromEuler(e)
      m.compose(new THREE.Vector3(x, VALLEY_Y + 5, z), q, new THREE.Vector3(s, s * (0.7 + rand()), s))
      mesh.setMatrixAt(i, m)
    }
    mesh.instanceMatrix.needsUpdate = true
    mesh.userData.placed = true
  }, [nGrass])

  const flowers = useMemo(() => {
    const rand = seededRandom(2278)
    return Array.from({ length: nFlowers }, () => {
      const side = rand() < 0.5 ? -1 : 1
      return {
        x: side * (ROAD_HALF + 2 + rand() * rand() * 18),
        z: VERGE_Z0 + rand() * (VERGE_Z1 - VERGE_Z0),
        s: 0.7 + rand() * 0.7,
        c: FLOWER_COLORS[Math.floor(rand() * 4)],
      }
    })
  }, [nFlowers])

  const placeFlowers = useCallback((which: 'stem' | 'head') =>
    (mesh: THREE.InstancedMesh | null) => {
      if (!mesh || mesh.userData.placed) return
      const m = new THREE.Matrix4()
      const q = new THREE.Quaternion()
      const c = new THREE.Color()
      flowers.forEach((f, i) => {
        const s = f.s * (inYard(f.x, f.z) ? 0 : 1)
        m.compose(
          new THREE.Vector3(f.x, VALLEY_Y + 5 + (which === 'head' ? f.s * 1.8 : 0), f.z),
          q,
          new THREE.Vector3(s, s, s),
        )
        mesh.setMatrixAt(i, m)
        if (which === 'head') mesh.setColorAt(i, c.set(f.c))
      })
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      mesh.userData.placed = true
    }, [flowers])

  if (nGrass === 0 && nFlowers === 0) return null

  return (
    <group>
      <instancedMesh ref={placeGrass} args={[grassGeo, grassMat, nGrass]} frustumCulled={false} />
      <instancedMesh ref={placeFlowers('stem')} args={[stemGeo, stemMat, nFlowers]} frustumCulled={false} />
      <instancedMesh ref={placeFlowers('head')} args={[headGeo, headMat, nFlowers]} frustumCulled={false} />
    </group>
  )
}

/* ══ Telegraph poles, and the wires between them ════════════════════ */

/** Concatenate geometries into one buffer. Everything here is a TubeGeometry
 *  with the same attribute set, so this can stay this simple. */
function mergeGeos(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const out = new THREE.BufferGeometry()
  const names = ['position', 'normal', 'uv'] as const
  let vCount = 0
  let iCount = 0
  for (const g of list) {
    vCount += g.attributes.position.count
    iCount += g.index!.count
  }
  const buffers: Record<string, Float32Array> = {}
  const sizes: Record<string, number> = {}
  for (const n of names) {
    sizes[n] = list[0].attributes[n].itemSize
    buffers[n] = new Float32Array(vCount * sizes[n])
  }
  const idx = new Uint32Array(iCount)
  let vOff = 0
  let iOff = 0
  for (const g of list) {
    for (const n of names) {
      buffers[n].set(g.attributes[n].array as Float32Array, vOff * sizes[n])
    }
    const gi = g.index!.array
    for (let i = 0; i < gi.length; i++) idx[iOff + i] = gi[i] + vOff
    vOff += g.attributes.position.count
    iOff += gi.length
    g.dispose()
  }
  for (const n of names) {
    out.setAttribute(n, new THREE.BufferAttribute(buffers[n], sizes[n]))
  }
  out.setIndex(new THREE.BufferAttribute(idx, 1))
  return out
}

/**
 * Poles, and — the note the last pass came back with — the wires actually
 * connecting them. They were there before as `THREE.Line`s, which WebGL
 * draws one pixel wide however far away they are and which the composer's
 * bloom then eats entirely: from the road they were invisible. These are
 * swept tubes with real thickness, so they read as cable.
 */
export function Poles() {
  const wood = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#54382A', roughness: 0.95, metalness: 0,
  }), [])
  const wireMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#2A1C18', roughness: 0.8, metalness: 0.1,
  }), [])

  const poles = useMemo(() => {
    const out: number[] = []
    for (let z = VALLEY_Z1 - 60; z > NEAR_Z - 400; z -= 190) out.push(z)
    return out
  }, [])

  const wires = useMemo(() => {
    const X = ROAD_HALF + 20
    const spans: THREE.BufferGeometry[] = []
    for (let i = 0; i < poles.length - 1; i++) {
      for (const dx of [-5, 0, 5]) {
        const z0 = poles[i]
        const z1 = poles[i + 1]
        const pts: THREE.Vector3[] = []
        for (let k = 0; k <= 6; k++) {
          const u = k / 6
          // Catenary sag, approximated with a sine — over a 190-unit span at
          // this thickness the difference is well under a pixel.
          const sag = Math.sin(u * Math.PI) * 5.5
          pts.push(new THREE.Vector3(X + dx, VALLEY_Y + 42 - sag - (dx === 0 ? 4 : 0), z0 + (z1 - z0) * u))
        }
        const curve = new THREE.CatmullRomCurve3(pts)
        spans.push(new THREE.TubeGeometry(curve, 8, 0.42, 4, false))
      }
    }
    return mergeGeos(spans)
  }, [poles])

  return (
    <group>
      {poles.map((z, i) => (
        <group key={i} position={[ROAD_HALF + 20, VALLEY_Y + 4, z]}>
          <mesh position={[0, 22, 0]} material={wood}>
            <cylinderGeometry args={[1.1, 1.7, 44, 6]} />
          </mesh>
          <mesh position={[0, 42, 0]} material={wood}>
            <boxGeometry args={[14, 1.6, 1.6]} />
          </mesh>
          <mesh position={[0, 36, 0]} material={wood}>
            <boxGeometry args={[10, 1.3, 1.3]} />
          </mesh>
        </group>
      ))}
      <mesh geometry={wires} material={wireMat} frustumCulled={false} />
    </group>
  )
}

/* ══ The roadside ═══════════════════════════════════════════════════ */
/**
 * 3.1's own set dressing, at 20×. Laid down the last 3,000 units of road —
 * the stretch the closing camera travels — so the shot has landmarks to
 * pass, which is the difference between walking and treadmilling.
 */
/**
 * `farmland` gates the JANGSEUNG specifically. A pair of carved guardian posts
 * is the most explicitly pre-industrial thing on this road, and once the valley
 * has stopped being farmed — 4.5c's world, and now Act 7 and 8.55's — they are
 * the one piece of dressing that reads as a leftover rather than as a place.
 * The seed and the spacing are untouched, so every other landmark stays exactly
 * where it has always been and the `full` valley (Act 3's golden hour, the
 * flight) is unchanged; the jangseung slots simply come up empty.
 */
function Roadside({ farmland = 'full' }: { farmland?: Farmland } = {}) {
  const items = useMemo(() => {
    const rand = seededRandom(5150)
    const out: { kind: string; x: number; z: number; ry: number; s: number }[] = []
    let z = VALLEY_Z1 - 200
    const KINDS = ['jangseung', 'sotdae', 'cairn', 'persimmon', 'straw', 'straw', 'persimmon']
    let k = 0
    while (z > NEAR_Z + 200) {
      const side = k % 2 === 0 ? -1 : 1
      const kind = KINDS[k % KINDS.length]
      const off = kind === 'persimmon' ? 110 + rand() * 90
        : kind === 'straw' ? 150 + rand() * 260
        : ROAD_HALF + 12 + rand() * 26
      const zz = z - rand() * 90
      // Drawn unconditionally so the sequence never forks: every `rand()` in
      // this loop runs in the same order whatever gets dropped below, which is
      // what keeps the sotdae, cairns, straw stacks and persimmons standing
      // exactly where they have always stood.
      const ry = rand() * Math.PI * 2
      const sc = 0.85 + rand() * 0.35
      // The tree scene has its own dressing and does not want a jangseung
      // head floating through the top of the frame. And the jangseung slot goes
      // empty altogether once the valley has stopped being farmed.
      // The last stretch before the house is 3.3's arc — the camera swings
      // right past the verge there, and a guardian post that reads as a
      // landmark at 60 px reads as a black monolith blocking the house at
      // full frame. That slot comes up empty too.
      const drop = kind === 'jangseung' && (farmland !== 'full' || zz > -1150)
      if (Math.abs(zz - TREE_Z) > 420 && !drop) {
        out.push({ kind, x: side * off, z: zz, ry, s: sc })
      }
      z -= 190 + rand() * 190
      k++
    }
    return out
  }, [farmland])

  return (
    <group>
      {items.map((it, i) => (
        <group key={i} position={[it.x, VALLEY_Y + 4.4, it.z]}
          rotation={[0, it.ry, 0]} scale={S * it.s}>
          {it.kind === 'jangseung' && <JangseungPair position={[0, 0, 0]} />}
          {it.kind === 'sotdae' && <Sotdae position={[0, 0, 0]} />}
          {it.kind === 'cairn' && <StoneCairn position={[0, 0, 0]} />}
          {it.kind === 'persimmon' && <PersimmonTree position={[0, 0, 0]} opaqueCanopy />}
          {it.kind === 'straw' && <RiceStrawStack position={[0, 0, 0]} scale={1.4} />}
        </group>
      ))}
    </group>
  )
}

/* ══ The house ══════════════════════════════════════════════════════ */
/**
 * Square across the end of the road, facing back down it. It is on screen
 * twice: the camera clears its roof four seconds into the act on the way out
 * of the valley, and the last eight seconds are the two of them walking up
 * to its door.
 *
 * It used to stand off in a field two hundred units to the west, which made
 * nonsense of the road — a road has to go somewhere, and this is where this
 * one goes.
 */
/**
 * The house's own scale, deliberately NOT the valley's `S`.
 *
 * At S=20 the Hanok's walls stood 24 units tall in a world where an adult
 * GoldFigure is 37.8 — a house shorter than the people who live in it, with a
 * front door at their waist. It reads as a model of a house rather than a
 * house, and it makes Act 4.5 (a doorway shot, on this house) impossible. At
 * 38 the walls are 45.6, the door clears an adult's head, and the footprint is
 * about 4.6 x 3.4 metres: still a one-room cottage.
 *
 * Act 4.5 imports this to fix its door frame to the wall, so the two cannot
 * drift — please keep the export if this block gets rewritten.
 */
export const HOUSE_S = 38

export function ValleyHouse({ dim }: {
  /**
   * Live multiplier (0..1) on everything the house throws on the ground in
   * front of it — both lamps and the Hanok's amber quads. Act 8.55 turns the
   * porch down as the pair light, so they are the brightest thing on it.
   */
  dim?: () => number
} = {}) {
  const ref = useRef<THREE.PointLight>(null)
  const spill = useRef<THREE.PointLight>(null)
  useFrame(() => {
    const t = worldTime()
    // Down to a pilot light through the golden hour — a lamp has no business
    // competing with a low sun — and back up as the valley goes dark, until
    // by Act 3.2 it is the brightest thing left in the frame.
    const lit = 0.18 + 0.82 * Math.max(1 - dayTint(t), nightFall(t))
    const k = dim ? dim() : 1
    if (ref.current) ref.current.intensity = 30000 * lit * k
    if (spill.current) spill.current.intensity = 5200 * lit * k
  })
  return (
    <group position={[HOUSE_X, VALLEY_Y + 7, HOUSE_Z]} rotation={[0, Math.PI, 0]} scale={HOUSE_S}>
      <Hanok position={[0, 0, 0]} lights={false} glowLevel={dim} />
      {/* The rocking chair, beside the door under the right-hand window. The
          parent sits in it looking out down the road for the opening seconds;
          after that the chair stands empty through every later window the
          house is in — the golden hour, the walk home. Chair and sitter are
          authored at figure scale (S), not house scale, hence the wrapper. */}
      <group position={[0.85, -0.026, 1.30]} scale={S / HOUSE_S}>
        <PorchRocker hat={PARENT_HAT} />
      </group>
      {/* Act B's own lamp: three.js does not scale a PointLight's `distance`
          with its parent, so the house's built-in lights would light a
          three-metre bubble in a world where the house is sixty across. */}
      <pointLight ref={ref} position={[0, 0.9, 2.2]} color="#FFBA42"
        intensity={30000} distance={520} decay={1.8} />
      <pointLight ref={spill} position={[0, 0.2, 4.0]} color="#F5C36C"
        intensity={5200} distance={260} decay={2} />
    </group>
  )
}

/* ══ The orbs ═══════════════════════════════════════════════════════ */
/**
 * Two lights lift off the roof in the first seconds of the act and climb
 * away into the dark. They are the only thing moving in that opening frame,
 * they are what tells you the house is inhabited, and they are the seed of
 * everything the act ends up being about — by 1:12 the whole sky is made of
 * them.
 */
function HouseOrbs() {
  const a = useRef<THREE.Points>(null)
  const mat = useMemo(() => makeGlowMaterial({ falloff: 1.8, maxPixels: 130, twinkle: 0.14 }), [])
  const { camera } = useThree()

  const cloud = useMemo(() => buildCloud(
    2, 4242, ['#FFD98A', '#FFE9BE'],
    (_rand, i) => [
      HOUSE_X + (i === 0 ? -12 : 15),
      VALLEY_Y + 46,
      HOUSE_Z + (i === 0 ? -6 : 9),
      14 + i * 3.5,
      1,
    ],
  ), [])

  useFrame(({ size, gl }) => {
    const t = worldTime()
    updateGlow(mat, camera, size.height * gl.getPixelRatio(), t)
    mat.uniforms.uGlobal.value = ramp(t, 0.4, 1.6) * (1 - ramp(t, 7.5, 10))
    const pts = a.current
    if (!pts) return
    const pos = pts.geometry.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < 2; i++) {
      // They leave a beat apart, rise, and drift out over the paddies.
      const u = clamp01((t - 0.5 - i * 0.9) / 9)
      const climb = u * u * (3 - 2 * u)
      pos.setY(i, VALLEY_Y + 46 + climb * 290)
      pos.setX(i, HOUSE_X + (i === 0 ? -12 : 15) + Math.sin(t * 0.5 + i * 2.1) * 16 * climb)
      pos.setZ(i, HOUSE_Z + (i === 0 ? -6 : 9) - climb * 120)
    }
    pos.needsUpdate = true
  })

  return <GlowPoints pointsRef={a} cloud={cloud} material={mat} frustumCulled={false} />
}

/* ══ The two of them ════════════════════════════════════════════════ */

/** 3.1's pair is authored at adult scale 2.2; this lifts the whole rig to
 *  Act B's scale without touching a single hand-hold number. */
const PAIR_S = S / 2.2
/** Where the child stops walking and starts being carried. Deep in the
 *  night transit, where they are twenty pixels tall on a dark road — the
 *  one window in the act where the rig can change without anyone seeing it,
 *  and it is the same thing that happens between 3.1 and 3.2 in the film:
 *  it got dark, and the kid got tired. */
const T_CARRY = T_TREE

/**
 * What the parent has on their head.
 *
 * The pair walk AWAY from the lens for the whole last minute, so a face was
 * never going to do the telling-apart; a hat is the one thing drawn on the
 * body that reads in silhouette at this distance, and it belongs to the
 * parent — the figure that has to stay identifiable once the child has grown.
 * 사갓 because this is a farmer on a country road at the end of the day, but
 * `char-hats` has four of them side by side and swapping is this one line.
 */
export const PARENT_HAT: HatName = 'satgat-b'

/**
 * The glow crossover, on ACT B's clock rather than the scene's — B.7 and B.8
 * are windows into the same flight, so a figure's light has to know what
 * o'clock it is in the song, not in the clip.
 *
 * Module-level so they are the same function object every render and the
 * figures never rebuild over them.
 */
const parentGlowNow = () => parentGlow(worldTime())
const childGlowNow = () => childGlow(worldTime())

function makeShadowTexture(): THREE.Texture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.85)')
  grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.45)')
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

/**
 * The two of them, walking away from the lens up the road toward the house.
 *
 * Both rigs are 3.1's and 3.2's exactly, hold maths and all, wrapped in one
 * group that is rotated to face +z (Act B's road runs the other way) and
 * scaled. Position comes from `walkZ`, which is shared with the camera
 * keyframes so the two can never drift apart.
 *
 * The walk-cycle phase carries the window offset, so B.8's figures are on
 * the same step as the full B render's at the same instant — otherwise the
 * segmented render would put a hitch in their stride at every seam.
 */
function Pair() {
  const outer = useRef<THREE.Group>(null)
  const holding = useRef<THREE.Group>(null)
  const carrying = useRef<THREE.Group>(null)
  const shadowMat = useMemo(() => new THREE.MeshBasicMaterial({
    map: makeShadowTexture(), transparent: true, opacity: 0.7, depthWrite: false,
  }), [])
  const off = flightOffset()

  useFrame(() => {
    const t = worldTime()
    if (outer.current) outer.current.position.set(-16, VALLEY_Y + 6.2, walkZ(t))
    // Long shadows belong to a low sun; they go with it.
    shadowMat.opacity = 0.7 * sunRise(t)
    // They are under the tree between the two cuts, not on the road.
    const shown = t < T_TREE || t >= T_32
    const carry = t >= T_CARRY
    if (outer.current) outer.current.visible = shown
    if (holding.current) holding.current.visible = !carry
    if (carrying.current) carrying.current.visible = carry
  })

  /** Child's backside on the adult's SHOULDERS, not their head — 3.2's
   *  number, which is adult shoulder y minus child hip y. */
  const CHILD_Y = 2.2 * 1.47 - 1.5 * 0.58

  return (
    <group ref={outer}>
      <group rotation={[0, Math.PI, 0]} scale={PAIR_S}>
        {/* Act 3.1 — hand in hand. */}
        <group ref={holding}>
          {/* Soft contact shadows. The sun sits in the pass ahead of them, so
              these stretch back toward the lens. */}
          <mesh position={[0.2, 0.03, 1.5]} rotation={[-Math.PI / 2, 0, 0]} material={shadowMat}>
            <planeGeometry args={[1.2, 3.4]} />
          </mesh>
          <mesh position={[-0.3, 0.03, 1.2]} rotation={[-Math.PI / 2, 0, 0]} material={shadowMat}>
            <planeGeometry args={[0.9, 2.5]} />
          </mesh>
          <group position={[0.25, 0, 0]} rotation={[0, Math.PI, 0]} scale={2.2}>
            <GoldFigure inPlace material="goldParent" glow={0.9}
              hat={PARENT_HAT}
              glowScale={parentGlowNow}
              phaseOffset={off % 1}
              rightHandAt={[0.114, 0.80, 0]} />
          </group>
          <group position={[-0.25, 0, 0]} rotation={[0, Math.PI, 0]} scale={1.5}>
            <GoldFigure kind="child" inPlace material="goldChild"
              glowScale={childGlowNow}
              phaseOffset={(0.25 + off / 0.75) % 1}
              leftHandAt={[-0.167, 1.173, 0]} />
          </group>
        </group>
        {/* Act 3.2 — carried. Parent's hands down at mid-torso holding the
            child's ankles; the child nudged toward the lens so their torso
            hides the parent's head from behind. */}
        <group ref={carrying} visible={false} position={[-0.4, 0, 0]}>
          <group rotation={[0, Math.PI, 0]} scale={2.2}>
            {/* THE HAT GOES FORWARD, not back. A 삿갓 is 84 cm across and
                21 cm tall and the child's head sits 28 cm above the parent's,
                which puts it INSIDE the cone: measured, the crown was
                cutting 0.11 of a body-height through the child's skull, and
                tipping the brim back (which this did, at −0.55) swings the
                rear of it down into them and makes it worse. Three small
                things fix it, and all three are what a person carrying a
                child actually does:
                  · the hat goes forward over the brow (+0.52), so its back
                    edge lifts clear;
                  · the head goes forward and down under the weight (0.24);
                  · the child rides further back, off the neck.
                Measured clearance after: +0.065 of a body-height. The same
                three apply to any 삿갓-and-body collision — see the pat and
                the piggyback in Act 4. */}
            <GoldFigure inPlace material="goldParent" glow={1.1}
              hat={PARENT_HAT} hatTilt={0.66}
              glowScale={parentGlowNow}
              phaseOffset={off % 1}
              leftHandAt={[-0.23, 1.16, 0.07]}
              rightHandAt={[+0.23, 1.16, 0.07]}
              // 0.24 was buying hat-vs-child clearance, and it bought it by
              // shoving the head a full radius off the top of the spine —
              // from 3.3's three-quarter pan the parent's head floated
              // disconnected in front of the body. The clearance comes from
              // the hat's own tilt now (0.52 → 0.66); the head stays on the
              // neck.
              headForwardTilt={0.08} />
          </group>
          {/* Nudged further toward the lens than 3.2's 0.18: that scene has
              depth of field doing the separating, and here the parent's head
              was reading as a second bobble beside the child's. The extra
              0.25 on top of that is the brim — see above. */}
          <group position={[0, CHILD_Y - 0.04, 0.59]} rotation={[0, Math.PI, 0]} scale={1.5}>
            <GoldFigure kind="child" pose="seated-drape" inPlace material="goldChild" glow={1.5}
              glowScale={childGlowNow}
              seatedLean={-0.05}
              phaseOffset={(0.2 + off / 0.75) % 1} />
          </group>
        </group>
      </group>
    </group>
  )
}

/* ══ Field folk ═════════════════════════════════════════════════════ */
/**
 * The people who work this valley — ~18 figures out in the near paddies
 * through the golden hour, bent over the crop.
 *
 * They exist because 3.1's road ran between fields nobody was farming: the
 * pair walked home at the exact hour a rice valley is fullest of people, and
 * an inhabited world is most of what the walk home is ABOUT. They are the
 * film's anonymous body — Act 8.55's capsule-and-sphere recipe, two
 * InstancedMeshes (bodies + heads, two draw calls at any count) — because
 * the rule holds out here too: GoldFigure is for people the story knows,
 * and these are neighbours, not family.
 *
 * Authored directly in WORLD units like every other field population (an
 * adult peg is ~14 on the 8.55 scale ×, i.e. PEG_PER_GOLD 0.7 × the pair's
 * net 20), leaning 0.25–0.4 rad into the work with a slow bob and a slower
 * bow cycle. Colors are the city's greys warmed a quarter of the way toward
 * the valley's golds — warmer than 5.2's commuter tide, far dimmer than the
 * two walking home: they belong to the place, not to the story.
 *
 * Gated like the farming they are doing: mounted only under
 * `farmland === 'full'` (nobody works fields that are out of production),
 * and faded on STORY time — in across 55–58 as the golden hour settles, out
 * across 70–74 once the light has gone and the day's work with it. The
 * night transit and Act 3.2's dark valley are empty again.
 */
const FOLK_N = 18
const FOLK_Z0 = -6500
const FOLK_Z1 = -900
/** Split of the band: nearer than this is the stretch 3.1's frame sees. */
const FOLK_Z_MID = -5300
const FOLK_X_MIN = 60
const FOLK_X_MAX = 700

/** City grey, lerped 25% toward the valley's golds (8.55's GOLD_AMBER
 *  #C4913A / GOLD_DEEP #8B6914) — people of the grey world, warmed by the
 *  place they are standing in. These are UNLIT values (see the material
 *  below), so what is written here is what renders, modulo fog and grade. */
const FOLK_TINTS = [
  new THREE.Color(GREY_CROWD).lerp(new THREE.Color('#C4913A'), 0.45),
  new THREE.Color(GREY_CROWD_DARK).lerp(new THREE.Color('#8B6914'), 0.45),
  new THREE.Color(GREY_CROWD).lerp(new THREE.Color('#8B6914'), 0.45),
]

/** Working bodies — no children out in the paddies at this hour. */
const FOLK_TYPES: Archetype[] = ['tall', 'short', 'hunched', 'thin', 'tall', 'hunched', 'wide', 'short']

type Folk = {
  x: number; z: number; yaw: number
  /** Base forward lean — bent into the work. */
  lean: number
  bowSpeed: number; bowPhase: number
  swaySpeed: number; swayPhase: number; swayAmp: number
  bodyH: number; bodyW: number; headR: number; headY: number
  tint: number
}

function layoutFolk(): Folk[] {
  const rand = seededRandom(7781)
  const out: Folk[] = []

  /** Draw one figure's attributes and push it, unless the spot is excluded:
   *  clear of the tree (3.2's shot owns that ground — same 420-unit rule the
   *  roadside dressing follows) and, cheaply, of the yard. */
  const mk = (x: number, z: number) => {
    const archetype = FOLK_TYPES[Math.floor(rand() * FOLK_TYPES.length)]
    // 8.55 peg scale at valley size: 0.7 (PEG_PER_GOLD) × the pair's net 20,
    // shaded a little short — farmers, not the hero.
    const sc = S * 0.7 * (0.84 + rand() * 0.18)
    const yaw = rand() * Math.PI * 2
    const lean = 0.25 + rand() * 0.15
    const bowSpeed = 1.57 * (0.75 + rand() * 0.5) // ~0.2–0.3 Hz
    const bowPhase = rand() * Math.PI * 2
    const swaySpeed = 0.4 + rand() * 0.3
    const swayPhase = rand() * Math.PI * 2
    const swayAmp = 0.035 + rand() * 0.045
    const tint = Math.floor(rand() * FOLK_TINTS.length)
    if (Math.hypot(x - TREE_X, z - TREE_Z) < 450 || inYard(x, z)) return
    const bodyH = archetypeHeight(archetype) * sc * 3
    const bodyW = archetypeWidth(archetype) * sc * 3
    const headR = 0.13 * sc
    out.push({
      x, z, yaw, lean, bowSpeed, bowPhase, swaySpeed, swayPhase, swayAmp,
      bodyH, bodyW, headR, headY: bodyH * 1.5 + headR * 0.9, tint,
    })
  }

  /**
   * Placement is aimed, not blind. A uniform scatter over the whole band
   * spent seventeen of eighteen figures outside the one wedge of valley any
   * camera looks at during the golden hour — 3.1's settled frame (lens near
   * z=-6930 on the road, fov 42, looking up the road) — and the fields read
   * as empty as ever. So the stretch that frame actually sees gets almost
   * half of them, some working in pairs the way paddies are actually
   * worked; the rest scatter up the band so the flight over it is peopled.
   */
  // Three close to the lens. 3.1's camera parks near z=-6930 and the valley
  // fog washes anything past ~500 units to the sky's pink — the whole wedge
  // reads as pale posts from the road. The "these beings live here" read
  // needs bodies inside the fog's color range: two or three in the first
  // paddies off the road start, big enough to be capsule-and-head, close
  // enough to keep their warmth.
  for (const [x, z] of [[-72, -6748], [96, -6802], [-118, -6685]]) {
    mk(x + (rand() - 0.5) * 8, z + (rand() - 0.5) * 10)
  }
  while (out.length < 11) {
    const side = rand() < 0.5 ? -1 : 1
    const x = side * (70 + rand() * 360)
    const z = FOLK_Z_MID + rand() * (FOLK_Z0 + 50 - FOLK_Z_MID)
    const before = out.length
    mk(x, z)
    // A pair, sometimes: a second body a dozen units on, same field.
    if (out.length > before && out.length < 11 && rand() < 0.45) {
      mk(x + (rand() - 0.5) * 30, z - 10 - rand() * 18)
    }
  }
  while (out.length < FOLK_N) {
    const side = rand() < 0.5 ? -1 : 1
    const x = side * (FOLK_X_MIN + rand() * (FOLK_X_MAX - FOLK_X_MIN))
    const z = FOLK_Z1 + rand() * (FOLK_Z_MID - FOLK_Z1)
    mk(x, z)
  }
  return out
}

function FieldFolk() {
  const folk = useMemo(() => layoutFolk(), [])
  const groupRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.InstancedMesh>(null)
  const headRef = useRef<THREE.InstancedMesh>(null)

  const bodyGeo = useMemo(() => new THREE.CapsuleGeometry(0.5, 1, 4, 8), [])
  const headGeo = useMemo(() => new THREE.SphereGeometry(1, 8, 6), [])
  /** ONE material across both meshes; per-figure tint is instanceColor. The
   *  fade rides `opacity` (state of the whole population, like the sun on
   *  the paddies) rather than per-instance color, so the tints stay honest.
   *
   *  UNLIT, exactly like 8.55's crowd bodies, and for the same mechanical
   *  reason: the recipe scales one capsule non-uniformly per instance
   *  (bodyW, bodyH, bodyW), and the instancing shader transforms normals by
   *  the raw instance matrix — no inverse transpose — so under a lit
   *  material every stretched body's normals collapse toward "up" and the
   *  hemisphere fill paints the whole figure flat cream. A basic material
   *  has no normals to corrupt; the authored tints ARE the render, and the
   *  scene's fog and grade still sit on top. */
  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#FFFFFF',
    transparent: true, opacity: 0,
  }), [])

  const dummy = useMemo(() => {
    const o = new THREE.Object3D()
    // Yaw first, then lean about the yawed (local) x — "bent over the row
    // they are facing", not "tipped along the world axis".
    o.rotation.order = 'YXZ'
    return o
  }, [])
  const mOff = useMemo(() => new THREE.Matrix4(), [])
  const mOut = useMemo(() => new THREE.Matrix4(), [])
  const tintScratch = useMemo(() => new THREE.Color(), [])

  useFrame(() => {
    const t = worldTime()
    // STORY-time gate: in with the settled golden hour, gone with the light.
    const env = ramp(t, 55, 58) * (1 - ramp(t, 70, 74))
    if (groupRef.current) groupRef.current.visible = env > 0.002
    if (env <= 0.002) return
    const bodies = bodyRef.current
    const heads = headRef.current
    if (!bodies || !heads) return
    mat.opacity = env
    // Unlit bodies do not know what time it is, so the material's base color
    // carries the daylight for them: full tint under the golden-hour sun,
    // down to a near-silhouette once the valley cuts to night (3.2 opens on
    // story 64 with them still mounted until the 70–74 fade).
    // Peak scalar runs a shade over 1: the low sun overdrives the warm tints
    // just enough to lift them off the bright paddy water — at 25%-gold ×
    // 0.94 they read as fence posts from 3.1's road (measured), and "the
    // beings live here" is the entire reason this population exists.
    mat.color.setScalar(0.06 + 1.14 * dayTint(t) * sunRise(t))
    if (!bodies.userData.tinted) {
      folk.forEach((f, i) => {
        tintScratch.copy(FOLK_TINTS[f.tint])
        bodies.setColorAt(i, tintScratch)
        heads.setColorAt(i, tintScratch)
      })
      if (bodies.instanceColor) bodies.instanceColor.needsUpdate = true
      if (heads.instanceColor) heads.instanceColor.needsUpdate = true
      bodies.userData.tinted = true
    }
    folk.forEach((f, i) => {
      // The work: a slow bow deepening the lean by up to 0.1 rad, and the
      // 8.55 sway (offset/speed/amount ranges lifted from its figures).
      const bow = 0.5 - 0.5 * Math.cos(t * f.bowSpeed + f.bowPhase)
      const sway = Math.sin(t * f.swaySpeed + f.swayPhase) * f.swayAmp
      dummy.position.set(f.x, VALLEY_Y + 4.15, f.z)
      dummy.rotation.set(f.lean + bow * 0.1, f.yaw, sway * 1.5)
      dummy.updateMatrix()
      mOut.copy(dummy.matrix)
      mOut.multiply(mOff.makeTranslation(0, f.bodyH * 0.5, 0))
      mOut.multiply(mOff.makeScale(f.bodyW, f.bodyH, f.bodyW))
      bodies.setMatrixAt(i, mOut)
      mOut.copy(dummy.matrix)
      mOut.multiply(mOff.makeTranslation(0, f.headY, 0))
      mOut.multiply(mOff.makeScale(f.headR, f.headR, f.headR))
      heads.setMatrixAt(i, mOut)
    })
    bodies.instanceMatrix.needsUpdate = true
    heads.instanceMatrix.needsUpdate = true
  })

  return (
    <group ref={groupRef} visible={false}>
      <instancedMesh ref={bodyRef} args={[bodyGeo, mat, folk.length]} frustumCulled={false} />
      <instancedMesh ref={headRef} args={[headGeo, mat, folk.length]} frustumCulled={false} />
    </group>
  )
}

/* ══ Air ════════════════════════════════════════════════════════════ */
/** The sun coming up behind the pass, its haze, and dust in the low light. */
function Air() {
  const { camera } = useThree()
  const sunRef = useRef<THREE.Mesh>(null)
  const hazeRef = useRef<THREE.Mesh>(null)

  const glowTex = useMemo(() => {
    const SZ = 256
    const cv = document.createElement('canvas')
    cv.width = cv.height = SZ
    const ctx = cv.getContext('2d')!
    const g = ctx.createRadialGradient(SZ / 2, SZ / 2, 0, SZ / 2, SZ / 2, SZ / 2)
    g.addColorStop(0, 'rgba(255,240,204,0.98)')
    g.addColorStop(0.18, 'rgba(255,196,124,0.62)')
    g.addColorStop(0.5, 'rgba(232,136,88,0.22)')
    g.addColorStop(1, 'rgba(200,110,80,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, SZ, SZ)
    const tex = new THREE.CanvasTexture(cv)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])

  const sunMat = useMemo(() => new THREE.MeshBasicMaterial({
    map: glowTex, transparent: true, depthWrite: false, fog: false,
    blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0,
  }), [glowTex])
  const hazeMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#E0A078', transparent: true, opacity: 0, depthWrite: false, fog: false,
  }), [])

  const dustMat = useMemo(() => makeGlowMaterial({ falloff: 2.6, maxPixels: 22 }), [])
  const dustCloud = useMemo(() => buildCloud(
    520, 6611, ['#FFD9A0', '#FFEFC8', '#FFC98A'],
    rand => [
      (rand() - 0.5) * 1400,
      VALLEY_Y + 6 + rand() * 120,
      NEAR_Z + rand() * (VALLEY_Z1 - NEAR_Z),
      0.8 + rand() * 1.6,
      0.5 + rand() * 0.5,
    ],
  ), [])

  const sunDir = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ size, gl }) => {
    const t = worldTime()
    updateGlow(dustMat, camera, size.height * gl.getPixelRatio(), t)
    const up = clamp01(dayTint(t))
    const risen = sunRise(t)
    // All three go out with the sun. A glow in the pass and dust in the beam
    // are golden-hour things; Act 3.2's valley has neither.
    sunMat.opacity = up * risen * 0.80
    hazeMat.opacity = up * risen * 0.46
    dustMat.uniforms.uGlobal.value = up * risen * 0.85
    // The sun is SKY, not a prop. Pinned in the world at the pass it was
    // eight kilometres behind the 3.1 beat and contributed nothing to it —
    // and the low sun down the road is most of what that frame is. So it
    // rides with the camera at a fixed bearing and elevation, far enough out
    // (9,000) that the range still occludes it from anywhere in the valley.
    if (sunRef.current) {
      // 16,000 out, not 9,000: at the widest frame the range is 11,000 from
      // the lens, and a sun disc nearer than that draws OVER the mountains.
      sunDir.set(0.06, 0.028 + risen * 0.075, 1).normalize().multiplyScalar(16000)
      sunRef.current.position.copy(camera.position).add(sunDir)
      sunRef.current.quaternion.copy(camera.quaternion)
    }
  })

  return (
    <group>
      <mesh ref={sunRef} material={sunMat} frustumCulled={false} renderOrder={-40}>
        <planeGeometry args={[8200, 5700]} />
      </mesh>
      <mesh ref={hazeRef} position={[0, VALLEY_Y + 40, -600]} material={hazeMat}>
        <planeGeometry args={[6000, 150]} />
      </mesh>
      <GlowPoints cloud={dustCloud} material={dustMat} frustumCulled={false} />
      {/* 3.1's pollen and fireflies, at scale, hanging over the last stretch
          of road — the thing that makes a golden-hour frame read as air
          rather than as clean geometry. */}
      {/* Pollen hanging in the low sun where Act 3.1 happens… */}
      <SeededSparkles seed={34} count={90} scale={[26 * S, 5 * S, 40 * S]} size={5}
        speed={0.12} color="#FFD9A0" opacity={0.5} timeOffset={flightOffset()}
        position={[0, VALLEY_Y + 44, WALK_31_Z - 120]} />
      {/* …and fireflies at the house, where Act 3.2 does. */}
      <SeededSparkles seed={31} count={90} scale={[22 * S, 4 * S, 26 * S]} size={6}
        speed={0.3} color="#FFD866" opacity={0.6} timeOffset={flightOffset()}
        position={[0, VALLEY_Y + 26, HOUSE_Z - 260]} />
      <SeededSparkles seed={33} count={50} scale={[14 * S, 3 * S, 14 * S]} size={5}
        speed={0.22} color="#FFAA33" opacity={0.5} timeOffset={flightOffset()}
        position={[HOUSE_X - 90, VALLEY_Y + 20, HOUSE_Z - 90]} />
    </group>
  )
}

/* ══ Light ══════════════════════════════════════════════════════════ */
/**
 * 3.1's key: a low, warm sun raking down the valley from the pass, with an
 * amber fill so the shadows stay honey-coloured. Ramped in over the pull-out
 * so it never fights the moon while the act is still at night.
 */
function ValleyLight() {
  const key = useRef<THREE.DirectionalLight>(null)
  const fill = useRef<THREE.HemisphereLight>(null)
  const moon = useRef<THREE.DirectionalLight>(null)
  const cool = useRef<THREE.HemisphereLight>(null)
  useFrame(() => {
    const t = worldTime()
    const sun = dayTint(t) * sunRise(t)
    const nite = nightFall(t)
    if (key.current) key.current.intensity = sun * 3.4
    if (fill.current) fill.current.intensity = sun * 0.72
    // Act 3.2's key: cold, from the moon over the pass, and WEAK — the point
    // of that scene is that the house and the two of them are the only warm
    // things in it, and at 0.85 the moon was filling the paddies in enough
    // to make it a dim day rather than a night.
    if (moon.current) moon.current.intensity = nite * 0.34
    if (cool.current) cool.current.intensity = nite * 0.09
  })
  return (
    <>
      <directionalLight ref={key} position={[220, 150, 2400]} intensity={0}
        color="#FF8C36" />
      <hemisphereLight ref={fill} intensity={0} color="#FFCC80" groundColor="#5E3820" />
      <directionalLight ref={moon} position={[-900, 1300, 2000]} intensity={0}
        color="#7E9AE0" />
      <hemisphereLight ref={cool} intensity={0} color="#6A80B8" groundColor="#0A121C" />
    </>
  )
}

/**
 * `people`   — Act B's own two walkers. Off for scenes that stage their own
 *              figures here (Act 4's montage beats), or they turn up in the
 *              background of somebody else's shot.
 * `poles`    — the power line. Off for Act 4.5, which raises its own copy over
 *              the course of an industrialisation lapse.
 * `farmland` — how much of the valley is still being farmed. `full` is the
 *              film's valley and the default; see `Farmland` above. Act 4.5
 *              is the only caller that asks for anything else.
 */
export function Valley({ people = true, poles = true, farmland = 'full' }: {
  people?: boolean
  poles?: boolean
  farmland?: Farmland
} = {}) {
  const bays = useMemo(() => applyFarmland(layoutBays(), farmland), [farmland])
  return (
    <group>
      <ValleyLight />
      <Floor bays={bays} farmland={farmland} />
      {farmland !== 'none' && <Lanes bays={bays} />}
      <Hedgerows amount={HEDGE_AMOUNT[farmland]} />
      <Farmsteads />
      <Rice amount={RICE_AMOUNT[farmland]} />
      <Verges amount={VERGE_AMOUNT[farmland]} />
      {poles && <Poles />}
      <Roadside farmland={farmland} />
      {/* Nobody works fields that are out of production — the folk are
          gated on the same state as the water and the crop. */}
      {farmland === 'full' && <FieldFolk />}
      <Air />
      <HouseOrbs />
      {people && <Pair />}
    </group>
  )
}
