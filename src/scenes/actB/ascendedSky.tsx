/**
 * Act B — what the sky has become.
 *
 * The pair stop under a tree at 1:12, and when they look up the sky is the
 * one Act 8.55 ends on: forty thousand souls arrived as stars, the Korean
 * constellations locked in and lined, the Cheonsang Yeolcha Bunyajido
 * graticule, the Ojakgyo bridge between Jiknyeo and Gyeonwoo, and Alcor
 * beside the Seven.
 *
 * ── This is 8.55's actual data, not a lookalike ──────────────────────
 * `generateWorld()` is imported and every point is drawn at the `target`,
 * `targetSize` and `targetColor` that scene assigns it; the lines come from
 * `world.constellations`; the graticule and the bridge come from the same
 * `sky.ts` helpers 8.55 uses. So the arrangement is identical by
 * construction rather than by eye.
 *
 * What is NOT reused is the components. 8.55's `Constellations` is a
 * function of 8.55's clock — the souls leave the ground on a per-figure
 * schedule and the lines draw themselves over T_LINES — so mounting it here
 * would run a second timeline under this one, and Act B's window scenes
 * (B.8 starts 72 s into the song) would render it mid-animation. Everything
 * here is the SETTLED state, drawn statically, which is what the end of 8.55
 * is showing anyway.
 *
 * Scaled by K and anchored on the camera. Because Act B's glow shader sizes
 * points in world units (`gl_PointSize = aSize * uScale / dist`), scaling
 * positions and sizes by the same K leaves every star exactly the angular
 * size it has in 8.55.
 */
import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { worldTime } from './time'
import { T_TREE, PAIR_GAZE, ramp } from './flight'
import { makeGlowMaterial, updateGlow, type PointCloud } from './points'
import { GlowPoints } from './GlowPoints'
import { generateWorld } from '../act8_55/world'
import { ojakgyoPoints, alcorPos, type Vec3 } from '../act8_55/sky'
import { SKY_CENTER, LINE_COLOR, STAR_WHITE } from '../act8_55/constants'

/** Act B units per Act 8.55 unit. 8.55's dome is 66 across; this puts it at
 *  ~3,000, well outside anything in the valley. */
const K = 45

/**
 * 8.55 position → Act B position, with the dome centre at the origin of the
 * (camera-anchored) group.
 *
 * ── Which way round the sky hangs ────────────────────────────────────
 * A dome anchored on the camera has no position, only a bearing, so its
 * azimuth in this act is a free parameter — and there is exactly one thing
 * that should be spending it. The dense part of this sky is the 은하수
 * river; the shot ends looking along `PAIR_GAZE`; and those two have to be
 * the same bearing or the pair spend the last four seconds of Act 3 staring
 * at the empty half of the sky. They did — the river's centroid ran 176°
 * away from the way the two of them are facing, and the camera had to be
 * pointed somewhere other than at their look to find it.
 *
 * So the yaw is MEASURED off the star field and solved against the gaze,
 * rather than being a half-turn undone by hand. It lands within four degrees
 * of 8.55's own azimuths — of not undoing `SKY_YAW_DEG` at all — which is a
 * coincidence, but a useful one: the sky the tree shot ends on and the sky
 * the film ends on are hung the same way round, so the two look-ups rhyme
 * rather than merely resembling each other.
 *
 * Check it with `npm run eval -- --act 3.2 --t 8 "window.__skyAim"`: that is
 * the centroid AFTER this rotation, and it should sit on PAIR_GAZE's bearing.
 */
function skyYaw(figures: { target: Vec3 }[]): number {
  let x = 0
  let z = 0
  for (const f of figures) {
    x += f.target[0] - SKY_CENTER[0]
    z += f.target[2] - SKY_CENTER[2]
  }
  return Math.atan2(PAIR_GAZE[0], PAIR_GAZE[2]) - Math.atan2(x, z)
}

function toB(p: Vec3, cos: number, sin: number): [number, number, number] {
  const x = (p[0] - SKY_CENTER[0]) * K
  const y = (p[1] - SKY_CENTER[1]) * K
  const z = (p[2] - SKY_CENTER[2]) * K
  return [x * cos + z * sin, y, -x * sin + z * cos]
}

function cloudFrom(
  items: { p: Vec3; size: number; color: string }[],
  cos: number, sin: number,
): PointCloud {
  const n = items.length
  const positions = new Float32Array(n * 3)
  const colors = new Float32Array(n * 3)
  const sizes = new Float32Array(n)
  const alphas = new Float32Array(n)
  const phases = new Float32Array(n)
  const c = new THREE.Color()
  items.forEach((it, i) => {
    const [x, y, z] = toB(it.p, cos, sin)
    positions[i * 3] = x; positions[i * 3 + 1] = y; positions[i * 3 + 2] = z
    c.set(it.color)
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b
    sizes[i] = it.size * K
    alphas[i] = 1
    // Deterministic twinkle phase — no Math.random anywhere in a render.
    phases[i] = ((i * 2654435761) % 1000) / 1000
  })
  return { positions, colors, sizes, alphas, phases }
}

