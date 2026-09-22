/**
 * Act 8.5 terrain — the rural Korea the crowd stands in.
 *
 * A quilt of rice paddies (instanced water/dry parcels), a dirt road that
 * snakes to the farmhouse, the warm house itself with the parent in the
 * doorway, a persimmon tree, distant village lights, and the layered
 * mountain silhouettes on the horizon — which fade out as the camera climbs
 * (so the bird's-eye never sees the flatness) and the whole earth dims a
 * shade once the ascent begins.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getAnimTime } from '../../hooks/useAnimTime'
import {
  HOUSE_GLOW, HOUSE_Z, MOON_COLOR, phraseEnv, roadX, T_DROP,
} from './constants'
import { seededRandom, type Parcel } from './world'
import { makeGlowMaterial, setGlowGlobal, updateGlowScale } from './glow'
import { ParentFigure } from './ParentFigure'

function smooth01(x: number): number {
  const c = Math.min(1, Math.max(0, x))
  return c * c * (3 - 2 * c)
}

/** How much the earth has "emptied" — dims terrain warmth during the ascent. */
function earthDim(t: number): number {
  return 1 - 0.55 * smooth01((t - (T_DROP + 1)) / 8)
}

/* ── Paddy parcels (two instanced meshes: water + dry) ───────────── */

