/**
 * Lantern Lab II — `?act=8b-lab2`. The Tangled sheet.
 *
 * Sheet one is the Korean catalogue. This one is the reference set: rounded
 * boxes lit from the inside out, in the cream→coral→rose spread those frames
 * actually use — plus the R6 drum at B3 brightness, which sheet one could only
 * show one variable at a time.
 *
 * The bottom half is the part that decides anything. A row of lanterns on a
 * black card tells you which SHAPE you like; a sky full of them at mixed
 * depths and mixed colours tells you whether the set works, which is the only
 * question the reference frames are actually posing. Everything above it is a
 * swatch book.
 *
 * Nothing here is imported by 8b.
 */
import { useMemo } from 'react'
import { seededRandom } from '../act8_55/constants'
import {
  BRIGHTNESS, COLORS, MIX, MIX_HEX, MIX_LIT_RANGE, ROUND, TANGLED, TANGLED_COLORS,
  TANGLED_MIX, PLATE_COLORS, PLATE_ENVELOPE, mixLit, type LanternDesign,
} from './lanternShapes'
import { HEADING_X, Label, LabCanvas, LabLantern, DesignRow, SHEET_SCALE } from './labKit'

const ROW_Y = { envelope: 8.8, picked: 5.5, shapes: 3.0, colour: 0.6 }

/** R6 drum at B3, as asked — across the warm end of sheet one's palette. */
const DRUM = ROUND[5]
const DRUM_LIT = BRIGHTNESS[2].lit   // 1.45
const PICKED_COLORS = [COLORS[0], COLORS[1], COLORS[2], COLORS[3]]

/** The one to judge colour on: the reference shape itself. */
const SWATCH = TANGLED[0]

/* ── The sky mock ────────────────────────────────────────────────── */

/**
 * A band of lanterns at mixed depth, size, shape and colour, laid out the way
 * the reference frames put them — dense and small toward the top, a few big
 * and close at the edges. Depth does the size work, so the near ones bloom
 * wider exactly as they do in the plates.
 *
 * This is the only part of either sheet that decides anything. A row on a
 * black card tells you which shape you like; a sky tells you whether the SET
 * works, which is the question the references are actually posing.
 *
 * Seeded, never `Math.random()` — these scenes freeze under `?t=` like every
 * other one, and a layout built from bare randomness gets a different result
 * in every tab.
 */
function SkyMock({ top, bottom, designs, hexAt, litAt, seed, count, heading, sub }: {
  top: number
  bottom: number
  designs: LanternDesign[]
  hexAt: (rand: () => number) => string
  litAt: (rand: () => number) => number
  seed: number
  count: number
  heading: string
  sub: string
}) {
  const items = useMemo(() => {
    const rand = seededRandom(seed)
    const out: {
      pos: [number, number, number]; scale: number; hex: string; shape: number
      lit: number; phase: number
    }[] = []
    for (let i = 0; i < count; i++) {
      // Bias upward: the swarm thins toward the bottom of frame, as it does
      // when you are standing under it looking up.
      const v = Math.pow(rand(), 0.72)
      const y = bottom + v * (top - bottom)
      const x = (rand() - 0.5) * 27
      // Depth does the size work — but all of it BEHIND the swatch plane. A
      // lantern in front of z=0 is nearer the lens than the rows above and
      // balloons off the bottom of the sheet.
      const z = -11 + Math.pow(rand(), 0.8) * 10.6
      const near = (z + 11) / 10.6
      out.push({
        pos: [x, y, z],
        scale: (0.34 + near * 0.5) * (0.74 + rand() * 0.6),
        hex: hexAt(rand),
        shape: Math.floor(rand() * designs.length),
        lit: litAt(rand),
        phase: rand() * Math.PI * 2,
      })
    }
    // Far ones first, so the transparent envelopes stack back to front.
    return out.sort((a, b) => a.pos[2] - b.pos[2])
  }, [top, bottom, designs, hexAt, litAt, seed, count])

  return (
    <group>
      <Label position={[HEADING_X, top - 0.5, 0]} lines={[heading, sub]} width={2.9} size={40} />
      {items.map((it, i) => (
        <LabLantern
          key={i} design={designs[it.shape]} position={it.pos} scale={it.scale}
          hex={it.hex} lit={it.lit} phase={it.phase} spin={false}
        />
      ))}
    </group>
  )
}

const tangledHex = (rand: () => number) =>
  TANGLED_COLORS[TANGLED_MIX[Math.floor(rand() * TANGLED_MIX.length)]].hex
const tangledLit = () => 1.15
const mixHex = () => MIX_HEX

/* ── The sheet ───────────────────────────────────────────────────── */

