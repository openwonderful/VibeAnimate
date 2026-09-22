/**
 * Act 6.6 — THE INTERVIEW (3.9s, film 119.8 → 123.7). Rebuilt: DAYTIME.
 *
 * One frame, two places, and a television hinging them in the middle.
 *
 * LEFT — a TV studio in full working daylight: glossy studio floor, a lit
 * interview backdrop with the song's hangeul tiled across it, an overhead
 * truss with can lights, an ON AIR box, a softbox on a stand, and a boom
 * over the chairs. The BLUE member (RM) is being interviewed by a gray
 * host, and they sit at the FAR end of the set. The MEMBER — the gold one
 * — is NOT in the shot: he is BEHIND the backdrop, being obviously sneaky
 * about it, leaned out past its edge stanchion with his body hidden by
 * the board and his head, shoulder and whole waving arm in the open,
 * bobbing on the held lean. (Director's note: he must act obviously
 * sneaky — head poked out from behind the thing, waving — and the TV has
 * to actually show it.)
 *
 * ONE pedestal broadcast camera, standing between that edge and the
 * television and pointed straight back at it. That is the whole gag of
 * the frame: her eye → the screen → the lens → the peeking heads, four
 * things on one line, so the camera reads as looking through the glass at
 * them. He spots its tally and waves into it (waveHand — the broadcast
 * wave).
 *
 * CENTER — the television. It faces HER: yawed three-quarter so the
 * grandmother sees it square and we still read the screen. The screen is a
 * cheap live feed — emissive quads for the studio backdrop + floor, and
 * miniature figures running the SAME skeleton functions on the SAME clock
 * as the big ones, framed the way the pedestal camera sees them — so the
 * tiny gold figure on her screen waves the exact wave the big one is
 * waving, straight out of the glass at her.
 *
 * RIGHT — her hanok room at midday: warm plaster, sunlit paper windows,
 * the cushion, the chest the TV stands on. She watches, recognises him,
 * and waves BACK — seated, FORWARD, at shoulder height, slow (the satgat
 * rules) — and holds it to the cut.
 *
 * Sightline chain, left to right: kid → studio camera → TV screen →
 * grandmother. "Somebody like you, ayy" lands at 119.03 just before the
 * slot; the scene sits between hooks on verse energy.
 */
import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'

import { createScene } from '../createScene'
import { getAnimTime } from '../../hooks/useAnimTime'
import { useCameraHandoff } from '../DebugCamera'
import { publishSceneLookAt } from '../cameraHandoff'
import GradientEnvironment from '../effects/GradientEnvironment'
import {
  GoldFigure, buildPose, v,
  type Proportions, type PoseGeometry,
} from '../characters/goldFigure'
import { chairSitSkeleton } from '../act6/chairSit'
import { makeTextTexture } from '../act6/signage'
import { SeatedFigure, PaperPanel, mix3, type V3 } from '../sets/hanok'
import { PARENT_HAT } from '../actB/valley'
import { INTERVIEW_BLUE, waveHand, ramp, clamp01, lifeFlicker } from './shared'

const DUR = 3.9
const DAY_SKY = '#A9BFD9'

// ── the beat sheet ──────────────────────────────────────────────────
/** Gold's broadcast wave rises… and never comes down. */
const T_GOLD_WAVE = [0.8, 1.25] as const
/** She leans a breath closer — recognition. */
const T_LEAN = [1.15, 1.6] as const
/** Her wave back, overlapping his, held to the cut. */
const T_GMA_WAVE = [1.7, 2.35] as const

// ── layout (metres; camera at +z looking down −z) ───────────────────
// Studio occupies x < −0.5, the hanok x > −0.5; their back walls stop
// short of the middle and a slice of open day sky shows between them —
// the seam the television bridges.
const SEAM_X = -0.5

const HOST_POS: V3 = [-3.15, 0, -0.6]
const BLUE_POS: V3 = [-2.05, 0, -0.5]
const BLUE_YAW = -0.85          // three-quarter: host on his left, lens front-left
const HOST_YAW = 1.42           // profile, facing the interviewee
/**
 * The board's edge stanchion, where the sneaking happens: its foot at the
 * backdrop's back face. The peek cluster mounts here (and again, miniature,
 * on the television feed — same skeletons, same leans, so the TV tells the
 * truth about exactly this).
 */
const PEEK_ORIGIN: V3 = [-1.84, 0, -2.05]
/** Roughly where the gold one's peeked-out head hangs — what the camera and
 *  the grandmother are both looking at. */
const PEEK_HEAD: V3 = [-1.6, 1.5, -2.3]
/**
 * The one camera, parked between the board's edge and the television — and
 * BACK, level with the set rather than out in the foreground. Forward of it
 * the column ran straight through the frame; the whole point is a clean line
 * of four things, so it cannot be standing on one of them.
 */
const PEDCAM_POS: V3 = [-0.6, 0, -0.95]
/** It is on the peeking heads — which is why the feed on her screen is them. */
const PEDCAM_YAW = Math.atan2(PEEK_HEAD[0] - PEDCAM_POS[0], PEEK_HEAD[2] - PEDCAM_POS[2])

const TV_POS: V3 = [0.02, 0, -0.42]
const TV_YAW = 0.8              // screen toward her; still legible to our lens
const GMA_POS: V3 = [1.72, 0, 0.62]
const GMA_YAW = -1.78           // facing the set, cheated a touch toward camera

const CHAIR_SEAT = 0.465

