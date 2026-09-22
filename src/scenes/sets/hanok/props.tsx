/**
 * Hanok set dressing — the furniture, tableware and hanging goods that make
 * the room read as lived in. Every piece is positioned by its caller, so a
 * scene picks only what that beat needs.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { getAnimTime } from '../../../hooks/useAnimTime'
import {
  type V3, rand,
  LAMP_WARM, LAMP_CORE, PAPER_PANEL, WOOD_DARK, WOOD_MID, WOOD_WARM,
  CLAY, CLAY_DARK, BRASS, RICE, PERSIMMON,
  TABLE_TOP, TABLE_W, TABLE_D,
} from './palette'

export function Bowl({
  position, r = 0.075, h = 0.055, fill = RICE, glow = 0.25, clay = CLAY,
}: {
  position: V3; r?: number; h?: number; fill?: string; glow?: number; clay?: string
}) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[r, r * 0.62, h, 20]} />
        <meshStandardMaterial color={clay} roughness={0.55} metalness={0.05} />
      </mesh>
      {/* Rim highlight — a thin torus catches the lamp and gives the bowl an edge. */}
      <mesh position={[0, h / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[r, 0.006, 6, 24]} />
        <meshStandardMaterial color={clay} roughness={0.35} metalness={0.2} />
      </mesh>
      {/* Contents, mounded slightly proud of the rim. */}
      <mesh position={[0, h / 2 - 0.004, 0]} scale={[1, 0.45, 1]}>
        <sphereGeometry args={[r * 0.92, 16, 12]} />
        <meshStandardMaterial color={fill} emissive={fill} emissiveIntensity={glow} roughness={0.75} />
      </mesh>
    </group>
  )
}

export function Dish({ position, r, fill }: { position: V3; r: number; fill: string }) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[r, r * 0.8, 0.022, 16]} />
        <meshStandardMaterial color="#D8C9A8" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.014, 0]} scale={[1, 0.5, 1]}>
        <sphereGeometry args={[r * 0.78, 12, 8]} />
        <meshStandardMaterial color={fill} emissive={fill} emissiveIntensity={0.18} roughness={0.7} />
      </mesh>
    </group>
  )
}

/** Chopsticks + spoon, laid parallel at a place setting. */
export function Utensils({ position, flip = false }: { position: V3; flip?: boolean }) {
  const s = flip ? -1 : 1
  return (
    <group position={position} rotation={[0, flip ? Math.PI : 0, 0]}>
      {[-0.018, 0.018].map((z, i) => (
        <mesh key={i} position={[0, 0.006, z]} rotation={[0, 0.06 * s, 0]} castShadow>
          <boxGeometry args={[0.19, 0.007, 0.007]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 0.006, 0.055]} castShadow>
        <boxGeometry args={[0.15, 0.006, 0.014]} />
        <meshStandardMaterial color={BRASS} roughness={0.3} metalness={0.75} />
      </mesh>
      <mesh position={[0.09, 0.008, 0.055]} scale={[1.6, 0.35, 1]} castShadow>
        <sphereGeometry args={[0.022, 12, 8]} />
        <meshStandardMaterial color={BRASS} roughness={0.3} metalness={0.75} />
      </mesh>
    </group>
  )
}

/** The stew pot at the centre — dark clay, glowing at the mouth. */
export function StewPot({ position }: { position: V3 }) {
  return (
    <group position={position}>
      {/* Trivet */}
      <mesh position={[0, 0.008, 0]} receiveShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.016, 20]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.075, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.13, 0.10, 0.12, 22]} />
        <meshStandardMaterial color={CLAY_DARK} roughness={0.85} />
      </mesh>
      {/* Lip */}
      <mesh position={[0, 0.137, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.132, 0.012, 8, 26]} />
        <meshStandardMaterial color={CLAY} roughness={0.6} />
      </mesh>
      {/* Broth surface — the hottest thing in the room. */}
      <mesh position={[0, 0.132, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.126, 24]} />
        <meshStandardMaterial
          color="#E8752A" emissive="#D2520F" emissiveIntensity={1.6} roughness={0.35}
        />
      </mesh>
      {/* Handles */}
      {[-1, 1].map(s => (
        <mesh key={s} position={[s * 0.145, 0.11, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.014, 0.014, 0.05, 8]} />
          <meshStandardMaterial color={CLAY_DARK} roughness={0.85} />
        </mesh>
      ))}
      <pointLight position={[0, 0.22, 0]} color="#FF8A3C" intensity={0.9} distance={1.4} decay={2} />
    </group>
  )
}

