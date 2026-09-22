import { useContext, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { seededRandom } from '../../utils/svgHelpers'
import { AnimTimeContext } from '../../hooks/useAnimTime'
import type { PointLight as PointLightType } from 'three'
import * as THREE from 'three'

/**
 * 3D city buildings at various depths — a Korean cityscape at night.
 * Dense lit windows, neon accents, rooftop beacons, ground-level shop glow,
 * and billboard lights. Includes N Seoul Tower and Lotte World Tower.
 */

interface WindowData {
  x: number
  y: number
  color: string
  brightness: number // 0.4-1.0
}

export interface BuildingData {
  x: number
  baseY: number
  width: number
  height: number
  bDepth: number
  windows: WindowData[]
  rooftopLight: boolean
  rooftopColor: string
  hasNeonStripe: boolean
  neonColor: string
  hasGroundShop: boolean
  shopColor: string
}

// Warm night window colors — amber, golden, occasional cool white
const WINDOW_COLORS = [
  '#FFB347', // amber
  '#FFA726', // deep amber
  '#FFF3E0', // warm white
  '#FFE0B2', // light amber
  '#FFD54F', // golden
  '#FFCA28', // deep golden
  '#FF8A65', // warm orange (TV/kitchen)
  '#E3F2FD', // cool blue-white (rare)
]

const NEON_COLORS = [
  '#FF1493', '#00E5FF', '#FF6F00', '#00FF88',
]

const SHOP_COLORS = [
  '#FFE4A8', '#FF8A65', '#FFD54F',
]

function pickColor(rand: () => number): string {
  return WINDOW_COLORS[Math.floor(rand() * WINDOW_COLORS.length)]
}

export function generateBuildingRow(
  seed: number,
  count: number,
  spread: number,
  minH: number,
  maxH: number,
  noCenter = false,
): BuildingData[] {
  const rand = seededRandom(seed)
  const buildings: BuildingData[] = []
  for (let i = 0; i < count; i++) {
    const width = 0.8 + rand() * 1.5
    const height = minH + rand() * (maxH - minH)
    const bDepth = 0.4 + rand() * 0.8
    // Bimodal: clusters on left/right flanks, first building near center (unless noCenter)
    const side = rand() < 0.5 ? -1 : 1
    const center = spread * 0.3
    const gauss = ((rand() + rand() + rand()) / 3 - 0.5) * spread * 0.35
    let x: number
    if (i === 0 && !noCenter) {
      x = (rand() - 0.5) * spread * 0.2
    } else {
      x = side * center + gauss
      // When noCenter, enforce minimum gap — building EDGE must be ≥2 from center
      if (noCenter && (Math.abs(x) - width / 2) < 2) {
        x = side * (2 + width / 2 + Math.abs(gauss))
      }
    }

    const windows: WindowData[] = []
    const cols = Math.max(2, Math.floor(width / 0.15))
    const rows = Math.max(2, Math.floor(height / 0.25))
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (rand() < 0.20) {
          windows.push({
            x: (c - (cols - 1) / 2) * (width * 0.8 / cols),
            y: (r + 0.5) * (height / rows) - height / 2,
            color: pickColor(rand),
            brightness: 0.7 + rand() * 0.3,
          })
        }
      }
    }
    buildings.push({
      x, baseY: -3, width, height, bDepth, windows,
      rooftopLight: rand() < 0.5,
      rooftopColor: rand() < 0.6 ? '#FF3333' : '#FFFFFF',
      hasNeonStripe: rand() < 0.3,
      neonColor: NEON_COLORS[Math.floor(rand() * NEON_COLORS.length)],
      hasGroundShop: rand() < 0.4,
      shopColor: SHOP_COLORS[Math.floor(rand() * SHOP_COLORS.length)],
    })
  }
  return buildings
}

