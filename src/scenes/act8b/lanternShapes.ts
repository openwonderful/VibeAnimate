/**
 * Lantern designs on offer — the catalogue the Lantern Lab (`?act=8b-lab`)
 * lays out for a decision. Nothing here is wired into 8b.
 *
 * Every design is a lathe: a profile revolved N times. That one representation
 * covers both families the choice is between —
 *
 *   few segments + flat normals   → hard edges and straight facets. A square
 *                                   tube is a lathe with 4 segments; a
 *                                   hexagonal palace lantern is 6.
 *   many segments + smooth normals → the round family.
 *
 * — and it means whichever one wins drops straight into 8b's instanced path
 * without a second code path, because it is the same geometry class the scene
 * already draws.
 *
 * Profiles span y −0.46…0.46 (0.92 tall before the per-instance scale), x is
 * the radius. First point is the crown, last is the mouth; the mouth stays
 * open, which is what a lantern is and what lets you see up into one.
 */
import * as THREE from 'three'

export type LanternDesign = {
  id: string
  /** Korean name where there is one, then plain English. */
  label: string
  note: string
  profile: [number, number][]
  segments: number
  /** Hard facets vs a smooth revolution. */
  faceted: boolean
  /**
   * Struts the shader draws around the circumference; 0 = none. On a faceted
   * design set this to `segments` and they land on the panel edges, which is
   * the frame — and, under an unlit material, most of what makes a flat side
   * read as flat.
   */
  ribs: number
  /**
   * Where the struts sit around the circumference, as a fraction of one
   * spacing. 0.5 (the default) puts them mid-panel, which is what you want on
   * a revolved shape; 0.0 puts them on the CORNERS, which is where the frame
   * of a squared-off lantern actually is.
   */
  ribPhase?: number
  /**
   * Superellipse exponent applied to the cross-section: 2 (or absent) leaves
   * it circular, 4 gives the rounded square the Tangled lanterns are, 8 is
   * nearly a hard square with filleted corners.
   *
   * This is the one thing a lathe alone cannot do — a revolution is a circle by
   * definition — so the radius gets warped by angle afterwards. Everything
   * downstream (uv, instancing, the shader) is untouched.
   */
  squircle?: number
  /** Which shading model the envelope uses. See `makeEnvelopeMaterial`. */
  style?: 'hanji' | 'tangled'
  /**
   * Dark, non-glowing furniture: end caps and a hanging tassel. Only the
   * 청사초롱 carries it, and it is half of why that one reads as a lantern
   * rather than a glowing egg — the silhouette gets a top, a bottom and a
   * dangle, none of which the envelope can supply.
   */
  hardware?: {
    capR: number
    capH: number
    /** ±y of the two caps; the lower one is drawn slightly narrower. */
    capY: number
    tasselR: number
    tasselLen: number
    tasselY: number
  }
}

/* ── Angular: strict lines, flat panels ──────────────────────────── */

export const ANGULAR: LanternDesign[] = [
  {
    id: 'A1',
    label: '사각등 · square box',
    note: 'four flat panels, flat lid',
    profile: [[0.004, 0.46], [0.235, 0.46], [0.235, -0.36], [0.208, -0.44], [0.208, -0.46]],
    segments: 4, faceted: true, ribs: 4,
  },
  {
    id: 'A2',
    label: '육각등 · hexagonal',
    note: 'palace lantern, six panels, shouldered',
    profile: [
      [0.004, 0.46], [0.150, 0.445], [0.242, 0.375], [0.262, 0.27],
      [0.262, -0.20], [0.232, -0.36], [0.206, -0.44], [0.206, -0.46],
    ],
    segments: 6, faceted: true, ribs: 6,
  },
  {
    id: 'A3',
    label: '각등 · pagoda cap',
    note: 'square body under a pitched roof',
    profile: [
      [0.004, 0.50], [0.150, 0.30], [0.268, 0.14], [0.240, 0.10],
      [0.240, -0.26], [0.212, -0.40], [0.206, -0.46],
    ],
    segments: 4, faceted: true, ribs: 4,
  },
  {
    id: 'A4',
    label: '팔각등 · octagonal barrel',
    note: 'eight facets with a belly — angular but not boxy',
    profile: [
      [0.004, 0.46], [0.130, 0.436], [0.216, 0.372], [0.266, 0.256],
      [0.284, 0.08], [0.272, -0.10], [0.238, -0.26], [0.202, -0.39],
      [0.190, -0.46],
    ],
    segments: 8, faceted: true, ribs: 8,
  },
  {
    id: 'A5',
    label: '마름등 · diamond',
    note: 'widest at the waist, points at both ends',
    profile: [[0.004, 0.48], [0.166, 0.24], [0.292, 0.00], [0.196, -0.30], [0.152, -0.46]],
    segments: 6, faceted: true, ribs: 6,
  },
]

