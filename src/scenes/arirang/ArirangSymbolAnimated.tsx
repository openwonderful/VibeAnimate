import { seededRandom } from '../../utils/svgHelpers'
import StageSymbols, { type SymbolConfig } from '../act2/stage/StageSymbols'
import { ARIRANG_RED, CONCERT_CYAN, CONCERT_MAGENTA, HWANG } from '../../theme/colors'

/**
 * Animated Arirang (아리랑) symbol showcase — epic multi-layered scene.
 *
 * Layers (bottom → top):
 *  1. Cosmic background — radial gradient + nebula blobs + star field
 *  2. Under-symbol effects — light rays, glow halos, arcane circles,
 *     orbit rings, shockwave rings
 *  3. Chromatic aberration — red & cyan offset copies of the symbols
 *  4. Main symbols — StageSymbols with heavy glow + pulse
 *  5. Over-symbol effects — energy arcs, rising particles, anamorphic flares,
 *     sparkle points, scan line
 *  6. Vignette overlay
 *
 * Access via ?scene=arirang_animated
 */

const SYMBOLS: SymbolConfig[] = [
  { cx: 360, cy: 540, size: 250, variant: 'ring', holeRatio: 0.54 },
  { cx: 960, cy: 540, size: 250, variant: 'barred-circle', barCount: 2, gapRatio: 0.13, curveAmount: 35 },
  { cx: 1560, cy: 540, size: 250, variant: 'grid-circle', barCount: 2, gapRatio: 0.13, verticalBarPos: 0.50, curveAmount: 35 },
]