// ── Corridor walls — visible starting ~t=17s (camera at z≈19.94) ─────────
// Placed just ahead of camera at t≈16.5s so walls first enter view around t=17s
const CORRIDOR_Z_START = 19.9
const CORRIDOR_Z_END = 69.9
const CORRIDOR_DEPTH = CORRIDOR_Z_END - CORRIDOR_Z_START
const CORRIDOR_HALF_WIDTH = 3
const WALL_THICKNESS = 2.5
const WALL_HEIGHT = 24
const WALL_BASE_Y = -12

export { CORRIDOR_Z_START, CORRIDOR_Z_END, CORRIDOR_HALF_WIDTH }

// ── Pixel-art "I need" rendered with window tiles ────────────────────────
// 5×5 bitmap font (1 = lit pixel, 0 = off)
const PIXEL_FONT: Record<string, number[][]> = {
  I: [
    [1,1,1,1,1],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [1,1,1,1,1],
  ],
  ' ': [
    [0,0,0],
    [0,0,0],
    [0,0,0],
    [0,0,0],
    [0,0,0],
  ],
  n: [
    [1,0,0,0,1],
    [1,1,0,0,1],
    [1,0,1,0,1],
    [1,0,0,1,1],
    [1,0,0,0,1],
  ],
  e: [
    [1,1,1,1,1],
    [1,0,0,0,0],
    [1,1,1,1,0],
    [1,0,0,0,0],
    [1,1,1,1,1],
  ],
  d: [
    [1,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,0],
  ],
}

const I_NEED_CHARS = ['I', ' ', 'n', 'e', 'e', 'd']

/** Generate pixel positions in local x (horizontal) / y (vertical) space, centered */
function generatePixelPositions(pixelSize: number, gap: number) {
  const positions: [number, number][] = []
  const cell = pixelSize + gap

  const CHAR_GAP = 1 // 1 pixel column between characters (but space char handles word gaps)
  let totalCols = 0
  for (let i = 0; i < I_NEED_CHARS.length; i++) {
    totalCols += PIXEL_FONT[I_NEED_CHARS[i]][0].length
    if (i < I_NEED_CHARS.length - 1) totalCols += CHAR_GAP
  }
  const halfW = (totalCols * cell) / 2

  let colOff = 0
  for (let ci = 0; ci < I_NEED_CHARS.length; ci++) {
    const grid = PIXEL_FONT[I_NEED_CHARS[ci]]
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        if (grid[row][col]) {
          positions.push([
            (colOff + col) * cell - halfW + cell / 2,
            (2 - row) * cell,
          ])
        }
      }
    }
    colOff += grid[0].length + CHAR_GAP
  }
  return positions
}

/**
 * Generic pixel-art "I need" sign.
 * - position: where to place it in the scene
 * - rotationY: y-axis rotation (0 = faces +z, PI = faces -z / camera)
 * - pixelSize: size of each tile
 * - flashStart: when the text flashes on (effectiveTime seconds)
 * - hold: how long it stays fully on
 * - fade: how long it takes to dim to black
 */
function PixelINeedSign({
  position,
  rotationY,
  pixelSize = 0.2,
  flashStart,
  hold = 1.5,
  fade = 0.5,
}: {
  position: [number, number, number]
  rotationY: number
  pixelSize?: number
  flashStart: number
  hold?: number
  fade?: number
}) {
  const effectiveTime = useContext(AnimTimeContext)

  const pixels = useMemo(() => generatePixelPositions(pixelSize, pixelSize * 0.25), [pixelSize])

  const sharedMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#A855F7',
    toneMapped: false,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  }), [])

  useFrame(() => {
    const t = effectiveTime - flashStart
    let opacity = 0
    if (t >= 0 && t < hold + fade) {
      opacity = t < hold ? 0.95 : 0.95 * (1 - (t - hold) / fade)
    }
    sharedMat.opacity = opacity
  })

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {pixels.map((p, i) => (
        <mesh key={i} position={[p[0], p[1], 0]} material={sharedMat}>
          <planeGeometry args={[pixelSize, pixelSize]} />
        </mesh>
      ))}
    </group>
  )
}

