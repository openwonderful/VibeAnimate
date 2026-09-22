/**
 * Act 3.1 — "The Road Home" (ARCANE STYLE)
 *
 * Same sunset scene — parent carrying child down a dirt road through rice
 * paddies — but rendered with an Arcane-inspired painterly shader:
 * soft cel shading, crosshatch shadows, warm tinting, noise grain,
 * and sketchy painted outlines. No depth-of-field blur.
 */

import { useRef, useMemo, useEffect, forwardRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Sparkles } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { Effect, BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { DebugCamera } from '../DebugCamera'

/* ─── Arcane-style post-processing effect ──────────────────────── */
/*
 * Arcane (Fortiche) look: oil-painting with visible brush strokes,
 * hand-painted lighting, dramatic warm/cool color grading,
 * soft organic edges, canvas texture, impasto paint thickness.
 * NO crosshatch, NO hard ink outlines, NO comic-book posterization.
 */
const arcaneFragmentShader = /* glsl */ `
  // ── Noise helpers (value noise + FBM for brush/paint texture) ──
  float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * vnoise(p);
      p = p * 2.1 + vec2(1.7, 3.2);
      a *= 0.5;
    }
    return v;
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec2 texelSize = 1.0 / resolution;

    // ── 1. Brush Stroke UV Distortion ──
    // Directional noise displaces sampling to simulate paint sweeps
    vec2 brushDir = normalize(vec2(0.7, 0.3));
    vec2 brushPerp = vec2(-brushDir.y, brushDir.x);
    float bn1 = fbm(uv * 28.0 + brushDir * 5.0);
    float bn2 = fbm(uv * 22.0 - brushDir * 3.0 + 100.0);
    vec2 brushOffset = (brushDir * (bn1 - 0.5) + brushPerp * (bn2 - 0.5)) * 0.005;
    vec2 paintUV = uv + brushOffset;

    // Sample through distorted UVs (everything looks "painted")
    vec3 col = texture2D(inputBuffer, paintUV).rgb;
    float lum = dot(col, vec3(0.299, 0.587, 0.114));

    // ── 2. Soft Painted Edge Enhancement ──
    // Soft, warm edges — NOT black ink outlines
    float edgeAccum = 0.0;
    for (float r = 2.0; r <= 5.0; r += 1.5) {
      vec3 cU = texture2D(inputBuffer, paintUV + vec2(0.0, texelSize.y * r)).rgb;
      vec3 cD = texture2D(inputBuffer, paintUV - vec2(0.0, texelSize.y * r)).rgb;
      vec3 cL = texture2D(inputBuffer, paintUV - vec2(texelSize.x * r, 0.0)).rgb;
      vec3 cR = texture2D(inputBuffer, paintUV + vec2(texelSize.x * r, 0.0)).rgb;
      edgeAccum += length(cU - cD) + length(cR - cL);
    }
    edgeAccum /= 4.0;

    // Warm dark-brown edge tint (like painted contour lines)
    float edge = smoothstep(0.06, 0.4, edgeAccum);
    vec3 edgeColor = vec3(0.07, 0.03, 0.02);
    col = mix(col, edgeColor, edge * 0.4);

    // ── 3. Gentle Color Grading (warm, friendly, painterly) ──
    // Shadows → warm brown with a hint of plum (not heavy purple)
    float shadowMask = smoothstep(0.4, 0.0, lum);
    col += vec3(0.05, 0.01, 0.03) * shadowMask;

    // Highlights → soft warm gold
    float hiMask = smoothstep(0.5, 1.0, lum);
    col += vec3(0.05, 0.03, -0.02) * hiMask;

    // Mid-tones → gentle warmth
    float midMask = 1.0 - abs(lum - 0.45) * 2.5;
    midMask = max(midMask, 0.0);
    col += vec3(0.03, 0.015, -0.01) * midMask;

    // ── 4. Soft Tonal Banding (paint layers, not posterization) ──
    // Very gentle — simulates layered oil paint, not flat toon shading
    vec3 banded = floor(col * 10.0 + 0.5) / 10.0;
    col = mix(col, banded, 0.18);

    // ── 5. Moderate Saturation Boost ──
    float lumPost = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(lumPost), col, 1.3);

    // ── 6. Paint Texture (impasto / canvas) ──
    // Large-scale FBM = paint thickness variation (light catches ridges)
    float paintTex = fbm(uv * 55.0);
    col *= 0.90 + paintTex * 0.20;

    // Fine canvas weave
    float cx = sin(uv.x * resolution.x * 0.9) * 0.5 + 0.5;
    float cy = sin(uv.y * resolution.y * 0.9) * 0.5 + 0.5;
    col *= mix(0.96, 1.0, cx * cy);

    // ── 7. Brush-stroke luminance variation ──
    // Streaky brightness along brush direction
    float streak = fbm(uv * 40.0 + brushDir * 20.0);
    col *= 0.94 + streak * 0.12;

    // ── 8. Film Grain (organic, non-digital feel) ──
    float grain = hash21(uv * resolution + fract(uv.x * 137.0)) * 0.05 - 0.025;
    col += grain;

    // ── 9. Warm Vignette ──
    float vig = 1.0 - smoothstep(0.3, 1.5, length((uv - 0.5) * vec2(1.6, 1.1)));
    col *= mix(0.7, 1.0, vig);

    col = clamp(col, 0.0, 1.0);
    outputColor = vec4(col, inputColor.a);
  }
`

class ArcaneStyleEffect extends Effect {
  constructor() {
    super('ArcaneStyleEffect', arcaneFragmentShader, {
      blendFunction: BlendFunction.NORMAL,
    })
  }
}

const ArcaneStyle = forwardRef<ArcaneStyleEffect>(function ArcaneStyle(_props, ref) {
  const effect = useMemo(() => new ArcaneStyleEffect(), [])
  return <primitive ref={ref} object={effect} dispose={null} />
})

/* ─── Color palette ─────────────────────────────────────────────── */
const WARM_AMBER = '#E8920A'
const SUNSET_ORANGE = '#D4611A'
const DEEP_ORANGE = '#C44A10'
const HORIZON_GOLD = '#FFB844'
const HOUSE_WALL = '#C4A56E'
const HOUSE_ROOF = '#3A3228'
const DIRT_ROAD = '#9B7B5A'
const MOUNTAIN_FAR = '#1A1030'
const MOUNTAIN_MID = '#2A1840'
const MOUNTAIN_NEAR = '#3A2248'
const PERSIMMON_TRUNK = '#5A3E28'
const PERSIMMON_FRUIT = '#E85520'
const SKY_TOP = '#0A0820'
const SKY_MID = '#1A1545'
const SUNSET_PINK = '#D46060'
const SUNSET_YELLOW = '#FFCC55'

/* ─── Custom sunset sky shader ──────────────────────────────────── */
function SunsetSky() {
  const skyMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTopColor: { value: new THREE.Color(SKY_TOP) },
        uMidColor: { value: new THREE.Color(SKY_MID) },
        uPinkColor: { value: new THREE.Color(SUNSET_PINK) },
        uOrangeColor: { value: new THREE.Color(SUNSET_ORANGE) },
        uHorizonColor: { value: new THREE.Color(HORIZON_GOLD) },
        uSunColor: { value: new THREE.Color('#FFDD77') },
        uSunPos: { value: new THREE.Vector3(0.0, 0.08, -1.0).normalize() },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uMidColor;
        uniform vec3 uPinkColor;
        uniform vec3 uOrangeColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uSunColor;
        uniform vec3 uSunPos;
        varying vec3 vWorldPos;

        void main() {
          vec3 dir = normalize(vWorldPos);
          float y = dir.y;

          // Multi-stop gradient — horizon to zenith
          vec3 col;
          if (y < 0.0) {
            col = uHorizonColor;
          } else if (y < 0.05) {
            col = mix(uHorizonColor, uOrangeColor, y / 0.05);
          } else if (y < 0.15) {
            col = mix(uOrangeColor, uPinkColor, (y - 0.05) / 0.1);
          } else if (y < 0.35) {
            col = mix(uPinkColor, uMidColor, (y - 0.15) / 0.2);
          } else {
            col = mix(uMidColor, uTopColor, clamp((y - 0.35) / 0.45, 0.0, 1.0));
          }

          // Sun glow
          float sunDot = max(dot(dir, uSunPos), 0.0);
          float sunDisc = smoothstep(0.997, 0.999, sunDot);
          float sunGlow = pow(sunDot, 8.0) * 0.6;
          float sunHaze = pow(sunDot, 2.5) * 0.25;

          col += uSunColor * sunDisc;
          col += uSunColor * sunGlow;
          col += uHorizonColor * sunHaze;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    })
  }, [])

  return (
    <mesh material={skyMat}>
      <sphereGeometry args={[200, 64, 64]} />
    </mesh>
  )
}