export default function ArirangSymbolAnimated({
  immediate = false,
  /** Seconds subtracted from every animation-delay (negative CSS delay), so
   *  scenes whose local clocks start at different song positions can share
   *  one absolute cycle phase. Act2_2_B passes its songOffset: the 2.1-zoom
   *  → 2.2 cut in the master video then lands mid-cycle instead of visibly
   *  restarting every loop. */
  cycleOffset = 0,
}: { immediate?: boolean; cycleOffset?: number } = {}) {
  const rand = seededRandom(777)
  /** animationDelay helper: authored delay shifted by the cycle offset. */
  const dl = (base: number) => `${(base - cycleOffset).toFixed(3)}s`

  // ── Star field ──────────────────────────────────────────────────
  const stars = Array.from({ length: 100 }, () => ({
    cx: rand() * 1920,
    cy: rand() * 1080,
    r: rand() * 1.5 + 0.3,
    opacity: rand() * 0.35 + 0.08,
    delay: rand() * 8,
    duration: rand() * 4 + 2.5,
  }))

  // ── Rising particles per symbol — mixed colors ──────────────────
  const particles = SYMBOLS.flatMap((sym) =>
    Array.from({ length: 25 }, () => {
      const angle = rand() * Math.PI * 2
      const dist = rand() * sym.size * 0.6
      const roll = rand()
      // 35% red, 30% gold, 20% white, 15% cyan
      const [hue, sat, lightness] = roll < 0.35
        ? [5, 85, 50 + rand() * 15]
        : roll < 0.65
          ? [42, 90, 55 + rand() * 15]
          : roll < 0.85
            ? [45, 10, 85 + rand() * 10]
            : [185, 75, 55 + rand() * 15]
      return {
        cx: sym.cx + Math.cos(angle) * dist,
        cy: sym.cy + Math.sin(angle) * dist,
        r: rand() * 2 + 0.5,
        delay: rand() * 8,
        duration: rand() * 4 + 3,
        color: `hsl(${hue}, ${sat}%, ${lightness}%)`,
      }
    })
  )

  // ── Sparkle points — bright white diamond flashes ───────────────
  const sparkles = SYMBOLS.flatMap((sym) =>
    Array.from({ length: 10 }, () => {
      const angle = rand() * Math.PI * 2
      const dist = sym.size * (0.3 + rand() * 0.8)
      return {
        cx: sym.cx + Math.cos(angle) * dist,
        cy: sym.cy + Math.sin(angle) * dist,
        r: rand() * 2.5 + 1,
        delay: rand() * 7,
        duration: rand() * 2 + 1.5,
      }
    })
  )

  // ── Orbit rings (close, bright, fast) — boosted visibility ──────
  const orbitRings = SYMBOLS.flatMap((sym) => [
    { cx: sym.cx, cy: sym.cy, r: sym.size + 35, dash: '15 25', dur: 40, rev: false, color: CONCERT_CYAN, op: 0.40, sw: 1.5 },
    { cx: sym.cx, cy: sym.cy, r: sym.size + 65, dash: '8 22', dur: 55, rev: true, color: CONCERT_MAGENTA, op: 0.32, sw: 1.0 },
    { cx: sym.cx, cy: sym.cy, r: sym.size + 95, dash: '4 18', dur: 75, rev: false, color: HWANG, op: 0.22, sw: 0.7 },
  ])

  // ── Arcane circles (large, faint, slow) — gold-tinted ───────────
  const arcaneCircles = SYMBOLS.flatMap((sym) =>
    [1.6, 1.85, 2.1, 2.4].map((scale, ri) => ({
      cx: sym.cx, cy: sym.cy,
      r: sym.size * scale,
      dash: `${80 + ri * 30} ${40 + ri * 20}`,
      dur: 80 + ri * 25,
      rev: ri % 2 === 1,
      op: 0.07 - ri * 0.01,
      sw: 0.5,
    }))
  )

  // ── Connecting energy arcs ──────────────────────────────────────
  const arcs = [
    { d: 'M 360 540 Q 660 320 960 540', delay: 0 },
    { d: 'M 960 540 Q 1260 320 1560 540', delay: 0.7 },
    { d: 'M 360 540 Q 960 820 1560 540', delay: 1.4 },
  ]

  // ── Light rays per symbol — mixed red / gold / white ────────────
  const rays = SYMBOLS.flatMap((sym) =>
    Array.from({ length: 16 }, (_, ri) => {
      const angle = (ri / 16) * Math.PI * 2
      const innerR = sym.size * 1.05
      const outerR = sym.size * 2.8
      const color = ri % 5 === 0 ? '#FFFFFF' : ri % 3 === 0 ? HWANG : ARIRANG_RED
      return {
        x1: sym.cx + Math.cos(angle) * innerR,
        y1: sym.cy + Math.sin(angle) * innerR,
        x2: sym.cx + Math.cos(angle) * outerR,
        y2: sym.cy + Math.sin(angle) * outerR,
        delay: ri * 0.12,
        duration: 3 + ri * 0.1,
        color,
      }
    })
  )

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      overflow: 'hidden', background: '#000',
      animation: immediate ? undefined : 'arirang-emerge-scene 2.5s cubic-bezier(0.23, 1, 0.32, 1) both',
    }}>

      {/* ═══ Layer 1: Background + Stars + Nebula ═══════════════════ */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1 }}
        viewBox="0 0 1920 1080" preserveAspectRatio="none"
      >
        <defs>
          <radialGradient id="arirang-bg" cx="960" cy="540" r="960" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0A0318" />
            <stop offset="60%" stopColor="#050210" />
            <stop offset="100%" stopColor="#000000" />
          </radialGradient>
        </defs>

        <rect width="1920" height="1080" fill="url(#arirang-bg)" />

        {/* Nebula blobs — soft colored hazes drifting behind symbols */}
        {SYMBOLS.map((sym, i) => (
          <ellipse key={`neb-${i}`} cx={sym.cx} cy={sym.cy}
            rx={sym.size * 2.5} ry={sym.size * 2}
            fill={i === 0 ? '#2A0F15' : i === 1 ? '#1A0A2A' : '#2A1A08'}
            opacity={0.15}
            style={{
              animation: `arirang-nebula ${20 + i * 5}s ease-in-out infinite`,
              animationDelay: dl(i * 3),
            }}
          />
        ))}

        {/* Star field */}
        {stars.map((s, i) => (
          <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="#fff" opacity={s.opacity}
            style={{
              animationName: 'twinkle-slow',
              animationDuration: `${s.duration}s`,
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
              animationDelay: dl(s.delay),
            }}
          />
        ))}
      </svg>

      {/* ═══ Layer 2: Under-symbol effects ══════════════════════════ */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 5, pointerEvents: 'none' }}
        viewBox="0 0 1920 1080" preserveAspectRatio="none"
      >
        <defs>
          {/* Warm glow halos: white-hot center → gold → red edge → transparent */}
          {SYMBOLS.map((sym, i) => (
            <radialGradient key={i} id={`arirang-halo-${i}`}
              cx={sym.cx} cy={sym.cy} r={sym.size * 1.5} gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.2} />
              <stop offset="20%" stopColor={HWANG} stopOpacity={0.2} />
              <stop offset="55%" stopColor={ARIRANG_RED} stopOpacity={0.1} />
              <stop offset="100%" stopColor={ARIRANG_RED} stopOpacity={0} />
            </radialGradient>
          ))}
        </defs>

        {/* Light rays — 16 per symbol, mixed red/gold/white starburst */}
        {rays.map((ray, i) => (
          <line key={`ray-${i}`}
            x1={ray.x1} y1={ray.y1} x2={ray.x2} y2={ray.y2}
            stroke={ray.color} strokeWidth={1.5}
            opacity={ray.color === '#FFFFFF' ? 0.06 : 0.05}
            style={{
              animationName: 'arirang-ray-pulse',
              animationDuration: `${ray.duration}s`,
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
              animationDelay: dl(ray.delay),
            }}
          />
        ))}

        {/* Inner glow halos — warm gradient */}
        {SYMBOLS.map((sym, i) => (
          <circle key={`halo-${i}`} cx={sym.cx} cy={sym.cy} r={sym.size * 1.4}
            fill={`url(#arirang-halo-${i})`}
            style={{
              transformBox: 'fill-box',
              transformOrigin: 'center',
              animationName: 'arirang-glow-breathe',
              animationDuration: '3.5s',
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
              animationDelay: dl(i * 0.6),
            }}
          />
        ))}

        {/* Arcane circles — outer, gold-tinted, slow rotation */}
        {arcaneCircles.map((ac, i) => (
          <circle key={`arc-${i}`} cx={ac.cx} cy={ac.cy} r={ac.r}
            fill="none" stroke={HWANG} strokeWidth={ac.sw}
            strokeDasharray={ac.dash} opacity={ac.op}
            style={{
              transformBox: 'fill-box',
              transformOrigin: 'center',
              animationName: 'arirang-orbit',
              animationDuration: `${ac.dur}s`,
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
              animationDirection: ac.rev ? 'reverse' : 'normal',
              animationDelay: dl(0),
            }}
          />
        ))}

        {/* Orbit rings — closer, brighter, faster */}
        {orbitRings.map((ring, i) => (
          <circle key={`orb-${i}`} cx={ring.cx} cy={ring.cy} r={ring.r}
            fill="none" stroke={ring.color} strokeWidth={ring.sw}
            strokeDasharray={ring.dash} opacity={ring.op}
            style={{
              transformBox: 'fill-box',
              transformOrigin: 'center',
              animationName: 'arirang-orbit',
              animationDuration: `${ring.dur}s`,
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
              animationDirection: ring.rev ? 'reverse' : 'normal',
              animationDelay: dl(0),
            }}
          />
        ))}

        {/* Shockwave rings — gold tint, 2 per symbol, staggered */}
        {SYMBOLS.flatMap((sym, si) =>
          [0, 2.5].map((baseDelay, di) => (
            <circle key={`shock-${si}-${di}`} cx={sym.cx} cy={sym.cy} r={sym.size}
              fill="none" stroke={HWANG} strokeWidth={2}
              style={{
                transformBox: 'fill-box',
                transformOrigin: 'center',
                animationName: 'arirang-shockwave',
                animationDuration: '5s',
                animationTimingFunction: 'ease-out',
                animationIterationCount: 'infinite',
                animationDelay: dl(si * 1.2 + baseDelay),
              }}
            />
          ))
        )}
      </svg>

      {/* ═══ Layer 3: Chromatic aberration — Red channel ════════════ */}
      <div style={{
        position: 'absolute', inset: 0,
        mixBlendMode: 'screen',
        opacity: 0.3,
        zIndex: 10,
        animationName: 'arirang-chromatic-r',
        animationDuration: '4s',
        animationTimingFunction: 'ease-in-out',
        animationIterationCount: 'infinite',
        animationDelay: dl(0),
      }}>
        <StageSymbols symbols={SYMBOLS} color="#FF2020" opacity={0.7} glowBlur={6} pulseDuration={0} />
      </div>

      {/* ═══ Layer 4: Chromatic aberration — Cyan channel ═══════════ */}
      <div style={{
        position: 'absolute', inset: 0,
        mixBlendMode: 'screen',
        opacity: 0.3,
        zIndex: 11,
        animationName: 'arirang-chromatic-b',
        animationDuration: '4s',
        animationTimingFunction: 'ease-in-out',
        animationIterationCount: 'infinite',
        animationDelay: dl(0),
      }}>
        <StageSymbols symbols={SYMBOLS} color="#2060FF" opacity={0.7} glowBlur={6} pulseDuration={0} />
      </div>

      {/* ═══ Layer 5: Main symbols ══════════════════════════════════ */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 15 }}>
        <StageSymbols symbols={SYMBOLS} color={ARIRANG_RED} opacity={0.95} glowBlur={22} pulseDuration={2.5} delayOffset={cycleOffset} />
      </div>

      {/* ═══ Layer 6: Over-symbol effects ═══════════════════════════ */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 18, pointerEvents: 'none' }}
        viewBox="0 0 1920 1080" preserveAspectRatio="none"
      >
        <defs>
          {/* Scan line gradient — white-gold */}
          <linearGradient id="arirang-scan-grad" x1="0" y1="0" x2="1920" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="15%" stopColor={HWANG} stopOpacity={0.4} />
            <stop offset="50%" stopColor="#ffffff" />
            <stop offset="85%" stopColor={HWANG} stopOpacity={0.4} />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
          {/* Anamorphic lens flare — horizontal white-gold streak */}
          <linearGradient id="arirang-flare-h" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor={HWANG} stopOpacity={0} />
            <stop offset="25%" stopColor={HWANG} stopOpacity={0.3} />
            <stop offset="50%" stopColor="#ffffff" stopOpacity={0.85} />
            <stop offset="75%" stopColor={HWANG} stopOpacity={0.3} />
            <stop offset="100%" stopColor={HWANG} stopOpacity={0} />
          </linearGradient>
          {/* Soft round glow behind lens flare */}
          <radialGradient id="arirang-flare-soft">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={0.6} />
            <stop offset="40%" stopColor={HWANG} stopOpacity={0.15} />
            <stop offset="100%" stopColor={HWANG} stopOpacity={0} />
          </radialGradient>
        </defs>

        {/* Energy arcs between symbols — gold primary */}
        {arcs.map((arc, i) => (
          <path key={`earc-${i}`} d={arc.d}
            fill="none" stroke={HWANG} strokeWidth={1.2} opacity={0.18}
            strokeDasharray="6 30"
            style={{
              animationName: 'arirang-energy-flow',
              animationDuration: '3s',
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
              animationDelay: dl(arc.delay),
            }}
          />
        ))}
        {/* Second set of arcs — cyan accent, offset timing */}
        {arcs.map((arc, i) => (
          <path key={`earc2-${i}`} d={arc.d}
            fill="none" stroke={CONCERT_CYAN} strokeWidth={0.6} opacity={0.10}
            strokeDasharray="3 40"
            style={{
              animationName: 'arirang-energy-flow',
              animationDuration: '4s',
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
              animationDelay: dl(arc.delay + 1.5),
            }}
          />
        ))}

        {/* Rising particles — mixed red/gold/white/cyan */}
        {particles.map((p, i) => (
          <circle key={`p-${i}`} cx={p.cx} cy={p.cy} r={p.r}
            fill={p.color}
            style={{
              animationName: 'arirang-particle-rise',
              animationDuration: `${p.duration}s`,
              animationTimingFunction: 'ease-out',
              animationIterationCount: 'infinite',
              animationDelay: dl(p.delay),
            }}
          />
        ))}

        {/* Sparkle points — white diamond flashes */}
        {sparkles.map((s, i) => (
          <circle key={`sp-${i}`} cx={s.cx} cy={s.cy} r={s.r}
            fill="#ffffff"
            style={{
              animationName: 'arirang-sparkle',
              animationDuration: `${s.duration}s`,
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
              animationDelay: dl(s.delay),
            }}
          />
        ))}

        {/* Anamorphic lens flares — horizontal cinematic streaks */}
        {SYMBOLS.map((sym, i) => (
          <g key={`flare-${i}`}>
            {/* Soft round glow behind */}
            <circle cx={sym.cx} cy={sym.cy} r={25}
              fill="url(#arirang-flare-soft)"
              style={{
                transformBox: 'fill-box',
                transformOrigin: 'center',
                animationName: 'arirang-lens-flare',
                animationDuration: '4s',
                animationTimingFunction: 'ease-in-out',
                animationIterationCount: 'infinite',
                animationDelay: dl(i * 0.8),
              }}
            />
            {/* Wide horizontal streak */}
            <ellipse cx={sym.cx} cy={sym.cy} rx={140} ry={2.5}
              fill="url(#arirang-flare-h)"
              style={{
                transformBox: 'fill-box',
                transformOrigin: 'center',
                animationName: 'arirang-flare-breathe',
                animationDuration: '4s',
                animationTimingFunction: 'ease-in-out',
                animationIterationCount: 'infinite',
                animationDelay: dl(i * 0.8),
              }}
            />
          </g>
        ))}

        {/* Horizontal scan line */}
        <rect x={0} y={0} width={1920} height={2}
          fill="url(#arirang-scan-grad)" opacity={0.3}
          style={{
            animationName: 'arirang-scan',
            animationDuration: '8s',
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
            animationDelay: dl(0),
          }}
        />
      </svg>

      {/* ═══ Layer 7: Vignette ══════════════════════════════════════ */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(5,2,16,0.55) 100%)',
      }} />
    </div>
  )
}