// Wall flash timings for "I need" text
const WALL_FLASH_TIMES = [
  { start: 14.96, hold: 2.0, fade: 0.5 },
  { start: 18.0,  hold: 1.5, fade: 0.5 },
]

/** Generate "I need" pixel positions mapped to wall surface (y, z) coords */
function generateWallTextPositions(tileH: number, tileW: number) {
  const positions: { y: number; z: number }[] = []
  const cellH = tileH * 1.3 // vertical spacing
  const cellW = tileW * 1.3 // horizontal spacing (along z)

  let totalCols = 0
  for (let i = 0; i < I_NEED_CHARS.length; i++) {
    totalCols += PIXEL_FONT[I_NEED_CHARS[i]][0].length
    if (i < I_NEED_CHARS.length - 1) totalCols += 1
  }
  const halfW = (totalCols * cellW) / 2

  let colOff = 0
  for (let ci = 0; ci < I_NEED_CHARS.length; ci++) {
    const grid = PIXEL_FONT[I_NEED_CHARS[ci]]
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        if (grid[row][col]) {
          positions.push({
            z: (colOff + col) * cellW - halfW + cellW / 2,
            y: (2 - row) * cellH, // centered on y=0
          })
        }
      }
    }
    colOff += grid[0].length + 1
  }
  return positions
}

/** Single continuous corridor wall with dense lit windows + "I need" text tiles */
function CorridorWall({ side }: { side: -1 | 1 }) {
  const effectiveTime = useContext(AnimTimeContext)
  const rand = seededRandom(side === -1 ? 9001 : 9002)
  const wallX = side * (CORRIDOR_HALF_WIDTH + WALL_THICKNESS / 2)
  const wallZ = CORRIDOR_Z_START + CORRIDOR_DEPTH / 2
  const wallY = WALL_BASE_Y + WALL_HEIGHT / 2

  // Generate scattered windows on the inner face
  const windows = useMemo(() => {
    const w: { x: number; y: number; z: number; color: string }[] = []
    const cols = 8
    const rows = Math.floor(WALL_HEIGHT / 0.22)
    const depthSlots = Math.floor(CORRIDOR_DEPTH / 0.3)
    for (let d = 0; d < depthSlots; d++) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (rand() < 0.02) {
            w.push({
              x: (c - (cols - 1) / 2) * (WALL_THICKNESS * 0.7 / cols),
              y: (r + 0.5) * (WALL_HEIGHT / rows) - WALL_HEIGHT / 2,
              z: (d + 0.5) * (CORRIDOR_DEPTH / depthSlots) - CORRIDOR_DEPTH / 2,
              color: pickColor(rand),
            })
          }
        }
      }
    }
    return w
  }, [])

  // "I need" letter tiles — same surface as windows, but purple and animated
  const letterTiles = useMemo(() => generateWallTextPositions(0.15, 0.12), [])

  // Shared material for letter tiles — animated opacity
  const letterMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#A855F7',
    toneMapped: false,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  }), [])

  useFrame(() => {
    let opacity = 0
    for (const flash of WALL_FLASH_TIMES) {
      const t = effectiveTime - flash.start
      if (t >= 0 && t < flash.hold + flash.fade) {
        opacity = t < flash.hold ? 0.95 : 0.95 * (1 - (t - flash.hold) / flash.fade)
        break
      }
    }
    letterMat.opacity = opacity
  })

  // Inner face x position (facing the corridor center)
  const innerFaceX = -side * (WALL_THICKNESS / 2 + 0.02)

  return (
    <group position={[wallX, wallY, wallZ]}>
      {/* Wall body — dark */}
      <mesh>
        <boxGeometry args={[WALL_THICKNESS, WALL_HEIGHT, CORRIDOR_DEPTH]} />
        <meshStandardMaterial color="#0a0a18" />
      </mesh>

      {/* Scattered windows on inner face */}
      {windows.map((w, i) => (
        <mesh key={i} position={[innerFaceX, w.y, w.z]}>
          <planeGeometry args={[0.1, 0.14]} />
          <meshBasicMaterial color={w.color} toneMapped={false} side={2} />
        </mesh>
      ))}

      {/* "I need" letter tiles — on the wall surface near the corridor entrance */}
      {letterTiles.map((lt, i) => (
        <mesh key={`lt-${i}`} position={[innerFaceX, lt.y, lt.z - CORRIDOR_DEPTH / 2 + 4]} material={letterMat}>
          <planeGeometry args={[0.12, 0.15]} />
        </mesh>
      ))}

      {/* Subtle ground-level glow */}
      <mesh position={[innerFaceX, -WALL_HEIGHT / 2 + 0.15, 0]}>
        <planeGeometry args={[0.06, CORRIDOR_DEPTH * 0.9]} />
        <meshBasicMaterial color="#2a1a3a" toneMapped={false} side={2} />
      </mesh>
    </group>
  )
}

