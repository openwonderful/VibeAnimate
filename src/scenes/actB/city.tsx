/**
 * Act B — the city.
 *
 * A canyon of towers either side of the flight path, z 2000→4300. Three
 * things make it read as a place rather than as a row of lit boxes:
 *
 *   Windows are computed in the fragment shader from each instance's world
 *   size, so a window is the same physical size on a 90-unit block as on a
 *   420-unit tower, and every tower has its own lit/dark pattern. One
 *   InstancedMesh, one draw call, 240 buildings, no textures.
 *
 *   Traffic runs. Two streams of head- and tail-lights move along the
 *   streets under the flight path, animated entirely in the vertex shader
 *   (position is a function of uTime), so they cost nothing per frame and
 *   are perfectly deterministic in a parallel render.
 *
 *   The far city keeps going. Beyond the towers the ground carries ten
 *   thousand window-lights out to the fog line, so the city has no back
 *   wall — the old version's "corridor" was a pair of 50-unit slabs with
 *   nothing behind them, and you could feel the set ending.
 *
 * The "I need" sign is the one literal thing in the act: a pixel wordmark
 * across a tower face, lighting on the 0:13.05 and 0:14.96 vocals.
 */
import { useCallback, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { seededRandom } from '../../utils/svgHelpers'
import { buildCloud, makeGlowMaterial, updateGlow } from './points'
import { GlowPoints } from './GlowPoints'
import { worldTime } from './time'
import {
  CITY_Z_NEAR, CITY_Z_FAR, CORRIDOR_HALF, STADIUM_Z,
  T_SIGN_A, T_SIGN_B, T_SIGN_1, T_SIGN_2, clamp01, flightPose, type PoseFn,
} from './flight'

/* ══ Towers ═════════════════════════════════════════════════════════ */

/** Night-city block colours: saturated, but dark enough that the windows
 *  still read as the bright thing on the facade. */
const BLOCK_COLORS = [
  '#120C28', '#1C0A20', '#08182C', '#0A1C18', '#220C18',
  '#0C1030', '#180A26', '#061C20', '#221408', '#0C1808',
]

/**
 * And the windows. One colour per WINDOW — most of them warm white, some
 * amber, and a scattering of cyan, pink, mint, violet and red, with every
 * cell independently lit or dark. That is what a city looks like at night,
 * and it is what this act had at the start.
 *
 * The two attempts in between were both a unit too coarse. Per-window random
 * HUE aliased into noise, so it went to a single warm white for the whole
 * city — calm, correct and characterless. Then one colour per BUILDING,
 * which is worse: an entire tower in violet and the next one in green reads
 * as a colour-swatch, not as a place.
 *
 * The aliasing that started all this is solved by DISTANCE instead. Near the
 * lens every window keeps its own colour; past a kilometre they all converge
 * on one warm yellow — which is both what a city looks like from four
 * kilometres away and, conveniently, the only stable thing to draw when a
 * window is a third of a pixel wide.
 */
const WINDOW_GLSL = /* glsl */ `
  vec3 winColor(float h) {
    if (h < 0.42) return vec3(1.00, 0.88, 0.62);   // warm white — the bulk
    if (h < 0.60) return vec3(1.00, 0.74, 0.34);   // amber
    if (h < 0.70) return vec3(1.00, 0.96, 0.88);   // paper white
    if (h < 0.79) return vec3(0.40, 0.86, 1.00);   // cyan
    if (h < 0.86) return vec3(1.00, 0.50, 0.72);   // pink
    if (h < 0.91) return vec3(0.58, 1.00, 0.70);   // mint
    if (h < 0.96) return vec3(0.72, 0.50, 1.00);   // violet
    return vec3(1.00, 0.38, 0.30);                 // red
  }
`

/**
 * One building. Authored in ACT B UNITS, where the window grid below is
 * 9.5 × 12 — i.e. one unit is about a quarter of a metre. Any scene reusing
 * `TowerField` has to lay its city out in those units and scale the group,
 * or the windows come out the size of doors.
 */
export type Tower = {
  x: number; z: number; w: number; d: number; h: number; seed: number
}

/**
 * Layout: a continuous city. Buildings run right across the flight path —
 * the ones under it are simply LOW, so the camera clears them, which is how
 * the original 3D city did it. Carving an empty 480-unit-wide trench down
 * the middle instead (what this was) reads as a runway someone bulldozed
 * through a downtown, and the eye goes straight to the hole.
 *
 * Height rises with distance from the axis: a low-rise core over the flight
 * line, mid-rise shoulders, towers on the flanks.
 */
function layoutTowers(): Tower[] {
  const rand = seededRandom(6060)
  const out: Tower[] = []
  const rows = 30
  for (let r = 0; r < rows; r++) {
    const z = CITY_Z_NEAR + (r + 0.5) * ((CITY_Z_FAR - CITY_Z_NEAR) / rows)
    const perRow = 15
    for (let i = 0; i < perRow; i++) {
      const w = 44 + rand() * 76
      const d = 44 + rand() * 72
      const x = (i - (perRow - 1) / 2) * (300 + rand() * 40) + (rand() - 0.5) * 90
      if (Math.abs(x) > 2400) continue
      // 0 under the flight path, 1 out on the flanks.
      const away = Math.min(1, Math.max(0, (Math.abs(x) - CORRIDOR_HALF * 0.6) / 900))
      const lift = away * away * (3 - 2 * away)
      const h = 34 + rand() * 44 + lift * (110 + rand() * 320)
      out.push({ x, z: z + (rand() - 0.5) * 90, w, d, h, seed: rand() * 1000 })
    }
  }
  return out
}

const TOWER_VERT_PARS = /* glsl */ `
  attribute vec3 aScale;
  attribute float aSeed;
  varying vec3 vAScale;
  varying float vASeed;
  varying vec3 vObjNormal;
  varying float vDist;
`
const TOWER_VERT_MAIN = /* glsl */ `
  vAScale = aScale;
  vASeed = aSeed;
  vObjNormal = normal;
  vDist = -(modelViewMatrix * instanceMatrix * vec4(transformed, 1.0)).z;
`

const TOWER_FRAG_PARS = /* glsl */ `
  varying vec3 vAScale;
  varying float vASeed;
  varying vec3 vObjNormal;
  varying float vDist;
  uniform float uWinW;
  uniform float uWinH;
  uniform float uLit;
  uniform float uResK;
  uniform float uFloorMin;
  uniform float uMono;
  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
` + WINDOW_GLSL
/**
 * Window grid. vUv is per-face 0..1; the number of cells across a face comes
 * from that face's real width, so cell size is constant in world units. Lit
 * cells get a warm colour picked from the same hash, dimmed slightly toward
 * street level (nobody is home on floor 2 of an office block).
 */
const TOWER_FRAG_MAIN = /* glsl */ `
  float faceW = abs(vObjNormal.x) > 0.5 ? vAScale.z : vAScale.x;
  float faceH = vAScale.y;
  if (abs(vObjNormal.y) < 0.5) {
    vec2 cells = vec2(max(1.0, floor(faceW / uWinW)), max(1.0, floor(faceH / uWinH)));
    vec2 g = vUv * cells;
    vec2 id = floor(g);
    vec2 f = fract(g);
    // Derivative-aware edges. Without this the window grid is a field of
    // hard step() edges sampled once per pixel, and every tower in the middle
    // distance boils and crawls as the camera moves — which is exactly what
    // "the building lights are flickering like crazy" is.
    //
    // Handled PER AXIS, because the derivative blows up along one axis long
    // before the other: the towers lining the canyon are seen almost edge-on,
    // so fw.x is enormous while fw.y is fine. Smoothing both by fw.x turns
    // every one of those faces into a flat half-lit sheet — the grey concrete
    // wash that made the city look like it was shot in daylight.
    // uResK sets how early the unresolved fallback takes over. Act B flies
    // over this city and wants every window it can still resolve, so it holds
    // the original 2.0. A scene standing ON the pavement is looking along a
    // wall that runs a hundred metres away from the lens at a grazing angle,
    // where the derivative climbs through the whole partially-aliased band and
    // leaves vertical streaks crawling down the facade; those want a much
    // earlier handover.
    vec2 fw = max(fwidth(g), vec2(1e-4));
    float resX = clamp(1.0 - fw.x * uResK, 0.0, 1.0);
    float resY = clamp(1.0 - fw.y * uResK, 0.0, 1.0);
    float res = min(resX, resY);
    float rxS = smoothstep(0.16 - fw.x, 0.16 + fw.x, f.x)
              * (1.0 - smoothstep(0.84 - fw.x, 0.84 + fw.x, f.x));
    float ryS = smoothstep(0.22 - fw.y, 0.22 + fw.y, f.y)
              * (1.0 - smoothstep(0.80 - fw.y, 0.80 + fw.y, f.y));
    // Below the resolution limit each axis falls back to its duty cycle —
    // the fraction of the cell a window actually occupies.
    float rx = mix(0.68, rxS, resX);
    float ry = mix(0.58, ryS, resY);
    float r = hash21(id + vASeed * 37.0);
    float on = step(0.74, r);
    float onR = mix(0.34, on, res);
    // Unresolved windows are also seen at a grazing angle, where a recessed
    // window is mostly reveal and jamb rather than glass. Without this the
    // integrated average of a wall of bright windows is genuinely bright,
    // and correct-but-wrong: it reads as lit concrete.
    float lit = onR * rx * ry * mix(0.30, 1.0, res);
    // And a second, purely DISTANCE-driven fade to the same average. The
    // derivative terms above are correct but they are computed per pixel per
    // frame, so as the camera moves they cross their thresholds at different
    // moments across a facade and the wall crawls. Distance changes smoothly,
    // so blending on it takes the last of the shimmer out of the middle
    // distance without flattening the towers you are flying between.
    float far = smoothstep(500.0, 1500.0, vDist);
    lit = mix(lit, 0.34 * 0.68 * 0.58 * 0.30, far);

    // Lower storeys dimmer than upper ones — nobody is home on floor 2 of an
    // office block, and from the air that band is noise anyway. A street-level
    // scene sees NOTHING BUT that band, so it sets uFloorMin to 1.
    float floorFade = uFloorMin + (1.0 - uFloorMin) * smoothstep(0.0, 0.28, vUv.y);
    // Per-window colour, on its own hash so hue and on/off are independent —
    // and converging on one warm yellow with distance, which is the whole
    // anti-aliasing argument (see WINDOW_GLSL).
    vec3 win = winColor(hash21(id * 1.37 + vec2(vASeed * 91.3, 5.1)));
    // Converge on one warm yellow wherever the grid is unresolved — whether
    // that is because the tower is four kilometres away (far) or because the
    // face is turned almost edge-on to the lens (res). The distance term alone
    // was enough for Act B, which only ever sees this city from the air; from
    // the pavement in 5.2 the near wall runs off at a grazing angle with far
    // still at zero, and a per-cell random HUE across subpixel columns is a
    // field of coloured vertical streaks crawling up the building.
    win = mix(win, vec3(1.0, 0.80, 0.42), max(far, 1.0 - res));
    // uMono strips every hue to its own luminance — 5.2's soulless city is
    // lit in black and white, and the one warm thing in it is not a window.
    win = mix(win, vec3(dot(win, vec3(0.299, 0.587, 0.114))), uMono);
    totalEmissiveRadiance += win * lit * floorFade * uLit;
    // The block's own colour underneath, barely — these are dark boxes with
    // lights in them, not coloured boxes.
    #ifdef USE_INSTANCING_COLOR
      vec3 blockC = mix(vColor, vec3(dot(vColor, vec3(0.299, 0.587, 0.114))), uMono);
      totalEmissiveRadiance += blockC * 0.12;
    #endif

    // Neon: one building in six carries a lit edge stripe in a saturated
    // colour, which is most of what made the old city read as Korean rather
    // than as an office park.
    float nHash = hash21(vec2(vASeed * 11.3, 4.7));
    if (nHash > 0.83) {
      float side = step(0.5, fract(vASeed * 7.7));
      float u = mix(vUv.x, 1.0 - vUv.x, side);
      float stripe = 1.0 - smoothstep(0.02, 0.055, abs(u - 0.055));
      float run = smoothstep(0.03, 0.10, vUv.y) * (1.0 - smoothstep(0.86, 0.99, vUv.y));
      // Same resolution fallback the window grid gets. The stripe is a hard
      // 7.5%-duty edge in u and it was the only unguarded term in here, so
      // wherever a facade turned away from the lens it aliased into a field of
      // bright saturated confetti — which is most of what "the buildings are
      // flickering" turned out to be from street level.
      stripe = mix(0.075, stripe, resX);
      run = mix(0.83, run, resY);
      vec3 neon = nHash > 0.955 ? vec3(0.20, 1.0, 0.62)
                : nHash > 0.925 ? vec3(0.25, 0.85, 1.0)
                : nHash > 0.885 ? vec3(1.0, 0.30, 0.62)
                                : vec3(1.0, 0.48, 0.12);
      // Mono city: the stripes go plain white, not grey — they are the
      // brightest thing on the facade and white is what they read as.
      neon = mix(neon, vec3(1.0), uMono);
      totalEmissiveRadiance += neon * stripe * run * 2.1;
    }
  }
`

export type TowerFieldProps = {
  towers: Tower[]
  /** Base plane the boxes stand on, in the towers' own units. */
  baseY?: number
  /** Window cell size, in the towers' own units. */
  winW?: number
  winH?: number
  /** Overall window brightness. */
  lit?: number
  /**
   * How aggressively the window grid gives up and falls back to its own
   * average. 2 is Act B's aerial value; street-level shots want ~5–6.
   */
  resK?: number
  /**
   * Brightness floor for the lowest storeys. 0.45 is Act B's; a scene standing
   * in the street wants 1 (no dimming) because that band is the whole shot.
   */
  floorMin?: number
  /** Seed for the per-building block colour draw. */
  colorSeed?: number
  /**
   * 0 = Act B's coloured windows and neon; 1 = every light stripped to its
   * luminance (5.2's black-and-white street). Baked at compile, like the rest.
   */
  mono?: number
}

/**
 * The city facade, as a reusable thing: one InstancedMesh, one draw call, and
 * a shader that computes each window from the instance's real world size. Act
 * B calls it with `layoutTowers()`; Act 5.2 calls it with its own street
 * canyon, so the two cities are literally the same buildings seen from the
 * pavement instead of from the air.
 */
export function TowerField({
  towers,
  baseY = 0,
  winW = 9.5,
  winH = 12.0,
  lit = 0.82,
  resK = 2.0,
  floorMin = 0.45,
  colorSeed = 2244,
  mono = 0,
}: TowerFieldProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  const { geometry, material } = useMemo(() => {
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    geometry.translate(0, 0.5, 0)

    const scales = new Float32Array(towers.length * 3)
    const seeds = new Float32Array(towers.length)
    towers.forEach((t, i) => {
      scales[i * 3] = t.w; scales[i * 3 + 1] = t.h; scales[i * 3 + 2] = t.d
      seeds[i] = t.seed
    })
    geometry.setAttribute('aScale', new THREE.InstancedBufferAttribute(scales, 3))
    geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1))

    const material = new THREE.MeshStandardMaterial({
      color: '#FFFFFF', roughness: 0.86, metalness: 0.18,
    })
    material.onBeforeCompile = shader => {
      shader.uniforms.uWinW = { value: winW }
      shader.uniforms.uWinH = { value: winH }
      shader.uniforms.uLit = { value: lit }
      shader.uniforms.uResK = { value: resK }
      shader.uniforms.uFloorMin = { value: floorMin }
      shader.uniforms.uMono = { value: mono }
      shader.vertexShader =
        '#define USE_UV\n' + TOWER_VERT_PARS + shader.vertexShader
          .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + TOWER_VERT_MAIN)
      shader.fragmentShader =
        '#define USE_UV\n' + TOWER_FRAG_PARS + shader.fragmentShader
          .replace(
            '#include <emissivemap_fragment>',
            '#include <emissivemap_fragment>\n' + TOWER_FRAG_MAIN,
          )
    }
    material.customProgramCacheKey = () => 'actB-tower'
    return { geometry, material }
  }, [towers, winW, winH, lit, resK, floorMin, mono])

  const matrices = useMemo(() => {
    const m = new THREE.Matrix4()
    const arr: THREE.Matrix4[] = []
    for (const t of towers) {
      m.compose(
        new THREE.Vector3(t.x, baseY, t.z),
        new THREE.Quaternion(),
        new THREE.Vector3(t.w, t.h, t.d),
      )
      arr.push(m.clone())
    }
    return arr
  }, [towers, baseY])

  /**
   * Placed from a ref callback rather than in useFrame, and this matters:
   * the material carries a customProgramCacheKey (it has to, or three will
   * hand this onBeforeCompile'd shader to any other MeshStandardMaterial
   * with matching parameters). A fixed cache key means the program compiled
   * on the first render is the one reused forever — so if instanceColor does
   * not exist YET on that first render, USE_INSTANCING_COLOR never gets
   * defined and every building stays white no matter what setColorAt says.
   * The ref fires during commit, before the first frame.
   */
  const place = useCallback((mesh: THREE.InstancedMesh | null) => {
    meshRef.current = mesh
    if (!mesh || mesh.userData.placed) return
    const rand = seededRandom(colorSeed)
    const c = new THREE.Color()
    matrices.forEach((m, i) => {
      mesh.setMatrixAt(i, m)
      // Solid, saturated block colour per building. A city of identical
      // near-black boxes is a warehouse district; the old 3D city gave every
      // row its own tint and that is most of why it was fun to look at.
      c.set(BLOCK_COLORS[Math.floor(rand() * BLOCK_COLORS.length)])
      mesh.setColorAt(i, c)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.userData.placed = true
  }, [matrices, colorSeed])

  return (
    <instancedMesh
      ref={place}
      args={[geometry, material, towers.length]}
      frustumCulled={false}
    />
  )
}

export function Towers() {
  const towers = useMemo(() => layoutTowers(), [])
  return <TowerField towers={towers} baseY={-16} />
}

/* ══ Rooftop beacons, neon, and the far city ════════════════════════ */

export function CityLights() {
  const beaconMat = useMemo(() => makeGlowMaterial({ falloff: 2.2, maxPixels: 90, twinkle: 0.10 }), [])
  const farMat = useMemo(() => makeGlowMaterial({ falloff: 2.6, maxPixels: 40, twinkle: 0.0 }), [])

  const towers = useMemo(() => layoutTowers(), [])

  /** Red aircraft-warning beacons on the tall ones. */
  const beacons = useMemo(() => buildCloud(
    90, 7301, ['#FF4444', '#FF6644', '#FFAA88'],
    (rand, i) => {
      const t = towers[(i * 7 + 3) % towers.length]
      if (t.h < 240) return null
      return [t.x, t.h - 16, t.z, 9 + rand() * 6, 0.7 + rand() * 0.3]
    },
  ), [towers])

  /**
   * The rest of the city, out to the fog: window-lights on the ground beyond
   * the towers, thinning with distance and stopping short of the stadium
   * apron. Ten thousand points, one draw call, and the city suddenly has no
   * edge.
   */
  const far = useMemo(() => buildCloud(
    11000, 7302,
    ['#FFC978', '#FFE0A8', '#FF9A55', '#E8ECFF', '#FFD08A', '#B79CFF'],
    rand => {
      const z = CITY_Z_NEAR - 700 + rand() * (CITY_Z_FAR - CITY_Z_NEAR + 1600)
      const side = rand() < 0.5 ? -1 : 1
      const x = side * (900 + Math.pow(rand(), 0.65) * 2900)
      // Leave the stadium's ground clear.
      if (z > STADIUM_Z - 1500 && Math.abs(x) < 1400) return null
      const y = 6 + Math.pow(rand(), 2.2) * 210
      return [x, y, z, 5 + Math.pow(rand(), 2.0) * 16, 0.35 + rand() * 0.5]
    },
  ), [])

  useFrame(({ camera, size, gl }) => {
    const t = worldTime()
    const px = size.height * gl.getPixelRatio()
    updateGlow(beaconMat, camera, px, t)
    updateGlow(farMat, camera, px, t)
  })

  return (
    <group>
      <GlowPoints cloud={beacons} material={beaconMat} />
      <GlowPoints cloud={far} material={farMat} />
    </group>
  )
}

/* ══ Traffic ════════════════════════════════════════════════════════ */
/**
 * Head- and tail-lights sliding along the streets. Motion is a uniform-driven
 * modulo in the vertex shader — no per-frame JS, and identical in every
 * render tab, which is the only way a light stream survives a parallel
 * Remotion render without strobing.
 */
function makeTrafficMaterial(): THREE.ShaderMaterial {
  const m = makeGlowMaterial({ falloff: 2.0, maxPixels: 70, twinkle: 0.06 })
  m.uniforms.uSpan = { value: 2600 }
  m.uniforms.uZ0 = { value: CITY_Z_NEAR - 800 }
  m.vertexShader = /* glsl */ `
    attribute float aSize;
    attribute vec3 aColor;
    attribute float aAlpha;
    attribute float aPhase;
    uniform float uTime;
    uniform float uScale;
    uniform float uMaxPx;
    uniform float uSpan;
    uniform float uZ0;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      // aPhase carries the lane direction in its sign and the offset in its
      // magnitude; speed scales with lane so the two streams separate.
      float dir = aPhase < 0.0 ? -1.0 : 1.0;
      float off = abs(aPhase);
      float speed = 210.0 + off * 190.0;
      float travel = mod(off * uSpan + uTime * speed * dir, uSpan);
      vec3 p = position;
      p.z = uZ0 + travel;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      vColor = aColor;
      vAlpha = aAlpha;
      gl_PointSize = clamp(aSize * uScale / max(1.0, -mv.z), 0.0, uMaxPx);
      gl_Position = projectionMatrix * mv;
    }
  `
  return m
}

export function Traffic() {
  const mat = useMemo(() => makeTrafficMaterial(), [])
  const cloud = useMemo(() => buildCloud(
    900, 7401,
    ['#FFE7B0', '#FFF4DC', '#FF5544', '#FF3322', '#FFD08A'],
    rand => {
      // Lanes either side of the flight corridor, plus two cross-town roads.
      const lane = Math.floor(rand() * 6)
      const side = lane % 2 === 0 ? -1 : 1
      const x = side * (CORRIDOR_HALF + 30 + Math.floor(lane / 2) * 300 + rand() * 26)
      return [x, 2 + rand() * 3, 0, 3.4 + rand() * 3.0, 0.55 + rand() * 0.45]
    },
  ), [])

  // Encode direction in the phase attribute's sign.
  useMemo(() => {
    for (let i = 0; i < cloud.phases.length; i++) {
      const x = cloud.positions[i * 3]
      cloud.phases[i] = (x > 0 ? 1 : -1) * (0.02 + cloud.phases[i] * 0.96)
    }
  }, [cloud])

  useFrame(({ camera, size, gl }) => {
    updateGlow(mat, camera, size.height * gl.getPixelRatio(), worldTime())
  })

  return <GlowPoints cloud={cloud} material={mat} frustumCulled={false} />
}

/* ══ The "I need" sign ══════════════════════════════════════════════ */
const PIXEL_FONT: Record<string, number[][]> = {
  I: [[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[1,1,1,1,1]],
  n: [[1,0,0,0,1],[1,1,0,0,1],[1,0,1,0,1],[1,0,0,1,1],[1,0,0,0,1]],
  e: [[1,1,1,1,1],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,0],[1,1,1,1,1]],
  d: [[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0]],
  ' ': [[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]],
}
const WORD = ['I', ' ', 'n', 'e', 'e', 'd']

function wordPixels(cell: number): [number, number][] {
  const out: [number, number][] = []
  let cols = 0
  WORD.forEach((ch, i) => {
    cols += PIXEL_FONT[ch][0].length
    if (i < WORD.length - 1) cols += 1
  })
  const halfW = (cols * cell) / 2
  let colOff = 0
  for (const ch of WORD) {
    const grid = PIXEL_FONT[ch]
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c]) out.push([(colOff + c) * cell - halfW + cell / 2, (2 - r) * cell])
      }
    }
    colOff += grid[0].length + 1
  }
  return out
}

