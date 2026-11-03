import { GRID_SIZE, formatIssues, levelAreas, lintLayout, type Block, type TakeSixDocument } from '@takesix/core'

/**
 * Layout advice for a valid document, one line each (arrows with a block in
 * their way, arrows that cross), with a heading; empty when there is none.
 */
export function layoutHints(doc: TakeSixDocument): string {
  const issues = lintLayout(doc)
  if (!issues.length) return ''
  return `Layout hints (the document is valid, but these screens read worse):\n${formatIssues(issues)}\n`
}

/** Width of a cell in the sketch. */
const CELL = 10

/**
 * Every level as a text grid: each cell shows the id of the block covering it,
 * `·` an empty cell. Lets an agent check its placement before rendering.
 */
export function sketch(doc: TakeSixDocument): string {
  const out: string[] = []
  const level = (blocks: Block[], title: string, depth: number) => {
    const indent = '  '.repeat(depth)
    const grid = Array.from({ length: GRID_SIZE }, () => Array<string>(GRID_SIZE).fill('·'))
    for (const [id, a] of levelAreas(blocks)) {
      for (let r = a.row; r < a.row + a.height; r++) {
        for (let c = a.col; c < a.col + a.width; c++) grid[r]![c] = id.slice(0, CELL - 1)
      }
    }
    out.push(`${indent}${title}`)
    out.push(`${indent}    ${'ABCDEF'.split('').map(c => c.padEnd(CELL)).join('').trimEnd()}`)
    grid.forEach((row, r) => out.push(`${indent} ${r + 1}  ${row.map(c => c.padEnd(CELL)).join('').trimEnd()}`))
    for (const block of blocks) if (block.children?.length) level(block.children, block.title, depth + 1)
  }
  level(doc.blocks, doc.title, 0)
  return out.join('\n') + '\n'
}