export function BrassKettle({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.072, 18, 14]} />
        <meshStandardMaterial color={BRASS} roughness={0.28} metalness={0.85} />
      </mesh>
      <mesh position={[0, 0.125, 0]} castShadow>
        <cylinderGeometry args={[0.026, 0.034, 0.03, 12]} />
        <meshStandardMaterial color={BRASS} roughness={0.28} metalness={0.85} />
      </mesh>
      <mesh position={[0.075, 0.09, 0]} rotation={[0, 0, -0.7]} castShadow>
        <cylinderGeometry args={[0.011, 0.017, 0.1, 8]} />
        <meshStandardMaterial color={BRASS} roughness={0.28} metalness={0.85} />
      </mesh>
      <mesh position={[0, 0.155, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.05, 0.008, 6, 18, Math.PI]} />
        <meshStandardMaterial color={BRASS} roughness={0.28} metalness={0.85} />
      </mesh>
    </group>
  )
}

export function Soban() {
  return (
    <group>
      {/* Top board */}
      <mesh position={[0, TABLE_TOP - 0.022, 0]} castShadow receiveShadow>
        <boxGeometry args={[TABLE_W, 0.044, TABLE_D]} />
        <meshStandardMaterial color={WOOD_WARM} roughness={0.45} metalness={0.05} />
      </mesh>
      {/* Raised lip all round — the detail that makes it a soban, not a box. */}
      {([
        [0, TABLE_TOP + 0.008, TABLE_D / 2 - 0.012, TABLE_W, 0.02],
        [0, TABLE_TOP + 0.008, -TABLE_D / 2 + 0.012, TABLE_W, 0.02],
      ] as const).map(([px, py, pz, w, d], i) => (
        <mesh key={`lipz-${i}`} position={[px, py, pz]} castShadow>
          <boxGeometry args={[w, 0.016, d]} />
          <meshStandardMaterial color={WOOD_MID} roughness={0.5} />
        </mesh>
      ))}
      {[-1, 1].map(s => (
        <mesh key={`lipx-${s}`} position={[s * (TABLE_W / 2 - 0.012), TABLE_TOP + 0.008, 0]} castShadow>
          <boxGeometry args={[0.02, 0.016, TABLE_D]} />
          <meshStandardMaterial color={WOOD_MID} roughness={0.5} />
        </mesh>
      ))}
      {/* Apron */}
      <mesh position={[0, TABLE_TOP - 0.075, 0]}>
        <boxGeometry args={[TABLE_W - 0.09, 0.06, TABLE_D - 0.09]} />
        <meshStandardMaterial color={WOOD_MID} roughness={0.7} />
      </mesh>
      {/* Splayed legs */}
      {([[-1, -1], [1, -1], [-1, 1], [1, 1]] as const).map(([sx, sz], i) => (
        <mesh
          key={`leg-${i}`}
          position={[sx * (TABLE_W / 2 - 0.11), (TABLE_TOP - 0.1) / 2, sz * (TABLE_D / 2 - 0.1)]}
          rotation={[sz * 0.11, 0, -sx * 0.11]}
          castShadow
        >
          <cylinderGeometry args={[0.019, 0.026, TABLE_TOP - 0.1, 8]} />
          <meshStandardMaterial color={WOOD_MID} roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}


/** A hanji panel with its wooden lattice — the hanok's signature surface. */
export function PaperPanel({
  position, rotation = [0, 0, 0], width, height, cols = 3, rows = 5,
  color = PAPER_PANEL, emissive = 0.16,
}: {
  position: V3; rotation?: V3; width: number; height: number
  cols?: number; rows?: number; color?: string; emissive?: number
}) {
  const rib = 0.016
  return (
    <group position={position} rotation={rotation}>
      <mesh receiveShadow>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          color={color} emissive={LAMP_WARM} emissiveIntensity={emissive}
          roughness={1} side={THREE.DoubleSide}
        />
      </mesh>
      {/* Frame */}
      {([[0, height / 2 - rib, width, rib * 2], [0, -height / 2 + rib, width, rib * 2]] as const).map(
        ([px, py, w, h], i) => (
          <mesh key={`f${i}`} position={[px, py, 0.006]}>
            <boxGeometry args={[w, h, 0.012]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.85} />
          </mesh>
        ),
      )}
      {[-1, 1].map(s => (
        <mesh key={`fv${s}`} position={[s * (width / 2 - rib), 0, 0.006]}>
          <boxGeometry args={[rib * 2, height, 0.012]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.85} />
        </mesh>
      ))}
      {/* Lattice */}
      {Array.from({ length: cols }, (_, i) => {
        const x = -width / 2 + (width * (i + 1)) / (cols + 1)
        return (
          <mesh key={`c${i}`} position={[x, 0, 0.005]}>
            <boxGeometry args={[0.011, height - rib * 2, 0.01]} />
            <meshStandardMaterial color={WOOD_MID} roughness={0.85} />
          </mesh>
        )
      })}
      {Array.from({ length: rows }, (_, i) => {
        const y = -height / 2 + (height * (i + 1)) / (rows + 1)
        return (
          <mesh key={`r${i}`} position={[0, y, 0.005]}>
            <boxGeometry args={[width - rib * 2, 0.011, 0.01]} />
            <meshStandardMaterial color={WOOD_MID} roughness={0.85} />
          </mesh>
        )
      })}
    </group>
  )
}


/** Korean chest against the left wall, blankets folded on top. */
export function Bandaji({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.42, 0.44, 0.86]} />
        <meshStandardMaterial color={WOOD_MID} roughness={0.6} />
      </mesh>
      {/* Front face panel + brass fittings */}
      <mesh position={[0.215, 0.22, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.78, 0.36]} />
        <meshStandardMaterial color={WOOD_WARM} roughness={0.5} />
      </mesh>
      {[-0.26, 0, 0.26].map((z, i) => (
        <mesh key={i} position={[0.222, 0.24, z]} rotation={[0, Math.PI / 2, 0]}>
          <circleGeometry args={[0.035, 14]} />
          <meshStandardMaterial color={BRASS} roughness={0.25} metalness={0.85} />
        </mesh>
      ))}
      {/* Folded blankets */}
      {[0, 1, 2].map(i => (
        <mesh key={`b${i}`} position={[0.01, 0.46 + i * 0.075, -0.05 + i * 0.015]} castShadow>
          <boxGeometry args={[0.38, 0.07, 0.6]} />
          <meshStandardMaterial
            color={['#7A4C3A', '#8A6A44', '#6A4438'][i]}
            roughness={0.95}
          />
        </mesh>
      ))}
    </group>
  )
}

/** Onggi jars on a low shelf, right wall. */
export function JarShelf({ position }: { position: V3 }) {
  const jars: { x: number; r: number; h: number }[] = [
    { x: -0.28, r: 0.085, h: 0.20 },
    { x: -0.04, r: 0.11, h: 0.26 },
    { x: 0.24, r: 0.07, h: 0.16 },
  ]
  return (
    <group position={position}>
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.82, 0.05, 0.3]} />
        <meshStandardMaterial color={WOOD_MID} roughness={0.7} />
      </mesh>
      {[-0.35, 0.35].map(x => (
        <mesh key={x} position={[x, -0.16, 0]} castShadow>
          <boxGeometry args={[0.05, 0.32, 0.26]} />
          <meshStandardMaterial color={WOOD_MID} roughness={0.7} />
        </mesh>
      ))}
      {jars.map((j, i) => (
        <group key={i} position={[j.x, 0.03 + j.h / 2, 0]}>
          <mesh castShadow scale={[1, j.h / (j.r * 2), 1]}>
            <sphereGeometry args={[j.r, 16, 12]} />
            <meshStandardMaterial color="#4A3222" roughness={0.45} metalness={0.1} />
          </mesh>
          <mesh position={[0, j.h / 2 - 0.005, 0]} castShadow>
            <cylinderGeometry args={[j.r * 0.5, j.r * 0.62, 0.035, 14]} />
            <meshStandardMaterial color="#3A2718" roughness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Strings of drying persimmons hanging from a beam. */
export function DryingPersimmons({ position, strings = 3 }: { position: V3; strings?: number }) {
  const rows = useMemo(() => {
    const r = rand(97)
    return Array.from({ length: strings }, (_, i) => ({
      x: (i - (strings - 1) / 2) * 0.13,
      z: (r() - 0.5) * 0.08,
      n: 4 + Math.floor(r() * 3),
      phase: r() * Math.PI * 2,
      len: 0.42 + r() * 0.16,
    }))
  }, [strings])

  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!ref.current) return
    const t = getAnimTime()
    ref.current.rotation.z = Math.sin(t * 0.5) * 0.012
  })

  return (
    <group ref={ref} position={position}>
      {rows.map((row, i) => (
        <group key={i} position={[row.x, 0, row.z]}>
          <mesh position={[0, -row.len / 2, 0]}>
            <cylinderGeometry args={[0.004, 0.004, row.len, 5]} />
            <meshStandardMaterial color="#6A5030" roughness={1} />
          </mesh>
          {Array.from({ length: row.n }, (_, k) => {
            const y = -0.09 - (k * (row.len - 0.12)) / row.n
            return (
              <mesh key={k} position={[0, y, 0]} scale={[1, 0.82, 1]} castShadow>
                <sphereGeometry args={[0.043, 12, 10]} />
                <meshStandardMaterial
                  color={PERSIMMON} emissive="#7A2A08" emissiveIntensity={0.35} roughness={0.75}
                />
              </mesh>
            )
          })}
        </group>
      ))}
    </group>
  )
}

/**
 * Small brass oil lamp on the chest. Its whole job is to put a second warm
 * accent into the left third of the frame, which was reading as dead space.
 */
export function OilLamp({ position }: { position: V3 }) {
  const flameRef = useRef<THREE.Mesh>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  useFrame(() => {
    const t = getAnimTime()
    const f = 1 + Math.sin(t * 5.3) * 0.10 + Math.sin(t * 11.7 + 2.1) * 0.06
    if (lightRef.current) lightRef.current.intensity = 0.85 * f
    if (flameRef.current) flameRef.current.scale.set(1, 0.85 + 0.3 * f, 1)
  })
  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.05, 0.065, 0.03, 14]} />
        <meshStandardMaterial color={BRASS} roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh position={[0, 0.045, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.02, 0.06, 10]} />
        <meshStandardMaterial color={BRASS} roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh ref={flameRef} position={[0, 0.10, 0]} scale={[1, 1.1, 1]}>
        <sphereGeometry args={[0.024, 10, 8]} />
        <meshBasicMaterial color={LAMP_CORE} transparent opacity={0.8} />
      </mesh>
      <pointLight ref={lightRef} position={[0, 0.11, 0]} color="#FFA641" intensity={0.85} distance={1.9} decay={2} />
    </group>
  )
}