// ── envelopes ───────────────────────────────────────────────────────
const goldUp = (t: number) => ramp(t, T_GOLD_WAVE[0], T_GOLD_WAVE[1])
const gmaLean = (t: number) => ramp(t, T_LEAN[0], T_LEAN[1])
const gmaUp = (t: number) => ramp(t, T_GMA_WAVE[0], T_GMA_WAVE[1])

// ── the sneak: the lean, in board-edge space ────────────────────────
// Rotation.z tips the whole figure sideways around his feet — a person
// leaning out from behind cover, not walking out from it. Negative = out
// past the edge, toward +x. The slow bob on the held lean is the sneak:
// leaned out, drifting back, out again, never quite still.
const heroLean = (t: number) =>
  -0.34 * ramp(t, 0.3, 0.8) * (0.94 + 0.06 * Math.sin(t * 1.8))

/** Gold's wave pin: 5.1's recipe on the OUTBOARD (+x) arm, pushed a little
 *  clear of the head so the raised hand silhouettes against the day sky
 *  past the board's edge. */
function heroPeekTarget(t: number): V3 {
  const up = goldUp(t)
  const w = waveHand(t, up, { amp: 0.10, freq: 8.0 })
  w[0] += 0.07 * up
  return w
}

/** Peeking, weight on the lean, the wave pinned — big one and feed miniature
 *  both run this, so the television tells the truth. */
function heroPeekSkeleton({ P, t }: { P: Proportions; t: number; phase: number }): PoseGeometry {
  const g = buildPose('standing', { P, phase: 0, rightHandAt: heroPeekTarget(t), solvedArms: true })
  // A quiet breath so he is alive before the wave.
  const breath = Math.sin(t * 1.4) * 0.006
  g.spheres[0].center.y += breath
  return g
}

/**
 * The MEMBER, being sneaky — the gold one, body behind the board, leaned out
 * around its edge: head, shoulder and the whole waving arm in the open and
 * nothing else. Authored in board-edge space (origin at the stanchion's
 * foot, +x = out past the edge, standing just behind the board's back face)
 * and mounted twice: full-size behind the backdrop, and miniature on the
 * television feed — same skeleton, same lean.
 */
function PeekCluster({ hero }: { hero: THREE.Material }) {
  const heroRef = useRef<THREE.Group>(null)
  useFrame(() => {
    const t = getAnimTime()
    if (heroRef.current) heroRef.current.rotation.z = heroLean(t)
  })
  return (
    // The base sits deep enough behind the edge that the lean exposes a head,
    // a shoulder and the waving arm — and NOT a torso. A figure whose hips
    // clear the board reads as falling out of cover, not peeking from it.
    <group ref={heroRef} position={[-0.46, 0, -0.25]}>
      <GoldFigure kind="adult" skeleton={heroPeekSkeleton} material={hero} castShadow />
    </group>
  )
}

// ── the interviewee: chair sit + a talking left hand ────────────────
const SIT_LEAN = 0.09
const SIT_IDLE = 0.006
const baseSit = chairSitSkeleton({ seatTop: CHAIR_SEAT, lean: SIT_LEAN, hands: 'knees', idle: SIT_IDLE })

function talkTarget(t: number, shY: number, shZ: number): THREE.Vector3 {
  // Held mid-air chest-high with emphasis pulses — someone mid-answer.
  const w =
    ramp(t, 0.15, 0.45) * (1 - ramp(t, 1.0, 1.35)) +
    ramp(t, 1.6, 1.85) * (1 - ramp(t, 2.4, 2.75)) +
    ramp(t, 3.0, 3.25) * (1 - ramp(t, 3.7, 3.95))
  return v(
    -0.26 + Math.sin(t * 2.7) * 0.02 - w * 0.02,
    shY - 0.11 + w * 0.14 + Math.sin(t * 3.4 + 1.0) * 0.016,
    shZ + 0.30 + w * 0.06 + Math.sin(t * 2.1 + 0.4) * 0.014,
  )
}

function interviewSkeleton({ P, t, phase }: { P: Proportions; t: number; phase: number }): PoseGeometry {
  const g = baseSit({ P, t, phase })
  // Recompute the joint the same way chairSit does.
  const breath = Math.sin(t * 1.7) * SIT_IDLE
  const hipY = CHAIR_SEAT + 0.10 + breath
  const shY = hipY + (P.SHOULDER_Y - P.HIP_Y)
  const leanNow = SIT_LEAN + Math.sin(t * 0.9 + 1.1) * SIT_IDLE * 3
  const shZ = 0.023 + 0.88 * leanNow
  const jointY = shY - 0.03

  const hand = talkTarget(t, shY, shZ)
  const sh = v(-0.115, jointY, shZ)
  const elbow = v(-0.155, shY - 0.31, shZ - 0.05)
  const wristward = elbow.clone().lerp(hand, 0.5)
  wristward.y -= 0.012
  wristward.z += 0.012
  g.curves[2] = {
    points: [sh, sh.clone().lerp(elbow, 0.5), elbow, wristward, hand],
    radius: (u: number) => P.R * (1.04 - 0.20 * u),
    segments: 14,
  }
  // Small talking nods — the head sphere only, millimetres.
  const nod = Math.sin(t * 2.3) * 0.4 + Math.sin(t * 3.9 + 0.8) * 0.3
  g.spheres[0].center.z += nod * 0.014
  g.spheres[0].center.y -= Math.abs(nod) * 0.006
  return g
}

const hostSit = chairSitSkeleton({ seatTop: CHAIR_SEAT, lean: 0.12, hands: 'knees', idle: 0.005 })

// ════════════════════════════════════════════════════════════════════
// STUDIO PROPS
// ════════════════════════════════════════════════════════════════════

