/**
 * Act B — 아리랑 on the stadium's LED wall.
 *
 * The three syllables of the album mark, built as real geometry rather than
 * painted into a canvas: a ring (아), a barred circle (리), and a barred
 * circle with a vertical stroke (랑), each punched out of a filled disc with
 * THREE.Shape holes. Around them is the machinery that makes the 2.2 version
 * of this wall feel like something is happening — halos, arcane circles
 * turning at different rates, stars in orbit, energy arcs strung between the
 * syllables, and a chromatic red/cyan offset behind the lot.
 *
 * Its own module because it is genuinely a scene of its own, and because it
 * has to sit cleanly on a 380x122 wall 300 units from the camera: everything
 * here is authored in wall units, centred on the group origin, with nothing
 * poking past the frame.
 *
 * Everything animates off the shared beat, so the wall is hitting with the
 * crowd, the lights and the members.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { seededRandom } from '../../utils/svgHelpers'
import { worldTime, songTime } from './time'
import { beatPulse, T_STADIUM } from './flight'
import { buildCloud, makeGlowMaterial, updateGlow } from './points'
import { GlowPoints } from './GlowPoints'

const RED = '#F4222A'
const RED_DEEP = '#8C0E18'
const CYAN = '#3FD8FF'
const GOLD = '#E8C07A'

/** Symbol radius and spacing, in wall units. */
const R = 38
const SPACING = 118

/* ── Syllable geometry ────────────────────────────────────────────── */
/**
 * The three syllables are drawn analytically in a fragment shader on a flat
 * quad rather than punched out of a THREE.Shape: the bars are a signed
 * distance test, so they are exact, antialiased at any distance, and cannot
 * quietly fail to triangulate — which is what happened first time round,
 * leaving 리 and 랑 as plain discs.
 *
 *   variant 0 = 아, a ring
 *   variant 1 = 리, two horizontal bars
 *   variant 2 = 랑, two bars and a vertical stroke
 *
 * The bars are NOT straight, and that asymmetry is most of the mark's
 * character — see CURVE below.
 */
