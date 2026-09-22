/**
 * Soft additive glow sprites — a Points shader with per-point size, color,
 * alpha and twinkle phase. Used for lantern halos, star glows, reflections,
 * the nebula band and the Ojakgyo bridge.
 *
 * Point size is computed from world size × uScale (set per frame from the
 * viewport height, fov and pixel ratio) so glows stay proportional while the
 * camera's focal length changes across the shot.
 */
import * as THREE from 'three'

export function makeGlowMaterial(opts: { depthTest?: boolean } = {}): THREE.ShaderMaterial {
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
      uniform float uTime;
      uniform float uScale;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float tw = 0.8 + 0.2 * sin(uTime * (0.5 + fract(aPhase * 0.618) * 2.4) + aPhase);
        vColor = aColor;
        vAlpha = aAlpha * tw;
        gl_PointSize = clamp(aSize * uScale / -mv.z, 0.0, 220.0);
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
    depthTest: opts.depthTest ?? true,
    blending: THREE.AdditiveBlending,
  })
}

/** Set the material-wide alpha multiplier (fade a whole glow layer in/out). */
export function setGlowGlobal(mat: THREE.ShaderMaterial, value: number) {
  mat.uniforms.uGlobal.value = value
}

/** Update uScale so world-space sizes stay correct as fov / viewport change. */
export function updateGlowScale(
  mat: THREE.ShaderMaterial,
  camera: THREE.Camera,
  viewportHeightPx: number,
  time: number,
) {
  const cam = camera as THREE.PerspectiveCamera
  const fovRad = ((cam.fov ?? 55) * Math.PI) / 180
  mat.uniforms.uScale.value = viewportHeightPx / (2 * Math.tan(fovRad / 2))
  mat.uniforms.uTime.value = time
}
