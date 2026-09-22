/**
 * Flow Studio — <ToonOutlineRenderer/> (SPEC §7, F5).
 *
 * Inverted-hull silhouette outlines via three-stdlib's OutlineEffect,
 * packaged as a reusable R3F component (pattern lifted from
 * scenes/act4/Act4_1_C.tsx). Two modes:
 *
 * - default: takes over the render loop (useFrame priority 1) and draws the
 *   scene + outlines in one `effect.render()` call. Use when there is no
 *   EffectComposer in the scene.
 *
 * - `overlay`: for scenes that DO run an EffectComposer. The composer owns
 *   priority 1; this component runs after it (priority 2), re-primes the
 *   default framebuffer's depth with a color-write-off scene pass (the
 *   composer's fullscreen output pass leaves no usable scene depth), then
 *   calls `effect.renderOutline()` so crisp ink lines land on top of the
 *   post-processed image without being bloomed or vignetted away.
 *
 * Works in live mode and in Remotion render mode — it only needs the R3F
 * `gl/scene/camera`, which both pipelines provide.
 *
 * Per-mesh overrides still work via three's standard
 * `material.userData.outlineParameters = { thickness, color, alpha, visible }`.
 */
import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { OutlineEffect } from 'three-stdlib'

export type ToonOutlineRendererProps = {
  /** Outline thickness in NDC-ish units (three's OutlineEffect convention). Default 0.003. */
  thickness?: number
  /** Outline color. Default near-black ink. */
  color?: THREE.ColorRepresentation
  /** Outline opacity. Default 1. */
  alpha?: number
  /**
   * Set when the scene also mounts an EffectComposer: outlines are then drawn
   * as an extra pass on top of the composer output instead of owning the
   * whole render. Default false.
   */
  overlay?: boolean
  /**
   * useFrame priority. Defaults to 1 (take over rendering) or 2 in overlay
   * mode (run after the composer, which renders at priority 1).
   */
  renderPriority?: number
}

export function ToonOutlineRenderer({
  thickness = 0.003,
  color = '#000000',
  alpha = 1,
  overlay = false,
  renderPriority,
}: ToonOutlineRendererProps) {
  const gl = useThree((s) => s.gl)

  const effect = useMemo(
    () =>
      new OutlineEffect(gl, {
        defaultThickness: thickness,
        defaultColor: new THREE.Color(color).toArray() as [number, number, number],
        defaultAlpha: alpha,
        defaultKeepAlive: true,
      }),
    [gl, thickness, color, alpha],
  )

  // Depth-only override material for the overlay pre-pass.
  const depthPrimeMat = useMemo(
    () => new THREE.MeshBasicMaterial({ colorWrite: false }),
    [],
  )

  const priority = renderPriority ?? (overlay ? 2 : 1)

  useFrame(({ gl: renderer, scene, camera }) => {
    if (!overlay) {
      // Priority > 0 makes R3F skip its default render; we own the frame.
      effect.render(scene, camera)
      return
    }
    // Overlay mode: the composer already presented the frame. Rebuild scene
    // depth in the default framebuffer, then draw only the outline hulls.
    const prevAutoClear = renderer.autoClear
    const prevOverride = scene.overrideMaterial
    renderer.autoClear = false
    renderer.setRenderTarget(null)
    renderer.clearDepth()
    scene.overrideMaterial = depthPrimeMat
    renderer.render(scene, camera)
    scene.overrideMaterial = prevOverride
    effect.renderOutline(scene, camera)
    renderer.autoClear = prevAutoClear
  }, priority)

  return null
}
