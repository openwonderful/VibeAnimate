import StageSymbols from '../act2/stage/StageSymbols'

/**
 * Isolated view of the Arirang (아리랑) symbols on a black background.
 * Use ?scene=arirang_symbol to access.
 */
export default function ArirangSymbol() {
  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#000000',
      }}
    >
      <StageSymbols
        symbols={[
          { cx: 360, cy: 540, size: 250, variant: 'ring', holeRatio: 0.54 },
          { cx: 960, cy: 540, size: 250, variant: 'barred-circle', barCount: 2, gapRatio: 0.13, curveAmount: 35 },
          { cx: 1560, cy: 540, size: 250, variant: 'grid-circle', barCount: 2, gapRatio: 0.13, verticalBarPos: 0.50, curveAmount: 35 },
        ]}
        opacity={0.95}
        glowBlur={12}
        pulseDuration={0}
      />
    </div>
  )
}
