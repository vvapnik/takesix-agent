import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { AppBridge } from '@modelcontextprotocol/ext-apps/app-bridge'
import { McpAppClient, type Port, type ToolResult } from '../src/mcp/client.js'

// The view's own MCP Apps client, checked against the host side of the
// official SDK so the two stay in step when the protocol changes.

async function connected() {
  const [hostEnd, viewEnd] = InMemoryTransport.createLinkedPair()
  const bridge = new AppBridge(null, { name: 'Host', version: '1.0.0' }, { openLinks: {}, downloadFile: {} }, {
    hostContext: { theme: 'dark', displayMode: 'inline', availableDisplayModes: ['inline', 'fullscreen'] },
  })
  const initialized = new Promise<void>(done => { bridge.oninitialized = () => done() })
  await bridge.connect(hostEnd)

  const listeners: Array<(m: unknown) => void> = []
  viewEnd.onmessage = message => listeners.forEach(l => l(message))
  await viewEnd.start()
  const port: Port = { send: m => void viewEnd.send(m as never), listen: l => listeners.push(l) }

  const client = new McpAppClient({ name: 'TakeSix', version: '1.0.0' }, { availableDisplayModes: ['inline', 'fullscreen'] })
  await client.connect(port, false)
  await initialized
  return { bridge, client }
}

describe('McpAppClient against AppBridge', () => {
  it('initializes and gets the host context', async () => {
    const { bridge, client } = await connected()
    expect(client.getHostContext().theme).toBe('dark')
    expect(bridge.getAppCapabilities()?.availableDisplayModes).toEqual(['inline', 'fullscreen'])
    expect(bridge.getAppVersion()?.name).toBe('TakeSix')
  })

  it('receives tool input, tool result and context changes', async () => {
    const { bridge, client } = await connected()
    const input = new Promise(done => { client.ontoolinput = done })
    const result = new Promise<ToolResult>(done => { client.ontoolresult = done })
    const context = new Promise(done => { client.onhostcontextchanged = done })
    await bridge.sendToolInput({ arguments: { document: '{}' } })
    await bridge.sendToolResult({ content: [{ type: 'text', text: 'ok' }], _meta: { doc: 1 } })
    bridge.setHostContext({ theme: 'light', displayMode: 'inline', availableDisplayModes: ['inline', 'fullscreen'] })
    expect(await input).toEqual({ arguments: { document: '{}' } })
    expect((await result)._meta).toEqual({ doc: 1 })
    expect(await context).toMatchObject({ theme: 'light' })
    expect(client.getHostContext().theme).toBe('light')
  })

  it('sends open-link, download-file and display-mode requests', async () => {
    const { bridge, client } = await connected()
    const links: string[] = []
    const files: unknown[] = []
    bridge.onopenlink = async ({ url }) => { links.push(url); return {} }
    bridge.ondownloadfile = async ({ contents }) => { files.push(...contents); return {} }
    bridge.onrequestdisplaymode = async ({ mode }) => ({ mode })
    await client.openLink({ url: 'https://example.com/' })
    await client.downloadFile({ contents: [{ type: 'resource', resource: { uri: 'file:///a.html', mimeType: 'text/html', text: 'x' } }] })
    expect(await client.requestDisplayMode({ mode: 'fullscreen' })).toEqual({ mode: 'fullscreen' })
    expect(links).toEqual(['https://example.com/'])
    expect(files).toHaveLength(1)
  })

  it('answers teardown', async () => {
    const { bridge } = await connected()
    await expect(bridge.teardownResource({})).resolves.toBeDefined()
  })
})

// Every `show` call puts the view in the conversation: keep it small.
const VIEW_JS = resolve(import.meta.dirname, '../dist/app/app.js')
// Temporary limit until the view moves to Preact
const MAX_VIEW_BYTES = 750 * 1024

describe.runIf(existsSync(VIEW_JS))('view bundle', () => {
  it(`is under ${MAX_VIEW_BYTES / 1024} KB`, () => {
    expect(statSync(VIEW_JS).size).toBeLessThan(MAX_VIEW_BYTES)
  })
})
