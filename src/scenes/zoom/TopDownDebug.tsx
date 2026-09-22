import { useState, useMemo } from 'react'
import {
  generateBuildingRow,
  CORRIDOR_Z_START, CORRIDOR_Z_END, CORRIDOR_HALF_WIDTH,
  type BuildingData,
} from './CityBuildings3D'
import { easeCamera, MAX_CAMERA_Z, SONG_DURATION } from './DepthScene'

/**
 * Top-down debug view — scattered buildings + corridor walls.
 * Access via ?mode=topdown
 */

// Scattered layer params (mirrors CityBuildings3D)
const SCATTERED_LAYERS = [
  { z: 18.5, seed: 814, count: 6, spread: 8, minH: 2.5, maxH: 5.0, color: '#1a1a30', noCenter: true },
  { z: 17.5, seed: 810, count: 8, spread: 12, minH: 1.5, maxH: 4.5, color: '#1a1a30', noCenter: true },
  { z: 16.5, seed: 815, count: 14, spread: 16, minH: 1.0, maxH: 4.5, color: '#191934', noCenter: true },
  { z: 15.0, seed: 801, count: 16, spread: 16, minH: 0.8, maxH: 3.5, color: '#1a1a2e', noCenter: false },
  { z: 14.0, seed: 808, count: 16, spread: 17, minH: 0.5, maxH: 3.0, color: '#1c1c32', noCenter: false },
  { z: 13.0, seed: 806, count: 14, spread: 17, minH: 0.8, maxH: 3.5, color: '#181838', noCenter: false },
  { z: 12.0, seed: 811, count: 14, spread: 16, minH: 1.0, maxH: 4.0, color: '#171730', noCenter: false },
  { z: 11.0, seed: 802, count: 12, spread: 16, minH: 1.0, maxH: 4.5, color: '#16162a', noCenter: false },
  { z: 10.0, seed: 812, count: 12, spread: 15, minH: 1.5, maxH: 5.0, color: '#151530', noCenter: false },
  { z: 9.0, seed: 807, count: 10, spread: 15, minH: 1.5, maxH: 5.5, color: '#141430', noCenter: false },
  { z: 8.0, seed: 813, count: 10, spread: 14, minH: 2.0, maxH: 6.0, color: '#131328', noCenter: false },
  { z: 7.0, seed: 803, count: 8, spread: 14, minH: 2.0, maxH: 6.5, color: '#121228', noCenter: false },
]

const LANDMARKS = [
  { label: 'N Seoul Tower', x: 2.5, z: 15, color: '#FF6666' },
  { label: 'Lotte Tower', x: -3, z: 14, color: '#8888FF' },
  { label: 'Tall Tower 2', x: 5, z: 16, color: '#8888FF' },
  { label: 'Stadium', x: 0, z: 19.5, color: '#A855F7' },
]

const SVG_W = 1200
const SVG_H = 900
const PADDING = 40

const WORLD_X_MIN = -12
const WORLD_X_MAX = 12
const WORLD_Z_MIN = -1
const WORLD_Z_MAX = 22

function worldToSvg(wx: number, wz: number): [number, number] {
  const sx = PADDING + ((wx - WORLD_X_MIN) / (WORLD_X_MAX - WORLD_X_MIN)) * (SVG_W - 2 * PADDING)
  const sy = PADDING + ((WORLD_Z_MAX - wz) / (WORLD_Z_MAX - WORLD_Z_MIN)) * (SVG_H - 2 * PADDING)
  return [sx, sy]
}

function worldScaleX(wx: number): number {
  return (wx / (WORLD_X_MAX - WORLD_X_MIN)) * (SVG_W - 2 * PADDING)
}

