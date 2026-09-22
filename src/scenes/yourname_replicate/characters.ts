/**
 * Canvas-drawn anime silhouettes for Taki and Mitsuha.
 *
 * Each figure renders into an offscreen 2D canvas: the silhouette itself
 * is filled near-black, then a rim-light gradient is overlaid on the
 * sun-facing edge so each character reads as backlit against the beam.
 * The canvases are wrapped in THREE.CanvasTexture and applied to
 * transparent planes in the scene.
 *
 * Proportions are deliberately chunky rather than realistic — the figures
 * need to read as solid silhouettes *after* the heavy bloom pass eats a
 * pixel or two off every edge.
 */

import * as THREE from 'three'

const W = 1024
const H = 2048
const SILHOUETTE = '#03020A'
const RIM_WARM   = 'rgba(255, 200, 135, 0.50)'
const RIM_HOT    = 'rgba(255, 232, 195, 0.80)'

/* ─── Taki — hoodie, reaching right toward the beam ────────────────── */
function drawTaki(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = SILHOUETTE
  const cx = W * 0.46
  const h  = H

  // ── Legs + pants (back leg slightly behind) ──
  ctx.beginPath()
  // Back leg
  ctx.moveTo(cx - 0.11 * W, h * 0.52)
  ctx.bezierCurveTo(
    cx - 0.13 * W, h * 0.70,
    cx - 0.12 * W, h * 0.90,
    cx - 0.10 * W, h * 0.995
  )
  ctx.lineTo(cx - 0.02 * W, h * 0.995)
  ctx.bezierCurveTo(
    cx - 0.02 * W, h * 0.88,
    cx - 0.03 * W, h * 0.70,
    cx - 0.03 * W, h * 0.52
  )
  ctx.closePath()
  ctx.fill()

  ctx.beginPath()
  // Front leg (slightly forward/outward)
  ctx.moveTo(cx + 0.00 * W, h * 0.52)
  ctx.bezierCurveTo(
    cx + 0.01 * W, h * 0.70,
    cx + 0.03 * W, h * 0.88,
    cx + 0.05 * W, h * 0.995
  )
  ctx.lineTo(cx + 0.13 * W, h * 0.995)
  ctx.bezierCurveTo(
    cx + 0.14 * W, h * 0.90,
    cx + 0.13 * W, h * 0.72,
    cx + 0.12 * W, h * 0.52
  )
  ctx.closePath()
  ctx.fill()

  // ── Shoes ──
  ctx.beginPath()
  ctx.ellipse(cx - 0.055 * W, h * 0.995, 0.065 * W, 0.015 * H, 0, 0, Math.PI * 2)
  ctx.ellipse(cx + 0.095 * W, h * 0.995, 0.065 * W, 0.015 * H, 0, 0, Math.PI * 2)
  ctx.fill()

  // ── Torso — hoodie, boxy, hood peak behind neck ──
  ctx.beginPath()
  ctx.moveTo(cx - 0.15 * W, h * 0.52)    // hip left
  ctx.lineTo(cx - 0.18 * W, h * 0.35)    // waist
  ctx.bezierCurveTo(
    cx - 0.20 * W, h * 0.28,
    cx - 0.20 * W, h * 0.24,
    cx - 0.15 * W, h * 0.205
  )
  ctx.lineTo(cx - 0.08 * W, h * 0.19)    // shoulder-left
  ctx.lineTo(cx - 0.03 * W, h * 0.18)    // hood base behind neck
  ctx.bezierCurveTo(
    cx + 0.00 * W, h * 0.195,
    cx + 0.02 * W, h * 0.195,
    cx + 0.05 * W, h * 0.20             // hood top
  )
  ctx.lineTo(cx + 0.14 * W, h * 0.215)   // shoulder-right
  ctx.bezierCurveTo(
    cx + 0.19 * W, h * 0.25,
    cx + 0.20 * W, h * 0.32,
    cx + 0.17 * W, h * 0.38
  )
  ctx.lineTo(cx + 0.15 * W, h * 0.52)    // hip right
  ctx.closePath()
  ctx.fill()

  // ── Hood crown (oval behind head) ──
  ctx.beginPath()
  ctx.ellipse(cx + 0.00 * W, h * 0.185, 0.11 * W, 0.045 * H, -0.08, 0, Math.PI * 2)
  ctx.fill()

  // ── Back arm (viewer-left) hanging at side ──
  ctx.beginPath()
  ctx.moveTo(cx - 0.19 * W, h * 0.225)
  ctx.bezierCurveTo(
    cx - 0.22 * W, h * 0.30,
    cx - 0.23 * W, h * 0.42,
    cx - 0.21 * W, h * 0.54
  )
  ctx.lineTo(cx - 0.14 * W, h * 0.54)
  ctx.bezierCurveTo(
    cx - 0.14 * W, h * 0.42,
    cx - 0.14 * W, h * 0.30,
    cx - 0.14 * W, h * 0.235
  )
  ctx.closePath()
  ctx.fill()

  // ── Front arm: shoulder → elbow → hand extended toward the beam ──
  ctx.beginPath()
  // Upper arm from shoulder (cx+0.13) down-right to elbow (cx+0.22, 0.33)
  ctx.moveTo(cx + 0.12 * W, h * 0.215)
  ctx.lineTo(cx + 0.22 * W, h * 0.32)
  // Elbow → forearm going up-right to the hand (cx+0.35, 0.22)
  ctx.lineTo(cx + 0.36 * W, h * 0.22)
  // Hand tip
  ctx.lineTo(cx + 0.40 * W, h * 0.215)
  // Hand underside
  ctx.lineTo(cx + 0.38 * W, h * 0.245)
  // Forearm back
  ctx.lineTo(cx + 0.24 * W, h * 0.355)
  // Bicep underside back toward armpit
  ctx.lineTo(cx + 0.15 * W, h * 0.30)
  ctx.closePath()
  ctx.fill()

  // Hand (knob at tip)
  ctx.beginPath()
  ctx.ellipse(cx + 0.395 * W, h * 0.225, 0.03 * W, 0.022 * H, 0.15, 0, Math.PI * 2)
  ctx.fill()

  // ── Head ──
  ctx.beginPath()
  ctx.ellipse(cx + 0.015 * W, h * 0.15, 0.075 * W, 0.055 * H, 0, 0, Math.PI * 2)
  ctx.fill()

  // ── Hair — spiky, slightly messy, asymmetric bangs ──
  ctx.beginPath()
  ctx.moveTo(cx - 0.065 * W, h * 0.155)
  ctx.bezierCurveTo(
    cx - 0.085 * W, h * 0.12,
    cx - 0.06 * W,  h * 0.085,
    cx - 0.02 * W,  h * 0.095
  )
  // Spiky top
  ctx.lineTo(cx + 0.00 * W, h * 0.075)
  ctx.lineTo(cx + 0.03 * W, h * 0.095)
  ctx.lineTo(cx + 0.05 * W, h * 0.083)
  ctx.lineTo(cx + 0.075 * W, h * 0.105)
  ctx.bezierCurveTo(
    cx + 0.095 * W, h * 0.13,
    cx + 0.09 * W,  h * 0.15,
    cx + 0.075 * W, h * 0.155
  )
  // Bangs across forehead (covering eye region)
  ctx.lineTo(cx + 0.04 * W, h * 0.155)
  ctx.lineTo(cx + 0.01 * W, h * 0.16)
  ctx.lineTo(cx - 0.03 * W, h * 0.16)
  ctx.lineTo(cx - 0.065 * W, h * 0.155)
  ctx.closePath()
  ctx.fill()

  // ── Rim light: right-facing edge catches horizon sun ──
  const rimGrad = ctx.createLinearGradient(cx + 0.12 * W, 0, cx + 0.42 * W, 0)
  rimGrad.addColorStop(0,   'rgba(255, 240, 210, 0)')
  rimGrad.addColorStop(0.5, RIM_WARM)
  rimGrad.addColorStop(1,   'rgba(255, 240, 210, 0)')
  ctx.globalCompositeOperation = 'source-atop'
  ctx.fillStyle = rimGrad
  ctx.fillRect(cx + 0.10 * W, 0, 0.35 * W, H)
  ctx.globalCompositeOperation = 'source-over'
}

