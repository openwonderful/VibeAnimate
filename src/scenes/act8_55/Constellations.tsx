/**
 * Act 8.5 constellations — what the sky becomes.
 *
 * The soul orbs themselves (Crowd) are the star cores; this module adds the
 * ceremony: a halo bloom the moment each named star locks in, constellation
 * lines that draw themselves once a figure group is complete, the faint
 * Cheonsang Yeolcha Bunyajido graticule (concentric circles on the pole +
 * 28 lunar-mansion ticks), the Ojakgyo magpie bridge shimmering between
 * Jiknyeo and Gyeonwoo, and Alcor — the quiet eighth star beside the Seven.
 */
import { Fragment, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getAnimTime } from '../../hooks/useAnimTime'
import { LINE_COLOR, SKY_R, STAR_WHITE } from './constants'
import { alcorPos, dir, domePos, ojakgyoPoints, type Vec3 } from './sky'
import { SpunSky } from './skySpin'
import type { World } from './world'
import { makeGlowMaterial, setGlowGlobal, updateGlowScale } from './glow'

function smooth01(x: number): number {
  const c = Math.min(1, Math.max(0, x))
  return c * c * (3 - 2 * c)
}

/* ── Star halos — bloom at lock ──────────────────────────────────── */

function StarHalos({ world }: { world: World }) {
  const refs = useRef<(THREE.Mesh | null)[]>([])

  const halos = useMemo(() => {
    const out: { pos: Vec3; size: number; color: string; arrive: number }[] = []
    for (const f of world.figures) {
      if (!f.named) continue
      out.push({
        pos: f.target,
        size: f.targetSize,
        color: f.targetColor,
        arrive: f.riseStart + f.riseDur,
      })
    }
    return out
  }, [world])

  useFrame(() => {
    const t = getAnimTime()
    for (let i = 0; i < halos.length; i++) {
      const mesh = refs.current[i]
      if (!mesh) continue
      const h = halos[i]
      const dt = t - h.arrive
      const m = mesh.material as THREE.MeshBasicMaterial
      if (dt <= 0) {
        m.opacity = 0
        continue
      }
      m.opacity = 0.2 + 0.45 * Math.exp(-dt * 1.9)
      mesh.scale.setScalar(1 + 0.9 * Math.exp(-dt * 2.4))
    }
  })

  return (
    <group>
      {halos.map((h, i) => (
        <mesh key={i} position={h.pos} ref={m => { refs.current[i] = m }}>
          <sphereGeometry args={[h.size * 2.4, 12, 10]} />
          <meshBasicMaterial
            color={h.color} transparent opacity={0} depthWrite={false}
            blending={THREE.AdditiveBlending} toneMapped={false} fog={false}
          />
        </mesh>
      ))}
    </group>
  )
}

/* ── Constellation lines — progressive draw after lock ───────────── */

function ConstellationLines({ world }: { world: World }) {
  const items = useMemo(() =>
    world.constellations
      .filter(c => c.lines.length > 0)
      .map(c => ({
        con: c,
        start: (world.lockTimes[c.id] ?? 40) + 0.45,
        positions: new Float32Array(c.lines.length * 6),
      })), [world])

  const refs = useRef<(THREE.LineSegments | null)[]>([])

  useFrame(() => {
    const t = getAnimTime()
    items.forEach((item, ii) => {
      const seg = refs.current[ii]
      if (!seg) return
      const { con, start, positions } = item
      let any = false
      con.lines.forEach(([ai, bi], li) => {
        const q = smooth01((t - start - li * 0.3) / 0.9)
        if (q > 0) any = true
        const a = con.stars[ai]
        const b = con.stars[bi]
        positions[li * 6] = a[0]
        positions[li * 6 + 1] = a[1]
        positions[li * 6 + 2] = a[2]
        positions[li * 6 + 3] = a[0] + (b[0] - a[0]) * q
        positions[li * 6 + 4] = a[1] + (b[1] - a[1]) * q
        positions[li * 6 + 5] = a[2] + (b[2] - a[2]) * q
      })
      const attr = seg.geometry.getAttribute('position') as THREE.BufferAttribute
      attr.needsUpdate = true
      const m = seg.material as THREE.LineBasicMaterial
      m.opacity = any ? 0.34 : 0
    })
  })

  return (
    <group>
      {items.map((item, ii) => (
        <lineSegments key={item.con.id} ref={s => { refs.current[ii] = s }} frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[item.positions, 3]} />
          </bufferGeometry>
          <lineBasicMaterial
            color={LINE_COLOR} transparent opacity={0} depthWrite={false}
            blending={THREE.AdditiveBlending} fog={false}
          />
        </lineSegments>
      ))}
    </group>
  )
}