/**
 * The wordmark, tiled across a tower face on the left of the canyon and a
 * second, bigger one straight ahead. Both are one InstancedMesh with a
 * shared material whose opacity is the only thing that animates.
 */
/**
 * There are five "I need"s in the intro, at 7.47, 9.51, 11.50, 13.49 and
 * 15.48 — measured off the vocal rather than read off the LRC, which runs
 * about 0.4 s ahead of the singing. The first is the star punch: the camera
 * going out through the back of the sky IS that line. The other four light a
 * sign apiece, each hung across the canyon dead ahead at the height the
 * flight is holding, at a z the camera reaches about six hundred units later.
 *
 * The 11.50 one is the second half of the LRC's "I need, I need" and has no
 * timestamp of its own, so it had no sign — a full "I need" going by with
 * nothing on screen.
 */
/**
 * ONE COLOUR, FOUR LEVELS. The same warm white every time and brighter
 * every time, so the signs stop being decoration and become a level meter:
 * you do not register the colour changing, you register it getting louder.
 *
 * The step is doing real work in the composer as well as on the eye — the
 * bloom threshold is 0.48, so the first two sit under it and stay flat
 * pixels while the last two go over and bleed. That is the loudness.
 */
export const SIGNS: { t: number; z: number; y: number; cell: number; color: string }[] = [
  { t: T_SIGN_A, z: 3080, y: 196, cell: 13, color: '#7A5A2E' },
  { t: T_SIGN_B, z: 3520, y: 184, cell: 13, color: '#B98A44' },
  { t: T_SIGN_1, z: 3990, y: 176, cell: 14, color: '#FFD9A0' },
  { t: T_SIGN_2, z: 4450, y: 186, cell: 18, color: '#FFF6E4' },
]