/** N Seoul Tower (남산타워) */
function NSeoulTower({ position }: { position: [number, number, number] }) {
  const beaconRef = useRef<PointLightType>(null)
  useFrame(({ clock }) => {
    if (beaconRef.current) {
      beaconRef.current.intensity = 3 + Math.sin(clock.elapsedTime * 3) * 1.5
    }
  })

  return (
    <group position={position}>
      {/* Mountain base (Namsan) */}
      <mesh position={[0, -1.5, 0]}>
        <coneGeometry args={[1.8, 2, 8]} />
        <meshStandardMaterial color="#1a2a1a" />
      </mesh>

      {/* Tower main shaft */}
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 5, 8]} />
        <meshStandardMaterial color="#888899" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Observation deck */}
      <mesh position={[0, 3.8, 0]}>
        <cylinderGeometry args={[0.35, 0.25, 0.8, 12]} />
        <meshStandardMaterial color="#666688" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Observation deck windows — glowing ring */}
      <mesh position={[0, 3.8, 0]}>
        <cylinderGeometry args={[0.36, 0.26, 0.3, 12]} />
        <meshBasicMaterial color="#FFEECC" transparent opacity={0.9} />
      </mesh>

      {/* Outer glow halo around observation deck */}
      <mesh position={[0, 3.8, 0]}>
        <cylinderGeometry args={[0.55, 0.45, 0.6, 16]} />
        <meshBasicMaterial color="#FFE4A8" transparent opacity={0.25} />
      </mesh>

      {/* Upper deck */}
      <mesh position={[0, 4.3, 0]}>
        <cylinderGeometry args={[0.2, 0.3, 0.4, 12]} />
        <meshStandardMaterial color="#777799" metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Antenna spire */}
      <mesh position={[0, 5, 0]}>
        <cylinderGeometry args={[0.01, 0.03, 1.2, 6]} />
        <meshStandardMaterial color="#999999" />
      </mesh>

      {/* Red beacon — pulsing */}
      <mesh position={[0, 5.6, 0]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshBasicMaterial color="#FF4444" />
      </mesh>
      {/* Beacon glow halo */}
      <mesh position={[0, 5.6, 0]}>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshBasicMaterial color="#FF3333" transparent opacity={0.2} />
      </mesh>
      <pointLight ref={beaconRef} position={[0, 5.6, 0]} color="#FF4444" intensity={3} distance={6} />

      {/* Tower observation glow */}
      <pointLight position={[0, 3.8, 0.5]} color="#FFE4A8" intensity={4} distance={6} />
      <pointLight position={[0, 3.8, -0.5]} color="#FFE4A8" intensity={3} distance={5} />

      {/* Base uplighting */}
      <pointLight position={[0, -0.5, 1]} color="#9966FF" intensity={1.5} distance={4} />
    </group>
  )
}