/* ── Round: revolved, smooth ─────────────────────────────────────── */

export const ROUND: LanternDesign[] = [
  {
    id: 'R1',
    label: 'egg (current 8b)',
    note: 'domed crown, belly, waisted mouth',
    profile: [
      [0.000, 0.460], [0.062, 0.452], [0.118, 0.430], [0.170, 0.392],
      [0.216, 0.336], [0.248, 0.264], [0.268, 0.178], [0.276, 0.086],
      [0.274, -0.010], [0.262, -0.106], [0.240, -0.196], [0.212, -0.276],
      [0.190, -0.342], [0.178, -0.400], [0.180, -0.440], [0.186, -0.460],
    ],
    segments: 20, faceted: false, ribs: 8,
  },
  {
    id: 'R2',
    label: '풍등 · true sky lantern',
    note: 'straight-sided cylinder, rounded shoulders — the real thing',
    profile: [
      [0.000, 0.460], [0.088, 0.452], [0.164, 0.418], [0.208, 0.362],
      [0.224, 0.296], [0.228, 0.10], [0.228, -0.14], [0.224, -0.30],
      [0.214, -0.40], [0.206, -0.446], [0.206, -0.460],
    ],
    segments: 20, faceted: false, ribs: 10,
  },
  {
    id: 'R3',
    label: '수박등 · globe',
    note: 'watermelon lantern — near-spherical, small mouth',
    profile: [
      [0.000, 0.440], [0.108, 0.424], [0.198, 0.372], [0.264, 0.290],
      [0.300, 0.176], [0.310, 0.032], [0.294, -0.114], [0.250, -0.244],
      [0.184, -0.348], [0.128, -0.412], [0.116, -0.440],
    ],
    segments: 22, faceted: false, ribs: 12,
  },
  {
    id: 'R4',
    label: 'teardrop',
    note: 'shoulders high and wide, long taper to the mouth',
    profile: [
      [0.000, 0.460], [0.106, 0.446], [0.196, 0.400], [0.256, 0.330],
      [0.286, 0.240], [0.290, 0.140], [0.268, 0.010], [0.232, -0.130],
      [0.192, -0.262], [0.158, -0.372], [0.146, -0.446], [0.148, -0.460],
    ],
    segments: 20, faceted: false, ribs: 8,
  },
  {
    id: 'R5',
    label: '연등 · lotus',
    note: 'pointed crown, belly, mouth flaring back out',
    profile: [
      [0.000, 0.500], [0.058, 0.430], [0.132, 0.352], [0.208, 0.256],
      [0.262, 0.140], [0.282, 0.010], [0.270, -0.118], [0.230, -0.230],
      [0.188, -0.322], [0.176, -0.386], [0.206, -0.436], [0.234, -0.460],
    ],
    segments: 20, faceted: false, ribs: 10,
  },
  {
    id: 'R6',
    label: 'drum',
    note: 'short and wide — reads big at distance, small in the hand',
    profile: [
      [0.000, 0.360], [0.126, 0.348], [0.230, 0.306], [0.294, 0.226],
      [0.318, 0.110], [0.318, -0.070], [0.290, -0.202], [0.226, -0.300],
      [0.166, -0.356], [0.156, -0.380],
    ],
    segments: 20, faceted: false, ribs: 14,
  },
  {
    id: 'R7',
    label: '청사초롱 · Act 1 lantern',
    note: "1.1-B's design — oblong body, dark end caps, tassel",
    // Act 1 draws this as a sphere of radius 0.22 scaled 1.3 in y, giving a
    // body 0.572 tall. Everything below is that shape × 1.608, which is what
    // puts the envelope on this sheet's 0.92 — so the caps, the tassel and the
    // belly all keep the proportions 1.1-B actually renders.
    profile: [
      [0.000, 0.460], [0.074, 0.450], [0.150, 0.417], [0.228, 0.352],
      [0.290, 0.264], [0.333, 0.157], [0.354, 0.000], [0.333, -0.157],
      [0.290, -0.264], [0.228, -0.352], [0.150, -0.417], [0.074, -0.450],
      [0.000, -0.460],
    ],
    segments: 20, faceted: false, ribs: 0,
    hardware: {
      capR: 0.125, capH: 0.048, capY: 0.470,
      tasselR: 0.013, tasselLen: 0.322, tasselY: -0.680,
    },
  },
]