/* ══ Where the words hang ═══════════════════════════════════════════
 * A cut owns its camera AND its four sign positions, and the second follows
 * from the first — so this is derived, not typed.
 *
 * Hung on the axis (which is what the alternate cut still does, see
 * `SIGN_X_B`) the nudges do nothing for the thing they are nudging at: all
 * four signs sit at x=0 and the aim deliberately lags the camera by about a
 * third of the lean, so whatever the camera does the word lands within two
 * per cent of frame centre EVERY time. Four identical centred cards; the lean
 * only reads as parallax on the towers behind them.
 *
 * So the word moves with the camera. Each sign is pushed off frame centre by
 * a fixed fraction of the frame's half-width AT ITS OWN DEPTH, signed by how
 * far the cut has leaned when it lights — which makes the four read
 * LEFT / RIGHT / LEFT / dead-centre, the lean's own alternating rhythm, and
 * lands the fourth (`T_SIGN_2`, the one the camera stops leaning on and
 * starts running from) back in the middle of frame where the stadium is
 * about to be.
 *
 * THE WORD GOES THE WAY THE CAMERA GOES. Push it the other way — off to
 * frame right when the camera has ducked left — and the shot reads as
 * DODGING the sign: the lean opens a gap and the word sits in it, so the
 * move looks like it is getting out of the way of the thing it is supposed
 * to be about. Leaning into the same side turns the same geometry into
 * going TOWARDS it. Sign convention: the camera looks down +z, so world +x
 * is screen LEFT and a camera at world −x wants its word at world +x.
 *
 * It lives here rather than in flight.ts because flight.ts is imported by
 * this file (and by everything else in the act) and must not import back.
 */

