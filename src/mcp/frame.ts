// Height of the MCP App view's frame. Pure, so it can be tested without a host.

import type { HostContext as McpUiHostContext } from './client.js'

/** Inline height in the conversation, unless the host fixes or caps it. */
const INLINE_HEIGHT = 560

/**
 * Height of the frame: full screen, the host's fixed height, or inline as tall
 * as the diagram needs (`needed`, at least INLINE_HEIGHT), within the host's
 * cap. Narrow inline frames (a chat column) lay the diagram out in rows as
 * tall as their content, which may need more than INLINE_HEIGHT.
 */
export function frameHeight(context: McpUiHostContext | undefined, needed = 0): string {
  if (context?.displayMode === 'fullscreen') return '100vh'
  const box = context?.containerDimensions
  if (box?.height) return `${box.height}px`
  const wanted = Math.max(INLINE_HEIGHT, Math.ceil(needed))
  return `${box?.maxHeight ? Math.min(box.maxHeight, wanted) : wanted}px`
}

/**
 * Height the diagram in `frame` needs: the frame's own, plus what the viewer
 * (its first child, which clips its content) cuts off at the bottom, and its
 * bottom padding below that.
 */
export function neededHeight(frame: HTMLElement): number {
  const viewer = frame.firstElementChild
  if (!viewer) return frame.clientHeight
  // scrollHeight leaves out the padding below a flex column's content
  const cut = viewer.scrollHeight - viewer.clientHeight
  if (cut <= 1) return frame.clientHeight
  const padding = parseFloat(getComputedStyle(viewer).paddingBottom) || 0
  // How far the lowest element reaches past the padding's top edge; text
  // clipped inside a card reaches further, hence the cap
  const limit = viewer.getBoundingClientRect().bottom - padding
  let lowest = 0
  for (const el of viewer.querySelectorAll('*')) {
    const r = el.getBoundingClientRect()
    if (r.height > 0) lowest = Math.max(lowest, r.bottom - limit)
  }
  return frame.clientHeight + Math.min(Math.max(cut, lowest), cut + padding)
}
