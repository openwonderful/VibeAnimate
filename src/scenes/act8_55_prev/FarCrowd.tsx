/**
 * Act 8.53 — the far crowd: people to the horizon.
 *
 * Thousands of lantern-lights filling the plains beyond the main field, and
 * orb-lights scattered up the mountain slopes — no 3D figures, just glow
 * sprites (two draw calls total). They ignite on the same measured drum
 * hits as the main crowd, ring after ring outward, so by the last kick of
 * the intro the WHOLE screen is alight — valley, wilderness, mountains.
 *
 * Ignition is evaluated in the shader (per-point aIgnite attribute vs the
 * uTime uniform), so 9k lights cost zero per-frame JS.
 */
import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getAnimTime } from '../../hooks/useAnimTime'
import {
  beatPulse, BEAT_HITS, GOLD, GOLD_AMBER, GOLD_BRIGHT, GOLD_WARM, igniteRaw,
  phraseEnv, T_DROP, TOUCH_POS,
} from './constants'
import { seededRandom } from './world'
import { setGlowGlobal } from './glow'
import { sampleRidgeFaces } from '../actB/mountains'
import { ORIGIN_X, ORIGIN_Z, ROAD_Y, S } from './locale'

function smooth01(x: number): number {
  const c = Math.min(1, Math.max(0, x))
  return c * c * (3 - 2 * c)
}

function snapToBeat(raw: number): number {
  for (const h of BEAT_HITS) if (h >= raw) return h
  return BEAT_HITS[BEAT_HITS.length - 1] + 0.3
}

/** Glow-sprite material whose points self-ignite at aIgnite (scene seconds). */
function makeIgniteMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uScale: { value: 700 },
      uGlobal: { value: 1 },
    },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute vec3 aColor;
      attribute float aAlpha;
      attribute float aPhase;
      attribute float aIgnite;
      uniform float uTime;
      uniform float uScale;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float since = uTime - aIgnite;
        float ramp = smoothstep(0.0, 1.6, since);
        float flash = since > 0.0 ? exp(-since * 2.4) * 0.7 : 0.0;
        float tw = 0.8 + 0.2 * sin(uTime * (0.5 + fract(aPhase * 0.618) * 2.4) + aPhase);
        vColor = aColor;
        vAlpha = aAlpha * tw * ramp + flash * min(1.0, aAlpha * 2.5);
        // aSize is in the units these were authored in, so it scales with the
        // model matrix — this act is mounted inside Act B's valley in a group at
        // 20× (see locale.tsx), and without this every far light is 20× further
        // away at the same pixel size, i.e. gone. (The rest of this file is
        // act8_55_old verbatim; this line is the one valley adaptation.)
        float mscale = length(modelMatrix[0].xyz);
        gl_PointSize = clamp(aSize * mscale * (0.7 + 0.3 * ramp + flash) * uScale / -mv.z, 0.0, 220.0);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vAlpha;
      uniform float uGlobal;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv) * 2.0;
        float a = pow(max(0.0, 1.0 - d), 2.6) * vAlpha * uGlobal;
        gl_FragColor = vec4(vColor * a, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  })
}

const FAR_COLORS = [GOLD_BRIGHT, GOLD, GOLD_AMBER, GOLD_WARM, GOLD, GOLD_AMBER]

type Cloud = {
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  alphas: Float32Array
  phases: Float32Array
  ignites: Float32Array
}

function buildCloud(
  count: number,
  place: (rand: () => number) => [number, number, number, number] | null, // x,y,z, igniteRaw
  seed: number,
  sizeRange: [number, number],
  alphaRange: [number, number],
): Cloud {
  const rand = seededRandom(seed)
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const alphas = new Float32Array(count)
  const phases = new Float32Array(count)
  const ignites = new Float32Array(count)
  const c = new THREE.Color()
  let n = 0
  let guard = 0
  while (n < count && guard++ < count * 30) {
    const p = place(rand)
    if (!p) continue
    positions[n * 3] = p[0]; positions[n * 3 + 1] = p[1]; positions[n * 3 + 2] = p[2]
    c.set(FAR_COLORS[Math.floor(rand() * FAR_COLORS.length)])
    colors[n * 3] = c.r; colors[n * 3 + 1] = c.g; colors[n * 3 + 2] = c.b
    sizes[n] = sizeRange[0] + rand() * (sizeRange[1] - sizeRange[0])
    alphas[n] = alphaRange[0] + rand() * (alphaRange[1] - alphaRange[0])
    phases[n] = rand() * Math.PI * 2
    ignites[n] = snapToBeat(p[3]) + rand() * 0.14
    n++
  }
  return { positions, colors, sizes, alphas, phases, ignites }
}

/**
 * The mountain lights, on the REAL mountains.
 *
 * The old cloud stood its orbs on `ridgeY` — a silhouette mirroring this act's
 * own retired Terrain — at village z −69..−79. Act B's actual ridge bands
 * (which are what the shot photographs since the move into its valley) run
 * their front crests nearer and taller, so every one of those 950 points sat
 * INSIDE or BEHIND a hill and depth-tested away: the range read as dead teal.
 * These are sampled from the band geometry itself (`sampleRidgeFaces`, exact
 * same seeded domes the meshes are built from), nudged 8 units toward the
 * valley so the sprite centres clear their own slope.
 *
 * Ignition rides the same ring as everyone else — distance from the two
 * hands, through `igniteRaw`, snapped to the drums — PLUS a climb term:
 * the ring's arrival lights a hill's SKIRT, and the light then walks UP the
 * dome, bottom half on one hit, top half on the next (director's note: "I
 * want the expanding out to include the mountains… the bottom half, then the
 * top half"). The horizontal distance is clamped at 72 so the farthest
 * skirts still land by the 16.08 hit and the summits' +1.3s climb snaps to
 * 16.82 — the last big beat before line 3, where the whole world must
 * already burn. Without the clamp-and-climb every point past d≈70 fell on
 * the same two hits at random and the range lit "all at once".
 */
