/**
 * The city apartment — the grey room the city gave him.
 *
 * The counterweight to `sets/hanok`. The farmhouse is warm, wooden, full of
 * other people's things and lit by a flame; this is one rented box with a
 * counter, a stool, one window and a bare bulb on a flex, and everything in it
 * is a value of grey. 5.3 eats alone in it while the chorus asks for a body.
 * 6.85 stands in it and goes out.
 *
 * It lives here for the same reason the hanok does: two acts now come back to
 * this room and it has to read as the SAME room both times — same window on
 * the left, same bulb overhead, same counter across the bottom of frame — or
 * the rhyme between "he ate here alone" and "he heard here alone" is just two
 * grey rooms. Everything below was lifted out of `act5/Act5_3.tsx` verbatim;
 * 5.3 imports it back with the defaults and renders frame-identical.
 *
 * WHAT THE SECOND CUSTOMER NEEDS, and therefore what the props are for:
 *
 * - `fade` — the room can cross-dissolve. Every surface shares one small set
 *   of materials so a single number drives the whole set out, which is what
 *   buys a real dissolve instead of a lights-out. (The hanok cannot do this:
 *   it is dressed with dozens of independent props.)
 * - `walls` — 6.85 hangs a hospital panel in the right half of frame, and this
 *   room's +x side wall is a DoubleSide plane that sits NEARER the lens than
 *   the panel does, so it would draw in front of it. `walls="back"` drops both
 *   side walls; the window, the bulb and the counter are what identify the
 *   room anyway.
 * - `BareBulb`'s `dim` / `cool` — 5.3's bulb is #FFD2A0 at 7.2. Pointed at a
 *   figure whose gold is draining, that fixture relights him warm and hands
 *   back the entire point of the beat. 6.85 takes it down and drifts it toward
 *   the window's blue as he goes.
 * - `DawnWindow`'s `dawn` — 5.3 runs a seven-second sunrise off the clock. Any
 *   scene longer than seven seconds, or one where the room is supposed to be
 *   dying rather than waking, freezes it by passing a number.
 *
 * Defaults on every one of these are 5.3's current behaviour, so an unprop'd
 * `<Apartment />` is the 5.3 room exactly.
 */

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { getAnimTime } from '../../hooks/useAnimTime'
import { clamp01, type V3 } from './hanok'
import { BUNDLE_CLOTH, BUNDLE_CLOTH_EMPTY } from '../act5/shared'

// ────────────────────────────────────────────────────────────────────
// Palette. These are 5.3's on-screen values, which are NOT the same as the
// `APT_WALL` / `APT_FLOOR` / `APT_COUNTER` trio in `act5/shared.tsx` — those
// were written for a draft of the act and nothing ever imported them. These
// are the ones that have been on screen; if the two ever need reconciling,
// reconcile toward this file.
// ────────────────────────────────────────────────────────────────────
export const APT_WALL = '#2A2A30'
export const APT_WALL_DARK = '#1E1E24'
export const APT_FLOOR = '#26232A'
export const APT_COUNTER = '#3A3238'
export const APT_CEILING = '#141418'
export const APT_NIGHT = '#0A0A10'
export const APT_STOOL = '#4A4048'
export const APT_STOOL_LEG = '#3A3038'

/** The bulb: the glass itself, and the light it throws. */
export const BULB_GLASS = '#FFE9C0'
export const BULB_WARM = '#FFD2A0'
/** The window: night pane, dawn pane, and the cold key that comes through it. */
export const WINDOW_NIGHT = '#141A30'
export const WINDOW_DAWN = '#6E7C9E'
export const WINDOW_COOL = '#93A8D6'

// ────────────────────────────────────────────────────────────────────
// Room dimensions. Floor is y = 0; the front (+z) is open for the camera.
// The back wall and ceiling planes are cut oversize (4.4 against a 3.7-wide
// room) so their edges never crawl into frame at the wider lenses.
// ────────────────────────────────────────────────────────────────────
export const APT_BACK_Z = -1.30
export const APT_SIDE_X = 1.85
export const APT_CEIL_Y = 2.8

export const COUNTER_Y = 0.92
/** The counter slab: x ∈ [-1.25, 1.25], z ∈ [-0.93, -0.31], top at COUNTER_Y. */
export const COUNTER_W = 2.5
export const COUNTER_D = 0.62
export const COUNTER_Z = -0.62

