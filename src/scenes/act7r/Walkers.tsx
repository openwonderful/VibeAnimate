/**
 * Act 7.2's crowd — the night market.
 *
 * Capsule body, sphere head, faded gold, never glowing: the same vocabulary
 * 8.55 draws its field in, because they ARE 8.55's field. This renders
 * `generateWorld()`'s figures ALREADY STANDING on the marks they hold when the
 * Arirang starts.
 *
 * They are already there. That is the whole point of the rewrite: the crowd
 * used to walk in — a procession that fell in beside the hero and a field that
 * materialised behind him — and a stranger fading into existence at your
 * shoulder is a ghost story, not a homecoming. Now the valley is holding a
 * festival, the market is full before he arrives, and what he walks into is a
 * crowd that has nothing to do with him. He is the only one going anywhere.
 *
 * They drift: a slow wander around each mark, a lazy turn, a small float. It
 * still reads as unearthly, which is fine — a lantern-lit field of faceless
 * figures should. What it no longer reads as is a crowd following him.
 *
 * The drift damps to exactly zero by act 31, so the handoff frame is not a
 * match for 8.55's opening frame — it is that frame.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getAnimTime } from '../../hooks/useAnimTime'
import { archetypeHeight, archetypeWidth, type World } from '../act8_55/world'
import { groundY } from '../act8_55/locale'
import { ACT_DUR, heroX, heroZ, smooth01 } from './journey'

/** Act B's valley floor, which is flat — see `groundY` in locale.tsx. */
const groundYAt = groundY

/**
 * 8.55 opens with the whole crowd at `lit = 0.025` — all but black, so the
 * house is the only warm thing in the valley. Act 7 can't use that: for most of
 * 7.2 these people are a lit market, not a held breath. So they carry a
 * readable faded gold and drain to 0.025 over the last stretch, arriving at the
 * handoff value exactly.
 */
const LIT_MARKET = 0.15
const LIT_HANDOFF = 0.025
/** Half-width of the corridor held open along the camera's sightline. */
const CLEAR_R = 1.7

/**
 * Per-figure brightness spread. A single value across 3,717 figures reads as
 * one undifferentiated mass; a market reads as people at different distances
 * from different lanterns. Applied to the market value only — the handoff term
 * is the same 0.025 for everyone, so this washes out before act 28 and the
 * final frame is untouched.
 */
function litAt(a: number, vary: number): number {
  return LIT_HANDOFF + (LIT_MARKET * vary - LIT_HANDOFF) * (1 - smooth01((a - 16) / 12))
}

/**
 * The drift. Everyone browses their own patch of the market, then stills as the
 * song approaches — by act 31 every offset here is exactly 0 and every figure
 * stands on `figures[i].{x, z}`.
 */
const DRIFT_SETTLE_START = 23.5
function driftK(a: number): number {
  return 1 - smooth01((a - DRIFT_SETTLE_START) / (ACT_DUR - DRIFT_SETTLE_START))
}