function buildMountainCloud(count: number): Cloud {
  const pts = sampleRidgeFaces(count)
  const rand = seededRandom(27182)
  const positions = new Float32Array(pts.length * 3)
  const colors = new Float32Array(pts.length * 3)
  const sizes = new Float32Array(pts.length)
  const alphas = new Float32Array(pts.length)
  const phases = new Float32Array(pts.length)
  const ignites = new Float32Array(pts.length)
  const c = new THREE.Color()
  for (let i = 0; i < pts.length; i++) {
    // Act B world → village (inverse of locale's toWorld), with the nudge.
    const x = (ORIGIN_X - pts[i].x) / S
    const y = (pts[i].y + 3 - ROAD_Y) / S
    const z = (ORIGIN_Z - (pts[i].z - 8)) / S
    positions[i * 3] = x; positions[i * 3 + 1] = y; positions[i * 3 + 2] = z
    c.set(FAR_COLORS[Math.floor(rand() * FAR_COLORS.length)])
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b
    sizes[i] = 0.7 + rand() * 0.8
    alphas[i] = 0.5 + rand() * 0.45
    phases[i] = rand() * Math.PI * 2
    const d = Math.hypot(x - TOUCH_POS[0], z - TOUCH_POS[2])
    const ring = igniteRaw(Math.min(d, 72))     // the ring reaches the skirt…
    const climb = 1.3 * pts[i].alt              // …then walks up the slope
    ignites[i] = snapToBeat(ring + climb) + rand() * 0.14
  }
  return { positions, colors, sizes, alphas, phases, ignites }
}

function CloudPoints({ cloud, material }: { cloud: Cloud; material: THREE.ShaderMaterial }) {
  return (
    <points material={material} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[cloud.positions, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[cloud.colors, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[cloud.sizes, 1]} />
        <bufferAttribute attach="attributes-aAlpha" args={[cloud.alphas, 1]} />
        <bufferAttribute attach="attributes-aPhase" args={[cloud.phases, 1]} />
        <bufferAttribute attach="attributes-aIgnite" args={[cloud.ignites, 1]} />
      </bufferGeometry>
    </points>
  )
}

export function FarCrowd() {
  const plainsMat = useMemo(() => makeIgniteMaterial(), [])
  const mountainMat = useMemo(() => makeIgniteMaterial(), [])

  /* The plains: thousands of lights — kept WELL beyond the 3D-figure field
   * (orbs beside real silhouettes read as orbs; far away they read as
   * people with lanterns). A dark gap separates the two populations. */
  const plains = useMemo(() => buildCloud(
    8200,
    rand => {
      const r = 78 + Math.pow(rand(), 0.75) * 84    // 78..162 — clear of the 8.55 wings
      const a = rand() * Math.PI * 2
      const x = Math.cos(a) * r
      const z = -24 + Math.sin(a) * r * 0.82
      if (Math.abs(x) < 76 && z > -66 && z < 4) return null   // figure field + wings + margin
      if (z < -66) return null                                 // don't float over the mountains
      // The far wilderness lights on the back half of the drum run.
      const raw = 10.2 + 6.6 * Math.pow((r - 76) / 86, 1.2)
      return [x, 0.12 + rand() * 0.5, z, raw]
    },
    31415, [0.3, 0.72], [0.26, 0.6],
  ), [])

  /* The mountains: lantern-lights up Act B's actual slopes — the ring's last,
   * biggest increments. See buildMountainCloud. */
  const mountains = useMemo(() => buildMountainCloud(1250), [])

  useFrame(({ camera, size, gl }) => {
    const t = getAnimTime()
    const cam = camera as THREE.PerspectiveCamera
    const fovRad = (cam.fov * Math.PI) / 180
    const uScale = (size.height * gl.getPixelRatio()) / (2 * Math.tan(fovRad / 2))

    // The far world dims a shade once the ascent owns the scene.
    const dim = 1 - 0.45 * smooth01((t - (T_DROP + 1)) / 8)
    // (The old altitude fade on the mountain lights is gone with the old
    // terrain it protected: `camera.position.y` is Act B WORLD y now — 340+
    // at the oblique — so it held the slopes at 3% for the whole shot. The
    // lights stand on real geometry and can just be occluded by it.)

    for (const m of [plainsMat, mountainMat]) {
      m.uniforms.uTime.value = t
      m.uniforms.uScale.value = uScale
    }
    // The far lights breathe with the drums too — with the same
    // phrase-attack compensation as the main field, so the window's first
    // two beats flash out here as hard as the later ones.
    const pulse = 1 + (0.35 + 0.6 * (1 - phraseEnv(t))) * beatPulse(t)
    setGlowGlobal(plainsMat, dim * pulse)
    setGlowGlobal(mountainMat, dim * pulse)
  })

  return (
    <group>
      <CloudPoints cloud={plains} material={plainsMat} />
      <CloudPoints cloud={mountains} material={mountainMat} />
    </group>
  )
}