// The RIGHT third (was the left): the pairing with 5.4 swapped sides — the
// child eats frame-right, the caregiver eats frame-left, and the seat each is
// missing from still faces the other across the cut.
export const SEAT_X = +0.62
export const SEAT_Z = -1.02

export const BULB_AT: V3 = [0.05, 1.86, -0.35]
export const WINDOW_AT: V3 = [-0.92, 1.28, -1.24]
export const BUNDLE_AT: V3 = [-0.34, COUNTER_Y, -0.58]

/**
 * A scalar that a scene may want to drive off the clock rather than off a
 * React render. Pass a number for a constant, a function for an animation —
 * the function form is read inside `useFrame`, so a 6.85-style ramp costs no
 * re-renders.
 */
export type Driven = number | ((t: number) => number)

function read(v: Driven, t: number) {
  return typeof v === 'function' ? v(t) : v
}

// ────────────────────────────────────────────────────────────────────
// The shell
// ────────────────────────────────────────────────────────────────────

type ShellMats = {
  floor: THREE.MeshStandardMaterial
  wallBack: THREE.MeshStandardMaterial
  wallSide: THREE.MeshStandardMaterial
  ceiling: THREE.MeshStandardMaterial
  counterTop: THREE.MeshStandardMaterial
  counterBase: THREE.MeshStandardMaterial
  stoolSeat: THREE.MeshStandardMaterial
  stoolLeg: THREE.MeshStandardMaterial
}

function applyFade(mats: Record<string, THREE.Material>, f: number) {
  const o = clamp01(f)
  for (const key of Object.keys(mats)) {
    const m = mats[key]
    m.opacity = o
    // Only flip `transparent` when the room is actually mid-dissolve. An
    // opaque room and a room at opacity 1 with blending switched on sort
    // differently, and 5.3 has to be pixel-identical to the version of this
    // room that lived inside its own file. Dropping depthWrite with it stops
    // the four walls punching holes in each other on the way out.
    const t = o < 1
    if (m.transparent !== t) {
      m.transparent = t
      m.depthWrite = !t
      m.needsUpdate = true
    }
  }
}

export type ApartmentShellProps = {
  /** 1 = solid (5.3). Below 1 the whole set cross-dissolves as one object. */
  fade?: Driven
  /** `three` = 5.3's box; `back` drops the side walls; `none` is floor only. */
  walls?: 'three' | 'back' | 'none'
  /** Side of the square floor plane. Widen it if the camera pulls back past z = 3. */
  floorSize?: number
  ceiling?: boolean
  counter?: boolean
  stool?: boolean
}