/* ─── Mitsuha — school uniform, hands at chin ──────────────────────── */
function drawMitsuha(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = SILHOUETTE
  const cx = W * 0.50
  const h  = H

  // ── Thighs (visible between skirt and socks) ──
  ctx.beginPath()
  ctx.moveTo(cx - 0.08 * W, h * 0.64)
  ctx.bezierCurveTo(
    cx - 0.085 * W, h * 0.74,
    cx - 0.08 * W,  h * 0.80,
    cx - 0.07 * W,  h * 0.80
  )
  ctx.lineTo(cx - 0.02 * W, h * 0.80)
  ctx.bezierCurveTo(
    cx - 0.02 * W, h * 0.74,
    cx - 0.03 * W, h * 0.68,
    cx - 0.03 * W, h * 0.64
  )
  ctx.closePath()
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(cx + 0.03 * W, h * 0.64)
  ctx.bezierCurveTo(
    cx + 0.03 * W, h * 0.68,
    cx + 0.02 * W, h * 0.74,
    cx + 0.02 * W, h * 0.80
  )
  ctx.lineTo(cx + 0.07 * W, h * 0.80)
  ctx.bezierCurveTo(
    cx + 0.08 * W, h * 0.80,
    cx + 0.085 * W, h * 0.74,
    cx + 0.08 * W, h * 0.64
  )
  ctx.closePath()
  ctx.fill()

  // ── Knee-high socks ──
  ctx.beginPath()
  ctx.moveTo(cx - 0.075 * W, h * 0.80)
  ctx.lineTo(cx - 0.078 * W, h * 0.99)
  ctx.lineTo(cx - 0.02 * W, h * 0.99)
  ctx.lineTo(cx - 0.02 * W, h * 0.80)
  ctx.closePath()
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(cx + 0.02 * W, h * 0.80)
  ctx.lineTo(cx + 0.02 * W, h * 0.99)
  ctx.lineTo(cx + 0.078 * W, h * 0.99)
  ctx.lineTo(cx + 0.075 * W, h * 0.80)
  ctx.closePath()
  ctx.fill()

  // ── Shoes (Mary Jane flats) ──
  ctx.beginPath()
  ctx.ellipse(cx - 0.050 * W, h * 0.995, 0.050 * W, 0.014 * H, 0, 0, Math.PI * 2)
  ctx.ellipse(cx + 0.050 * W, h * 0.995, 0.050 * W, 0.014 * H, 0, 0, Math.PI * 2)
  ctx.fill()

  // ── Pleated skirt ──
  ctx.beginPath()
  ctx.moveTo(cx - 0.125 * W, h * 0.64)      // hem left
  ctx.lineTo(cx - 0.105 * W, h * 0.495)     // waist left
  ctx.lineTo(cx + 0.105 * W, h * 0.495)     // waist right
  ctx.lineTo(cx + 0.135 * W, h * 0.64)      // hem right
  // Scalloped pleat hem
  for (let i = 5; i >= 0; i--) {
    const x1 = cx + (0.135 - (6 - i) * 0.045) * W
    ctx.lineTo(x1 + 0.012 * W, h * 0.652)
    ctx.lineTo(x1, h * 0.64)
  }
  ctx.closePath()
  ctx.fill()

  // ── Torso — fitted cardigan/blazer ──
  ctx.beginPath()
  ctx.moveTo(cx - 0.105 * W, h * 0.495)
  ctx.bezierCurveTo(
    cx - 0.12 * W,  h * 0.42,
    cx - 0.13 * W,  h * 0.34,
    cx - 0.12 * W,  h * 0.30
  )
  ctx.lineTo(cx - 0.06 * W, h * 0.28)       // shoulder-left
  ctx.lineTo(cx - 0.015 * W, h * 0.268)     // collar-left
  ctx.lineTo(cx + 0.015 * W, h * 0.27)      // collar-right
  ctx.lineTo(cx + 0.065 * W, h * 0.285)
  ctx.lineTo(cx + 0.12 * W, h * 0.305)      // shoulder-right
  ctx.bezierCurveTo(
    cx + 0.13 * W, h * 0.35,
    cx + 0.125 * W, h * 0.43,
    cx + 0.11 * W, h * 0.495
  )
  ctx.closePath()
  ctx.fill()

  // ── Left arm (viewer-left, toward sun) ──
  ctx.beginPath()
  ctx.moveTo(cx - 0.12 * W, h * 0.305)
  ctx.bezierCurveTo(
    cx - 0.17 * W, h * 0.35,
    cx - 0.17 * W, h * 0.42,
    cx - 0.12 * W, h * 0.43                // elbow
  )
  ctx.bezierCurveTo(
    cx - 0.09 * W, h * 0.38,
    cx - 0.05 * W, h * 0.32,
    cx - 0.02 * W, h * 0.295               // hand near chin
  )
  ctx.lineTo(cx - 0.00 * W, h * 0.278)
  ctx.lineTo(cx - 0.03 * W, h * 0.280)
  ctx.lineTo(cx - 0.07 * W, h * 0.33)
  ctx.bezierCurveTo(
    cx - 0.11 * W, h * 0.38,
    cx - 0.10 * W, h * 0.405,
    cx - 0.08 * W, h * 0.40
  )
  ctx.closePath()
  ctx.fill()

  // ── Right arm (viewer-right) also raised ──
  ctx.beginPath()
  ctx.moveTo(cx + 0.12 * W, h * 0.305)
  ctx.bezierCurveTo(
    cx + 0.16 * W, h * 0.38,
    cx + 0.14 * W, h * 0.45,
    cx + 0.09 * W, h * 0.43
  )
  ctx.bezierCurveTo(
    cx + 0.06 * W, h * 0.37,
    cx + 0.025 * W, h * 0.32,
    cx + 0.005 * W, h * 0.295             // hand near chin
  )
  ctx.lineTo(cx + 0.03 * W, h * 0.282)
  ctx.lineTo(cx + 0.06 * W, h * 0.33)
  ctx.bezierCurveTo(
    cx + 0.10 * W, h * 0.38,
    cx + 0.11 * W, h * 0.41,
    cx + 0.095 * W, h * 0.40
  )
  ctx.closePath()
  ctx.fill()

  // ── Head ──
  ctx.beginPath()
  ctx.ellipse(cx + 0.00 * W, h * 0.225, 0.068 * W, 0.052 * H, 0, 0, Math.PI * 2)
  ctx.fill()

  // ── Hair — chin-length bob ──
  ctx.beginPath()
  // Crown, moving clockwise from left-back
  ctx.moveTo(cx - 0.080 * W, h * 0.225)
  ctx.bezierCurveTo(
    cx - 0.095 * W, h * 0.185,
    cx - 0.065 * W, h * 0.145,
    cx - 0.015 * W, h * 0.158
  )
  ctx.bezierCurveTo(
    cx + 0.015 * W, h * 0.148,
    cx + 0.055 * W, h * 0.155,
    cx + 0.075 * W, h * 0.185
  )
  // Right side sweep down
  ctx.bezierCurveTo(
    cx + 0.090 * W, h * 0.215,
    cx + 0.088 * W, h * 0.260,
    cx + 0.065 * W, h * 0.280
  )
  // Under chin (skipping face zone)
  ctx.lineTo(cx + 0.03 * W, h * 0.290)
  ctx.lineTo(cx - 0.035 * W, h * 0.283)
  ctx.bezierCurveTo(
    cx - 0.080 * W, h * 0.278,
    cx - 0.095 * W, h * 0.258,
    cx - 0.080 * W, h * 0.225
  )
  ctx.closePath()
  ctx.fill()

  // Bangs swept across forehead
  ctx.beginPath()
  ctx.moveTo(cx - 0.058 * W, h * 0.195)
  ctx.bezierCurveTo(
    cx - 0.04 * W, h * 0.22,
    cx + 0.01 * W, h * 0.22,
    cx + 0.035 * W, h * 0.213
  )
  ctx.lineTo(cx + 0.050 * W, h * 0.195)
  ctx.lineTo(cx + 0.030 * W, h * 0.175)
  ctx.lineTo(cx - 0.025 * W, h * 0.175)
  ctx.closePath()
  ctx.fill()

  // ── Rim light: LEFT edge catches sun (she faces left toward the boy) ──
  const rimGrad = ctx.createLinearGradient(cx - 0.17 * W, 0, cx + 0.02 * W, 0)
  rimGrad.addColorStop(0,   'rgba(255, 240, 210, 0)')
  rimGrad.addColorStop(0.5, RIM_HOT)
  rimGrad.addColorStop(1,   'rgba(255, 240, 210, 0)')
  ctx.globalCompositeOperation = 'source-atop'
  ctx.fillStyle = rimGrad
  ctx.fillRect(cx - 0.18 * W, 0, 0.22 * W, H)
  ctx.globalCompositeOperation = 'source-over'
}