/* ─── Sun with glow layers ──────────────────────────────────────── */
function SunGlow() {
  const glowRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!glowRef.current) return
    const s = 1.0 + Math.sin(clock.getElapsedTime() * 0.3) * 0.02
    glowRef.current.scale.set(s, s, s)
  })

  return (
    <group ref={glowRef} position={[0, 3.5, -62]}>
      <mesh>
        <sphereGeometry args={[3.0, 64, 64]} />
        <meshStandardMaterial color="#FFDD77" emissive="#FFDD77" emissiveIntensity={2.5} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[4.5, 48, 48]} />
        <meshStandardMaterial color="#FFBB44" emissive="#FFBB44" emissiveIntensity={1.5} transparent opacity={0.5} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[7.0, 48, 48]} />
        <meshBasicMaterial color="#FF9933" transparent opacity={0.15} />
      </mesh>
      <mesh>
        <sphereGeometry args={[12.0, 32, 32]} />
        <meshBasicMaterial color={DEEP_ORANGE} transparent opacity={0.06} />
      </mesh>
      <mesh>
        <sphereGeometry args={[20.0, 32, 32]} />
        <meshBasicMaterial color={SUNSET_ORANGE} transparent opacity={0.03} />
      </mesh>
      <pointLight color="#FFAA44" intensity={80} distance={120} decay={1.5} />
    </group>
  )
}

