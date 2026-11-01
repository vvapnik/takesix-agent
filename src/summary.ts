import { buildIndex, visibleLinks, type TakeSixDocument } from '@takesix/core'

/** One line about the shape of a valid document, to help an agent judge it. */
export function summarize(doc: TakeSixDocument): string {
  const index = buildIndex(doc)
  const depth = Math.max(0, ...[...index.values()].map(e => e.depth + 1))
  const links = doc.links?.length ?? 0
  const top = visibleLinks(doc, null, index)
  const merged = top.filter(l => !l.direct).length
  return `${index.size} blocks on ${depth} level${depth === 1 ? '' : 's'}, ${links} link${links === 1 ? '' : 's'}; ` +
    `top level shows ${top.length} arrow${top.length === 1 ? '' : 's'}` +
    (merged ? ` (${merged} merged from nested links: check they are wanted there)` : '')
}