/**
 * The plate's envelope, at a size you can actually judge it at.
 *
 * `8b-plate` renders these at six to forty pixels, where a burner and a sheet
 * of hand-laid paper are indistinguishable from a blob. This row is the same
 * shading model at sheet scale: the hot hole at the bottom, the crown holding
 * the paper's own colour, the fibre and the glue seams.
 */
function PlateEnvelopeRow() {
  const shown = [TANGLED[0], TANGLED[3], TANGLED[1], TANGLED[4]]
  return (
    <group>
      <Label
        position={[HEADING_X, ROW_Y.envelope, 0]}
        lines={['PLATE ENVELOPE', 'burner below, paper above']} width={2.9} size={42}
      />
      {shown.map((d, i) => {
        const x = (i - (shown.length - 1) / 2) * 3.0
        return (
          <group key={d.id}>
            <LabLantern
              design={d} scale={SHEET_SCALE * 1.5} hex={PLATE_COLORS[1 + i]} lit={1.25}
              phase={i * 0.8} position={[x, ROW_Y.envelope, 0]} envelope={PLATE_SHEET_ENVELOPE}
            />
            <Label
              position={[x, ROW_Y.envelope - 1.5, 0]}
              lines={[`${d.id}  ${d.label}`]} width={2.8}
            />
          </group>
        )
      })}
    </group>
  )
}

/** The plate's treatment minus the instancing, which a single mesh cannot use. */
const PLATE_SHEET_ENVELOPE = { ...PLATE_ENVELOPE, instanced: false }

function SceneContent() {
  return (
    <>
      <PlateEnvelopeRow />

      {/* R6 @ B3 — one shape, one brightness, four colours. */}
      <group>
        <Label
          position={[HEADING_X, ROW_Y.picked, 0]}
          lines={['R6 @ B3', 'drum, brightness 1.45']} width={2.7} size={44}
        />
        {PICKED_COLORS.map((c, i) => {
          const x = (i - (PICKED_COLORS.length - 1) / 2) * 2.9
          return (
            <group key={c.id}>
              <LabLantern
                design={DRUM} scale={SHEET_SCALE} hex={c.hex} lit={DRUM_LIT} phase={i * 0.7}
                position={[x, ROW_Y.picked, 0]}
              />
              <Label
                position={[x, ROW_Y.picked - 1.15, 0]}
                lines={[`R6 · B3 · ${c.id}`, c.label]} width={2.7}
              />
            </group>
          )
        })}
      </group>

      <DesignRow
        designs={TANGLED} y={ROW_Y.shapes} spacing={2.9}
        heading="TANGLED" subheading="rounded box, lit inside-out"
        hex={TANGLED_COLORS[3].hex} lit={0.92}
      />

      {/* Palette on the reference shape. */}
      <group>
        <Label
          position={[HEADING_X, ROW_Y.colour, 0]}
          lines={['PALETTE', 'on T1 rounded box']} width={2.7} size={44}
        />
        {TANGLED_COLORS.map((c, i) => {
          const x = (i - (TANGLED_COLORS.length - 1) / 2) * 2.3
          return (
            <group key={c.id}>
              <LabLantern
                design={SWATCH} scale={SHEET_SCALE} hex={c.hex} lit={1.15} phase={i * 0.7}
                position={[x, ROW_Y.colour, 0]}
              />
              <Label position={[x, ROW_Y.colour - 1.15, 0]} lines={[`${c.id}  ${c.label}`]} width={2.2} />
            </group>
          )
        })}
      </group>

      <SkyMock
        top={-1.4} bottom={-6.1} designs={TANGLED} hexAt={tangledHex} litAt={tangledLit}
        seed={4821} count={74} heading="IN THE AIR" sub="Tangled set, mixed palette"
      />

      {/* THE MIX in the air — the five shapes from sheet one, always amber,
          brightness rolled per lantern. This is the set as it would actually
          fly: nobody's two lanterns the same, and none of them dim. */}
      <SkyMock
        top={-8.4} bottom={-13.4} designs={MIX} hexAt={mixHex} litAt={mixLit}
        seed={90210} count={84}
        heading="THE MIX, IN THE AIR"
        sub={`${MIX.map(d => d.id).join(' · ')} · amber · ${MIX_LIT_RANGE[0]}–${MIX_LIT_RANGE[1]}`}
      />
    </>
  )
}

export default function LanternLab2() {
  // A shade off pure black and toward the mauve those frames sit in — the
  // palette is half sky, and coral over #04070E is a different colour from
  // coral over dusk.
  return (
    <LabCanvas background="#0B0710" scroll={[-7.6, 4.6]}>
      <SceneContent />
    </LabCanvas>
  )
}
