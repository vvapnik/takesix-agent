import { buildIndex, visibleLinks, type TakeSixDocument } from '@takesix/core'

/** One line about the shape of a valid document, to help an agent judge it. */
export function summarize(doc: TakeSixDocument): string {
  const index = buildIndex(doc)
  const depth = Math.max(0, ...[...index.values()].map(e => e.depth + 1))
  const links = doc.links?.length ?? 0
  const top = visibleLinks(doc, null, index)
  // Links between blocks of different levels are never drawn
  const across = (doc.links ?? []).filter(l => index.get(l.from)?.parentId !== index.get(l.to)?.parentId).length
  return `${index.size} blocks on ${depth} level${depth === 1 ? '' : 's'}, ${links} link${links === 1 ? '' : 's'}; ` +
    `top level shows ${top.length} arrow${top.length === 1 ? '' : 's'}` +
    (across ? `; ${across} link${across === 1 ? '' : 's'} between levels not drawn: link the blocks that contain them` : '')
}