/* ─── God rays ──────────────────────────────────────────────────── */
function GodRays() {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    groupRef.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.1) * 0.01
  })

  const rays = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const spread = (i - 5.5) * 0.12
      return {
        x: spread * 15,
        width: 0.3 + Math.sin(i * 1.7) * 0.15,
        height: 18 + Math.sin(i * 2.3) * 3,
        opacity: 0.025 + Math.sin(i * 0.8) * 0.012,
        rotation: spread * 0.3,
      }
    })
  }, [])

  return (
    <group ref={groupRef} position={[0, 8, -35]}>
      {rays.map((ray, i) => (
        <mesh key={i} position={[ray.x, 0, 0]} rotation={[0, 0, ray.rotation]}>
          <planeGeometry args={[ray.width, ray.height]} />
          <meshBasicMaterial
            color={SUNSET_YELLOW}
            transparent
            opacity={ray.opacity}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  )
}

/* ─── Mountain silhouettes (3 layers) ───────────────────────────── */
function Mountains() {
  const makeShape = (pts: [number, number][]) => {
    const s = new THREE.Shape()
    s.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length - 1; i += 2) {
      s.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i + 1] || pts[i])[0], (pts[i + 1] || pts[i])[1])
    }
    s.lineTo(pts[pts.length - 1][0], 0)
    s.lineTo(pts[0][0], 0)
    s.closePath()
    return s
  }

  const farS = useMemo(() => makeShape([
    [-50,0],[-42,3],[-35,6.5],[-30,5],[-25,3.5],[-20,4],[-14,8.5],[-8,7],[-4,5],
    [0,6.5],[5,9.5],[10,7.5],[14,5],[18,6],[22,8],[28,5.5],[32,3],[38,5],[42,3.5],[50,0],
  ]), [])

  const midS = useMemo(() => makeShape([
    [-50,0],[-40,2],[-33,5],[-27,3.5],[-22,2],[-16,3.5],[-10,6],[-5,4.5],[0,3],
    [6,5.5],[12,7],[18,5],[22,3.5],[26,4.5],[30,6.5],[36,4],[42,2],[50,0],
  ]), [])

  const nearS = useMemo(() => makeShape([
    [-50,0],[-38,1.5],[-30,3.5],[-24,2.5],[-18,1.5],[-12,3],[-6,4.5],[0,3.5],
    [5,2],[10,3],[16,4],[22,3],[28,2],[34,3.5],[40,2.5],[50,0],
  ]), [])

  return (
    <group>
      <mesh position={[0, 0, -58]} rotation={[-Math.PI / 2, 0, 0]}>
        <shapeGeometry args={[farS]} />
        <meshStandardMaterial color={MOUNTAIN_FAR} roughness={0.9} emissive={MOUNTAIN_FAR} emissiveIntensity={0.15} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -48]} rotation={[-Math.PI / 2, 0, 0]}>
        <shapeGeometry args={[midS]} />
        <meshStandardMaterial color={MOUNTAIN_MID} roughness={0.9} emissive={MOUNTAIN_MID} emissiveIntensity={0.1} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -38]} rotation={[-Math.PI / 2, 0, 0]}>
        <shapeGeometry args={[nearS]} />
        <meshStandardMaterial color={MOUNTAIN_NEAR} roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