/* ── Polaris cross — the still point ─────────────────────────────── */

function PolarisCross({ world }: { world: World }) {
  const group = useRef<THREE.Group>(null)
  const mats = useRef<(THREE.MeshBasicMaterial | null)[]>([])
  const pos = useMemo(() => domePos(dir(-4, 68), SKY_R - 0.5), [])
  const arrive = useMemo(() => {
    const f = world.figures.find(f => f.named?.con === 'polaris')
    return f ? f.riseStart + f.riseDur : 41
  }, [world])

  useFrame(({ camera }) => {
    const t = getAnimTime()
    if (group.current) group.current.lookAt(camera.position)
    const o = smooth01((t - arrive) / 2.2) * 0.22
    mats.current.forEach(m => { if (m) m.opacity = o })
  })

  return (
    <group ref={group} position={pos}>
      {[0, Math.PI / 2].map((rot, i) => (
        <mesh key={i} rotation={[0, 0, rot]}>
          <planeGeometry args={[4.6, 0.1]} />
          <meshBasicMaterial
            ref={m => { mats.current[i] = m }}
            color={STAR_WHITE} transparent opacity={0} depthWrite={false}
            blending={THREE.AdditiveBlending} toneMapped={false} fog={false}
          />
        </mesh>
      ))}
    </group>
  )
}

/* ── Cheonsang Yeolcha Bunyajido graticule ───────────────────────── */

function Graticule() {
  const mats = useRef<THREE.LineBasicMaterial[]>([])

  const { rings, ticks } = useMemo(() => {
    const pole = dir(-4, 68)
    const ref: Vec3 = [0, 1, 0]
    // Basis perpendicular to the pole axis.
    const u1n = (() => {
      const c: Vec3 = [
        ref[1] * pole[2] - ref[2] * pole[1],
        ref[2] * pole[0] - ref[0] * pole[2],
        ref[0] * pole[1] - ref[1] * pole[0],
      ]
      const l = Math.hypot(...c) || 1
      return [c[0] / l, c[1] / l, c[2] / l] as Vec3
    })()
    const u2n = (() => {
      const c: Vec3 = [
        pole[1] * u1n[2] - pole[2] * u1n[1],
        pole[2] * u1n[0] - pole[0] * u1n[2],
        pole[0] * u1n[1] - pole[1] * u1n[0],
      ]
      const l = Math.hypot(...c) || 1
      return [c[0] / l, c[1] / l, c[2] / l] as Vec3
    })()

    const onCone = (rhoDeg: number, phi: number): Vec3 => {
      const rho = (rhoDeg * Math.PI) / 180
      const s = Math.sin(rho)
      const d: Vec3 = [
        Math.cos(rho) * pole[0] + s * (Math.cos(phi) * u1n[0] + Math.sin(phi) * u2n[0]),
        Math.cos(rho) * pole[1] + s * (Math.cos(phi) * u1n[1] + Math.sin(phi) * u2n[1]),
        Math.cos(rho) * pole[2] + s * (Math.cos(phi) * u1n[2] + Math.sin(phi) * u2n[2]),
      ]
      return domePos(d, SKY_R + 3)
    }

    const rings = [10, 19, 30].map(rho => {
      const pts: number[] = []
      const SEG = 128
      for (let i = 0; i <= SEG; i++) {
        const p = onCone(rho, (i / SEG) * Math.PI * 2)
        pts.push(p[0], p[1], p[2])
      }
      return new Float32Array(pts)
    })

    // 28 lunar-mansion ticks crossing the outer ring.
    const tickPts: number[] = []
    for (let k = 0; k < 28; k++) {
      const phi = (k / 28) * Math.PI * 2
      const a = onCone(28.8, phi)
      const b = onCone(31.4, phi)
      tickPts.push(a[0], a[1], a[2], b[0], b[1], b[2])
    }
    return { rings, ticks: new Float32Array(tickPts) }
  }, [])

  useFrame(() => {
    const t = getAnimTime()
    const o = smooth01((t - 45.4) / 2.1) * 0.042
    mats.current.forEach(m => { m.opacity = o })
  })

  return (
    <group>
      {rings.map((pts, i) => (
        <lineLoop key={i} frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[pts, 3]} />
          </bufferGeometry>
          <lineBasicMaterial
            ref={(m: THREE.LineBasicMaterial | null) => { if (m) mats.current[i] = m }}
            color="#95A3C8" transparent opacity={0} depthWrite={false}
            blending={THREE.AdditiveBlending} fog={false}
          />
        </lineLoop>
      ))}
      <lineSegments frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[ticks, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          ref={(m: THREE.LineBasicMaterial | null) => { if (m) mats.current[3] = m }}
          color="#95A3C8" transparent opacity={0} depthWrite={false}
          blending={THREE.AdditiveBlending} fog={false}
        />
      </lineSegments>
    </group>
  )
}