/** Floor, walls, ceiling, the counter and the stool — the bare box, no light. */
export function ApartmentShell({
  fade = 1,
  walls = 'three',
  floorSize = 6,
  ceiling = true,
  counter = true,
  stool = true,
}: ApartmentShellProps) {
  const mats = useMemo<ShellMats>(() => ({
    floor: new THREE.MeshStandardMaterial({ color: APT_FLOOR, roughness: 0.95 }),
    wallBack: new THREE.MeshStandardMaterial({
      color: APT_WALL, roughness: 0.95, side: THREE.DoubleSide,
    }),
    wallSide: new THREE.MeshStandardMaterial({
      color: APT_WALL_DARK, roughness: 0.95, side: THREE.DoubleSide,
    }),
    ceiling: new THREE.MeshStandardMaterial({
      color: APT_CEILING, roughness: 1, side: THREE.DoubleSide,
    }),
    counterTop: new THREE.MeshStandardMaterial({
      color: APT_COUNTER, roughness: 0.55, metalness: 0.1,
    }),
    counterBase: new THREE.MeshStandardMaterial({ color: APT_WALL_DARK, roughness: 0.9 }),
    stoolSeat: new THREE.MeshStandardMaterial({ color: APT_STOOL, roughness: 0.7 }),
    stoolLeg: new THREE.MeshStandardMaterial({ color: APT_STOOL_LEG, roughness: 0.8 }),
  }), [])

  // A constant fade is applied on render; a driven one is applied per frame,
  // so a scene can ramp the room out without re-rendering the tree.
  useMemo(() => {
    if (typeof fade === 'number') applyFade(mats, fade)
  }, [mats, fade])
  useFrame(() => {
    if (typeof fade === 'function') applyFade(mats, fade(getAnimTime()))
  })

  return (
    <>
      {/* Floor + three walls, with the fourth left open for the camera. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={mats.floor} receiveShadow>
        <planeGeometry args={[floorSize, floorSize]} />
      </mesh>
      {walls !== 'none' && (
        <mesh position={[0, 1.4, APT_BACK_Z]} material={mats.wallBack} receiveShadow>
          <planeGeometry args={[4.4, 2.8]} />
        </mesh>
      )}
      {walls === 'three' && (
        <>
          <mesh
            position={[-APT_SIDE_X, 1.4, 0.2]} rotation={[0, Math.PI / 2, 0]}
            material={mats.wallSide} receiveShadow
          >
            <planeGeometry args={[3.2, 2.8]} />
          </mesh>
          <mesh
            position={[APT_SIDE_X, 1.4, 0.2]} rotation={[0, -Math.PI / 2, 0]}
            material={mats.wallSide} receiveShadow
          >
            <planeGeometry args={[3.2, 2.8]} />
          </mesh>
        </>
      )}
      {ceiling && (
        <mesh position={[0, APT_CEIL_Y, 0.2]} rotation={[Math.PI / 2, 0, 0]} material={mats.ceiling}>
          <planeGeometry args={[4.4, 3.2]} />
        </mesh>
      )}

      {/* The counter — narrow, against the back wall. */}
      {counter && (
        <>
          <mesh
            position={[0, COUNTER_Y - 0.03, COUNTER_Z]} material={mats.counterTop}
            castShadow receiveShadow
          >
            <boxGeometry args={[COUNTER_W, 0.06, COUNTER_D]} />
          </mesh>
          <mesh
            position={[0, (COUNTER_Y - 0.06) / 2, COUNTER_Z - 0.10]}
            material={mats.counterBase} receiveShadow
          >
            <boxGeometry args={[2.4, COUNTER_Y - 0.06, 0.4]} />
          </mesh>
        </>
      )}

      {/* The stool they are sitting on. */}
      {stool && (
        <group position={[SEAT_X, 0, SEAT_Z]}>
          <mesh position={[0, 0.60, 0]} material={mats.stoolSeat} castShadow receiveShadow>
            <cylinderGeometry args={[0.17, 0.17, 0.05, 16]} />
          </mesh>
          {[0, 1, 2, 3].map(i => {
            const a = (i / 4) * Math.PI * 2 + 0.4
            return (
              <mesh
                key={i}
                position={[Math.cos(a) * 0.12, 0.29, Math.sin(a) * 0.12]}
                rotation={[Math.sin(a) * 0.09, 0, -Math.cos(a) * 0.09]}
                material={mats.stoolLeg}
                castShadow
              >
                <cylinderGeometry args={[0.016, 0.016, 0.58, 6]} />
              </mesh>
            )
          })}
        </group>
      )}
    </>
  )
}

// ────────────────────────────────────────────────────────────────────
// The two fixtures. Each is its own light as well as its own geometry —
// the room has no other source, so moving one moves the whole look.
// ────────────────────────────────────────────────────────────────────

export type BareBulbProps = {
  position?: V3
  /** Base intensity of the point light; the mains flicker rides on top of it. */
  intensity?: number
  color?: string
  distance?: number
  decay?: number
  /** Amplitude of the 17 rad/s mains hum. 0 = a dead-steady bulb. */
  flicker?: number
  glassColor?: string
  castShadow?: boolean
  /**
   * 0→1 multiplier on the fixture, read per frame. This is how 6.85 takes the
   * bulb down as the hero's gold drains — left at full it would relight him
   * warm and undo the drain, which is the same failure the hanok's lantern
   * causes, just from a different fixture.
   */
  dim?: (t: number) => number
  /** 0→1 lerp of the light's colour toward `coolTo`, read per frame. */
  cool?: (t: number) => number
  coolTo?: string
}