/* ── Tangled: the rounded box, lit from the middle ───────────────── */

/**
 * The reference set. Two things make those lanterns what they are, and neither
 * is the palette:
 *
 *   the CROSS-SECTION is a rounded square, not a circle — see `squircle`;
 *   the SHADING is inside-out from ours — a hot near-white middle where you
 *   look straight through the paper at the flame, with the colour surviving
 *   only at the edges. 8b's model does the opposite (dim middle, bright rim),
 *   which is why simply recolouring an egg never got close.
 */
export const TANGLED: LanternDesign[] = [
  {
    id: 'T1',
    label: 'rounded box',
    note: 'the reference shape — soft square, slightly tall',
    profile: [
      [0.004, 0.460], [0.118, 0.452], [0.222, 0.424], [0.288, 0.374],
      [0.318, 0.306], [0.328, 0.196], [0.330, -0.070], [0.322, -0.230],
      [0.296, -0.334], [0.250, -0.408], [0.198, -0.448], [0.184, -0.460],
    ],
    segments: 36, faceted: false, ribs: 4, ribPhase: 0, squircle: 4, style: 'tangled',
  },
  {
    id: 'T2',
    label: 'rounded cube',
    note: 'squat, near-cubic — the ones drifting close in frame',
    profile: [
      [0.004, 0.400], [0.130, 0.392], [0.238, 0.362], [0.310, 0.306],
      [0.348, 0.226], [0.360, 0.100], [0.358, -0.104], [0.340, -0.234],
      [0.298, -0.324], [0.238, -0.382], [0.196, -0.400],
    ],
    segments: 36, faceted: false, ribs: 4, ribPhase: 0, squircle: 4, style: 'tangled',
  },
  {
    id: 'T3',
    label: 'pillow',
    note: 'corners barely there — halfway back to round',
    profile: [
      [0.004, 0.450], [0.124, 0.440], [0.230, 0.404], [0.300, 0.340],
      [0.336, 0.248], [0.348, 0.110], [0.342, -0.056], [0.318, -0.206],
      [0.272, -0.324], [0.208, -0.410], [0.170, -0.450],
    ],
    segments: 36, faceted: false, ribs: 4, ribPhase: 0, squircle: 3, style: 'tangled',
  },
  {
    id: 'T4',
    label: 'tall box',
    note: 'the one Rapunzel is holding — narrow, upright',
    profile: [
      [0.004, 0.480], [0.100, 0.472], [0.196, 0.446], [0.256, 0.400],
      [0.284, 0.340], [0.294, 0.250], [0.296, -0.150], [0.288, -0.290],
      [0.264, -0.386], [0.222, -0.452], [0.196, -0.480],
    ],
    segments: 36, faceted: false, ribs: 4, ribPhase: 0, squircle: 5, style: 'tangled',
  },
  {
    id: 'T5',
    label: 'hard box',
    note: 'crisp corners, filleted — the most graphic of the set',
    profile: [
      [0.004, 0.460], [0.140, 0.450], [0.250, 0.416], [0.310, 0.356],
      [0.326, 0.286], [0.330, 0.160], [0.330, -0.180], [0.318, -0.300],
      [0.284, -0.386], [0.230, -0.442], [0.198, -0.460],
    ],
    segments: 40, faceted: false, ribs: 4, ribPhase: 0, squircle: 8, style: 'tangled',
  },
  {
    id: 'T6',
    label: 'round, Tangled shading',
    note: 'circular section — the shading alone, as a control',
    profile: [
      [0.000, 0.460], [0.088, 0.452], [0.164, 0.418], [0.208, 0.362],
      [0.224, 0.296], [0.228, 0.10], [0.228, -0.14], [0.224, -0.30],
      [0.214, -0.40], [0.206, -0.446], [0.206, -0.460],
    ],
    segments: 24, faceted: false, ribs: 0, style: 'tangled',
  },
]

