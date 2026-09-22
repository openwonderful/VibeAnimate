/**
 * Act 8b's crowd, and the lanterns they let go of.
 *
 * Everyone has been holding one since the first frame. Before the ring
 * reaches them the lantern is UNLIT — a pale paper shape at chest height, no
 * halo, no flame, nothing that could be mistaken for a soul. That distinction
 * is the whole scene: 8.55's crowd carries the light inside them and gives it
 * up; this crowd carries an object, and it has to read as an object first.
 * (It also means the ignition ring now does two things at once — it lights
 * four thousand lanterns, and it lights the faces looking at them.)
 *
 * Then the release, and from that point on this IS 8.55: same targets, same
 * spiral, same arrival times, same constellations locking overhead, because
 * the lantern flies on the figure's own `riseStart`/`riseDur`/`target` — the
 * ascent data `generateWorld()` already assigns. The two endings put the same
 * sky in the same place at the same moment.
 *
 * What differs is underneath. In 8.55 each body dissolves as its soul lifts
 * and the valley ends up empty. Here nobody goes anywhere: at 0:48 the ground
 * is still full of people, heads back, dimmer than they were because the thing
 * that was lighting them is forty metres up. Same gesture, opposite grammar.
 *
 * Draw calls: bodies, heads, carried children, paper envelopes, star cores,
 * halos, water reflections. Seven, for four thousand people.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getAnimTime } from '../../hooks/useAnimTime'
import {
  beatPulse, igniteTime, phraseEnv, seededRandom, stillness, T_DROP,
} from '../act8_55/constants'
import { archetypeHeight, archetypeWidth, type World } from '../act8_55/world'
import { makeGlowMaterial, updateGlowScale } from '../act8_55/glow'
import { groundY } from '../act8_55/locale'
import {
  MIX_HEX, ROUND, buildLanternGeometry, closeMouth, makeEnvelopeMaterial, mixLit,
} from './lanternShapes'
import { ARM, HOLD_Y, LANTERN_SIZE, lanternFlight, raise, touchDist } from './lanterns'

function smooth01(x: number): number {
  const c = Math.min(1, Math.max(0, x))
  return c * c * (3 - 2 * c)
}

/** Act B's valley floor, which is flat — see `groundY` in locale.tsx. */
const groundYAt = groundY

/**
 * The lantern the crowd is holding: the R6 drum, in the one amber, at the
 * brightness spread the air tests settled on — `?act=8b-air-drum` is a sky of
 * exactly this and nothing else.
 *
 * Short and wide, which is the whole argument for it. In the hand it is a small
 * object; forty metres up a drum still presents a disc while a tall envelope
 * has turned edge-on and become a sliver, and this scene spends most of its
 * length looking at four thousand of them from underneath.
 *
 * Mouth closed (see `closeMouth`), and the bamboo struts moved off the design's
 * own `ribs` and onto the shader's radius-gated seams — same look, and it does
 * not converge on the axis when the camera is below the lantern.
 */
const DRUM = closeMouth(ROUND[5], 0)

/**
 * How bright unlit paper is. Same order as an unlit body (0.025) — enough that
 * the opening frame has four thousand pale specks in it and you can tell
 * something is being held, dark enough that the only light in the valley is
 * still the house.
 */
const PAPER_UNLIT = 0.03

/**
 * How the paper is lit. Act 8b's own, not the plate's: this is `hanji` shading,
 * where thin paper carries more light at glancing angles and the rim term lights
 * the silhouette — against a night sky that is what makes a lantern glow rather
 * than merely be pale. The plate's model is inside-out from it and belongs to a
 * frame packed wall to wall with them.
 *
 * What the plate did contribute is the burner and the paper, both of which this
 * scene wanted anyway: the flame lives in the HOLE at the bottom and is the
 * brightest thing on the object, the crown keeps the paper's own amber because
 * it is furthest from the flame, and the envelope carries a hand-laid mottle and
 * eight glue seams. All three fade toward the axis so a lantern seen from below
 * stays a lantern.
 */
