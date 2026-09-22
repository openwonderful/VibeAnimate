/**
 * Act B — the world, and the one camera that flies through it.
 *
 * Mounts everything at once: range, star field, city, stadium, crowd. The
 * only thing that changes over the 26 seconds is where the camera is. That
 * is the whole architecture, and it is why there is no transition anywhere
 * in this act to get wrong.
 *
 * `Phased` switches subtrees off once the camera has left them behind (or
 * before it can possibly see them). Nothing FADES — a fade would be visible.
 * The mountains go dark only after the star field has closed behind them and
 * they are 1500 units astern; the crowd only comes on once the stadium is
 * the thing in frame. It exists to keep the render honest: 46,000 crowd
 * sprites should not be costing anything while we are still in the clouds.
 */
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import {
  BloomEffect, VignetteEffect,
  type EffectComposer as PPEffectComposer,
} from 'postprocessing'
import * as THREE from 'three'
import { useCameraHandoff } from '../DebugCamera'
import { publishSceneLookAt } from '../cameraHandoff'
import { setFlightOffset, worldTime, songTime } from './time'
import {
  flightPose, handheld, ramp, beatPulse, dayTint, sunRise, nightFall,
  T_PUNCH, T_STADIUM, T_RIM, T_TREE, T_32, T_33, FLIGHT_END, indoors,
  type PoseFn,
} from './flight'
import {
  SkyDome, FixedStars, Moon, StarField, CloudBank, TitleCard, MOON_DIR,
} from './sky'
import {
  Ridges, ForegroundCrags, Ground, Pines, Cranes, Blossoms, HillFlowers,
} from './mountains'
import { Towers, CityLights, Traffic, INeedSigns } from './city'
import {
  Facade, Bowl, Crowd, StadiumRig, StadiumApron, Stage, StageMembers,
} from './stadium'
import { Valley, ValleyHouse } from './valley'
import { RoadsideTree } from './tree'
import { TableRoom } from './table'
import { AscendedSky } from './ascendedSky'
import GradientEnvironment from '../effects/GradientEnvironment'

/**
 * Show `children` only while world time is inside one of `windows`. Two
 * windows, not one, because the act now goes out the way it came in: the
 * range is on screen for the first ten seconds and again for the last eight,
 * and it should cost nothing for the twenty-five in between.
 */
export function Phased({ windows, children }: {
  windows: [number, number][]
  children: ReactNode
}) {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    const t = worldTime()
    if (ref.current) {
      ref.current.visible = windows.some(([a, b]) => t >= a && t < b)
    }
  })
  return <group ref={ref}>{children}</group>
}

/**
 * Ramp a subtree out over [from, to] and then leave it alone.
 *
 * `Phased` is a hard switch, which is the right thing everywhere the camera
 * cannot see what it turns off — and the wrong thing for the city and the
 * stadium at the end of the act. From out over the fields they are 10 km
 * away through the pass, but the towers still break the ridge line and the
 * facade is still a lavender bar in the gap between the hills: a sunrise
 * over rice paddies with a stadium in it. Cutting them costs about 1,200
 * pixels in one frame, which is small and completely obvious.
 *
 * Base opacity is stashed on first touch and re-applied every frame, so
 * scrubbing backwards through the fade restores rather than accumulating.
 */
function FadeOut({ from, to, children }: {
  from: number
  to: number
  children: ReactNode
}) {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    const g = ref.current
    if (!g) return
    const t = worldTime()
    const a = 1 - ramp(t, from, to)
    // Nothing to do outside the window — and nothing has been touched yet
    // either, so leave the materials exactly as authored.
    if (a >= 1 && !g.userData.faded) return
    g.userData.faded = a < 1
    g.traverse(o => {
      const mat = (o as THREE.Mesh).material
      if (!mat) return
      for (const m of Array.isArray(mat) ? mat : [mat]) {
        if (m.userData.baseOpacity === undefined) {
          m.userData.baseOpacity = m.opacity
          m.userData.baseTransparent = m.transparent
        }
        m.opacity = m.userData.baseOpacity * a
        m.transparent = m.userData.baseTransparent || a < 1
      }
    })
  })
  return <group ref={ref}>{children}</group>
}

