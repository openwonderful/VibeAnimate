/**
 * Act B — the stadium, outside and in.
 *
 * The thing the whole flight is aimed at. It stands on the plain past the
 * city as real geometry from the first frame of the act: at 0:05 it is three
 * pixels of light on the horizon, at 0:16 it is a lit ellipse the city is
 * parting to reveal, at 0:18.65 it fills the frame on "I need the WHOLE
 * STADIUM", and at 0:20.31 the camera clears the rim and the bowl opens up.
 * No cut, no portal, no second copy of the arena — one object, approached.
 *
 * Inside, the crowd is 46,000 glow sprites shaped like standing figures.
 * They are drawn in two calls, they jump on the beat, and every one of them
 * is placed from a seeded sequence, so a parallel Remotion render gets the
 * identical crowd in every tab. (This matters: drei's Sparkles/Stars
 * randomise at mount, and that is exactly what made the earlier scenes
 * strobe.)
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { seededRandom } from '../../utils/svgHelpers'
import { buildCloud, makeGlowMaterial, updateGlow, type PointCloud } from './points'
import { GlowPoints } from './GlowPoints'
import { ArirangWall } from './arirangWall'
import { GoldFigure, MEMBERS } from '../act2/Act2_2_B'
import { worldTime, songTime, flightOffset } from './time'
import {
  STADIUM_Z, STADIUM_RX, STADIUM_RIM_Y, BOWL_RX, BOWL_RZ, STAGE_Z,
  T_STADIUM, T_RIM, beatPulse, beatJump, ramp,
} from './flight'

/* ══ The bowl profile ═══════════════════════════════════════════════
 * (f, y) pairs, f being a multiplier on the pitch half-extents. Read down
 * the list and you walk from the touchline up to the top of the outer wall:
 * barrier, lower tier, concourse, upper tier, concourse, top row, rim.
 */
export const PROFILE: [number, number][] = [
  [1.00, 4],
  [1.05, 10],
  [1.42, 58],
  [1.47, 58],
  [1.51, 63],
  [1.86, 133],
  [1.93, 140],
  [2.00, 176],
  [2.08, STADIUM_RIM_Y],
]
/** Which profile spans carry seating (start index → end index). */
export const SEAT_SPANS: [number, number][] = [[1, 2], [4, 5], [6, 7]]

const RX = BOWL_RX
const RZ = BOWL_RZ

function ellipse(f: number, a: number): [number, number] {
  return [Math.cos(a) * RX * f, Math.sin(a) * RZ * f]
}

