/**
 * The night market — 야시장.
 *
 * Stalls and carts down both sides of the road, strings of lights between them,
 * and a cloth banner over the road where the village starts. Shared by Act 7.2
 * (walked through) and Act 8.55 (stood in), fed the same `timeOffset` the rest
 * of the shared world gets, so the market is identical on the frame they share.
 *
 * Two jobs beyond decoration:
 *
 *   - IT EXPLAINS THE CROWD. Four thousand people standing in a paddy at night
 *     is a vigil; four thousand people at a festival is a Tuesday. They were
 *     here before he was.
 *   - IT IS THE ONLY COOL THING IN THE VALLEY. Everything else — figures, house,
 *     lanterns, souls, stars — is on the gold ramp, and a frame with one hue in
 *     it has no depth. Galvanised carts and dark dancheong cloth give the gold
 *     something to be gold against.
 *
 * Everything is instanced and laid out once: five draw calls for forty stalls.
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getAnimTime } from '../../hooks/useAnimTime'
import { HOUSE_GLOW, roadX, T_DROP } from './constants'
import {
  BANNER_SUB, BANNER_TEXT, BANNER_Y, BANNER_Z, CART_METAL, CART_METAL_DARK,
  generatePennants, LANTERN_COLOR, STALL_WOOD, type Stall,
} from './market'
import { makeGlowMaterial, setGlowGlobal, updateGlowScale } from './glow'

function smooth01(x: number): number {
  const c = Math.min(1, Math.max(0, x))
  return c * c * (3 - 2 * c)
}

/** The market dims with the rest of the earth once the souls start leaving. */
function marketDim(t: number): number {
  return 1 - 0.62 * smooth01((t - (T_DROP + 1)) / 8)
}

type Box = {
  x: number; y: number; z: number
  rx: number; ry: number; rz: number
  sx: number; sy: number; sz: number
  c: THREE.Color
}

/** Local (stall-space) → world, for a stall at (x, z) yawed by `ry`. */
function place(
  out: Box[], s: Stall,
  lx: number, ly: number, lz: number,
  sx: number, sy: number, sz: number,
  color: THREE.Color, rx = 0,
) {
  const c = Math.cos(s.rotY)
  const sn = Math.sin(s.rotY)
  out.push({
    x: s.x + lx * c + lz * sn,
    y: ly,
    z: s.z - lx * sn + lz * c,
    rx, ry: s.rotY, rz: 0,
    sx, sy, sz,
    c: color,
  })
}

/* ── The banner cloth ────────────────────────────────────────────── */

/**
 * Painted rather than modelled: a canvas texture is the only way to get Korean
 * type into this scene without shipping a font atlas, and Noto Serif CJK KR is
 * on the box. Built once and disposed with the component.
 */
