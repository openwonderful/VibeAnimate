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
import { beatPulse, BEAT_HITS, GOLD, GOLD_AMBER, GOLD_BRIGHT, GOLD_WARM, T_DROP } from './constants'
import { seededRandom } from './world'
import { setGlowGlobal } from './glow'

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
        gl_PointSize = clamp(aSize * (0.7 + 0.3 * ramp + flash) * uScale / -mv.z, 0.0, 220.0);
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

/** Mountain silhouette height — mirrors Terrain's near-ridge peak set. */
function ridgeY(x: number): number {
  const peaks = [
    { x: -42, h: 13, w: 18 }, { x: -14, h: 17, w: 14 }, { x: 10, h: 19, w: 16 },
    { x: 34, h: 15, w: 12 }, { x: 58, h: 11, w: 15 },
  ]
  let h = 0
  for (const p of peaks) {
    const d = (x - p.x) / p.w
    h += p.h * Math.exp(-d * d * 2)
  }
  return h + Math.sin(x * 0.5) * 0.3
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
      const r = 68 + Math.pow(rand(), 0.75) * 92    // 68..160 from field center
      const a = rand() * Math.PI * 2
      const x = Math.cos(a) * r
      const z = -24 + Math.sin(a) * r * 0.82
      if (Math.abs(x) < 50 && z > -66 && z < 4) return null   // figure field + margin
      if (z < -66) return null                                 // don't float over the mountains
      // The far wilderness lights on the back half of the drum run.
      const raw = 10.2 + 6.6 * Math.pow((r - 66) / 94, 1.2)
      return [x, 0.12 + rand() * 0.5, z, raw]
    },
    31415, [0.3, 0.72], [0.26, 0.6],
  ), [])

  /* The mountains: orb-lights up the far slopes — they catch light LAST,
   * and burn big and bright enough to read across the whole valley. */
  const mountains = useMemo(() => buildCloud(
    950,
    rand => {
      const x = (rand() - 0.5) * 180
      const h = ridgeY(x)
      if (h < 2.5) return null
      const y = -0.5 + h * (0.15 + rand() * 0.78)
      const z = -69 - rand() * 10
      return [x, y, z, 13.9 + rand() * 2.6]
    },
    27182, [0.75, 1.6], [0.5, 0.95],
  ), [])

  useFrame(({ camera, size, gl }) => {
    const t = getAnimTime()
    const cam = camera as THREE.PerspectiveCamera
    const fovRad = (cam.fov * Math.PI) / 180
    const uScale = (size.height * gl.getPixelRatio()) / (2 * Math.tan(fovRad / 2))

    // The far world dims a shade once the ascent owns the scene.
    const dim = 1 - 0.45 * smooth01((t - (T_DROP + 1)) / 8)
    // Mountain lights fade with the mountain silhouettes at altitude.
    const mountainFade = 1 - smooth01((camera.position.y - 8) / 20) * 0.97

    for (const m of [plainsMat, mountainMat]) {
      m.uniforms.uTime.value = t
      m.uniforms.uScale.value = uScale
    }
    // The far lights breathe with the drums too.
    const pulse = 1 + 0.35 * beatPulse(t)
    setGlowGlobal(plainsMat, dim * pulse)
    setGlowGlobal(mountainMat, dim * mountainFade * pulse)
  })

  return (
    <group>
      <CloudPoints cloud={plains} material={plainsMat} />
      <CloudPoints cloud={mountains} material={mountainMat} />
    </group>
  )
}
