/**
 * Act B — the sky: dome, moon, the fixed stars, and the star field the
 * camera flies through on "I need".
 *
 * Two populations of star, doing two different jobs:
 *
 *   FixedStars  sit on the dome and travel with the camera. They are the
 *               night sky — they never get closer, because the sky doesn't.
 *
 *   StarField   is a slab of stars hanging in the air between the last
 *               mountain ridge and the city, z 950→1900. The camera flies
 *               INTO it, and each star swells and streaks off the edge of
 *               the frame at its own moment. The last of them clears the
 *               lens at 0:07.24, on the vocal.
 *
 * The second one is the whole reason the opening works. The previous version
 * cross-faded a star layer's opacity, and a fade is the one thing that reads
 * as "a picture changed" rather than "we went somewhere" — you cannot punch
 * through something that is politely dissolving. Nothing here fades: a star
 * is at full brightness until the instant it is behind the camera.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { seededRandom } from '../../utils/svgHelpers'
import { buildCloud, makeGlowMaterial, updateGlow } from './points'
import { GlowPoints } from './GlowPoints'
import { worldTime } from './time'
import {
  STARS_Z_NEAR, STARS_Z_FAR, T_PUNCH, ramp, clamp01, dayTint, sunRise, nightFall,
} from './flight'

const DOME_R = 4200

/* ── The dome ─────────────────────────────────────────────────────── */
const SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

/**
 * Zenith → horizon → below, with a faint milky band raked across it. The
 * band is analytic (a gaussian about a tilted plane, roughened with two
 * sine octaves) rather than a texture: it costs nothing and it never seams.
 */
const SKY_FRAG = /* glsl */ `
  varying vec3 vDir;
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uBelow;
  uniform vec3 uGlowColor;
  uniform float uGlowAmount;
  uniform vec3 uGlowDir;
  void main() {
    float h = vDir.y;
    vec3 col = h > 0.0
      ? mix(uHorizon, uZenith, pow(clamp(h, 0.0, 1.0), 0.62))
      : mix(uHorizon, uBelow, clamp(-h * 2.4, 0.0, 1.0));

    // Milky band: a soft sheet through a tilted axis.
    vec3 axis = normalize(vec3(0.42, 0.66, -0.62));
    float d = abs(dot(vDir, axis));
    float band = exp(-d * d * 26.0);
    band *= 0.55 + 0.45 * sin(vDir.x * 3.1 + vDir.z * 2.2);
    band *= 0.6 + 0.4 * sin(vDir.y * 5.7 - vDir.x * 4.3);
    col += vec3(0.055, 0.062, 0.10) * max(0.0, band);

    // Whatever is glowing on the horizon ahead of us — the city, then the
    // stadium. Cheap, and it means the destination is lighting the sky long
    // before you can see the thing itself.
    float toward = max(0.0, dot(vDir, normalize(uGlowDir)));
    float lift = pow(toward, 5.0) * exp(-max(0.0, h) * 4.5);
    col += uGlowColor * lift * uGlowAmount;

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`

export function SkyDome() {
  const ref = useRef<THREE.Mesh>(null)
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uZenith: { value: new THREE.Color('#03060F') },
      uHorizon: { value: new THREE.Color('#0E2438') },
      uBelow: { value: new THREE.Color('#04070E') },
      uGlowColor: { value: new THREE.Color('#3A1E6E') },
      uGlowAmount: { value: 0 },
      uGlowDir: { value: new THREE.Vector3(0, 0.05, 1) },
    },
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  }), [])

  const nightZ = useMemo(() => new THREE.Color('#03060F'), [])
  const nightH = useMemo(() => new THREE.Color('#0E2438'), [])
  const nightB = useMemo(() => new THREE.Color('#04070E'), [])
  // Act 3.1's sky, which is where this act now ends: dusty violet overhead,
  // warm gold on the horizon.
  const duskZ = useMemo(() => new THREE.Color('#6A5F8C'), [])
  const duskH = useMemo(() => new THREE.Color('#E0A277'), [])
  const duskB = useMemo(() => new THREE.Color('#4A3346'), [])

  useFrame(({ camera }) => {
    const t = worldTime()
    if (ref.current) ref.current.position.copy(camera.position)
    // Dusk comes in over the pull-out and then goes out again: Act 3.2 is
    // night, so the dome walks back down the same ramp it came up.
    const day = dayTint(t) * (1 - nightFall(t) * 0.94)
    ;(mat.uniforms.uZenith.value as THREE.Color).copy(nightZ).lerp(duskZ, day)
    ;(mat.uniforms.uHorizon.value as THREE.Color).copy(nightH).lerp(duskH, day)
    ;(mat.uniforms.uBelow.value as THREE.Color).copy(nightB).lerp(duskB, day)
    // City haze from ~0:06, then the stadium's own column of light takes
    // over and goes gold-purple as we close on it.
    const city = ramp(t, 5.5, 11, 0, 0.9) * (1 - ramp(t, 15, 19, 0, 1))
    const arena = ramp(t, 14, 19.5, 0, 1.35) * (1 - ramp(t, 20.4, 22, 0, 0.72)) * (1 - day)
    mat.uniforms.uGlowAmount.value = city + arena
    ;(mat.uniforms.uGlowColor.value as THREE.Color)
      .set('#3A1E6E').lerp(new THREE.Color('#7A4A9E'), clamp01(arena / 1.5))
  })

  return (
    <mesh ref={ref} material={mat} renderOrder={-100} frustumCulled={false}>
      <sphereGeometry args={[DOME_R, 40, 24]} />
    </mesh>
  )
}