function makeBannerTexture(): THREE.CanvasTexture {
  const w = 1024
  const h = 192
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  // Cloth: deep red with a lit, uneven weave, darker toward the ends where it
  // hangs away from the lanterns.
  const grad = ctx.createLinearGradient(0, 0, w, 0)
  grad.addColorStop(0, '#5A1F18')
  grad.addColorStop(0.5, '#8E3524')
  grad.addColorStop(1, '#5A1F18')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = 'rgba(0,0,0,0.22)'
  ctx.fillRect(0, 0, w, 10)
  ctx.fillRect(0, h - 10, w, 10)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#F2D79A'
  ctx.font = '700 92px "Noto Serif CJK KR", "Noto Sans CJK KR", serif'
  ctx.fillText(BANNER_TEXT, w / 2, h * 0.44)
  ctx.font = '500 38px "Noto Serif CJK KR", "Noto Sans CJK KR", serif'
  ctx.fillStyle = '#E0B978'
  ctx.fillText(BANNER_SUB, w / 2, h * 0.80)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

function Banner({ tOff }: { tOff: number }) {
  const cloth = useRef<THREE.MeshStandardMaterial>(null)
  const texture = useMemo(makeBannerTexture, [])
  useEffect(() => () => texture.dispose(), [texture])

  const x = roadX(BANNER_Z)
  const halfSpan = 3.3

  useFrame(() => {
    if (cloth.current) cloth.current.emissiveIntensity = 0.85 * marketDim(getAnimTime() + tOff)
  })

  return (
    <group position={[x, 0, BANNER_Z]}>
      {[-halfSpan, halfSpan].map(px => (
        <mesh key={px} position={[px, BANNER_Y * 0.5 + 0.1, 0]}>
          <cylinderGeometry args={[0.055, 0.075, BANNER_Y + 0.2, 6]} />
          <meshStandardMaterial color={STALL_WOOD} roughness={1} />
        </mesh>
      ))}
      {/* Slight sag: two quads would be fairer, one plane reads fine at this
          size and keeps the banner to a single draw call. */}
      <mesh position={[0, BANNER_Y, 0]} rotation={[0.05, 0, 0]}>
        <planeGeometry args={[halfSpan * 2, 1.16]} />
        <meshStandardMaterial
          ref={cloth} map={texture} emissiveMap={texture} emissive="#FFFFFF"
          emissiveIntensity={0.85} roughness={1} side={THREE.DoubleSide}
        />
      </mesh>
      <pointLight position={[0, BANNER_Y - 0.9, 0.5]} color={LANTERN_COLOR} intensity={2.4} distance={9} decay={1.7} />
    </group>
  )
}

/* ── Laying the instances out (once) ─────────────────────────────── */

const layDummy = new THREE.Object3D()

function layBoxes(mesh: THREE.InstancedMesh | null, list: Box[]) {
  if (!mesh || mesh.userData.laid) return
  list.forEach((b, i) => {
    layDummy.position.set(b.x, b.y, b.z)
    layDummy.rotation.set(b.rx, b.ry, b.rz, 'YXZ')
    layDummy.scale.set(b.sx, b.sy, b.sz)
    layDummy.updateMatrix()
    mesh.setMatrixAt(i, layDummy.matrix)
  })
  mesh.instanceMatrix.needsUpdate = true
  mesh.userData.laid = true
}

/** Wheels are cylinders on their side — axis along the cart's local x. */
function layWheels(mesh: THREE.InstancedMesh | null, list: Box[]) {
  if (!mesh || mesh.userData.laid) return
  list.forEach((b, i) => {
    layDummy.position.set(b.x, b.y, b.z)
    layDummy.rotation.set(0, b.ry, Math.PI / 2, 'YXZ')
    layDummy.scale.set(b.sx, b.sy, b.sz)
    layDummy.updateMatrix()
    mesh.setMatrixAt(i, layDummy.matrix)
  })
  mesh.instanceMatrix.needsUpdate = true
  mesh.userData.laid = true
}

function layLamps(mesh: THREE.InstancedMesh | null, list: { x: number; y: number; z: number }[]) {
  if (!mesh || mesh.userData.laid) return
  list.forEach((p, i) => {
    layDummy.position.set(p.x, p.y, p.z)
    layDummy.rotation.set(0, 0, 0)
    layDummy.scale.setScalar(0.085)
    layDummy.updateMatrix()
    mesh.setMatrixAt(i, layDummy.matrix)
  })
  mesh.instanceMatrix.needsUpdate = true
  mesh.userData.laid = true
}

/* ── Assembly ────────────────────────────────────────────────────── */

export function NightMarket({ stalls, timeOffset = 0 }: { stalls: Stall[]; timeOffset?: number }) {
  const lanternMat = useRef<THREE.MeshBasicMaterial>(null)
  const glowRef = useRef<THREE.Points>(null)
  const glowMaterial = useMemo(() => makeGlowMaterial({ depthTest: true }), [])

  const built = useMemo(() => {
    const wood: Box[] = []
    const cloth: Box[] = []
    const metal: Box[] = []
    const wheels: Box[] = []
    const lamps: { x: number; y: number; z: number }[] = []

    const woodC = new THREE.Color(STALL_WOOD)
    const metalC = new THREE.Color(CART_METAL)
    const metalD = new THREE.Color(CART_METAL_DARK)
    const tmp = new THREE.Color()

    for (const s of stalls) {
      const clothC = new THREE.Color(s.cloth)
      // Per-stall value break, so a row of stalls isn't one flat shape.
      tmp.copy(woodC).offsetHSL(0, 0, (s.tone - 0.5) * 0.05)
      const w = tmp.clone()

      if (s.kind === 'canopy') {
        // PITCHED, and clear of the crowd's heads. A flat slab at 1.75 sat
        // below the tallest figures and read as a table with a red top; a
        // ridged roof at 2.1 reads as a stall from any angle, which is the
        // only thing this shape has to do.
        for (const px of [-s.w / 2, s.w / 2]) {
          for (const pz of [-s.d / 2, s.d / 2]) {
            place(wood, s, px, 1.02, pz, 0.06, 2.04, 0.06, w)
          }
        }
        for (const side of [1, -1]) {
          place(
            cloth, s, 0, 2.08, side * s.d * 0.29,
            s.w + 0.4, 0.055, s.d * 0.78, clothC, side * -0.42,
          )
        }
        place(wood, s, 0, 2.26, 0, s.w + 0.4, 0.07, 0.08, w)   // ridge beam
        // Counter, its cloth skirt, and a back wall so the stall has an inside.
        place(wood, s, 0, 0.92, s.d * 0.40, s.w, 0.1, 0.55, w)
        place(cloth, s, 0, 0.45, s.d * 0.40 + 0.26, s.w, 0.9, 0.05, clothC)
        place(cloth, s, 0, 1.42, -s.d * 0.5, s.w, 0.92, 0.05, clothC)
        // A crate or two on the counter.
        place(wood, s, -s.w * 0.28, 1.07, s.d * 0.36, 0.26, 0.2, 0.26, w)
        if (s.tone > 0.45) place(wood, s, s.w * 0.2, 1.05, s.d * 0.4, 0.2, 0.16, 0.2, w)
      } else {
        // A galvanised push cart: body, two wheels, a handle, a half awning.
        place(metal, s, 0, 0.66, 0, s.w, 0.62, s.d, s.tone > 0.5 ? metalC : metalD)
        place(metal, s, 0, 0.99, 0, s.w * 0.94, 0.06, s.d * 0.94, metalC)
        for (const px of [-s.w * 0.34, s.w * 0.34]) {
          place(wheels, s, px, 0.27, 0, 0.27, 0.09, 0.27, metalD, 0)
        }
        place(metal, s, -s.w * 0.5 - 0.16, 0.88, 0, 0.32, 0.05, 0.05, metalD)
        for (const px of [-s.w * 0.42, s.w * 0.42]) {
          place(metal, s, px, 1.34, s.d * 0.28, 0.045, 1.36, 0.045, metalD)
        }
        place(cloth, s, 0, 1.98, s.d * 0.16, s.w + 0.26, 0.05, s.d * 1.2, clothC, -0.22)
      }

      for (const [lx, ly, lz] of s.lamps) {
        const c = Math.cos(s.rotY)
        const sn = Math.sin(s.rotY)
        lamps.push({ x: s.x + lx * c + lz * sn, y: ly, z: s.z - lx * sn + lz * c })
      }
    }

    // Strings of lights between neighbouring stalls, sagging like real ones.
    const strings: { x: number; y: number; z: number }[] = []
    for (const p of generatePennants(stalls)) {
      for (let i = 1; i < p.n; i++) {
        const u = i / p.n
        strings.push({
          x: p.ax + (p.bx - p.ax) * u,
          y: p.y - Math.sin(u * Math.PI) * 0.28,
          z: p.az + (p.bz - p.az) * u,
        })
      }
    }

    const all = [...lamps, ...strings]
    const positions = new Float32Array(all.length * 3)
    const colors = new Float32Array(all.length * 3)
    const sizes = new Float32Array(all.length)
    const alphas = new Float32Array(all.length)
    const phases = new Float32Array(all.length)
    const lc = new THREE.Color(LANTERN_COLOR)
    const sc = new THREE.Color(HOUSE_GLOW)
    all.forEach((p, i) => {
      positions[i * 3] = p.x
      positions[i * 3 + 1] = p.y
      positions[i * 3 + 2] = p.z
      const isLamp = i < lamps.length
      const c = isLamp ? lc : sc
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b
      sizes[i] = isLamp ? 0.62 : 0.26
      alphas[i] = isLamp ? 0.5 : 0.36
      phases[i] = (i * 0.618) % (Math.PI * 2)
    })

    return { wood, cloth, metal, wheels, lamps, glow: { positions, colors, sizes, alphas, phases } }
  }, [stalls])

  const woodRef = useRef<THREE.InstancedMesh>(null)
  const clothRef = useRef<THREE.InstancedMesh>(null)
  const metalRef = useRef<THREE.InstancedMesh>(null)
  const wheelRef = useRef<THREE.InstancedMesh>(null)
  const lampRef = useRef<THREE.InstancedMesh>(null)

  /**
   * Per-instance colours, built alongside the transforms. These go on as JSX
   * `instancedBufferAttribute` children rather than being pushed onto
   * `mesh.geometry` from a ref callback — at ref time the declared
   * `<boxGeometry>` may not be attached yet, so the attribute lands on a
   * throwaway default geometry and the whole market renders black.
   */
  const colorArrays = useMemo(() => {
    const pack = (list: Box[]) => {
      const arr = new Float32Array(Math.max(1, list.length) * 3)
      list.forEach((b, i) => { arr[i * 3] = b.c.r; arr[i * 3 + 1] = b.c.g; arr[i * 3 + 2] = b.c.b })
      return arr
    }
    return {
      wood: pack(built.wood), cloth: pack(built.cloth), metal: pack(built.metal),
    }
  }, [built])

  useFrame(({ camera, size, gl }) => {
    // Transforms are static: laid once on the first frame the meshes exist,
    // the same way City/Ground7 do it. Doing this in a ref callback races the
    // geometry attach.
    layBoxes(woodRef.current, built.wood)
    layBoxes(clothRef.current, built.cloth)
    layBoxes(metalRef.current, built.metal)
    layWheels(wheelRef.current, built.wheels)
    layLamps(lampRef.current, built.lamps)

    const t = getAnimTime() + timeOffset
    const dim = marketDim(t)
    updateGlowScale(glowMaterial, camera, size.height * gl.getPixelRatio(), t * 0.6)
    setGlowGlobal(glowMaterial, dim)
    if (lanternMat.current) lanternMat.current.opacity = dim
    if (glowRef.current) glowRef.current.visible = dim > 0.02
  })

  return (
    <group>
      <instancedMesh
        ref={woodRef} args={[undefined, undefined, Math.max(1, built.wood.length)]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial vertexColors roughness={0.95} />
        <instancedBufferAttribute attach="geometry-attributes-color" args={[colorArrays.wood, 3]} />
      </instancedMesh>

      <instancedMesh
        ref={clothRef} args={[undefined, undefined, Math.max(1, built.cloth.length)]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial vertexColors roughness={1} emissive="#180806" emissiveIntensity={0.6} />
        <instancedBufferAttribute attach="geometry-attributes-color" args={[colorArrays.cloth, 3]} />
      </instancedMesh>

      {/* The carts. Metalness high and roughness low enough that the lanterns
          leave a highlight on them — that specular streak is the whole reason
          they read as galvanised steel rather than as grey boxes. */}
      <instancedMesh
        ref={metalRef} args={[undefined, undefined, Math.max(1, built.metal.length)]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial vertexColors metalness={0.72} roughness={0.42} />
        <instancedBufferAttribute attach="geometry-attributes-color" args={[colorArrays.metal, 3]} />
      </instancedMesh>

      <instancedMesh
        ref={wheelRef} args={[undefined, undefined, Math.max(1, built.wheels.length)]}
        frustumCulled={false}
      >
        <cylinderGeometry args={[1, 1, 1, 10]} />
        <meshStandardMaterial color={CART_METAL_DARK} metalness={0.6} roughness={0.55} />
      </instancedMesh>

      <instancedMesh
        ref={lampRef} args={[undefined, undefined, Math.max(1, built.lamps.length)]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 8, 6]} />
        <meshBasicMaterial ref={lanternMat} color={LANTERN_COLOR} transparent toneMapped={false} fog={false} />
      </instancedMesh>

      <points ref={glowRef} material={glowMaterial} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[built.glow.positions, 3]} />
          <bufferAttribute attach="attributes-aColor" args={[built.glow.colors, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[built.glow.sizes, 1]} />
          <bufferAttribute attach="attributes-aAlpha" args={[built.glow.alphas, 1]} />
          <bufferAttribute attach="attributes-aPhase" args={[built.glow.phases, 1]} />
        </bufferGeometry>
      </points>

      <Banner tOff={timeOffset} />
    </group>
  )
}