/** Fraction of the frame's HALF-width to push the word off centre. */
const PUSH = 0.22
/** The deepest lateral nudge in the film's cut — full push is measured
 *  against it. */
const LEAN_FULL = 52
/** 1920×1080, what every composition renders at (`src/remotion/Root.tsx`). */
const ASPECT = 16 / 9

/** Where a given cut of the act hangs the four words, one x per SIGN. */
export function signPlacement(pose: PoseFn): number[] {
  return SIGNS.map(sg => {
    const p = pose(sg.t)
    const dz = sg.z - p.pos[2]
    // Frame centre at the sign's depth.
    const aimX = p.pos[0] + (p.tgt[0] - p.pos[0]) * (dz / (p.tgt[2] - p.pos[2]))
    const halfW = dz * Math.tan((p.fov / 2) * Math.PI / 180) * ASPECT
    const lean = Math.max(-1, Math.min(1, p.pos[0] / LEAN_FULL))
    // MINUS: throw the word to the side the camera has leaned to, not away
    // from it. See the note above — the sign of this term is the whole idea.
    return aimX - halfW * PUSH * lean
  })
}

/** The film's own, off the take in `flight.ts`. Re-keying the nudges there
 *  moves the words with them. */
export const SIGN_X: number[] = signPlacement(flightPose)

