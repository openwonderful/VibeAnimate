import { describe, expect, it } from 'vitest'
import { parseLrc, lyricAt, lyricIndexAt, lyricEnd } from '../lyrics'

describe('parseLrc', () => {
  it('parses mm:ss.xx cues into seconds', () => {
    expect(parseLrc('[00:07.24] I need')).toEqual([{ t: 7.24, text: 'I need' }])
    expect(parseLrc('[01:20.50] later')[0].t).toBeCloseTo(80.5, 5)
    expect(parseLrc('[100:00.00] long')[0].t).toBe(6000)
  })

  it('expands a cue carrying several timestamps into one entry each', () => {
    const out = parseLrc('[00:44.99][01:20.11] I need some body to body')
    expect(out).toHaveLength(2)
    expect(out.map(l => l.t)).toEqual([44.99, 80.11])
    expect(new Set(out.map(l => l.text))).toEqual(new Set(['I need some body to body']))
  })

  it('sorts by time regardless of file order', () => {
    expect(parseLrc('[00:10.00] b\n[00:05.00] a').map(l => l.text)).toEqual(['a', 'b'])
  })

  it('drops metadata tags but honours [offset:]', () => {
    const out = parseLrc('[ar:BTS]\n[ti:Body to Body]\n[offset:500]\n[00:10.00] shifted')
    expect(out).toHaveLength(1)
    expect(out[0].t).toBeCloseTo(9.5, 5)
  })

  it('never produces a negative time from a large offset', () => {
    expect(parseLrc('[offset:5000]\n[00:01.00] early')[0].t).toBe(0)
  })

  it('skips blank and cue-less lines', () => {
    expect(parseLrc('\n\nnot a cue\n[00:01.00] real\n')).toEqual([{ t: 1, text: 'real' }])
  })

  it('keeps empty-text cues — that is how LRC marks a gap', () => {
    expect(parseLrc('[00:30.00]')).toEqual([{ t: 30, text: '' }])
  })

  it('leaves brackets inside the lyric alone', () => {
    expect(parseLrc('[00:09.13] I need, I need (What you need, twin?) [x2]')[0].text)
      .toBe('I need, I need (What you need, twin?) [x2]')
  })

  it('accepts mm:ss:xx as well as mm:ss.xx', () => {
    expect(parseLrc('[00:07:24] I need')[0].t).toBeCloseTo(7.24, 5)
  })
})

describe('lyric lookup', () => {
  const lines = parseLrc('[00:00.00] one\n[00:05.00] two\n[00:10.00] three')

  it('returns -1 / null before the first cue', () => {
    expect(lyricIndexAt(parseLrc('[00:05.00] two'), 1)).toBe(-1)
    expect(lyricAt(parseLrc('[00:05.00] two'), 1)).toBeNull()
  })

  it('holds a cue until the next one starts', () => {
    expect(lyricAt(lines, 0)?.text).toBe('one')
    expect(lyricAt(lines, 4.99)?.text).toBe('one')
    expect(lyricAt(lines, 5)?.text).toBe('two')
    expect(lyricAt(lines, 9.99)?.text).toBe('two')
  })

  it('holds the last cue past the end', () => {
    expect(lyricAt(lines, 9999)?.text).toBe('three')
  })

  it('ends a cue at the next cue, and the last one after the fallback', () => {
    expect(lyricEnd(lines, 0)).toBe(5)
    expect(lyricEnd(lines, 2, 4)).toBe(14)
  })
})
