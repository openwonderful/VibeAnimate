import { describe, expect, it } from 'vitest'
import { formatShotRef, type ShotRefMeta } from '../shotref'

const base: ShotRefMeta = {
  key: '8.55',
  t: 38,
  filmTime: 180,
  frame: 5400,
  pose: { pos: [2.7, 6.4, -12.9], target: [-14.2, 131, -24.1], fov: 62 },
  orbit: true,
  png: '/srv/work/code_animation-studio/out/shotrefs/8.55@t38.00-1.png',
}

describe('formatShotRef', () => {
  it('renders the full token, one line, bracketed', () => {
    const s = formatShotRef(base)
    expect(s).toBe(
      '[shotref 8.55 t=38.00 film=3:00.00 f5400 '
      + 'cam=(2.7,6.4,-12.9)->(-14.2,131,-24.1) fov=62 pose=orbited '
      + 'png=/srv/work/code_animation-studio/out/shotrefs/8.55@t38.00-1.png]',
    )
    expect(s).not.toContain('\n')
  })

  it('says pose=shot when the debug camera was off — the pose is what the rig renders', () => {
    expect(formatShotRef({ ...base, orbit: false })).toContain('pose=shot')
  })

  it('drops film time and frame for a detached shot (opened from the shot list)', () => {
    const s = formatShotRef({ ...base, filmTime: null, frame: null })
    expect(s).not.toContain('film=')
    expect(s).not.toContain(' f5400')
    expect(s).toContain('t=38.00')
  })

  it('survives a DOM scene: no pose, no pose= flag, still a valid token', () => {
    const s = formatShotRef({ ...base, pose: null })
    expect(s).toContain('cam=none(DOM scene)')
    expect(s).not.toContain('pose=')
  })

  it('omits png when the dev server was not there to save one', () => {
    expect(formatShotRef({ ...base, png: null })).not.toContain('png=')
  })

  it('keeps fov optional (orthographic or unset cameras)', () => {
    const s = formatShotRef({ ...base, pose: { pos: [1, 2, 3], target: [4, 5, 6] } })
    expect(s).toContain('cam=(1,2,3)->(4,5,6)')
    expect(s).not.toContain('fov=')
  })
})
