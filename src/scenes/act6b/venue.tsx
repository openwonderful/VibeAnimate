/**
 * Act 6B — the venue kit.
 *
 * Shared vocabulary for the rise montage (6.5 Small Stage → 6.7 Arena):
 * the same family of props at two scales, so the two gigs read as the same
 * career photographed two years apart. A riser and a mic stand, the
 * broadcast camera he waves into, beam cones for the big room, and the
 * beat clock the crowds pulse on.
 *
 * Everything here is a pure function of the time its caller passes in —
 * nothing reads the clock itself — so both scenes stay scrub-safe and the
 * arena can freeze its world through `freezeClock` without the props
 * knowing.
 */
import { useMemo } from 'react'
import * as THREE from 'three'
import { beatPhase01 } from '../actB/flight'

/* ── the beat, on the record's grid ─────────────────────────────────
 * `beatPulse`/`beatJump` in actB/flight carry the flight's OWN envelope —
 * silent before the stadium, dying after T_EXIT (story ~27s) — so feeding
 * them song-time 120+ returns zero. What these scenes actually need is the
 * measured grid (120 BPM, first beat 0.472s into the song) with no story
 * envelope on it. Callers pass SONG time: scene t + the slot's film `from`
 * (film == song, everywhere — the recording is untouched now).
 */
/** The LIGHT: hard attack, exponential decay across the beat. */
export function venueBeatPulse(songT: number): number {
  return Math.exp(-beatPhase01(songT) * 5.5)
}
/** The BODY: raised cosine — leaves the ground and lands. */
export function venueBeatJump(songT: number): number {
  return 0.5 - 0.5 * Math.cos(2 * Math.PI * beatPhase01(songT))
}

/* ── the freeze ─────────────────────────────────────────────────────
 * A clock that decelerates to a dead stop as a song fades: rate
 * 1 − smoothstep(a,b,t), integrated in closed form so it is still a pure
 * function of t and scrubs backwards. Currently unused — 6.7 retired its
 * world-freeze when the cut moved to its last frame (the scene stays
 * alive; the silence belongs to 6.85) — kept in the kit for any scene
 * that needs a world to stop around a figure who does not.
 */
export function freezeClock(t: number, a: number, b: number): number {
  if (t <= a) return t
  const s = Math.min(1, (t - a) / (b - a))
  // ∫(1 − (3s²−2s³))ds = s − s³ + s⁴/2, times (b−a).
  return a + (b - a) * (s - s * s * s + (s * s * s * s) / 2)
}

/* ── beam cones ─────────────────────────────────────────────────────
 * The stadium's light-shaft shader (module-local there, copied per its
 * header note): alpha dies toward the far end AND toward the silhouette
 * edge, so the cone reads as lit air rather than a plastic party hat.
 */
export function makeBeamMaterial(color: string, strength: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uAmount: { value: strength },
    },
    vertexShader: /* glsl */ `
      varying float vY;
      varying vec3 vView;
      varying vec3 vNrm;
      void main() {
        vY = uv.y;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = normalize(-mv.xyz);
        vNrm = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vY;
      varying vec3 vView;
      varying vec3 vNrm;
      uniform vec3 uColor;
      uniform float uAmount;
      void main() {
        // Brightest at the lamp, gone by the far end. max() is load-bearing:
        // uv.y interpolates a hair outside 0..1 and pow of a negative is NaN,
        // which Bloom smears over the whole frame.
        float along = pow(max(0.0, vY), 2.2);
        float rim = 1.0 - abs(dot(normalize(vNrm), normalize(vView)));
        float a = along * (0.34 + 0.66 * pow(max(0.0, rim), 1.6)) * uAmount;
        gl_FragColor = vec4(uColor * a, a);
      }
    `,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, fog: false,
  })
}

/** Open cone, apex at the origin, pointing down −Y — hang it at a lamp and
 *  rotate. (An un-rotated cone is already a correct downward spotlight.) */
export function makeBeamGeometry(radius: number, height: number): THREE.ConeGeometry {
  const g = new THREE.ConeGeometry(radius, height, 16, 1, true)
  g.translate(0, -height / 2, 0)
  return g
}

/* ── mic stand ──────────────────────────────────────────────────────
 * 6.3's grammar verbatim: base disc, 1.36 m pole, boom tilted back toward
 * the singer, capsule at 1.655 — mouth height for an adult GoldFigure at
 * scale 1. Place it ~0.44 in front of the figure (+z, the way they face);
 * the matching mic hand is [0.06, 1.52, 0.26] figure-local.
 */
export function MicStand({ position, rotation }: {
  position: [number, number, number]
  rotation?: [number, number, number]
}) {
  const BOOM_TILT = -0.55
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.20, 0.24, 0.04, 20]} />
        <meshStandardMaterial color="#101218" roughness={0.5} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.70, 0]}>
        <cylinderGeometry args={[0.020, 0.026, 1.36, 12]} />
        <meshStandardMaterial color="#20242E" roughness={0.35} metalness={0.85} />
      </mesh>
      <mesh position={[0, 1.505, -0.089]} rotation={[BOOM_TILT, 0, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.34, 10]} />
        <meshStandardMaterial color="#20242E" roughness={0.35} metalness={0.85} />
      </mesh>
      <mesh position={[0, 1.655, -0.185]} rotation={[BOOM_TILT, 0, 0]}>
        <capsuleGeometry args={[0.045, 0.09, 6, 12]} />
        <meshStandardMaterial color="#0C0E14" roughness={0.6} metalness={0.4} />
      </mesh>
    </group>
  )
}