/* ─── Parent carrying child (업기 piggyback) ─────────────────────── */
function ParentChildFigure({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null)

  // Warm gold material — solid, not ghostly
  const goldMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#6A5020',
        emissive: '#D4993A',
        emissiveIntensity: 0.45,
        roughness: 0.6,
        metalness: 0.5,
      }),
    [],
  )

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.getElapsedTime()
    groupRef.current.rotation.z = Math.sin(t * 1.2) * 0.018
    groupRef.current.position.y = position[1] + Math.sin(t * 2.4) * 0.008
  })

  const limb = (
    args: [number, number, number, number?],
    pos: [number, number, number],
    rot?: [number, number, number],
  ) => (
    <mesh material={goldMat} position={pos} rotation={rot} castShadow>
      <cylinderGeometry args={args} />
    </mesh>
  )

  return (
    <group ref={groupRef} position={position} scale={[2.2, 2.2, 2.2]}>
      {/* ── Parent ── */}
      {/* Head — slightly forward lean */}
      <mesh material={goldMat} position={[0, 1.72, 0.04]} castShadow>
        <sphereGeometry args={[0.14, 20, 20]} />
      </mesh>
      {/* Neck */}
      {limb([0.045, 0.045, 0.09, 8], [0, 1.57, 0.03])}
      {/* Torso — leaning forward, bowed under the child's weight */}
      {limb([0.07, 0.06, 0.56, 8], [0, 1.22, 0.04], [0.18, 0, 0])}
      {/* Upper legs (thighs) — close together, natural walking gait */}
      {limb([0.05, 0.045, 0.3, 8], [-0.07, 0.72, 0.02], [0.05, 0, 0.02])}
      {limb([0.05, 0.045, 0.3, 8], [0.07, 0.73, 0.05], [-0.1, 0, -0.02])}
      {/* Lower legs */}
      {limb([0.045, 0.04, 0.3, 8], [-0.07, 0.38, 0.01], [-0.02, 0, 0.02])}
      {limb([0.045, 0.04, 0.3, 8], [0.08, 0.39, 0.02], [-0.08, 0, -0.02])}
      {/* Arms reaching back to hold child */}
      {limb([0.04, 0.035, 0.35, 8], [-0.15, 1.3, -0.08], [0.5, 0, -0.2])}
      {limb([0.04, 0.035, 0.35, 8], [0.15, 1.3, -0.08], [0.5, 0, 0.2])}

      {/* ── Child on parent's back ── */}
      {/* Child head — resting on parent's shoulder, tilted */}
      <mesh material={goldMat} position={[0.12, 1.62, -0.16]} castShadow>
        <sphereGeometry args={[0.115, 20, 20]} />
      </mesh>
      {/* Child torso — close to parent's back */}
      {limb([0.045, 0.04, 0.28, 8], [0.02, 1.36, -0.16])}
      {/* Child legs dangling at parent's sides */}
      {limb([0.035, 0.03, 0.22, 8], [-0.06, 1.1, -0.06], [0.3, 0, 0.12])}
      {limb([0.035, 0.03, 0.22, 8], [0.1, 1.1, -0.06], [0.3, 0, -0.12])}
      {/* Child arms around parent's neck */}
      {limb([0.03, 0.024, 0.17, 8], [-0.06, 1.53, -0.02], [0.15, 0, -0.8])}
      {limb([0.03, 0.024, 0.17, 8], [0.12, 1.53, -0.02], [0.15, 0, 0.8])}

      {/* Rim-light behind figure for backlit effect */}
      <pointLight position={[0, 1.3, -0.5]} color="#FFAA33" intensity={8} distance={8} decay={1.5} />
      <pointLight position={[0, 0.8, -0.3]} color="#FF8822" intensity={4} distance={6} decay={2} />
    </group>
  )
}