/** A modern interview chair — the studio's furniture grammar. */
function StudioChair() {
  return (
    <group>
      <mesh position={[0, CHAIR_SEAT - 0.025, 0]} castShadow>
        <boxGeometry args={[0.44, 0.05, 0.44]} />
        <meshStandardMaterial color="#38415A" roughness={0.55} />
      </mesh>
      <mesh position={[0, CHAIR_SEAT + 0.26, -0.20]} rotation={[-0.1, 0, 0]} castShadow>
        <boxGeometry args={[0.44, 0.52, 0.045]} />
        <meshStandardMaterial color="#38415A" roughness={0.55} />
      </mesh>
      {([[-1, -1], [1, -1], [-1, 1], [1, 1]] as const).map(([sx, sz], i) => (
        <mesh
          key={i}
          position={[sx * 0.17, (CHAIR_SEAT - 0.05) / 2, sz * 0.17]}
          rotation={[sz * 0.08, 0, -sx * 0.08]}
          castShadow
        >
          <cylinderGeometry args={[0.014, 0.017, CHAIR_SEAT - 0.05, 8]} />
          <meshStandardMaterial color="#9AA2B0" roughness={0.35} metalness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

/** Big pedestal broadcast camera — the hinge of the whole sightline. */
function PedestalCamera({ position, yaw, scale = 1 }: { position: V3; yaw: number; scale?: number }) {
  const tallyRef = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(() => {
    const t = getAnimTime()
    if (tallyRef.current)
      tallyRef.current.emissiveIntensity = 2.4 + (Math.sin(t * 2.6) > 0.35 ? 1.0 : 0)
  })
  return (
    <group position={position} scale={scale}>
      {/* caster base */}
      {[0, 1, 2].map(i => {
        const a = (i / 3) * Math.PI * 2 + 0.6
        return (
          <mesh key={i} position={[Math.cos(a) * 0.26, 0.05, Math.sin(a) * 0.26]} rotation={[0, -a, 0]}>
            <boxGeometry args={[0.3, 0.06, 0.09]} />
            <meshStandardMaterial color="#23262E" roughness={0.5} metalness={0.4} />
          </mesh>
        )
      })}
      {/* pedestal column */}
      <mesh position={[0, 0.62, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.06, 1.16, 10]} />
        <meshStandardMaterial color="#2A2E38" roughness={0.45} metalness={0.5} />
      </mesh>
      <group position={[0, 1.3, 0]} rotation={[0, yaw, 0]}>
        {/* body */}
        <mesh castShadow>
          <boxGeometry args={[0.3, 0.3, 0.6]} />
          <meshStandardMaterial color="#2E323E" roughness={0.45} metalness={0.4} />
        </mesh>
        {/* lens hood */}
        <mesh position={[0, 0.01, 0.38]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.115, 0.095, 0.22, 14]} />
          <meshStandardMaterial color="#1A1D24" roughness={0.35} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0.01, 0.495]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.085, 14]} />
          <meshStandardMaterial color="#0A0C12" roughness={0.2} metalness={0.6} />
        </mesh>
        {/* top handle */}
        <mesh position={[0, 0.2, -0.08]}>
          <boxGeometry args={[0.05, 0.05, 0.34]} />
          <meshStandardMaterial color="#23262E" roughness={0.5} />
        </mesh>
        {/* rear viewfinder monitor, glowing the feed's light */}
        <group position={[0, 0.1, -0.38]} rotation={[0.28, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.2, 0.14, 0.03]} />
            <meshStandardMaterial color="#1A1D24" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0, -0.017]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[0.17, 0.11]} />
            <meshStandardMaterial
              color="#DCE8F8" emissive="#DCE8F8" emissiveIntensity={0.9} toneMapped={false}
            />
          </mesh>
        </group>
        {/* tally — on air, seen from in front AND behind */}
        <mesh position={[0, 0.185, 0.24]}>
          <boxGeometry args={[0.05, 0.035, 0.05]} />
          <meshStandardMaterial
            ref={tallyRef} color="#3A0A08" emissive="#FF3020"
            emissiveIntensity={2.4} toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  )
}

/** Softbox on a stand — the studio's key, visibly a lamp. */
function Softbox({ position, yaw }: { position: V3; yaw: number }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.02, 0.028, 1.8, 8]} />
        <meshStandardMaterial color="#23262E" roughness={0.5} metalness={0.4} />
      </mesh>
      {[0, 1, 2].map(i => {
        const a = (i / 3) * Math.PI * 2 + 0.3
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.2, 0.3, Math.sin(a) * 0.2]}
            rotation={[Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5]}
          >
            <cylinderGeometry args={[0.012, 0.016, 0.68, 6]} />
            <meshStandardMaterial color="#23262E" roughness={0.5} metalness={0.4} />
          </mesh>
        )
      })}
      <group position={[0, 1.82, 0]} rotation={[0.28, yaw, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.62, 0.85, 0.07]} />
          <meshStandardMaterial color="#15181F" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, 0.045]}>
          <planeGeometry args={[0.54, 0.77]} />
          <meshStandardMaterial
            color="#F2F6FF" emissive="#F2F6FF" emissiveIntensity={1.6} toneMapped={false}
          />
        </mesh>
      </group>
      <pointLight position={[0, 1.8, 0.3]} color="#E8F0FF" intensity={2.6} distance={4.5} decay={2} />
    </group>
  )
}