/**
 * Publishes the flight's state to `window.__flight` for the CDP tooling —
 * `npm run eval -- --act B "window.__flight"` answers "where is the camera,
 * and is anything actually being drawn", which is the first question every
 * time a frame comes back black.
 */
function FlightProbe() {
  const { scene } = useThree()
  useFrame(({ gl, camera }) => {
    const t = worldTime()
    ;(window as unknown as { __scene: unknown }).__scene = scene
    ;(window as unknown as { __flight: unknown }).__flight = {
      t: +t.toFixed(3),
      pos: camera.position.toArray().map(v => +v.toFixed(1)),
      fov: +(camera as THREE.PerspectiveCamera).fov.toFixed(2),
      calls: gl.info.render.calls,
      tris: gl.info.render.triangles,
      points: gl.info.render.points,
    }
  })
  return null
}

/* ── Camera ───────────────────────────────────────────────────────── */
function FlightCamera({ pose = flightPose }: { pose?: PoseFn }) {
  const yieldCamera = useCameraHandoff()
  const target = useRef(new THREE.Vector3())
  useFrame(({ camera }) => {
    if (yieldCamera()) return
    const t = worldTime()
    const p = pose(t)
    // Zero everywhere except under the tree, which is the one shot in the
    // act that is being held rather than flown.
    const h = handheld(t)
    camera.position.set(p.pos[0] + h.pos[0], p.pos[1] + h.pos[1], p.pos[2] + h.pos[2])
    target.current.set(p.tgt[0] + h.tgt[0], p.tgt[1] + h.tgt[1], p.tgt[2] + h.tgt[2])
    camera.lookAt(target.current)
    // The debug camera orbits this if you take over — without it the pivot
    // would be a point six units off the nose, which on a shot whose subject
    // is a kilometre away means orbiting empty air.
    publishSceneLookAt(target.current.x, target.current.y, target.current.z)
    const cam = camera as THREE.PerspectiveCamera
    if (Math.abs(cam.fov - p.fov) > 1e-4) {
      cam.fov = p.fov
      cam.updateProjectionMatrix()
    }
  })
  return null
}

/* ── Atmosphere ───────────────────────────────────────────────────── */
/**
 * Fog colour and density are the act's grade. Cold blue over the range, a
 * purple lift through the city, and then it thins right out at the stadium
 * so the bowl reads sharp instead of through gauze.
 */
export function Atmosphere() {
  const { scene } = useThree()
  const fog = useMemo(() => new THREE.FogExp2('#050A16', 0.00046), [])
  /**
   * Act 3.3's own fog, at 20×. This is most of what separates B.9 from 3.3:
   * 3.3 hangs a tight warm haze at 4.5–11 units in front of a room the
   * camera sits 2.5 units from, and that haze is what puts the back wall and
   * the room's edges into shadow. Act B used to switch the fog off entirely
   * indoors, so the whole room came back evenly lit and read as one flat
   * orange wash — the exponential valley fog was the wrong fog, not the
   * wrong idea.
   */
  const roomFog = useMemo(() => new THREE.Fog('#160C06', 4.5 * 20, 11 * 20), [])
  const cold = useMemo(() => new THREE.Color('#061020'), [])
  const city = useMemo(() => new THREE.Color('#1A1030'), [])
  const arena = useMemo(() => new THREE.Color('#241539'), [])
  /** Where the act lands: the haze Act 3.1 opens in. */
  const dusk = useMemo(() => new THREE.Color('#C08A76'), [])
  /** …and then Act 3.2's, once the sun is off the valley. */
  const dark = useMemo(() => new THREE.Color('#1B2A44'), [])
  const tmp = useMemo(() => new THREE.Color(), [])

  useFrame(() => {
    const t = worldTime()
    // Indoors the valley's exponential fog is meaningless — it is tuned for
    // kilometres — so 3.3's linear room haze takes over instead.
    if (indoors(t)) { scene.fog = roomFog; return }
    scene.fog = fog
    tmp.copy(cold)
      .lerp(city, ramp(t, 6, 12))
      .lerp(arena, ramp(t, 15, 20))
      .lerp(dusk, dayTint(t))
      .lerp(dark, nightFall(t))
    fog.color.copy(tmp)
    // Thick enough at the top to hide the city 4km out, thin by the time we
    // are in it, thinner still inside the bowl.
    fog.density =
      0.00034 * (1 - ramp(t, 6.5, 13, 0, 0.34)) * (1 - ramp(t, 17, 21, 0, 0.86))
      // On the way out the haze comes back — it is what puts the range at a
      // distance again, and what makes the last frame read as an aerial
      // perspective rather than as a diagram.
      * (1 + ramp(t, 30, 38, 0, 5.4))
      // …and then eases off for the wide. At full outbound density the range
      // is 9,000 units from the camera at 0:55 and simply is not there any
      // more; it has to stay readable on the horizon, because it is the only
      // thing out here that says which valley this is.
      * (1 - ramp(t, 42, 51, 0, 0.55))
      // Act 3.2 is a hazier night than 3.1 is a day — the fog is what puts
      // the range behind the house instead of on top of it.
      * (1 + ramp(t, 66, 78, 0, 0.7))
  })
  return null
}

