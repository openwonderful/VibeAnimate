/**
 * Act 8.51 crowd — v2: THE IGNITION.
 *
 * The scene opens dark: hundreds of unlit silhouettes, one glowing golden
 * figure singing before the house. As the first Arirang line lands, light
 * spreads outward from the singer through the crowd — each figure catches
 * the song with a small flash and settles into the SAME warm gold as the
 * golden figure, until the whole field burns like one shared voice.
 * Bodies are unlit (per-instance brightness is the ignition state itself);
 * everything downstream — jump, splash, spiral ascent, constellations —
 * is inherited from 8.5.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { easeInOut, getAnimTime } from '../../hooks/useAnimTime'
import {
  beatPulse, FIREFLY_GREEN, GOLD, GOLD_BRIGHT, GOLDEN_POS, igniteTime, phraseEnv,
  stillness, T_DROP, TOUCH_POS,
} from './constants'
import { archetypeHeight, archetypeWidth, seededRandom, type World } from './world'
import { makeGlowMaterial, setGlowGlobal, updateGlowScale } from './glow'
import { GoldFigure } from '../characters/goldFigure'
import { heroSkeleton, HERO_REST_HAND } from './hero'
import { heroGlow, heroReach, reachHandWorld, touchFlash } from './homecoming'

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
    const bodyColors = new Float32Array(N * 3)   // live attr (rewritten per frame)
    const palette = new Float32Array(N * 3)      // lit body color per figure
    const soulColors = new Float32Array(N * 3)
    const glowPositions = new Float32Array(N * 3)
    const glowColors = new Float32Array(N * 3)
    const glowSizes = new Float32Array(N)
    const glowAlphas = new Float32Array(N)
    const glowPhases = new Float32Array(N)
    const jumpDelay = new Float32Array(N)
    const ignite = new Float32Array(N)
    const igniteDist = new Float32Array(N)
    const groundCol = new Array<THREE.Color>(N)
    const targetCol = new Array<THREE.Color>(N)
    const c = new THREE.Color()

    for (let i = 0; i < N; i++) {
      const f = figures[i]
      c.set(f.color)
      const depth = Math.abs(f.z)
      const dim = depth < 12 ? 1.0 : depth < 26 ? 0.85 : 0.7
      palette[i * 3] = c.r * dim
      palette[i * 3 + 1] = c.g * dim
      palette[i * 3 + 2] = c.b * dim
      bodyColors[i * 3] = palette[i * 3] * 0.025
      bodyColors[i * 3 + 1] = palette[i * 3 + 1] * 0.025
      bodyColors[i * 3 + 2] = palette[i * 3 + 2] * 0.025
      groundCol[i] = new THREE.Color(f.color)
      targetCol[i] = new THREE.Color(f.targetColor)
      glowPhases[i] = (i * 0.618) % (Math.PI * 2)
      const r = Math.hypot(f.x, f.z + 24)
      jumpDelay[i] = r * 0.009 + (i % 7) * 0.012
      // THE RING. Light spreads outward from the point where the hero's hand
      // meets the parent's — not from the singer, and not by lottery. See
      // `igniteTime` in constants.ts for the radius→beat curve.
      const dTouch = Math.hypot(f.x - TOUCH_POS[0], f.z - TOUCH_POS[2])
      ignite[i] = igniteTime(dTouch, ((i * 73) % 29) / 29)
      igniteDist[i] = dTouch
    }
    return {
      bodyColors, palette, soulColors, glowPositions, glowColors, glowSizes, glowAlphas,
      glowPhases, jumpDelay, ignite, igniteDist, groundCol, targetCol,
    }
  }, [figures, N])

  /** Everyone glows the same color once lit — the singer's gold. */
  const unifiedGold = useMemo(() => new THREE.Color(GOLD_BRIGHT), [])

  /* Reflection subset — figures standing in/near water parcels */
  const reflection = useMemo(() => {
    const idx: number[] = []
    for (let i = 0; i < N && idx.length < 600; i++) {
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
    // Every measured drum hit: the whole field of light breathes with it.
    const pulse = beatPulse(t)

    updateGlowScale(glowMaterial, camera, size.height * gl.getPixelRatio(), t)
    updateGlowScale(reflMaterial, camera, size.height * gl.getPixelRatio(), t)

    const bodies = bodiesRef.current
    const heads = headsRef.current
    const souls = soulsRef.current
    const glow = glowRef.current
    if (!bodies || !heads || !souls || !glow) return

    const soulPos = soulPosRef.current
    const bodyState = bodyStateRef.current
    const { jumpDelay, ignite, palette, groundCol, targetCol } = statics
    const soulColAttr = souls.geometry.getAttribute('color') as THREE.BufferAttribute
    const soulColors = soulColAttr.array as Float32Array
    const bodyColAttr = bodies.geometry.getAttribute('color') as THREE.BufferAttribute
    const headColAttr = heads.geometry.getAttribute('color') as THREE.BufferAttribute
    const bodyColors = bodyColAttr.array as Float32Array
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

      // The ignition: has the song reached this figure yet?
      const igK = smooth01((t - ignite[i]) / 1.7)
      // The leading edge of the ring. Bright and short: what you see crossing
      // the field is this flash, not the steady value behind it.
      const igFlash = t > ignite[i] ? Math.exp(-(t - ignite[i]) * 2.0) : 0

      // Unlit figures wait in stillness; lit ones sway with the lines.
      const swayAmp = f.swayAmount * (0.35 + 0.85 * phrase) * still * (0.15 + 0.85 * igK)
      const sway = Math.sin(t * f.swaySpeed * (0.9 + 0.25 * phrase) + f.swayOffset) * swayAmp
      // Singing: each lit figure breathes on its own cycle — chest swells,
      // head lifts, lantern brightens on the exhale. A choir, not statues.
      const sing = Math.max(0,
        Math.sin(t * (2.2 + ((i * 11) % 13) / 13 * 1.6) + f.swayOffset * 2.3),
      ) * phrase * igK * still

      // Body brightness IS the ignition state — dark silhouette → shared gold.
      // (values are linear-space: 0.025 reads as a barely-there silhouette)
      const lit = 0.025 + 0.68 * igK + igFlash * 0.5
      bodyColors[i * 3] = palette[i * 3] * lit
      bodyColors[i * 3 + 1] = palette[i * 3 + 1] * lit
      bodyColors[i * 3 + 2] = palette[i * 3 + 2] * lit
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
        const breathe = 1 + 0.035 * sing
        dummy.position.set(f.x + sway, gy + jy + bodyH * (0.5 + 0.02 * sing) * bodyFade, f.z)
        dummy.rotation.set(0, 0, sway * 1.5)
        dummy.scale.set(bodyW * bodyFade, bodyH * breathe * bodyFade, bodyW * bodyFade)
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
        dummy.position.set(
          f.x + sway * 1.15,
          gy + jy + (bodyH * (1.5 + 0.06 * sing) + headR * 0.9) * bodyFade,
          f.z,
        )
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
        sSize = 0.05 * f.scale * 3 * (0.85 + 0.35 * phrase + dropFlash) * (0.4 + 0.6 * igK) * (1 + 0.18 * sing)
        const vary = 0.6 + ((i * 37) % 17) / 17 * 0.8 // per-lantern brightness variety
        gAlpha = ((0.34 + 0.38 * phrase + breathGlow + dropFlash) * vary * igK * (0.78 + 0.5 * sing) + igFlash * 1.3)
          * (f.isMember ? 1.6 : 1)
        // Once lit, everyone burns the singer's gold.
        tmpColor.copy(groundCol[i]).lerp(unifiedGold, igK * 0.9)
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
        // Souls burn brightest mid-flight — a rising ember, not a dot.
        const emberPulse = 1 + 0.35 * Math.sin(Math.PI * Math.min(1, k))
        sSize = ((0.05 * f.scale * 3) * 1.3 * (1 - grow) + f.targetSize * grow) * emberPulse
        gAlpha = 0.52 + dropFlash * 0.5 + 0.42 * grow + (f.named ? 0.2 : 0)
        // Rising souls set off from the unified gold toward their star color.
        tmpColor.copy(unifiedGold).lerp(targetCol[i], grow)
      }

      // Everyone stays bright — and surges together on each beat.
      gAlpha *= 1 + 0.38 * pulse
      sSize *= 1 + 0.08 * pulse

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
        ? 0.78 * f.scale * 3 * (0.4 + 0.6 * igK + igFlash * 0.5) * (1 + 0.15 * sing)
        : (1.0 * f.scale * 3) * (1 - smooth01(k)) + f.targetSize * 11 * smooth01(k)
      glowAlphas[i] = gAlpha
    }

    bodies.instanceMatrix.needsUpdate = true
    heads.instanceMatrix.needsUpdate = true
    souls.instanceMatrix.needsUpdate = true
    soulColAttr.needsUpdate = true
    bodyColAttr.needsUpdate = true
    headColAttr.needsUpdate = true

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
        const igKr = smooth01((t - ignite[i]) / 1.7)
        sizes[ri] = 0.8 * f.scale * 3
        alphas[ri] = k <= 0
          ? (0.12 + 0.14 * phrase + breathGlow * 0.5) * igKr
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
        <meshBasicMaterial vertexColors toneMapped={false} />
        <instancedBufferAttribute attach="geometry-attributes-color" args={[statics.bodyColors, 3]} />
      </instancedMesh>

      {/* Heads */}
      <instancedMesh ref={headsRef} args={[undefined, undefined, N]} frustumCulled={false}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshBasicMaterial vertexColors toneMapped={false} />
        <instancedBufferAttribute attach="geometry-attributes-color" args={[statics.bodyColors, 3]} />
      </instancedMesh>

      {/* Carried children */}
      <instancedMesh ref={childrenRef} args={[undefined, undefined, Math.max(1, carriedBy.length)]} frustumCulled={false}>
        <capsuleGeometry args={[0.5, 1, 4, 8]} />
        <meshBasicMaterial color="#7A5C22" toneMapped={false} />
      </instancedMesh>

      {/* Souls — HDR-bright cores so bloom turns them into real embers */}
      <instancedMesh ref={soulsRef} args={[undefined, undefined, N]} frustumCulled={false}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshBasicMaterial
          ref={m => { if (m) m.color.setRGB(1.6, 1.52, 1.35) }}
          vertexColors toneMapped={false} fog={false}
        />
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

      <Fireflies />
      <GoldenFigure />
    </group>
  )
}

