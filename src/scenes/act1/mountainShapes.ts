import * as THREE from 'three'

/**
 * Mountain ridge silhouettes matching the shapes used in Scene 1 (Act 1.1)
 * MountainLayer.tsx. The original lives in SVG space (1920×1080, Y-down);
 * these helpers convert the same peak data to centered, Y-up THREE.Shape
 * silhouettes so they can be rendered as flat planes in 3D scenes.
 */

type Peak = { x: number; y: number }

interface RidgeOptions {
  peaks: Peak[]
  baseY: number
  svgWidth: number
  targetWidth: number
  targetMaxHeight: number
}

function buildRidgeShape({
  peaks,
  baseY,
  svgWidth,
  targetWidth,
  targetMaxHeight,
}: RidgeOptions): THREE.Shape {
  const sx = targetWidth / svgWidth
  const peakTop = Math.min(...peaks.map(p => p.y))
  const sy = targetMaxHeight / (baseY - peakTop)

  // SVG(px, Y-down) → world (centered X, Y-up, base at 0)
  const tx = (x: number) => (x - svgWidth / 2) * sx
  const ty = (y: number) => (baseY - y) * sy

  const shape = new THREE.Shape()
  shape.moveTo(tx(-50), ty(baseY))

  const first = peaks[0]
  shape.bezierCurveTo(
    tx(first.x * 0.15), ty(baseY),
    tx(first.x * 0.5), ty(first.y + (baseY - first.y) * 0.1),
    tx(first.x), ty(first.y),
  )

  for (let i = 1; i < peaks.length; i++) {
    const prev = peaks[i - 1]
    const curr = peaks[i]
    const midX = (prev.x + curr.x) / 2
    const valleyY = Math.max(prev.y, curr.y) + (baseY - Math.max(prev.y, curr.y)) * 0.6
    const cp1x = prev.x + (midX - prev.x) * 0.6
    const cp2x = midX - (midX - prev.x) * 0.15
    shape.bezierCurveTo(
      tx(cp1x), ty(prev.y + (valleyY - prev.y) * 0.1),
      tx(cp2x), ty(valleyY),
      tx(midX), ty(valleyY),
    )
    const cp3x = midX + (curr.x - midX) * 0.15
    const cp4x = curr.x - (curr.x - midX) * 0.6
    shape.bezierCurveTo(
      tx(cp3x), ty(valleyY),
      tx(cp4x), ty(curr.y + (valleyY - curr.y) * 0.1),
      tx(curr.x), ty(curr.y),
    )
  }

  const last = peaks[peaks.length - 1]
  shape.bezierCurveTo(
    tx(last.x + (svgWidth - last.x) * 0.5), ty(last.y + (baseY - last.y) * 0.1),
    tx(svgWidth - 100), ty(baseY),
    tx(svgWidth + 50), ty(baseY),
  )

  // Skirt below baseline so the silhouette extends into the ground
  shape.lineTo(tx(svgWidth + 50), ty(baseY + 50))
  shape.lineTo(tx(-50), ty(baseY + 50))
  shape.closePath()

  return shape
}

// Range 1 (farthest layer in Scene 1) — big Baekdu-ish ridge
export function createFarMountainShape(targetWidth = 80, targetMaxHeight = 8): THREE.Shape {
  return buildRidgeShape({
    peaks: [
      { x: 200, y: 570 },
      { x: 500, y: 520 },
      { x: 800, y: 550 },
      { x: 1150, y: 510 },
      { x: 1550, y: 540 },
    ],
    baseY: 810,
    svgWidth: 1920,
    targetWidth,
    targetMaxHeight,
  })
}

// Range 3 — gentler mid-range ridge with fewer peaks
export function createMidMountainShape(targetWidth = 70, targetMaxHeight = 5): THREE.Shape {
  return buildRidgeShape({
    peaks: [
      { x: 220, y: 720 },
      { x: 600, y: 700 },
      { x: 1300, y: 700 },
      { x: 1650, y: 720 },
    ],
    baseY: 930,
    svgWidth: 1920,
    targetWidth,
    targetMaxHeight,
  })
}