/** Overhead truss with can lights — the ceiling a studio wears. */
function Truss() {
  return (
    <group>
      <mesh position={[-3.05, 2.68, -0.5]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.035, 3.4, 8]} />
        <meshStandardMaterial color="#3A3F4C" roughness={0.5} metalness={0.55} />
      </mesh>
      <mesh position={[-3.05, 2.58, -0.5]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.028, 0.028, 3.4, 8]} />
        <meshStandardMaterial color="#3A3F4C" roughness={0.5} metalness={0.55} />
      </mesh>
      {[-4.15, -3.05, -1.95].map((x, i) => (
        <group key={i} position={[x, 2.52, -0.5]} rotation={[0.5, 0.35 - i * 0.3, 0]}>
          <mesh>
            <cylinderGeometry args={[0.085, 0.11, 0.22, 12]} />
            <meshStandardMaterial color="#23262E" roughness={0.5} metalness={0.4} />
          </mesh>
          <mesh position={[0, -0.115, 0]} rotation={[Math.PI, 0, 0]}>
            <circleGeometry args={[0.095, 12]} />
            <meshStandardMaterial
              color="#FFF4DC" emissive="#FFF4DC" emissiveIntensity={2.2} toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** ON AIR — the two words that say "television studio" fastest. */
function OnAirSign() {
  const tex = useMemo(
    () => makeTextTexture('ON AIR', {
      width: 512, aspect: 3.4, color: '#FFE8E4',
      font: '700 120px "Arial Narrow", Arial, sans-serif',
      letterSpacing: 14, fill: 0.8,
    }),
    [],
  )
  const boxRef = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(() => {
    const t = getAnimTime()
    if (boxRef.current)
      boxRef.current.emissiveIntensity = 0.85 + Math.sin(t * 2.6) * 0.18
  })
  return (
    <group position={[-4.05, 2.42, -1.98]}>
      <mesh>
        <boxGeometry args={[0.78, 0.26, 0.08]} />
        <meshStandardMaterial
          ref={boxRef} color="#7A1410" emissive="#E0281C"
          emissiveIntensity={0.85} roughness={0.4} toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0, 0.045]}>
        <planeGeometry args={[0.72, 0.21]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} />
      </mesh>
    </group>
  )
}

/**
 * Lit interview backdrop — bright panel, faint hangeul tiles, accent bars.
 *
 * It used to run the full width of the studio and end at the seam, which
 * put a wall of tiled hangeul directly behind the gold one and lost him in
 * it. It stops at x = −1.6 now: the interview sits against it, he stands
 * past its edge against the sky, and the frame gains an actual silhouette.
 */
function Backdrop() {
  const tex = useMemo(() => {
    const x = makeTextTexture('바디 투 바디', {
      width: 1024, aspect: 5, color: '#6E86C8',
      font: '600 150px "Noto Sans KR", "Malgun Gothic", sans-serif',
      letterSpacing: 26, fill: 0.78,
    })
    x.wrapS = x.wrapT = THREE.RepeatWrapping
    x.repeat.set(2.3, 5.4)
    return x
  }, [])
  return (
    <group position={[-3.5, 0, -2.05]}>
      <mesh position={[0, 1.55, 0]}>
        <boxGeometry args={[3.2, 3.1, 0.08]} />
        <meshStandardMaterial
          color="#DEE6F2" emissive="#EAF0FA" emissiveIntensity={0.28} roughness={0.85}
        />
      </mesh>
      <mesh position={[0, 1.35, 0.045]}>
        <planeGeometry args={[3.2, 2.5]} />
        <meshStandardMaterial
          map={tex} transparent color="#B8C6E4"
          emissive="#8FA6D8" emissiveMap={tex} emissiveIntensity={0.35}
          depthWrite={false}
        />
      </mesh>
      {/* accent bars */}
      <mesh position={[-1.12, 1.55, 0.05]}>
        <planeGeometry args={[0.14, 3.0]} />
        <meshStandardMaterial
          color={INTERVIEW_BLUE} emissive={INTERVIEW_BLUE} emissiveIntensity={0.6} toneMapped={false}
        />
      </mesh>
      <mesh position={[1.02, 1.55, 0.05]}>
        <planeGeometry args={[0.09, 3.0]} />
        <meshStandardMaterial
          color="#7EC8E8" emissive="#7EC8E8" emissiveIntensity={0.5} toneMapped={false}
        />
      </mesh>
      {/* edge stanchion on the seam side — the set is a set, and this is
          where it ENDS: the sneaking happens around this post. */}
      <mesh position={[1.62, 1.56, 0.02]}>
        <boxGeometry args={[0.08, 3.12, 0.14]} />
        <meshStandardMaterial color="#3A3F4C" roughness={0.5} metalness={0.4} />
      </mesh>
    </group>
  )
}

/** Boom mic reaching in over the interview. */
function BoomMic() {
  const from = useMemo(() => new THREE.Vector3(-3.7, 2.5, 1.0), [])
  const to = useMemo(() => new THREE.Vector3(-2.6, 1.92, -0.45), [])
  const mid = useMemo(() => from.clone().lerp(to, 0.5), [from, to])
  const quat = useMemo(() => {
    const dir = to.clone().sub(from).normalize()
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
  }, [from, to])
  const len = useMemo(() => from.distanceTo(to), [from, to])
  return (
    <group>
      <mesh position={mid} quaternion={quat}>
        <cylinderGeometry args={[0.012, 0.012, len, 6]} />
        <meshStandardMaterial color="#22252E" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={to} quaternion={quat}>
        <capsuleGeometry args={[0.045, 0.13, 4, 10]} />
        <meshStandardMaterial color="#2C303A" roughness={0.95} />
      </mesh>
    </group>
  )
}

/** Floor monitor wedge, glowing the same feed light. */
function FloorMonitor() {
  return (
    <group position={[-2.0, 0, 0.7]} rotation={[0, 0.35, 0]}>
      <mesh position={[0, 0.12, 0]} rotation={[-0.7, 0, 0]} castShadow>
        <boxGeometry args={[0.42, 0.28, 0.1]} />
        <meshStandardMaterial color="#1E222C" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.135, 0.075]} rotation={[-0.7, 0, 0]}>
        <planeGeometry args={[0.36, 0.22]} />
        <meshStandardMaterial
          color="#C2D2E8" emissive="#C2D2E8" emissiveIntensity={0.45} toneMapped={false}
        />
      </mesh>
    </group>
  )
}