function Paddies({ parcels, tOff }: { parcels: Parcel[]; tOff: number }) {
  const water = useMemo(() => parcels.filter(p => p.water), [parcels])
  const dry = useMemo(() => parcels.filter(p => !p.water), [parcels])
  const waterMat = useRef<THREE.MeshStandardMaterial>(null)

  useFrame(() => {
    if (waterMat.current) {
      waterMat.current.emissiveIntensity = 0.32 * earthDim(getAnimTime() + tOff)
    }
  })

  const build = (list: Parcel[], jitter: (p: Parcel) => number) => {
    const colors = new Float32Array(list.length * 3)
    list.forEach((p, i) => {
      const j = jitter(p)
      colors[i * 3] = j
      colors[i * 3 + 1] = j
      colors[i * 3 + 2] = j * 1.04
    })
    return colors
  }
  const waterColors = useMemo(() => build(water, p => 0.75 + p.tone * 0.5), [water])
  const dryColors = useMemo(() => build(dry, p => 0.6 + p.tone * 0.55), [dry])

  const setMatrices = (mesh: THREE.InstancedMesh | null, list: Parcel[], y: number) => {
    if (!mesh) return
    const dummy = new THREE.Object3D()
    list.forEach((p, i) => {
      dummy.position.set(p.x, y, p.z)
      dummy.rotation.set(-Math.PI / 2, 0, 0)
      dummy.scale.set(p.w, p.d, 1)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }

  return (
    <group>
      <instancedMesh
        ref={m => setMatrices(m, water, 0.02)}
        args={[undefined, undefined, water.length]}
        frustumCulled={false}
      >
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial
          ref={waterMat}
          vertexColors
          color="#0A111E"
          emissive="#101A2E"
          emissiveIntensity={0.32}
          metalness={0.4}
          roughness={0.3}
          transparent
          opacity={0.52}
          depthWrite={false}
        />
        <instancedBufferAttribute attach="geometry-attributes-color" args={[waterColors, 3]} />
      </instancedMesh>

      <instancedMesh
        ref={m => setMatrices(m, dry, 0.005)}
        args={[undefined, undefined, dry.length]}
        frustumCulled={false}
      >
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial
          vertexColors
          color="#12160D"
          emissive="#070A04"
          emissiveIntensity={0.35}
          roughness={1}
        />
        <instancedBufferAttribute attach="geometry-attributes-color" args={[dryColors, 3]} />
      </instancedMesh>
    </group>
  )
}

/* ── The dirt road (curved ribbon) ───────────────────────────────── */

function Road() {
  const geometry = useMemo(() => {
    const half = 1.25
    const pts: number[] = []
    const idx: number[] = []
    let row = 0
    for (let z = 5; z >= -47; z -= 1.5) {
      const x = roadX(z)
      pts.push(x - half, 0.035, z, x + half, 0.035, z)
      if (row > 0) {
        const a = (row - 1) * 2
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
      }
      row++
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  }, [])

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#251C12" emissive="#0B0704" emissiveIntensity={0.4} roughness={0.95} />
    </mesh>
  )
}

/* ── Farmhouse — the warm heart of the frame ─────────────────────── */

function Farmhouse({ tOff }: { tOff: number }) {
  const doorLight = useRef<THREE.PointLight>(null)

  useFrame(() => {
    const t = getAnimTime() + tOff
    const dim = earthDim(t)
    const phrase = phraseEnv(t)
    if (doorLight.current) {
      doorLight.current.intensity =
        (7 + phrase * 2.5 + Math.sin(t * 3.7) * 0.7 + Math.sin(t * 7.1) * 0.35) * dim
    }
  })

  const wallH = 1.55
  const wallW = 2.9
  const wallD = 2.2

  return (
    <group position={[0, 0, HOUSE_Z]}>
      <mesh position={[0, wallH / 2, 0]}>
        <boxGeometry args={[wallW, wallH, wallD]} />
        <meshStandardMaterial color="#2A2018" emissive={HOUSE_GLOW} emissiveIntensity={0.35} roughness={0.9} />
      </mesh>
      {/* Hip roof: two stacked slabs — faint warmth so it reads from above */}
      <mesh position={[0, wallH + 0.28, 0]}>
        <boxGeometry args={[wallW + 1.0, 0.14, wallD + 1.0]} />
        <meshStandardMaterial color="#221810" emissive="#2A1A08" emissiveIntensity={0.5} roughness={1} />
      </mesh>
      <mesh position={[0, wallH + 0.56, 0]}>
        <boxGeometry args={[wallW * 0.55, 0.14, wallD * 0.6]} />
        <meshStandardMaterial color="#241A10" emissive="#301E0A" emissiveIntensity={0.55} roughness={1} />
      </mesh>

      {/* Bare-earth yard the house sits on — a warm pocket, not a void */}
      <mesh position={[0, -0.03, 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[4.8, 24]} />
        <meshStandardMaterial color="#1A1108" emissive="#140C04" emissiveIntensity={0.55} roughness={1} />
      </mesh>

      {/* Open door — the warm rectangle */}
      <mesh position={[0, 0.52, wallD / 2 + 0.012]}>
        <planeGeometry args={[0.78, 1.05]} />
        <meshStandardMaterial
          color={HOUSE_GLOW} emissive={HOUSE_GLOW} emissiveIntensity={3.1} roughness={1} toneMapped={false}
        />
      </mesh>
      {/* Paper windows */}
      {[-0.85, 0.85].map(x => (
        <mesh key={x} position={[x, 0.88, wallD / 2 + 0.012]}>
          <planeGeometry args={[0.5, 0.42]} />
          <meshStandardMaterial
            color={HOUSE_GLOW} emissive={HOUSE_GLOW} emissiveIntensity={2.4}
            transparent opacity={0.85} roughness={1} toneMapped={false}
          />
        </mesh>
      ))}

      <pointLight
        ref={doorLight}
        position={[0, 0.9, wallD / 2 + 0.7]}
        color={HOUSE_GLOW}
        intensity={7}
        distance={26}
        decay={1.6}
      />
      <pointLight position={[0, 0.8, 0]} color="#E8A830" intensity={3.5} distance={9} decay={1.6} />

      {/* Soft light pool + atmospheric halo — glow sprites, no hard edges */}
      <HouseGlowSprites wallD={wallD} tOff={tOff} />

      {/* Persimmon tree by the yard wall */}
      <group position={[2.7, 0, -0.4]}>
        <mesh position={[0, 0.55, 0]} rotation={[0, 0, 0.12]}>
          <cylinderGeometry args={[0.05, 0.09, 1.1, 6]} />
          <meshStandardMaterial color="#141009" roughness={1} />
        </mesh>
        <mesh position={[0.28, 1.1, 0]} rotation={[0, 0, -0.7]}>
          <cylinderGeometry args={[0.03, 0.05, 0.7, 5]} />
          <meshStandardMaterial color="#141009" roughness={1} />
        </mesh>
        <mesh position={[0.05, 1.5, 0]}>
          <sphereGeometry args={[0.62, 10, 8]} />
          <meshStandardMaterial color="#131A10" roughness={1} />
        </mesh>
        <mesh position={[0.55, 1.25, 0.1]}>
          <sphereGeometry args={[0.4, 10, 8]} />
          <meshStandardMaterial color="#101710" roughness={1} />
        </mesh>
        {[[-0.15, 1.32, 0.5], [0.3, 1.6, 0.35], [0.62, 1.15, 0.38], [0.12, 1.72, 0.1], [-0.32, 1.5, 0.18]].map((p, i) => (
          <mesh key={i} position={p as [number, number, number]}>
            <sphereGeometry args={[0.05, 6, 6]} />
            <meshStandardMaterial
              color="#3A1E08" emissive="#E8863A" emissiveIntensity={1.6} roughness={0.6} toneMapped={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/** Two soft glow sprites: warm pool on the road + faint halo over the roof. */
function HouseGlowSprites({ wallD, tOff }: { wallD: number; tOff: number }) {
  const material = useMemo(() => makeGlowMaterial({ depthTest: false }), [])

  const data = useMemo(() => {
    const c = new THREE.Color(HOUSE_GLOW)
    return {
      positions: new Float32Array([
        0, 0.25, wallD / 2 + 2.6,   // pool in front of the door
        0, 1.4, 0.2,                // roof halo
      ]),
      colors: new Float32Array([c.r, c.g, c.b, c.r, c.g, c.b]),
      sizes: new Float32Array([5.5, 8.5]),
      alphas: new Float32Array([0.24, 0.3]),
      phases: new Float32Array([0.4, 2.1]),
    }
  }, [wallD])

  useFrame(({ camera, size, gl }) => {
    updateGlowScale(material, camera, size.height * gl.getPixelRatio(), (getAnimTime() + tOff) * 0.4)
    // These sprites exist for altitude readability — up close they'd wash
    // the whole frame, so fade them in with camera distance.
    const d = Math.hypot(camera.position.x, camera.position.y - 1, camera.position.z - HOUSE_Z)
    setGlowGlobal(material, earthDim(getAnimTime() + tOff) * smooth01((d - 11) / 13))
  })

  return (
    <points material={material} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[data.colors, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[data.sizes, 1]} />
        <bufferAttribute attach="attributes-aAlpha" args={[data.alphas, 1]} />
        <bufferAttribute attach="attributes-aPhase" args={[data.phases, 1]} />
      </bufferGeometry>
    </points>
  )
}

/* ── Mountains — fade with camera altitude ───────────────────────── */

function createRidge(peaks: Array<{ x: number; h: number; w: number }>, segments = 180): THREE.ShapeGeometry {
  const width = 190
  const points: THREE.Vector2[] = [new THREE.Vector2(-width / 2, 0)]
  for (let i = 0; i <= segments; i++) {
    const x = -width / 2 + (i / segments) * width
    let h = 0
    for (const p of peaks) {
      const d = (x - p.x) / p.w
      h += p.h * Math.exp(-d * d * 2)
    }
    h += Math.sin(x * 0.5) * 0.3 + Math.sin(x * 1.3) * 0.15
    points.push(new THREE.Vector2(x, Math.max(0.05, h)))
  }
  points.push(new THREE.Vector2(width / 2, 0))
  return new THREE.ShapeGeometry(new THREE.Shape(points))
}

function Mountains() {
  const mats = useRef<(THREE.MeshBasicMaterial | null)[]>([])

  const geos = useMemo(() => [
    createRidge([
      { x: -42, h: 13, w: 18 }, { x: -14, h: 17, w: 14 }, { x: 10, h: 19, w: 16 },
      { x: 34, h: 15, w: 12 }, { x: 58, h: 11, w: 15 },
    ]),
    createRidge([
      { x: -30, h: 8.5, w: 12 }, { x: -8, h: 11.5, w: 10 }, { x: 16, h: 9.5, w: 14 }, { x: 40, h: 7.5, w: 10 },
    ]),
    createRidge([
      { x: -24, h: 4.2, w: 15 }, { x: -4, h: 3.2, w: 10 }, { x: 18, h: 5.2, w: 18 }, { x: 42, h: 3.2, w: 12 },
    ]),
  ], [])

  const baseOpacity = [0.95, 0.95, 0.95]

  useFrame(({ camera }) => {
    // Fade out as the camera climbs — by bird's-eye height they're gone.
    const fade = 1 - smooth01((camera.position.y - 8) / 20) * 0.97
    mats.current.forEach((m, i) => {
      if (m) m.opacity = baseOpacity[i] * fade
    })
  })

  const layers = [
    { z: -12, color: '#182338' },
    { z: -6, color: '#131C2E' },
    { z: 0, color: '#0E1524' },
  ]

  return (
    <group position={[0, -0.5, -72]}>
      {layers.map((l, i) => (
        <mesh key={i} geometry={geos[i]} position={[0, 0, l.z]}>
          <meshBasicMaterial
            ref={m => { mats.current[i] = m }}
            color={l.color} side={THREE.DoubleSide} transparent opacity={0.95}
          />
        </mesh>
      ))}
    </group>
  )
}

/* ── Distant village lights ──────────────────────────────────────── */

function VillageLights() {
  const positions = useMemo(() => {
    const rand = seededRandom(4141)
    const arr: number[] = []
    for (let i = 0; i < 11; i++) {
      const side = rand() > 0.5 ? 1 : -1
      arr.push(side * (24 + rand() * 22), 0.25 + rand() * 0.3, -18 - rand() * 42)
    }
    return new Float32Array(arr)
  }, [])

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#E8B060" size={0.5} sizeAttenuation transparent opacity={0.55}
        depthWrite={false} blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

/* ── Assembly ────────────────────────────────────────────────────── */

export function Terrain({ parcels, timeOffset = 0, house = true }: {
  parcels: Parcel[]
  timeOffset?: number
  /**
   * Act 7.1 is the part of the road with no destination in sight — the same
   * land, the same ridge, but the house and the person waiting in front of it
   * are still miles away. Everything else here is shared with 7.2 and 8.55.
   */
  house?: boolean
}) {
  return (
    <group>
      {/* Base earth */}
      <mesh position={[0, -0.06, -22]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[260, 200]} />
        <meshStandardMaterial color="#0D110B" emissive="#070906" emissiveIntensity={0.5} roughness={1} />
      </mesh>

      <Paddies parcels={parcels} tOff={timeOffset} />
      <Road />
      {house && <Farmhouse tOff={timeOffset} />}
      {/* World-space, not house-space: the walk ends out on the road. */}
      {house && <ParentFigure tOff={timeOffset} />}
      <Mountains />
      <VillageLights />

      {/* Moon-cool key light + warm ambient floor */}
      <directionalLight position={[14, 30, -46]} color="#8090C0" intensity={0.3} />
      <ambientLight color="#201810" intensity={0.42} />
      <hemisphereLight color="#182030" groundColor="#0A0804" intensity={0.25} />
      {/* Cool bounce so figures read against the dark from above */}
      <directionalLight position={[-8, 40, 10]} color={MOON_COLOR} intensity={0.08} />
    </group>
  )
}
