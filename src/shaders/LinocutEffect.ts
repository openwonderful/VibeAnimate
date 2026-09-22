/**
 * LinocutEffect — radial-line woodcut / linocut print stylization.
 *
 * Vendored verbatim from @tresjs/post-processing v3.7.2 (MIT licensed).
 * Source: https://github.com/Tresjs/post-processing/blob/main/src/core/pmndrs/custom/linocut/index.ts
 *
 * Renders the scene as black-and-white sinusoidal line patterns centered on
 * `center` (UV space), spiraling outward. `scale` controls line density,
 * `noiseScale` adds grain, `rotation` rotates the pattern.
 */

import { BlendFunction, Effect } from 'postprocessing'
import { Uniform, Vector2 } from 'three'

const fragmentShader = `
uniform float scale;
uniform float noiseScale;
uniform vec2 center;
uniform float rotation;

float luma(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

float luma(vec4 color) {
  return dot(color.rgb, vec3(0.299, 0.587, 0.114));
}

float noise(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 fragCoord = uv * resolution.xy;

  vec2 d = fragCoord - center * resolution.xy;
  mat2 rotMat = mat2(cos(rotation), -sin(rotation), sin(rotation), cos(rotation));
  vec2 rotatedD = d * rotMat;

  float r = length(rotatedD) / (1000.0 / max(scale, 0.01));
  float a = atan(rotatedD.y, rotatedD.x) + scale * (0.5 - r) / 0.5;

  vec2 uvt = center * resolution.xy + r * vec2(cos(a), sin(a));
  vec2 uv2 = fragCoord / resolution.xy;

  float c = (0.75 + 0.25 * sin(uvt.x * 1000.0 * max(scale, 0.01)));

  vec4 color = texture(inputBuffer, uv2);
  color.rgb = color.rgb * color.rgb;
  float l = luma(color);

  float n = noise(uv2 * 10.0);
  l += noiseScale * (n - 0.5);

  float f = smoothstep(0.5 * c, c, l);
  f = smoothstep(0.0, 0.5, f);

  f = sqrt(f);

  outputColor = vec4(vec3(f), 1.0);
}
`

export interface LinocutEffectOptions {
  blendFunction?: BlendFunction
  scale?: number
  noiseScale?: number
  center?: [number, number] | Vector2
  rotation?: number
}

export class LinocutEffect extends Effect {
  constructor({
    blendFunction = BlendFunction.NORMAL,
    scale = 0.85,
    noiseScale = 0,
    center = [0.5, 0.5],
    rotation = 0,
  }: LinocutEffectOptions = {}) {
    const centerVec = Array.isArray(center) ? new Vector2().fromArray(center) : center
    super('LinocutEffect', fragmentShader, {
      blendFunction,
      uniforms: new Map<string, Uniform>([
        ['scale', new Uniform(scale)],
        ['noiseScale', new Uniform(noiseScale)],
        ['center', new Uniform(centerVec)],
        ['rotation', new Uniform(rotation)],
      ]),
    })
  }

  get scale(): number {
    return this.uniforms.get('scale')!.value
  }
  set scale(value: number) {
    this.uniforms.get('scale')!.value = value
  }
  get noiseScale(): number {
    return this.uniforms.get('noiseScale')!.value
  }
  set noiseScale(value: number) {
    this.uniforms.get('noiseScale')!.value = value
  }
  get center(): Vector2 {
    return this.uniforms.get('center')!.value
  }
  set center(value: [number, number] | Vector2) {
    this.uniforms.get('center')!.value = Array.isArray(value)
      ? new Vector2().fromArray(value)
      : value
  }
  get rotation(): number {
    return this.uniforms.get('rotation')!.value
  }
  set rotation(value: number) {
    this.uniforms.get('rotation')!.value = value
  }
}
