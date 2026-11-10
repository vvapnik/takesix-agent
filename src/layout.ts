import { GRID_SIZE, formatIssues, levelAreas, lintLayout, type Area, type Block, type TakeSixDocument } from '@takesix/core'

/**
 * Layout advice for a valid document, one line each (arrows with a block in
 * their way, arrows that cross), with a heading; empty when there is none.
 */
export function layoutHints(doc: TakeSixDocument): string {
  const issues = formatIssues(lintLayout(doc))
  const text = [...gapHints(doc), ...textHints(doc)]
  if (!issues && !text.length) return ''
  return `Layout hints (the document is valid, but these screens read worse):\n${[issues, ...text].filter(Boolean).join('\n')}\n`
}

// How much text a card shows on the reference screen, by the block's width
// in columns: characters on a line of the title and of the description. The
// reference is the narrowest place a diagram is shown in: embedded in a chat
// column, 720px wide, where the grid's cells are square. A laptop screen
// stretches the grid (up to 2:1) and fits more. Measured in the viewer with
// an icon beside the text, Cyrillic (a little wider than Latin) rounded down.
// A one-column block shows its icon only (index 0: no text).
const TITLE_CHARS = [0, 12, 23, 35, 47, 44]
const DESCRIPTION_CHARS = [0, 15, 30, 45, 57, 57]

/** Description lines a card of this size shows: one on a one-row card, about five more per extra row. */
const descriptionLines = (height: number) => 1 + 5 * (height - 1)

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
        if (a.width === 1) {
          // Icon only: the title shows as a tooltip, the description not at all
          if (!block.icon) out.push(`warning ${path}/${i}/icon: "${block.id}" is one column wide and shows only its icon, but has none; give it an icon (an emoji or an SVG) or widen the block`)
          if (block.children?.length) level(block.children, `${path}/${i}/children`)
          return
        }
        const titleFits = TITLE_CHARS[a.width - 1]! * (a.height === 1 ? 1 : 2)
        if (block.title.length > titleFits) {
          out.push(`warning ${path}/${i}/title: Title of "${block.id}" (${size}) has ${block.title.length} characters, about ${titleFits} fit; shorten it or widen the block`)
        }
        const descriptionFits = DESCRIPTION_CHARS[a.width - 1]! * descriptionLines(a.height)
        const length = block.description?.length ?? 0
        if (length > descriptionFits) {
          out.push(`warning ${path}/${i}/description: Description of "${block.id}" (${size}) has ${length} characters, about ${descriptionFits} fit and the rest ends in "…"; shorten it${block.children ? '' : ', move the rest to details'} or widen the block`)
        }
      }
      if (block.children?.length) level(block.children, `${path}/${i}/children`)
    })
  }
  level(doc.blocks, '/blocks')
  return out
}

/**
 * Linked blocks that touch: no free column or row between them, so the arrow
 * is a stub with no room for a label. One `warning` line each.
 */
export function gapHints(doc: TakeSixDocument): string[] {
  // Every block's area and level, by id (ids are unique in the document)
  const placed = new Map<string, { area: Area; level: Block[] }>()
  const walk = (blocks: Block[]) => {
    const areas = levelAreas(blocks)
    for (const b of blocks) {
      const area = areas.get(b.id)
      if (area) placed.set(b.id, { area, level: blocks })
      if (b.children?.length) walk(b.children)
    }
  }
  walk(doc.blocks)
  const spans = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 && b0 < a1
  const out: string[] = []
  ;(doc.links ?? []).forEach((link, i) => {
    const a = placed.get(link.from)
    const b = placed.get(link.to)
    if (!a || !b || a.level !== b.level) return
    const x = a.area, y = b.area
    const side = spans(x.row, x.row + x.height, y.row, y.row + y.height) && (x.col + x.width === y.col || y.col + y.width === x.col)
    const above = spans(x.col, x.col + x.width, y.col, y.col + y.width) && (x.row + x.height === y.row || y.row + y.height === x.row)
    if (side || above) {
      out.push(`warning /links/${i}: Arrow "${link.from}" → "${link.to}" joins blocks that touch; leave a free ${side ? 'column' : 'row'} between them so the arrow has room`)
    }
  })
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