// Range 4 — nearest, lowest rolling hills
export function createNearMountainShape(targetWidth = 60, targetMaxHeight = 3): THREE.Shape {
  return buildRidgeShape({
    peaks: [
      { x: 450, y: 760 },
      { x: 1350, y: 730 },
    ],
    baseY: 970,
    svgWidth: 1920,
    targetWidth,
    targetMaxHeight,
  })
}

/**
 * Range 2 — Baekdu Mountain with the Cheonji crater lake.
 * Returns three co-scaled shapes: the outer silhouette, the darker crater
 * wall rim, and the lake itself. Same scaling applies to all three so they
 * nest correctly when layered.
 */
export function createBaekduMountainShapes(targetWidth = 80, targetMaxHeight = 12) {
  const svgWidth = 1920
  const baseY = 850
  const peakTop = 502
  const sx = targetWidth / svgWidth
  const sy = targetMaxHeight / (baseY - peakTop)
  const tx = (x: number) => (x - svgWidth / 2) * sx
  const ty = (y: number) => (baseY - y) * sy

  const silhouette = new THREE.Shape()
  silhouette.moveTo(tx(-50), ty(850))
  silhouette.bezierCurveTo(tx(100), ty(845), tx(200), ty(830), tx(320), ty(800))
  silhouette.bezierCurveTo(tx(420), ty(760), tx(530), ty(680), tx(620), ty(580))
  silhouette.bezierCurveTo(tx(660), ty(545), tx(690), ty(520), tx(720), ty(508))
  silhouette.bezierCurveTo(tx(735), ty(503), tx(745), ty(505), tx(755), ty(502))
  silhouette.bezierCurveTo(tx(790), ty(530), tx(840), ty(590), tx(900), ty(625))
  silhouette.bezierCurveTo(tx(930), ty(635), tx(980), ty(638), tx(960), ty(638))
  silhouette.bezierCurveTo(tx(990), ty(638), tx(1020), ty(635), tx(1020), ty(635))
  silhouette.bezierCurveTo(tx(1080), ty(590), tx(1130), ty(530), tx(1165), ty(502))
  silhouette.bezierCurveTo(tx(1175), ty(505), tx(1185), ty(503), tx(1200), ty(508))
  silhouette.bezierCurveTo(tx(1230), ty(520), tx(1260), ty(545), tx(1300), ty(580))
  silhouette.bezierCurveTo(tx(1390), ty(680), tx(1500), ty(760), tx(1600), ty(800))
  silhouette.bezierCurveTo(tx(1720), ty(830), tx(1820), ty(845), tx(1970), ty(850))
  silhouette.lineTo(tx(1970), ty(1080))
  silhouette.lineTo(tx(-50), ty(1080))
  silhouette.closePath()

  const craterWall = new THREE.Shape()
  craterWall.moveTo(tx(755), ty(502))
  craterWall.bezierCurveTo(tx(790), ty(530), tx(840), ty(565), tx(900), ty(600))
  craterWall.bezierCurveTo(tx(930), ty(615), tx(960), ty(620), tx(960), ty(620))
  craterWall.bezierCurveTo(tx(990), ty(620), tx(1020), ty(615), tx(1020), ty(600))
  craterWall.bezierCurveTo(tx(1080), ty(565), tx(1130), ty(530), tx(1165), ty(502))
  craterWall.bezierCurveTo(tx(1100), ty(510), tx(1020), ty(518), tx(960), ty(520))
  craterWall.bezierCurveTo(tx(900), ty(518), tx(820), ty(510), tx(755), ty(502))
  craterWall.closePath()

  const cheonji = new THREE.Shape()
  cheonji.moveTo(tx(790), ty(535))
  cheonji.bezierCurveTo(tx(820), ty(565), tx(870), ty(600), tx(925), ty(622))
  cheonji.bezierCurveTo(tx(950), ty(630), tx(975), ty(632), tx(960), ty(632))
  cheonji.bezierCurveTo(tx(985), ty(632), tx(1000), ty(630), tx(995), ty(622))
  cheonji.bezierCurveTo(tx(1050), ty(600), tx(1100), ty(565), tx(1130), ty(535))
  cheonji.bezierCurveTo(tx(1085), ty(527), tx(1020), ty(522), tx(960), ty(520))
  cheonji.bezierCurveTo(tx(900), ty(522), tx(835), ty(527), tx(790), ty(535))
  cheonji.closePath()

  return { silhouette, craterWall, cheonji }
}