// ════════════════════════════════════════════════════════════════════
// STUDIO CAST
// ════════════════════════════════════════════════════════════════════

function BlueMember() {
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: INTERVIEW_BLUE, emissive: INTERVIEW_BLUE,
      emissiveIntensity: 0.85, roughness: 0.35, toneMapped: false,
    }),
    [],
  )
  useFrame(() => {
    mat.emissiveIntensity = 0.85 + Math.sin(getAnimTime() * 1.3) * 0.06
  })
  return (
    <group position={BLUE_POS} rotation={[0, BLUE_YAW, 0]}>
      <StudioChair />
      <GoldFigure kind="adult" skeleton={interviewSkeleton} material={mat} castShadow />
    </group>
  )
}

function Host() {
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: '#8A8F9C', emissive: '#8A8F9C', emissiveIntensity: 0.22, roughness: 0.6,
    }),
    [],
  )
  return (
    <group position={HOST_POS} rotation={[0, HOST_YAW, 0]}>
      <StudioChair />
      <GoldFigure kind="adult" skeleton={hostSit} material={mat} castShadow />
    </group>
  )
}

/** The sneak, full-size — mounted at the board's edge stanchion. */
function SneakPeek() {
  const heroMat = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: '#FFB938', emissive: '#FFB938',
      emissiveIntensity: 1.0, roughness: 0.35, toneMapped: false,
    }),
    [],
  )
  useFrame(() => {
    const t = getAnimTime()
    // He brightens a touch as the wave comes up — he means it.
    heroMat.emissiveIntensity = 1.0 + goldUp(t) * 0.2 + Math.sin(t * 1.1) * 0.06
  })
  return (
    <group position={PEEK_ORIGIN}>
      <PeekCluster hero={heroMat} />
    </group>
  )
}

function StudioSet() {
  return (
    <>
      {/* glossy studio floor */}
      <mesh position={[-3.05, 0, 0.4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5.1, 7.6]} />
        <meshStandardMaterial color="#AEB4C0" roughness={0.3} metalness={0.18} />
      </mesh>
      {/* interview area rug */}
      <mesh position={[-2.6, 0.006, -0.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.15, 28]} />
        <meshStandardMaterial color="#7E92B8" roughness={0.85} />
      </mesh>
      <Backdrop />
      <OnAirSign />
      <Truss />
      <Softbox position={[-4.2, 0, 0.85]} yaw={0.95} />
      <BoomMic />
      <FloorMonitor />
      {/* ONE camera. It stands where the sightline needs it — between the
          board's edge and the television — and there is no second one
          anywhere: a spare parked in the corner only ever asked which lens
          they were waving at. */}
      <PedestalCamera position={PEDCAM_POS} yaw={PEDCAM_YAW} />
      <Host />
      <BlueMember />
      <SneakPeek />
      {/* studio key + fill — bright, cool, DAY */}
      <spotLight
        position={[-2.85, 2.8, 1.6]} target-position={[-2.6, 0.6, -0.55]}
        color="#EEF4FF" intensity={5.5} angle={0.68} penumbra={0.6}
        distance={9} decay={1.6} castShadow shadow-bias={-0.0008}
      />
      <pointLight position={[-0.95, 1.9, 1.3]} color="#DCE8FF" intensity={1.1} distance={4} decay={2} />
    </>
  )
}

// ════════════════════════════════════════════════════════════════════
// THE TELEVISION — the hinge of the frame
// ════════════════════════════════════════════════════════════════════

/** Tiny feed cast: what the pedestal camera sees, restaged on the glass.
 *  The lens is on the board's EDGE — bright backdrop filling the left of the
 *  broadcast frame, open day sky on the right, and the member leaning out
 *  across that boundary, waving straight out of the glass at her. (The
 *  interview is off past the lens's shoulder — not in this shot.) */
function FeedFigures() {
  const tinyHero = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: '#FFB938', emissive: '#FFB938',
      emissiveIntensity: 3.2, roughness: 0.35, toneMapped: false,
    }),
    [],
  )
  return (
    <group position={[0, -0.215, 0.012]}>
      {/* the same cluster, miniature. Placed so the leaned-out heads clear
          the on-screen stanchion strip into the sky half of the frame, while
          the board panel IN FRONT of them (z 0.1 vs their ~0.05–0.09) hides
          their standing bodies — the panel does on the feed exactly what the
          real board does in the studio. */}
      <group position={[0.05, -0.02, 0.075]} scale={0.21}>
        <PeekCluster hero={tinyHero} />
      </group>
    </group>
  )
}