/**
 * The reference palette, sampled off the frames: cream and butter in the
 * middle distance, peach and coral through the body of the swarm, rose and
 * magenta on the near ones. Every frame has all of it at once — the sky is not
 * one colour, it is a warm spread with a few hot pinks in it.
 */
export const TANGLED_COLORS: { id: string; label: string; hex: string }[] = [
  { id: 'TC1', label: 'cream', hex: '#FFE4B4' },
  { id: 'TC2', label: 'butter', hex: '#FFD68E' },
  { id: 'TC3', label: 'peach', hex: '#FFBB8A' },
  { id: 'TC4', label: 'apricot', hex: '#FFA268' },
  { id: 'TC5', label: 'coral', hex: '#FF8A66' },
  { id: 'TC6', label: 'salmon', hex: '#FF7B78' },
  { id: 'TC7', label: 'rose', hex: '#FF6B92' },
  { id: 'TC8', label: 'magenta', hex: '#FF4F86' },
]

/** Weighted mix for the sky mock — mostly warm, a few hot. */
export const TANGLED_MIX = [0, 0, 1, 1, 2, 2, 2, 3, 3, 4, 4, 5, 6, 7]

/* ── Colour ──────────────────────────────────────────────────────── */

/**
 * Authored for what SURVIVES the tone curve and the bloom pass, not for what
 * they measure at rest — a lantern is the brightest object in the frame and
 * both of those desaturate as they compress. Which is why every one of these
 * is a stop or two deeper than the colour it is meant to read as.
 */
export const COLORS: { id: string; label: string; hex: string }[] = [
  { id: 'C1', label: 'amber (current)', hex: '#FFC072' },
  { id: 'C2', label: 'cream hanji', hex: '#FFE2B0' },
  { id: 'C3', label: '홍등 persimmon', hex: '#FF7A44' },
  { id: 'C4', label: 'rose', hex: '#FF7E86' },
  { id: 'C5', label: '청 jade', hex: '#57D9A8' },
  { id: 'C6', label: 'indigo', hex: '#6E9CFF' },
  { id: 'C7', label: 'violet', hex: '#B078FF' },
]

/* ── The reference plate ─────────────────────────────────────────── */

/**
 * Solved backwards from the reference's own histogram, which is a much stranger
 * picture than it looks. Of every pixel in that frame:
 *
 *   52% sit at rgb(137, 69, 54)  — the wash between lanterns
 *   24% at rgb(206, 109, 76)     — lantern bodies
 *    8% at rgb(249, 171, 118)    — cores
 *  0.2% above luminance 210, and NOTHING above 245.
 *
 * So the plate is not a frame full of blown white lanterns with colour at the
 * edges. It is a frame of deeply saturated ORANGE with the red channel clipped
 * and green sitting at four tenths of it — the white is a rounding error, a few
 * hundred pixels at the hottest cores.
 *
 * Which means the paper has to be authored well down the value scale and well
 * up the saturation scale: for a body to land at rgb(250,130,90) the linear
 * colour going in must be about (0.96, 0.21, 0.10), and a cream-peach hex
 * multiplied by a brightness of 1.8 lands nowhere near it — it lands on white.
 * These are the hexes that survive the clip as colour.
 */
export const PLATE_COLORS = [
  '#FFAF83', // cream — the palest thing in the frame, and still not pale
  '#FF9363', // butter
  '#FF7E51', // peach
  '#FA6C44', // apricot
  '#F05C39', // coral
  '#E24C37', // persimmon
  '#E84D5B', // rose
  '#DE4370', // magenta
]
/**
 * Weighted draw — heavy through peach/apricot/coral, a thin tail into the
 * pinks. Thin is the point: a rose or magenta lantern is the most eye-catching
 * thing in the palette, and at one in ten the sky reads pink and stops being
 * the reference, which is a warm ORANGE frame with a handful of hot ones in it.
 */
export const COLOR_MIX = [
  0, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 5, 5, 6,
]

/**
 * How the paper is lit. Exported because the Lantern Lab's second sheet draws a
 * row with it — a treatment you can only judge at six pixels is a treatment you
 * cannot judge.
 *
 *   the BURNER sits in the hole at the bottom and is the brightest thing on the
 *     object, a small hot disc rather than a lit underside;
 *   the CROWN keeps the paper's own colour, because it is furthest from the
 *     flame — which is why the whole-surface core wash is held back up the
 *     envelope instead of being allowed to pale everything equally;
 *   the PAPER carries a hand-laid mottle and the glue seams between panels,
 *     both fading out toward the axis so a lantern seen from below does not
 *     collapse into a spirograph.
 */