/** Bare bulb on a flex, the room's only fixture. */
export function BareBulb({
  position = BULB_AT,
  intensity = 7.2,
  color = BULB_WARM,
  distance = 3.5,
  decay = 2.1,
  flicker = 0.22,
  glassColor = BULB_GLASS,
  castShadow = true,
  dim,
  cool,
  coolTo = WINDOW_COOL,
}: BareBulbProps) {
  const lightRef = useRef<THREE.PointLight>(null)
  const glassRef = useRef<THREE.MeshBasicMaterial>(null)

  const cols = useMemo(() => ({
    warm: new THREE.Color(color),
    cold: new THREE.Color(coolTo),
    glass: new THREE.Color(glassColor),
    dark: new THREE.Color('#000000'),
  }), [color, coolTo, glassColor])

  useFrame(() => {
    const t = getAnimTime()
    // Mains hum rather than a flame — a tight, fast, unromantic flicker.
    const k = dim ? clamp01(dim(t)) : 1
    if (lightRef.current) {
      lightRef.current.intensity = (intensity + Math.sin(t * 17) * flicker) * k
      if (cool) lightRef.current.color.copy(cols.warm).lerp(cols.cold, clamp01(cool(t)))
    }
    // The glass follows the fixture down, or a dimmed bulb still reads as a
    // hot white dot in the middle of a dark frame.
    if (glassRef.current && dim) glassRef.current.color.copy(cols.dark).lerp(cols.glass, k)
  })

  return (
    <group position={position}>
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.84, 5]} />
        <meshStandardMaterial color="#15151A" roughness={1} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.055, 14, 12]} />
        <meshBasicMaterial ref={glassRef} color={glassColor} />
      </mesh>
      {/* The intensity here is only what the light has before the first frame
          tick — `useFrame` owns it from then on. (The original had a stale 6.4
          sitting in this slot against a 7.2 in the loop; it never showed.) */}
      <pointLight
        ref={lightRef} color={color} intensity={intensity}
        distance={distance} decay={decay} castShadow={castShadow}
      />
    </group>
  )
}

export type DawnWindowProps = {
  position?: V3
  /**
   * 0 = night, 1 = full dawn. Omitted, it ramps 0→1 across `dawnOver` seconds
   * of the anim clock, which is 5.3's beat: the only thing that moves in that
   * scene is the sky coming up behind him. Pass a number (or a function of t)
   * to freeze or re-key it — 6.85 pins it at 0, because a room that is dying
   * cannot also be sunrising.
   */
  dawn?: Driven
  dawnOver?: number
  /** Scales the cold key that comes through the glass. */
  intensity?: number
  light?: boolean
  /**
   * 0→1 multiplier on the whole fixture, read per frame — the window's twin of
   * `BareBulb`'s `dim`, and what `Apartment` drives off `fade` so a dissolving
   * room does not leave a lit pane hanging in the next scene.
   */
  dim?: (t: number) => number
}

/** The window, and the dawn that comes up behind it across the beat. */
export function DawnWindow({
  position = WINDOW_AT,
  dawn,
  dawnOver = 7,
  intensity = 1,
  light = true,
  dim,
}: DawnWindowProps) {
  const paneRef = useRef<THREE.MeshBasicMaterial>(null)
  const lightRef = useRef<THREE.DirectionalLight>(null)

  // Hoisted out of the frame loop — 5.3 built two Colors per frame to do this.
  // Same maths, same result, no per-frame allocation.
  const cols = useMemo(() => ({
    night: new THREE.Color(WINDOW_NIGHT),
    dawn: new THREE.Color(WINDOW_DAWN),
    black: new THREE.Color('#000000'),
  }), [])

  useFrame(() => {
    const t = getAnimTime()
    const d = dawn === undefined ? clamp01(t / dawnOver) : clamp01(read(dawn, t))
    const k = dim ? clamp01(dim(t)) : 1
    if (paneRef.current) {
      paneRef.current.color.copy(cols.night).lerp(cols.dawn, d * 0.9)
      // The pane is unlit, so it can only go out by going black.
      if (dim) paneRef.current.color.lerp(cols.black, 1 - k)
    }
    if (lightRef.current) lightRef.current.intensity = (1.1 + d * 6.2) * intensity * k
  })

  return (
    <group position={position}>
      <mesh>
        <planeGeometry args={[0.82, 1.02]} />
        <meshBasicMaterial ref={paneRef} color="#1A2038" />
      </mesh>
      {/* Frame + mullions */}
      {([[0, 0.52, 0.86, 0.05], [0, -0.52, 0.86, 0.05], [0, 0, 0.86, 0.028]] as const).map(
        ([x, y, w, h], i) => (
          <mesh key={`h${i}`} position={[x, y, 0.01]}>
            <boxGeometry args={[w, h, 0.03]} />
            <meshStandardMaterial color={APT_WALL_DARK} roughness={0.9} />
          </mesh>
        ),
      )}
      {[-0.42, 0, 0.42].map(x => (
        <mesh key={x} position={[x, 0, 0.01]}>
          <boxGeometry args={[0.045, 1.06, 0.03]} />
          <meshStandardMaterial color={APT_WALL_DARK} roughness={0.9} />
        </mesh>
      ))}
      {light && (
        <directionalLight
          ref={lightRef} position={[-0.4, 0.2, 1]} color={WINDOW_COOL} intensity={1.1}
        />
      )}
    </group>
  )
}