/* ─── Public: build each figure's texture ──────────────────────────── */
function buildTexture(draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  draw(ctx)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  tex.needsUpdate = true
  return tex
}

export function takiTexture(): THREE.CanvasTexture { return buildTexture(drawTaki) }
export function mitsuhaTexture(): THREE.CanvasTexture { return buildTexture(drawMitsuha) }

/* ─── Rocks — procedural jagged silhouette across the foreground ──── */
export function rocksTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  const RW = 4096
  const RH = 1024
  canvas.width = RW
  canvas.height = RH
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, RW, RH)
  ctx.fillStyle = '#07050D'

  // Jagged top edge — multi-octave random walk, but smoother than grass
  ctx.beginPath()
  ctx.moveTo(0, RH)
  ctx.lineTo(0, RH * 0.55)
  const steps = 110
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    // Slow undulation — defines overall rocky plateau
    const bulk = Math.sin(t * 2.7) * RH * 0.06 + Math.sin(t * 5.1 + 0.8) * RH * 0.03
    // Medium-scale jags
    const med = (Math.sin(t * 14.0 + Math.random() * 0.3) * 0.5 + 0.5 - 0.5) * RH * 0.05
    // Fine jitter
    const fine = (Math.random() - 0.5) * RH * 0.04
    // Character platform bumps (elevated rocks where each figure stands)
    const platA = Math.exp(-Math.pow((t - 0.42) * 22.0, 2)) * RH * -0.06
    const platB = Math.exp(-Math.pow((t - 0.60) * 26.0, 2)) * RH * -0.05
    const y = RH * 0.55 + bulk + med + fine + platA + platB
    ctx.lineTo(t * RW, y)
  }
  ctx.lineTo(RW, RH)
  ctx.closePath()
  ctx.fill()

  // Scatter of boulders for additional silhouette detail
  for (let i = 0; i < 28; i++) {
    const x = Math.random() * RW
    const baseY = RH * 0.70 + Math.random() * RH * 0.22
    const r = 45 + Math.random() * 130
    ctx.beginPath()
    ctx.moveTo(x - r, baseY)
    for (let a = 0; a <= 10; a++) {
      const theta = (a / 10) * Math.PI
      const rr = r * (0.7 + Math.random() * 0.5)
      ctx.lineTo(x - r + Math.cos(Math.PI - theta) * rr, baseY - Math.sin(theta) * rr * 0.55)
    }
    ctx.closePath()
    ctx.fill()
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  tex.needsUpdate = true
  return tex
}
