/**
 * Flow Studio — PosterizeEffect (SPEC §7, F5).
 *
 * Luminance posterization with optional halftone dots, as a pmndrs
 * `postprocessing` Effect subclass (same pattern as
 * src/shaders/KuwaharaEffect.ts) so it composes inside
 * @react-three/postprocessing's <EffectComposer> like any first-party effect.
 *
 * The effect quantizes the luminance of the input into `levels` bands while
 * preserving chroma (RGB is rescaled by bandedLum/lum), which flattens
 * gradients into print-like tone steps. With `halftone > 0`, a 45°-rotated
 * dot grid is laid over the image; dot radius grows with darkness, so shadow
 * bands pick up a comic/screen-print texture.
 *
 * Usage:
 *   <EffectComposer>
 *     <Posterize levels={5} halftone={0.6} dotScale={7} />
 *   </EffectComposer>
 */
import { BlendFunction, Effect } from 'postprocessing'
import { Uniform } from 'three'
import { wrapEffect } from '@react-three/postprocessing'

const fragmentShader = /* glsl */ `
uniform float levels;
uniform float halftone;
uniform float dotScale;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 color = inputColor.rgb;
  float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));

  // Quantize luminance, keep chroma.
  float bandedLum = (floor(lum * levels) + 0.5) / levels;
  vec3 banded = color * (bandedLum / max(lum, 1e-4));

  if (halftone > 0.0) {
    // 45°-rotated dot grid in pixel space.
    mat2 rot = mat2(0.70710678, -0.70710678, 0.70710678, 0.70710678);
    vec2 cell = fract(rot * (uv * resolution) / dotScale) - 0.5;
    float dist = length(cell) * 2.0;
    // Darker band → bigger dot.
    float dotRadius = (1.0 - bandedLum) * 1.2;
    float inDot = 1.0 - smoothstep(dotRadius - 0.2, dotRadius + 0.2, dist);
    banded = mix(banded, banded * 0.3, inDot * halftone);
  }

  outputColor = vec4(banded, inputColor.a);
}
`

export interface PosterizeEffectOptions {
  blendFunction?: BlendFunction
  /** Number of luminance bands. Default 6. */
  levels?: number
  /** Halftone dot strength 0..1. 0 (default) disables the dot pass. */
  halftone?: number
  /** Halftone cell size in pixels. Default 6. */
  dotScale?: number
}

export class PosterizeEffect extends Effect {
  constructor({
    blendFunction = BlendFunction.NORMAL,
    levels = 6,
    halftone = 0,
    dotScale = 6,
  }: PosterizeEffectOptions = {}) {
    super('PosterizeEffect', fragmentShader, {
      blendFunction,
      uniforms: new Map<string, Uniform>([
        ['levels', new Uniform(levels)],
        ['halftone', new Uniform(halftone)],
        ['dotScale', new Uniform(dotScale)],
      ]),
    })
  }

  get levels(): number {
    return this.uniforms.get('levels')!.value
  }
  set levels(value: number) {
    this.uniforms.get('levels')!.value = value
  }

  get halftone(): number {
    return this.uniforms.get('halftone')!.value
  }
  set halftone(value: number) {
    this.uniforms.get('halftone')!.value = value
  }

  get dotScale(): number {
    return this.uniforms.get('dotScale')!.value
  }
  set dotScale(value: number) {
    this.uniforms.get('dotScale')!.value = value
  }
}

/** R3F component form — drop inside <EffectComposer>. */
export const Posterize = wrapEffect(PosterizeEffect)