/** Braid of dried peppers and garlic on a peg — colour on a bare wall. */
export function PepperBraid({ position }: { position: V3; }) {
  const pods = useMemo(() => {
    const r = rand(311)
    return Array.from({ length: 22 }, (_, i) => ({
      y: -0.06 - (i % 11) * 0.048,
      a: r() * Math.PI * 2,
      tilt: (r() - 0.5) * 0.9,
      len: 0.06 + r() * 0.04,
      garlic: i % 7 === 3,
    }))
  }, [])
  return (
    <group position={position}>
      <mesh position={[0, -0.28, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.58, 5]} />
        <meshStandardMaterial color="#5A4630" roughness={1} />
      </mesh>
      {pods.map((pod, i) => (
        <mesh
          key={i}
          position={[Math.cos(pod.a) * 0.035, pod.y, Math.sin(pod.a) * 0.03]}
          rotation={[pod.tilt, pod.a, 0.3]}
          scale={pod.garlic ? [1.5, 1, 1.5] : [1, pod.len / 0.03, 1]}
          castShadow
        >
          <sphereGeometry args={[0.019, 8, 6]} />
          <meshStandardMaterial
            color={pod.garlic ? '#D8C9A8' : '#9E2411'}
            emissive={pod.garlic ? '#7A6A48' : '#4A0E06'}
            emissiveIntensity={0.3}
            roughness={0.7}
          />
        </mesh>
      ))}
    </group>
  )
}

