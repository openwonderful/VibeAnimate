/**
 * SplitPanel — the film's phone-call split screen.
 *
 * A camera-locked panel that slides in from the RIGHT edge of frame to
 * cover the right half, movie-phone-call style, with a divider bar at its
 * leading edge. The rest of the frame is simply the scene behind it — so
 * stage the main subject center-LEFT from the shot's first frame and the
 * panel never covers them (and their empty right half reads as the absence
 * the caller is dialling into).
 *
 * Mechanics: one canvas, no second render pass. The panel is real geometry
 * repositioned every frame into camera space (position + quaternion from
 * camera.matrixWorld), so camera drift never parallaxes it. Children are
 * authored in METRES with the origin at the FLOOR CENTER of the visible
 * window; the visible window is `roomH` metres tall and roomH*aspect/2
 * wide (≈2.67m at 16:9 with roomH=3). A generous backdrop plane closes the
 * back so the main scene cannot peek through; content should be self-lit
 * (emissive surfaces + pointLights with small `distance`, so nothing leaks
 * onto the scene behind — lights do not respect walls).
 *
 * Keep the host scene's fog off or far-started: the panel sits ~2.6 world
 * units from the lens and scene fog would wash it.
 *
 * The panel CLIPS at the split line. Content is authored in a window whose
 * left edge is the screen-center plane, but nothing about a mesh knows that:
 * a ground plane wide enough to reach the window's right edge is also wide
 * enough to reach out past the divider and lay a warm floor across the
 * caller's night street (which is exactly what 6.4 was doing). A single
 * world-space clipping plane through the camera, normal = camera right,
 * cuts every content fragment on the wrong side of the line. The divider bar
 * itself is exempt — it straddles the plane by design and would come back
 * half-width. With this in place the panel's left edge is a real edge, and
 * content is free to run off it.
 */
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getAnimTime } from '../../hooks/useAnimTime'
import { ramp } from './shared'

const V = new THREE.Vector3()

export function SplitPanel({
  enter,
  exit,
  panelZ = 2.6,
  roomH = 3.0,
  depth = 3.2,
  backdrop = '#07070A',
  divider = '#0B0B10',
  children,
}: {
  /** [t0, t1] scene seconds over which the panel slides in from the right. */
  enter: [number, number]
  /** Optional [t0, t1] over which it slides back out (6.8's release). */
  exit?: [number, number]
  /** Distance in front of the camera the panel plane sits (world units). */
  panelZ?: number
  /** Content metres mapped to full frame height. */
  roomH?: number
  /** Content metres from the panel plane back to the backdrop. */
  depth?: number
  backdrop?: string
  divider?: string
  children: ReactNode
}) {
  const group = useRef<THREE.Group>(null)
  const dividerRef = useRef<THREE.Mesh>(null)
  const camera = useThree(s => s.camera) as THREE.PerspectiveCamera
  const size = useThree(s => s.size)
  const gl = useThree(s => s.gl)
  const clip = useRef([new THREE.Plane(new THREE.Vector3(1, 0, 0), 0)])

  // Per-material clipping is off by default; without this the planes below
  // are silently ignored.
  useEffect(() => { gl.localClippingEnabled = true }, [gl])

  useFrame(() => {
    const g = group.current
    if (!g) return
    const t = getAnimTime()
    const k = ramp(t, enter[0], enter[1]) * (exit ? 1 - ramp(t, exit[0], exit[1]) : 1)
    if (k <= 0.001) { g.visible = false; return }
    g.visible = true

    // Frame size at the panel plane, from the live lens.
    const aspect = size.width / Math.max(1, size.height)
    const vph = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * panelZ
    const vpw = vph * aspect
    const s = vph / roomH // content-metre → world scale

    // Camera-space x: fully in = right-half center; fully out = past the edge.
    const xIn = vpw / 4
    const xOut = vpw / 2 + vpw / 4 + vph * 0.06
    const x = THREE.MathUtils.lerp(xOut, xIn, k)

    camera.updateMatrixWorld()
    g.position.copy(V.set(x, 0, -panelZ).applyMatrix4(camera.matrixWorld))
    g.quaternion.copy(camera.quaternion)
    g.scale.setScalar(s)

    // The divider rides the window's left edge (aspect-dependent).
    const d = dividerRef.current
    if (d) d.position.x = -(vpw / 4) / s

    // The split line as a world plane: camera-space X ≥ 0. Keeping it on the
    // camera (rather than on the panel) means it stays the screen's centre
    // line whatever the shot's camera does.
    const plane = clip.current[0]
    plane.normal.setFromMatrixColumn(camera.matrixWorld, 0).normalize()
    plane.constant = -plane.normal.dot(camera.position)
    g.traverse(o => {
      if (o === d) return // the divider straddles the line on purpose
      const m = (o as THREE.Mesh).material
      if (!m) return
      for (const one of Array.isArray(m) ? m : [m]) {
        if (one.clippingPlanes === clip.current) continue
        one.clippingPlanes = clip.current
        one.needsUpdate = true
      }
    })
  })

  return (
    <group ref={group} visible={false}>
      {/* content: origin at floor center of the visible window */}
      <group position={[0, -roomH / 2, 0]}>{children}</group>
      {/* backdrop — oversize so no gap ever shows around the content */}
      <mesh position={[0, 0, -depth]}>
        <planeGeometry args={[roomH * 2.4, roomH * 2.0]} />
        <meshBasicMaterial color={backdrop} />
      </mesh>
      {/* the split line */}
      <mesh ref={dividerRef} position={[0, 0, 0.5]}>
        <boxGeometry args={[0.035, roomH * 1.6, 0.02]} />
        <meshBasicMaterial color={divider} />
      </mesh>
    </group>
  )
}