/** Revolve the profile around the ellipse into a single indexed mesh. */
function bowlGeometry(seg = 132): THREE.BufferGeometry {
  const rows = PROFILE.length
  const pos: number[] = []
  const col: number[] = []
  const idx: number[] = []
  const dark = new THREE.Color('#0B0C16')
  const mid = new THREE.Color('#1A1730')
  const c = new THREE.Color()

  for (let j = 0; j <= seg; j++) {
    const a = (j / seg) * Math.PI * 2
    for (let i = 0; i < rows; i++) {
      const [f, y] = PROFILE[i]
      const [x, z] = ellipse(f, a)
      pos.push(x, y, z)
      c.copy(dark).lerp(mid, i / (rows - 1))
      col.push(c.r, c.g, c.b)
    }
  }
  for (let j = 0; j < seg; j++) {
    for (let i = 0; i < rows - 1; i++) {
      const a0 = j * rows + i
      const a1 = a0 + 1
      const b0 = (j + 1) * rows + i
      const b1 = b0 + 1
      idx.push(a0, b0, a1, a1, b0, b1)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/* ══ Crowd ══════════════════════════════════════════════════════════ */
/**
 * Same glow material, but the sprite is shaped: a narrow vertical capsule
 * with a head on top. At any distance where you can resolve one it reads as
 * a person standing with their arms down, and at the distances where you
 * cannot, it reads as a light — which is what a stadium crowd is.
 *
 * The jump is in the vertex shader: on each beat the whole population lifts,
 * out of phase per-person by their seeded hash, so it swells rather than
 * snapping.
 */
export function makeCrowdMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uScale: { value: 700 },
      uGlobal: { value: 1 },
      uPulse: { value: 0 },
      uMaxPx: { value: 130 },
      uJump: { value: 5.5 },
      uJumpEnv: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute vec3 aColor;
      attribute float aAlpha;
      attribute float aPhase;
      uniform float uTime;
      uniform float uScale;
      uniform float uPulse;
      uniform float uMaxPx;
      uniform float uJump;
      uniform float uJumpEnv;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float hit = uPulse * (0.55 + 0.45 * sin(aPhase * 24.7));
        vec3 p = position;
        // Height comes from uJumpEnv (a raised cosine over the beat), NOT
        // from uPulse. Driving it off the light's envelope — instant rise,
        // exponential fall — made the whole crowd flick vertically once a
        // beat. Two thirds of them jump on any given beat, at their own
        // amplitude, so the stand swells rather than snapping.
        float jumps = step(0.32, fract(aPhase * 13.1));   // 'active' is reserved in GLSL
        p.y += uJumpEnv * jumps * (0.55 + 0.45 * sin(aPhase * 41.3)) * uJump;
        // A slow sway so the crowd is never a still photograph.
        p.x += sin(uTime * 1.7 + aPhase * 39.0) * 0.9;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vColor = aColor;
        vAlpha = aAlpha * (0.82 + 0.18 * sin(uTime * 2.3 + aPhase * 61.0)) * (1.0 + hit * 0.7);
        gl_PointSize = clamp(aSize * uScale / max(1.0, -mv.z), 0.0, uMaxPx);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vAlpha;
      uniform float uGlobal;
      void main() {
        // gl_PointCoord: (0,0) top-left. Put the head at the top.
        vec2 uv = gl_PointCoord - vec2(0.5, 0.5);
        vec2 body = vec2(uv.x * 2.35, max(0.0, abs(uv.y - 0.12) - 0.24));
        float b = pow(max(0.0, 1.0 - length(body) * 2.6), 1.9);
        vec2 hd = vec2(uv.x * 2.6, (uv.y + 0.30) * 2.2);
        float h = pow(max(0.0, 1.0 - length(hd) * 2.9), 1.7);
        // A soft halo so a dense block of them melts into one field of light.
        float halo = pow(max(0.0, 1.0 - length(uv) * 2.0), 3.2) * 0.42;
        float a = (max(b, h) + halo) * vAlpha * uGlobal;
        if (a < 0.003) discard;
        gl_FragColor = vec4(vColor * a, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  })
}

export const CROWD_COLORS = [
  '#FFD79A', '#FFE9C4', '#FFC978', '#FFF3DC', '#FFB85C',
  '#FFE0A8', '#F8EFD8', '#FFCE86',
]
/** A minority of ARMY bombs in concert purple — the palette stays gold,
 *  because gold is what people mean in this film, but a stadium of BTS
 *  fans that has no purple in it is a stadium of strangers. */
const BOMB_COLORS = ['#B98BFF', '#8B4FE0', '#D8B4FF', '#7A5CE0']

/** Sample a point on a seating span, in bowl-local coordinates. */
export function seatSample(rand: () => number): [number, number, number] {
  const span = SEAT_SPANS[Math.floor(rand() * SEAT_SPANS.length)]
  const [f0, y0] = PROFILE[span[0]]
  const [f1, y1] = PROFILE[span[1]]
  const u = rand()
  const f = f0 + (f1 - f0) * u
  const y = y0 + (y1 - y0) * u
  const a = rand() * Math.PI * 2
  const [x, z] = ellipse(f, a)
  return [x, y + 3.5, z]
}

export function Crowd() {
  const tierMat = useMemo(() => makeCrowdMaterial(), [])
  const floorMat = useMemo(() => makeCrowdMaterial(), [])

  const tiers = useMemo<PointCloud>(() => buildCloud(
    34000, 8801, CROWD_COLORS,
    rand => {
      const [x, y, z] = seatSample(rand)
      // Behind the stage the seats are empty — that is where the rig lives.
      if (z > RZ * 1.2 && Math.abs(x) < RX * 1.15) return null
      const bomb = rand() < 0.16
      return [
        x + (rand() - 0.5) * 4, y, z + (rand() - 0.5) * 4,
        bomb ? 5.4 + rand() * 2.4 : 6.4 + rand() * 3.0,
        bomb ? 0.75 + rand() * 0.25 : 0.42 + rand() * 0.4,
      ]
    },
  ), [])

  const bombs = useMemo<PointCloud>(() => {
    // Recolour a slice of the tier cloud's palette by building a second,
    // smaller cloud of pure ARMY-bomb purple sitting slightly higher — held
    // lights, above head height.
    return buildCloud(
      6000, 8802, BOMB_COLORS,
      rand => {
        const [x, y, z] = seatSample(rand)
        if (z > RZ * 1.2 && Math.abs(x) < RX * 1.15) return null
        return [x, y + 5.5 + rand() * 3, z, 3.4 + rand() * 2.2, 0.6 + rand() * 0.4]
      },
    )
  }, [])

  /** Standing room on the pitch, packed toward the stage. */
  const floor = useMemo<PointCloud>(() => buildCloud(
    13000, 8803, CROWD_COLORS,
    rand => {
      const a = rand() * Math.PI * 2
      const r = Math.sqrt(rand())
      const x = Math.cos(a) * r * RX * 0.96
      const z = Math.sin(a) * r * RZ * 0.96
      // Clear of the stage and its thrust.
      if (z > RZ * 0.30 && Math.abs(x) < RX * 0.80) return null
      if (Math.abs(x) < 26 && z > -RZ * 0.55) return null   // the runway
      return [x, 4.5, z, 6.2 + rand() * 3.0, 0.4 + rand() * 0.42]
    },
  ), [])

  useFrame(({ camera, size, gl }) => {
    const t = worldTime()
    // The beat is the record's, not the flight's — see songTime().
    const bt = songTime()
    const px = size.height * gl.getPixelRatio()
    const pulse = beatPulse(bt)
    const jump = beatJump(bt)
    for (const m of [tierMat, floorMat]) {
      updateGlow(m, camera, px, t)
      m.uniforms.uPulse.value = pulse
      m.uniforms.uJumpEnv.value = jump
    }
    // The floor jumps harder than the stands.
    floorMat.uniforms.uJump.value = 6.5
    tierMat.uniforms.uJump.value = 3.6
  })

  return (
    <group position={[0, 0, STADIUM_Z]}>
      <GlowPoints cloud={tiers} material={tierMat} />
      <GlowPoints cloud={bombs} material={tierMat} />
      <GlowPoints cloud={floor} material={floorMat} />
    </group>
  )
}

/* ══ Interior structure ═════════════════════════════════════════════ */
export function Bowl() {
  const geo = useMemo(() => bowlGeometry(), [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.94, metalness: 0.05, side: THREE.DoubleSide,
  }), [])
  const pitchMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#0D1020', roughness: 0.6, metalness: 0.25,
  }), [])

  return (
    <group position={[0, 0, STADIUM_Z]}>
      <mesh geometry={geo} material={mat} />
      {/* Pitch — a unit circle scaled to the bowl's ellipse. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 2, 0]}
        scale={[RX, RZ, 1]} material={pitchMat}>
        <circleGeometry args={[1, 96]} />
      </mesh>
    </group>
  )
}

/* ══ Outer facade ═══════════════════════════════════════════════════ */
/**
 * Vertical fins around the outside, leaning slightly outward, over a solid
 * shell that glows near the top where the bowl's own light escapes. The fins
 * are one InstancedMesh; the light between them is the shell showing
 * through, not 160 separate emissive strips.
 */
export function Facade() {
  const finRef = useRef<THREE.InstancedMesh>(null)
  const COUNT = 168

  const shellMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: '#14101F', roughness: 0.85, metalness: 0.2,
      emissive: new THREE.Color('#6C3FB0'), emissiveIntensity: 0.001,
      side: THREE.DoubleSide,
    })
    // Light bleeds out of the top third of the shell.
    m.onBeforeCompile = shader => {
      shader.vertexShader = 'varying float vShellY;\n' + shader.vertexShader
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vShellY = position.y;')
      shader.fragmentShader = 'varying float vShellY;\nuniform float uArena;\n' + shader.fragmentShader
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
           float band = smoothstep(28.0, ${(STADIUM_RIM_Y + 25).toFixed(1)}, vShellY);
           totalEmissiveRadiance += vec3(0.52, 0.30, 0.88) * band * band * 1.5 * uArena;`,
        )
      shader.uniforms.uArena = { value: 1 }
      m.userData.shader = shader
    }
    m.customProgramCacheKey = () => 'actB-shell'
    return m
  }, [])

  // Not black: the blades stand in front of a lit bowl and pick up its
  // colour, and a facade of pure silhouette against a purple sky reads as a
  // paper cut-out rather than as a building.
  const finMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#241C36', roughness: 0.62, metalness: 0.5,
    emissive: new THREE.Color('#2A1748'), emissiveIntensity: 0.9,
  }), [])

  const shellGeo = useMemo(() => {
    // Outer wall: the profile's last two rows, extended down to the ground.
    const seg = 132
    const pos: number[] = []
    const idx: number[] = []
    for (let j = 0; j <= seg; j++) {
      const a = (j / seg) * Math.PI * 2
      const [x, z] = ellipse(2.08, a)
      pos.push(x, -20, z, x, STADIUM_RIM_Y, z)
    }
    for (let j = 0; j < seg; j++) {
      const a0 = j * 2, a1 = a0 + 1, b0 = (j + 1) * 2, b1 = b0 + 1
      idx.push(a0, b0, a1, a1, b0, b1)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  }, [])

  // Origin at the BASE of the blade, not its middle: a centred unit box
  // scaled to height h sinks half its height into the ground, and the fins
  // ended up as a picket fence round the bottom of a smooth pale wall.
  const finGeo = useMemo(() => {
    const g = new THREE.BoxGeometry(1, 1, 1)
    g.translate(0, 0.5, 0)
    return g
  }, [])

  const fins = useMemo(() => {
    const rand = seededRandom(5150)
    const out: { m: THREE.Matrix4 }[] = []
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    for (let i = 0; i < COUNT; i++) {
      const a = (i / COUNT) * Math.PI * 2
      const [x, z] = ellipse(2.11, a)
      const h = STADIUM_RIM_Y * (0.985 + rand() * 0.03)
      e.set(0, -a, 0)
      q.setFromEuler(e)
      // A fin's local +x is radial and its local +z is tangential (the -a
      // yaw puts them there). So this is 22 units DEEP and 8 units WIDE: a
      // blade standing on edge. Built the other way round — 8 deep, 18 wide,
      // on an 18-unit pitch — they butt into each other and the facade
      // becomes a smooth plastic tub with no light escaping between them.
      m.compose(
        new THREE.Vector3(x, -18, z),
        q,
        new THREE.Vector3(11, h + 26, 7),
      )
      out.push({ m: m.clone() })
    }
    return out
  }, [])

  useFrame(() => {
    const mesh = finRef.current
    if (!mesh || mesh.userData.placed) return
    fins.forEach((f, i) => mesh.setMatrixAt(i, f.m))
    mesh.instanceMatrix.needsUpdate = true
    mesh.userData.placed = true
  })

  return (
    <group position={[0, 0, STADIUM_Z]}>
      <mesh geometry={shellGeo} material={shellMat} />
      <instancedMesh ref={finRef} args={[finGeo, finMat, COUNT]} frustumCulled={false} />

      {/* Marquee: a lit band round the building at concourse height, and the
          dark plinth under it. Between them they give the facade a waist —
          without one it is a featureless wall however well the fins read. */}
      <mesh position={[0, 96, 0]} scale={[RX * 2.10, 1, RZ * 2.10]}>
        <cylinderGeometry args={[1, 1, 15, 132, 1, true]} />
        <meshBasicMaterial color="#7A52C8" toneMapped={false} side={THREE.DoubleSide}
          transparent opacity={0.85} fog={false} />
      </mesh>
      <mesh position={[0, 22, 0]} scale={[RX * 2.13, 1, RZ * 2.13]}>
        <cylinderGeometry args={[1, 1.02, 84, 132, 1, true]} />
        <meshStandardMaterial color="#0A0812" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* Gates. Each is a lit slot in the plinth with people going in. */}
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2 + 0.11
        const [x, z] = ellipse(2.14, a)
        return (
          <mesh key={i} position={[x, 18, z]} rotation={[0, -a + Math.PI / 2, 0]}>
            <planeGeometry args={[46, 34]} />
            <meshBasicMaterial color="#FFC978" toneMapped={false} side={THREE.DoubleSide}
              transparent opacity={0.55} fog={false} />
          </mesh>
        )
      })}

      {/* The rim: a bright lip running all the way round, which is what
          reads at three kilometres as "there is a stadium there". */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, STADIUM_RIM_Y + 2, 0]}
        scale={[RX * 2.08, RZ * 2.08, 1]}>
        <ringGeometry args={[1, 1.045, 132]} />
        <meshBasicMaterial color="#9A78D8" toneMapped={false} side={THREE.DoubleSide} fog={false} />
      </mesh>
    </group>
  )
}

/* ══ Gates, masts and the column of light ═══════════════════════════ */
/**
 * A light shaft: a cone whose alpha dies off toward the far end AND toward
 * the silhouette edge, so it reads as a volume of lit air rather than as the
 * cone-shaped piece of geometry it is. A flat-opacity cone — which is what
 * this was — looks like a plastic party hat from any angle.
 */
function makeBeamMaterial(color: string, strength: number): THREE.ShaderMaterial {
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
        // Brightest at the lamp, gone by the far end.
        float along = pow(max(0.0, vY), 2.2);
        // Grazing the surface = looking through the most air.
        float rim = 1.0 - abs(dot(normalize(vNrm), normalize(vView)));
        // Keep a floor under the rim term: pure edge-on falloff draws the
        // cone's silhouette as two hard wires and nothing in between.
        float a = along * (0.34 + 0.66 * pow(max(0.0, rim), 1.6)) * uAmount;
        gl_FragColor = vec4(uColor * a, a);
      }
    `,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, fog: false,
  })
}

