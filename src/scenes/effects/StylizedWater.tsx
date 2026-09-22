import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getAnimTime } from '../../hooks/useAnimTime'

/**
 * StylizedWater — paddy water drawn to match the rest of Act 3.
 *
 * WHY NOT PBR
 * The first attempt made the paddies a physically-based mirror with a
 * procedural ripple normal map. Technically correct, and completely wrong for
 * this film: everything around it — the ridges, the jangseung, the straw
 * stacks, the painted backdrop, the figures themselves — is flat, simple
 * geometry with soft shading and no specular detail. A surface with real
 * micro-facet sparkle sitting in the middle of that reads as pasted in from
 * another renderer. It did not fit.
 *
 * So this is drawn rather than simulated, and built from the two things that
 * actually make water read as water in an illustration:
 *
 *  1. FRESNEL, BETWEEN TWO PARTS OF THE SKY. Seen at a grazing angle a
 *     horizontal surface mirrors the horizon; seen steeply from above it
 *     mirrors the zenith. So the near end of a paddy at dusk is cool lavender
 *     and the far end is hot orange — and that split is the single strongest
 *     "this is a liquid" cue there is. Ramping between a mud colour and a sky
 *     colour instead, which is the intuitive thing to do, produces something
 *     that reads as ploughed earth however the numbers are tuned.
 *  2. BANDED RIPPLES. Layered sines warped against each other, thresholded
 *     into soft bands rather than left as smooth gradients — the way water is
 *     drawn with a brush, not the way it is photographed.
 *
 * The reflected sun or moon is a soft column broken up by those same bands,
 * which keeps it graphic instead of turning into sequins.
 *
 * Fog and tone-mapping chunks are included explicitly: a custom shader opts
 * out of both otherwise, and the paddies run to 30 units where this scene's
 * fog is doing real work.
 */

const VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  #include <fog_pars_vertex>

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorld = worldPos.xyz;
    vec4 mvPosition = viewMatrix * worldPos;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`

const FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3  uDeep;
  uniform vec3  uSky;
  uniform vec3  uRipple;
  uniform vec3  uGlow;
  uniform float uGlowX;
  uniform float uGlowWidth;
  uniform float uGlowStrength;
  uniform float uRippleScale;
  uniform float uRippleSpeed;
  uniform float uRippleStrength;
  uniform float uOpacity;

  varying vec2 vUv;
  varying vec3 vWorld;
  #include <fog_pars_fragment>

  void main() {
    vec3 V = normalize(cameraPosition - vWorld);
    // 1 at grazing incidence, 0 looking straight down.
    float fres = pow(1.0 - clamp(V.y, 0.0, 1.0), 4.5);

    vec3 base = mix(uDeep, uSky, fres);

    // Warped sine layers thresholded into bands — coarse swell plus a finer
    // chop on top, so it reads at both the near edge and the far end.
    float z = vWorld.z * uRippleScale;
    float x = vWorld.x * uRippleScale;
    float t = uTime * uRippleSpeed;
    float w = sin(z * 1.00 + sin(x * 0.40) * 1.5 + t)
            + 0.60 * sin(z * 2.10 - sin(x * 0.75) * 1.2 - t * 0.8)
            + 0.35 * sin(z * 3.70 + x * 0.30 + t * 1.6);
    float band = smoothstep(0.20, 0.95, w);

    float fine = sin(z * 7.3 + sin(x * 1.4) * 0.9 - t * 1.9)
               + 0.5 * sin(z * 11.7 - x * 0.8 + t * 2.4);
    float chop = smoothstep(0.55, 1.35, fine);

    // Ripples show most where the surface is already reflecting.
    vec3 col = mix(base, uRipple, band * uRippleStrength * (0.30 + 0.70 * fres));
    col = mix(col, uRipple, chop * uRippleStrength * 0.45 * fres);

    // The reflected sun/moon: a soft column, chopped by the same bands.
    float d = vWorld.x - uGlowX;
    float g = exp(-(d * d) / (uGlowWidth * uGlowWidth));
    col += uGlow * g * uGlowStrength * (0.15 + 0.85 * max(band, chop)) * fres;

    gl_FragColor = vec4(col, uOpacity);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`

export interface StylizedWaterProps {
  width: number
  depth: number
  /** What it mirrors looking steeply down — the ZENITH, not the mud. This is
   *  the cue that separates water from wet earth: at dusk the near end of a
   *  flooded paddy is cool lavender because that is what is overhead, while
   *  the far end is warm because that is the horizon. Setting this to a mud
   *  colour makes the whole field read as ploughed soil. */
  deep: string
  /** Colour it mirrors at a grazing angle — the sky just above the horizon. */
  sky: string
  /** Colour of the ripple bands. */
  ripple: string
  /** Reflected sun/moon colour. */
  glow: string
  /** World x the reflected column sits on. */
  glowX?: number
  glowWidth?: number
  glowStrength?: number
  rippleScale?: number
  rippleSpeed?: number
  rippleStrength?: number
  opacity?: number
  /** Added to the anim clock. Act B's sub-scenes are WINDOWS into one long
   *  take, so their local t=0 is 48 s into the world; without this the same
   *  frame rendered as part of B and as part of B.7 has the motes and the
   *  ripples in different places, and a segmented render seams. */
  timeOffset?: number
  /** Hands the live ShaderMaterial back to the caller. Act B's valley walks
   *  the same paddies from golden hour into night and lerps `uDeep`/`uSky`/
   *  `uRipple`/`uGlow` itself — the colours are props here, so a caller that
   *  wanted to animate them would rebuild the uniform block every frame. */
  materialRef?: (m: THREE.ShaderMaterial | null) => void
}

export default function StylizedWater({
  width,
  depth,
  deep,
  sky,
  ripple,
  glow,
  glowX = 0,
  glowWidth = 2.2,
  glowStrength = 0.55,
  rippleScale = 1.35,
  rippleSpeed = 0.5,
  rippleStrength = 0.42,
  opacity = 1,
  timeOffset = 0,
  materialRef,
}: StylizedWaterProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const attach = (m: THREE.ShaderMaterial | null) => {
    matRef.current = m
    materialRef?.(m)
  }

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(deep) },
      uSky: { value: new THREE.Color(sky) },
      uRipple: { value: new THREE.Color(ripple) },
      uGlow: { value: new THREE.Color(glow) },
      uGlowX: { value: glowX },
      uGlowWidth: { value: glowWidth },
      uGlowStrength: { value: glowStrength },
      uRippleScale: { value: rippleScale },
      uRippleSpeed: { value: rippleSpeed },
      uRippleStrength: { value: rippleStrength },
      uOpacity: { value: opacity },
      ...THREE.UniformsLib.fog,
    }),
    [deep, sky, ripple, glow, glowX, glowWidth, glowStrength,
     rippleScale, rippleSpeed, rippleStrength, opacity],
  )

  useFrame(() => {
    if (matRef.current) matRef.current.uniforms.uTime.value = getAnimTime() + timeOffset
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[width, depth]} />
      <shaderMaterial
        ref={attach}
        uniforms={uniforms}
        vertexShader={VERT}
        fragmentShader={FRAG}
        transparent={opacity < 1}
        fog
      />
    </mesh>
  )
}