/** The hanging paper lantern — the scene's key light, and its brightest object. */
export function Lantern({ position, scale = 1 }: { position: V3; scale?: number }) {
  const lightRef = useRef<THREE.PointLight>(null)
  const spotRef = useRef<THREE.SpotLight>(null)
  const coreRef = useRef<THREE.MeshBasicMaterial>(null)
  const groupRef = useRef<THREE.Group>(null)

  useFrame(() => {
    const t = getAnimTime()
    // Layered sines — a flame never flickers on one frequency.
    const f = 1
      + Math.sin(t * 3.1) * 0.055
      + Math.sin(t * 6.7 + 1.3) * 0.03
      + Math.sin(t * 12.9 + 0.4) * 0.018
    if (lightRef.current) lightRef.current.intensity = 1.5 * f * scale
    if (spotRef.current) spotRef.current.intensity = 7.5 * f * scale
    if (coreRef.current) coreRef.current.opacity = 0.55 * f
    if (groupRef.current) groupRef.current.rotation.z = Math.sin(t * 0.42) * 0.014
  })

  return (
    <group position={position}>
      {/* Cord up to the beam */}
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.84, 5]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={1} />
      </mesh>
      <group ref={groupRef}>
        {/* Paper shade */}
        <mesh>
          <cylinderGeometry args={[0.13, 0.15, 0.24, 20, 1, true]} />
          <meshStandardMaterial
            color="#C99A5E" emissive={LAMP_WARM} emissiveIntensity={0.42}
            roughness={1} side={THREE.DoubleSide}
          />
        </mesh>
        {/* Ribs */}
        {[-0.09, 0, 0.09].map((y, i) => (
          <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.142, 0.005, 5, 20]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
          </mesh>
        ))}
        {/* Flame core */}
        {/* Flame core, tucked up inside the open-bottomed shade so it is only
            ever seen as a glow, never as a bare white disc. */}
        <mesh position={[0, -0.01, 0]}>
          <sphereGeometry args={[0.042, 12, 10]} />
          <meshBasicMaterial ref={coreRef} color={LAMP_CORE} transparent opacity={0.55} />
        </mesh>
        <mesh position={[0, 0.13, 0]}>
          <cylinderGeometry args={[0.135, 0.135, 0.012, 20]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
        </mesh>
      </group>

      {/* Key light down onto the table */}
      <spotLight
        ref={spotRef}
        position={[0, 0.02, 0]}
        target-position={[0, 0, 0.45]}
        color={LAMP_WARM}
        intensity={7.5}
        angle={1.15}
        penumbra={1}
        distance={7}
        decay={1.7}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0009}
      />
      {/* Omni bleed so the walls near the lamp are not pure black */}
      <pointLight ref={lightRef} color={LAMP_WARM} intensity={1.5} distance={4.2} decay={2.0} />
    </group>
  )
}