export function StadiumRig() {
  const beamMat = useMemo(() => makeBeamMaterial('#B08CFF', 0.42), [])
  const lampMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#EAF0FF', toneMapped: false, fog: false,
  }), [])
  const mastMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#191527', roughness: 0.6, metalness: 0.7,
  }), [])
  const columnMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uAmount: { value: 1 }, uColor: { value: new THREE.Color('#A374F0') } },
    vertexShader: /* glsl */ `
      varying float vY;
      void main() {
        vY = uv.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vY;
      uniform float uAmount;
      uniform vec3 uColor;
      void main() {
        // max() is not optional: uv.y interpolates a hair past 1.0 on the top
        // edge, pow() of a negative base is NaN, and a single NaN pixel in an
        // additive quad this size gets smeared over the entire frame by the
        // bloom's mipmap chain — the whole shot goes black.
        float a = pow(max(0.0, 1.0 - vY), 2.6) * 0.30 * uAmount;
        gl_FragColor = vec4(uColor * a, a);
      }
    `,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  }), [])

  const masts = useMemo(() => {
    const out: { pos: [number, number, number]; a: number }[] = []
    for (let i = 0; i < 6; i++) {
      // Offset so no mast sits on the approach axis — one dead centre
      // put a black lamp head in the middle of the 0:18.65 frame.
      const a = (i / 6) * Math.PI * 2 + 0.87
      const [x, z] = ellipse(2.16, a)
      out.push({ pos: [x, 0, z], a })
    }
    return out
  }, [])

  const columnRef = useRef<THREE.Mesh>(null)
  const beamGroup = useRef<THREE.Group>(null)

  /** Cone with its apex at the origin, pointing down -Y. Placed at a lamp and
   *  yawed inward, that is a searchlight; built the other way up it is a
   *  traffic cone standing on the roof. */
  const beamGeo = useMemo(() => {
    const g = new THREE.ConeGeometry(96, 640, 20, 1, true)
    g.translate(0, -320, 0)
    return g
  }, [])

  useFrame(() => {
    const t = worldTime()
    const pulse = beatPulse(songTime())
    columnMat.uniforms.uAmount.value =
      (0.4 + ramp(t, 12, T_STADIUM, 0, 1.0)) * (1 + pulse * 0.5)
    if (columnRef.current) columnRef.current.visible = t < T_RIM + 1.2
    beamMat.uniforms.uAmount.value = (0.34 + pulse * 0.22)
    // The shafts only exist once we are close enough for the air between us
    // and the bowl to be worth drawing. From the mountains they were six
    // pale ellipses hanging over the horizon.
    if (beamGroup.current) beamGroup.current.visible = t > 13.5
  })

  return (
    <group position={[0, 0, STADIUM_Z]}>
      {/* The column of light standing over the bowl — the thing you see from
          the city, long before you can see the building. */}
      <mesh ref={columnRef} position={[0, 560, 0]} material={columnMat}>
        <cylinderGeometry args={[STADIUM_RX * 0.92, STADIUM_RX * 0.62, 1120, 40, 1, true]} />
      </mesh>

      {masts.map((m, i) => (
        <group key={i} position={m.pos} rotation={[0, -m.a, 0]}>
          <mesh material={mastMat} position={[0, (STADIUM_RIM_Y + 58) / 2 - 18, 0]}>
            <boxGeometry args={[7, STADIUM_RIM_Y + 58, 7]} />
          </mesh>
          {/* Lamp bank at the top, facing inward (local -x is the bowl). */}
          <group position={[0, STADIUM_RIM_Y + 44, 0]}>
            <mesh material={mastMat}>
              <boxGeometry args={[8, 22, 62]} />
            </mesh>
            {Array.from({ length: 12 }, (_, k) => (
              <mesh key={k} material={lampMat}
                position={[-5.0, (k < 6 ? 5 : -5), (k % 6 - 2.5) * 9.6]}>
                <boxGeometry args={[1.4, 7, 7.4]} />
              </mesh>
            ))}
          </group>
        </group>
      ))}

      {/* Shafts, in their own group so they can be switched as one. */}
      <group ref={beamGroup}>
        {masts.map((m, i) => (
          <group key={i} position={[m.pos[0], STADIUM_RIM_Y + 40, m.pos[2]]}
            rotation={[0, -m.a, -0.95]} position-y={0}>
            <mesh geometry={beamGeo} material={beamMat} />
          </group>
        ))}
      </group>
    </group>
  )
}