/* ── the broadcast camera ───────────────────────────────────────────
 * The prop the whole arc waves into. A tripod, a body, a lens hood and a
 * red tally lamp — the tally is the point: one hot red dot says LIVE, and
 * it is what she is watching through. `aimAt` is world-space; the mount
 * yaws and the head pitches so the lens actually points there.
 */
const TRIPOD_MAT = new THREE.MeshStandardMaterial({ color: '#14161C', roughness: 0.5, metalness: 0.7 })
const CAMBODY_MAT = new THREE.MeshStandardMaterial({ color: '#1B1E26', roughness: 0.55, metalness: 0.5 })
const LENS_MAT = new THREE.MeshStandardMaterial({ color: '#0A0C10', roughness: 0.25, metalness: 0.8 })

export function BroadcastCamera({ position, aimAt, headHeight = 1.42, scale = 1, pedestal = false }: {
  position: [number, number, number]
  /** World-space point the lens looks at. */
  aimAt: [number, number, number]
  headHeight?: number
  scale?: number
  /** Studio pedestal (heavy column on a wheeled dolly) instead of the
   *  tripod — the arena-broadcast build. At scale ≳1.5 the tripod's legs
   *  read as stilts; the column is what says "huge TV camera". */
  pedestal?: boolean
}) {
  const { yaw, pitch } = useMemo(() => {
    const dx = aimAt[0] - position[0]
    const dy = aimAt[1] - (position[1] + headHeight * scale)
    const dz = aimAt[2] - position[2]
    const flat = Math.hypot(dx, dz)
    return { yaw: Math.atan2(dx, dz), pitch: Math.atan2(dy, flat) }
  }, [position, aimAt, headHeight, scale])

  return (
    <group position={position} scale={scale}>
      {pedestal ? (
        <>
          {/* Dolly base: a heavy disc on three castors, and the column. */}
          <mesh position={[0, 0.06, 0]} material={TRIPOD_MAT}>
            <cylinderGeometry args={[0.30, 0.34, 0.10, 18]} />
          </mesh>
          {[0, 1, 2].map((i) => {
            const a = (i / 3) * Math.PI * 2 + 0.4
            return (
              <mesh key={i} position={[Math.sin(a) * 0.27, 0.035, Math.cos(a) * 0.27]}
                rotation={[Math.PI / 2, 0, a]} material={LENS_MAT}>
                <cylinderGeometry args={[0.035, 0.035, 0.03, 10]} />
              </mesh>
            )
          })}
          <mesh position={[0, headHeight * 0.5, 0]} material={TRIPOD_MAT}>
            <cylinderGeometry args={[0.055, 0.075, headHeight * 0.92, 12]} />
          </mesh>
          {/* Steering ring under the head — the pedestal signature. */}
          <mesh position={[0, headHeight * 0.86, 0]} rotation={[Math.PI / 2, 0, 0]}
            material={CAMBODY_MAT}>
            <torusGeometry args={[0.16, 0.018, 8, 24]} />
          </mesh>
        </>
      ) : (
        <>
          {/* Tripod: three splayed legs meeting under the head. */}
          {[0, 1, 2].map((i) => {
            const a = (i / 3) * Math.PI * 2 + 0.5
            return (
              <mesh key={i}
                position={[Math.sin(a) * 0.15, headHeight * 0.48, Math.cos(a) * 0.15]}
                rotation={[Math.cos(a) * 0.24, 0, -Math.sin(a) * 0.24]}
                material={TRIPOD_MAT}>
                <cylinderGeometry args={[0.019, 0.026, headHeight * 0.98, 8]} />
              </mesh>
            )
          })}
        </>
      )}
      <mesh position={[0, headHeight * 0.96, 0]} material={TRIPOD_MAT}>
        <cylinderGeometry args={[0.045, 0.055, 0.09, 10]} />
      </mesh>
      {/* Head, yawed then pitched toward the subject. Lens looks down +z. */}
      <group position={[0, headHeight, 0]} rotation={[0, yaw, 0]}>
        <group rotation={[-pitch, 0, 0]}>
          <mesh position={[0, 0.06, -0.02]} material={CAMBODY_MAT} castShadow>
            <boxGeometry args={[0.16, 0.15, 0.30]} />
          </mesh>
          {/* Lens barrel + hood */}
          <mesh position={[0, 0.06, 0.17]} rotation={[Math.PI / 2, 0, 0]} material={LENS_MAT}>
            <cylinderGeometry args={[0.045, 0.05, 0.10, 12]} />
          </mesh>
          <mesh position={[0, 0.06, 0.235]} rotation={[Math.PI / 2, 0, 0]} material={LENS_MAT}>
            <cylinderGeometry args={[0.058, 0.048, 0.05, 12]} />
          </mesh>
          {/* Viewfinder, with its little lit screen facing the operator —
              from behind, this is what says "camera" rather than "box". */}
          <mesh position={[-0.10, 0.13, -0.10]} material={CAMBODY_MAT}>
            <boxGeometry args={[0.05, 0.05, 0.09]} />
          </mesh>
          <mesh position={[-0.10, 0.13, -0.148]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[0.042, 0.032]} />
            <meshBasicMaterial color="#9FB8D8" toneMapped={false} />
          </mesh>
          {/* Tally — LIVE. */}
          <mesh position={[0, 0.15, -0.14]}>
            <sphereGeometry args={[0.014, 8, 8]} />
            <meshStandardMaterial color="#FF3A20" emissive="#FF3A20"
              emissiveIntensity={3.2} toneMapped={false} />
          </mesh>
        </group>
      </group>
    </group>
  )
}
