// A minimal MCP Apps (SEP-1865) view client: JSON-RPC 2.0 over postMessage.
// It replaces `App` from @modelcontextprotocol/ext-apps in the view bundle,
// which pulls in the MCP SDK and zod (~600 KB). Only what the TakeSix view
// uses is here; test/client.test.ts runs it against the real AppBridge.

export const PROTOCOL_VERSION = '2026-01-26'

export type DisplayMode = 'inline' | 'fullscreen' | 'pip'

/** The parts of McpUiHostContext the view reads. */
export interface HostContext {
  theme?: 'light' | 'dark'
  displayMode?: DisplayMode
  availableDisplayModes?: DisplayMode[]
  containerDimensions?: { height?: number; maxHeight?: number; width?: number; maxWidth?: number }
  [key: string]: unknown
}

export interface ToolResult {
  content?: Array<{ type: string; text?: string; [key: string]: unknown }>
  isError?: boolean
  _meta?: Record<string, unknown>
  [key: string]: unknown
}

export interface DownloadContent {
  type: 'resource'
  resource: { uri: string; mimeType?: string; text?: string; blob?: string }
}

/** Where messages go and come from: the host frame in a browser, anything in tests. */
export interface Port {
  send(message: unknown): void
  listen(handler: (message: unknown) => void): void
}

interface Message {
  jsonrpc: '2.0'
  id?: number | string
  method?: string
  params?: Record<string, unknown>
  result?: unknown
  error?: { code: number; message: string }
}

/** The parent frame; messages from any other source are ignored. */
export function parentPort(): Port {
  return {
    send: message => window.parent.postMessage(message, '*'),
    listen: handler => window.addEventListener('message', event => {
      if (event.source === window.parent) handler(event.data)
    }),
  }
}

export class McpAppClient {
  ontoolinput?: (params: { arguments?: Record<string, unknown> }) => void
  ontoolresult?: (result: ToolResult) => void
  onhostcontextchanged?: (context: HostContext) => void

  private port?: Port
  private nextId = 1
  private pending = new Map<number | string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()
  private hostContext: HostContext = {}

  constructor(
    private readonly appInfo: { name: string; version: string },
    private readonly capabilities: { availableDisplayModes?: DisplayMode[] } = {},
  ) {}

  getHostContext(): HostContext {
    return this.hostContext
  }

  async connect(port: Port = parentPort(), autoResize = typeof ResizeObserver !== 'undefined'): Promise<void> {
    this.port = port
    port.listen(message => this.receive(message))
    const result = await this.request('ui/initialize', {
      appInfo: this.appInfo,
      appCapabilities: this.capabilities,
      protocolVersion: PROTOCOL_VERSION,
    }) as { hostContext?: HostContext }
    this.hostContext = result.hostContext ?? {}
    this.notify('ui/notifications/initialized', {})
    if (autoResize) this.watchSize()
  }

  openLink(params: { url: string }): Promise<unknown> {
    return this.request('ui/open-link', params)
  }

  downloadFile(params: { contents: DownloadContent[] }): Promise<unknown> {
    return this.request('ui/download-file', params)
  }

  requestDisplayMode(params: { mode: DisplayMode }): Promise<{ mode: DisplayMode }> {
    return this.request('ui/request-display-mode', params) as Promise<{ mode: DisplayMode }>
  }

  private request(method: string, params: Record<string, unknown>): Promise<unknown> {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.send({ jsonrpc: '2.0', id, method, params })
    })
  }

  private notify(method: string, params: Record<string, unknown>) {
    this.send({ jsonrpc: '2.0', method, params })
  }

  private send(message: Message) {
    if (!this.port) throw new Error('Not connected')
    this.port.send(message)
  }

  private receive(data: unknown) {
    const message = data as Message
    if (!message || typeof message !== 'object' || message.jsonrpc !== '2.0') return
    // A response to one of our requests
    if (message.method === undefined) {
      const waiter = message.id !== undefined ? this.pending.get(message.id) : undefined
      if (!waiter) return
      this.pending.delete(message.id!)
      if (message.error) waiter.reject(new Error(message.error.message))
      else waiter.resolve(message.result ?? {})
      return
    }
    // A request from the host: ping and teardown get an empty result
    if (message.id !== undefined) {
      if (message.method === 'ping' || message.method === 'ui/resource-teardown') {
        this.send({ jsonrpc: '2.0', id: message.id, result: {} })
      } else {
        this.send({ jsonrpc: '2.0', id: message.id, error: { code: -32601, message: `Method not found: ${message.method}` } })
      }
      return
    }
    const params = message.params ?? {}
    switch (message.method) {
      case 'ui/notifications/tool-input':
        this.ontoolinput?.(params as { arguments?: Record<string, unknown> })
        break
      case 'ui/notifications/tool-result':
        this.ontoolresult?.(params as ToolResult)
        break
      case 'ui/notifications/host-context-changed':
        this.hostContext = { ...this.hostContext, ...params }
        this.onhostcontextchanged?.(params as HostContext)
        break
    }
  }

  /** Tells the host the content size, as ext-apps' App does with autoResize. */
  private watchSize() {
    let scheduled = false
    let width = 0
    let height = 0
    const measure = () => {
      if (scheduled) return
      scheduled = true
      requestAnimationFrame(() => {
        scheduled = false
        const html = document.documentElement
        const previous = html.style.height
        html.style.height = 'max-content'
        const h = Math.ceil(html.getBoundingClientRect().height)
        html.style.height = previous
        const w = Math.ceil(window.innerWidth)
        if (w !== width || h !== height) {
          width = w
          height = h
          this.notify('ui/notifications/size-changed', { width: w, height: h })
        }
      })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(document.documentElement)
    observer.observe(document.body)
  }
}
