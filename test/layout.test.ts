import { describe, expect, it } from 'vitest'
import type { TakeSixDocument } from '@takesix/core'
import { layoutHints, sketch, textHints } from '../src/layout.js'
import { summarize } from '../src/summary.js'

const doc: TakeSixDocument = {
  takesix: '1.0',
  title: 'A <b>"quoted"</b> title',
  blocks: [
    { id: 'a', title: 'A', at: 'A1', children: [{ id: 'a1', title: 'A1', at: 'A1' }] },
    { id: 'b', title: 'B', at: 'C1', description: '</script><script>alert(1)</script>' },
    { id: 'c', title: 'C', at: 'E1:F2', children: [{ id: 'c1', title: 'C1', at: 'B2' }] },
  ],
  links: [
    { id: 'ab', from: 'a', to: 'b' },
    { id: 'deep', from: 'a1', to: 'c1' },
  ],
}

describe('summarize', () => {
  it('describes size, depth, links and what the top level shows', () => {
    expect(summarize(doc)).toBe(
      '5 blocks on 2 levels, 2 links; top level shows 1 arrow; 1 link between levels not drawn: link the blocks that contain them',
    )
  })
})

describe('layoutHints', () => {
  it('is empty for a clean layout', () => {
    const blocks = doc.blocks.map(({ description: _, ...block }) => block)
    expect(layoutHints({ ...doc, blocks, links: [{ from: 'a', to: 'b' }] })).toBe('')
  })

  it('lists arrows with a block in their way', () => {
    // A straight arrow goes around a block in its way; a slanted one cannot
    const blocked: TakeSixDocument = {
      takesix: '1.0', title: 'T',
      blocks: [{ id: 'a', title: 'A', at: 'A1' }, { id: 'b', title: 'B', at: 'B2' }, { id: 'c', title: 'C', at: 'C3' }],
      links: [{ from: 'a', to: 'c' }],
    }
    expect(layoutHints(blocked)).toMatch(/^Layout hints[^\n]*\nwarning \/blocks: Arrow "a" → "c" has block "b" in its way/)
  })
})

describe('textHints', () => {
  const card = (at: string, title: string, description: string): TakeSixDocument => ({
    takesix: '1.0', title: 'T', description: 'D', blocks: [{ id: 'x', at, title, description }], links: [],
  })

  it('is empty when the text fits the card', () => {
    expect(textHints(card('A1', 'Short title', 'Fits on one line'))).toEqual([])
    expect(textHints(card('A1:A2', 'Two-line title fits', 'A'.repeat(130)))).toEqual([])
  })

  it('flags a title or description longer than the card shows', () => {
    expect(textHints(card('A1', 'A title far too long', 'Fits'))).toEqual([
      'warning /blocks/0/title: Title of "x" (1×1) has 20 characters, about 15 fit; shorten it or widen the block',
    ])
    expect(textHints(card('A1:B1', 'Title', 'A'.repeat(51)))[0]).toMatch(/^warning \/blocks\/0\/description: Description of "x" \(2×1\) has 51 characters, about 50 fit/)
  })
})

describe('sketch', () => {
  it('draws every level as a grid of block ids', () => {
    const lines = sketch(doc).split('\n')
    expect(lines[0]).toBe('A <b>"quoted"</b> title')
    expect(lines[1]).toBe('    A         B         C         D         E         F')
    expect(lines[2]).toBe(' 1  a         ·         b         ·         c         c')
    expect(lines[3]).toBe(' 2  ·         ·         ·         ·         c         c')
    // nested levels follow, indented
    expect(lines).toContain('   2  ·         c1        ·         ·         ·         ·')
  })
})
