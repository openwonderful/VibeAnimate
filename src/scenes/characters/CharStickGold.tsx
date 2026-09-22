/**
 * CharStickGold — Smooth single-body golden stick figure
 *
 * Thick overlapping TubeGeometry along CatmullRomCurve3 paths.
 * Single material = seamless blobby body. Standing idle pose.
 */

import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import type { Group } from 'three'
import { DebugCamera } from '../DebugCamera'

const GOLD = '#D4A843'
const GOLD_DIM = '#8B6914'
const BG = '#060D1A'

function useSmoothBody(
  curves: { points: THREE.Vector3[]; radius: number; segments?: number }[],
  spheres: { center: THREE.Vector3; radius: number }[] = [],
) {
  return useMemo(() => {
    const geos: THREE.BufferGeometry[] = []
    const RADIAL = 16
    for (const { points, radius, segments = 20 } of curves) {
      const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5)
      geos.push(new THREE.TubeGeometry(curve, segments, radius, RADIAL, false))
      for (const pt of [points[0], points[points.length - 1]]) {
        const s = new THREE.SphereGeometry(radius, 24, 24)
        s.translate(pt.x, pt.y, pt.z)
        geos.push(s)
      }
    }
    for (const { center, radius } of spheres) {
      const s = new THREE.SphereGeometry(radius, 32, 32)
      s.translate(center.x, center.y, center.z)
      geos.push(s)
    }
    const merged = mergeGeos(geos)
    for (const g of geos) g.dispose()
    return merged
  }, [])
}

function mergeGeos(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let tv = 0, ti = 0
  for (const g of geos) { tv += g.attributes.position.count; ti += g.index ? g.index.count : 0 }
  const p = new Float32Array(tv * 3), n = new Float32Array(tv * 3), ix = new Uint32Array(ti)
  let vo = 0, io = 0
  for (const g of geos) {
    const gp = g.attributes.position, gn = g.attributes.normal
    for (let i = 0; i < gp.count * 3; i++) { p[vo * 3 + i] = (gp.array as Float32Array)[i]; if (gn) n[vo * 3 + i] = (gn.array as Float32Array)[i] }
    if (g.index) { for (let i = 0; i < g.index.count; i++) ix[io + i] = g.index.array[i] + vo; io += g.index.count }
    vo += gp.count
  }
  const m = new THREE.BufferGeometry()
  m.setAttribute('position', new THREE.BufferAttribute(p, 3))
  m.setAttribute('normal', new THREE.BufferAttribute(n, 3))
  m.setIndex(new THREE.BufferAttribute(ix, 1))
  m.computeVertexNormals()
  return m
}

function SmoothFigure() {
  const ref = useRef<Group>(null)
  const R = 0.075, RL = 0.06
  const geo = useSmoothBody([
    { points: [new THREE.Vector3(0,.55,0), new THREE.Vector3(0,.75,.01), new THREE.Vector3(0,1,0), new THREE.Vector3(0,1.2,-.01), new THREE.Vector3(0,1.35,0)], radius: R, segments: 24 },
    { points: [new THREE.Vector3(-.02,1.22,0), new THREE.Vector3(-.14,1.18,.02), new THREE.Vector3(-.22,1.05,.01), new THREE.Vector3(-.26,.88,-.01)], radius: RL, segments: 16 },
    { points: [new THREE.Vector3(.02,1.22,0), new THREE.Vector3(.14,1.18,-.02), new THREE.Vector3(.22,1.05,-.01), new THREE.Vector3(.26,.88,.01)], radius: RL, segments: 16 },
    { points: [new THREE.Vector3(0,.58,0), new THREE.Vector3(-.05,.45,.01), new THREE.Vector3(-.09,.28,.01), new THREE.Vector3(-.09,.08,0)], radius: RL, segments: 16 },
    { points: [new THREE.Vector3(0,.58,0), new THREE.Vector3(.05,.45,-.01), new THREE.Vector3(.09,.28,-.01), new THREE.Vector3(.09,.08,0)], radius: RL, segments: 16 },
  ], [{ center: new THREE.Vector3(0, 1.48, 0), radius: 0.14 }])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: GOLD, emissive: GOLD, emissiveIntensity: 0.3, roughness: 0.6, metalness: 0.1 }), [])
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    ref.current.position.y = Math.sin(t * 0.8) * 0.008
    ref.current.rotation.z = Math.sin(t * 0.5) * 0.015
    ref.current.rotation.y = Math.sin(t * 0.35) * 0.05
  })
  return (<group ref={ref}><mesh geometry={geo} material={mat} /><pointLight position={[0,.2,.5]} color={GOLD} intensity={1} distance={3} decay={2} /></group>)
}

function SceneSetup() {
  const { camera } = useThree()
  useEffect(() => { camera.lookAt(0, 0.8, 0) }, [camera])
  return null
}

export default function CharStickGold() {
  return (
    <div style={{ width: '100%', height: '100%', background: BG }}>
      <Canvas style={{ width: '100%', height: '100%' }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0, preserveDrawingBuffer: true }} camera={{ position: [0, 0.8, 2.2], fov: 45, near: 0.1, far: 100 }}>
        <DebugCamera />
        <SceneSetup />
        <color attach="background" args={[BG]} />
        <fog attach="fog" args={[BG, 4, 15]} />
        <ambientLight color="#1A2540" intensity={0.4} />
        <directionalLight position={[-2, 3, 4]} color="#F5E6D0" intensity={0.8} />
        <pointLight position={[0, 2, 3]} color={GOLD_DIM} intensity={0.8} distance={8} decay={2} />
        <SmoothFigure />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}><planeGeometry args={[20, 20]} /><meshStandardMaterial color="#1A1612" roughness={0.95} /></mesh>
        <EffectComposer><Bloom intensity={0.8} luminanceThreshold={0.3} luminanceSmoothing={0.9} mipmapBlur /><Vignette eskil={false} offset={0.15} darkness={0.5} /></EffectComposer>
      </Canvas>
    </div>
  )
}