/** Lotte World Tower inspired tall glass tower */
function TallTower({ position, height = 7 }: { position: [number, number, number]; height?: number }) {
  const rand = seededRandom(4242)
  const windows: WindowData[] = []
  const cols = 5
  const rows = Math.floor(height / 0.25)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rand() < 0.8) {
        windows.push({
          x: (c - 2) * 0.1,
          y: (r + 0.5) * (height / rows) - height / 2,
          color: pickColor(rand),
          brightness: 0.7 + rand() * 0.3,
        })
      }
    }
  }

  return (
    <group position={position}>
      {/* Tapered glass tower */}
      <mesh position={[0, height / 2 - 3, 0]}>
        <cylinderGeometry args={[0.15, 0.45, height, 6]} />
        <meshStandardMaterial color="#1a1a35" metalness={0.8} roughness={0.15} />
      </mesh>
      {/* Windows */}
      {windows.map((w, i) => (
        <mesh key={i} position={[w.x * 2.5, w.y - 3 + height / 2, -0.4]}>
          <planeGeometry args={[0.12, 0.18]} />
          <meshBasicMaterial color={w.color} toneMapped={false} side={2} />
        </mesh>
      ))}
      {/* Crown light */}
      <pointLight position={[0, height - 2.5, 0.5]} color="#B8C4FF" intensity={1} distance={3} />
      {/* Rooftop beacon */}
      <mesh position={[0, height - 3 + 0.1, 0]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshBasicMaterial color="#FF4444" />
      </mesh>
    </group>
  )
}

/** Single building with all decorative elements */
function Building({ data, layerColor }: { data: BuildingData; layerColor: string }) {
  return (
    <group position={[data.x, data.baseY + data.height / 2, 0]}>
      {/* Building body */}
      <mesh>
        <boxGeometry args={[data.width, data.height, data.bDepth]} />
        <meshStandardMaterial color={layerColor} />
      </mesh>

      {/* Lit windows — small warm rectangles */}
      {data.windows.map((w, i) => (
        <mesh key={i} position={[w.x, w.y, -(data.bDepth / 2 + 0.02)]}>
          <planeGeometry args={[0.08, 0.12]} />
          <meshBasicMaterial color={w.color} toneMapped={false} side={2} />
        </mesh>
      ))}

      {/* Neon edge stripe */}
      {data.hasNeonStripe && (
        <>
          <mesh position={[data.width / 2 + 0.005, 0, -(data.bDepth / 2)]}>
            <planeGeometry args={[data.width * 0.06, data.height * 0.9]} />
            <meshBasicMaterial color={data.neonColor} toneMapped={false} side={2} />
          </mesh>
          <pointLight
            position={[data.width / 2 + 0.1, 0, -(data.bDepth / 2 + 0.2)]}
            color={data.neonColor}
            intensity={0.5}
            distance={2}
          />
        </>
      )}

      {/* Ground-level shop/lobby glow */}
      {data.hasGroundShop && (
        <>
          <mesh position={[0, -data.height / 2 + 0.15, -(data.bDepth / 2 + 0.02)]}>
            <planeGeometry args={[data.width * 0.8, 0.3]} />
            <meshBasicMaterial color={data.shopColor} toneMapped={false} side={2} />
          </mesh>
          <pointLight
            position={[0, -data.height / 2 + 0.2, -(data.bDepth / 2 + 0.3)]}
            color={data.shopColor}
            intensity={0.6}
            distance={2}
          />
        </>
      )}

      {/* Rooftop beacon light */}
      {data.rooftopLight && (
        <>
          <mesh position={[0, data.height / 2 + 0.05, 0]}>
            <sphereGeometry args={[0.03, 6, 6]} />
            <meshBasicMaterial color={data.rooftopColor} />
          </mesh>
          {data.rooftopColor === '#FF3333' && (
            <pointLight
              position={[0, data.height / 2 + 0.1, 0]}
              color={data.rooftopColor}
              intensity={0.3}
              distance={1}
            />
          )}
        </>
      )}
    </group>
  )
}