/* ─── Hanok farmhouse ───────────────────────────────────────────── */
function Hanok({ position }: { position: [number, number, number] }) {
  const warmLightRef = useRef<THREE.PointLight>(null)

  useFrame(({ clock }) => {
    if (!warmLightRef.current) return
    warmLightRef.current.intensity =
      5 + Math.sin(clock.getElapsedTime() * 3) * 0.8 +
      Math.sin(clock.getElapsedTime() * 7) * 0.3
  })

  return (
    <group position={position}>
      {/* Stone foundation */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[3.0, 0.3, 2.2]} />
        <meshStandardMaterial color="#6B6560" roughness={0.95} />
      </mesh>
      {/* Raised wooden floor */}
      <mesh position={[0, 0.2, 0]} receiveShadow castShadow>
        <boxGeometry args={[2.8, 0.15, 2.0]} />
        <meshStandardMaterial color="#7B6545" roughness={0.85} />
      </mesh>
      {/* Main body walls */}
      <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.6, 1.1, 1.8]} />
        <meshStandardMaterial color={HOUSE_WALL} roughness={0.8} />
      </mesh>
      {/* Wall pillars */}
      {[-1.2, 0, 1.2].map((x, i) => (
        <mesh key={i} position={[x, 0.85, 0.85]} castShadow>
          <boxGeometry args={[0.1, 1.1, 0.1]} />
          <meshStandardMaterial color="#6B5535" roughness={0.8} />
        </mesh>
      ))}

      {/* Roof */}
      <mesh position={[0, 1.55, 0]} castShadow>
        <boxGeometry args={[3.4, 0.18, 2.6]} />
        <meshStandardMaterial color={HOUSE_ROOF} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.7, 0]} castShadow>
        <boxGeometry args={[3.0, 0.14, 0.35]} />
        <meshStandardMaterial color={HOUSE_ROOF} roughness={0.7} />
      </mesh>
      {/* Eaves */}
      <mesh position={[0, 1.4, 1.2]} castShadow rotation={[0.15, 0, 0]}>
        <boxGeometry args={[3.6, 0.06, 0.7]} />
        <meshStandardMaterial color={HOUSE_ROOF} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.4, -1.2]} castShadow rotation={[-0.15, 0, 0]}>
        <boxGeometry args={[3.6, 0.06, 0.7]} />
        <meshStandardMaterial color={HOUSE_ROOF} roughness={0.7} />
      </mesh>

      {/* Door — glowing warm hanji */}
      <mesh position={[0, 0.8, 0.92]}>
        <boxGeometry args={[0.55, 0.85, 0.02]} />
        <meshStandardMaterial
          color={WARM_AMBER}
          emissive={WARM_AMBER}
          emissiveIntensity={2.0}
          toneMapped={false}
        />
      </mesh>
      {/* Windows */}
      {[-0.7, 0.7].map((x, i) => (
        <mesh key={i} position={[x, 0.9, 0.92]}>
          <boxGeometry args={[0.35, 0.35, 0.02]} />
          <meshStandardMaterial
            color={WARM_AMBER}
            emissive={WARM_AMBER}
            emissiveIntensity={1.5}
            toneMapped={false}
            transparent
            opacity={0.8}
          />
        </mesh>
      ))}

      {/* Interior warm light */}
      <pointLight
        ref={warmLightRef}
        position={[0, 0.8, 0.5]}
        color="#FFAA55"
        intensity={6}
        distance={12}
        decay={2}
      />
      {/* Exterior warm glow visible from distance */}
      <pointLight
        position={[0, 1.0, 2.5]}
        color="#FF9944"
        intensity={4}
        distance={8}
        decay={2}
      />
      {/* Chimney */}
      <mesh position={[1.1, 1.85, -0.6]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.4, 8]} />
        <meshStandardMaterial color="#6B6060" roughness={0.9} />
      </mesh>

      {/* Stepping stones */}
      {[0, 0.6, 1.2, 1.8, 2.4].map((z, i) => (
        <mesh key={i} position={[(i % 2) * 0.08 - 0.04, 0.02, 0.9 + z]} rotation={[-Math.PI / 2, 0, i * 0.3]} receiveShadow>
          <circleGeometry args={[0.15 + (i % 3) * 0.03, 8]} />
          <meshStandardMaterial color="#8A8078" roughness={0.95} />
        </mesh>
      ))}
    </group>
  )
}

/* ─── Persimmon tree ────────────────────────────────────────────── */
function PersimmonTree({ position }: { position: [number, number, number] }) {
  const fruits = useMemo(() => {
    const out: { pos: [number, number, number]; size: number }[] = []
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2 + i * 0.5
      const r = 0.3 + (i % 4) * 0.22
      const y = 3.0 + Math.sin(i * 1.7) * 0.5 - (i % 3) * 0.15
      out.push({ pos: [Math.cos(angle) * r, y, Math.sin(angle) * r], size: 0.055 + (i % 3) * 0.015 })
    }
    return out
  }, [])

  return (
    <group position={position}>
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.12, 2.4, 8]} />
        <meshStandardMaterial color={PERSIMMON_TRUNK} roughness={0.9} />
      </mesh>
      {[
        { p: [-0.4, 2.4, 0] as const, r: [0, 0, -0.6] as const, l: 1.2 },
        { p: [0.35, 2.5, 0.15] as const, r: [0, 0.3, 0.5] as const, l: 1.1 },
        { p: [-0.2, 2.8, -0.3] as const, r: [-0.3, 0, -0.4] as const, l: 0.9 },
        { p: [0.1, 2.6, 0.3] as const, r: [0.4, 0, 0.3] as const, l: 1.0 },
      ].map((b, i) => (
        <mesh key={i} position={[...b.p]} rotation={[...b.r]} castShadow>
          <cylinderGeometry args={[0.02, 0.04, b.l, 6]} />
          <meshStandardMaterial color={PERSIMMON_TRUNK} roughness={0.9} />
        </mesh>
      ))}
      {/* Canopy cluster */}
      {[
        { p: [0, 3.0, 0] as const, s: 0.85 },
        { p: [-0.3, 2.8, 0.2] as const, s: 0.6 },
        { p: [0.35, 2.9, -0.15] as const, s: 0.55 },
      ].map((c, i) => (
        <mesh key={i} position={[...c.p]} castShadow>
          <sphereGeometry args={[c.s, 16, 12]} />
          <meshStandardMaterial
            color={i === 0 ? '#2A4A15' : '#335A1A'}
            roughness={0.85}
            transparent
            opacity={0.8}
          />
        </mesh>
      ))}
      {fruits.map((f, i) => (
        <Float key={i} speed={0.5 + (i % 3) * 0.2} floatIntensity={0.02}>
          <mesh position={f.pos} castShadow>
            <sphereGeometry args={[f.size, 10, 10]} />
            <meshStandardMaterial
              color={PERSIMMON_FRUIT}
              emissive={PERSIMMON_FRUIT}
              emissiveIntensity={0.35}
              roughness={0.5}
            />
          </mesh>
        </Float>
      ))}
    </group>
  )
}

