/**
 * The tree in Act B's valley, and the two beats that happen under it.
 *
 * Replaces `act4/yard.tsx` for 4.3 and 4.7. The yard was a self-contained set
 * — its own wall, its own cone mountains, its own sky on a plane — built
 * before Act B existed. Now these two beats are staged in Act B's actual
 * valley, under Act B's actual tree, and this module holds the numbers the
 * pair share so the "before / after" rhyme cannot drift: same anchor, same
 * camera, same hour, same branch.
 *
 * ── Units ─────────────────────────────────────────────────────────────
 * Act B's world, so: an adult GoldFigure is `scale={20}` and stands 37.8 tall,
 * the tree is ~120 to the crown, and the valley floor sits at VALLEY_Y. Every
 * number below is in those units.
 *
 * ── What differs between the two beats ────────────────────────────────
 * Only the people, and how high they have to reach. 4.3 lifts a toddler to a
 * fruit they could never get to alone; 4.7 has the grown child pick from the
 * same limb standing flat on the ground and hand it *down*. The branch is the
 * measuring stick — it does not move, which is the entire point — so the
 * height log that used to be scratched on the stone wall is no longer needed
 * and the wall is gone.
 */

import { useMemo } from 'react'
import * as THREE from 'three'
import { VALLEY_Y, TREE_X, TREE_Z } from '../actB/flight'
import type { V3 } from '../sets/hanok'

/** Act 3.1's light: sun low in the pass, long shadows down the valley. */
export const GOLDEN_HOUR = 65

/** Foot of the tree — matches Act B's own `RoadsideTree` placement exactly. */
export const TREE_ANCHOR: V3 = [TREE_X, VALLEY_Y + 4, TREE_Z]

/** Where the two of them stand: just off the trunk on the camera side, so it
 *  rises behind them rather than through them. */
export const PAIR_POS: V3 = [TREE_X - 19, VALLEY_Y + 4, TREE_Z - 25]

/**
 * Down-valley of the pair, looking back toward the pass.
 *
 * Two things fall out of this bearing for free: the low sun is behind the tree
 * so both figures are rim-lit, and the road — with Act B's own two walkers on
 * it — is behind the lens instead of in the background doing something this
 * scene is not about.
 *
 * Close, and not much wider than the two of them. The first pass sat 110 units
 * out at 38°, which put a lovely valley on screen and made the beat itself two
 * gold splinters in the middle of it — at one second, an audience gets one
 * subject, and the subject here is a child's hand arriving at a persimmon.
 */
export const LIFT_CAMERA = {
  position: [TREE_X - 29, VALLEY_Y + 32, TREE_Z - 96] as V3,
  target: [TREE_X - 19, VALLEY_Y + 34, TREE_Z - 25] as V3,
  fov: 47,
}

/**
 * World-space point the fruit hangs at — what both beats reach for.
 *
 * Not estimated. 4.3's child publishes the world position of its reaching hand
 * every frame (`window.__hand`), and this is that readout at the top of the
 * lift, so the fingers arrive exactly on the fruit rather than near it. Re-run
 * `npm run eval -- --act 4.3 --wait 5500 "window.__anim.seek(1.0), window.__hand"`
 * after any change to the lift and paste the result back here.
 */
export const FRUIT_AT: V3 = [274.8, 68.7, -2620.9]

/**
 * Grass at the foot of the tree, so they are standing on something other than
 * a flooded rice paddy. Act B's own `RoadsideTree` lays down the same patch
 * for the same reason.
 */
export function TreeGrass() {
  return (
    <mesh
      position={[TREE_X - 12, VALLEY_Y + 4.7, TREE_Z - 16]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <circleGeometry args={[62, 24]} />
      <meshStandardMaterial color="#2C3A22" roughness={1} />
    </mesh>
  )
}

/* ══ The low limb ═══════════════════════════════════════════════════ */

/**
 * One fruited branch, reaching out over where they stand.
 *
 * Act B's tree grows its limbs from a seed and spirals them around the trunk,
 * which is right for a tree seen whole from forty metres and useless when a
 * specific hand has to close on a specific persimmon. This limb is authored:
 * it comes off the trunk at head height, sweeps out over the pair, and carries
 * its fruit at exactly FRUIT_AT. Both beats are built against that one point.
 */
export function LowBranch() {
  const wood = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#4A3326', roughness: 0.96, metalness: 0,
  }), [])
  const leafA = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#24401E', roughness: 1, flatShading: true,
  }), [])
  const leafB = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#2F5426', roughness: 1, flatShading: true,
  }), [])
  const fruitMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#E4661F', roughness: 0.65, metalness: 0,
    emissive: new THREE.Color('#7A2A08'), emissiveIntensity: 0.45,
  }), [])

  /** Stem height above the fruit — persimmons hang, they do not float. */
  const LIMB_Y = FRUIT_AT[1] + 5.5

  // Off the trunk → out over them → drooping where the fruit hangs.
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(TREE_X + 2, LIMB_Y - 8, TREE_Z + 1),
      new THREE.Vector3(TREE_X - 5, LIMB_Y - 2, TREE_Z - 7),
      new THREE.Vector3(TREE_X - 14, LIMB_Y + 1.5, TREE_Z - 14),
      new THREE.Vector3(FRUIT_AT[0] + 2, LIMB_Y, FRUIT_AT[2] - 1),
      new THREE.Vector3(FRUIT_AT[0] - 11, LIMB_Y - 2.5, FRUIT_AT[2] + 6),
    ], false, 'catmullrom', 0.5)
    return new THREE.TubeGeometry(curve, 26, 1.15, 8, false)
  }, [LIMB_Y])

  const clumps = useMemo(() => ([
    { p: [TREE_X - 10, LIMB_Y + 4, TREE_Z - 10] as V3, r: 7.5, m: 0 },
    { p: [TREE_X - 19, LIMB_Y + 6, TREE_Z - 18] as V3, r: 8.5, m: 1 },
    { p: [FRUIT_AT[0] + 4, LIMB_Y + 5, FRUIT_AT[2] - 2] as V3, r: 7, m: 1 },
    { p: [FRUIT_AT[0] - 10, LIMB_Y + 2, FRUIT_AT[2] + 7] as V3, r: 6.5, m: 0 },
  ]), [LIMB_Y])

  return (
    <group>
      <mesh geometry={geo} material={wood} castShadow />
      {clumps.map((c, i) => (
        <mesh
          key={i} position={c.p} material={c.m === 0 ? leafA : leafB}
          rotation={[i * 0.8, i * 1.4, i * 0.5]}
        >
          <icosahedronGeometry args={[c.r, 0]} />
        </mesh>
      ))}
      {/* The one they are reaching for, and two more beside it so it does not
          look like the tree grew a single fruit for the convenience of the
          shot. Slightly emissive, so it stays readable against the sun. */}
      <mesh position={FRUIT_AT} material={fruitMat} castShadow>
        <sphereGeometry args={[1.7, 12, 10]} />
      </mesh>
      <mesh
        position={[FRUIT_AT[0] - 6.5, FRUIT_AT[1] + 1.4, FRUIT_AT[2] + 4]}
        material={fruitMat} castShadow
      >
        <sphereGeometry args={[1.5, 12, 10]} />
      </mesh>
      <mesh
        position={[FRUIT_AT[0] + 5.5, FRUIT_AT[1] + 2.6, FRUIT_AT[2] - 4]}
        material={fruitMat} castShadow
      >
        <sphereGeometry args={[1.45, 12, 10]} />
      </mesh>
    </group>
  )
}
