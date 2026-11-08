import { createRoot } from 'react-dom/client'
import { TakeSix } from '@takesix/react'
import { preloaderErrorHtml } from '@takesix/react/preloader'
import '@takesix/react/style.css'
import { parseDocument, formatIssues } from '@takesix/core'

// Mounts the viewer on a page made by `takesix render`: the document is in
// <script type="application/json" id="takesix-data">.
const data = document.getElementById('takesix-data')?.textContent
const root = document.getElementById('root')
if (root) {
  const result = data ? parseDocument(data) : undefined
  if (result?.ok) {
    // The page as it came, before React fills #root: "Save as HTML" saves this
    // copy, which opens on its own like the original.
    const page = `<!doctype html>\n${document.documentElement.outerHTML}`
    createRoot(root).render(<TakeSix document={result.document} menu={{ html: () => page }} />)
  } else {
    // Instead of the loading screen: why there is no diagram
    root.innerHTML = preloaderErrorHtml(result
      ? `This diagram cannot be shown:\n${formatIssues(result.issues.filter(i => i.severity === 'error'))}`
      : 'This page has no diagram in it.')
  }
}