/* ── Fireflies — and their upward scatter on the jump ────────────── */

/**
 * Exported so Act 7 can fade this exact swarm in as the water comes back — a
 * different firefly layer would pop at the handoff.  `tOff` shifts the clock,
 * `fade` scales the whole layer (1 = as 8.55 renders it).
 */
export function Fireflies({ count = 170, tOff = 0, fade }: {
  count?: number
  tOff?: number
  fade?: (t: number) => number
}) {
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
    const t = getAnimTime() + tOff
    updateGlowScale(material, camera, size.height * gl.getPixelRatio(), t)
    if (fade) setGlowGlobal(material, fade(t))
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

/**
 * The hero is a STICK FIGURE — the one person in this world who is drawn as a
 * person. The crowd are capsule-and-sphere silhouettes; he is the kid from Act
 * 3 grown up, and he keeps the articulated body he has had since the road at
 * dusk. (The people he knows — the parent, eventually the Seven — get the same
 * treatment; everyone else stays a peg.)
 *
 * Sized so he stands exactly as tall as a 'tall' crowd figure: a stick figure's
 * crown sits at ADULT.HEAD_Y + ADULT.RH = 1.89, and a tall peg's is
 * 1.5·bodyH + 1.9·headR ≈ 1.91 at scale 0.7. Scale 1 is the match.
 */
export function GoldenFigure() {
  const light = useRef<THREE.PointLight>(null)
  const material = useMemo(() => makeGlowMaterial({ depthTest: false }), [])

  // He arrives DARK. `emissiveIntensity` is driven from zero by `heroGlow`, so
  // for the first two seconds of this scene — and for the whole of Act 7 before
  // it — he is an ordinary warm-toned figure lit by the house and the market,
  // and the frame has no light source in it but the ones that were already
  // here. The colour is a mid warm rather than GOLD_BRIGHT so he reads at all
  // while unlit; once the emissive is up it swamps the colour completely.
  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#C79A5E', emissive: GOLD_BRIGHT, emissiveIntensity: 0,
    roughness: 0.4, toneMapped: false,
  }), [])

  // His reaching hand, in the frame the GoldFigure is built in. Mutated per
  // frame rather than re-rendered — the reach is a continuous move.
  const handRef = useRef<[number, number, number] | undefined>(undefined)
  const standing = useMemo(() => () => heroSkeleton(0, 0, handRef.current), [])

  const halo = useMemo(() => {
    const c = new THREE.Color(GOLD)
    const c2 = new THREE.Color('#E8A030')
    return {
      // Centred on the chest of the stick figure (shoulder 1.47, hip 0.93).
      positions: new Float32Array([0, 1.2, 0, 0, 1.25, 0]),
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
    // And soften the big outer halo whenever the camera is close (opening shot).
    const dCam = Math.hypot(
      camera.position.x - GOLDEN_POS[0], camera.position.z - GOLDEN_POS[2])
    const far = smooth01((dCam - 3.5) / 6)
    const pulse = beatPulse(t)
    const lit = heroGlow(t)
    const flash = touchFlash(t)

    // The reach, authored in world space because it has to land on a point
    // defined between two figures, then carried back through this group's two
    // transforms: the outer yaw of π, then the chin-lift tilt of −0.09 about x.
    const reach = heroReach(t)
    if (reach > 0.001) {
      const w = reachHandWorld(
        [GOLDEN_POS[0], GOLDEN_POS[2]], reach,
        -HERO_REST_HAND[0], HERO_REST_HAND[1], -HERO_REST_HAND[2],
      )
      const ox = -(w[0] - GOLDEN_POS[0])
      const oy = w[1]
      const oz = -(w[2] - GOLDEN_POS[2])
      const c = Math.cos(0.09)
      const s = Math.sin(0.09)
      handRef.current = [ox, oy * c - oz * s, oy * s + oz * c]
    } else {
      handRef.current = undefined
    }

    bodyMat.emissiveIntensity = lit * 1.9 + flash * 1.2
    if (alphaRef.current) {
      const arr = alphaRef.current.array as Float32Array
      // Nothing at all until the two hands meet; then everything at once.
      arr[0] = (0.55 + phrase * 0.3 + pulse * 0.22) * near * lit + flash * 0.5
      arr[1] = (0.15 + phrase * 0.1 + pulse * 0.06) * near * far * lit + flash * 0.2
      alphaRef.current.needsUpdate = true
    }
    // The body holds a constant emissive; the halo and the point light are
    // what breathe with the line he is singing.
    if (light.current) {
      light.current.intensity = (2.4 + phrase * 2.0) * (0.5 + 0.5 * near) * lit + flash * 5
    }
  })

  // Turned to face the house he is singing to — the camera opens behind him,
  // which is also the shot Act 7 walks in on.
  return (
    <group position={GOLDEN_POS} rotation={[0, Math.PI, 0]}>
      {/* Body — chin lifted, singing */}
      <group rotation={[-0.09, 0, 0]}>
        <GoldFigure skeleton={standing} material={bodyMat} inPlace />
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
      <pointLight ref={light} color={GOLD} intensity={0} distance={7} decay={1.8} position={[0, 1.25, 0.4]} />
    </group>
  )
}