export const PLATE_ENVELOPE = {
  instanced: true,
  // Tight and cool-burning: the sheet default blows roughly 4% of the frame to
  // white and the reference blows 0.2%. Pulled well back again once the burner
  // arrived, since this term is a whole-surface wash and was what paled the crowns.
  core: { power: 3.0, gain: 0.34, tint: [0.60, 0.34, 0.18] as [number, number, number] },
  flame: { gain: 1.5, inner: 0.06, outer: 0.44, tint: [1.0, 0.62, 0.24] as [number, number, number] },
  texture: { fibre: 0.2, seam: 0.16, seams: 4 },
  // The underside IS the mouth on a closed shape, and darkening it put a grey
  // thumbprint on the middle of every lantern in the sky.
  mouthFade: 0,
  // Steeper than the sheets'. The reference lights each lantern hard from the
  // bottom edge — that gradient is most of what stops a squircle from reading
  // as a flat sticker.
  falloff: [1.28, 0.52] as [number, number],
}

/* ── THE MIX ─────────────────────────────────────────────────────── */

/**
 * The set chosen for the crowd: five shapes, one colour, a spread of
 * brightness. Not one design repeated four thousand times — a real festival is
 * whatever anyone had, and a field of identical lanterns reads as a texture
 * rather than as a crowd of people who each brought something.
 *
 * Deliberately across BOTH families. The drum and the sky lantern carry the
 * round silhouette, the hexagonal and the square box put hard edges in among
 * them, and the 청사초롱 brings the only hardware in the set — so at distance
 * the field has variety in outline, and up close some of them have a tassel.
 */
export const MIX: LanternDesign[] = [ROUND[5], ROUND[6], ROUND[1], ANGULAR[1], ANGULAR[0]]

/** Always amber. The variety is in shape and brightness, not hue. */
export const MIX_HEX = '#FFC072'

/**
 * Per-lantern brightness. A single value across a field flattens it; this
 * range is wide enough that some read as freshly lit and some as guttering,
 * and its floor is well above what 8b ships — these are meant to be bright.
 */
export const MIX_LIT_RANGE: [number, number] = [1.4, 2.0]
export function mixLit(rand: () => number): number {
  return MIX_LIT_RANGE[0] + rand() * (MIX_LIT_RANGE[1] - MIX_LIT_RANGE[0])
}

/** Brightness ladder — 0.78 is what 8b ships today. */
export const BRIGHTNESS: { id: string; label: string; lit: number }[] = [
  { id: 'B1', label: '0.78 — current', lit: 0.78 },
  { id: 'B2', label: '1.05', lit: 1.05 },
  { id: 'B3', label: '1.45', lit: 1.45 },
  { id: 'B4', label: '2.00', lit: 2.0 },
]