/* ── Ojakgyo — the magpie bridge, the reunion ────────────────────── */

function Ojakgyo() {
  const material = useMemo(() => makeGlowMaterial({ depthTest: true }), [])

  const data = useMemo(() => {
    const pts = ojakgyoPoints(46)
    const positions = new Float32Array(pts.length * 3)
    const colors = new Float32Array(pts.length * 3)
    const sizes = new Float32Array(pts.length)
    const alphas = new Float32Array(pts.length)
    const phases = new Float32Array(pts.length)
    const c = new THREE.Color('#F0E6D0')
    pts.forEach((p, i) => {
      positions[i * 3] = p[0]; positions[i * 3 + 1] = p[1]; positions[i * 3 + 2] = p[2]
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b
      sizes[i] = 0.4 + (i % 3) * 0.1
      alphas[i] = 0.48 + (i % 5) * 0.05
      phases[i] = i * 0.7
    })
    return { positions, colors, sizes, alphas, phases }
  }, [])

  useFrame(({ camera, size, gl }) => {
    const t = getAnimTime()
    updateGlowScale(material, camera, size.height * gl.getPixelRatio(), t)
    setGlowGlobal(material, smooth01((t - 45.4) / 1.5) * 1.35)
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

/* ── Alcor — the quiet eighth, beside Mizar ──────────────────────── */

function Alcor() {
  const core = useRef<THREE.Mesh>(null)
  const halo = useRef<THREE.Mesh>(null)
  const pos = useMemo(() => alcorPos(), [])

  useFrame(() => {
    const t = getAnimTime()
    const o = smooth01((t - 46.4) / 1.4)
    if (core.current) {
      const m = core.current.material as THREE.MeshBasicMaterial
      m.opacity = o * 0.9
    }
    if (halo.current) {
      const m = halo.current.material as THREE.MeshBasicMaterial
      m.opacity = o * 0.12
    }
  })

  return (
    <group position={pos}>
      <mesh ref={core}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial color={STAR_WHITE} transparent opacity={0} toneMapped={false} fog={false} />
      </mesh>
      <mesh ref={halo}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshBasicMaterial
          color={STAR_WHITE} transparent opacity={0} depthWrite={false}
          blending={THREE.AdditiveBlending} toneMapped={false} fog={false}
        />
      </mesh>
    </group>
  )
}

/**
 * `spun`: the star halos and the constellation lines read POSITIONS OUT OF
 * THE WORLD, so 8.55 turns them in the data (see skySpin.tsx) and they need
 * nothing here. The Polaris cross and the graticule place themselves off
 * `dir(-4, 68)` instead, so they are the only two pieces that have to be
 * turned by a transform — leave them out of it and the still point of the
 * sky ends up 176° away from the sky it is the still point of.
 */
export function Constellations({ world, spun = false }: { world: World; spun?: boolean }) {
  const Frame = spun ? SpunSky : Fragment
  return (
    <group position={[0, 0, 0]}>
      <StarHalos world={world} />
      <ConstellationLines world={world} />
      <Frame>
        <PolarisCross world={world} />
        <Graticule />
        <Ojakgyo />
        <Alcor />
      </Frame>
    </group>
  )
}