/* ── The fixed stars ──────────────────────────────────────────────── */
export function FixedStars() {
  const group = useRef<THREE.Group>(null)
  const mat = useMemo(() => makeGlowMaterial({ falloff: 3.4, maxPixels: 26, twinkle: 0.34 }), [])

  const cloud = useMemo(() => buildCloud(
    2400, 4801,
    ['#FFFFFF', '#DCE8FF', '#FFF2D8', '#C8D8FF', '#FFE7C4'],
    rand => {
      // Cosine-weighted toward the upper hemisphere, nothing under the ridges.
      const u = rand()
      const y = -0.06 + Math.pow(u, 0.7) * 1.06
      const a = rand() * Math.PI * 2
      const r = Math.sqrt(Math.max(0, 1 - y * y))
      const R = DOME_R * 0.94
      const size = 4 + Math.pow(rand(), 2.4) * 30
      return [Math.cos(a) * r * R, y * R, Math.sin(a) * r * R, size, 0.5 + rand() * 0.5]
    },
  ), [])

  useFrame(({ camera, size, gl }) => {
    const t = worldTime()
    if (group.current) group.current.position.copy(camera.position)
    updateGlow(mat, camera, size.height * gl.getPixelRatio(), t)
    // They go out as the sky comes up, the way stars do.
    mat.uniforms.uGlobal.value = 1 - dayTint(t) * 0.95
  })

  return (
    <group ref={group}>
      <GlowPoints cloud={cloud} material={mat} frustumCulled={false} renderOrder={-90} />
    </group>
  )
}

