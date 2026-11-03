import { GRID_SIZE, formatIssues, levelAreas, lintLayout, type Block, type TakeSixDocument } from '@takesix/core'

/**
 * Layout advice for a valid document, one line each (arrows with a block in
 * their way, arrows that cross), with a heading; empty when there is none.
 */
export function layoutHints(doc: TakeSixDocument): string {
  const issues = formatIssues(lintLayout(doc))
  const text = textHints(doc)
  if (!issues && !text.length) return ''
  return `Layout hints (the document is valid, but these screens read worse):\n${[issues, ...text].filter(Boolean).join('\n')}\n`
}

// How much text a card shows at full size on the reference screen (MacBook
// Pro 13", a 1440×790 browser viewport), with an icon and "N more inside",
// by the block's width in columns: characters on a line of the title and of
// the description. Measured in the viewer, Cyrillic (a little wider than
// Latin) rounded down.
const TITLE_CHARS = [15, 40, 65, 85, 110, 130]
const DESCRIPTION_CHARS = [19, 50, 85, 110, 140, 165]

/** Description lines a card of this size shows: one per one-row card, more per row. */
const descriptionLines = (width: number, height: number) =>
  height === 1 ? (width === GRID_SIZE ? 2 : 1) : 1 + 6 * (height - 1)

/**
 * Blocks whose title or description is longer than their card shows: the
 * viewer ends the description with "…". One `warning path: message` line each.
 */
export function textHints(doc: TakeSixDocument): string[] {
  const out: string[] = []
  const level = (blocks: Block[], path: string) => {
    const areas = levelAreas(blocks)
    blocks.forEach((block, i) => {
      const a = areas.get(block.id)
      if (a) {
        const size = `${a.width}×${a.height}`
        const titleFits = TITLE_CHARS[a.width - 1]! * (a.height === 1 ? 1 : 2)
        if (block.title.length > titleFits) {
          out.push(`warning ${path}/${i}/title: Title of "${block.id}" (${size}) has ${block.title.length} characters, about ${titleFits} fit; shorten it or widen the block`)
        }
        const descriptionFits = DESCRIPTION_CHARS[a.width - 1]! * descriptionLines(a.width, a.height)
        const length = block.description?.length ?? 0
        if (length > descriptionFits) {
          out.push(`warning ${path}/${i}/description: Description of "${block.id}" (${size}) has ${length} characters, about ${descriptionFits} fit and the rest ends in "…"; shorten it, move the rest to details, or widen the block`)
        }
      }
      if (block.children?.length) level(block.children, `${path}/${i}/children`)
    })
  }
  level(doc.blocks, '/blocks')
  return out
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