export default function CityBuildings3D() {
  // Scattered buildings z=7 → 19.8 (bimodal distribution), corridor walls at z=19.9+
  const scatteredLayers = useMemo(
    () => [
      // Approach rows — evenly spaced ~1 unit apart like the rest, no center buildings
      { z: 18.5, buildings: generateBuildingRow(814, 6, 8, 2.5, 5.0, true), color: '#1a1a30' },
      { z: 17.5, buildings: generateBuildingRow(810, 8, 12, 1.5, 4.5, true), color: '#1a1a30' },
      // City body
      { z: 16.5, buildings: generateBuildingRow(815, 14, 16, 1.0, 4.5, true), color: '#191934' },
      { z: 15.0, buildings: generateBuildingRow(801, 16, 16, 0.8, 3.5), color: '#1a1a2e' },
      { z: 14.0, buildings: generateBuildingRow(808, 16, 17, 0.5, 3.0), color: '#1c1c32' },
      { z: 13.0, buildings: generateBuildingRow(806, 14, 17, 0.8, 3.5), color: '#181838' },
      { z: 12.0, buildings: generateBuildingRow(811, 14, 16, 1.0, 4.0), color: '#171730' },
      { z: 11.0, buildings: generateBuildingRow(802, 12, 16, 1.0, 4.5), color: '#16162a' },
      { z: 10.0, buildings: generateBuildingRow(812, 12, 15, 1.5, 5.0), color: '#151530' },
      { z: 9.0, buildings: generateBuildingRow(807, 10, 15, 1.5, 5.5), color: '#141430' },
      { z: 8.0, buildings: generateBuildingRow(813, 10, 14, 2.0, 6.0), color: '#131328' },
      { z: 7.0, buildings: generateBuildingRow(803, 8, 14, 2.0, 6.5), color: '#121228' },
    ],
    [],
  )

  return (
    <group>
      {/* City ambient lighting */}
      <ambientLight intensity={0.4} />
      {/* Purple city glow */}
      <pointLight position={[0, -2, 9]} color="#7B2FBE" intensity={2} distance={20} />
      <pointLight position={[0, -2, 13]} color="#7B2FBE" intensity={2} distance={20} />
      <pointLight position={[-5, 2, 11]} color="#4455CC" intensity={1} distance={15} />
      <pointLight position={[5, 2, 11]} color="#4455CC" intensity={1} distance={15} />
      {/* Warm ground bounce */}
      <pointLight position={[0, -4, 10]} color="#FFD480" intensity={0.8} distance={12} />
      {/* Far city glow on horizon */}
      <pointLight position={[0, -1, 15]} color="#9966CC" intensity={1.5} distance={15} />
      {/* Corridor approach glow */}
      <pointLight position={[0, 0, 18]} color="#9966CC" intensity={2} distance={8} />

      {/* N Seoul Tower — mid city landmark */}
      <NSeoulTower position={[2.5, 0, 15]} />

      {/* Lotte World Tower */}
      <TallTower position={[-3, 0, 14]} height={8} />
      {/* Second tall tower */}
      <TallTower position={[5, 0, 16]} height={6} />

      {/* Scattered building rows (z=7 → 17) */}
      {scatteredLayers.map((layer, li) => (
        <group key={li} position={[0, 0, layer.z]}>
          {layer.buildings.map((bld, bi) => (
            <Building key={bi} data={bld} layerColor={layer.color} />
          ))}
        </group>
      ))}

      {/* Corridor walls */}
      <CorridorWall side={-1} />
      <CorridorWall side={1} />

      {/* t=13.05s "I need" — small, floating in the air (cam z≈14.8 at flash) */}
      <PixelINeedSign position={[0, 0, 17]} rotationY={Math.PI} pixelSize={0.08} flashStart={13.05} hold={1.5} fade={0.5} />
    </group>
  )
}