/* ══ Approach: car park, gates, the queue ═══════════════════════════ */
export function StadiumApron() {
  const mat = useMemo(() => makeGlowMaterial({ falloff: 2.4, maxPixels: 60, twinkle: 0.2 }), [])
  const peopleMat = useMemo(() => makeCrowdMaterial(), [])

  const lamps = useMemo(() => buildCloud(
    420, 9101, ['#FFD9A0', '#FFE9C8', '#CFE0FF'],
    rand => {
      const a = rand() * Math.PI * 2
      const r = 1.25 + rand() * 1.1
      const [x, z] = ellipse(r, a)
      if (z > 0 && Math.abs(x) < RX) return null
      return [x * 1.9, 24 + rand() * 8, z * 1.9, 8 + rand() * 5, 0.5 + rand() * 0.4]
    },
  ), [])

  /** People streaming toward the gates on the near side. */
  const queue = useMemo(() => buildCloud(
    4200, 9102, CROWD_COLORS,
    rand => {
      const a = -Math.PI / 2 + (rand() - 0.5) * 2.2
      const r = 2.15 + Math.pow(rand(), 0.7) * 2.6
      const [x, z] = ellipse(r, a)
      return [x + (rand() - 0.5) * 90, 3, z + (rand() - 0.5) * 90, 5.5 + rand() * 2.5, 0.3 + rand() * 0.4]
    },
  ), [])

  useFrame(({ camera, size, gl }) => {
    const t = worldTime()
    const px = size.height * gl.getPixelRatio()
    updateGlow(mat, camera, px, t)
    updateGlow(peopleMat, camera, px, t)
    peopleMat.uniforms.uPulse.value = beatPulse(songTime()) * 0.5
    // Held back until the city starts to open up: from the mountains this
    // was a bright dotted line on the horizon five kilometres away, which is
    // both wrong and the first thing your eye went to. Nobody outside once we
    // are over the rim either — that saves the draw and stops stray glows
    // leaking through the stands from behind.
    const out = ramp(t, 9.5, 13.5, 0, 1) * (1 - ramp(t, T_RIM, T_RIM + 1, 0, 1))
    mat.uniforms.uGlobal.value = out
    peopleMat.uniforms.uGlobal.value = out
  })

  return (
    <group position={[0, 0, STADIUM_Z]}>
      <GlowPoints cloud={lamps} material={mat} />
      <GlowPoints cloud={queue} material={peopleMat} />
    </group>
  )
}