export type EnvelopeOpts = {
  /**
   * Built for an `InstancedMesh`, where brightness arrives per instance through
   * `instanceColor` rather than through the material. The `tangled` core then
   * has to come off the instance colour instead of a uniform — a uniform is one
   * value for the whole draw call, and the whole point of the field is that no
   * two lanterns are lit the same.
   */
  instanced?: boolean
  /**
   * The `tangled` hot spot, where you look straight through the paper at the
   * flame. `power` sets how tightly it hugs the centre of the visible face,
   * `gain` how hard it burns and `tint` what colour it burns toward.
   *
   * Worth a knob rather than a constant because it is the single control over
   * how much of a lantern goes WHITE, and the reference plate turns out to blow
   * far less of itself than it appears to — 0.2% of its pixels, against the 4%
   * the sheet default produces. Defaults are the sheets' look, unchanged.
   */
  core?: { power?: number; gain?: number; tint?: [number, number, number] }
  /**
   * How hard the envelope darkens toward the mouth, 0 to switch it off. Only
   * worth touching on a closed-off shape seen from below, where "the mouth" is
   * the whole underside and darkening it puts a smudge in the middle of every
   * lantern in the frame.
   */
  mouthFade?: number
  /** Envelope brightness at the mouth and at the crown. Default is the sheets'. */
  falloff?: [number, number]
  /**
   * The burner. A sky lantern is not a uniformly glowing bag — the flame sits in
   * the OPENING at the bottom, and from anywhere below it that opening is the
   * brightest thing on the object by a wide margin: a small hot near-white disc
   * with the paper around it merely lit. Everything above is progressively
   * further from the source and keeps the paper's own colour.
   *
   * `gain` is how hard it burns; `inner`/`outer` are the hot disc's radius as a
   * fraction of the lantern's own, so a wide drum and a narrow box both get a
   * mouth in proportion.
   */
  flame?: { gain: number; inner?: number; outer?: number; tint?: [number, number, number] }
  /**
   * Paper. `fibre` is the mottle of a hand-laid sheet — the thin patches carry
   * more light — and `seam` the vertical glue lines where the panels meet.
   *
   * Both fade out toward the axis, which is not cosmetic: a seam drawn all the
   * way in converges on the pole with every other seam, and a lantern seen from
   * below (which, in this scene, is all of them) then wears a spirograph.
   */
  texture?: { fibre?: number; seam?: number; seams?: number }
  /**
   * Take per-instance brightness from a geometry `color` attribute rather
   * than from `instanceColor`. Act 8b's crowd already carries one, and the
   * two paths land in the same `vColor`.
   */
  vertexColors?: boolean
}

/**
 * The paper, in the two shading styles the sheets offer.
 *
 * `hanji` — 8b's current model. Brightest at the mouth where the flame is,
 *   falling off up the envelope, with a rim lift because thin paper carries
 *   more light at glancing angles. Reads as a lit object.
 *
 * `tangled` — the reference model. A gentler vertical falloff and NO rim lift;
 *   instead a hot near-white core wherever the paper faces you, because that is
 *   where you are looking straight through the envelope at the flame. The
 *   colour then only survives at the edges, which is exactly what the Tangled
 *   frames do: cream-white middles, coral and rose rims.
 *
 * `customProgramCacheKey` is load-bearing. Without it three hands every one of
 * these the first compiled program and the whole sheet gets one design's ribs.
 *
 * The `tangled` core strength rides in as a UNIFORM rather than a baked
 * constant, so brightness can be rolled per lantern without adding a program.
 * It used to be baked, which was survivable on a sheet of twenty and fatal on a
 * sky of seven hundred: every distinct `lit` value is its own shader compile,
 * and the page spent a minute stalled before the first frame.
 */