const CROWD_ENVELOPE = {
  vertexColors: true,
  flame: { gain: 1.05, inner: 0.06, outer: 0.46, tint: [1.0, 0.66, 0.3] as [number, number, number] },
  texture: { fibre: 0.18, seam: 0.14, seams: 8 },
  mouthFade: 0,
  falloff: [1.25, 0.5] as [number, number],
}

/** Lit body brightness. 8.55's number exactly — same valley, same exposure. */
const BODY_LIT = 0.68

const FIELD_CENTER: [number, number] = [0, -24]

export function LanternCrowd({ world }: { world: World }) {
  const { figures, carriedBy, parcels } = world
  const N = figures.length

  const bodiesRef = useRef<THREE.InstancedMesh>(null)
  const headsRef = useRef<THREE.InstancedMesh>(null)
  const childrenRef = useRef<THREE.InstancedMesh>(null)
  const shellRef = useRef<THREE.InstancedMesh>(null)
  const coreRef = useRef<THREE.InstancedMesh>(null)
  const glowRef = useRef<THREE.Points>(null)
  const reflRef = useRef<THREE.Points>(null)

  const glowMaterial = useMemo(() => makeGlowMaterial({ depthTest: false }), [])
  const reflMaterial = useMemo(() => makeGlowMaterial({ depthTest: true }), [])

  /**
   * The envelope, shared with the lab sheets and the air tests rather than
   * hand-rolled here. The scene used to carry its own profile and its own
   * shader patch, which is how it ended up a different lantern from the one the
   * sheets were used to CHOOSE the lantern — the whole point of `8b-air-drum`
   * is that it shows what this line renders.
   */
  const shellGeometry = useMemo(() => buildLanternGeometry(DRUM), [])
  const shellMaterial = useMemo(
    () => makeEnvelopeMaterial('#FFFFFF', 1, DRUM, CROWD_ENVELOPE), [])

  const statics = useMemo(() => {
    const bodyColors = new Float32Array(N * 3)
    const palette = new Float32Array(N * 3)
    const paper = new Float32Array(N * 3)
    /** Per-figure lit brightness, 1.4–2.0 — see `mixLit`. */
    const paperLit = new Float32Array(N)
    const paperRand = seededRandom(80551)
    const shellColors = new Float32Array(N * 3)
    const coreColors = new Float32Array(N * 3)
    const glowPositions = new Float32Array(N * 3)
    const glowColors = new Float32Array(N * 3)
    const glowSizes = new Float32Array(N)
    const glowAlphas = new Float32Array(N)
    const glowPhases = new Float32Array(N)
    const ignite = new Float32Array(N)
    const jumpDelay = new Float32Array(N)
    const targetCol = new Array<THREE.Color>(N)
    /** [climb, phase, sizeJitter, sideX, sideZ] per lantern. */
    const flight = new Float32Array(N * 5)
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

      // One amber for every lantern, and the variety carried entirely by
      // brightness. A palette of seven hues reads as seven kinds of paper; a
      // spread of brightness on one hue reads as four thousand lanterns lit at
      // slightly different moments, which is what a crowd actually is.
      c.set(MIX_HEX)
      paper[i * 3] = c.r
      paper[i * 3 + 1] = c.g
      paper[i * 3 + 2] = c.b
      paperLit[i] = mixLit(paperRand)
      shellColors[i * 3] = c.r * PAPER_UNLIT
      shellColors[i * 3 + 1] = c.g * PAPER_UNLIT
      shellColors[i * 3 + 2] = c.b * PAPER_UNLIT

      targetCol[i] = new THREE.Color(f.targetColor)
      glowPhases[i] = (i * 0.618) % (Math.PI * 2)

      // The ring — identical to 8.55's, from the two hands on the road.
      ignite[i] = igniteTime(touchDist(f.x, f.z), ((i * 73) % 29) / 29)
      const r = Math.hypot(f.x - FIELD_CENTER[0], f.z - FIELD_CENTER[1])
      jumpDelay[i] = r * 0.009 + (i % 7) * 0.012

      const k = i * 5
      // A WIDE spread of buoyant climb rates. This is the start tangent of the
      // whole flight: at a narrow spread four thousand lanterns leave as one
      // rigid sheet and the sky becomes a white lid. At 0.55–3.3 m/s the first
      // seconds off the hand have real depth in them.
      flight[k] = 0.55 + ((i * 31) % 41) / 41 * 2.75
      flight[k + 1] = ((i * 17) % 53) / 53 * Math.PI * 2
      flight[k + 2] = 0.78 + ((i * 23) % 37) / 37 * 0.44
      // Which hand it is held in, and how far out.
      const side = i % 2 === 0 ? 1 : -1
      flight[k + 3] = side * (0.16 + ((i * 13) % 11) / 11 * 0.1)
      flight[k + 4] = 0.1 + ((i * 29) % 7) / 7 * 0.1
    }
    return {
      bodyColors, palette, paper, paperLit, shellColors, coreColors, glowPositions, glowColors,
      glowSizes, glowAlphas, glowPhases, ignite, jumpDelay, targetCol, flight,
    }
  }, [figures, N])

  /** Water reflections while the lanterns are still low enough to cast any. */
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
    const n = Math.max(1, idx.length)
    return {
      idx,
      positions: new Float32Array(n * 3),
      colors: new Float32Array(n * 3),
      sizes: new Float32Array(n),
      alphas: new Float32Array(n),
      phases: Float32Array.from({ length: n }, (_, i) => (i * 2.4) % (Math.PI * 2)),
    }
  }, [figures, parcels, N])

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const tmpColor = useMemo(() => new THREE.Color(), [])
  const flamePos = useMemo<[number, number, number]>(() => [0, 0, 0], [])
  const lanternPos = useRef(new Float32Array(N * 3))
  /** sway, jump-y, bodyH — reused by the carried children pass. */
  const bodyStateRef = useRef(new Float32Array(N * 3))

  useFrame(({ camera, size, gl }) => {
    const t = getAnimTime()
    const phrase = phraseEnv(t)
    const still = stillness(t)
    const breathGlow = (1 - still) * 0.3
    const pulse = beatPulse(t)
    const dropFlash = t > T_DROP ? Math.exp(-(t - T_DROP) * 1.1) * 0.55 : 0

    updateGlowScale(glowMaterial, camera, size.height * gl.getPixelRatio(), t)
    updateGlowScale(reflMaterial, camera, size.height * gl.getPixelRatio(), t)

    const bodies = bodiesRef.current
    const heads = headsRef.current
    const shells = shellRef.current
    const cores = coreRef.current
    const glow = glowRef.current
    if (!bodies || !heads || !shells || !cores || !glow) return

    const { ignite, jumpDelay, palette, paper, paperLit, flight, targetCol } = statics
    const lp = lanternPos.current
    const bodyState = bodyStateRef.current
    const bodyColAttr = bodies.geometry.getAttribute('color') as THREE.BufferAttribute
    const headColAttr = heads.geometry.getAttribute('color') as THREE.BufferAttribute
    const bodyColors = bodyColAttr.array as Float32Array
    const shellColAttr = shells.geometry.getAttribute('color') as THREE.BufferAttribute
    const shellColors = shellColAttr.array as Float32Array
    const coreColAttr = cores.geometry.getAttribute('color') as THREE.BufferAttribute
    const coreColors = coreColAttr.array as Float32Array
    const glowGeom = glow.geometry
    const gPos = (glowGeom.getAttribute('position') as THREE.BufferAttribute).array as Float32Array
    const gCol = (glowGeom.getAttribute('aColor') as THREE.BufferAttribute).array as Float32Array
    const gSize = (glowGeom.getAttribute('aSize') as THREE.BufferAttribute).array as Float32Array
    const gAlpha = (glowGeom.getAttribute('aAlpha') as THREE.BufferAttribute).array as Float32Array

    for (let i = 0; i < N; i++) {
      const f = figures[i]
      const k = i * 5
      const gy = groundYAt(f.x, f.z)
      const bodyH = archetypeHeight(f.archetype) * f.scale * 3
      const bodyW = archetypeWidth(f.archetype) * f.scale * 3
      const headR = 0.13 * f.scale * (f.archetype === 'child' ? 1.15 : 1)

      const igK = smooth01((t - ignite[i]) / 1.7)
      const igFlash = t > ignite[i] ? Math.exp(-(t - ignite[i]) * 2.0) : 0

      // The release rides the figure's own ascent data, so the lantern reaches
      // its star at the instant 8.55's soul reaches the same one.
      const rel = f.riseStart
      const dur = f.riseDur
      const dt = t - rel
      const u = dt <= 0 ? 0 : Math.min(1, dt / dur)
      const up = raise(t, rel)

      const swayAmp = f.swayAmount * (0.35 + 0.85 * phrase) * still * (0.15 + 0.85 * igK)
      const sway = Math.sin(t * f.swaySpeed * (0.9 + 0.25 * phrase) + f.swayOffset) * swayAmp
      const sing = Math.max(0,
        Math.sin(t * (2.2 + ((i * 11) % 13) / 13 * 1.6) + f.swayOffset * 2.3),
      ) * phrase * igK * still

      /* ── The body ───────────────────────────────────────────────── */

      // Byte for byte 8.55's expression. An earlier pass ran the crowd at 0.2
      // on the theory that the light should be the thing they hold and the
      // people only what it falls on — which is a nice theory and reads as an
      // underexposed frame. The valley is the same valley; it should be lit
      // the same. They don't dim when the lantern goes either: nobody in this
      // one gets darker, that is the point of it.
      const lit = 0.025 + BODY_LIT * igK + igFlash * 0.5
      bodyColors[i * 3] = palette[i * 3] * lit
      bodyColors[i * 3 + 1] = palette[i * 3 + 1] * lit
      bodyColors[i * 3 + 2] = palette[i * 3 + 2] * lit

      // The drop. In 8.55 only the souls still on the ground jump; here nobody
      // has left, so the whole valley does — empty-handed, watching.
      let jy = 0
      if (t > T_DROP) {
        const jq = (t - T_DROP - jumpDelay[i]) / 0.62
        if (jq > 0 && jq < 1) {
          jy = Math.sin(Math.PI * jq) * 0.5 * f.scale * (f.archetype === 'child' ? 1.4 : 1)
        }
      }

      bodyState[i * 3] = sway
      bodyState[i * 3 + 1] = jy
      bodyState[i * 3 + 2] = bodyH

      const breathe = 1 + 0.035 * sing
      dummy.position.set(f.x + sway, gy + jy + bodyH * (0.5 + 0.02 * sing), f.z)
      dummy.rotation.set(0, 0, sway * 1.5)
      dummy.scale.set(bodyW, bodyH * breathe, bodyW)
      dummy.updateMatrix()
      bodies.setMatrixAt(i, dummy.matrix)

      // Heads tip back to follow the lanterns up — the reason the scene has
      // people left in it at all. Applied as a small lift-and-shift of the
      // head sphere, which at this silhouette scale reads as a tilt.
      const watch = smooth01((dt - 0.4) / 2.2)
      dummy.position.set(
        f.x + sway * 1.15,
        gy + jy + bodyH * (1.5 + 0.06 * sing) + headR * 0.9 + headR * 0.5 * watch,
        f.z - headR * 0.55 * watch,
      )
      dummy.rotation.set(0, 0, sway * 0.8)
      dummy.scale.setScalar(headR)
      dummy.updateMatrix()
      heads.setMatrixAt(i, dummy.matrix)

      /* ── The lantern ────────────────────────────────────────────── */

      const scale = flight[k + 2] * f.scale * LANTERN_SIZE
      // Where it leaves from: overhead, both arms up. The held pose below
      // converges on exactly this at `up` = 1, so the release has no seam.
      const p0x = f.x + flight[k + 3] * ARM * 0.45
      const p0y = gy + bodyH * 1.5 + headR * 2.6
      const p0z = f.z + flight[k + 4] * ARM * 0.45

      let lx: number
      let ly: number
      let lz: number
      if (dt <= 0) {
        // Held out to one side at chest height, then raised overhead: an
        // object being carried, not a light inside the body.
        const hold = gy + bodyH * HOLD_Y
        lx = f.x + sway * (1 - up) + flight[k + 3] * ARM * (1 - up * 0.55)
        ly = hold + (p0y - hold) * up + jy * (1 - up)
        lz = f.z + flight[k + 4] * ARM * (1 - up * 0.55)
      } else {
        lanternFlight(
          flamePos, [p0x, p0y, p0z], f.target, u, dur,
          flight[k], f.spiralR, f.spiralTurns, f.spiralPhase, flight[k + 1],
        )
        lx = flamePos[0]; ly = flamePos[1]; lz = flamePos[2]
      }
      lp[i * 3] = lx; lp[i * 3 + 1] = ly; lp[i * 3 + 2] = lz

      // How far along the turn from paper to star.
      const grow = u <= 0 ? 0 : smooth01((u - 0.42) / 0.58)
      // The envelope shrinks away over the second half of the flight — what
      // reaches the sky is a star, not a lantern parked on a catalog position.
      const shellK = 1 - smooth01((u - 0.5) / 0.4)

      // A rising lantern rocks: the envelope is a pendulum hung under hot air.
      const rock = dt > 0 ? Math.sin(dt * 1.15 + flight[k + 1]) * 0.13 * Math.exp(-dt * 0.11) : 0
      dummy.position.set(lx, ly, lz)
      dummy.rotation.set(rock, flight[k + 1], rock * 0.6, 'YXZ')
      dummy.scale.setScalar(Math.max(0.0001, scale * shellK))
      dummy.updateMatrix()
      shells.setMatrixAt(i, dummy.matrix)

      // Paper: unlit until the ring arrives, then lit from inside. Brighter
      // once released — the envelope stops being shadowed by the person
      // holding it — and dark again as it stops being paper.
      const litNow = (PAPER_UNLIT + (paperLit[i] - PAPER_UNLIT) * igK)
        * (1 + 0.35 * smooth01(dt / 2)) * shellK
      shellColors[i * 3] = paper[i * 3] * litNow
      shellColors[i * 3 + 1] = paper[i * 3 + 1] * litNow
      shellColors[i * 3 + 2] = paper[i * 3 + 2] * litNow

      // THE STAR, and nothing before it. There used to be a flame sphere here
      // sitting in the mouth of the envelope — physically where a lantern's
      // flame is, and on screen a bright ball hanging underneath a paper
      // shape, which is the exact orb-with-a-box read the variant exists to
      // avoid. The flame is now implied by the envelope's own shading (see the
      // gradient and rim terms in `shellMaterial`), and this mesh only wakes up
      // as the paper gives way to what it turns into.
      const coreR = f.targetSize * grow
      dummy.position.set(lx, ly, lz)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.setScalar(Math.max(0.0001, coreR))
      dummy.updateMatrix()
      cores.setMatrixAt(i, dummy.matrix)

      tmpColor.setRGB(1.0, 0.62, 0.26).lerp(targetCol[i], smooth01(grow * 1.6))
      coreColors[i * 3] = tmpColor.r
      coreColors[i * 3 + 1] = tmpColor.g
      coreColors[i * 3 + 2] = tmpColor.b

      /* ── Its halo ────────────────────────────────────────────────── */

      gPos[i * 3] = lx; gPos[i * 3 + 1] = ly; gPos[i * 3 + 2] = lz
      let size: number
      let alpha: number
      if (u <= 0) {
        // Tight to the paper. At 8.55's 0.78 the halo is wider than the thing
        // inside it and you are looking at an orb with a box in it — the one
        // read this variant cannot have. Tighter again now that the envelope is
        // carrying 1.4–2.0 of its own: the halo used to be doing the work, and
        // with the drum lit properly it only has to sit around it.
        size = 0.34 * f.scale * 3 * (0.4 + 0.6 * igK + igFlash * 0.5) * (1 + 0.15 * sing)
        const vary = 0.6 + ((i * 37) % 17) / 17 * 0.8
        alpha = (0.26 + 0.3 * phrase + breathGlow + dropFlash) * vary * igK
          * (0.78 + 0.5 * sing) + igFlash * 1.3
        tmpColor.setRGB(1.0, 0.7 + 0.06 * sing, 0.36)
      } else {
        // Off the hand the halo opens up — forty metres up there is no body to
        // mistake it for an orb beside, and a lantern seen from underneath is
        // mostly halo anyway. Short of 8.55's full soul glow, though: at that
        // radius the drum disappears inside its own light and the sky goes back
        // to being a field of round dots, which is what the air tests were run
        // to get away from. The envelope reads; the halo surrounds it.
        size = (0.7 * f.scale * 3) * (1 - grow) + f.targetSize * 11 * grow
        alpha = 0.4 + dropFlash * 0.5 + 0.54 * grow + (f.named ? 0.2 : 0)
        tmpColor.setRGB(1.0, 0.76, 0.44).lerp(targetCol[i], grow)
      }
      gCol[i * 3] = tmpColor.r; gCol[i * 3 + 1] = tmpColor.g; gCol[i * 3 + 2] = tmpColor.b
      gSize[i] = size
      gAlpha[i] = alpha * (1 + 0.38 * pulse)
    }

    bodies.instanceMatrix.needsUpdate = true
    heads.instanceMatrix.needsUpdate = true
    shells.instanceMatrix.needsUpdate = true
    cores.instanceMatrix.needsUpdate = true
    bodyColAttr.needsUpdate = true
    headColAttr.needsUpdate = true
    shellColAttr.needsUpdate = true
    coreColAttr.needsUpdate = true
    ;(glowGeom.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
    ;(glowGeom.getAttribute('aColor') as THREE.BufferAttribute).needsUpdate = true
    ;(glowGeom.getAttribute('aSize') as THREE.BufferAttribute).needsUpdate = true
    ;(glowGeom.getAttribute('aAlpha') as THREE.BufferAttribute).needsUpdate = true

    // Carried children ride their parent's shoulders — and stay there.
    const children = childrenRef.current
    if (children) {
      for (let ci = 0; ci < carriedBy.length; ci++) {
        const pi = carriedBy[ci]
        const f = figures[pi]
        const gy = groundYAt(f.x, f.z)
        const sway = bodyState[pi * 3]
        const jy = bodyState[pi * 3 + 1]
        const bodyH = bodyState[pi * 3 + 2]
        dummy.position.set(f.x + sway * 1.2, gy + jy + bodyH * 1.28, f.z - 0.16)
        dummy.rotation.set(0, 0, sway * 1.6)
        dummy.scale.set(0.12 * f.scale, 0.3 * f.scale, 0.12 * f.scale)
        dummy.updateMatrix()
        children.setMatrixAt(ci, dummy.matrix)
      }
      children.instanceMatrix.needsUpdate = true
    }

    // Reflections: the paddies hold the lanterns while they are still low,
    // and let them go as they climb out of the water's reach.
    const refl = reflRef.current
    if (refl) {
      const { idx } = reflection
      const rg = refl.geometry
      const rPos = (rg.getAttribute('position') as THREE.BufferAttribute).array as Float32Array
      const rCol = (rg.getAttribute('aColor') as THREE.BufferAttribute).array as Float32Array
      const rSize = (rg.getAttribute('aSize') as THREE.BufferAttribute).array as Float32Array
      const rAlpha = (rg.getAttribute('aAlpha') as THREE.BufferAttribute).array as Float32Array
      for (let ri = 0; ri < idx.length; ri++) {
        const i = idx[ri]
        rPos[ri * 3] = lp[i * 3]
        rPos[ri * 3 + 1] = -0.052
        rPos[ri * 3 + 2] = lp[i * 3 + 2]
        rCol[ri * 3] = 1.0; rCol[ri * 3 + 1] = 0.78; rCol[ri * 3 + 2] = 0.46
        rSize[ri] = 0.8 * figures[i].scale * 3
        const igKr = smooth01((t - ignite[i]) / 1.7)
        const alt = Math.max(0, lp[i * 3 + 1] - 2)
        rAlpha[ri] = (0.13 + 0.14 * phrase + breathGlow * 0.5) * igKr * (1 - smooth01(alt / 14))
      }
      ;(rg.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
      ;(rg.getAttribute('aColor') as THREE.BufferAttribute).needsUpdate = true
      ;(rg.getAttribute('aSize') as THREE.BufferAttribute).needsUpdate = true
      ;(rg.getAttribute('aAlpha') as THREE.BufferAttribute).needsUpdate = true
    }
  })

  return (
    <group>
      <instancedMesh ref={bodiesRef} args={[undefined, undefined, N]} frustumCulled={false}>
        <capsuleGeometry args={[0.5, 1, 4, 8]} />
        <meshBasicMaterial vertexColors toneMapped={false} />
        <instancedBufferAttribute attach="geometry-attributes-color" args={[statics.bodyColors, 3]} />
      </instancedMesh>

      <instancedMesh ref={headsRef} args={[undefined, undefined, N]} frustumCulled={false}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshBasicMaterial vertexColors toneMapped={false} />
        <instancedBufferAttribute attach="geometry-attributes-color" args={[statics.bodyColors, 3]} />
      </instancedMesh>

      <instancedMesh
        ref={childrenRef} args={[undefined, undefined, Math.max(1, carriedBy.length)]}
        frustumCulled={false}
      >
        <capsuleGeometry args={[0.5, 1, 4, 8]} />
        <meshBasicMaterial color="#7A5C22" toneMapped={false} />
      </instancedMesh>

      {/* The paper envelope. Unlit it is just pale paper; lit from inside it
          is the whole look, which is why it is emissive rather than shaded. */}
      <instancedMesh
        ref={shellRef} geometry={shellGeometry} material={shellMaterial}
        args={[undefined, undefined, N]} frustumCulled={false}
      >
        <instancedBufferAttribute attach="geometry-attributes-color" args={[statics.shellColors, 3]} />
      </instancedMesh>

      {/* The star. HDR-bright, so bloom turns each arrival into a real point
          of light — the same core 8.55's souls lock in with. */}
      <instancedMesh ref={coreRef} args={[undefined, undefined, N]} frustumCulled={false}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshBasicMaterial
          ref={m => { if (m) m.color.setRGB(1.6, 1.52, 1.35) }}
          vertexColors toneMapped={false} fog={false}
        />
        <instancedBufferAttribute attach="geometry-attributes-color" args={[statics.coreColors, 3]} />
      </instancedMesh>

      <points ref={glowRef} material={glowMaterial} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[statics.glowPositions, 3]} />
          <bufferAttribute attach="attributes-aColor" args={[statics.glowColors, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[statics.glowSizes, 1]} />
          <bufferAttribute attach="attributes-aAlpha" args={[statics.glowAlphas, 1]} />
          <bufferAttribute attach="attributes-aPhase" args={[statics.glowPhases, 1]} />
        </bufferGeometry>
      </points>

      <points ref={reflRef} material={reflMaterial} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[reflection.positions, 3]} />
          <bufferAttribute attach="attributes-aColor" args={[reflection.colors, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[reflection.sizes, 1]} />
          <bufferAttribute attach="attributes-aAlpha" args={[reflection.alphas, 1]} />
          <bufferAttribute attach="attributes-aPhase" args={[reflection.phases, 1]} />
        </bufferGeometry>
      </points>
    </group>
  )
}