/* ══ The stage ══════════════════════════════════════════════════════ */
/* ══ The seven ══════════════════════════════════════════════════════ */
/**
 * Act 2.2's members, not lookalikes. `GoldFigure` is imported straight from
 * that scene, so these are the same skeleton, the same seven poses, the same
 * bias colours and the same entrance-and-groove behaviour that the stage we
 * hand over to is running — scaled up to this bowl and driven off the flight
 * clock. The capsule figures this replaced were, in the user's words, not
 * good: five primitives in a coat of paint standing where seven dancers go.
 *
 * GoldFigure keys its reveal off the host scene's LOCAL clock, so the offset
 * is converted: startOffset = MEMBER_T0 - flightOffset() puts member i on
 * screen at world time MEMBER_T0 + i * MEMBER_STAGGER whichever window
 * (B, B.4, B.5) is being rendered.
 */
const MEMBER_T0 = 21.9
const MEMBER_STAGGER = 0.42
/** Entrance beats: 0…MEMBER_LAST, so the unison crossfade knows when the
 *  line-up is complete. Four now, not seven — see MEMBER_ORDER. */
const MEMBER_LAST = 3
/** 2.2 authors its members about 1.7 units tall; this bowl needs them ~30. */
const MEMBER_SCALE = 17
/**
 * 2.2's line-up is a shallow V with the centre CLOSEST to camera, and its
 * per-member scales are a perspective cheat for a lens two metres away. From
 * three hundred units those scales just read as seven people of different
 * heights, with Jin visibly the shortest. So: everyone the same size, and
 * the z spread multiplied out until real perspective does the job — the
 * middle unit is nearest and therefore largest, which is the arrangement
 * 2.2 is drawing.
 */