export function Walkers({ world, actOffset, settle = true }: {
  world: World
  actOffset: number
  /**
   * 7.2 settles: the drift damps to zero and the light drains to 8.55's
   * opening value, because its last frame has to BE 8.55's first frame. 7.3 is
   * a held moment in the middle of the market with no handoff to hit, so it
   * turns that off and the crowd just keeps milling at market brightness.
   */
  settle?: boolean
}) {
  const { figures } = world
  const N = figures.length
  const bodies = useRef<THREE.InstancedMesh>(null)
  const heads = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  /**
   * Per-figure drift parameters. Index-derived, never `Math.random()` — a
   * layout built from bare randomness gets a different result in every Remotion
   * tab and the whole crowd strobes.
   */
  const { palette, bodyColors, drift } = useMemo(() => {
    const palette = new Float32Array(N * 3)
    const bodyColors = new Float32Array(N * 3)
    // [wx, wz, wy, wyaw, rx, rz, phase, vary] per figure.
    const drift = new Float32Array(N * 8)
    const c = new THREE.Color()
    for (let i = 0; i < N; i++) {
      const f = figures[i]
      c.set(f.color)
      // 8.55's depth dimming, so the palette matches at the cut.
      const depth = Math.abs(f.z)
      const dim = depth < 12 ? 1.0 : depth < 26 ? 0.85 : 0.7
      palette[i * 3] = c.r * dim
      palette[i * 3 + 1] = c.g * dim
      palette[i * 3 + 2] = c.b * dim

      const d = i * 8
      drift[d] = 0.21 + ((i * 13) % 17) / 17 * 0.17       // lateral rate, x
      drift[d + 1] = 0.17 + ((i * 29) % 19) / 19 * 0.16   // lateral rate, z
      drift[d + 2] = 0.55 + ((i * 41) % 23) / 23 * 0.5    // float rate
      drift[d + 3] = 0.13 + ((i * 7) % 11) / 11 * 0.12    // turn rate
      drift[d + 4] = 0.5 + ((i * 53) % 29) / 29 * 0.8     // lateral radius, x
      drift[d + 5] = 0.45 + ((i * 37) % 31) / 31 * 0.7    // lateral radius, z
      drift[d + 6] = f.swayOffset                          // shared phase
      drift[d + 7] = 0.6 + ((i * 61) % 37) / 37 * 0.85     // brightness spread
    }
    return { palette, bodyColors, drift }
  }, [figures, N])

  useFrame(({ camera }) => {
    const bs = bodies.current
    const hs = heads.current
    if (!bs || !hs) return
    const a = getAnimTime() + actOffset
    const hx = heroX(a)
    const hz = heroZ(a)
    const dk = settle ? driftK(a) : 1
    // 8.55's own clock, for the idle sway that has to match at the cut.
    const t8 = a - ACT_DUR

    const camX = camera.position.x
    const camZ = camera.position.z
    const lineX = hx - camX
    const lineZ = hz - camZ
    const lineLen2 = Math.max(1e-4, lineX * lineX + lineZ * lineZ)
    const clearing = 1 - smooth01((a - 27) / 3)

    const bodyColAttr = bs.geometry.getAttribute('color') as THREE.BufferAttribute
    const headColAttr = hs.geometry.getAttribute('color') as THREE.BufferAttribute
    const cols = bodyColAttr.array as Float32Array

    for (let i = 0; i < N; i++) {
      const f = figures[i]
      const d = i * 8
      const ph = drift[d + 6]

      // Drifting around the mark, settling onto it. Every term carries `dk`,
      // which is 0 from act 31 — so this is 8.55's layout, exactly.
      const x = f.x + Math.sin(a * drift[d] + ph) * drift[d + 4] * dk
      const z = f.z + Math.sin(a * drift[d + 1] + ph * 1.7 + 1.1) * drift[d + 5] * dk
      const float = Math.sin(a * drift[d + 2] + ph * 2.3) * 0.075 * dk
      const yaw = Math.sin(a * drift[d + 3] + ph * 0.7) * 0.55 * dk

      let vis = 1

      // Nobody stands between the camera and him. A crowd this dense will
      // otherwise put a body across the one figure the shot is about; this
      // opens a narrow corridor along the camera's sightline and closes it
      // again by act 30, at which point the camera has reached 8.55's key and
      // 8.55's own OPEN_LANE keeps the same corridor clear anyway — so the
      // handoff frame is untouched.
      if (clearing > 0) {
        const px = x - camX
        const pz = z - camZ
        const proj = (px * lineX + pz * lineZ) / lineLen2
        if (proj > 0.04 && proj < 0.98) {
          const perp = Math.hypot(px - lineX * proj, pz - lineZ * proj)
          if (perp < CLEAR_R) vis *= 1 - clearing * (1 - smooth01(perp / CLEAR_R))
        }
      }

      const bodyH = archetypeHeight(f.archetype) * f.scale * 3
      const bodyW = archetypeWidth(f.archetype) * f.scale * 3
      const gy = groundYAt(x, z)

      // 8.55's idle sway, evaluated on 8.55's clock and at its t=0 amplitude —
      // `swayAmount × (0.35 + 0.85·phrase) × still × (0.15 + 0.85·igK)` with
      // phrase and igK both 0. Reproduced term for term rather than
      // approximated, so at the handoff every figure is displaced by exactly
      // what 8.55 displaces it by. (It is almost nothing: by then this crowd is
      // holding still in the dark, waiting for the song.)
      const sway = Math.sin(t8 * f.swaySpeed * 0.9 + ph) * f.swayAmount * 0.35 * 0.15

      // NO LEGS. These are not walkers and never were — 8.55's capsule spans
      // −0.5·bodyH … +1.5·bodyH with the bottom half BURIED, which is what
      // makes a still figure read as a candle standing in a field. Giving them
      // legs made them stride; drifting on legs is worse than drifting without.
      if (vis > 0.001) {
        dummy.position.set(x + sway, gy + float + bodyH * 0.5 * vis, z)
        dummy.rotation.set(0, yaw, sway * 1.5, 'YXZ')
        dummy.scale.set(bodyW * vis, bodyH * vis, bodyW * vis)
      } else {
        dummy.position.set(x, -10, z)
        dummy.rotation.set(0, 0, 0, 'YXZ')
        dummy.scale.setScalar(0.0001)
      }
      dummy.updateMatrix()
      bs.setMatrixAt(i, dummy.matrix)

      const headR = 0.13 * f.scale * (f.archetype === 'child' ? 1.15 : 1)
      if (vis > 0.001) {
        dummy.position.set(
          x + sway * 1.15,
          gy + float + (bodyH * 1.5 + headR * 0.9) * vis,
          z,
        )
        dummy.rotation.set(0, yaw, sway * 0.8, 'YXZ')
        dummy.scale.setScalar(headR * vis)
      } else {
        dummy.position.set(x, -10, z)
        dummy.scale.setScalar(0.0001)
      }
      dummy.updateMatrix()
      hs.setMatrixAt(i, dummy.matrix)

      const lit = settle ? litAt(a, drift[d + 7]) : LIT_MARKET * drift[d + 7]
      cols[i * 3] = palette[i * 3] * lit
      cols[i * 3 + 1] = palette[i * 3 + 1] * lit
      cols[i * 3 + 2] = palette[i * 3 + 2] * lit
    }

    bs.instanceMatrix.needsUpdate = true
    hs.instanceMatrix.needsUpdate = true
    bodyColAttr.needsUpdate = true
    headColAttr.needsUpdate = true
  })

  return (
    <>
      <instancedMesh ref={bodies} args={[undefined, undefined, N]} frustumCulled={false}>
        <capsuleGeometry args={[0.5, 1, 4, 8]} />
        <meshBasicMaterial vertexColors toneMapped={false} />
        <instancedBufferAttribute attach="geometry-attributes-color" args={[bodyColors, 3]} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, N]} frustumCulled={false}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshBasicMaterial vertexColors toneMapped={false} />
        <instancedBufferAttribute attach="geometry-attributes-color" args={[bodyColors, 3]} />
      </instancedMesh>
    </>
  )
}