function Television() {
  const glassRef = useRef<THREE.MeshBasicMaterial>(null)
  const spillRef = useRef<THREE.PointLight>(null)
  const screenRef = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(() => {
    const t = getAnimTime()
    // Broadcast shimmer — mains flicker + slow content swings.
    const flick = 0.85 + Math.sin(t * 13) * 0.05 + Math.sin(t * 3.1) * 0.08
    if (glassRef.current) glassRef.current.opacity = 0.05 * flick
    if (spillRef.current) spillRef.current.intensity = 1.0 * flick
    // 0.42, down from 1.05: at the old level the screen was one white square
    // and the peek on it was invisible (director's note — "the TV doesn't
    // capture that, it's too bright"). The feed reads as a picture now.
    if (screenRef.current) screenRef.current.emissiveIntensity = 0.42 * flick
  })
  return (
    <group position={TV_POS}>
      {/* the low chest it stands on */}
      <mesh position={[0, 0.23, 0]} castShadow>
        <boxGeometry args={[0.88, 0.46, 0.52]} />
        <meshStandardMaterial color="#6A4526" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.465, 0]}>
        <boxGeometry args={[0.92, 0.022, 0.56]} />
        <meshStandardMaterial color="#4A2E18" roughness={0.7} />
      </mesh>

      <group position={[0, 0.48, 0]} rotation={[0, TV_YAW, 0]} scale={1.25}>
        {/* CRT casing */}
        <mesh position={[0, 0.28, -0.02]} castShadow>
          <boxGeometry args={[0.74, 0.56, 0.5]} />
          <meshStandardMaterial color="#262A34" roughness={0.55} />
        </mesh>
        {/* bezel ring */}
        {([
          [0, 0.535, 0.62, 0.05],
          [0, 0.025, 0.62, 0.05],
        ] as const).map(([px, py, w, h], i) => (
          <mesh key={i} position={[px, py, 0.235]}>
            <boxGeometry args={[w, h, 0.03]} />
            <meshStandardMaterial color="#383E4C" roughness={0.5} />
          </mesh>
        ))}
        {[-1, 1].map(s => (
          <mesh key={s} position={[s * 0.3, 0.28, 0.235]}>
            <boxGeometry args={[0.07, 0.56, 0.03]} />
            <meshStandardMaterial color="#383E4C" roughness={0.5} />
          </mesh>
        ))}
        {/* knobs beside the screen */}
        {[0.16, 0.05].map((y, i) => (
          <mesh key={i} position={[0.315, 0.09 + y, 0.252]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.022, 0.022, 0.02, 10]} />
            <meshStandardMaterial color="#8A8F9C" roughness={0.35} metalness={0.6} />
          </mesh>
        ))}

        {/* THE SCREEN — the feed, facing her. The base plane is the day sky
            past the board's edge; the bright panel on the left is the board. */}
        <group position={[-0.035, 0.28, 0.252]}>
          {/* base glass — open sky, the right of the broadcast frame */}
          <mesh>
            <planeGeometry args={[0.56, 0.44]} />
            <meshStandardMaterial
              ref={screenRef}
              // Near-black base: a screen EMITS its picture. With a pale base
              // color the room's own lights bounced off the plane and washed
              // the feed to white no matter what the emissive did.
              color="#0A0C10" emissive="#8FB0DA" emissiveIntensity={0.42} toneMapped={false}
            />
          </mesh>
          {/* the lit backdrop, filling the left of the frame — in FRONT of
              the miniature figures (z 0.1 vs their ~0.06–0.087), because it
              is their cover: it hides their bodies the way the real board
              does, so the feed shows heads peeking past its edge. */}
          <mesh position={[-0.15, 0.02, 0.1]}>
            <planeGeometry args={[0.27, 0.4]} />
            <meshStandardMaterial
              color="#0A0C10" emissive="#B9CBE8" emissiveIntensity={0.55} toneMapped={false}
            />
          </mesh>
          {/* its blue accent bar */}
          <mesh position={[-0.245, 0.02, 0.102]}>
            <planeGeometry args={[0.02, 0.4]} />
            <meshStandardMaterial
              color={INTERVIEW_BLUE} emissive={INTERVIEW_BLUE} emissiveIntensity={0.5} toneMapped={false}
            />
          </mesh>
          {/* the edge stanchion — the thing they are peeking around */}
          <mesh position={[-0.006, 0.02, 0.102]}>
            <planeGeometry args={[0.022, 0.4]} />
            <meshStandardMaterial color="#2E323C" roughness={0.6} />
          </mesh>
          {/* studio floor band — also in front, so it covers their feet */}
          <mesh position={[0, -0.19, 0.11]}>
            <planeGeometry args={[0.56, 0.08]} />
            <meshStandardMaterial
              color="#0A0C10" emissive="#A8B4C8" emissiveIntensity={0.4} toneMapped={false}
            />
          </mesh>
          {/* LIVE dot — on top of the board panel, not buried behind it */}
          <mesh position={[-0.235, 0.18, 0.115]}>
            <circleGeometry args={[0.014, 10]} />
            <meshStandardMaterial
              color="#FF3020" emissive="#FF3020" emissiveIntensity={2.2} toneMapped={false}
            />
          </mesh>
          <FeedFigures />
          {/* a breath of glow over the glass — above everything on it */}
          <mesh position={[0, 0, 0.13]}>
            <planeGeometry args={[0.56, 0.44]} />
            <meshBasicMaterial
              ref={glassRef} color="#BFD4F2" transparent opacity={0.09}
              blending={THREE.AdditiveBlending} depthWrite={false}
            />
          </mesh>
        </group>

        {/* rabbit ears */}
        <group position={[0.14, 0.58, -0.1]}>
          <mesh>
            <sphereGeometry args={[0.032, 8, 8]} />
            <meshStandardMaterial color="#383E4C" roughness={0.6} />
          </mesh>
          {[-0.5, 0.35].map((a, i) => (
            <mesh key={i} position={[Math.sin(a) * 0.18, 0.17, i * 0.04]} rotation={[i * 0.2, 0, -a]}>
              <cylinderGeometry args={[0.004, 0.004, 0.4, 4]} />
              <meshStandardMaterial color="#8A8F9C" roughness={0.4} metalness={0.6} />
            </mesh>
          ))}
        </group>
      </group>

      {/* the screen's light, cast toward her */}
      <pointLight
        ref={spillRef} position={[0.55, 0.95, 0.35]} color="#BFD4F2"
        intensity={1.3} distance={2.4} decay={2}
      />
    </group>
  )
}

