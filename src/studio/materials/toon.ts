/**
 * Flow Studio — toon material toolkit (SPEC §7, F5).
 *
 * Banded cel shading built on THREE.MeshToonMaterial:
 *   - makeToonRamp(stops)  → NearestFilter DataTexture gradient map
 *   - toonMaterial(opts)   → configured MeshToonMaterial (+ optional rim)
 *   - applyRimLight(mat)   → fresnel rim term injected via onBeforeCompile
 *   - <ToonSwap/>          → scene-graph pass that pairs every
 *                            MeshStandardMaterial with a MeshToonMaterial and
 *                            mirrors animated props per frame (generalized
 *                            from scenes/act4/Act4_1_C.tsx)
 *
 * Everything here works identically in live mode and Remotion render mode —
 * no drei dependency, no assumptions about who owns the frame loop.
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/* ────────────────────────────────────────────────────────────────────
 * Gradient ramps
 * ──────────────────────────────────────────────────────────────────── */

/**
 * Build a gradient map for MeshToonMaterial.
 *
 * - `makeToonRamp(3)` → 3 evenly spaced brightness bands.
 * - `makeToonRamp(['#20242E', '#5A6274', '#D8DEE8'])` → one band per stop,
 *   dark→light; each stop's *luminance* becomes the band level (three's toon
 *   shader samples only the red channel of the gradient map, so hue is
 *   flattened — use stops to shape band spacing/contrast, not tint).
 *
 * NearestFilter on both axes gives the hard cel edges. Pass `softness`
 * (0..~0.2) for anime-style soft band transitions: the ramp becomes a
 * 256px LinearFilter texture where each band edge is a smoothstep of
 * that width (Genshin-class cel shading uses ~0.1 — see PRD research).
 */