export function makeEnvelopeMaterial(
  hex: string, lit: number, d: LanternDesign, opts: EnvelopeOpts = {},
): THREE.MeshBasicMaterial {
  const { ribs, style = 'hanji' } = d
  const ribPhase = d.ribPhase ?? 0.5
  const { instanced = false, vertexColors = false } = opts
  const corePow = opts.core?.power ?? 2.2
  const coreGain = opts.core?.gain ?? 1
  const coreTint = opts.core?.tint ?? [0.62, 0.50, 0.34]
  const mouth = opts.mouthFade ?? (style === 'tangled' ? 0.34 : 0.5)
  const [lowLit, highLit] = opts.falloff ?? (style === 'tangled' ? [1.05, 0.66] : [1.2, 0.42])
  const tintGl = coreTint.map(v => (v * coreGain).toFixed(4)).join(', ')

  // Widest radius the built geometry actually reaches, so the shader can talk
  // in "fraction of this lantern's own width". The superellipse warp pushes the
  // diagonal out by 2^(1/2 − 1/n) past the profile radius; a circle is n = 2 and
  // that factor is 1.
  const maxProfileR = Math.max(...d.profile.map(p => p[0]))
  // Height normalisation, per design rather than the 0.92 the catalogue mostly
  // spans. A drum is 0.74 tall; against a fixed divisor its underside lands at
  // 0.04 instead of 0, and the burner — which only lights the bottom 13% — comes
  // out at three quarters strength on the one design that most needs it.
  const yLo = Math.min(...d.profile.map(p => p[1]))
  const yHi = Math.max(...d.profile.map(p => p[1]))
  const sq = d.squircle ?? 2
  const maxR = maxProfileR * Math.pow(2, 0.5 - 1 / sq)

  const flameGl = opts.flame ? (() => {
    const { gain, inner = 0.16, outer = 0.52, tint = [1.0, 0.72, 0.34] } = opts.flame
    const t = tint.map(v => (v * gain).toFixed(4)).join(', ')
    // Only on the underside, and only near the axis: the burner, seen from below.
    return `
      float under = smoothstep(0.13, 0.0, vLanternY);
      float mouthGlow = under * (1.0 - smoothstep(${inner.toFixed(3)}, ${outer.toFixed(3)}, vLanternR));
      // Squared twice: a hole, not a band. Linear falloff spread the burner
      // across the whole underside and every lantern wore a white stripe.
      mouthGlow *= mouthGlow;
      diffuseColor.rgb += vec3(${t}) * mouthGlow * mouthGlow;`
  })() : ''

  const fibre = opts.texture?.fibre ?? 0
  const seamAmt = opts.texture?.seam ?? 0
  const seamCount = opts.texture?.seams ?? 4
  const textureGl = (fibre > 0 || seamAmt > 0) ? `
    float paperK = smoothstep(0.18, 0.62, vLanternR);
    ${fibre > 0 ? `
      float fib = 0.62 * lanternNoise(vLanternUv * vec2(13.0, 9.0), 13.0)
                + 0.38 * lanternNoise(vLanternUv * vec2(31.0, 23.0), 31.0);
      lanternShade *= 1.0 + ${fibre.toFixed(3)} * paperK * (fib - 0.5) * 2.0;` : ''}
    ${seamAmt > 0 ? `
      float sm = abs(fract(vLanternUv.x * ${seamCount.toFixed(1)} + 0.5) - 0.5) * 2.0;
      lanternShade *= 1.0 - ${seamAmt.toFixed(3)} * paperK
        * (1.0 - smoothstep(0.0, 0.13, sm));` : ''}
  ` : ''

  // Value noise that WRAPS in x, because uv.x is an angle around the lathe and
  // an unwrapped hash leaves a visible seam down one side of every lantern.
  const noiseGl = (fibre > 0) ? `
    float lanternHash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }
    float lanternNoise(vec2 p, float period) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      vec2 a = vec2(mod(i.x, period), i.y);
      vec2 b = vec2(mod(i.x + 1.0, period), i.y);
      return mix(
        mix(lanternHash(a), lanternHash(b), u.x),
        mix(lanternHash(a + vec2(0.0, 1.0)), lanternHash(b + vec2(0.0, 1.0)), u.x), u.y);
    }` : ''
  const m = new THREE.MeshBasicMaterial({
    color: new THREE.Color(hex).multiplyScalar(lit),
    toneMapped: false, side: THREE.DoubleSide,
    // Instanced fields are opaque: per-instance depth sorting is impossible, a
    // 6% transparency buys nothing against a paper envelope, and depth-of-field
    // needs a clean depth buffer to know what to blur.
    transparent: !instanced, opacity: instanced ? 1 : 0.94,
    vertexColors,
  })
  const ribCode = ribs > 0 ? `
    float rib = abs(fract(vLanternUv.x * ${ribs.toFixed(1)} + ${ribPhase.toFixed(3)}) - 0.5) * 2.0;
    lanternShade *= 1.0 - ${style === 'tangled' ? '0.12' : '0.2'}
      * (1.0 - smoothstep(0.0, ${style === 'tangled' ? '0.26' : '0.2'}, rib));` : ''

  m.customProgramCacheKey = () =>
    `lab-${style}-${ribs}-${ribPhase}-${instanced}-${corePow}-${tintGl}-${mouth}`
    + `-${lowLit}/${highLit}-${flameGl.length}-${fibre}-${seamAmt}-${seamCount}`
    + `-${maxR.toFixed(4)}-${vertexColors}-${yLo.toFixed(4)}/${yHi.toFixed(4)}`
  m.onBeforeCompile = shader => {
    shader.uniforms.uCore = { value: lit * 0.95 }
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying float vLanternY;\nvarying float vRim;\nvarying vec2 vLanternUv;\nvarying float vLanternR;',
      )
      .replace('#include <project_vertex>', `#include <project_vertex>
        vLanternY = clamp((position.y - ${yLo.toFixed(5)})
          / ${(yHi - yLo).toFixed(5)}, 0.0, 1.0);
        vLanternR = length(position.xz) / ${maxR.toFixed(5)};
        vLanternUv = uv;
        vRim = 1.0 - abs(dot(
          normalize(normalMatrix * normal), normalize(-mvPosition.xyz)));
      `)
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform float uCore;\nvarying float vLanternY;\nvarying float vRim;\n'
        + 'varying vec2 vLanternUv;\nvarying float vLanternR;\n' + noiseGl,
      )
      .replace('#include <color_fragment>', style === 'tangled' ? `#include <color_fragment>
        float coreAmt = ${instanced
          ? 'dot(diffuseColor.rgb, vec3(0.52, 0.58, 0.36))'
          : 'uCore'};
        float lanternShade = mix(${lowLit.toFixed(3)}, ${highLit.toFixed(3)}, vLanternY);
        ${ribCode}
        ${textureGl}
        lanternShade *= 1.0 - ${mouth.toFixed(3)} * smoothstep(0.92, 1.0, vLanternUv.y);
        diffuseColor.rgb *= lanternShade;
        // Held back up the envelope, so the crown stays the paper's own colour
        // instead of washing toward white with everything else.
        float core = pow(clamp(1.0 - vRim, 0.0, 1.0), ${corePow.toFixed(2)})
          * mix(1.0, 0.3, vLanternY);
        diffuseColor.rgb += vec3(${tintGl}) * core * coreAmt;
        ${flameGl}
      ` : `#include <color_fragment>
        float lanternShade = mix(${lowLit.toFixed(3)}, ${highLit.toFixed(3)}, vLanternY);
        ${ribCode}
        ${textureGl}
        lanternShade *= 1.0 - ${mouth.toFixed(3)} * smoothstep(0.9, 1.0, vLanternUv.y);
        lanternShade *= 1.0 + 0.85 * pow(clamp(vRim, 0.0, 1.0), 2.4);
        diffuseColor.rgb *= lanternShade;
        ${flameGl}
      `)
  }
  return m
}