/**
 * The bundle, on the counter beside them.
 *
 * This used to be three objects on the same spot — the open cloth bundle, then
 * the cloth folded flat, then a plastic takeout tray — swapping on `visible`
 * at 2.5 s and 5 s. On paper that is the beat of the scene. On screen it is a
 * box vanishing out of a locked-off frame with nothing to motivate it: the
 * "cross-fade" in the old comment was never a cross-fade, the three shapes are
 * different sizes, and there is no cut to hide the swap behind. It read as a
 * glitch, which is a bad trade for a subtext nobody can see.
 *
 * So: one object, present the whole seven seconds, moved off the centre line
 * to the right of the figure where it composes against the window instead of
 * sitting in front of their face.
 *
 * It is the room's one warm object and the only thing in it that came from the
 * house, which is why it survives into 6.85: the cloth she wrapped, still on
 * his counter, while she dies in the other half of frame.
 */
export function Bundle({ position = BUNDLE_AT }: { position?: V3 }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.035, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.30, 0.07, 0.26]} />
        <meshStandardMaterial color={BUNDLE_CLOTH} roughness={0.95} />
      </mesh>
      {([[-0.15, 0.07, 0.6], [0.15, 0.07, -0.5]] as const).map(([x, y, r], i) => (
        <mesh key={i} position={[x, y, 0]} rotation={[0, 0, r]} castShadow>
          <boxGeometry args={[0.12, 0.02, 0.24]} />
          <meshStandardMaterial color={BUNDLE_CLOTH} roughness={0.95} />
        </mesh>
      ))}
      {/* The knot of the wrapping cloth, so it reads as a bundle from home
          rather than as a crate. */}
      <mesh position={[0, 0.082, 0]} rotation={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[0.07, 0.035, 0.07]} />
        <meshStandardMaterial color={BUNDLE_CLOTH_EMPTY} roughness={0.98} />
      </mesh>
    </group>
  )
}

/**
 * The whole room in one tag: shell + bulb + window, and optionally the bundle.
 * `<Apartment />` with nothing set is exactly what 5.3 puts on screen.
 *
 * `fade` reaches the fixtures too — a dissolving room whose bulb stays lit is
 * a lit bulb hanging in the middle of the next scene.
 */
export function Apartment({
  fade = 1,
  walls,
  floorSize,
  ceiling,
  counter,
  stool,
  bulb = {},
  window: win = {},
  bundle = false,
}: ApartmentShellProps & {
  bulb?: BareBulbProps | false
  window?: DawnWindowProps | false
  bundle?: boolean | V3
}) {
  // Only hand the fixtures a `dim` when there is actually a fade to follow:
  // at fade = 1 they must run exactly the code path 5.3 runs.
  const fadeDim = fade === 1 ? undefined : (t: number) => clamp01(read(fade, t))
  return (
    <>
      <ApartmentShell
        fade={fade} walls={walls} floorSize={floorSize}
        ceiling={ceiling} counter={counter} stool={stool}
      />
      {bulb !== false && <BareBulb {...bulb} dim={bulb.dim ?? fadeDim} />}
      {win !== false && <DawnWindow {...win} dim={win.dim ?? fadeDim} />}
      {bundle !== false && <Bundle position={bundle === true ? BUNDLE_AT : bundle} />}
    </>
  )
}
