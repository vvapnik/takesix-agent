import { createRoot } from 'react-dom/client'
import { TakeSix } from '@takesix/react'
import '@takesix/react/style.css'
import type { TakeSixDocument } from '@takesix/core'

// Mounts the viewer on a page made by `takesix render`: the document is in
// <script type="application/json" id="takesix-data">.
const data = document.getElementById('takesix-data')?.textContent
const root = document.getElementById('root')
if (data && root) {
  const doc = JSON.parse(data) as TakeSixDocument
  // The page as it came, before React fills #root: "Save as HTML" saves this
  // copy, which opens on its own like the original.
  const page = `<!doctype html>\n${document.documentElement.outerHTML}`
  createRoot(root).render(<TakeSix document={doc} menu={{ html: () => page }} />)
}
