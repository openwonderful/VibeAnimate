import React from 'react';
import { HWANG } from '../../../theme/colors';

/**
 * LatticePattern - Changho (창호) traditional Korean window lattice pattern,
 * rendered as a subtle overlay behind the title area.
 *
 * Uses an SVG pattern tile with intersecting grid lines and inscribed diamonds,
 * masked with a radial gradient vignette that fades to transparent at the edges.
 */

const LatticePattern: React.FC = () => {
  const patternId = 'changho-lattice';
  const maskId = 'lattice-vignette-mask';
  const gradientId = 'lattice-vignette-grad';

  return (
    <div
      style={{
        position: 'absolute',
        top: '28%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '35vw',
        height: '25vh',
        zIndex: 75,
        pointerEvents: 'none',
        opacity: 0.06,
      }}
      aria-hidden="true"
    >
      <svg
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Lattice pattern tile */}
          <pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width={30}
            height={30}
          >
            {/* Grid lines */}
            {/* Horizontal center line */}
            <line
              x1={0}
              y1={15}
              x2={30}
              y2={15}
              stroke={HWANG}
              strokeWidth={0.8}
            />
            {/* Vertical center line */}
            <line
              x1={15}
              y1={0}
              x2={15}
              y2={30}
              stroke={HWANG}
              strokeWidth={0.8}
            />

            {/* Diamond inscribed in each cell - connecting midpoints of cell edges */}
            {/* Top-left cell diamond */}
            <line x1={7.5} y1={0} x2={15} y2={7.5} stroke={HWANG} strokeWidth={0.8} />
            <line x1={15} y1={7.5} x2={7.5} y2={15} stroke={HWANG} strokeWidth={0.8} />
            <line x1={7.5} y1={15} x2={0} y2={7.5} stroke={HWANG} strokeWidth={0.8} />
            <line x1={0} y1={7.5} x2={7.5} y2={0} stroke={HWANG} strokeWidth={0.8} />

            {/* Top-right cell diamond */}
            <line x1={22.5} y1={0} x2={30} y2={7.5} stroke={HWANG} strokeWidth={0.8} />
            <line x1={30} y1={7.5} x2={22.5} y2={15} stroke={HWANG} strokeWidth={0.8} />
            <line x1={22.5} y1={15} x2={15} y2={7.5} stroke={HWANG} strokeWidth={0.8} />
            <line x1={15} y1={7.5} x2={22.5} y2={0} stroke={HWANG} strokeWidth={0.8} />

            {/* Bottom-left cell diamond */}
            <line x1={7.5} y1={15} x2={15} y2={22.5} stroke={HWANG} strokeWidth={0.8} />
            <line x1={15} y1={22.5} x2={7.5} y2={30} stroke={HWANG} strokeWidth={0.8} />
            <line x1={7.5} y1={30} x2={0} y2={22.5} stroke={HWANG} strokeWidth={0.8} />
            <line x1={0} y1={22.5} x2={7.5} y2={15} stroke={HWANG} strokeWidth={0.8} />

            {/* Bottom-right cell diamond */}
            <line x1={22.5} y1={15} x2={30} y2={22.5} stroke={HWANG} strokeWidth={0.8} />
            <line x1={30} y1={22.5} x2={22.5} y2={30} stroke={HWANG} strokeWidth={0.8} />
            <line x1={22.5} y1={30} x2={15} y2={22.5} stroke={HWANG} strokeWidth={0.8} />
            <line x1={15} y1={22.5} x2={22.5} y2={15} stroke={HWANG} strokeWidth={0.8} />
          </pattern>

          {/* Radial gradient for vignette mask */}
          <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity={1} />
            <stop offset="60%" stopColor="white" stopOpacity={0.8} />
            <stop offset="85%" stopColor="white" stopOpacity={0.3} />
            <stop offset="100%" stopColor="white" stopOpacity={0} />
          </radialGradient>

          {/* Mask using the radial gradient */}
          <mask id={maskId}>
            <rect width="100%" height="100%" fill={`url(#${gradientId})`} />
          </mask>
        </defs>

        {/* Pattern fill with vignette mask */}
        <rect
          width="100%"
          height="100%"
          fill={`url(#${patternId})`}
          mask={`url(#${maskId})`}
        />
      </svg>
    </div>
  );
};

export default LatticePattern;
