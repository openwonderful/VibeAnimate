import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * GradientEnvironment — a procedural sky, installed as `scene.environment`.
 *
 * WHY
 * The Act 3 rice paddies are set to metalness 0.9 / roughness 0.05, i.e. a
 * mirror. With no environment map there is nothing for them to mirror, so
 * they render as flat near-black rectangles and every `meshStandardMaterial`
 * in the scene loses its ambient bounce. Dropping in a gradient sky is what
 * turns the water into water: it picks up the sunset overhead and the warm
 * band at the horizon, and the whole shot gains a light source it was
 * previously faking with point lights.
 *
 * Built from a canvas rather than an .hdr so it ships with no asset and can
 * be tuned per scene — dusk for 3.1, moonlit night for 3.2. PMREM-filtered
 * so rough materials get correctly blurred reflections.
 */

export interface GradientEnvironmentProps {
  /** Colour straight overhead. */
  zenith: string
  /** Colour at the horizon line. */
  horizon: string
  /** Colour below the horizon (ground bounce). */
  ground: string
  /** Optional warm/bright disc — the sun or moon the water should catch. */
  sun?: {
    color: string
    /** Azimuth in degrees, 0 = −z (straight down the road). */
    azimuthDeg: number
    /** Elevation in degrees above the horizon. */
    elevationDeg: number
    /** Angular radius in degrees. */
    sizeDeg: number
    /** How far the glow spreads beyond the disc, in degrees. */
    glowDeg?: number
  }
  /** Also use it as the visible backdrop. Off by default — these scenes
   *  render their own painted sky behind the canvas. */
  asBackground?: boolean
  /** Scales the reflected intensity without touching the colours. */
  intensity?: number
}

const TEX_W = 1024
const TEX_H = 512

export default function GradientEnvironment({
  zenith,
  horizon,
  ground,
  sun,
  asBackground = false,
  intensity = 1,
}: GradientEnvironmentProps) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)

  const envTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = TEX_W
    canvas.height = TEX_H
    const ctx = canvas.getContext('2d')!

    // Equirectangular: y = 0 is straight up, y = TEX_H is straight down, so
    // the horizon sits on the middle row.
    const grad = ctx.createLinearGradient(0, 0, 0, TEX_H)
    // A broad horizon band, not a hard line: water viewed at a grazing angle
    // mirrors the sky just above the horizon, so that band is what the
    // paddies actually pick up. Too narrow and they reflect the zenith and
    // go cold.
    grad.addColorStop(0, zenith)
    grad.addColorStop(0.30, zenith)
    grad.addColorStop(0.46, horizon)
    grad.addColorStop(0.52, horizon)
    grad.addColorStop(0.62, ground)
    grad.addColorStop(1, ground)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, TEX_W, TEX_H)

    if (sun) {
      // Azimuth 0 points down −z, which is the direction both road scenes
      // travel, and maps to the centre column of the equirect map.
      const x = TEX_W * (0.5 + (sun.azimuthDeg / 360))
      const y = TEX_H * (0.5 - sun.elevationDeg / 180)
      const rDisc = (sun.sizeDeg / 180) * TEX_H
      const rGlow = ((sun.glowDeg ?? sun.sizeDeg * 6) / 180) * TEX_H

      const g = ctx.createRadialGradient(x, y, 0, x, y, rGlow)
      g.addColorStop(0, sun.color)
      g.addColorStop(Math.min(0.999, rDisc / rGlow), sun.color)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, rGlow, 0, Math.PI * 2)
      ctx.fill()
      // Wrap the glow round the seam so a sun near the edge is not clipped.
      ctx.translate(x < TEX_W / 2 ? TEX_W : -TEX_W, 0)
      ctx.beginPath()
      ctx.arc(x, y, rGlow, 0, Math.PI * 2)
      ctx.fill()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.globalCompositeOperation = 'source-over'
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.mapping = THREE.EquirectangularReflectionMapping
    tex.colorSpace = THREE.SRGBColorSpace
    tex.needsUpdate = true
    return tex
  }, [zenith, horizon, ground, sun])

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    pmrem.compileEquirectangularShader()
    const envRT = pmrem.fromEquirectangular(envTexture)

    const prevEnv = scene.environment
    const prevBg = scene.background
    const prevIntensity = scene.environmentIntensity

    scene.environment = envRT.texture
    scene.environmentIntensity = intensity
    if (asBackground) scene.background = envRT.texture

    return () => {
      scene.environment = prevEnv
      scene.environmentIntensity = prevIntensity
      if (asBackground) scene.background = prevBg
      envRT.dispose()
      pmrem.dispose()
    }
  }, [gl, scene, envTexture, asBackground, intensity])

  useEffect(() => () => envTexture.dispose(), [envTexture])

  return null
}