export default function TopDownDebug() {
  const [time, setTime] = useState(0)
  const [hoveredBuilding, setHoveredBuilding] = useState<{ layer: number; idx: number; data: BuildingData } | null>(null)

  const generatedLayers = useMemo(
    () => SCATTERED_LAYERS.map((l) => ({
      z: l.z,
      color: l.color,
      buildings: generateBuildingRow(l.seed, l.count, l.spread, l.minH, l.maxH, l.noCenter),
    })),
    [],
  )

  const cameraZ = easeCamera(time)
  const hHalfAngle = Math.atan(Math.tan((75 / 2) * Math.PI / 180) * (16 / 9))
  const [camSx, camSy] = worldToSvg(0, cameraZ)

  const coneLen = 8
  const coneEndZ = Math.min(cameraZ + coneLen, WORLD_Z_MAX)
  const coneDist = coneEndZ - cameraZ
  const coneHalfX = coneDist * Math.tan(hHalfAngle)
  const [coneLeftX, coneLeftY] = worldToSvg(-coneHalfX, coneEndZ)
  const [coneRightX, coneRightY] = worldToSvg(coneHalfX, coneEndZ)

  const pathDots: { t: number; z: number }[] = []
  for (let t = 0; t <= SONG_DURATION; t += 0.5) {
    pathDots.push({ t, z: easeCamera(t) })
  }

  // Corridor wall rectangles in SVG
  const wallThickness = 2.5
  const [leftWallInnerSx] = worldToSvg(-CORRIDOR_HALF_WIDTH, 0)
  const [leftWallOuterSx] = worldToSvg(-CORRIDOR_HALF_WIDTH - wallThickness, 0)
  const [rightWallInnerSx] = worldToSvg(CORRIDOR_HALF_WIDTH, 0)
  const [rightWallOuterSx] = worldToSvg(CORRIDOR_HALF_WIDTH + wallThickness, 0)
  const [, corridorTopSy] = worldToSvg(0, CORRIDOR_Z_END)
  const [, corridorBotSy] = worldToSvg(0, CORRIDOR_Z_START)
  const corridorH = corridorBotSy - corridorTopSy

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: '#0a0a1a', color: '#ccc',
      fontFamily: 'monospace', display: 'flex', flexDirection: 'column',
      alignItems: 'center', padding: 16, boxSizing: 'border-box',
    }}>
      <h2 style={{ margin: '0 0 8px', color: '#fff', fontSize: 16 }}>
        Top-Down Debug — Camera z={cameraZ.toFixed(2)} (t={time.toFixed(1)}s)
      </h2>

      <input
        type="range" min={0} max={SONG_DURATION} step={0.1} value={time}
        onChange={(e) => setTime(parseFloat(e.target.value))}
        style={{ width: SVG_W, marginBottom: 8 }}
      />

      <svg width={SVG_W} height={SVG_H}
        style={{ background: '#050a14', borderRadius: 8, border: '1px solid #333' }}>

        {/* Grid */}
        {Array.from({ length: 25 }, (_, i) => {
          const [, sy] = worldToSvg(0, i)
          return (
            <g key={`gz-${i}`}>
              <line x1={PADDING} y1={sy} x2={SVG_W - PADDING} y2={sy}
                stroke="#1a1a2e" strokeWidth={i % 5 === 0 ? 1 : 0.5} />
              <text x={PADDING - 4} y={sy + 4} fill="#555" fontSize={10} textAnchor="end">z={i}</text>
            </g>
          )
        })}
        {Array.from({ length: 13 }, (_, i) => {
          const x = (i - 6) * 2
          const [sx] = worldToSvg(x, 0)
          return <line key={`gx-${i}`} x1={sx} y1={PADDING} x2={sx} y2={SVG_H - PADDING}
            stroke="#1a1a2e" strokeWidth={x === 0 ? 1.5 : 0.5} />
        })}

        {/* Camera path */}
        {(() => {
          const [x1, y1] = worldToSvg(0, 0)
          const [x2, y2] = worldToSvg(0, MAX_CAMERA_Z)
          return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FFD700" strokeWidth={2} strokeDasharray="6 3" opacity={0.5} />
        })()}

        {pathDots.map((d, i) => {
          const [sx, sy] = worldToSvg(0, d.z)
          return <circle key={`pd-${i}`} cx={sx} cy={sy} r={1.5}
            fill={d.t <= time ? '#FFD700' : '#555'} opacity={d.t <= time ? 0.8 : 0.3} />
        })}

        {/* FOV cone */}
        <polygon
          points={`${camSx},${camSy} ${coneLeftX},${coneLeftY} ${coneRightX},${coneRightY}`}
          fill="#FFD700" fillOpacity={0.06} stroke="#FFD700" strokeWidth={1} strokeOpacity={0.3} />

        {/* Scattered buildings */}
        {generatedLayers.map((layer, li) =>
          layer.buildings.map((bld, bi) => {
            const [sx, sy] = worldToSvg(bld.x, layer.z)
            const w = Math.max(3, worldScaleX(bld.width))
            const isHovered = hoveredBuilding?.layer === li && hoveredBuilding?.idx === bi
            const heightNorm = Math.min(1, bld.height / 7)
            return (
              <g key={`b-${li}-${bi}`}>
                <rect x={sx - w / 2} y={sy - 2} width={w} height={4}
                  fill={layer.color}
                  stroke={isHovered ? '#fff' : (bi === 0 ? '#FFD700' : '#666')}
                  strokeWidth={isHovered ? 2 : (bi === 0 ? 1.5 : 0.5)}
                  opacity={0.5 + heightNorm * 0.5} rx={1}
                  onMouseEnter={() => setHoveredBuilding({ layer: li, idx: bi, data: bld })}
                  onMouseLeave={() => setHoveredBuilding(null)}
                  style={{ cursor: 'pointer' }} />
              </g>
            )
          }),
        )}

        {/* Corridor walls — two solid rectangles */}
        <rect x={leftWallOuterSx} y={corridorTopSy}
          width={leftWallInnerSx - leftWallOuterSx} height={corridorH}
          fill="#2a2a50" stroke="#4488FF" strokeWidth={1.5} opacity={0.7} rx={2} />
        <text x={(leftWallOuterSx + leftWallInnerSx) / 2} y={corridorTopSy + corridorH / 2}
          fill="#4488FF" fontSize={10} textAnchor="middle" dominantBaseline="middle"
          transform={`rotate(-90, ${(leftWallOuterSx + leftWallInnerSx) / 2}, ${corridorTopSy + corridorH / 2})`}>
          LEFT WALL
        </text>

        <rect x={rightWallInnerSx} y={corridorTopSy}
          width={rightWallOuterSx - rightWallInnerSx} height={corridorH}
          fill="#2a2a50" stroke="#FF8844" strokeWidth={1.5} opacity={0.7} rx={2} />
        <text x={(rightWallInnerSx + rightWallOuterSx) / 2} y={corridorTopSy + corridorH / 2}
          fill="#FF8844" fontSize={10} textAnchor="middle" dominantBaseline="middle"
          transform={`rotate(90, ${(rightWallInnerSx + rightWallOuterSx) / 2}, ${corridorTopSy + corridorH / 2})`}>
          RIGHT WALL
        </text>

        {/* Corridor clear path */}
        <rect x={leftWallInnerSx} y={corridorTopSy}
          width={rightWallInnerSx - leftWallInnerSx} height={corridorH}
          fill="#1a1a3a" opacity={0.15}
          stroke="#FFD700" strokeWidth={0.5} strokeDasharray="4 4" strokeOpacity={0.3} />

        {/* "I need" sign positions */}
        {[
          { x: 0, z: 7, t: 7.24, type: 'air' },
          { x: 0, z: 9.5, t: 9.13, type: 'air' },
          { x: -4.2, z: 16, t: 13.05, type: 'wall' },
          { x: 4.2, z: 16, t: 13.05, type: 'wall' },
          { x: -4.2, z: 20, t: 14.96, type: 'wall' },
          { x: 4.2, z: 20, t: 14.96, type: 'wall' },
          { x: -4.2, z: 27, t: 18.0, type: 'wall' },
          { x: 4.2, z: 27, t: 18.0, type: 'wall' },
        ].map((sign, i) => {
          const [sx, sy] = worldToSvg(sign.x, sign.z)
          const active = time >= sign.t && time < sign.t + 2
          return (
            <g key={`sign-${i}`}>
              <rect x={sx - 12} y={sy - 5} width={24} height={10} rx={2}
                fill={active ? '#A855F7' : 'none'}
                fillOpacity={active ? 0.6 : 0}
                stroke="#A855F7" strokeWidth={1.5} strokeDasharray={active ? '' : '3 2'} />
              <text x={sx} y={sy + 3} fill="#A855F7" fontSize={7} textAnchor="middle" fontWeight="bold">
                {sign.type === 'air' ? '✦' : '♪'} {sign.t}s
              </text>
            </g>
          )
        })}

        {/* Landmarks */}
        {LANDMARKS.map((lm, i) => {
          const [sx, sy] = worldToSvg(lm.x, lm.z)
          return (
            <g key={`lm-${i}`}>
              <circle cx={sx} cy={sy} r={6} fill="none" stroke={lm.color} strokeWidth={2} />
              <circle cx={sx} cy={sy} r={2} fill={lm.color} />
              <text x={sx + 10} y={sy + 4} fill={lm.color} fontSize={11} fontWeight="bold">{lm.label}</text>
            </g>
          )
        })}

        {/* Camera */}
        <circle cx={camSx} cy={camSy} r={6} fill="#FFD700" />
        <text x={camSx + 10} y={camSy - 8} fill="#FFD700" fontSize={12} fontWeight="bold">CAM</text>

        {/* Legend */}
        <g transform={`translate(${SVG_W - PADDING - 200}, ${PADDING + 10})`}>
          <rect x={0} y={0} width={195} height={126} fill="#0a0a1a" opacity={0.85} rx={4} />
          <text x={10} y={18} fill="#fff" fontSize={12} fontWeight="bold">Legend</text>
          <circle cx={18} cy={34} r={5} fill="#FFD700" />
          <text x={30} y={38} fill="#ccc" fontSize={10}>Camera position</text>
          <line x1={10} y1={50} x2={26} y2={50} stroke="#FFD700" strokeWidth={2} strokeDasharray="4 2" />
          <text x={30} y={54} fill="#ccc" fontSize={10}>Camera path (eased)</text>
          <rect x={10} y={62} width={16} height={8} fill="#1c1c34" stroke="#FFD700" strokeWidth={1.5} rx={1} />
          <text x={30} y={70} fill="#ccc" fontSize={10}>Center building (1/row)</text>
          <rect x={10} y={78} width={16} height={8} fill="#1c1c34" stroke="#666" strokeWidth={0.5} rx={1} />
          <text x={30} y={86} fill="#ccc" fontSize={10}>Scattered buildings</text>
          <rect x={10} y={94} width={16} height={8} fill="#2a2a50" stroke="#4488FF" strokeWidth={1} rx={1} />
          <text x={30} y={102} fill="#ccc" fontSize={10}>Corridor walls (z=17-19.5)</text>
          <circle cx={18} cy={116} r={5} fill="none" stroke="#A855F7" strokeWidth={2} />
          <text x={30} y={120} fill="#ccc" fontSize={10}>Landmarks</text>
        </g>
      </svg>

      <div style={{ height: 24, marginTop: 8, fontSize: 13, color: '#aaa' }}>
        {hoveredBuilding ? (
          <>
            Layer z={generatedLayers[hoveredBuilding.layer].z} | Building #{hoveredBuilding.idx}
            {hoveredBuilding.idx === 0 ? ' (center)' : ''} |
            x={hoveredBuilding.data.x.toFixed(2)} | w={hoveredBuilding.data.width.toFixed(2)} |
            h={hoveredBuilding.data.height.toFixed(1)} | windows={hoveredBuilding.data.windows.length}
          </>
        ) : 'Hover over a building for details | Corridor walls are solid z=17→19.5'}
      </div>
    </div>
  )
}