// Negative: the stage faces -Z, so the member closest to the camera is the
// one with the SMALLEST z. 2.2 puts the centre at its largest z, which in
// this bowl put the middle unit at the BACK and the wings at the front —
// exactly inside out.
// Depth spread in 2.2 units; x17 by the group scale, so 1.25 puts the
// centre ~21 units forward of the wings — a readable V that still keeps
// every one of them on a deck that is only 96 units deep.
const MEMBER_DEPTH = -1.25
const MEMBER_UNIFORM_SCALE = 0.88

/**
 * Act B's own colour for one member. Read left-to-right on screen — the
 * camera looks down +z, so world +x is screen LEFT — the order is Suga,
 * Jimin, V, Jungkook, RM, J-Hope, Jin, and the second one along was Jimin's
 * #FFE066: a yellow sitting two places from Jungkook's yellow, which reads
 * as the same colour twice. Overridden here rather than in `MEMBERS`, so
 * Act 2.2-B keeps its own palette.
 */
const MEMBER_COLOR_OVERRIDE: Record<string, string> = {
  Jimin: '#7BE838',
}

/**
 * The line-up arrives OUTSIDE IN, two at a time, and the centre lands alone.
 *
 * 2.2's own order is a single file down the row by seniority — Jin, Suga,
 * J-Hope, RM, Jimin, V, Jungkook — which is right for the scene it was built
 * for, where the camera is two metres away and each arrival is an event. From
 * three hundred units up in the bowl it is seven small lights coming on in a
 * scattered sequence, and it takes 3.4 seconds to say one thing.
 *
 * Symmetrical pairs say it in four beats instead of seven and read as a shape
 * from any distance: the two wings, then the two next in, then the two
 * flanking, then the middle. The line assembles rather than fills in.
 *
 * Paired by |x| — Jin/Suga at ±5.1, J-Hope/Jimin at ±3.6, RM/V at ±1.9,
 * Jungkook alone on the axis. Overridden here rather than in `MEMBERS` for
 * the same reason the colours are: Act 2.2-B keeps its own entrance.
 */