/* ── The moon ─────────────────────────────────────────────────────── */
/** Disc with limb darkening and a couple of maria, drawn once into a canvas. */
function makeMoonTexture(): THREE.CanvasTexture {
  const S = 512
  const cv = document.createElement('canvas')
  cv.width = cv.height = S
  const ctx = cv.getContext('2d')!
  ctx.clearRect(0, 0, S, S)

  const g = ctx.createRadialGradient(S * 0.42, S * 0.40, S * 0.04, S * 0.5, S * 0.5, S * 0.5)
  g.addColorStop(0, '#FFFFFF')
  g.addColorStop(0.55, '#F2F6FF')
  g.addColorStop(0.86, '#D6E0F4')
  g.addColorStop(0.985, '#AFC0DE')
  g.addColorStop(1, 'rgba(160,180,210,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2)
  ctx.fill()

  // Maria — soft grey patches, seeded so the moon is the same moon every run.
  const rand = seededRandom(1907)
  ctx.globalCompositeOperation = 'source-atop'
  for (let i = 0; i < 16; i++) {
    const a = rand() * Math.PI * 2
    const rr = Math.pow(rand(), 0.6) * S * 0.42
    const x = S / 2 + Math.cos(a) * rr
    const y = S / 2 + Math.sin(a) * rr
    const r = S * (0.03 + rand() * 0.10)
    const mg = ctx.createRadialGradient(x, y, 0, x, y, r)
    mg.addColorStop(0, `rgba(150,168,196,${0.16 + rand() * 0.16})`)
    mg.addColorStop(1, 'rgba(150,168,196,0)')
    ctx.fillStyle = mg
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalCompositeOperation = 'source-over'

  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function makeHaloTexture(inner: string, outer: string, power: number): THREE.CanvasTexture {
  const S = 256
  const cv = document.createElement('canvas')
  cv.width = cv.height = S
  const ctx = cv.getContext('2d')!
  const img = ctx.createImageData(S, S)
  const ci = new THREE.Color(inner)
  const co = new THREE.Color(outer)
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = (x + 0.5) / S - 0.5
      const dy = (y + 0.5) / S - 0.5
      const d = Math.min(1, Math.sqrt(dx * dx + dy * dy) * 2)
      const a = Math.pow(1 - d, power)
      const i = (y * S + x) * 4
      img.data[i] = (ci.r + (co.r - ci.r) * d) * 255
      img.data[i + 1] = (ci.g + (co.g - ci.g) * d) * 255
      img.data[i + 2] = (ci.b + (co.b - ci.b) * d) * 255
      img.data[i + 3] = a * 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Direction the moon hangs in, normalised. Also the key light direction. */
export const MOON_DIR = new THREE.Vector3(-0.44, 0.40, 0.80).normalize()

export function Moon() {
  const group = useRef<THREE.Group>(null)
  const moonTex = useMemo(() => makeMoonTexture(), [])
  const haloTex = useMemo(() => makeHaloTexture('#CFE0FF', '#2A4A80', 2.2), [])
  const bloomTex = useMemo(() => makeHaloTexture('#9FC0F0', '#0A1A34', 1.35), [])

  const pos = useMemo(
    () => MOON_DIR.clone().multiplyScalar(DOME_R * 0.9),
    [],
  )

  const lift = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera }) => {
    if (!group.current) return
    const t = worldTime()
    const r = sunRise(t)
    // The moon climbs out of frame and thins as the sun comes up, so the
    // last stretch is not a full moon hanging in a sunset.
    lift.copy(pos)
    lift.y += r * 1500
    group.current.position.copy(camera.position).add(lift)
    group.current.quaternion.copy(camera.quaternion)
    const fade = 1 - r * 0.82
    group.current.children.forEach(c => {
      const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial
      m.opacity = (c.userData.baseOpacity ?? 1) * fade
      m.transparent = true
    })
  })

  return (
    <group ref={group} renderOrder={-80} frustumCulled={false}>
      {/* Broad atmospheric bloom, then a tighter halo, then the disc. */}
      <mesh renderOrder={-82} userData={{ baseOpacity: 0.34 }}>
        <planeGeometry args={[3200, 3200]} />
        <meshBasicMaterial map={bloomTex} transparent depthWrite={false} depthTest={false}
          blending={THREE.AdditiveBlending} opacity={0.34} fog={false} toneMapped={false} />
      </mesh>
      <mesh renderOrder={-81} userData={{ baseOpacity: 0.7 }}>
        <planeGeometry args={[1180, 1180]} />
        <meshBasicMaterial map={haloTex} transparent depthWrite={false} depthTest={false}
          blending={THREE.AdditiveBlending} opacity={0.7} fog={false} toneMapped={false} />
      </mesh>
      <mesh renderOrder={-80} userData={{ baseOpacity: 1 }}>
        <planeGeometry args={[430, 430]} />
        <meshBasicMaterial map={moonTex} transparent depthWrite={false} depthTest={false}
          fog={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

/* ── The star field we fly through ────────────────────────────────── */
export function StarField() {
  const mat = useMemo(() => makeGlowMaterial({ falloff: 2.9, maxPixels: 220, twinkle: 0.16 }), [])

  const cloud = useMemo(() => buildCloud(
    3600, 5502,
    ['#FFFFFF', '#E6EEFF', '#FFEFD2', '#CBDCFF', '#FFDCA8'],
    rand => {
      const z = STARS_Z_NEAR + rand() * (STARS_Z_FAR - STARS_Z_NEAR)
      // Denser toward the middle of the corridor and higher up — the camera
      // is climbing through it, and stars under the flight path read as
      // fireflies rather than sky.
      const x = (rand() + rand() + rand() - 1.5) * 2000
      const y = 40 + Math.pow(rand(), 0.55) * 1750
      // A few low ones so the field has depth against the last ridge.
      const yy = rand() < 0.12 ? -120 + rand() * 200 : y
      const size = 5 + Math.pow(rand(), 2.2) * 34
      return [x, yy, z, size, 0.55 + rand() * 0.45]
    },
  ), [])

  useFrame(({ camera, size, gl }) => {
    const t = worldTime()
    updateGlow(mat, camera, size.height * gl.getPixelRatio(), t)
    // Present from the first frame (they ARE the night sky at this distance)
    // and gone the moment the last one is behind us — no fade, just an empty
    // volume. Held one beat past the punch so the stragglers finish leaving.
    mat.uniforms.uGlobal.value = 1 - ramp(t, T_PUNCH + 0.25, T_PUNCH + 1.1, 0, 1)
  })

  return <GlowPoints cloud={cloud} material={mat} frustumCulled={false} />
}

/* ── Cloud banks ──────────────────────────────────────────────────── */
function makeCloudTexture(seed: number): THREE.CanvasTexture {
  const S = 256
  const cv = document.createElement('canvas')
  cv.width = cv.height = S
  const ctx = cv.getContext('2d')!
  const rand = seededRandom(seed)
  ctx.clearRect(0, 0, S, S)
  for (let i = 0; i < 26; i++) {
    const x = S * (0.16 + rand() * 0.68)
    const y = S * (0.34 + (rand() - 0.5) * 0.42)
    const r = S * (0.09 + rand() * 0.19)
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    // Moonlit cloud is a DARK blue-grey with a lit edge, not a white wash.
    // At the alphas this used to run, seventy overlapping puffs stacked into
    // a flat grey sheet over the whole frame and the night stopped being a
    // night.
    const a = 0.035 + rand() * 0.06
    g.addColorStop(0, `rgba(140,166,206,${a})`)
    g.addColorStop(0.55, `rgba(84,106,145,${a * 0.55})`)
    g.addColorStop(1, 'rgba(52,70,104,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

type Puff = {
  pos: [number, number, number]
  scale: [number, number]
  opacity: number
  drift: number
  tex: number
}

/**
 * Banks of cloud lying across the ridges, and one low sheet the camera flies
 * straight through at around 0:04.5 — the moment the flight stops being a
 * pretty landscape and starts being a move.
 */
export function CloudBank() {
  const texes = useMemo(() => [makeCloudTexture(311), makeCloudTexture(312), makeCloudTexture(313)], [])
  const group = useRef<THREE.Group>(null)

  const puffs = useMemo<Puff[]>(() => {
    const rand = seededRandom(2202)
    const out: Puff[] = []
    // High banks sitting behind and between the ridges.
    for (let i = 0; i < 22; i++) {
      const z = 260 + rand() * 1500
      out.push({
        pos: [(rand() - 0.5) * 3600, 180 + rand() * 420, z],
        scale: [700 + rand() * 900, 190 + rand() * 220],
        opacity: 0.12 + rand() * 0.16,
        drift: (rand() - 0.5) * 5,
        tex: Math.floor(rand() * 3),
      })
    }
    // The sheet we pass through: low, wide, and dense enough to wash the
    // frame for a beat.
    for (let i = 0; i < 9; i++) {
      out.push({
        pos: [(rand() - 0.5) * 1500, 110 + rand() * 130, 330 + rand() * 260],
        scale: [560 + rand() * 520, 200 + rand() * 160],
        opacity: 0.14 + rand() * 0.16,
        drift: (rand() - 0.5) * 8,
        tex: Math.floor(rand() * 3),
      })
    }
    // Valley mist pooled between the ridge bands.
    for (let i = 0; i < 18; i++) {
      out.push({
        pos: [(rand() - 0.5) * 3400, 18 + rand() * 46, 200 + rand() * 1300],
        scale: [900 + rand() * 900, 90 + rand() * 90],
        opacity: 0.15 + rand() * 0.16,
        drift: (rand() - 0.5) * 3,
        tex: Math.floor(rand() * 3),
      })
    }
    return out
  }, [])

  const mats = useMemo(
    () => texes.map(tex => new THREE.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false,
      fog: true, toneMapped: false, side: THREE.DoubleSide,
    })),
    [texes],
  )

  useFrame(() => {
    const t = worldTime()
    if (!group.current) return
    // Everything drifts a little; the whole bank is gone once we are in the
    // city, so it costs nothing after 0:09.
    group.current.visible = t < 10
    for (let i = 0; i < group.current.children.length; i++) {
      const c = group.current.children[i]
      c.position.x = puffs[i].pos[0] + Math.sin(t * 0.09 + i) * puffs[i].drift * 6
    }
  })

  return (
    <group ref={group}>
      {puffs.map((p, i) => (
        <mesh key={i} position={p.pos} material={mats[p.tex]} renderOrder={-10}>
          <planeGeometry args={[p.scale[0], p.scale[1]]} />
        </mesh>
      ))}
    </group>
  )
}


/* ── Title card ───────────────────────────────────────────────────── */
/**
 * Act 1.1's title, standing in the WORLD rather than pinned to the lens:
 * Playfair Display 900 in the gold→cream gradient, with 방탄소년단 above and
 * 몸에서 몸으로 below at 1.1's spacing, hung across the pass at z=620. The
 * camera does not cut away from it or fade it out — it flies through it at
 * about 0:05, the way it flies through everything else in this act.
 *
 * The canvas is redrawn once document.fonts settles, because Playfair is a
 * web font and a canvas drawn before it loads silently falls back to a
 * generic serif.
 */
function drawTitle(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.clearRect(0, 0, W, H)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // 방탄소년단 — 1.1 sets this tiny and faint, above the title.
  ctx.fillStyle = 'rgba(240,232,212,0.45)'
  ctx.font = '400 34px "Noto Serif KR", "Malgun Gothic", serif'
  ctx.letterSpacing = '10px'
  ctx.fillText('방탄소년단', W / 2, H * 0.335)

  // "Body to Body" — Playfair 900, HWANG→WARM_CREAM gradient, 0.04em, with
  // 1.1's soft dark drop shadow offset (2,3).
  const TITLE_Y = H * 0.475
  ctx.font = '900 186px "Playfair Display", Georgia, "Times New Roman", serif'
  ctx.letterSpacing = '7px'
  ctx.fillStyle = 'rgba(26,26,26,0.30)'
  ctx.filter = 'blur(3px)'
  ctx.fillText('Body to Body', W / 2 + 3, TITLE_Y + 4)
  ctx.filter = 'none'

  const grad = ctx.createLinearGradient(W * 0.28, H * 0.40, W * 0.72, H * 0.56)
  grad.addColorStop(0, '#D4A843')     // HWANG
  grad.addColorStop(0.35, '#F5E6C8')  // WARM_CREAM
  grad.addColorStop(0.65, '#D4A843')
  grad.addColorStop(1, '#F5E6C8')
  ctx.save()
  ctx.shadowColor = 'rgba(212,168,67,0.55)'
  ctx.shadowBlur = 44
  ctx.fillStyle = grad
  ctx.fillText('Body to Body', W / 2, TITLE_Y)
  ctx.restore()
  ctx.fillStyle = grad
  ctx.fillText('Body to Body', W / 2, TITLE_Y)

  // 몸에서 몸으로 — WARM_CREAM at 0.7, letter-spacing 0.3em.
  ctx.fillStyle = 'rgba(245,230,200,0.70)'
  ctx.font = '400 44px "Noto Serif KR", "Malgun Gothic", serif'
  ctx.letterSpacing = '14px'
  ctx.fillText('몸에서 몸으로', W / 2, H * 0.60)
}

function makeTitleTexture(): THREE.CanvasTexture {
  const W = 2048, H = 1024
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const ctx = cv.getContext('2d')!
  drawTitle(ctx, W, H)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  // Playfair is a web font; if it was not ready the first draw fell back to
  // a generic serif, so draw again once the font set settles.
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    document.fonts.ready.then(() => {
      drawTitle(ctx, W, H)
      tex.needsUpdate = true
    })
  }
  return tex
}

/** Where the card hangs, and how big it is. The camera passes z=620 at
 *  roughly 0:05.1, so it grows steadily for five seconds and then goes by. */
const TITLE_Z = 620
const TITLE_Y = 236

export function TitleCard() {
  const tex = useMemo(() => makeTitleTexture(), [])
  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    map: tex, transparent: true, opacity: 1, depthWrite: false,
    fog: false, toneMapped: false, side: THREE.DoubleSide,
  }), [tex])

  return (
    // Yawed to face the camera: a plane's front is +Z and the flight reads it
    // from -Z, so without this the title is a mirror image.
    <mesh position={[0, TITLE_Y, TITLE_Z]} rotation={[0, Math.PI, 0]}
      material={mat} renderOrder={60} frustumCulled={false}>
      <planeGeometry args={[760, 380]} />
    </mesh>
  )
}
