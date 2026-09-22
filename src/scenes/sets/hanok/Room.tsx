/**
 * The hanok room shell: boards, plastered walls, sliding paper panels, the
 * open panel onto the night, ceiling beams. Lighting and dressing are separate
 * so a scene can relight the same room for a different hour of the day.
 */
import { useMemo } from 'react'
import * as THREE from 'three'
import { PaperPanel, Bandaji, JarShelf, DryingPersimmons, OilLamp, PepperBraid, Lantern } from './props'
import {
  rand, ROOM_W, ROOM_BACK, ROOM_FRONT, ROOM_H,
  PAPER_WALL, WOOD_DARK, WOOD_MID, WOOD_WARM, FLOOR_WOOD, MOON_COOL,
  type V3,
} from './palette'

export function Floor() {
  const planks = useMemo(() => {
    const out: { x: number; w: number }[] = []
    const r = rand(31)
    let x = -ROOM_W / 2
    while (x < ROOM_W / 2) {
      const w = 0.26 + r() * 0.12
      out.push({ x: x + w / 2, w })
      x += w
    }
    return out
  }, [])

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_FRONT - ROOM_BACK]} />
        <meshStandardMaterial color={FLOOR_WOOD} roughness={0.42} metalness={0.08} />
      </mesh>
      {/* Plank seams — the floor was the flattest surface in the frame. */}
      {planks.map((p, i) => (
        <mesh key={i} position={[p.x + p.w / 2, 0.002, (ROOM_FRONT + ROOM_BACK) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.012, ROOM_FRONT - ROOM_BACK]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}


export function Walls() {
  const plaster = useMemo(() => new THREE.MeshStandardMaterial({
    color: PAPER_WALL, roughness: 1, side: THREE.DoubleSide,
  }), [])

  return (
    <group>
      {/* Back wall — plaster ground, with paper panels sitting on top of it. */}
      <mesh position={[0, ROOM_H / 2, ROOM_BACK]} material={plaster} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
      </mesh>

      {/* Three sliding panels. The right one is slid open onto the night. */}
      <PaperPanel position={[-1.10, 0.86, ROOM_BACK + 0.03]} width={0.92} height={1.42} />
      <PaperPanel position={[-0.13, 0.86, ROOM_BACK + 0.03]} width={0.92} height={1.42} />
      {/* The right panel is slid open — this gap is the only cold thing in the
          room, and it is what the warm interior gets to be warm *against*. */}
      <PaperPanel position={[1.40, 0.86, ROOM_BACK + 0.03]} width={0.52} height={1.42} cols={2} />

      {/* Night beyond: sky, the far ridge, a low moon, the yard floor. */}
      <group position={[0.72, 0, ROOM_BACK - 0.35]}>
        <mesh position={[0, 0.95, -0.6]}>
          <planeGeometry args={[1.6, 2.0]} />
          <meshBasicMaterial color="#1B2E56" />
        </mesh>
        <mesh position={[0.0, 1.06, -0.55]}>
          <circleGeometry args={[0.17, 28]} />
          <meshBasicMaterial color="#F2F5FF" />
        </mesh>
        <mesh position={[0.0, 1.06, -0.56]}>
          <circleGeometry args={[0.30, 28]} />
          <meshBasicMaterial color="#B9C8EC" transparent opacity={0.35} />
        </mesh>
        <mesh position={[0.0, 1.06, -0.57]}>
          <circleGeometry args={[0.55, 32]} />
          <meshBasicMaterial color="#7C93C8" transparent opacity={0.18} />
        </mesh>
        {/* Far ridge line */}
        <mesh position={[-0.1, 0.44, -0.5]} rotation={[0, 0, 0.06]}>
          <planeGeometry args={[1.7, 0.34]} />
          <meshBasicMaterial color="#101C3A" />
        </mesh>
        {/* Yard floor catching the moon */}
        <mesh position={[0, 0.06, -0.2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.6, 1.0]} />
          <meshStandardMaterial color="#1A2440" roughness={0.85} />
        </mesh>
      </group>

      {/* Sill and head of the opening */}
      <mesh position={[0.72, 0.14, ROOM_BACK + 0.04]}>
        <boxGeometry args={[0.86, 0.08, 0.10]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.85} />
      </mesh>
      <mesh position={[0.72, 1.59, ROOM_BACK + 0.04]}>
        <boxGeometry args={[0.86, 0.07, 0.10]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.85} />
      </mesh>

      {/* Wainscot band under the panels */}
      <mesh position={[0, 0.075, ROOM_BACK + 0.02]}>
        <planeGeometry args={[ROOM_W, 0.15]} />
        <meshStandardMaterial color={WOOD_MID} roughness={0.9} />
      </mesh>

      {/* Side walls */}
      {[-1, 1].map(s => (
        <mesh
          key={s}
          position={[s * (ROOM_W / 2), ROOM_H / 2, (ROOM_FRONT + ROOM_BACK) / 2]}
          rotation={[0, -s * Math.PI / 2, 0]}
          material={plaster}
          receiveShadow
        >
          <planeGeometry args={[ROOM_FRONT - ROOM_BACK, ROOM_H]} />
        </mesh>
      ))}

      {/* Baseboards */}
      {[-1, 1].map(s => (
        <mesh key={`bb${s}`} position={[s * (ROOM_W / 2 - 0.01), 0.07, (ROOM_FRONT + ROOM_BACK) / 2]} rotation={[0, -s * Math.PI / 2, 0]}>
          <planeGeometry args={[ROOM_FRONT - ROOM_BACK, 0.14]} />
          <meshStandardMaterial color={WOOD_MID} roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* Ceiling + exposed beams */}
      <mesh position={[0, ROOM_H, (ROOM_FRONT + ROOM_BACK) / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_FRONT - ROOM_BACK]} />
        <meshStandardMaterial color="#2A1B12" roughness={1} side={THREE.DoubleSide} />
      </mesh>
      {[-1.5, -0.55, 0.4, 1.35, 2.3].map((z, i) => (
        <mesh key={`beam${i}`} position={[0, ROOM_H - 0.09, z]} castShadow>
          <boxGeometry args={[ROOM_W, 0.14, 0.16]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
        </mesh>
      ))}
      {/* Ridge beam running front-to-back */}
      <mesh position={[0, ROOM_H - 0.24, (ROOM_FRONT + ROOM_BACK) / 2]} castShadow>
        <boxGeometry args={[0.2, 0.2, ROOM_FRONT - ROOM_BACK]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
      </mesh>
    </group>
  )
}


/** Floor + walls together — the bare room, no dressing, no light. */
export function HanokShell() {
  return (
    <>
      <Floor />
      <Walls />
    </>
  )
}

/**
 * The standard dressing of this house: the chest and its oil lamp, the jar
 * shelf, the scroll, the hanging persimmons and pepper braids, the broom in
 * the corner, spare cushions, and the raised doorway threshold that closes off
 * the bottom of frame. Scenes turn pieces off rather than re-inventing them,
 * so the same objects sit in the same places across every act that visits.
 */
export function HanokDressing({
  chest = true,
  lamp = true,
  shelf = true,
  scroll = true,
  hanging = true,
  clutter = true,
  threshold = true,
}: {
  chest?: boolean
  lamp?: boolean
  shelf?: boolean
  scroll?: boolean
  hanging?: boolean
  clutter?: boolean
  threshold?: boolean
}) {
  return (
    <>
      {chest && <Bandaji position={[-1.55, 0, -0.85]} />}
      {lamp && <OilLamp position={[-1.50, 0.68, -0.55]} />}
      {shelf && <JarShelf position={[1.62, 0.62, -0.7]} />}

      {hanging && (
        <>
          <PepperBraid position={[1.50, ROOM_H - 0.30, -0.35]} />
          <PepperBraid position={[-1.62, ROOM_H - 0.30, 0.15]} />
          <DryingPersimmons position={[-1.35, ROOM_H - 0.2, 0.55]} strings={3} />
          <DryingPersimmons position={[1.42, ROOM_H - 0.2, 0.35]} strings={2} />
        </>
      )}

      {/* Hanging scroll on the left wall — a brushed vertical, nothing legible. */}
      {scroll && (
        <group position={[-ROOM_W / 2 + 0.03, 1.10, -0.35]} rotation={[0, Math.PI / 2, 0]}>
          <mesh>
            <planeGeometry args={[0.34, 1.02]} />
            <meshStandardMaterial color="#9A8358" roughness={1} side={THREE.DoubleSide} />
          </mesh>
          {[0.5, -0.5].map(y => (
            <mesh key={y} position={[0, y * 1.02, 0.004]}>
              <boxGeometry args={[0.38, 0.035, 0.012]} />
              <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
            </mesh>
          ))}
          {[0.24, 0.0, -0.26].map((y, i) => (
            <mesh key={i} position={[(i - 1) * 0.04, y, 0.006]} rotation={[0, 0, 0.12 * (i - 1)]}>
              <boxGeometry args={[0.035, 0.30 - i * 0.05, 0.004]} />
              <meshStandardMaterial color="#2A1E14" roughness={1} />
            </mesh>
          ))}
        </group>
      )}

      {/* A broom in the corner and spare cushions pushed aside — the small
          evidence that people actually live in this room. */}
      {clutter && (
        <>
          <group position={[1.72, 0, 0.95]} rotation={[0, 0, -0.16]}>
            <mesh position={[0, 0.55, 0]} castShadow>
              <cylinderGeometry args={[0.014, 0.014, 1.1, 6]} />
              <meshStandardMaterial color="#6A4A2A" roughness={1} />
            </mesh>
            <mesh position={[0, 0.09, 0]} castShadow>
              <coneGeometry args={[0.11, 0.26, 8]} />
              <meshStandardMaterial color="#8A6A38" roughness={1} />
            </mesh>
          </group>
          {([[-1.16, 0.62, 0.42, '#6A3A2E'], [1.20, 1.35, -0.55, '#5E4A2A']] as const).map(
            ([cx, cz, rot, col], i) => (
              <group key={i} position={[cx, 0.035, cz]} rotation={[0, rot, 0]}>
                <mesh castShadow receiveShadow scale={[1, 0.30, 1]}>
                  <sphereGeometry args={[0.24, 14, 10]} />
                  <meshStandardMaterial color={col} roughness={0.95} />
                </mesh>
                <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.205, 0.014, 6, 20]} />
                  <meshStandardMaterial color={WOOD_MID} roughness={0.9} />
                </mesh>
              </group>
            ),
          )}
        </>
      )}

      {threshold && (
        <>
          <mesh position={[0, 0.065, 0.86]} castShadow receiveShadow>
            <boxGeometry args={[ROOM_W, 0.13, 0.26]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.132, 0.86]}>
            <boxGeometry args={[ROOM_W, 0.014, 0.28]} />
            <meshStandardMaterial color={WOOD_WARM} roughness={0.4} metalness={0.12} />
          </mesh>
        </>
      )}
    </>
  )
}

/**
 * The room's light rig: one warm paper lantern as key, a floor bounce so
 * nothing sits in dead black, and cold moonlight through the open panel to rim
 * whatever is standing in front of it. `warm` and `moon` scale the two halves,
 * which is how a scene moves this room from evening to dawn to abandonment.
 */
export function HanokLighting({
  lantern = [-0.04, 1.52, -0.86],
  warm = 1,
  moon = 1,
  ambient = 0.17,
  ambientColor = '#5A3A20',
}: {
  /** null = no hanging lamp (use for daylight or an emptied house). */
  lantern?: V3 | null
  warm?: number
  moon?: number
  ambient?: number
  ambientColor?: string
}) {
  return (
    <>
      <ambientLight color={ambientColor} intensity={ambient} />
      {lantern && <Lantern position={lantern} scale={warm} />}
      {warm > 0 && (
        <pointLight
          position={[0, 0.14, 0.40]} color="#FF9A3C"
          intensity={0.55 * warm} distance={2.4} decay={2}
        />
      )}
      {moon > 0 && (
        <>
          <spotLight
            position={[0.72, 1.35, ROOM_BACK - 0.6]}
            target-position={[0.18, 0.5, 0.6]}
            color={MOON_COOL}
            intensity={4.5 * moon}
            angle={0.85}
            penumbra={1}
            distance={7}
            decay={1.5}
          />
          <pointLight
            position={[0.72, 0.9, ROOM_BACK + 0.2]} color={MOON_COOL}
            intensity={0.7 * moon} distance={2.4} decay={2}
          />
        </>
      )}
    </>
  )
}
