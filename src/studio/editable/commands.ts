/**
 * The @entity command language — what makes the studio console special.
 *
 * Attach an object with @id (autocompleted from the objects the live
 * scene registered) and drive it directly:
 *
 *   @keeper move y 0.5        relative nudge on one axis
 *   @keeper move 0.2 0 -1     relative nudge, all three
 *   @keeper pos 0 1.2 3       absolute location
 *   @keeper rot y 45          absolute rotation, DEGREES
 *   @keeper scale 1.4         uniform scale (or three numbers)
 *   @keeper hide / show / select / reset [pos|rot|scale]
 *   @keeper info              rich card: transform, kind, source
 *   @keeper code              paste-ready JSX props
 *   ls                        list every object in the scene
 *
 * Parsing is pure and unit-tested (parseEntityCommand); execution is a
 * thin apply layer over the editable store. Anything that is not a known
 * verb falls through to the dev-server shell, so the terminal stays a
 * real terminal.
 */
import {
  getEditable, listEditables, selectEditable, setEditableTransform,
  resetEditableTransform, setEditableVisible, editableCodeSnippet,
  getEditableTransform, type Vec3,
} from './store'

export type EntityCommand =
  | { kind: 'transform'; id: string; verb: 'move' | 'pos' | 'rot' | 'scale'; values: Vec3; relative: boolean }
  | { kind: 'simple'; id: string; verb: 'hide' | 'show' | 'select' | 'info' | 'code' }
  | { kind: 'reset'; id: string; part?: 'position' | 'rotation' | 'scale' }
  | { kind: 'list' }
  | { kind: 'error'; message: string }
  /** Not an entity command — hand it to the shell. */
  | null

const AXES = { x: 0, y: 1, z: 2 } as const
const RESET_PARTS: Record<string, 'position' | 'rotation' | 'scale'> = {
  pos: 'position', position: 'position', loc: 'position', location: 'position',
  rot: 'rotation', rotation: 'rotation', scale: 'scale',
}

/** Spread one axis value into a full triple around an identity value. */
function axisTriple(axis: 'x' | 'y' | 'z', value: number, identity: number): Vec3 {
  const v: Vec3 = [identity, identity, identity]
  v[AXES[axis]] = value
  return v
}

export function parseEntityCommand(input: string): EntityCommand {
  const line = input.trim()
  if (line === 'ls' || line === 'objects') return { kind: 'list' }
  if (!line.startsWith('@')) return null

  const [ref, ...rest] = line.split(/\s+/)
  const id = ref.slice(1)
  if (!id) return { kind: 'error', message: 'usage: @<object> <move|pos|rot|scale|hide|show|reset|info|code>' }

  const verb = (rest[0] ?? 'info').toLowerCase()
  const args = rest.slice(1)

  if (verb === 'hide' || verb === 'show' || verb === 'select' || verb === 'info' || verb === 'code')
    return { kind: 'simple', id, verb }

  if (verb === 'reset') {
    const part = args[0] ? RESET_PARTS[args[0].toLowerCase()] : undefined
    if (args[0] && !part) return { kind: 'error', message: `reset: unknown part "${args[0]}" (pos|rot|scale)` }
    return { kind: 'reset', id, part }
  }

  const canonical = ({ move: 'move', mv: 'move', nudge: 'move',
    pos: 'pos', position: 'pos', loc: 'pos', location: 'pos', place: 'pos',
    rot: 'rot', rotate: 'rot', rotation: 'rot',
    scale: 'scale', size: 'scale' } as const)[verb as keyof object] as
    'move' | 'pos' | 'rot' | 'scale' | undefined
  if (!canonical) return { kind: 'error', message: `unknown verb "${verb}" for @${id}` }

  // Axis form: <verb> y 0.5
  const first = args[0]?.toLowerCase()
  if (first && first in AXES) {
    const n = parseFloat(args[1])
    if (!Number.isFinite(n)) return { kind: 'error', message: `${canonical} ${first}: expected a number` }
    const identity = canonical === 'scale' ? 1 : 0
    return {
      kind: 'transform', id, verb: canonical, relative: canonical === 'move',
      values: axisTriple(first as 'x' | 'y' | 'z', canonical === 'rot' ? n * Math.PI / 180 : n, identity),
    }
  }

  const nums = args.map(parseFloat)
  if (nums.length === 0 || nums.some(n => !Number.isFinite(n)))
    return { kind: 'error', message: `${canonical}: expected "<axis> <n>", "<n>" or "<x> <y> <z>"` }

  // Uniform single value is meaningful for scale only.
  let triple: Vec3
  if (nums.length === 1) {
    if (canonical !== 'scale') return { kind: 'error', message: `${canonical}: give an axis or all three values` }
    triple = [nums[0], nums[0], nums[0]]
  } else if (nums.length === 3) {
    triple = [nums[0], nums[1], nums[2]]
  } else {
    return { kind: 'error', message: `${canonical}: expected 1 or 3 numbers, got ${nums.length}` }
  }
  if (canonical === 'rot') triple = triple.map(d => d * Math.PI / 180) as Vec3

  return { kind: 'transform', id, verb: canonical, relative: canonical === 'move', values: triple }
}

