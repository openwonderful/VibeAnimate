/**
 * Act 8.5 crowd — the people, their lanterns, and their ascent.
 *
 * Every figure is three synced instances: a silhouette body, a head, and a
 * SOUL — the warm light it carries. On the ground the soul is a lantern glow
 * at the chest, breathing with the sung Arirang lines. On the beat drop the
 * whole field jumps (a radial ripple), splash rings bloom in the paddies,
 * and then souls lift off — edges first, spiraling upward — while their
 * silhouettes dissolve. Each soul flies a bezier to its assigned star:
 * the Seven to Bukduchilseong, nineteen more to the other named stars,
 * and the hundreds remaining into the 은하수 — the Milky Way river.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { easeInOut, getAnimTime } from '../../hooks/useAnimTime'
import {
  FIREFLY_GREEN, GOLD, GOLD_BRIGHT, GOLDEN_POS, phraseEnv, stillness, T_DROP,
} from './constants'
import { archetypeHeight, archetypeWidth, seededRandom, type World } from './world'
import { makeGlowMaterial, updateGlowScale } from './glow'

function smooth01(x: number): number {
  const c = Math.min(1, Math.max(0, x))
  return c * c * (3 - 2 * c)
}

const groundYAt = (x: number, z: number) => Math.sin(x * 0.3) * 0.08 + Math.sin(z * 0.15) * 0.12

/* ── The crowd + souls (one master per-frame loop) ───────────────── */

