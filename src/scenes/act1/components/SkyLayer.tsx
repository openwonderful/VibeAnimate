import React from 'react';

/**
 * SkyLayer — Full-viewport SVG overlay that adds a hanji (한지) paper texture.
 *
 * Uses SVG filters (feTurbulence + feColorMatrix) to create the subtle,
 * fibrous grain of traditional Korean mulberry-bark paper.  Rendered at
 * extremely low opacity so it never competes with the scene content, but
 * gives every layer beneath it a tactile, hand-made quality.
 *
 * z-index 95 — topmost decorative layer.
 */
const SkyLayer: React.FC = () => {
  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 95,
        pointerEvents: 'none',
        opacity: 0.06,
      }}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
    >
      <defs>
        {/* Primary hanji grain — high-frequency fractal noise that mimics
            the irregular fiber web visible in handmade mulberry paper. */}
        <filter id="hanji-texture" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves={4}
            stitchTiles="stitch"
            result="noise"
          />
          {/* Desaturate and boost luminance so the texture reads as
              neutral off-white fibres rather than coloured static. */}
          <feColorMatrix
            type="matrix"
            in="noise"
            values="
              0   0   0   0   0.96
              0   0   0   0   0.94
              0   0   0   0   0.91
              0   0   0   0.7 0
            "
            result="tinted"
          />
          {/* A second, coarser layer to suggest the thicker bark fibres
              that occasionally surface in genuine hanji sheets. */}
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.25"
            numOctaves={2}
            seed={3}
            stitchTiles="stitch"
            result="coarseNoise"
          />
          <feColorMatrix
            type="matrix"
            in="coarseNoise"
            values="
              0   0   0   0   1
              0   0   0   0   0.98
              0   0   0   0   0.95
              0   0   0   0.3 0
            "
            result="coarseTinted"
          />
          {/* Blend both fibre layers together */}
          <feBlend in="tinted" in2="coarseTinted" mode="multiply" result="combined" />
          {/* Subtle displacement so the fibre pattern isn't perfectly flat */}
          <feDisplacementMap
            in="combined"
            in2="coarseNoise"
            scale="2"
            xChannelSelector="R"
            yChannelSelector="G"
            result="displaced"
          />
        </filter>
      </defs>

      {/* Full-viewport rectangle carrying the paper-grain filter. */}
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        filter="url(#hanji-texture)"
        fill="transparent"
      />
    </svg>
  );
};

export default SkyLayer;