/* ─── Rice paddy ────────────────────────────────────────────────── */
function RicePaddy({
  position,
  width,
  depth,
}: {
  position: [number, number, number]
  width: number
  depth: number
}) {
  const waterRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!waterRef.current) return
    const mat = waterRef.current.material as THREE.MeshStandardMaterial
    mat.roughness = 0.12 + Math.sin(clock.getElapsedTime() * 0.5) * 0.04
  })

  const stalks = useMemo(() => {
    const out: { x: number; z: number; h: number; rot: number }[] = []
    const rows = Math.floor(depth / 0.45)
    const cols = Math.floor(width / 0.45)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        out.push({
          x: (c - cols / 2) * 0.45 + (r % 2) * 0.22,
          z: (r - rows / 2) * 0.45,
          h: 0.2 + Math.sin(r * 3.7 + c * 2.1) * 0.05,
          rot: Math.sin(r * 1.3 + c * 0.7) * 0.15,
        })
      }
    }
    return out
  }, [width, depth])

  return (
    <group position={position}>
      {/* Earth berm */}
      <mesh position={[0, 0.04, 0]} receiveShadow>
        <boxGeometry args={[width + 0.1, 0.08, depth + 0.1]} />
        <meshStandardMaterial color="#5A6B30" roughness={0.95} />
      </mesh>
      {/* Water surface — base layer with warm tone */}
      <mesh ref={waterRef} position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          color="#5A6A78"
          roughness={0.12}
          metalness={0.85}
          envMapIntensity={2.0}
          transparent
          opacity={0.85}
        />
      </mesh>
      {/* Sunset reflection — warm orange covering the water */}
      <mesh position={[0, 0.085, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial
          color="#CC7722"
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* Brighter golden band in center of paddy (sky reflection) */}
      <mesh position={[0, 0.086, -depth * 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width * 0.5, depth * 0.4]} />
        <meshBasicMaterial
          color="#FFBB44"
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* Rice stalks */}
      {stalks.map((s, i) => (
        <mesh key={i} position={[s.x, s.h / 2 + 0.08, s.z]} rotation={[0, i * 1.3, s.rot]}>
          <cylinderGeometry args={[0.004, 0.006, s.h, 4]} />
          <meshStandardMaterial color="#7A9A40" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

/* ─── Dirt road with perspective ────────────────────────────────── */
function DirtRoad() {
  const roadShape = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-2.0, -8)
    s.lineTo(2.0, -8)
    s.lineTo(0.6, 12)
    s.lineTo(-0.6, 12)
    s.closePath()
    return s
  }, [])

  return (
    <group>
      <mesh position={[0, 0.02, 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <shapeGeometry args={[roadShape]} />
        <meshStandardMaterial color={DIRT_ROAD} roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      {/* Subtle wheel ruts */}
      {[-0.3, 0.3].map((x, i) => (
        <mesh key={i} position={[x, 0.025, 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[0.12, 18]} />
          <meshStandardMaterial color="#7A6B4A" roughness={0.98} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

/* ─── Ground ────────────────────────────────────────────────────── */
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color="#4A5528" roughness={1.0} />
    </mesh>
  )
}

/* ─── Fireflies ─────────────────────────────────────────────────── */
function Fireflies() {
  return (
    <>
      <Sparkles count={50} scale={[20, 3, 20]} size={4} speed={0.3} color="#FFD866" opacity={0.6} position={[0, 1.2, -4]} />
      <Sparkles count={20} scale={[10, 2, 6]} size={5} speed={0.25} color="#FFCC44" opacity={0.5} position={[0, 0.8, 3]} />
      <Sparkles count={25} scale={[8, 2, 8]} size={3} speed={0.2} color="#FFAA33" opacity={0.4} position={[0, 0.6, -10]} />
    </>
  )
}

/* ─── Distant trees ─────────────────────────────────────────────── */
function DistantTrees() {
  const trees = useMemo(() => [
    { x: -8, z: -18, s: 0.7 }, { x: -10, z: -22, s: 0.9 },
    { x: 7, z: -20, s: 0.8 }, { x: 9, z: -25, s: 0.6 },
    { x: -6, z: -28, s: 0.5 }, { x: 5, z: -30, s: 0.55 },
    { x: -12, z: -15, s: 0.65 }, { x: 11, z: -16, s: 0.6 },
  ], [])

  return (
    <group>
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]} scale={t.s}>
          <mesh position={[0, 0.8, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.08, 1.6, 6]} />
            <meshStandardMaterial color="#4A3A25" roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.8, 0]} castShadow>
            <sphereGeometry args={[0.6, 10, 8]} />
            <meshStandardMaterial color={i % 2 === 0 ? '#2A4518' : '#354E1E'} roughness={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ─── Wooden fence along one side of the road ───────────────────── */
function WoodenFence() {
  return (
    <group position={[2.0, 0, 0]}>
      {Array.from({ length: 8 }, (_, i) => {
        const z = -10 + i * 2
        return (
          <group key={i}>
            <mesh position={[0, 0.25, z]} castShadow>
              <cylinderGeometry args={[0.03, 0.035, 0.5, 6]} />
              <meshStandardMaterial color="#6A5535" roughness={0.9} />
            </mesh>
            {i < 7 && (
              <mesh position={[0, 0.3, z + 1]} castShadow>
                <boxGeometry args={[0.03, 0.025, 2]} />
                <meshStandardMaterial color="#7A6540" roughness={0.9} />
              </mesh>
            )}
          </group>
        )
      })}
    </group>
  )
}

/* ─── Foreground grass tufts ────────────────────────────────────── */
function ForegroundGrass() {
  const tufts = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      x: -8 + (i % 12) * 1.4 + Math.sin(i * 3.7) * 0.5,
      z: 6 + Math.floor(i / 12) * 1.2 + Math.sin(i * 2.1) * 0.3,
      h: 0.18 + Math.sin(i * 1.3) * 0.1,
      rot: Math.sin(i * 0.7) * 0.2,
    })),
  [])

  return (
    <group>
      {tufts.map((t, i) => (
        <mesh key={i} position={[t.x, t.h / 2, t.z]} rotation={[0, i * 0.8, t.rot]}>
          <cylinderGeometry args={[0.003, 0.012, t.h, 4]} />
          <meshStandardMaterial color="#5A7A30" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

/* ─── Atmospheric haze layers near horizon ──────────────────────── */
function AtmosphericHaze() {
  return (
    <group>
      {/* Low-lying mist over the paddies */}
      <mesh position={[0, 0.3, -10]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 20]} />
        <meshBasicMaterial
          color="#FFAA55"
          transparent
          opacity={0.04}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Horizon haze band */}
      <mesh position={[0, 1.5, -30]}>
        <planeGeometry args={[80, 5]} />
        <meshBasicMaterial
          color="#FF9944"
          transparent
          opacity={0.05}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* High altitude warm scatter */}
      <mesh position={[0, 6, -25]}>
        <planeGeometry args={[60, 8]} />
        <meshBasicMaterial
          color="#FF7733"
          transparent
          opacity={0.02}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

/* ─── Small second tree on the other side of the house ──────────── */
function SmallTree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.07, 1.2, 6]} />
        <meshStandardMaterial color="#4A3A25" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.4, 0]} castShadow>
        <sphereGeometry args={[0.5, 12, 10]} />
        <meshStandardMaterial color="#2A4A18" roughness={0.85} />
      </mesh>
    </group>
  )
}