export type EntityResult =
  /** Plain text line for the scrollback. */
  | { kind: 'text'; text: string; error?: boolean }
  /** Rich entity card (the console renders transform rows + actions). */
  | { kind: 'card'; id: string }
  /** Rich object list. */
  | { kind: 'list'; ids: string[] }

/** Runs a parsed command against the live scene. */
export function runEntityCommand(cmd: NonNullable<EntityCommand>): EntityResult {
  if (cmd.kind === 'error') return { kind: 'text', text: cmd.message, error: true }
  if (cmd.kind === 'list') {
    const ids = listEditables().map(e => e.id)
    return ids.length
      ? { kind: 'list', ids }
      : { kind: 'text', text: 'no editable objects in this scene — wrap actors in <Editable id="…"> to expose them', error: true }
  }

  const entry = getEditable(cmd.id)
  if (!entry) {
    const near = listEditables().map(e => e.id).filter(i => i.startsWith(cmd.id.slice(0, 3)))
    return {
      kind: 'text', error: true,
      text: `no object @${cmd.id} in this scene${near.length ? ` — did you mean @${near.join(', @')}?` : ' (try `ls`)'}`,
    }
  }

  switch (cmd.kind) {
    case 'transform': {
      const key = cmd.verb === 'move' || cmd.verb === 'pos' ? 'position' : cmd.verb === 'rot' ? 'rotation' : 'scale'
      setEditableTransform(cmd.id, { [key]: cmd.values, relative: cmd.relative })
      selectEditable(cmd.id)
      return { kind: 'card', id: cmd.id }
    }
    case 'reset':
      resetEditableTransform(cmd.id, cmd.part)
      return { kind: 'card', id: cmd.id }
    case 'simple':
      switch (cmd.verb) {
        case 'hide': setEditableVisible(cmd.id, false); return { kind: 'text', text: `@${cmd.id} hidden` }
        case 'show': setEditableVisible(cmd.id, true); return { kind: 'text', text: `@${cmd.id} shown` }
        case 'select': selectEditable(cmd.id); return { kind: 'card', id: cmd.id }
        case 'code': return { kind: 'text', text: `<${entry.name.replace(/\s+/g, '')} ${editableCodeSnippet(cmd.id)} />` }
        case 'info': selectEditable(cmd.id); return { kind: 'card', id: cmd.id }
      }
  }
}

/** @-autocomplete: ids matching the fragment after the last '@'. */
export function completeMention(input: string, caret: number): { from: number; options: string[] } | null {
  const upto = input.slice(0, caret)
  const at = upto.lastIndexOf('@')
  if (at < 0) return null
  const frag = upto.slice(at + 1)
  if (/\s/.test(frag)) return null
  const q = frag.toLowerCase()
  const options = listEditables()
    .filter(e => e.id.toLowerCase().includes(q) || e.name.toLowerCase().includes(q))
    .map(e => e.id)
  return options.length ? { from: at, options } : null
}

/** Small formatting helper shared by the console cards. */
export function describeTransform(id: string): { position: string; rotation: string; scale: string } | null {
  const t = getEditableTransform(id)
  if (!t) return null
  const f = (n: number) => (Math.abs(n) < 1e-4 ? '0' : n.toFixed(2))
  return {
    position: t.position.map(f).join(', '),
    rotation: t.rotation.map(r => f(r * 180 / Math.PI)).join(', '),
    scale: t.scale.map(f).join(', '),
  }
}