function makeSyllableMaterial(variant: number, color: string, opts: {
  opacity?: number
  additive?: boolean
} = {}): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opts.opacity ?? 1 },
      uVariant: { value: variant },
    },
    vertexShader: /* glsl */ `
      varying vec2 vP;
      void main() {
        vP = (uv - 0.5) * 2.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vP;
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform int uVariant;
      float band(float v, float centre, float half_, float aa) {
        return 1.0 - smoothstep(half_ - aa, half_ + aa, abs(v - centre));
      }
      /** Filled interval [lo, hi]. The bars need edges that move
       *  independently, which a centre±half band cannot express. */
      float slab(float v, float lo, float hi, float aa) {
        return smoothstep(lo - aa, lo + aa, v) * (1.0 - smoothstep(hi - aa, hi + aa, v));
      }
      void main() {
        float aa = fwidth(vP.x) * 1.2 + 0.004;
        float d = length(vP);
        float a = 1.0 - smoothstep(1.0 - aa, 1.0, d);
        // Bar geometry lifted from StageSymbols#barPositions with the same
        // barCount=2 / gapRatio=0.13 the 2.2 wall uses: three equal sections
        // split by two bars 0.26 of the diameter thick, centred at ±0.3767.
        float BAR_C = 0.3767;
        float BAR_H = 0.13;
        // …and the S-curve from StageSymbols#barCutoutPath, which is what
        // makes these read as the album mark rather than as a bar code. ONE
        // edge of each bar moves, and on OPPOSITE sides:
        //   top bar    — upper edge sweeps DOWN across the right-hand third,
        //                so the top section grows a tail down and to the right
        //   bottom bar — lower edge sweeps UP across the left-hand third,
        //                so the bottom section grows a tail up and to the left
        // The other two edges stay flat, which is why the middle section is a
        // clean straight-sided band. 2.2 authors this as curveAmount/size =
        // 35/250 of the radius over slopeFrac = 0.35 of the width; its cubic
        // bezier's rise fits u^2 across that span to within a percent.
        float CURVE = 0.14;
        float uR = clamp((vP.x - 0.3) / 0.7, 0.0, 1.0);
        float uL = clamp((-vP.x - 0.3) / 0.7, 0.0, 1.0);
        if (uVariant == 0) {
          a *= smoothstep(0.54 - aa, 0.54 + aa, d);
        } else {
          a *= 1.0 - slab(vP.y, BAR_C - BAR_H, BAR_C + BAR_H - CURVE * uR * uR, aa);
          a *= 1.0 - slab(vP.y, -BAR_C - BAR_H + CURVE * uL * uL, -BAR_C + BAR_H, aa);
          if (uVariant == 2) {
            // 랑's vertical stroke cuts the MIDDLE SECTION ONLY — between the
            // two bars, not through the whole disc. Slicing the disc top to
            // bottom is a different letter.
            //
            // It really is a hole: the middle section is two separate pieces
            // and has to read that way. What it is not is 2.2's full-width
            // hard-edged cut — the wall is 380 units wide and mostly seen from
            // across the bowl, where the symbol is a few dozen pixels across
            // and that cut reads as a scratch on the LED. So: narrower than
            // the horizontal bars, and feathered, but cutting all the way
            // through at the centre.
            //
            // The mask runs to ±BAR_C, i.e. it OVERLAPS half of each bar
            // rather than stopping where the middle section ends. Stopping at
            // the boundary leaves both fades — the stroke's and the bar's —
            // sitting at the same y, and two half-cuts multiply to a quarter
            // rather than to nothing: a bright tick across the top and bottom
            // of the gap. The overlap lands inside geometry the bars have
            // already cut away, so it costs nothing.
            float mid = band(vP.y, 0.0, BAR_C, aa);
            float vert = band(vP.x, 0.0, BAR_H * 0.72, aa + 0.035);
            a *= 1.0 - vert * mid;
          }
        }
        // 2.2's symbols fade toward their rim rather than ending on a hard
        // edge; that softness is a lot of why they glow.
        a *= mix(1.0, 0.38, smoothstep(0.30, 1.0, d));
        if (a < 0.004) discard;
        gl_FragColor = vec4(uColor, a * uOpacity);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
    blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  })
}

/* ── Halo / arcane-circle textures ────────────────────────────────── */
function radialTexture(inner: string, power: number): THREE.CanvasTexture {
  const S = 128
  const cv = document.createElement('canvas')
  cv.width = cv.height = S
  const ctx = cv.getContext('2d')!
  const img = ctx.createImageData(S, S)
  const c = new THREE.Color(inner)
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = (x + 0.5) / S - 0.5
      const dy = (y + 0.5) / S - 0.5
      const d = Math.min(1, Math.sqrt(dx * dx + dy * dy) * 2)
      const a = Math.pow(1 - d, power)
      const i = (y * S + x) * 4
      img.data[i] = c.r * 255
      img.data[i + 1] = c.g * 255
      img.data[i + 2] = c.b * 255
      img.data[i + 3] = a * 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/* ── The wall ─────────────────────────────────────────────────────── */
export function ArirangWall({ width, height }: { width: number; height: number }) {
  const haloTex = useMemo(() => radialTexture('#FF3A3A', 2.4), [])
  const starTex = useMemo(() => makeWallStarTexture(), [])
  const mainMats = useMemo(
    () => [0, 1, 2].map(v => makeSyllableMaterial(v, RED)), [])
  const redMats = useMemo(
    () => [0, 1, 2].map(v => makeSyllableMaterial(v, RED_DEEP, { opacity: 0.6, additive: true })), [])
  const cyanMats = useMemo(
    () => [0, 1, 2].map(v => makeSyllableMaterial(v, CYAN, { opacity: 0.24, additive: true })), [])
  const cx = useMemo(() => [-SPACING, 0, SPACING], [])

  const haloMat = useMemo(() => new THREE.MeshBasicMaterial({
    map: haloTex, transparent: true, depthWrite: false, fog: false,
    blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0.5,
  }), [haloTex])
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: GOLD, transparent: true, opacity: 0.20, side: THREE.DoubleSide,
    depthWrite: false, fog: false, toneMapped: false,
  }), [])
  const backMat = useMemo(() => new THREE.MeshBasicMaterial({
    map: starTex, fog: false, toneMapped: false,
  }), [starTex])

  /**
   * Stars in orbit — one cloud per syllable, each spun about ITS OWN centre.
   * A single cloud rotated about the wall's origin swings the outer two
   * syllables' stars through huge arcs that leave the wall entirely: at
   * around 0:25 they were streaming off the top of the frame, and only the
   * middle symbol looked like it had any.
   *
   * Orbits are also kept inside the wall's half-height, so nothing can climb
   * out of the panel however far round it goes.
   */
  const starMat = useMemo(() => makeGlowMaterial({ falloff: 2.8, maxPixels: 34, twinkle: 0.3 }), [])
  const MAX_ORBIT = Math.min(R * 1.9, height / 2 - 6)
  const starClouds = useMemo(() => [0, 1, 2].map(k => buildCloud(
    300, 9701 + k, ['#FFFFFF', '#FFE0B0', '#9FD8FF', '#FFB0B0'],
    rand => {
      const orbit = R * 1.12 + rand() * (MAX_ORBIT - R * 1.12)
      const a = rand() * Math.PI * 2
      return [
        Math.cos(a) * orbit,
        Math.sin(a) * orbit,
        (rand() - 0.5) * 18,
        1.1 + rand() * 2.4,
        0.4 + rand() * 0.6,
      ]
    },
  )), [MAX_ORBIT])

  const orbits = useRef<THREE.Group>(null)
  const arcane = useRef<THREE.Group>(null)
  const symbols = useRef<THREE.Group>(null)
  const chroma = useRef<THREE.Group>(null)

  useFrame(({ camera, size, gl }) => {
    const t = worldTime()
    const pulse = beatPulse(songTime(), T_STADIUM - 6)
    updateGlow(starMat, camera, size.height * gl.getPixelRatio(), t)
    starMat.uniforms.uPulse.value = pulse
    if (orbits.current) {
      orbits.current.children.forEach((c, i) => {
        c.rotation.z = t * (0.13 + i * 0.05) * (i === 1 ? -1 : 1)
      })
    }
    if (arcane.current) {
      arcane.current.children.forEach((c, i) => {
        c.rotation.z = t * (0.08 + i * 0.05) * (i % 2 ? -1 : 1)
        const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial
        m.opacity = 0.10 + 0.10 * Math.sin(t * 0.9 + i)
      })
    }
    if (symbols.current) {
      const s = 1 + pulse * 0.035
      symbols.current.scale.setScalar(s)
    }
    if (chroma.current) {
      // The offset breathes, so the aberration is alive rather than a
      // static double-print.
      const o = 1.4 + pulse * 2.6
      chroma.current.children[0].position.x = -o
      chroma.current.children[1].position.x = o
    }
    haloMat.opacity = 0.42 + pulse * 0.3
  })

  return (
    <group>
      {/* Backing, so the bowl behind never shows through the holes. */}
      <mesh position={[0, 0, -3]} material={backMat}>
        <planeGeometry args={[width, height]} />
      </mesh>

      {/* Arcane circles, turning at their own rates. */}
      <group ref={arcane}>
        {cx.flatMap((x, i) => [1.35, 1.75, 2.15].map((k, j) => (
          <mesh key={`${i}-${j}`} position={[x, 0, -1.4]} material={ringMat.clone()}>
            <ringGeometry args={[R * k, R * k + 0.7, 96]} />
          </mesh>
        )))}
      </group>

      {/* Halos under the syllables. */}
      {cx.map((x, i) => (
        <mesh key={i} position={[x, 0, -1]} material={haloMat}>
          <planeGeometry args={[R * 4.2, R * 4.2]} />
        </mesh>
      ))}

      {/* Chromatic offset copies. */}
      <group ref={chroma}>
        <group position={[-1.4, 0, -0.4]}>
          {cx.map((x, i) => (
            <mesh key={i} position={[x, 0, 0]} material={redMats[i]}>
              <planeGeometry args={[R * 2, R * 2]} />
            </mesh>
          ))}
        </group>
        <group position={[1.4, 0, -0.4]}>
          {cx.map((x, i) => (
            <mesh key={i} position={[x, 0, 0]} material={cyanMats[i]}>
              <planeGeometry args={[R * 2, R * 2]} />
            </mesh>
          ))}
        </group>
      </group>

      {/* The syllables. */}
      <group ref={symbols}>
        {cx.map((x, i) => (
          <mesh key={i} position={[x, 0, 0]} material={mainMats[i]}>
            <planeGeometry args={[R * 2, R * 2]} />
          </mesh>
        ))}
      </group>

      {/* Stars in orbit — one ring per syllable, about its own centre. */}
      <group ref={orbits} position={[0, 0, 2]}>
        {cx.map((x, i) => (
          <group key={i} position={[x, 0, 0]}>
            <GlowPoints cloud={starClouds[i]} material={starMat} frustumCulled={false} />
          </group>
        ))}
      </group>
    </group>
  )
}

/** Seeded twinkle field used behind the symbols, drawn once. */
export function makeWallStarTexture(): THREE.CanvasTexture {
  const W = 512, H = 180
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const ctx = cv.getContext('2d')!
  ctx.fillStyle = '#08040E'
  ctx.fillRect(0, 0, W, H)
  const rand = seededRandom(3312)
  for (let i = 0; i < 320; i++) {
    const x = rand() * W, y = rand() * H
    const r = 0.5 + rand() * 1.5
    ctx.fillStyle = `rgba(255,238,224,${0.2 + rand() * 0.7})`
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  }
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
