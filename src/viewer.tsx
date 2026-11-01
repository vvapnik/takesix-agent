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
  createRoot(root).render(<TakeSix document={doc} />)
}
