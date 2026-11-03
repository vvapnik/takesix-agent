import { describe, expect, it } from 'vitest'
import type { TakeSixDocument } from '@takesix/core'
import { renderHtml } from '../src/render.js'
import { layoutHints, sketch } from '../src/layout.js'
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

describe('renderHtml', () => {
  const html = renderHtml(doc, 'VIEWER_JS', 'VIEWER_CSS')

  it('inlines the document, the viewer script and the stylesheet', () => {
    expect(html).toContain('<script type="application/json" id="takesix-data">')
    expect(html).toContain('<script>VIEWER_JS</script>')
    expect(html).toContain('<style>VIEWER_CSS</style>')
    expect(html).not.toMatch(/src=|href=/)
  })

  it('escapes the title', () => {
    expect(html).toContain('<title>A &lt;b&gt;&quot;quoted&quot;&lt;/b&gt; title</title>')
  })

  it('keeps document text from closing the data script', () => {
    // only the real closing tags of the two script elements
    expect(html.match(/<\/script>/g)).toHaveLength(2)
    const data = html.split('id="takesix-data">')[1]!.split('</script>')[0]!
    expect(JSON.parse(data)).toEqual(doc)
  })
})

describe('summarize', () => {
  it('describes size, depth, links and what the top level shows', () => {
    expect(summarize(doc)).toBe(
      '5 blocks on 2 levels, 2 links; top level shows 2 arrows (1 merged from nested links: check they are wanted there)',
    )
  })
})

describe('layoutHints', () => {
  it('is empty for a clean layout', () => {
    expect(layoutHints({ ...doc, links: [{ from: 'a', to: 'b' }] })).toBe('')
  })

  it('lists arrows with a block in their way', () => {
    const blocked: TakeSixDocument = { ...doc, links: [{ from: 'a', to: 'c' }] }
    expect(layoutHints(blocked)).toMatch(/^Layout hints[^\n]*\nwarning \/blocks: Arrow "a" → "c" has block "b" in its way/)
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
