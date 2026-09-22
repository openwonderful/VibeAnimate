/**
 * Lantern Lab — `?act=8b-lab`. A contact sheet, not a shot.
 *
 * The Korean catalogue: every design in `lanternShapes.ts` laid out on one
 * page under 8b's exact background, exposure, bloom and vignette, so what you
 * are judging is what the scene will actually render. Four rows — angular,
 * round, colour, brightness — plus a strip along the bottom showing the shapes
 * in a figure's hand at 8b's real proportions, which is the only view that
 * answers the question that matters. Everything above that strip is at 3× life
 * size and will flatter a design that reads as a blob at forty metres.
 *
 * The Tangled set lives on sheet two (`?act=8b-lab2`); the shared machinery
 * for both is in `labKit.tsx`.
 *
 * Nothing here is imported by 8b. Picking a winner is a one-line change to
 * `LanternCrowd`'s geometry and palette; until then this file is inert.
 *
 * Each lantern turns slowly on its own axis and the whole sheet is frozen by
 * `?t=`, so `?t=0`, `?t=1.9`, `?t=3.8` give three different angles — which
 * matters for the faceted designs, where the silhouette changes completely
 * between face-on and corner-on.
 *
 * The sheet is taller than the frame: scroll with the wheel, a drag, the
 * arrow keys, or Home/End. `?scroll=<y>` opens at a position and skips the
 * easing, which is what keeps a screenshot of the bottom deterministic.
 */
import { useMemo } from 'react'
import { seededRandom } from '../act8_55/constants'
import {
  ANGULAR, BRIGHTNESS, COLORS, MIX, MIX_HEX, MIX_LIT_RANGE, ROUND, mixLit,
} from './lanternShapes'
import { HEADING_X, Label, LabCanvas, LabLantern, DesignRow, SHEET_SCALE, TrueScaleStrip } from './labKit'

const ROW_Y = {
  angular: 5.2, round: 2.9, colour: 0.6, bright: -1.7, scale: -5.5,
  mixHead: -7.9, mixRow: -9.7, mixGrid: -12.6, mixHand: -24.0,
}
const DEFAULT_COLOR = COLORS[0].hex

/* ── The mix ─────────────────────────────────────────────────────── */

/**
 * Five shapes, always amber, brightness drawn per lantern from 1.4–2.0. The
 * grid is 24 rolls of exactly that — what a random handful actually looks like,
 * rather than one of each in a tidy row, because the question is whether the
 * SET holds together and a tidy row can't answer it.
 */
function MixSection() {
  const rolls = useMemo(() => {
    const rand = seededRandom(31337)
    return Array.from({ length: 24 }, () => ({
      design: MIX[Math.floor(rand() * MIX.length)],
      lit: mixLit(rand),
      phase: rand() * Math.PI * 2,
    }))
  }, [])

  const COLS = 6
  const DX = 3.4
  const DY = 2.5

  return (
    <group>
      <Label
        position={[0, ROW_Y.mixHead, 0]}
        lines={['THE MIX', `${MIX.map(d => d.id).join(' · ')}  ·  amber  ·  ${MIX_LIT_RANGE[0]}–${MIX_LIT_RANGE[1]}`]}
        width={6.2} size={54}
      />

      {/* One of each, labelled — the vocabulary before the sample. */}
      {MIX.map((d, i) => {
        const x = (i - (MIX.length - 1) / 2) * 3.1
        return (
          <group key={d.id}>
            <LabLantern
              design={d} scale={SHEET_SCALE} hex={MIX_HEX} lit={1.7} phase={i * 0.7}
              position={[x, ROW_Y.mixRow, 0]}
            />
            <Label
              position={[x, ROW_Y.mixRow - 1.15, 0]}
              lines={[`${d.id}  ${d.label}`, 'at 1.70']} width={3.0}
            />
          </group>
        )
      })}

      {/* 24 rolls of the mix. */}
      {rolls.map((r, i) => {
        const x = ((i % COLS) - (COLS - 1) / 2) * DX
        const y = ROW_Y.mixGrid - Math.floor(i / COLS) * DY
        return (
          <group key={i}>
            <LabLantern
              design={r.design} scale={SHEET_SCALE} hex={MIX_HEX} lit={r.lit} phase={r.phase}
              position={[x, y, 0]}
            />
            <Label
              position={[x, y - 1.05, 0]}
              lines={[`${r.design.id} · ${r.lit.toFixed(2)}`]} width={2.0} size={44}
            />
          </group>
        )
      })}

      <TrueScaleStrip
        designs={MIX} y={ROW_Y.mixHand} spacing={2.4} hex={MIX_HEX} lit={1.7} shownAt={1.3}
      />
    </group>
  )
}

/* ── The sheet ───────────────────────────────────────────────────── */

function SceneContent() {
  const swatchDesign = ROUND[1]   // 풍등 — the neutral shape to judge colour on
  const trueScale = [
    ANGULAR[0], ANGULAR[1], ANGULAR[3], ROUND[0], ROUND[1], ROUND[2], ROUND[5], ROUND[6],
  ]

  return (
    <>
      <DesignRow designs={ANGULAR} y={ROW_Y.angular} spacing={2.9} heading="ANGULAR" hex={DEFAULT_COLOR} />
      <DesignRow designs={ROUND} y={ROW_Y.round} spacing={2.6} heading="ROUND" hex={DEFAULT_COLOR} />

      {/* Colour — one shape, so the only variable is the palette. */}
      <group>
        <Label
          position={[HEADING_X, ROW_Y.colour, 0]}
          lines={['COLOUR', `on ${swatchDesign.label}`]} width={2.6} size={44}
        />
        {COLORS.map((c, i) => {
          const x = (i - (COLORS.length - 1) / 2) * 2.5
          return (
            <group key={c.id}>
              <LabLantern
                design={swatchDesign} scale={SHEET_SCALE} hex={c.hex} phase={i * 0.7}
                position={[x, ROW_Y.colour, 0]}
              />
              <Label position={[x, ROW_Y.colour - 1.15, 0]} lines={[`${c.id}  ${c.label}`]} width={2.4} />
            </group>
          )
        })}
      </group>

      {/* Brightness — the ladder for "they can be brighter". */}
      <group>
        <Label
          position={[HEADING_X, ROW_Y.bright, 0]}
          lines={['BRIGHTNESS']} width={2.6} size={44}
        />
        {BRIGHTNESS.map((b, i) => {
          const x = (i - (BRIGHTNESS.length - 1) / 2) * 2.9
          return (
            <group key={b.id}>
              <LabLantern
                design={swatchDesign} scale={SHEET_SCALE} lit={b.lit} phase={i * 0.7} hex={DEFAULT_COLOR}
                position={[x, ROW_Y.bright, 0]}
              />
              <Label position={[x, ROW_Y.bright - 1.15, 0]} lines={[`${b.id}  ${b.label}`]} width={2.7} />
            </group>
          )
        })}
      </group>

      <TrueScaleStrip designs={trueScale} y={ROW_Y.scale} spacing={2.1} hex={DEFAULT_COLOR} />
      <MixSection />
    </>
  )
}

export default function LanternLab() {
  // Scroll range: 0 frames the catalogue, −18.3 the bottom of the mix.
  // `Home` and `End` jump; `?scroll=-14` opens partway down.
  return (
    <LabCanvas scroll={[-18.3, 0]}>
      <SceneContent />
    </LabCanvas>
  )
}