const MEMBER_ORDER: Record<string, number> = {
  Jin: 0, Suga: 0,
  'J-Hope': 1, Jimin: 1,
  RM: 2, V: 2,
  Jungkook: 3,
}

export function StageMembers() {
  const offset = flightOffset()
  return (
    <group position={[0, 16, STAGE_Z - 12]} scale={MEMBER_SCALE}>
      {MEMBERS.map((m, i) => (
        <GoldFigure
          key={i}
          member={{
            ...m,
            color: MEMBER_COLOR_OVERRIDE[m.name] ?? m.color,
            staggerIndex: MEMBER_ORDER[m.name] ?? m.staggerIndex,
            z: m.z * MEMBER_DEPTH,
            scale: MEMBER_UNIFORM_SCALE,
          }}
          poseIndex={i}
          startOffset={MEMBER_T0 - offset}
          revealPreroll={0}
          revealStagger={MEMBER_STAGGER}
          lastStaggerIndex={MEMBER_LAST}
          songOffset={offset}
        />
      ))}
    </group>
  )
}

/**
 * At the far end of the bowl, facing back at the camera: deck, thrust,
 * runway, an LED wall and a truss of moving lights. Kept deliberately
 * simple — Act 2.2 is the scene that actually lives on this stage, and this
 * is the wide shot that hands over to it.
 */