// ════════════════════════════════════════════════════════════════════
// THE HANOK — her side, at midday
// ════════════════════════════════════════════════════════════════════

function Grandmother() {
  const leanRef = useRef<THREE.Group>(null)
  useFrame(() => {
    const g = leanRef.current
    if (!g) return
    const t = getAnimTime()
    g.rotation.order = 'YXZ'
    g.rotation.y = GMA_YAW
    // Leans a breath toward the set to recognise him, then straightens to
    // wave — bowed + waving reads as prayer from this angle.
    g.rotation.x = gmaLean(t) * 0.07 - gmaUp(t) * 0.075
  })
  const hands = useMemo(
    () => (t: number) => {
      const up = gmaUp(t)
      // A wave has to be ABOVE the shoulder or it is a person reaching for
      // something. Hers goes up to head height (local head is at 0.98,
      // shoulder at 0.72) and forward — forward is what buys the gesture
      // screen-width, because at her yaw local +z runs almost straight
      // across our lens, so the oscillation on z is a hand swinging side to
      // side on screen. Slow and oversized: the satgat rules.
      //
      // It is her RIGHT arm, which is the one thing here that is not a
      // matter of taste. She sits in profile at −1.78, so her local −x is
      // pointed away from our camera: a left-handed wave happened entirely
      // behind her own body and the frame just showed a woman sitting still.
      // The +x arm is the near one, and it plays against her silhouette.
      //
      // EVERY target here is inside the rig's reach. `buildDiner` draws the
      // arm as a curve from the shoulder to wherever it is told, with no IK
      // and no complaint, so a target past ADULT.ARM (0.55, from a shoulder
      // at 0.72/0.144) does not raise the arm — it STRETCHES it. The old wave
      // asked for 0.68 and the old rest for 0.61, and both came out as rubber
      // limbs hanging off her; the wave in particular read as a tentacle
      // going up past the hat. The ceiling here is ~0.53, which leaves the
      // elbow something to bend at the bottom of each swing.
      //
      // And it is held OUT in front of her rather than straight up, because
      // the rig puts the elbow at the shoulder→hand midpoint: a hand raised
      // beside the head drags the whole forearm across her face. From a
      // camera parked on her local +x, an arm 0.16 nearer the lens than the
      // head projects straight onto it and the two merge into one gold lump.
      // Forward is the only direction that separates them on screen (her
      // local +z runs across our lens), and it is what a person waving at a
      // television does with their arm anyway.
      //
      // The swing itself is an ARC and not a pump. Oscillating z alone — the
      // old shape — moved the hand straight out and back along the arm's own
      // axis: shoulder-to-hand went 0.36→0.51 twice a second and she looked
      // like she was working a pump handle. y and z ride the same sine in
      // OPPOSITE phase instead, which is the forearm rocking about the elbow
      // at a fixed radius, and it is a diagonal arc of about 40px on screen.
      const swing = Math.sin(t * 6.4) * up
      const wave: V3 = [
        0.16,
        0.64 + 0.31 * up + swing * 0.075,
        0.22 + 0.28 * up - swing * 0.08,
      ]
      // Resting: the arm hangs down her near side and the hand comes to rest
      // on the folded thigh. It cannot reach her knee and no amount of
      // authoring will make it — the rig's arm is 0.55 against a 0.54 torso.
      const rest: V3 = [0.16, 0.20 + Math.sin(t * 1.1 + 0.5) * 0.008, 0.22]
      return {
        left: [-0.16, 0.21 + Math.sin(t * 1.3) * 0.008, 0.22] as V3,
        right: mix3(rest, wave, up),
        // She lifts her chin to the set as the arm goes up — the head must
        // not be driven forward under the brim, which is what buried it.
        headTilt: 0.02 + gmaLean(t) * 0.04 - gmaUp(t) * 0.03,
      }
    },
    [],
  )
  return (
    <group position={GMA_POS}>
      {/* Her cushion, under her SEAT — hips at local z 0.034, which her yaw
          carries to world (−0.03, ·, −0.01). It used to be a 0.72-wide disc
          parked at world +0.05z, which at her yaw is off her left side: the
          cushion sat behind and beside her while she floated over the boards
          in front of it. Small enough now that the folded legs land on the
          floor rather than on the pad, which is how a 방석 is used. */}
      <mesh position={[-0.09, 0.035, -0.02]} scale={[1, 0.42, 1]} receiveShadow>
        <sphereGeometry args={[0.26, 14, 10]} />
        <meshStandardMaterial color="#8A4A34" roughness={0.95} />
      </mesh>
      <group ref={leanRef} rotation={[0, GMA_YAW, 0]} scale={0.92}>
        <SeatedFigure
          kind="adult"
          // On the boards, not above them: the old 0.05 lift raised the whole
          // fold clear of the floor and she read as hovering. She sinks into
          // the cushion instead — its top is 0.144 and her seat is at 0.12.
          position={[0, 0, 0]}
          facing={0}
          hipY={0.18}
          legs="cross"
          lean={0.14}
          color="#F5B45C"
          emissive="#D8891A"
          hands={hands}
          hat={PARENT_HAT}
          // Pushed back off the brow and canted off her waving side. At the
          // old −0.28 with no roll the brim sat flat over her, and from a
          // camera even slightly above her eyeline she was a hat on a spine
          // with no head at all.
          hatTilt={-0.42}
          hatRoll={0.16}
          hatScale={0.6}
          // …and she GUTTERS while she does it. Same affliction as 6.4's
          // porch call, one phase apart so it is the same condition and not
          // the same footage: her gold sags off and comes back, under the
          // happiest beat she gets. Shallower here than on the porch — this
          // is a bright midday room and the wave is what the shot is about;
          // the flicker only has to be there for anyone who looks twice.
          glowOverTime={t =>
            (0.9 + Math.sin(t * 1.1) * 0.08 + gmaLean(t) * 0.16 + gmaUp(t) * 0.3)
            * lifeFlicker(t, 0.38, 1.9)}
        />
      </group>
    </group>
  )
}