/**
 * `x` is where the cut being flown hangs each sign across the canyon, one
 * entry per SIGN. Defaults to the film's — a variant that flies a different
 * camera hands its own in, or its words sit somewhere its camera is not.
 */
export function INeedSigns({ x = SIGN_X }: { x?: number[] } = {}) {
  const mats = useMemo(() => SIGNS.map(sg => new THREE.MeshBasicMaterial({
    color: sg.color, toneMapped: false, transparent: true, opacity: 0, fog: false,
  })), [])
  const pix = useMemo(() => SIGNS.map(sg => wordPixels(sg.cell)), [])

  useFrame(() => {
    const t = worldTime()
    SIGNS.forEach((sg, i) => {
      const dt = t - sg.t
      const hold = 1.05, fade = 0.5
      const a = dt < 0 || dt > hold + fade
        ? 0
        : dt < hold ? 1 : 1 - (dt - hold) / fade
      mats[i].opacity = 0.95 * clamp01(a)
    })
  })

  return (
    <group>
      {SIGNS.map((sg, i) => (
        <group key={i} position={[x?.[i] ?? 0, sg.y, sg.z]} rotation={[0, Math.PI, 0]}>
          {pix[i].map((p, j) => (
            <mesh key={j} position={[p[0], p[1], 0]} material={mats[i]}>
              <planeGeometry args={[sg.cell * 0.78, sg.cell * 0.78]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

/* ══ Crossings ══════════════════════════════════════════════════════ */
/**
 * Two elevated roadways spanning the canyon, low enough that the camera
 * passes just over the first and just under the second. Cheap, and they do
 * more for the sense of speed than any amount of extra skyline.
 */
export function Crossings() {
  const deck = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#12142A', roughness: 0.8, metalness: 0.3,
  }), [])
  const lamp = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#FFC978', toneMapped: false, fog: false,
  }), [])

  const spans: { y: number; z: number; w: number }[] = [
    { y: 96, z: 2620, w: 900 },
    { y: 214, z: 3480, w: 1100 },
    { y: 120, z: 4080, w: 980 },
  ]

  return (
    <group>
      {spans.map((s, i) => (
        <group key={i} position={[0, s.y, s.z]}>
          <mesh material={deck}>
            <boxGeometry args={[s.w, 9, 34]} />
          </mesh>
          {/* Lamp line down the middle of the deck */}
          {Array.from({ length: 14 }, (_, j) => (
            <mesh key={j} material={lamp}
              position={[(j - 6.5) * (s.w / 14), 7.5, 0]}>
              <boxGeometry args={[8, 1.6, 3]} />
            </mesh>
          ))}
          {/* Piers */}
          {[-1, 1].map(sd => (
            <mesh key={sd} material={deck} position={[sd * s.w * 0.34, -s.y / 2 + 4, 0]}>
              <boxGeometry args={[24, s.y, 24]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}