/* ─── Birds in the sunset sky (V-shape flock) ──────────────────── */
function BirdFlock() {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.getElapsedTime()
    groupRef.current.position.x = -5 + Math.sin(t * 0.15) * 3
    groupRef.current.position.z = -20 + Math.sin(t * 0.1) * 2
  })

  const birds = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const side = i % 2 === 0 ? 1 : -1
      const idx = Math.floor(i / 2) + 1
      return {
        x: side * idx * 0.6,
        y: -idx * 0.15,
        wingPhase: i * 0.7,
      }
    })
  }, [])

  return (
    <group ref={groupRef} position={[-3, 8, -25]}>
      {birds.map((b, i) => (
        <group key={i} position={[b.x, b.y, 0]}>
          {/* Simple V-shaped bird using two thin planes */}
          <mesh rotation={[0, 0, -0.3]} position={[-0.08, 0, 0]}>
            <planeGeometry args={[0.18, 0.02]} />
            <meshBasicMaterial color="#1A1020" side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation={[0, 0, 0.3]} position={[0.08, 0, 0]}>
            <planeGeometry args={[0.18, 0.02]} />
            <meshBasicMaterial color="#1A1020" side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ─── Wildflowers along the road edges ──────────────────────────── */
function Wildflowers() {
  const flowers = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      x: (i % 2 === 0 ? -1 : 1) * (1.8 + Math.sin(i * 2.3) * 0.4),
      z: -6 + i * 0.8 + Math.sin(i * 1.7) * 0.3,
      color: ['#E8AA30', '#D46040', '#E8C050', '#CC5540'][i % 4],
      h: 0.12 + Math.sin(i * 3.1) * 0.04,
    })),
  [])

  return (
    <group>
      {flowers.map((f, i) => (
        <group key={i} position={[f.x, 0, f.z]}>
          {/* Stem */}
          <mesh position={[0, f.h / 2, 0]}>
            <cylinderGeometry args={[0.004, 0.004, f.h, 4]} />
            <meshStandardMaterial color="#5A7A30" roughness={0.9} />
          </mesh>
          {/* Flower head */}
          <mesh position={[0, f.h + 0.02, 0]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshStandardMaterial
              color={f.color}
              emissive={f.color}
              emissiveIntensity={0.2}
              roughness={0.6}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ─── Scene content ─────────────────────────────────────────────── */
function SceneContent() {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.15} color="#FFE0B0" />
      <directionalLight
        position={[0, 10, -30]}
        intensity={2.2}
        color="#FFAA44"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={80}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={15}
        shadow-camera-bottom={-5}
      />
      <directionalLight position={[-5, 6, -25]} intensity={1.2} color="#FF8844" />
      <pointLight position={[10, 4, 5]} intensity={3} color="#FFD088" decay={2} />
      <pointLight position={[0, 2, 2]} intensity={2} color="#FFBB77" decay={2} distance={15} />

      {/* Sky & atmosphere */}
      <SunsetSky />
      <SunGlow />
      <GodRays />
      <AtmosphericHaze />
      <fog attach="fog" args={['#2A1810', 25, 70]} />

      {/* Terrain */}
      <Ground />
      <DirtRoad />

      {/* Rice paddies */}
      <RicePaddy position={[-4.5, 0, -4]} width={5.0} depth={12} />
      <RicePaddy position={[4.5, 0, -4]} width={5.0} depth={12} />
      <RicePaddy position={[-3.8, 0, 5]} width={4.0} depth={5} />
      <RicePaddy position={[3.8, 0, 5]} width={4.0} depth={5} />

      {/* House & trees */}
      <Hanok position={[0, 0, -14]} />
      <PersimmonTree position={[3.0, 0, -12.5]} />
      <SmallTree position={[-2.8, 0, -13]} />
      <DistantTrees />
      <WoodenFence />

      {/* Parent carrying child — slightly off-center for composition */}
      <Float speed={0.4} floatIntensity={0.03} rotationIntensity={0}>
        <ParentChildFigure position={[0.1, 0.05, 2]} />
      </Float>

      {/* Atmosphere & details */}
      <Fireflies />
      <ForegroundGrass />
      <Wildflowers />
      <BirdFlock />

      {/* Mountains */}
      <Mountains />
    </>
  )
}

/* ─── Main export ───────────────────────────────────────────────── */
export default function Act3_1_Arcane() {
  useEffect(() => {
    const prev = document.body.style.background
    document.body.style.background = '#0A0508'
    return () => { document.body.style.background = prev }
  }, [])

  return (
    <div style={{
      width: '100%',
      height: '100%',
      minHeight: '100vh',
      background: '#0A0508',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'hidden',
      zIndex: 9999,
    }}>
      {/* Bottom vignette to cover any ground edge */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '8%',
        background: 'linear-gradient(to top, #0A0508 0%, transparent 100%)',
        zIndex: 1,
        pointerEvents: 'none',
      }} />
      {/* Top vignette for atmosphere */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '5%',
        background: 'linear-gradient(to bottom, #0A0508 0%, transparent 100%)',
        zIndex: 1,
        pointerEvents: 'none',
      }} />
      <Canvas
        shadows
        camera={{
          position: [0.3, 1.45, 8.5],
          fov: 42,
          near: 0.1,
          far: 300,
        }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.3,
        }}
        onCreated={({ camera }) => {
          camera.lookAt(0, 2.2, -10)
        }}
      >
        <DebugCamera />
        <SceneContent />
        <EffectComposer>
          <Bloom
            intensity={0.6}
            luminanceThreshold={0.35}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
          <ArcaneStyle />
          <Vignette eskil={false} offset={0.15} darkness={0.6} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
