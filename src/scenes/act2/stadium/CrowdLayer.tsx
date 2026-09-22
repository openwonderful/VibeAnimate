import React, { useMemo } from 'react';
import { generatePerspectiveCrowdPositions } from '../../../utils/svgHelpers';
import { HEUK, CONCERT_WHITE } from '../../../theme/colors';
import { useAnimTime } from '../../../hooks/useAnimTime';
import { jumpBounce } from '../../../utils/animHelpers';

/**
 * CrowdLayer — ~580 perspective-scaled silhouette figures filling the
 * entire viewport bowl from stage (y=140) to near viewer (y=790).
 *
 * Four silhouette variants (arms-up, standing, phone, arms-wide) placed
 * via generatePerspectiveCrowdPositions. Scale increases with distance
 * from stage creating depth perspective. Position-based wave delay on
 * the jump animation creates a natural stadium-wave effect.
 *
 * Includes ~60 phone screen rectangles in mid/near crowd and thin
 * security barrier lines.
 *
 * z-index 30 — behind the ARMY bomb ocean (35).
 */

const renderSilhouette = (type: number): React.ReactNode => {
  switch (type) {
    case 0:
      // Arms up
      return (
        <>
          <circle cx={5} cy={2} r={1.8} />
          <rect x={3} y={4} width={4} height={7} rx={1} />
          <line x1={3} y1={5} x2={1} y2={0} strokeWidth={1.2} stroke={HEUK} />
          <line x1={7} y1={5} x2={9} y2={0} strokeWidth={1.2} stroke={HEUK} />
          <line x1={4} y1={11} x2={3} y2={16} strokeWidth={1.2} stroke={HEUK} />
          <line x1={6} y1={11} x2={7} y2={16} strokeWidth={1.2} stroke={HEUK} />
        </>
      );
    case 1:
      // Standing
      return (
        <>
          <circle cx={5} cy={2} r={1.8} />
          <rect x={3} y={4} width={4} height={7} rx={1} />
          <line x1={3} y1={5} x2={1} y2={9} strokeWidth={1.2} stroke={HEUK} />
          <line x1={7} y1={5} x2={9} y2={9} strokeWidth={1.2} stroke={HEUK} />
          <line x1={4} y1={11} x2={3} y2={16} strokeWidth={1.2} stroke={HEUK} />
          <line x1={6} y1={11} x2={7} y2={16} strokeWidth={1.2} stroke={HEUK} />
        </>
      );
    case 2:
      // Phone held up
      return (
        <>
          <circle cx={5} cy={2} r={1.8} />
          <rect x={3} y={4} width={4} height={7} rx={1} />
          <line x1={3} y1={5} x2={2} y2={8} strokeWidth={1.2} stroke={HEUK} />
          <line x1={7} y1={5} x2={8} y2={0} strokeWidth={1.2} stroke={HEUK} />
          <rect x={7} y={-1} width={2} height={3} rx={0.3} />
          <line x1={4} y1={11} x2={3} y2={16} strokeWidth={1.2} stroke={HEUK} />
          <line x1={6} y1={11} x2={7} y2={16} strokeWidth={1.2} stroke={HEUK} />
        </>
      );
    case 3:
    default:
      // Arms wide
      return (
        <>
          <circle cx={5} cy={2} r={1.8} />
          <rect x={3} y={4} width={4} height={7} rx={1} />
          <line x1={3} y1={5} x2={0} y2={4} strokeWidth={1.2} stroke={HEUK} />
          <line x1={7} y1={5} x2={10} y2={4} strokeWidth={1.2} stroke={HEUK} />
          <line x1={4} y1={11} x2={3} y2={16} strokeWidth={1.2} stroke={HEUK} />
          <line x1={6} y1={11} x2={7} y2={16} strokeWidth={1.2} stroke={HEUK} />
        </>
      );
  }
};

const CrowdLayer: React.FC = () => {
  const time = useAnimTime();
  const figures = useMemo(() => generatePerspectiveCrowdPositions(303), []);

  // Collect phone screen positions: every ~10th figure in mid and near bands
  const phoneScreens = useMemo(() => {
    const screens: { x: number; y: number; scale: number }[] = [];
    figures.forEach((fig, i) => {
      if (i % 10 === 0 && fig.y > 350) {
        screens.push({
          x: fig.x + 7 * fig.scale,
          y: fig.y - 1 * fig.scale,
          scale: fig.scale,
        });
      }
    });
    return screens;
  }, [figures]);

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 30,
        pointerEvents: 'none',
      }}
      viewBox="0 0 1920 1080"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Security barrier lines at band boundaries */}
      <line
        x1={0} y1={350} x2={1920} y2={350}
        stroke="white" strokeWidth={0.5} opacity={0.06}
      />
      <line
        x1={0} y1={600} x2={1920} y2={600}
        stroke="white" strokeWidth={0.5} opacity={0.06}
      />

      {/* Radial lines from stage center fanning outward */}
      <line
        x1={960} y1={280} x2={200} y2={800}
        stroke="white" strokeWidth={0.5} opacity={0.04}
      />
      <line
        x1={960} y1={280} x2={960} y2={800}
        stroke="white" strokeWidth={0.5} opacity={0.04}
      />
      <line
        x1={960} y1={280} x2={1720} y2={800}
        stroke="white" strokeWidth={0.5} opacity={0.04}
      />

      {/* Crowd figures */}
      {figures.map((fig, i) => {
        const opacity = 0.75 + (fig.y - 140) / (790 - 140) * 0.10;
        const jumpY = jumpBounce(time, 0.8, 10, fig.jumpDelay);
        return (
          <g
            key={`crowd-${i}`}
            transform={`translate(0, ${jumpY})`}
          >
            <g
              transform={`translate(${fig.x}, ${fig.y}) scale(${fig.scale})`}
              fill={HEUK}
              opacity={Math.min(0.85, Math.max(0.75, opacity))}
            >
              {renderSilhouette(fig.type)}
            </g>
          </g>
        );
      })}

      {/* Phone screens scattered in mid/near crowd */}
      {phoneScreens.map((ps, i) => (
        <rect
          key={`phone-scr-${i}`}
          x={ps.x}
          y={ps.y}
          width={1.5 * ps.scale}
          height={2.5 * ps.scale}
          rx={0.2 * ps.scale}
          fill={CONCERT_WHITE}
          opacity={0.5}
        />
      ))}
    </svg>
  );
};

export default CrowdLayer;
