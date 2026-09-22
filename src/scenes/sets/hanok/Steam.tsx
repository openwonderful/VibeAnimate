/**
 * Deterministic steam. Rising motion is a pure function of the anim clock so
 * it scrubs, freezes and renders identically across Remotion's parallel tabs
 * — a mutating particle buffer would give every render tab a different swarm.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getAnimTime } from '../../../hooks/useAnimTime'
import { type V3, rand } from './palette'

const STEAM_VERT = /* glsl */ `
  attribute float aPhase;
  attribute float aSize;
  attribute float aSpeed;
  uniform float uTime;
  uniform float uRise;
  uniform float uPixelRatio;
  varying float vAlpha;

  void main() {
    float age = fract(uTime * aSpeed * 0.16 + aPhase);
    vec3 p = position;
    p.y += age * uRise;
    // Widens and drifts as it cools.
    p.x += sin(age * 6.0 + aPhase * 21.0) * 0.09 * age + age * age * 0.05;
    p.z += cos(age * 4.5 + aPhase * 13.0) * 0.07 * age;
    vAlpha = smoothstep(0.0, 0.10, age) * (1.0 - smoothstep(0.30, 1.0, age));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = aSize * uPixelRatio * (1.0 + age * 2.6) * (16.0 / max(0.001, -mv.z));
    gl_Position = projectionMatrix * mv;
  }
`

const STEAM_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float a = pow(1.0 - d * 2.0, 2.2);
    gl_FragColor = vec4(uColor, a * vAlpha * uOpacity);
  }
`

export function Steam({
  position, count = 90, spread = 0.11, rise = 1.0, size = 22, opacity = 0.3, seed = 7,
  color = '#FFDCA8',
}: {
  position: V3; count?: number; spread?: number; rise?: number
  size?: number; opacity?: number; seed?: number; color?: string
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null)

  const { positions, phases, sizes, speeds } = useMemo(() => {
    const r = rand(seed * 2654435761)
    const positions = new Float32Array(count * 3)
    const phases = new Float32Array(count)
    const sizes = new Float32Array(count)
    const speeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const a = r() * Math.PI * 2
      const rad = Math.sqrt(r()) * spread
      positions[i * 3] = Math.cos(a) * rad
      positions[i * 3 + 1] = r() * 0.02
      positions[i * 3 + 2] = Math.sin(a) * rad
      phases[i] = r()
      sizes[i] = size * (0.5 + r() * 0.9)
      speeds[i] = 0.7 + r() * 0.7
    }
    return { positions, phases, sizes, speeds }
  }, [count, spread, size, seed])

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uRise: { value: rise },
    uPixelRatio: { value: 1 },
    uColor: { value: new THREE.Color(color) },
    uOpacity: { value: opacity },
  }), [rise, color, opacity])

  useFrame(({ gl }) => {
    if (!matRef.current) return
    matRef.current.uniforms.uTime.value = getAnimTime()
    matRef.current.uniforms.uPixelRatio.value = gl.getPixelRatio()
  })

  return (
    <points position={position} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aPhase" args={[phases, 1]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-aSpeed" args={[speeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={STEAM_VERT}
        fragmentShader={STEAM_FRAG}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

