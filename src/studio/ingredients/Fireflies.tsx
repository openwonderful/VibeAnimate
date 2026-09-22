/**
 * fx.fireflies — drifting warm motes for night scenes. One Points cloud
 * (single draw call), seeded layout, per-mote phase so the swarm
 * breathes instead of blinking in sync. Drive by the anim clock.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getAnimTime } from '../../hooks/useAnimTime'
import { seededRandom } from '../../utils/svgHelpers'

export type FirefliesProps = {
  position?: [number, number, number]
  /** Box the swarm drifts inside (x, y, z extents). */
  bounds?: [number, number, number]
  count?: number
  seed?: number
  color?: string
  size?: number
}

export function Fireflies({
  position = [0, 0, 0],
  bounds = [10, 3, 10],
  count = 40,
  seed = 5,
  color = '#FFD98E',
  size = 0.09,
}: FirefliesProps) {
  const points = useRef<THREE.Points>(null)

  const { basePositions, phases, geometry, material } = useMemo(() => {
    const rnd = seededRandom(seed)
    const basePositions = new Float32Array(count * 3)
    const phases = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      basePositions[i * 3] = (rnd() - 0.5) * bounds[0]
      basePositions[i * 3 + 1] = 0.4 + rnd() * bounds[1]
      basePositions[i * 3 + 2] = (rnd() - 0.5) * bounds[2]
      phases[i] = rnd() * Math.PI * 2
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(basePositions.slice(), 3))
    // Round soft sprite — without a map, Points render as hard squares.
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 32
    const ctx = canvas.getContext('2d')!
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.4, 'rgba(255,255,255,0.6)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 32, 32)
    const sprite = new THREE.CanvasTexture(canvas)
    const material = new THREE.PointsMaterial({
      color,
      size,
      map: sprite,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    return { basePositions, phases, geometry, material }
  }, [count, seed, bounds, color, size])

  useFrame(() => {
    const mesh = points.current
    if (!mesh) return
    const t = getAnimTime()
    const attr = mesh.geometry.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < count; i++) {
      const p = phases[i]
      attr.setXYZ(
        i,
        basePositions[i * 3] + Math.sin(t * 0.35 + p) * 0.6,
        basePositions[i * 3 + 1] + Math.sin(t * 0.6 + p * 1.7) * 0.35,
        basePositions[i * 3 + 2] + Math.cos(t * 0.28 + p * 0.9) * 0.6,
      )
    }
    attr.needsUpdate = true
    // Swarm-wide breathing shimmer.
    ;(mesh.material as THREE.PointsMaterial).opacity = 0.65 + Math.sin(t * 1.1) * 0.25
  })

  return <points ref={points} position={position} geometry={geometry} material={material} />
}

export function FirefliesPreview() {
  return (
    <>
      <ambientLight intensity={0.2} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]}>
        <circleGeometry args={[3, 24]} />
        <meshStandardMaterial color="#22301E" roughness={1} />
      </mesh>
      <group position={[0, -1.2, 0]} scale={0.5}>
        <Fireflies bounds={[5, 3, 3]} count={30} size={0.16} />
      </group>
    </>
  )
}
