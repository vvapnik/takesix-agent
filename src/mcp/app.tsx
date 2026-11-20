import { useLayoutEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { McpAppClient, type HostContext as McpUiHostContext } from './client.js'
import { TakeSix, type MenuOptions } from '@takesix/react'
import { PRELOADER_HTML, preloaderErrorHtml } from '@takesix/react/preloader'
import '@takesix/react/style.css'
import { parseDocument, type TakeSixDocument } from '@takesix/core'
import { DOCUMENT_META_KEY } from './shared.js'
import { frameHeight, neededHeight } from './frame.js'
import './app.css'

// The MCP App view: runs in the host's sandboxed frame and shows the diagram
// that `show` was called with.

interface State {
  doc?: TakeSixDocument
  error?: string
  context?: McpUiHostContext
}

const app = new McpAppClient({ name: 'TakeSix', version: '1.0.0' }, { availableDisplayModes: ['inline', 'fullscreen'] })
const root = createRoot(document.getElementById('root')!)
let state: State = {}

function update(patch: Partial<State>) {
  state = { ...state, ...patch }
  root.render(<View {...state} />)
  openFullscreen()
}

// The host's sandbox blocks new tabs and downloads: ask the host for both
const MENU: MenuOptions = {
  openLink: url => void app.openLink({ url }),
  download: ({ name, mimeType, text }) => void app.downloadFile({
    contents: [{ type: 'resource', resource: { uri: `file:///${name}`, mimeType, text } }],
  }),
}

function View({ doc, error, context }: State) {
  const theme = context?.theme === 'dark' ? 'dark' : context?.theme === 'light' ? 'light' : 'auto'
  const frameRef = useRef<HTMLDivElement>(null)
  // The tallest the diagram has needed so far: the frame only grows, so going
  // into a block and back does not make the conversation jump
  const [needed, setNeeded] = useState(0)
  useLayoutEffect(() => {
    const frame = frameRef.current
    if (!frame || !doc) return
    let pending = 0
    const measure = () => {
      cancelAnimationFrame(pending)
      pending = requestAnimationFrame(() => setNeeded(n => Math.max(n, neededHeight(frame))))
    }
    // Cards grow when fonts load and when another level opens
    const resize = new ResizeObserver(measure)
    resize.observe(frame)
    const mutations = new MutationObserver(measure)
    mutations.observe(frame, { childList: true, subtree: true })
    void document.fonts?.ready.then(measure)
    measure()
    return () => { cancelAnimationFrame(pending); resize.disconnect(); mutations.disconnect() }
  }, [doc])
  return (
    <div ref={frameRef} className="frame" data-theme={theme} style={{ height: frameHeight(context, needed) }}>
      {doc
        ? <TakeSix document={doc} theme={theme} menu={MENU} />
        // The same loading screen the page showed before the script ran, or why there is no diagram
        : <div className="status" dangerouslySetInnerHTML={{ __html: error ? preloaderErrorHtml(error) : PRELOADER_HTML }} />}
    </div>
  )
}

// Inline the frame is too small for most diagrams: ask the host for full
// screen once, as soon as there is a diagram. If the host refuses, stay inline.
let askedFullscreen = false
function openFullscreen() {
  if (askedFullscreen || !state.doc || !state.context) return
  if (!state.context.availableDisplayModes?.includes('fullscreen')) return
  askedFullscreen = true
  if (state.context.displayMode === 'fullscreen') return
  app.requestDisplayMode({ mode: 'fullscreen' })
    .then(({ mode }) => update({ context: { ...state.context, displayMode: mode } }))
    .catch(() => {})
}

// Handlers go in before connect(), so the first notifications are not missed.
app.ontoolinput = ({ arguments: args }) => {
  // Draw from the arguments right away; the result replaces it
  if (state.doc || !args?.document) return
  const parsed = parseDocument(args.document)
  if (parsed.ok) update({ doc: parsed.document })
}
app.ontoolresult = result => {
  const doc = result._meta?.[DOCUMENT_META_KEY] as TakeSixDocument | undefined
  if (doc) update({ doc, error: undefined })
  else if (result.isError) {
    const text = result.content?.find(c => c.type === 'text')
    update({ error: text && 'text' in text ? text.text : 'The document is not valid.' })
  }
}
app.onhostcontextchanged = context => update({ context: { ...state.context, ...context } })

update({})
app.connect().then(() => update({ context: app.getHostContext() }))