/**
 * Close a design's mouth with a shallow dome, and hand back a copy.
 *
 * The catalogue leaves the mouth open, which is what a lantern is and reads
 * correctly on a sheet you look at straight on. It stops being right the moment
 * the camera is BELOW the lantern — which, in a scene about letting them go, is
 * every lantern eventually. Through an open mouth you see the far inside wall
 * and its struts converging on the axis, and a sky full of six-pixel lanterns
 * turns into a sky full of tiny spirographs.
 *
 * A dome rather than a flat cap: a flat annulus shares its outer ring of
 * vertices with the bottom of the side wall, so smooth normals there average a
 * downward normal with a sideways one and fan the same artifact back in. Curving
 * it keeps the surface continuous, which is why the crown never had the problem.
 * Costs 0.04 of depth and nothing in silhouette.
 */
export function closeMouth(d: LanternDesign, ribs = d.ribs): LanternDesign {
  const [rEnd, yEnd] = d.profile[d.profile.length - 1]
  return {
    ...d,
    ribs,
    profile: [
      ...d.profile,
      [rEnd * 0.80, yEnd - 0.018],
      [rEnd * 0.48, yEnd - 0.032],
      [rEnd * 0.16, yEnd - 0.039],
      [0.004, yEnd - 0.041],
    ],
  }
}

/**
 * Build a design's geometry. Faceted designs are un-indexed first so
 * `computeVertexNormals` gives one normal per triangle — a lathe's own normals
 * are smooth around the circumference, which on four segments renders a square
 * tube with soft shading and defeats the entire point of picking it.
 */
export function buildLanternGeometry(d: LanternDesign): THREE.BufferGeometry {
  const points = d.profile.map(([x, y]) => new THREE.Vector2(x, y))
  const lathe = new THREE.LatheGeometry(points, d.segments)

  // Warp the circular cross-section onto a superellipse. Flat faces land on
  // the axes and corners on the diagonals, which is why `ribPhase: 0` puts the
  // frame where a real one is.
  const n = d.squircle
  if (n && n !== 2) {
    const pos = lathe.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const r = Math.hypot(x, z)
      if (r < 1e-5) continue
      const f = 1 / Math.pow(Math.abs(x / r) ** n + Math.abs(z / r) ** n, 1 / n)
      pos.setX(i, x * f)
      pos.setZ(i, z * f)
    }
    pos.needsUpdate = true
    lathe.computeVertexNormals()
  }

  if (!d.faceted) return lathe
  const flat = lathe.toNonIndexed()
  flat.computeVertexNormals()
  lathe.dispose()
  return flat
}