export function AscendedSky() {
  const group = useRef<THREE.Group>(null)
  const { camera } = useThree()
  const world = useMemo(() => generateWorld(), [])
  /** Solved once, off the souls themselves — see `skyYaw`. */
  const [COS_YAW, SIN_YAW] = useMemo(() => {
    const y = skyYaw(world.figures)
    return [Math.cos(y), Math.sin(y)]
  }, [world])

  const starMat = useMemo(() => makeGlowMaterial({ falloff: 2.4, maxPixels: 120, twinkle: 0.18 }), [])
  /** 8.55 draws every soul TWICE — a core and a wider soft halo (Crowd.tsx
   *  carries a second `glowSizes` buffer) — and that second pass is most of
   *  why its river reads as a bright band rather than as a scatter of dots.
   *  Reproducing the core alone left this at a fifth of the brightness. */
  const haloMat = useMemo(() => makeGlowMaterial({ falloff: 3.2, maxPixels: 200, twinkle: 0.10 }), [])
  const bridgeMat = useMemo(() => makeGlowMaterial({ falloff: 2.6, maxPixels: 26, twinkle: 0.42 }), [])

  /** Every soul at the star it became. */
  const stars = useMemo(() => cloudFrom(
    world.figures.map(f => ({ p: f.target, size: f.targetSize, color: f.targetColor })),
    COS_YAW, SIN_YAW,
  ), [world, COS_YAW, SIN_YAW])

  /**
   * Where to point the camera. The dense part of this sky is the 은하수
   * river, and it is nowhere near the pole the graticule is drawn around —
   * aiming at the graticule (the obvious landmark) frames a lot of empty
   * sky. Published so the flight's tilt target can be read off it rather
   * than guessed: `npm run eval -- --act B --t 82 "window.__skyAim"`.
   */
  useMemo(() => {
    let x = 0, y = 0, z = 0
    for (let i = 0; i < stars.positions.length; i += 3) {
      x += stars.positions[i]; y += stars.positions[i + 1]; z += stars.positions[i + 2]
    }
    const l = Math.hypot(x, y, z) || 1
    ;(window as unknown as { __skyAim: number[] }).__skyAim =
      [+(x / l).toFixed(4), +(y / l).toFixed(4), +(z / l).toFixed(4)]
  }, [stars])

  const halos = useMemo(() => {
    const c: PointCloud = {
      positions: stars.positions,
      colors: stars.colors,
      sizes: stars.sizes.map(v => v * 4.2),
      alphas: stars.alphas.map(() => 0.42),
      phases: stars.phases,
    }
    return c
  }, [stars])

  /** The magpie bridge, and Alcor. */
  const bridge = useMemo(() => cloudFrom([
    ...ojakgyoPoints(110).map(p => ({ p, size: 0.10, color: STAR_WHITE })),
    { p: alcorPos(), size: 0.16, color: STAR_WHITE },
  ], COS_YAW, SIN_YAW), [COS_YAW, SIN_YAW])

  /** Constellation lines, fully drawn. */
  const lines = useMemo(() => {
    const pts: number[] = []
    for (const con of world.constellations) {
      for (const [ai, bi] of con.lines) {
        const a = toB(con.stars[ai], COS_YAW, SIN_YAW)
        const b = toB(con.stars[bi], COS_YAW, SIN_YAW)
        pts.push(a[0], a[1], a[2], b[0], b[1], b[2])
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [world, COS_YAW, SIN_YAW])

  /*
   * NO GRATICULE, NO POLARIS CROSS. 8.55 draws the Cheonsang Yeolcha
   * Bunyajido's concentric rings, its 28 lunar-mansion ticks and a cross on
   * the pole, and in that scene they are ceremony — the sky becoming a
   * chart. Framed as a look-up from under a tree they are three rings and a
   * crosshair sitting over the stars: a rifle scope. Cut.
   */

  const lineMat = useMemo(() => new THREE.LineBasicMaterial({
    color: LINE_COLOR, transparent: true, opacity: 0, depthWrite: false,
    blending: THREE.AdditiveBlending, fog: false,
  }), [])
  useFrame(({ size, gl }) => {
    const t = worldTime()
    if (group.current) group.current.position.copy(camera.position)
    const h = size.height * gl.getPixelRatio()
    updateGlow(starMat, camera, h, t)
    updateGlow(haloMat, camera, h, t)
    updateGlow(bridgeMat, camera, h, t)
    // It arrives as they look up rather than being there the whole time —
    // the first seconds of the scene are two people under a tree.
    // Full from the first frame: the scene opens ON the sky, so there is
    // nothing to reveal it to.
    const up = ramp(t, T_TREE - 0.4, T_TREE + 0.6)
    // Act B grades darker than 8.55 does — exposure 1.04 against 1.25, and a
    // bloom threshold of 0.48 against 0.30, so the same stars neither expose
    // nor bleed the same. The gain buys both back.
    starMat.uniforms.uGlobal.value = (0.34 + 0.66 * up) * 2.6
    haloMat.uniforms.uGlobal.value = (0.34 + 0.66 * up) * 1.9
    bridgeMat.uniforms.uGlobal.value = 0.20 + 0.80 * up
    lineMat.opacity = 0.34 * up
  })

  return (
    <group ref={group} renderOrder={-60} frustumCulled={false}>
      <GlowPoints cloud={halos} material={haloMat} frustumCulled={false} />
      <GlowPoints cloud={stars} material={starMat} frustumCulled={false} />
      <GlowPoints cloud={bridge} material={bridgeMat} frustumCulled={false} />
      <lineSegments geometry={lines} material={lineMat} frustumCulled={false} />
    </group>
  )
}