export function Stage() {
  const deckMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#15121F', roughness: 0.42, metalness: 0.5,
  }), [])
  const trussMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#22202C', roughness: 0.5, metalness: 0.8,
  }), [])

  const beamMat = useMemo(() => makeBeamMaterial('#DCBFFF', 0.5), [])
  const beamGeo = useMemo(() => {
    const g = new THREE.ConeGeometry(30, 300, 16, 1, true)
    g.translate(0, -150, 0)   // apex at the lamp
    return g
  }, [])
  const beamGroup = useRef<THREE.Group>(null)

  useFrame(() => {
    const t = worldTime()
    const pulse = beatPulse(songTime())
    if (beamGroup.current) {
      // Heads sweep out over the crowd. X tilts the shaft off vertical toward
      // -z (the audience); Z fans it left and right. Both stay small — these
      // used to be rotated a full 90° and lay across the frame as fat white
      // ellipses pointing at nothing.
      beamGroup.current.children.forEach((c, i) => {
        c.rotation.x = 0.62 + Math.sin(t * 0.55 + i) * 0.14
        c.rotation.z = Math.sin(t * 0.8 + i * 1.1) * 0.30
      })
    }
    beamMat.uniforms.uAmount.value = 0.42 + pulse * 0.3
  })

  return (
    <group position={[0, 0, STAGE_Z]}>
      {/* Deck + thrust + runway back toward the crowd */}
      <mesh material={deckMat} position={[0, 8, 0]}>
        <boxGeometry args={[330, 16, 96]} />
      </mesh>
      <mesh material={deckMat} position={[0, 7, -74]}>
        <boxGeometry args={[150, 14, 60]} />
      </mesh>
      <mesh material={deckMat} position={[0, 6, -190]}>
        <boxGeometry args={[46, 12, 180]} />
      </mesh>
      {/* LED wall — 아리랑, as its own module (see arirangWall.tsx). */}
      <group position={[0, 74, 46]} rotation={[0, Math.PI, 0]}>
        <ArirangWall width={380} height={122} />
      </group>
      {/* Truss */}
      <mesh material={trussMat} position={[0, 146, 10]}>
        <boxGeometry args={[400, 9, 9]} />
      </mesh>
      {[-1, 1].map(s => (
        <mesh key={s} material={trussMat} position={[s * 196, 74, 10]}>
          <boxGeometry args={[9, 148, 9]} />
        </mesh>
      ))}
      {/* Moving heads. Each child is one shaft hung off the truss; the group
          holds them so the sweep can be driven per-child in one place. */}
      <group ref={beamGroup} position={[0, 142, 10]}>
        {Array.from({ length: 7 }, (_, i) => (
          <mesh key={i} geometry={beamGeo} material={beamMat}
            position={[(i - 3) * 56, 0, 0]} />
        ))}
      </group>

      {/* Front-of-stage wash: the deck has to be lit by something, and a
          strip light along its lip does it for one draw call. */}
      <mesh position={[0, 17, -48]}>
        <boxGeometry args={[326, 1.6, 2]} />
        <meshBasicMaterial color="#E0B074" toneMapped={false} fog={false} />
      </mesh>
    </group>
  )
}
