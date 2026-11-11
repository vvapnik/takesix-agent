import { createRoot } from 'react-dom/client'
import { McpAppClient, type HostContext as McpUiHostContext } from './client.js'
import { TakeSix, type MenuOptions } from '@takesix/react'
import { PRELOADER_HTML, preloaderErrorHtml } from '@takesix/react/preloader'
import '@takesix/react/style.css'
import { parseDocument, type TakeSixDocument } from '@takesix/core'
import { DOCUMENT_META_KEY } from './shared.js'
import './app.css'

// The MCP App view: runs in the host's sandboxed frame and shows the diagram
// that `show` was called with.

/** Inline height in the conversation, unless the host fixes or caps it. */
const INLINE_HEIGHT = 560

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
}

function height(context: McpUiHostContext | undefined): string {
  if (context?.displayMode === 'fullscreen') return '100vh'
  const box = context?.containerDimensions
  if (box && 'height' in box) return `${box.height}px`
  if (box && 'maxHeight' in box && box.maxHeight) return `${Math.min(box.maxHeight, INLINE_HEIGHT)}px`
  return `${INLINE_HEIGHT}px`
}

// The host's sandbox blocks new tabs and downloads: ask the host for both
const MENU: MenuOptions = {
  openLink: url => void app.openLink({ url }),
  download: ({ name, mimeType, text }) => void app.downloadFile({
    contents: [{ type: 'resource', resource: { uri: `file:///${name}`, mimeType, text } }],
  }),
}

function View({ doc, error, context }: State) {
  const fullscreen = context?.displayMode === 'fullscreen'
  const canFullscreen = context?.availableDisplayModes?.includes('fullscreen')
  const theme = context?.theme === 'dark' ? 'dark' : context?.theme === 'light' ? 'light' : 'auto'
  return (
    <div className="frame" data-theme={theme} style={{ height: height(context) }}>
      {doc
        ? <TakeSix document={doc} theme={theme} menu={MENU} />
        // The same loading screen the page showed before the script ran, or why there is no diagram
        : <div className="status" dangerouslySetInnerHTML={{ __html: error ? preloaderErrorHtml(error) : PRELOADER_HTML }} />}
      {doc && canFullscreen && (
        <button
          className="mode"
          onClick={() => app.requestDisplayMode({ mode: fullscreen ? 'inline' : 'fullscreen' })
            .then(({ mode }) => update({ context: { ...state.context, displayMode: mode } }))}
        >
          {fullscreen ? 'Exit full screen' : 'Full screen'}
        </button>
      )}
    </div>
  )
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