/** Key light: the moon for the range, then the arena's own glow. */
export function Lights() {
  const moonRef = useRef<THREE.DirectionalLight>(null)
  const arenaRef = useRef<THREE.PointLight>(null)
  const ambientRef = useRef<THREE.AmbientLight>(null)
  const hemiRef = useRef<THREE.HemisphereLight>(null)

  useFrame(() => {
    const t = worldTime()
    const out = indoors(t) ? 0 : 1
    if (moonRef.current) {
      // The range is unlit basic material now, so this only shapes the
      // ground and the city; it warms as the act turns over into dusk.
      // Darker night: once the sun is off the valley the key drops away and
      // goes properly cold, so the figures' own glow is the light in the
      // frame rather than a fill on top of one.
      moonRef.current.intensity =
        2.1 * (1 - ramp(t, 8, 14, 0, 0.55)) * (1 + dayTint(t) * 1.4)
        * (1 - nightFall(t) * 0.62) * out
      const n = nightFall(t)
      moonRef.current.color.setRGB(
        (0.75 + dayTint(t) * 0.25) * (1 - n * 0.30),
        0.83 * (1 - n * 0.14),
        1.0 - dayTint(t) * 0.42 * (1 - n),
      )
    }
    if (hemiRef.current) hemiRef.current.intensity = 0.28 * (1 - nightFall(t) * 0.72) * out
    if (arenaRef.current) {
      // This light exists to make the arena glow on its own surroundings on
      // the approach. Inside the bowl it is standing in the middle of the
      // pitch washing every seat flat lavender, so it goes out as we cross
      // the rim and the crowd's own light takes over.
      arenaRef.current.intensity =
        ramp(t, 14, 19.4, 0, 900) * (1 - ramp(t, T_RIM - 0.4, T_RIM + 1.1, 0, 0.94))
        * (1 + beatPulse(songTime()) * 0.35)
    }
    if (ambientRef.current) {
      ambientRef.current.intensity =
        (0.22 + ramp(t, 10, 19, 0, 0.34) - ramp(t, T_RIM - 0.4, T_RIM + 1.2, 0, 0.30))
        * (1 - nightFall(t) * 0.68) * out
    }
  })

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.22} color="#6C86C0" />
      <directionalLight
        ref={moonRef}
        position={[MOON_DIR.x * 2000, MOON_DIR.y * 2000, MOON_DIR.z * 2000]}
        intensity={2.1}
        color="#BFD4FF"
      />
      {/* Bounce off the valley floor, so the ridges are not pure silhouette */}
      <hemisphereLight ref={hemiRef} intensity={0.28} color="#2A3E66" groundColor="#0A0D18" />
      {/* The arena lighting its own surroundings once we are close */}
      <pointLight ref={arenaRef} position={[0, 140, 5250]} color="#A374F0"
        intensity={0} distance={2600} decay={1.4} />
    </>
  )
}

/**
 * The valley's sky, as an environment map. Act 3.1 leans on this hard: the
 * paddies are a near-mirror and everything else is `meshStandardMaterial`,
 * so with nothing to reflect the fields render as dark rectangles and the
 * whole frame loses its bounce. It is installed for the whole act and its
 * intensity is ramped, because during the flight there is nothing out there
 * that wants a sunrise reflected in it.
 */