export function makeToonRamp(stops: string[] | number, softness = 0): THREE.DataTexture {
  let levels: number[]
  if (typeof stops === 'number') {
    const n = Math.max(1, Math.floor(stops))
    levels = Array.from({ length: n }, (_, i) => (i + 0.5) / n)
  } else {
    if (stops.length === 0) throw new Error('makeToonRamp: empty stop list')
    const c = new THREE.Color()
    levels = stops.map((hex) => {
      c.set(hex)
      return THREE.MathUtils.clamp(
        0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b, 0, 1,
      )
    })
  }

  if (softness <= 0) {
    const data = new Uint8Array(levels.map((v) => Math.round(v * 255)))
    const tex = new THREE.DataTexture(data, levels.length, 1, THREE.RedFormat)
    tex.magFilter = THREE.NearestFilter
    tex.minFilter = THREE.NearestFilter
    tex.generateMipmaps = false
    tex.needsUpdate = true
    return tex
  }

  // Soft-band ramp: sample the step function at 256px, easing each band
  // edge over `softness` of the 0..1 domain.
  const W = 256
  const n = levels.length
  const smooth = (e0: number, e1: number, x: number) => {
    const t = THREE.MathUtils.clamp((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)
  }
  const data = new Uint8Array(W)
  for (let i = 0; i < W; i++) {
    const x = (i + 0.5) / W
    let v = levels[0]
    for (let b = 1; b < n; b++) {
      const edge = b / n
      v += (levels[b] - levels[b - 1]) * smooth(edge - softness / 2, edge + softness / 2, x)
    }
    data[i] = Math.round(THREE.MathUtils.clamp(v, 0, 1) * 255)
  }
  const tex = new THREE.DataTexture(data, W, 1, THREE.RedFormat)
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true
  return tex
}

/* ────────────────────────────────────────────────────────────────────
 * Rim light (fresnel term injected into any lit built-in material)
 * ──────────────────────────────────────────────────────────────────── */

export type RimLightOptions = {
  /** Rim color. Default a cool sky blue. */
  color?: THREE.ColorRepresentation
  /** Fresnel exponent — higher = thinner rim. Default 2.5. */
  power?: number
  /** Rim brightness multiplier. Default 1. */
  intensity?: number
}

type RimUniforms = {
  uFlowRimColor: { value: THREE.Color }
  uFlowRimPower: { value: number }
  uFlowRimIntensity: { value: number }
}

const RIM_PARS = /* glsl */ `
uniform vec3 uFlowRimColor;
uniform float uFlowRimPower;
uniform float uFlowRimIntensity;
`

const RIM_TERM = /* glsl */ `
{
  float flowRimFacing = 1.0 - saturate( dot( normalize( vViewPosition ), normal ) );
  outgoingLight += uFlowRimColor * uFlowRimIntensity * pow( flowRimFacing, uFlowRimPower );
}
`

/**
 * Inject a fresnel rim-light term into a built-in lit material (MeshToon /
 * MeshStandard / MeshLambert / MeshPhong) via onBeforeCompile. The rim adds
 * to `outgoingLight` just before the output stage, so it survives fog, tone
 * mapping and both live and Remotion render pipelines (compilation happens on
 * whichever renderer draws the material first).
 *
 * Calling it again on the same material just updates color/power/intensity.
 * Uniforms are also reachable at `material.userData.flowRim` for per-frame
 * animation.
 */
export function applyRimLight<M extends THREE.Material>(
  material: M,
  opts: RimLightOptions = {},
): M {
  const existing = material.userData.flowRim as RimUniforms | undefined
  if (existing) {
    if (opts.color != null) existing.uFlowRimColor.value.set(opts.color)
    if (opts.power != null) existing.uFlowRimPower.value = opts.power
    if (opts.intensity != null) existing.uFlowRimIntensity.value = opts.intensity
    return material
  }

  const uniforms: RimUniforms = {
    uFlowRimColor: { value: new THREE.Color(opts.color ?? '#9AD7FF') },
    uFlowRimPower: { value: opts.power ?? 2.5 },
    uFlowRimIntensity: { value: opts.intensity ?? 1 },
  }
  material.userData.flowRim = uniforms

  const prevOnBeforeCompile = material.onBeforeCompile
  const prevCacheKey = material.customProgramCacheKey.bind(material)

  material.onBeforeCompile = (shader, renderer) => {
    prevOnBeforeCompile?.call(material, shader, renderer)
    shader.uniforms.uFlowRimColor = uniforms.uFlowRimColor
    shader.uniforms.uFlowRimPower = uniforms.uFlowRimPower
    shader.uniforms.uFlowRimIntensity = uniforms.uFlowRimIntensity
    // Output chunk was renamed output_fragment → opaque_fragment in r154;
    // handle both so the injection is version-tolerant.
    const anchor = shader.fragmentShader.includes('#include <opaque_fragment>')
      ? '#include <opaque_fragment>'
      : '#include <output_fragment>'
    shader.fragmentShader = RIM_PARS + shader.fragmentShader.replace(
      anchor,
      RIM_TERM + '\n' + anchor,
    )
  }
  material.customProgramCacheKey = () => prevCacheKey() + '|flowRim'
  material.needsUpdate = true
  return material
}

/* ────────────────────────────────────────────────────────────────────
 * toonMaterial
 * ──────────────────────────────────────────────────────────────────── */

export type ToonMaterialOptions = {
  color: THREE.ColorRepresentation
  /** Number of shading bands (ignored when `ramp` is given). Default 3. */
  bands?: number
  /** Explicit gradient map — overrides `bands`. See makeToonRamp(). */
  ramp?: THREE.Texture
  emissive?: THREE.ColorRepresentation
  emissiveIntensity?: number
  map?: THREE.Texture | null
  transparent?: boolean
  opacity?: number
  side?: THREE.Side
  /** Add a fresnel rim light (see applyRimLight). */
  rim?: RimLightOptions
}

/** Build a MeshToonMaterial with a banded gradient map (and optional rim). */
export function toonMaterial(opts: ToonMaterialOptions): THREE.MeshToonMaterial {
  const {
    color, bands = 3, ramp, emissive, emissiveIntensity,
    map, transparent, opacity, side, rim,
  } = opts
  const mat = new THREE.MeshToonMaterial({
    color,
    gradientMap: ramp ?? makeToonRamp(bands),
    emissive: emissive ?? 0x000000,
    emissiveIntensity: emissiveIntensity ?? 1,
    map: map ?? null,
    transparent: transparent ?? false,
    opacity: opacity ?? 1,
    side: side ?? THREE.FrontSide,
  })
  if (rim) applyRimLight(mat, rim)
  return mat
}

/* ────────────────────────────────────────────────────────────────────
 * ToonSwap — scene-graph cel-shading pass
 * ──────────────────────────────────────────────────────────────────── */

export type ToonSwapProps = {
  /** Shading bands for the shared gradient map. Default 4. */
  bands?: number
  /** Explicit gradient map — overrides `bands`. */
  ramp?: THREE.Texture
  /** Only swap meshes/materials this predicate accepts (default: all). */
  include?: (mesh: THREE.Mesh, material: THREE.MeshStandardMaterial) => boolean
  /** Never swap meshes/materials this predicate accepts. */
  exclude?: (mesh: THREE.Mesh, material: THREE.MeshStandardMaterial) => boolean
  /** Apply a fresnel rim light to every toon material created by the swap. */
  rim?: RimLightOptions
  /** Restore the original materials when unmounted. Default true. */
  restoreOnUnmount?: boolean
}

/**
 * Traverses the scene every frame, replacing each MeshStandardMaterial with a
 * paired MeshToonMaterial (one toon per source material, so shared materials
 * stay shared). Animated props on the source material — color, opacity,
 * emissive, visibility, side — are mirrored onto its toon twin per frame, so
 * existing animations that mutate the original refs keep driving the look.
 *
 * Emissive MeshBasicMaterial and anything already toon is left untouched.
 */
export function ToonSwap({
  bands = 4,
  ramp,
  include,
  exclude,
  rim,
  restoreOnUnmount = true,
}: ToonSwapProps) {
  const scene = useThree((s) => s.scene)
  const ownRamp = useMemo(() => (ramp ? null : makeToonRamp(bands)), [ramp, bands])
  const gradient = ramp ?? ownRamp!

  // One toon material per original std material (handles shared materials),
  // plus which meshes we touched (for restore on unmount).
  const pairs = useRef(new Map<THREE.MeshStandardMaterial, THREE.MeshToonMaterial>())
  const swappedMeshes = useRef(new Map<THREE.Mesh, THREE.MeshStandardMaterial>())

  useFrame(() => {
    // 1. Discover unmapped MeshStandardMaterials and swap in paired toons.
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      const mat = mesh.material as THREE.Material | THREE.Material[]
      if (Array.isArray(mat)) return
      if (!(mat instanceof THREE.MeshStandardMaterial)) return
      if (include && !include(mesh, mat)) return
      if (exclude && exclude(mesh, mat)) return
      let toon = pairs.current.get(mat)
      if (!toon) {
        toon = new THREE.MeshToonMaterial({
          color: mat.color.clone(),
          map: mat.map ?? undefined,
          emissive: mat.emissive.clone(),
          emissiveIntensity: mat.emissiveIntensity,
          emissiveMap: mat.emissiveMap ?? undefined,
          transparent: mat.transparent,
          opacity: mat.opacity,
          side: mat.side,
          alphaMap: mat.alphaMap ?? undefined,
          alphaTest: mat.alphaTest,
          gradientMap: gradient,
        })
        if (rim) applyRimLight(toon, rim)
        pairs.current.set(mat, toon)
      }
      swappedMeshes.current.set(mesh, mat)
      mesh.material = toon
    })

    // 2. Mirror animated props from each source material onto its toon twin
    //    so existing tweens (which mutate the std refs) keep working.
    pairs.current.forEach((toon, orig) => {
      toon.color.copy(orig.color)
      toon.emissive.copy(orig.emissive)
      toon.emissiveIntensity = orig.emissiveIntensity
      toon.opacity = orig.opacity
      toon.transparent = orig.transparent
      toon.visible = orig.visible
      toon.side = orig.side
    })
  })

  // Restore originals + dispose our materials/ramp on unmount.
  useEffect(() => {
    const pairMap = pairs.current
    const meshMap = swappedMeshes.current
    return () => {
      if (restoreOnUnmount) {
        meshMap.forEach((orig, mesh) => {
          if (mesh.material === pairMap.get(orig)) mesh.material = orig
        })
      }
      pairMap.forEach((toon) => toon.dispose())
      pairMap.clear()
      meshMap.clear()
      ownRamp?.dispose()
    }
  }, [restoreOnUnmount, ownRamp])

  return null
}