/**
 * A floor bedroll: thin mattress, folded blanket over the lower half, and a
 * buckwheat pillow. Act 4 lies somebody on this twice — once each way round.
 */
/** Height of the mattress top above the floor — where a body lies. */
export const FUTON_TOP = 0.048
/** Height of the top of the pillow above the mattress. */
export const FUTON_PILLOW = 0.09
/** Pillow centre, measured in from the head end of the mattress. */
export const FUTON_PILLOW_INSET = 0.19

/**
 * A floor mattress (요), optionally made up with a quilt over the lower half.
 *
 * `covers` is only ever safe on an *empty* bed. Over a body the quilt has to
 * be sculpted — a slab for the cover, a capsule for the shape underneath, a
 * wedge for the turned-down hem — and at any normal camera distance none of
 * that reads as cloth. It reads as a box with a pill on it, and whoever is in
 * the bed is reduced to a head resting on a lie. Both sickbed beats pass
 * `covers={false}` and put a real lying figure on the mattress instead.
 */
export function Futon({
  position, facing = 0, blanket = '#7A5240', covers = true,
  length = 1.9, width = 0.72,
}: {
  position: V3; facing?: number; blanket?: string
  covers?: boolean; length?: number; width?: number
}) {
  return (
    <group position={position} rotation={[0, facing, 0]}>
      {/* The mattress proper. Rounded, not a box: a hard-edged rectangular
          prism this size under a low lamp is a plank, and the person on it is
          laid out on furniture. The chamfer catches the lamp as a soft roll
          along the edge instead of a single hot line. */}
      {/* Undersheet, spilling a hand's width past the pad onto the boards. It
          does one job: without it the mattress is an object *standing on* the
          floor with a shadow under it, which is the silhouette of a low table.
          A soft edge running out onto the boards is the silhouette of bedding. */}
      <mesh position={[0, 0.004, 0]} receiveShadow>
        <boxGeometry args={[width + 0.13, 0.008, length + 0.15]} />
        <meshStandardMaterial color="#3B2A18" roughness={1} />
      </mesh>
      <RoundedBox
        args={[width, FUTON_TOP, length]}
        radius={FUTON_TOP * 0.44}
        smoothness={3}
        position={[0, FUTON_TOP / 2, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#4E3620" roughness={1} />
      </RoundedBox>
      {/* Sheet, inset so a strip of mattress shows as a border all round. That
          border is what makes the bed read as bedding: it gives the eye two
          parallel edges instead of one. It has to stay *dark* — a big pale
          upward-facing plane under this lamp turns straight back into a table. */}
      <RoundedBox
        args={[width - 0.10, 0.022, length - 0.13]}
        radius={0.010}
        smoothness={2}
        position={[0, FUTON_TOP - 0.002, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#6B5430" roughness={1} />
      </RoundedBox>

      {covers && (
        <>
          <mesh position={[0, FUTON_TOP + 0.035, -length * 0.18]} castShadow receiveShadow>
            <boxGeometry args={[width + 0.06, 0.10, length * 0.66]} />
            <meshStandardMaterial color={blanket} roughness={0.98} />
          </mesh>
          <mesh position={[0, FUTON_TOP + 0.085, length * 0.14]} rotation={[0.14, 0, 0]} castShadow>
            <boxGeometry args={[width + 0.06, 0.035, 0.22]} />
            <meshStandardMaterial color="#A88A62" roughness={0.95} />
          </mesh>
        </>
      )}

      {/* Pillow — wider and deeper than the head that lands on it, or it just
          disappears under the sleeper and the head reads as resting on nothing.
          (It used to be an un-rotated cylinder: a post standing up through the
          skull, invisible only because a quilt was parked on top of it.) */}
      <RoundedBox
        args={[width * 0.74, FUTON_PILLOW, 0.34]}
        radius={FUTON_PILLOW * 0.42}
        smoothness={3}
        position={[0, FUTON_TOP + FUTON_PILLOW / 2, length * 0.5 - FUTON_PILLOW_INSET]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#A08A62" roughness={0.94} />
      </RoundedBox>
    </group>
  )
}

/**
 * A glass thermometer. Small, but the one prop in the room that says *illness*
 * rather than *rest* — a bowl and a bed alone are just supper and a nap.
 *
 * It lies on its side; local +z runs from the bulb toward the stem end.
 */
export function Thermometer({
  position, rotation = [0, 0, 0], len = 0.15,
}: { position: V3; rotation?: V3; len?: number }) {
  const r = 0.0085
  return (
    <group position={position} rotation={rotation}>
      {/* Stem — glass, so it takes the lamp as a hard specular line. */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[r, r, len, 10]} />
        <meshStandardMaterial
          color="#EDE6D4" emissive="#8E7A50" emissiveIntensity={0.25}
          roughness={0.18} metalness={0.1}
        />
      </mesh>
      {/* The mercury column, run up two-thirds of the stem: a fever, read at a
          glance. Proud of the glass by a hair so it is not z-fighting inside. */}
      <mesh position={[0, r * 0.55, -len * 0.14]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[r * 0.34, r * 0.34, len * 0.52, 8]} />
        <meshStandardMaterial color="#FF5A2A" emissive="#FF3A12" emissiveIntensity={1.6} />
      </mesh>
      {/* Bulb. */}
      <mesh position={[0, 0, -len / 2]} castShadow>
        <sphereGeometry args={[r * 1.5, 12, 10]} />
        <meshStandardMaterial color="#FF5A2A" emissive="#FF3A12" emissiveIntensity={2.0} />
      </mesh>
    </group>
  )
}