export function ValleyEnvironment() {
  const { scene } = useThree()
  useFrame(() => {
    const t = worldTime()
    // The dusk sky is the wrong thing to be reflecting once the sun is
    // down, so it fades out with it and the moon key takes over.
    // Richer through the golden hour — this map IS most of what makes the
    // paddies and the road look like a photograph rather than a diagram —
    // and almost gone by night, when there is no sky to bounce.
    scene.environmentIntensity = indoors(t) ? 0
      : dayTint(t) * (0.16 + 0.84 * sunRise(t)) * 1.18 * (1 - nightFall(t) * 0.86)
  })
  return (
    <GradientEnvironment
      zenith="#4E5C92"
      horizon="#FF9A47"
      ground="#7A4B24"
      sun={{ color: '#FFE7B8', azimuthDeg: 194, elevationDeg: 7, sizeDeg: 4, glowDeg: 46 }}
      intensity={1.15}
    />
  )
}

/* ── Grade ────────────────────────────────────────────────────────── */
/**
 * The act's bloom is tuned for a city seen from the air — a low threshold so
 * distant window light reads at all — and that is the wrong curve for the
 * last fourteen seconds, which are a small warm room two and a half metres
 * from the lens. At 0.48 the two of them are entirely above threshold, so
 * they bloom edge to edge and clip to flat yellow with no shading left in
 * the body at all, and the halo washes the walls out with them.
 *
 * Indoors it lands on Act 3.3's own numbers instead. Everything is driven
 * off the live effect objects rather than by re-mounting the composer,
 * because the switch happens mid-render and a composer remount would cost a
 * frame.
 *
 * Note that `gl.toneMappingExposure` is NOT a knob here: the effect composer
 * sets the renderer to NoToneMapping, so the ACESFilmic/1.04 configured on
 * the canvas never runs and changing the exposure does literally nothing.
 * (The same is true of Act 3.3 and of every scene in the project that mounts
 * a composer.) Exposure has to be an effect in the chain or nothing.
 */
const GRADE = {
  out:  { bloom: 0.72, threshold: 0.48, smoothing: 0.65, vignette: 0.62 },
  room: { bloom: 0.62, threshold: 0.62, smoothing: 0.40, vignette: 0.68 },
}

function Post() {
  // The effects are reached through the composer rather than by putting a
  // ref on <Bloom>: @react-three/postprocessing memoises each effect on
  // `JSON.stringify(props)`, and under React 19 `ref` IS a prop — stringify
  // hits the KawaseBlurPass's circular `resolution` and throws, which blanks
  // the whole canvas.
  const composer = useRef<PPEffectComposer>(null)
  const found = useRef<{ bloom?: BloomEffect; vignette?: VignetteEffect }>({})

  useFrame(() => {
    const f = found.current
    if (!f.bloom && composer.current?.passes) {
      for (const pass of composer.current.passes) {
        for (const e of (pass as { effects?: unknown[] }).effects ?? []) {
          if (e instanceof BloomEffect) f.bloom = e
          if (e instanceof VignetteEffect) f.vignette = e
        }
      }
    }
    const g = indoors(worldTime()) ? GRADE.room : GRADE.out
    if (f.bloom) {
      f.bloom.intensity = g.bloom
      f.bloom.luminanceMaterial.threshold = g.threshold
      f.bloom.luminanceMaterial.smoothing = g.smoothing
    }
    if (f.vignette) f.vignette.darkness = g.vignette
  })

  return (
    <EffectComposer ref={composer}>
      {/* Threshold well above the window emissive: at 0.32 the city's tens of
          thousands of lit windows all bloomed at once and their halos merged
          into a grey wash across every facade, which read as daylight on
          concrete. Only the genuinely bright things — the arena, the moon,
          the members — should bleed. */}
      <Bloom intensity={GRADE.out.bloom} luminanceThreshold={GRADE.out.threshold}
        luminanceSmoothing={GRADE.out.smoothing} mipmapBlur />
      <Vignette eskil={false} offset={0.22} darkness={GRADE.out.vignette} />
    </EffectComposer>
  )
}

