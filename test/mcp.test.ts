import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server'
import type { TakeSixDocument } from '@takesix/core'
import { createServer } from '../src/mcp/server.js'
import { guideText } from '../src/mcp/guide.js'
import { DOCUMENT_META_KEY, VIEW_URI } from '../src/mcp/shared.js'

const SKILL = `---
name: takesix
description: test
---

# TakeSix

Rules go here.
`

const doc: TakeSixDocument = {
  takesix: '1.0',
  title: 'Shop',
  blocks: [
    { id: 'web', title: 'Web', at: 'A1:B1' },
    { id: 'api', title: 'API', at: 'D1:F1', children: [{ id: 'auth', title: 'Auth', at: 'A1' }] },
  ],
  links: [{ id: 'l1', from: 'web', to: 'api' }],
}

const dir = mkdtempSync(join(tmpdir(), 'takesix-mcp-'))
let client: Client

beforeAll(async () => {
  const server = createServer({
    version: '0.0.0', skillMd: SKILL, formatMd: '# Format', schemaJson: '{}',
    viewerJs: 'VIEWER_JS', viewerCss: 'VIEWER_CSS', appJs: 'APP_JS', appCss: 'APP_CSS',
  })
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair()
  client = new Client({ name: 'test', version: '0.0.0' })
  await Promise.all([server.connect(serverSide), client.connect(clientSide)])
})
afterAll(() => client.close())

const text = (r: Awaited<ReturnType<Client['callTool']>>) =>
  (r.content as { type: string; text: string }[]).map(c => c.text).join('\n')

describe('guide', () => {
  it('is the skill without its frontmatter, with the MCP tools explained first', async () => {
    const out = text(await client.callTool({ name: 'guide', arguments: {} }))
    expect(out).toMatch(/^# TakeSix over MCP/)
    expect(out).toContain('Rules go here.')
    expect(out).not.toContain('description: test')
    expect(guideText(SKILL)).toBe(out)
  })

  it('is announced in the server instructions', () => {
    expect(client.getInstructions()).toContain('`guide`')
  })
})

describe('validate', () => {
  it('summarizes a valid document', async () => {
    const r = await client.callTool({ name: 'validate', arguments: { document: doc } })
    expect(r.isError).toBeFalsy()
    expect(text(r)).toBe('OK: 3 blocks on 2 levels, 1 link; top level shows 1 arrow')
  })

  it('lists problems with their JSON paths', async () => {
    const bad = { ...doc, links: [{ id: 'l1', from: 'web', to: 'nowhere' }] }
    const r = await client.callTool({ name: 'validate', arguments: { document: bad } })
    expect(r.isError).toBe(true)
    expect(text(r)).toContain('/links/0/to')
  })

  it('reads a file', async () => {
    const file = join(dir, 'shop.takesix.json')
    writeFileSync(file, JSON.stringify(doc))
    const r = await client.callTool({ name: 'validate', arguments: { file } })
    expect(text(r)).toMatch(/^OK: /)
  })

  it('asks for a document when given nothing', async () => {
    const r = await client.callTool({ name: 'validate', arguments: {} })
    expect(r.isError).toBe(true)
    expect(text(r)).toContain('`document`')
  })
})

describe('show', () => {
  it('points at the viewer resource', async () => {
    const { tools } = await client.listTools()
    expect(tools.map(t => t.name).sort()).toEqual(['guide', 'show', 'validate'])
    expect(tools.find(t => t.name === 'show')?._meta?.ui).toEqual({ resourceUri: VIEW_URI })
  })

  it('writes the HTML file and hands the document to the view only', async () => {
    const output = join(dir, 'out', 'shop.html')
    const r = await client.callTool({ name: 'show', arguments: { document: doc, output } })
    expect(text(r)).toContain(`Wrote ${output}`)
    expect(readFileSync(output, 'utf8')).toContain('<script>VIEWER_JS</script>')
    expect(r._meta?.[DOCUMENT_META_KEY]).toEqual(doc)
    // what the model may see stays small
    expect(r.structuredContent).toEqual({ summary: expect.any(String), html: output })
  })

  it('writes next to the source file by default', async () => {
    const file = join(dir, 'plan.takesix.json')
    writeFileSync(file, JSON.stringify(doc))
    const r = await client.callTool({ name: 'show', arguments: { file } })
    expect(text(r)).toContain(`Wrote ${join(dir, 'plan.html')}`)
  })
})

describe('resources and prompts', () => {
  it('serves the viewer as an MCP App with everything inlined', async () => {
    const { contents } = await client.readResource({ uri: VIEW_URI })
    const view = contents[0] as { mimeType: string; text: string }
    expect(view.mimeType).toBe(RESOURCE_MIME_TYPE)
    expect(view.text).toContain('<script>APP_JS</script>')
    expect(view.text).not.toMatch(/src=|href=/)
  })

  it('serves the format and the schema', async () => {
    expect((await client.readResource({ uri: 'takesix://format' })).contents[0]).toMatchObject({ text: '# Format' })
    expect((await client.readResource({ uri: 'takesix://schema' })).contents[0]).toMatchObject({ text: '{}' })
  })

  it('has a prompt that brings the guide along', async () => {
    const { messages } = await client.getPrompt({ name: 'diagram', arguments: { subject: 'this repository' } })
    const content = messages[0]!.content as { text: string }
    expect(content.text).toContain('Rules go here.')
    expect(content.text).toContain('Explain this repository as a TakeSix diagram')
  })
})
