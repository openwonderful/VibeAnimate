/**
 * Act B — additive glow points.
 *
 * Every population of lights in the act is one draw call: the stars, the
 * city windows seen from a distance, the ARMY bombs, the crowd. A point
 * cloud with per-point size / colour / alpha / twinkle-phase, sized in WORLD
 * units (uScale is recomputed each frame from the viewport and the current
 * fov) so a lantern is the same physical size whether the camera is 20 units
 * off it or 2000, and so nothing changes size when the focal length breathes.
 */
import * as THREE from 'three'
import { seededRandom } from '../../utils/svgHelpers'

export type PointCloud = {
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  alphas: Float32Array
  phases: Float32Array
}

export function makeGlowMaterial(opts: {
  depthWrite?: boolean
  falloff?: number
  maxPixels?: number
  twinkle?: number
} = {}): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uScale: { value: 700 },
      uGlobal: { value: 1 },
      uPulse: { value: 0 },
      uFalloff: { value: opts.falloff ?? 2.6 },
      uMaxPx: { value: opts.maxPixels ?? 190 },
      uTwinkle: { value: opts.twinkle ?? 0.2 },
    },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute vec3 aColor;
      attribute float aAlpha;
      attribute float aPhase;
      uniform float uTime;
      uniform float uScale;
      uniform float uPulse;
      uniform float uMaxPx;
      uniform float uTwinkle;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float tw = 1.0 - uTwinkle + uTwinkle * sin(uTime * (0.6 + fract(aPhase * 0.618) * 2.6) + aPhase * 6.283);
        // The whole population leans into the beat together, but each point
        // takes it slightly differently — a stadium of hands is never in
        // perfect sync and it looks wrong when it is.
        float hit = uPulse * (0.65 + 0.35 * sin(aPhase * 12.9898));
        vColor = aColor;
        vAlpha = aAlpha * tw * (1.0 + hit * 0.9);
        gl_PointSize = clamp(aSize * (1.0 + hit * 0.35) * uScale / max(1.0, -mv.z), 0.0, uMaxPx);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vAlpha;
      uniform float uGlobal;
      uniform float uFalloff;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv) * 2.0;
        float a = pow(max(0.0, 1.0 - d), uFalloff) * vAlpha * uGlobal;
        if (a < 0.002) discard;
        gl_FragColor = vec4(vColor * a, a);
      }
    `,
    transparent: true,
    depthWrite: opts.depthWrite ?? false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  })
}

/** Per-frame housekeeping: world-space sizing + the twinkle clock. */
export function updateGlow(
  mat: THREE.ShaderMaterial,
  camera: THREE.Camera,
  viewportHeightPx: number,
  time: number,
) {
  const cam = camera as THREE.PerspectiveCamera
  const fovRad = ((cam.fov ?? 60) * Math.PI) / 180
  mat.uniforms.uScale.value = viewportHeightPx / (2 * Math.tan(fovRad / 2))
  mat.uniforms.uTime.value = time
}

/**
 * Build a cloud. `place` returns [x, y, z, size, alpha] or null to reject the
 * sample (used to keep lights out of the flight corridor, off the pitch, and
 * so on); rejected samples are retried, so a placement function can be as
 * fussy as it needs to be.
 */
export function buildCloud(
  count: number,
  seed: number,
  colors: string[],
  place: (rand: () => number, i: number) => [number, number, number, number, number] | null,
): PointCloud {
  const rand = seededRandom(seed)
  const positions = new Float32Array(count * 3)
  const cols = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const alphas = new Float32Array(count)
  const phases = new Float32Array(count)
  const c = new THREE.Color()
  let n = 0
  let guard = 0
  while (n < count && guard++ < count * 40) {
    const p = place(rand, n)
    if (!p) continue
    positions[n * 3] = p[0]
    positions[n * 3 + 1] = p[1]
    positions[n * 3 + 2] = p[2]
    c.set(colors[Math.floor(rand() * colors.length)])
    cols[n * 3] = c.r
    cols[n * 3 + 1] = c.g
    cols[n * 3 + 2] = c.b
    sizes[n] = p[3]
    alphas[n] = p[4]
    phases[n] = rand()
    n++
  }
  return { positions, colors: cols, sizes, alphas, phases }
}
