/**
 * SeededSparkles — a deterministic drop-in for drei's <Sparkles>.
 *
 * WHY THIS EXISTS
 * drei's Sparkles builds its position and size buffers from bare
 * `Math.random()` at mount. That is fine live, but a Remotion render runs
 * several browser tabs in parallel and hands each of them an arbitrary slice
 * of the frame range, so every tab mounts the scene with a *different*
 * random layout. Consecutive frames of the finished video then come from
 * different tabs, and the fireflies jump to completely new positions every
 * frame — "glittering lights flickering like crazy".
 *
 * Everything here is derived from an integer seed instead, so all tabs agree,
 * and all motion is a pure function of the anim clock so it scrubs and
 * freezes with `?t=` like the rest of the project.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getAnimTime } from '../../hooks/useAnimTime'

const VERT = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  uniform float uTime;
  uniform float uSpeed;
  uniform float uPixelRatio;
  varying float vTwinkle;

  void main() {
    // Slow wander — each mote on its own phase, so the swarm never pulses
    // as one. Amplitudes are small: fireflies drift, they do not orbit.
    vec3 p = position;
    p.x += sin(uTime * uSpeed * 0.7 + aPhase * 1.7) * 0.30;
    p.y += sin(uTime * uSpeed + aPhase) * 0.22;
    p.z += cos(uTime * uSpeed * 0.5 + aPhase * 2.3) * 0.30;

    vTwinkle = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * uSpeed * 2.4 + aPhase * 3.1));

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    // Clamped: point size goes as 1/distance, so a mote that drifts close to
    // the lens would otherwise blow up into a screen-filling blob. One did,
    // in Act 3.2 — a white teardrop sitting in the paddy.
    gl_PointSize = clamp(aSize * uPixelRatio * (24.0 / max(0.001, -mv.z)), 0.0, 34.0);
    gl_Position = projectionMatrix * mv;
  }
`

const FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vTwinkle;

  void main() {
    // Soft round mote: bright core, gaussian-ish falloff to nothing.
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float a = pow(1.0 - d * 2.0, 1.6);
    gl_FragColor = vec4(uColor, a * vTwinkle * uOpacity);
  }
`

/** Deterministic 0..1 stream — same generator the SVG helpers use. */
function makeRand(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

export interface SeededSparklesProps {
  count?: number
  /** Box the motes fill, in world units — [x, y, z] or a single number. */
  scale?: number | [number, number, number]
  /** Point size in pixels at 1 unit from the camera. */
  size?: number
  speed?: number
  color?: string
  opacity?: number
  position?: [number, number, number]
  /** Change this to get a different (but still reproducible) layout. */
  seed?: number
  /** Added to the anim clock. Act B's sub-scenes are WINDOWS into one long
   *  take, so their local t=0 is 48 s into the world; without this the same
   *  frame rendered as part of B and as part of B.7 has the motes and the
   *  ripples in different places, and a segmented render seams. */
  timeOffset?: number
}

export function SeededSparkles({
  count = 50,
  scale = 1,
  size = 4,
  speed = 0.3,
  color = '#FFD866',
  opacity = 0.6,
  position = [0, 0, 0],
  seed = 1,
  timeOffset = 0,
}: SeededSparklesProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null)

  // `scale` is normally passed as an array literal, so it has a fresh identity
  // on every render — key the memo on its contents, not its reference.
  const scaleKey = Array.isArray(scale) ? scale.join(',') : String(scale)

  const { positions, sizes, phases } = useMemo(() => {
    const [sx, sy, sz] = Array.isArray(scale) ? scale : [scale, scale, scale]
    const rand = makeRand(seed * 7919 + count)
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const phases = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rand() - 0.5) * sx
      positions[i * 3 + 1] = (rand() - 0.5) * sy
      positions[i * 3 + 2] = (rand() - 0.5) * sz
      sizes[i] = size * (0.45 + rand() * 0.85)
      phases[i] = rand() * Math.PI * 2
    }
    return { positions, sizes, phases }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, scaleKey, size, seed])

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uSpeed: { value: speed },
    uColor: { value: new THREE.Color(color) },
    uOpacity: { value: opacity },
    uPixelRatio: { value: 1 },
  }), [speed, color, opacity])

  useFrame(({ gl }) => {
    if (!matRef.current) return
    matRef.current.uniforms.uTime.value = getAnimTime() + timeOffset
    matRef.current.uniforms.uPixelRatio.value = gl.getPixelRatio()
  })

  return (
    <points position={position} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-aPhase" args={[phases, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={VERT}
        fragmentShader={FRAG}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

export default SeededSparkles