function HanokSet() {
  return (
    <>
      {/* warm wood floor, meeting the studio's at the seam */}
      <mesh position={[1.93, 0, 0.4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[4.86, 7.6]} />
        <meshStandardMaterial color="#8A5630" roughness={0.5} metalness={0.05} />
      </mesh>
      {/* plank seams */}
      {[0.05, 0.72, 1.4, 2.1, 2.82, 3.55].map((x, i) => (
        <mesh key={i} position={[x, 0.003, 0.4]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.014, 7.6]} />
          <meshStandardMaterial color="#4A2E18" roughness={0.9} />
        </mesh>
      ))}
      {/* the seam strip between the two floors */}
      <mesh position={[SEAM_X, 0.006, 0.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.05, 7.6]} />
        <meshStandardMaterial color="#2A2E38" roughness={0.8} />
      </mesh>
      {/* sunlit plaster wall */}
      <mesh position={[2.55, 1.5, -1.8]} receiveShadow>
        <planeGeometry args={[4.1, 3.0]} />
        <meshStandardMaterial color="#D9C29C" roughness={1} />
      </mesh>
      <mesh position={[2.55, 0.08, -1.79]}>
        <planeGeometry args={[4.1, 0.16]} />
        <meshStandardMaterial color="#6A4526" roughness={0.9} />
      </mesh>
      {/* hanok pillar on the seam edge */}
      <mesh position={[0.53, 1.5, -1.78]} castShadow>
        <boxGeometry args={[0.1, 3.0, 0.12]} />
        <meshStandardMaterial color="#5A3A21" roughness={0.85} />
      </mesh>
      {/* paper windows, glowing with midday sun */}
      <PaperPanel position={[3.05, 1.32, -1.78]} width={1.15} height={1.35} color="#EFDFB8" emissive={0.55} />
      <PaperPanel position={[1.35, 1.28, -1.78]} width={0.82} height={1.2} color="#E8D6AE" emissive={0.4} />
      <Television />
      <Grandmother />
      {/* warm midday fill — her side stays warm against the studio cool */}
      <pointLight position={[2.7, 2.1, 0.5]} color="#FFDCA0" intensity={1.8} distance={4.5} decay={2} />
      <pointLight position={[1.1, 1.5, 1.2]} color="#FFE7C0" intensity={0.9} distance={3.2} decay={2} />
    </>
  )
}

// ════════════════════════════════════════════════════════════════════
// CAMERA + SCENE
// ════════════════════════════════════════════════════════════════════

const CAM_A = { pos: [0.1, 1.38, 4.5] as V3, target: [-0.15, 0.95, -0.35] as V3 }
const CAM_B = { pos: [0.06, 1.34, 4.12] as V3 }

function CameraRig() {
  const camera = useThree(s => s.camera) as THREE.PerspectiveCamera
  const yieldCamera = useCameraHandoff()
  useFrame(() => {
    if (yieldCamera()) return
    const t = getAnimTime()
    const u = (x => x * x * (3 - 2 * x))(clamp01(t / DUR))
    camera.position.set(
      THREE.MathUtils.lerp(CAM_A.pos[0], CAM_B.pos[0], u),
      THREE.MathUtils.lerp(CAM_A.pos[1], CAM_B.pos[1], u),
      THREE.MathUtils.lerp(CAM_A.pos[2], CAM_B.pos[2], u),
    )
    camera.lookAt(CAM_A.target[0], CAM_A.target[1], CAM_A.target[2])
    // The debug camera orbits this if you take over — the lookAt quaternion
    // has thrown the distance away, and the television is 4.5m down the lens.
    publishSceneLookAt(CAM_A.target[0], CAM_A.target[1], CAM_A.target[2])
  })
  return null
}

export default createScene({
  background: DAY_SKY,
  three: {
    camera: { position: CAM_A.pos, fov: 44, near: 0.05, far: 60 },
    gl: {
      antialias: true,
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 1.12,
    },
    shadows: true,
    onCreated: ({ camera }) => camera.lookAt(...CAM_A.target),
    debugTarget: CAM_A.target,
  },
}, function Act6_6() {
  return (
    <>
      <GradientEnvironment zenith="#CBDCF0" horizon="#F0EEE2" ground="#8E8E96" intensity={0.85} />
      <ambientLight color="#E8EDF6" intensity={0.5} />
      <directionalLight position={[3.5, 5.5, 2.8]} color="#FFE7C0" intensity={1.0} />
      <CameraRig />
      <StudioSet />
      <HanokSet />
      <EffectComposer>
        <Bloom intensity={0.4} luminanceThreshold={0.78} luminanceSmoothing={0.3} radius={0.5} mipmapBlur />
        <Vignette eskil={false} offset={0.24} darkness={0.42} />
      </EffectComposer>
    </>
  )
})