/**
 * The act. `offset` is where this window starts in song time — B.2 passes 8,
 * so its local t=0 is the world's t=8.
 */
export default function World({ offset = 0, pose, signX }: {
  offset?: number; pose?: PoseFn; signX?: number[]
}) {
  setFlightOffset(offset)

  return (
    <>
      <FlightCamera pose={pose} />
      <FlightProbe />
      <FlightProbe />
      <Atmosphere />
      <Lights />
      <ValleyEnvironment />

      <SkyDome />
      <FixedStars />
      <Moon />
      {/* Hung in the world at z=620; the camera flies through it at ~0:05. */}
      <Phased windows={[[-1, 7]]}>
        <TitleCard />
      </Phased>

      {/* Ground runs the whole length of the act — it is the one thing that
          is never switched off, because it is the thing that makes the
          mountains and the stadium the same place. */}
      <Ground />

      {/* The range: outbound for the first ten seconds, and again on the way
          back out from 0:36. Cranes, pines and petals belong to it. */}
      {/* The crags are 300-unit black masses sitting at z=70–280, which is
          fine when the camera is flying past them at 0:02 and wrong when it
          parks at the house forty units away. */}
      <Phased windows={[[-1, T_PUNCH + 3], [33.6, 62]]}>
        <ForegroundCrags />
      </Phased>
      <Phased windows={[[-1, T_PUNCH + 3], [33.6, T_33]]}>
        <Ridges />
        <Pines />
        <HillFlowers />
        <Cranes />
        <Blossoms />
        <CloudBank />
      </Phased>

      {/* The valley is on screen at BOTH ends of the act now: the opening
          frame is the lit house at the end of a black road, and the last
          twenty-four seconds are the walk back up to it. */}
      <Phased windows={[[-1, 7], [36, T_33]]}>
        <Valley />
      </Phased>
      <Phased windows={[[-1, 7], [34, T_33]]}>
        <ValleyHouse />
      </Phased>
      <Phased windows={[[T_33, FLIGHT_END + 2]]}>
        <TableRoom />
      </Phased>
      {/* Between the two cuts: the tree, the two of them under it, and what
          the sky has turned into. The RIVER stays up through the start of
          3.3 — the cut at T_32 now lands mid-sky and the pan-down has to
          come down OFF the river, so switching it at the cut would make the
          sky itself pop across the one frame that must read as continuous.
          By 79.5 the aim is on the road and it leaves unseen. */}
      <Phased windows={[[T_TREE - 0.5, T_32]]}>
        <RoadsideTree />
      </Phased>
      <Phased windows={[[T_TREE - 0.5, 79.5]]}>
        <AscendedSky />
      </Phased>

      <Phased windows={[[-1, T_PUNCH + 1.4]]}>
        <StarField />
      </Phased>

      {/* Switched off once the camera is far enough back that the pass has
          closed to a few pixels — the city and the stadium are both plainly
          visible THROUGH the gap at 0:44, so cutting them any earlier is a
          pop, and leaving them on means a violet smudge in the middle of a
          sunrise. 0:51 is the first moment neither reads. */}
      <Phased windows={[[2, T_RIM + 0.6], [30, 49]]}>
        <FadeOut from={43} to={48.4}>
          <Towers />
          <CityLights />
          <Traffic />
        </FadeOut>
      </Phased>
      <Phased windows={[[8.4, T_RIM]]}>
        <INeedSigns x={signX} />
      </Phased>

      {/* The stadium itself is visible from the very first frame — a speck of
          light 5km down the valley — so it is never phased out at the top,
          only at the very end, with the city. */}
      <Phased windows={[[-1, 49]]}>
        <FadeOut from={43} to={48.4}>
          <Facade />
          <StadiumRig />
        </FadeOut>
      </Phased>
      <Phased windows={[[-1, T_RIM + 1.2], [30, 49]]}>
        <FadeOut from={43} to={48.4}>
          <StadiumApron />
        </FadeOut>
      </Phased>
      <Phased windows={[[T_STADIUM - 4, 41]]}>
        <Bowl />
        <Stage />
        <StageMembers />
      </Phased>
      <Phased windows={[[T_STADIUM - 2.5, 41]]}>
        <Crowd />
      </Phased>

      <Post />
    </>
  )
}