export function CrowdSouls({ world }: { world: World }) {
  const { figures, carriedBy, parcels } = world
  const N = figures.length

  const bodiesRef = useRef<THREE.InstancedMesh>(null)
  const headsRef = useRef<THREE.InstancedMesh>(null)
  const childrenRef = useRef<THREE.InstancedMesh>(null)
  const soulsRef = useRef<THREE.InstancedMesh>(null)
  const glowRef = useRef<THREE.Points>(null)
  const reflRef = useRef<THREE.Points>(null)

  const glowMaterial = useMemo(() => makeGlowMaterial({ depthTest: false }), [])
  const reflMaterial = useMemo(() => makeGlowMaterial({ depthTest: true }), [])

  /* Static per-figure data */
  const statics = useMemo(() => {
    const bodyColors = new Float32Array(N * 3)
    const soulColors = new Float32Array(N * 3)
    const glowPositions = new Float32Array(N * 3)
    const glowColors = new Float32Array(N * 3)
    const glowSizes = new Float32Array(N)
    const glowAlphas = new Float32Array(N)
    const glowPhases = new Float32Array(N)
    const jumpDelay = new Float32Array(N)
    const groundCol = new Array<THREE.Color>(N)
    const targetCol = new Array<THREE.Color>(N)
    const c = new THREE.Color()

    for (let i = 0; i < N; i++) {
      const f = figures[i]
      c.set(f.color)
      const depth = Math.abs(f.z)
      const dim = depth < 12 ? 0.42 : depth < 26 ? 0.32 : 0.24
      bodyColors[i * 3] = c.r * dim
      bodyColors[i * 3 + 1] = c.g * dim
      bodyColors[i * 3 + 2] = c.b * dim
      groundCol[i] = new THREE.Color(f.color)
      targetCol[i] = new THREE.Color(f.targetColor)
      glowPhases[i] = (i * 0.618) % (Math.PI * 2)
      const r = Math.hypot(f.x, f.z + 24)
      jumpDelay[i] = r * 0.009 + (i % 7) * 0.012
    }
    return {
      bodyColors, soulColors, glowPositions, glowColors, glowSizes, glowAlphas,
      glowPhases, jumpDelay, groundCol, targetCol,
    }
  }, [figures, N])

  /* Reflection subset — figures standing in/near water parcels */
  const reflection = useMemo(() => {
    const idx: number[] = []
    for (let i = 0; i < N && idx.length < 300; i++) {
      const f = figures[i]
      const inWater = parcels.some(p =>
        p.water &&
        Math.abs(f.x - p.x) < p.w / 2 + 0.5 &&
        Math.abs(f.z - p.z) < p.d / 2 + 0.5)
      if (inWater) idx.push(i)
    }
    return {
      idx,
      positions: new Float32Array(idx.length * 3),
      colors: new Float32Array(idx.length * 3),
      sizes: new Float32Array(idx.length),
      alphas: new Float32Array(idx.length),
      phases: Float32Array.from(idx, i => (i * 2.4) % (Math.PI * 2)),
    }
  }, [figures, parcels, N])

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const tmpColor = useMemo(() => new THREE.Color(), [])

  /* Scratch: soul world positions + body pose, reused by children/reflections */
  const soulPosRef = useRef(new Float32Array(N * 3))
  const bodyStateRef = useRef(new Float32Array(N * 3)) // sway, jy, bodyFade

  useFrame(({ camera, size, gl }) => {
    const t = getAnimTime()
    const phrase = phraseEnv(t)
    const still = stillness(t)
    const breathGlow = (1 - still) * 0.3 // the held breath brightens the lights
    // The beat drop: every lantern surges at once — the collective release.
    const dropFlash = t > T_DROP ? Math.exp(-(t - T_DROP) * 1.1) * 0.55 : 0

    updateGlowScale(glowMaterial, camera, size.height * gl.getPixelRatio(), t)
    updateGlowScale(reflMaterial, camera, size.height * gl.getPixelRatio(), t)

    const bodies = bodiesRef.current
    const heads = headsRef.current
    const souls = soulsRef.current
    const glow = glowRef.current
    if (!bodies || !heads || !souls || !glow) return

    const soulPos = soulPosRef.current
    const bodyState = bodyStateRef.current
    const { jumpDelay, groundCol, targetCol } = statics
    const soulColAttr = souls.geometry.getAttribute('color') as THREE.BufferAttribute
    const soulColors = soulColAttr.array as Float32Array
    const glowGeom = glow.geometry
    const glowPositions = (glowGeom.getAttribute('position') as THREE.BufferAttribute).array as Float32Array
    const glowColors = (glowGeom.getAttribute('aColor') as THREE.BufferAttribute).array as Float32Array
    const glowSizes = (glowGeom.getAttribute('aSize') as THREE.BufferAttribute).array as Float32Array
    const glowAlphas = (glowGeom.getAttribute('aAlpha') as THREE.BufferAttribute).array as Float32Array

    for (let i = 0; i < N; i++) {
      const f = figures[i]
      const gy = groundYAt(f.x, f.z)
      const bodyH = archetypeHeight(f.archetype) * f.scale * 3
      const bodyW = archetypeWidth(f.archetype) * f.scale * 3

      let k = 0
      if (t > f.riseStart) k = easeInOut(Math.min(1, (t - f.riseStart) / f.riseDur))

      // Ground motion: communal sway that swells with each sung line.
      const swayAmp = f.swayAmount * (0.35 + 0.85 * phrase) * still
      const sway = Math.sin(t * f.swaySpeed * (0.9 + 0.25 * phrase) + f.swayOffset) * swayAmp
      let jy = 0
      if (k === 0 && t > T_DROP) {
        const jq = (t - T_DROP - jumpDelay[i]) / 0.62
        if (jq > 0 && jq < 1) jy = Math.sin(Math.PI * jq) * 0.5 * f.scale * (f.archetype === 'child' ? 1.4 : 1)
      }

      // Body dissolves as the soul lifts.
      const bodyFade = k <= 0 ? 1 : 1 - smooth01(k / 0.28)
      bodyState[i * 3] = sway
      bodyState[i * 3 + 1] = jy
      bodyState[i * 3 + 2] = bodyFade

      if (bodyFade > 0.001) {
        dummy.position.set(f.x + sway, gy + jy + bodyH * 0.5 * bodyFade, f.z)
        dummy.rotation.set(0, 0, sway * 1.5)
        dummy.scale.set(bodyW * bodyFade, bodyH * bodyFade, bodyW * bodyFade)
      } else {
        dummy.position.set(f.x, -10, f.z)
        dummy.scale.setScalar(0.0001)
        dummy.rotation.set(0, 0, 0)
      }
      dummy.updateMatrix()
      bodies.setMatrixAt(i, dummy.matrix)

      // Head
      if (bodyFade > 0.001) {
        const headR = 0.13 * f.scale * (f.archetype === 'child' ? 1.15 : 1)
        dummy.position.set(f.x + sway * 1.15, gy + jy + (bodyH * 1.5 + headR * 0.9) * bodyFade, f.z)
        dummy.rotation.set(0, 0, sway * 0.8)
        dummy.scale.setScalar(headR * bodyFade)
      } else {
        dummy.position.set(f.x, -10, f.z)
        dummy.scale.setScalar(0.0001)
      }
      dummy.updateMatrix()
      heads.setMatrixAt(i, dummy.matrix)

      // Soul — lantern at the chest → spiral flight → star.
      let sx: number, sy: number, sz: number, sSize: number, gAlpha: number
      if (k <= 0) {
        sx = f.x + sway
        sy = gy + jy + bodyH * 1.05
        sz = f.z
        sSize = 0.05 * f.scale * 3 * (0.85 + 0.35 * phrase + dropFlash)
        const vary = 0.6 + ((i * 37) % 17) / 17 * 0.8 // per-lantern brightness variety
        gAlpha = (0.3 + 0.38 * phrase + breathGlow + dropFlash) * vary * (f.isMember ? 1.6 : 1)
        tmpColor.copy(groundCol[i])
      } else {
        const u = 1 - k
        const p0y = gy + bodyH * 1.0
        sx = u * u * f.x + 2 * u * k * f.x + k * k * f.target[0]
        sy = u * u * p0y + 2 * u * k * f.apexY + k * k * f.target[1]
        sz = u * u * f.z + 2 * u * k * f.z + k * k * f.target[2]
        const spiralAmp = f.spiralR * Math.sin(Math.PI * Math.min(1, k * 1.05))
        const ang = f.spiralPhase + f.spiralTurns * Math.PI * 2 * k
        sx += Math.cos(ang) * spiralAmp
        sz += Math.sin(ang) * spiralAmp
        const grow = smooth01(k)
        sSize = (0.05 * f.scale * 3) * (1 - grow) + f.targetSize * grow
        gAlpha = 0.36 + dropFlash * 0.5 + 0.3 * grow + (f.named ? 0.18 : 0)
        tmpColor.copy(groundCol[i]).lerp(targetCol[i], grow)
      }

      soulPos[i * 3] = sx; soulPos[i * 3 + 1] = sy; soulPos[i * 3 + 2] = sz

      dummy.position.set(sx, sy, sz)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.setScalar(k <= 0 ? 0.0001 : Math.max(0.0001, sSize))
      dummy.updateMatrix()
      souls.setMatrixAt(i, dummy.matrix)

      soulColors[i * 3] = tmpColor.r
      soulColors[i * 3 + 1] = tmpColor.g
      soulColors[i * 3 + 2] = tmpColor.b

      glowPositions[i * 3] = sx; glowPositions[i * 3 + 1] = sy; glowPositions[i * 3 + 2] = sz
      glowColors[i * 3] = tmpColor.r; glowColors[i * 3 + 1] = tmpColor.g; glowColors[i * 3 + 2] = tmpColor.b
      glowSizes[i] = k <= 0
        ? 0.78 * f.scale * 3
        : (0.78 * f.scale * 3) * (1 - smooth01(k)) + f.targetSize * 8 * smooth01(k)
      glowAlphas[i] = gAlpha
    }

    bodies.instanceMatrix.needsUpdate = true
    heads.instanceMatrix.needsUpdate = true
    souls.instanceMatrix.needsUpdate = true
    soulColAttr.needsUpdate = true

    // Carried children ride their parent's shoulders — and rise with them.
    const children = childrenRef.current
    if (children) {
      for (let ci = 0; ci < carriedBy.length; ci++) {
        const pi = carriedBy[ci]
        const f = figures[pi]
        const gy = groundYAt(f.x, f.z)
        const bodyH = archetypeHeight(f.archetype) * f.scale * 3
        const sway = bodyState[pi * 3]
        const jy = bodyState[pi * 3 + 1]
        const fade = bodyState[pi * 3 + 2]
        if (fade > 0.001) {
          dummy.position.set(f.x + sway * 1.2, gy + jy + bodyH * 1.28 * fade, f.z - 0.16)
          dummy.rotation.set(0, 0, sway * 1.6)
          dummy.scale.set(0.12 * f.scale * fade, 0.3 * f.scale * fade, 0.12 * f.scale * fade)
        } else {
          dummy.position.set(f.x, -10, f.z)
          dummy.scale.setScalar(0.0001)
        }
        dummy.updateMatrix()
        children.setMatrixAt(ci, dummy.matrix)
      }
      children.instanceMatrix.needsUpdate = true
    }

    // Water reflections — the paddies fill with stars as the souls rise.
    const refl = reflRef.current
    if (refl) {
      const { idx } = reflection
      const rGeom = refl.geometry
      const positions = (rGeom.getAttribute('position') as THREE.BufferAttribute).array as Float32Array
      const colors = (rGeom.getAttribute('aColor') as THREE.BufferAttribute).array as Float32Array
      const sizes = (rGeom.getAttribute('aSize') as THREE.BufferAttribute).array as Float32Array
      const alphas = (rGeom.getAttribute('aAlpha') as THREE.BufferAttribute).array as Float32Array
      for (let ri = 0; ri < idx.length; ri++) {
        const i = idx[ri]
        const f = figures[i]
        const sx = soulPos[i * 3]
        const sy = soulPos[i * 3 + 1]
        const k = t > f.riseStart ? Math.min(1, (t - f.riseStart) / f.riseDur) : 0
        positions[ri * 3] = k <= 0 ? sx : f.x
        positions[ri * 3 + 1] = -0.052
        positions[ri * 3 + 2] = k <= 0 ? soulPos[i * 3 + 2] : f.z
        colors[ri * 3] = soulColors[i * 3]
        colors[ri * 3 + 1] = soulColors[i * 3 + 1]
        colors[ri * 3 + 2] = soulColors[i * 3 + 2]
        sizes[ri] = 0.8 * f.scale * 3
        alphas[ri] = k <= 0
          ? 0.12 + 0.14 * phrase + breathGlow * 0.5
          : (0.14 + 0.22 * smooth01(Math.min(1, sy / 24))) * (1 - smooth01((k - 0.78) / 0.22))
      }
      const g = refl.geometry
      ;(g.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
      ;(g.getAttribute('aColor') as THREE.BufferAttribute).needsUpdate = true
      ;(g.getAttribute('aAlpha') as THREE.BufferAttribute).needsUpdate = true
      ;(g.getAttribute('aSize') as THREE.BufferAttribute).needsUpdate = true
    }

    ;(glowGeom.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
    ;(glowGeom.getAttribute('aColor') as THREE.BufferAttribute).needsUpdate = true
    ;(glowGeom.getAttribute('aSize') as THREE.BufferAttribute).needsUpdate = true
    ;(glowGeom.getAttribute('aAlpha') as THREE.BufferAttribute).needsUpdate = true
  })

  return (
    <group>
      {/* Bodies */}
      <instancedMesh ref={bodiesRef} args={[undefined, undefined, N]} frustumCulled={false}>
        <capsuleGeometry args={[0.5, 1, 4, 8]} />
        <meshStandardMaterial
          vertexColors roughness={0.6} metalness={0}
          emissive="#7A5E24" emissiveIntensity={0.34} toneMapped={false}
        />
        <instancedBufferAttribute attach="geometry-attributes-color" args={[statics.bodyColors, 3]} />
      </instancedMesh>

      {/* Heads */}
      <instancedMesh ref={headsRef} args={[undefined, undefined, N]} frustumCulled={false}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial
          vertexColors roughness={0.6} metalness={0}
          emissive="#7A5E24" emissiveIntensity={0.34} toneMapped={false}
        />
        <instancedBufferAttribute attach="geometry-attributes-color" args={[statics.bodyColors, 3]} />
      </instancedMesh>

      {/* Carried children */}
      <instancedMesh ref={childrenRef} args={[undefined, undefined, Math.max(1, carriedBy.length)]} frustumCulled={false}>
        <capsuleGeometry args={[0.5, 1, 4, 8]} />
        <meshStandardMaterial
          color="#C4913A" roughness={0.55} emissive={GOLD} emissiveIntensity={1.0} toneMapped={false}
        />
      </instancedMesh>

      {/* Souls */}
      <instancedMesh ref={soulsRef} args={[undefined, undefined, N]} frustumCulled={false}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshBasicMaterial vertexColors toneMapped={false} fog={false} />
        <instancedBufferAttribute attach="geometry-attributes-color" args={[statics.soulColors, 3]} />
      </instancedMesh>

      {/* Lantern / soul halos */}
      <points ref={glowRef} material={glowMaterial} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[statics.glowPositions, 3]} />
          <bufferAttribute attach="attributes-aColor" args={[statics.glowColors, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[statics.glowSizes, 1]} />
          <bufferAttribute attach="attributes-aAlpha" args={[statics.glowAlphas, 1]} />
          <bufferAttribute attach="attributes-aPhase" args={[statics.glowPhases, 1]} />
        </bufferGeometry>
      </points>

      {/* Reflections in the paddy water */}
      <points ref={reflRef} material={reflMaterial} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[reflection.positions, 3]} />
          <bufferAttribute attach="attributes-aColor" args={[reflection.colors, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[reflection.sizes, 1]} />
          <bufferAttribute attach="attributes-aAlpha" args={[reflection.alphas, 1]} />
          <bufferAttribute attach="attributes-aPhase" args={[reflection.phases, 1]} />
        </bufferGeometry>
      </points>

      <SplashRings world={world} />
      <Fireflies />
      <GoldenFigure />
    </group>
  )
}

/* ── Splash rings when the field jumps ───────────────────────────── */

function SplashRings({ world }: { world: World }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const rings = useMemo(() => {
    const rand = seededRandom(2468)
    const water = world.parcels.filter(p => p.water && Math.abs(p.x) < 22 && p.z > -42)
    return Array.from({ length: 30 }, () => {
      const p = water[Math.floor(rand() * water.length)]
      const x = p.x + (rand() - 0.5) * (p.w - 1)
      const z = p.z + (rand() - 0.5) * (p.d - 1)
      return {
        x, z,
        start: T_DROP + 0.52 + Math.hypot(x, z + 24) * 0.009 + rand() * 0.3,
        dur: 1.2 + rand() * 0.5,
      }
    })
  }, [world])

  const initialColors = useMemo(() => new Float32Array(rings.length * 3), [rings])

  useFrame(() => {
    const mesh = ref.current
    if (!mesh) return
    const t = getAnimTime()
    const colAttr = mesh.geometry.getAttribute('color') as THREE.BufferAttribute
    const colors = colAttr.array as Float32Array
    for (let i = 0; i < rings.length; i++) {
      const r = rings[i]
      const q = (t - r.start) / r.dur
      if (q <= 0 || q >= 1) {
        dummy.position.set(r.x, -10, r.z)
        dummy.scale.setScalar(0.0001)
      } else {
        const grow = 1 - (1 - q) * (1 - q)
        dummy.position.set(r.x, 0.045, r.z)
        dummy.rotation.set(-Math.PI / 2, 0, 0)
        dummy.scale.setScalar(0.15 + grow * 1.15)
      }
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      const fade = q > 0 && q < 1 ? Math.pow(1 - q, 1.8) * 0.22 : 0
      colors[i * 3] = 0.55 * fade
      colors[i * 3 + 1] = 0.66 * fade
      colors[i * 3 + 2] = 0.8 * fade
    }
    mesh.instanceMatrix.needsUpdate = true
    colAttr.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, rings.length]} frustumCulled={false}>
      <ringGeometry args={[0.88, 1, 32]} />
      <meshBasicMaterial
        vertexColors transparent opacity={1} depthWrite={false}
        blending={THREE.AdditiveBlending} side={THREE.DoubleSide} fog={false}
      />
      <instancedBufferAttribute attach="geometry-attributes-color" args={[initialColors, 3]} />
    </instancedMesh>
  )
}

/* ── Fireflies — and their upward scatter on the jump ────────────── */

function Fireflies({ count = 130 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null)
  const material = useMemo(() => makeGlowMaterial({ depthTest: true }), [])

  const data = useMemo(() => {
    const rand = seededRandom(7777)
    const base = new Float32Array(count * 3)
    const phases = new Float32Array(count)
    const freqs = new Float32Array(count)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const alphas = new Float32Array(count)
    const c = new THREE.Color()
    for (let i = 0; i < count; i++) {
      base[i * 3] = (rand() - 0.5) * 46
      base[i * 3 + 1] = 0.3 + rand() * 2.8
      base[i * 3 + 2] = 1 - rand() * 46
      phases[i] = rand() * Math.PI * 2
      freqs[i] = 0.4 + rand() * 1.4
      c.set(rand() < 0.6 ? FIREFLY_GREEN : '#E0E8A0')
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b
      sizes[i] = 0.09 + rand() * 0.13
      alphas[i] = 0.22 + rand() * 0.3
    }
    return { base, phases, freqs, colors, sizes, alphas, positions: base.slice() }
  }, [count])

  useFrame(({ camera, size, gl }) => {
    const pts = ref.current
    if (!pts) return
    const t = getAnimTime()
    updateGlowScale(material, camera, size.height * gl.getPixelRatio(), t)
    const { base, phases, freqs } = data
    const posAttr = pts.geometry.getAttribute('position') as THREE.BufferAttribute
    const positions = posAttr.array as Float32Array
    const scatter = smooth01((t - T_DROP) / 2.6) * 3.2
    for (let i = 0; i < count; i++) {
      positions[i * 3] = base[i * 3] + Math.sin(t * freqs[i] * 0.5 + phases[i]) * 1.1
      positions[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * freqs[i] * 0.35 + phases[i] * 2) * 0.5 + scatter * (0.4 + (i % 5) * 0.3)
      positions[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * freqs[i] * 0.4 + phases[i]) * 1.1
    }
    posAttr.needsUpdate = true
  })

  return (
    <points ref={ref} material={material} frustumCulled={false}>
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

/* ── The golden figure — singing on the road; never rises ────────── */

function GoldenFigure() {
  const light = useRef<THREE.PointLight>(null)
  const material = useMemo(() => makeGlowMaterial({ depthTest: false }), [])

  const halo = useMemo(() => {
    const c = new THREE.Color(GOLD)
    const c2 = new THREE.Color('#E8A030')
    return {
      positions: new Float32Array([0, 0.9, 0, 0, 0.95, 0]),
      colors: new Float32Array([c.r, c.g, c.b, c2.r, c2.g, c2.b]),
      sizes: new Float32Array([1.5, 3.2]),
      alphas: new Float32Array([0.5, 0.16]),
      phases: new Float32Array([0.9, 2.6]),
    }
  }, [])
  const alphaRef = useRef<THREE.BufferAttribute>(null)

  useFrame(({ camera, size, gl }) => {
    const t = getAnimTime()
    const phrase = phraseEnv(t)
    updateGlowScale(material, camera, size.height * gl.getPixelRatio(), t)
    // The camera lands right beside the figure for the up-shot — fade the
    // halo out so it doesn't wash the final frame.
    const near = 1 - smooth01((t - 43.2) / 1.6)
    if (alphaRef.current) {
      const arr = alphaRef.current.array as Float32Array
      arr[0] = (0.4 + phrase * 0.35) * near
      arr[1] = (0.1 + phrase * 0.12) * near
      alphaRef.current.needsUpdate = true
    }
    if (light.current) light.current.intensity = (1.6 + phrase * 2.2) * (0.5 + 0.5 * near)
  })

  return (
    <group position={GOLDEN_POS}>
      {/* Body — chin lifted, singing */}
      <group rotation={[-0.09, 0, 0]}>
        <mesh position={[0, 0.62, 0]}>
          <capsuleGeometry args={[0.16, 0.62, 4, 10]} />
          <meshStandardMaterial
            color={GOLD_BRIGHT} emissive={GOLD_BRIGHT} emissiveIntensity={1.9}
            roughness={0.4} toneMapped={false}
          />
        </mesh>
        <mesh position={[0, 1.22, 0.03]}>
          <sphereGeometry args={[0.135, 12, 10]} />
          <meshStandardMaterial
            color={GOLD_BRIGHT} emissive={GOLD_BRIGHT} emissiveIntensity={1.9}
            roughness={0.4} toneMapped={false}
          />
        </mesh>
      </group>
      <points material={material} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[halo.positions, 3]} />
          <bufferAttribute attach="attributes-aColor" args={[halo.colors, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[halo.sizes, 1]} />
          <bufferAttribute ref={alphaRef} attach="attributes-aAlpha" args={[halo.alphas, 1]} />
          <bufferAttribute attach="attributes-aPhase" args={[halo.phases, 1]} />
        </bufferGeometry>
      </points>
      <pointLight ref={light} color={GOLD} intensity={2} distance={7} decay={1.8} position={[0, 1, 0.4]} />
    </group>
  )
}
