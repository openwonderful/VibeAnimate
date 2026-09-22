/**
 * Entity command language — parser tests. Parsing is pure (no THREE, no
 * store), so it is unit-testable in node; execution is covered by the
 * store round-trip tests below.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import * as THREE from 'three'
import { parseEntityCommand } from '../editable/commands'
import {
  registerEditable, unregisterEditable, listEditables, getEditableTransform,
  setEditableTransform, resetEditableTransform, editableCodeSnippet,
  selectEditable, getSelectedId, setGizmoMode, getGizmoMode,
  setAxisFilter, getAxisFilter,
} from '../editable/store'

const DEG = Math.PI / 180

describe('parseEntityCommand', () => {
  it('passes plain shell commands through as null', () => {
    expect(parseEntityCommand('npm test')).toBeNull()
    expect(parseEntityCommand('node scripts/shot.mjs --act 3.2')).toBeNull()
  })

  it('recognises the object list verb', () => {
    expect(parseEntityCommand('ls')).toEqual({ kind: 'list' })
    expect(parseEntityCommand('  objects  ')).toEqual({ kind: 'list' })
  })

  it('defaults a bare mention to info', () => {
    expect(parseEntityCommand('@keeper')).toEqual({ kind: 'simple', id: 'keeper', verb: 'info' })
  })

  it('parses single-axis relative moves', () => {
    expect(parseEntityCommand('@keeper move y 0.5')).toEqual({
      kind: 'transform', id: 'keeper', verb: 'move', relative: true, values: [0, 0.5, 0],
    })
  })

  it('parses triple moves and absolute positions', () => {
    expect(parseEntityCommand('@a move 0.2 0 -1')).toEqual({
      kind: 'transform', id: 'a', verb: 'move', relative: true, values: [0.2, 0, -1],
    })
    expect(parseEntityCommand('@a pos 0 1.2 3')).toEqual({
      kind: 'transform', id: 'a', verb: 'pos', relative: false, values: [0, 1.2, 3],
    })
  })

  it('converts rotation arguments from degrees to radians', () => {
    const cmd = parseEntityCommand('@a rot y 90')
    expect(cmd).toMatchObject({ kind: 'transform', verb: 'rot', relative: false })
    if (cmd?.kind !== 'transform') throw new Error('expected transform')
    expect(cmd.values[1]).toBeCloseTo(90 * DEG, 10)
  })

  it('treats a lone scale number as uniform, and rejects it elsewhere', () => {
    expect(parseEntityCommand('@a scale 1.4')).toEqual({
      kind: 'transform', id: 'a', verb: 'scale', relative: false, values: [1.4, 1.4, 1.4],
    })
    expect(parseEntityCommand('@a pos 1.4')).toMatchObject({ kind: 'error' })
  })

  it('accepts verb aliases', () => {
    expect(parseEntityCommand('@a mv y 1')).toMatchObject({ verb: 'move' })
    expect(parseEntityCommand('@a location 0 0 0')).toMatchObject({ verb: 'pos' })
    expect(parseEntityCommand('@a rotate y 10')).toMatchObject({ verb: 'rot' })
    expect(parseEntityCommand('@a size 2')).toMatchObject({ verb: 'scale' })
  })

  it('parses reset with and without a channel', () => {
    expect(parseEntityCommand('@a reset')).toEqual({ kind: 'reset', id: 'a', part: undefined })
    expect(parseEntityCommand('@a reset rot')).toEqual({ kind: 'reset', id: 'a', part: 'rotation' })
    expect(parseEntityCommand('@a reset wat')).toMatchObject({ kind: 'error' })
  })

  it('reports unknown verbs and malformed numbers instead of guessing', () => {
    expect(parseEntityCommand('@a frobnicate 1')).toMatchObject({ kind: 'error' })
    expect(parseEntityCommand('@a move y banana')).toMatchObject({ kind: 'error' })
    expect(parseEntityCommand('@a pos 1 2')).toMatchObject({ kind: 'error' })
  })
})

describe('editable store', () => {
  let obj: THREE.Object3D

  beforeEach(() => {
    for (const e of listEditables()) unregisterEditable(e.id, e.object)
    obj = new THREE.Object3D()
    obj.position.set(1, 0, -2)
    registerEditable('keeper', 'Lantern Keeper', 'character', obj, 'src/x.tsx')
  })

  it('registers with the authored transform as its reset base', () => {
    setEditableTransform('keeper', { position: [5, 5, 5] })
    resetEditableTransform('keeper')
    expect(getEditableTransform('keeper')?.position).toEqual([1, 0, -2])
  })

  it('applies relative vs absolute transforms correctly', () => {
    setEditableTransform('keeper', { position: [0, 0.5, 0], relative: true })
    expect(getEditableTransform('keeper')?.position).toEqual([1, 0.5, -2])
    setEditableTransform('keeper', { position: [0, 1, 0] })
    expect(getEditableTransform('keeper')?.position).toEqual([0, 1, 0])
  })

  it('multiplies relative scale rather than adding', () => {
    setEditableTransform('keeper', { scale: [2, 2, 2], relative: true })
    setEditableTransform('keeper', { scale: [2, 2, 2], relative: true })
    expect(getEditableTransform('keeper')?.scale).toEqual([4, 4, 4])
  })

  it('resets one channel without disturbing the others', () => {
    setEditableTransform('keeper', { position: [9, 9, 9], rotation: [0, 1, 0] })
    resetEditableTransform('keeper', 'position')
    expect(getEditableTransform('keeper')?.position).toEqual([1, 0, -2])
    expect(getEditableTransform('keeper')?.rotation[1]).toBeCloseTo(1, 10)
  })

  it('emits JSX with only the props that differ from defaults', () => {
    expect(editableCodeSnippet('keeper')).toBe('position={[1.000, 0.000, -2.000]}')
    setEditableTransform('keeper', { scale: [2, 2, 2] })
    expect(editableCodeSnippet('keeper')).toContain('scale={[2.000, 2.000, 2.000]}')
  })

  it('ignores selection of unknown ids and clears the axis filter on select', () => {
    setAxisFilter('x')
    selectEditable('nope')
    expect(getSelectedId()).toBeNull()
    selectEditable('keeper')
    expect(getSelectedId()).toBe('keeper')
    expect(getAxisFilter()).toBeNull()
  })

  it('toggles the axis filter off when the same axis is pressed twice', () => {
    setAxisFilter('y')
    expect(getAxisFilter()).toBe('y')
    setAxisFilter('y')
    expect(getAxisFilter()).toBeNull()
  })

  it('keeps the newer registration when HMR remounts the same id', () => {
    const replacement = new THREE.Object3D()
    registerEditable('keeper', 'Lantern Keeper', 'character', replacement)
    unregisterEditable('keeper', obj) // stale cleanup from the old mount
    expect(listEditables().map(e => e.id)).toEqual(['keeper'])
  })

  it('round-trips gizmo mode', () => {
    setGizmoMode('rotate')
    expect(getGizmoMode()).toBe('rotate')
    setGizmoMode('translate')
    expect(getGizmoMode()).toBe('translate')
  })
})
