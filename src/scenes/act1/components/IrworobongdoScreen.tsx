import React from 'react';
import {
  CHEONG,
  DANCHEONG_TEAL,
  DANCHEONG_GREEN,
  PALE_JADE,
  CINNABAR,
  WARM_CREAM,
  PINE_DARK,
} from '../../../theme/colors';

/**
 * IrworobongdoScreen - A ghostly rendering of the Irworobongdo (일월오봉도)
 * royal screen painting, used as a background watermark.
 *
 * The Irworobongdo depicts the sun, moon, five peaks, pine trees, and waves -
 * symbols of the Korean monarch's cosmic authority.
 */

const IrworobongdoScreen: React.FC = () => {
  const width = 600;
  const height = 400;

  // Five peak colors graduating across the composition
  const peakColors = [CHEONG, DANCHEONG_TEAL, DANCHEONG_GREEN, PALE_JADE, CHEONG];

  // Peak definitions: [centerX, topY, baseHalfWidth]
  const peaks: [number, number, number][] = [
    [120, 200, 60],   // leftmost, shortest
    [210, 160, 55],   // second, taller
    [300, 120, 65],   // center, tallest
    [390, 155, 55],   // fourth
    [480, 195, 60],   // rightmost, shortest
  ];

  // Pine tree: a simple stack of triangles on a trunk
  const PineTree: React.FC<{ x: number; y: number; scale?: number }> = ({
    x,
    y,
    scale = 1,
  }) => (
    <g transform={`translate(${x},${y}) scale(${scale})`}>
      {/* Trunk */}
      <rect x={-3} y={0} width={6} height={20} fill={PINE_DARK} opacity={0.6} />
      {/* Three layered triangle crowns */}
      <polygon points="-18,0 0,-30 18,0" fill={PINE_DARK} opacity={0.5} />
      <polygon points="-22,15 0,-18 22,15" fill={PINE_DARK} opacity={0.45} />
      <polygon points="-25,30 0,-5 25,30" fill={PINE_DARK} opacity={0.4} />
    </g>
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: '25%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '60vw',
        zIndex: 15,
        pointerEvents: 'none',
        opacity: 0.08,
      }}
      aria-hidden="true"
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* ============================================ */}
        {/*  Sun (left side)                              */}
        {/* ============================================ */}
        <g>
          <circle cx={100} cy={80} r={40} fill={CINNABAR} opacity={0.5} />
          {/* 8 sunbeams radiating outward */}
          {Array.from({ length: 8 }, (_, i) => {
            const angle = (i * 45 * Math.PI) / 180;
            const innerR = 44;
            const outerR = 64;
            const x1 = 100 + Math.cos(angle) * innerR;
            const y1 = 80 + Math.sin(angle) * innerR;
            const x2 = 100 + Math.cos(angle) * outerR;
            const y2 = 80 + Math.sin(angle) * outerR;
            return (
              <line
                key={`sunbeam-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={CINNABAR}
                strokeWidth={2}
                opacity={0.3}
                strokeLinecap="round"
              />
            );
          })}
        </g>

        {/* ============================================ */}
        {/*  Moon (right side)                            */}
        {/* ============================================ */}
        <g>
          <circle cx={500} cy={80} r={35} fill={WARM_CREAM} opacity={0.5} />
          {/* Crescent overlay - offset circle to create crescent */}
          <circle cx={514} cy={72} r={30} fill="#080E1F" opacity={0.6} />
        </g>

        {/* ============================================ */}
        {/*  Five Peaks                                   */}
        {/* ============================================ */}
        {peaks.map(([cx, topY, halfW], i) => {
          const baseY = 330;
          const points = `${cx - halfW},${baseY} ${cx},${topY} ${cx + halfW},${baseY}`;
          return (
            <polygon
              key={`peak-${i}`}
              points={points}
              fill={peakColors[i]}
              opacity={0.6}
            />
          );
        })}

        {/* Ridge lines on peaks for texture */}
        {peaks.map(([cx, topY], i) => {
          const baseY = 330;
          return (
            <line
              key={`ridge-${i}`}
              x1={cx}
              y1={topY}
              x2={cx}
              y2={baseY}
              stroke={WARM_CREAM}
              strokeWidth={0.5}
              opacity={0.15}
            />
          );
        })}

        {/* ============================================ */}
        {/*  Pine Trees (2 on each side)                  */}
        {/* ============================================ */}
        <PineTree x={70} y={240} scale={0.9} />
        <PineTree x={140} y={250} scale={0.75} />
        <PineTree x={460} y={250} scale={0.75} />
        <PineTree x={530} y={240} scale={0.9} />

        {/* ============================================ */}
        {/*  Waves at base                                */}
        {/* ============================================ */}
        <path
          d="M 0 360 Q 50 340 100 360 Q 150 380 200 360 Q 250 340 300 360 Q 350 380 400 360 Q 450 340 500 360 Q 550 380 600 360"
          fill="none"
          stroke={CHEONG}
          strokeWidth={2}
          opacity={0.4}
        />
        <path
          d="M 0 375 Q 50 355 100 375 Q 150 395 200 375 Q 250 355 300 375 Q 350 395 400 375 Q 450 355 500 375 Q 550 395 600 375"
          fill="none"
          stroke={CHEONG}
          strokeWidth={1.5}
          opacity={0.3}
        />
        <path
          d="M 0 388 Q 50 372 100 388 Q 150 400 200 388 Q 250 372 300 388 Q 350 400 400 388 Q 450 372 500 388 Q 550 400 600 388"
          fill="none"
          stroke={CHEONG}
          strokeWidth={1}
          opacity={0.2}
        />
      </svg>
    </div>
  );
};

export default IrworobongdoScreen;
