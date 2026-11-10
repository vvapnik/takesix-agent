import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { RESOURCE_MIME_TYPE, registerAppResource, registerAppTool } from '@modelcontextprotocol/ext-apps/server'
import { formatIssues, parseDocument, type TakeSixDocument } from '@takesix/core'
import { PRELOADER_HTML } from '@takesix/react/preloader'
import { z } from 'zod'
import { standaloneHtml } from '@takesix/react/standalone'
import { layoutHints } from '../layout.js'
import { summarize } from '../summary.js'
import { BLUEPRINT_TYPES, blueprintText, guideText, type BlueprintType } from './guide.js'
import { DOCUMENT_META_KEY, VIEW_URI } from './shared.js'

/** Texts the server hands out; read from the package by main.ts. */
export interface Assets {
  version: string
  skillMd: string
  /** The blueprint files of the skill, and the epic example (JSON). */
  blueprints: Record<BlueprintType, string>
  formatMd: string
  schemaJson: string
  /** Viewer for the MCP App, fed by the host. The HTML files `show` writes come from @takesix/react/standalone. */
  appJs: string
  appCss: string
}


const INSTRUCTIONS = `TakeSix turns an answer into a diagram: at most six blocks per screen, and any block opens into up to six more. Use it when the user asks to explain, map or summarize something with structure (a codebase, an architecture, a plan, a process, a document) and the answer would otherwise be long prose. Call \`guide\` once before writing your first diagram, then \`validate\` and \`show\`.`

const source = {
  document: z.record(z.string(), z.unknown()).optional()
    .describe('The takesix document as a JSON object ({ "takesix": "1.0", "title", "blocks", "links" })'),
  file: z.string().optional()
    .describe('Path to a .takesix.json file, instead of `document`'),
}

type Loaded = { ok: true; doc: TakeSixDocument; warnings: string; file?: string } | { ok: false; error: CallToolResult }

function fail(text: string): { ok: false; error: CallToolResult } {
  return { ok: false, error: { isError: true, content: [{ type: 'text', text }] } }
}

function load(args: { document?: Record<string, unknown>; file?: string }): Loaded {
  let input: unknown = args.document
  let file: string | undefined
  if (input === undefined) {
    if (!args.file) return fail('Pass the document as `document`, or a path to a .takesix.json file as `file`.')
    file = resolve(args.file)
    try {
      input = readFileSync(file, 'utf8')
    } catch (e) {
      return fail(`Cannot read ${file}: ${(e as Error).message}`)
    }
  }
  const result = parseDocument(input)
  if (!result.ok) {
    return fail(`Invalid takesix document. Fix these and try again:\n${formatIssues(result.issues)}`)
  }
  const warnings = (result.issues.length ? formatIssues(result.issues) + '\n' : '') + layoutHints(result.document)
  return { ok: true, doc: result.document, warnings, file }
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'diagram'

/** Next to the source file, or in a takesix folder in the temp directory. */
function htmlPath(doc: TakeSixDocument, file: string | undefined, output: string | undefined): string {
  if (output) return resolve(output)
  if (file) return join(dirname(file), basename(file).replace(/(\.takesix)?\.json$/, '') + '.html')
  return join(tmpdir(), 'takesix', `${slug(doc.title)}.html`)
}

/** Page for the MCP App: the viewer, waiting for the host to send a document. */
export function viewHtml(assets: Pick<Assets, 'appJs' | 'appCss'>): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>TakeSix</title>
<style>${assets.appCss}</style>
</head>
<body>
<div id="root">${PRELOADER_HTML}</div>
<script>${assets.appJs}</script>
</body>
</html>
`
}

export function createServer(assets: Assets): McpServer {
  const server = new McpServer({ name: 'takesix', version: assets.version }, { instructions: INSTRUCTIONS })

  server.registerTool('guide', {
    title: 'How to write a TakeSix diagram',
    description: 'The format and the rules that make a TakeSix diagram readable. Read it once before writing your first diagram in a conversation, then once more with the `type` of each kind of diagram you draw: its blueprint (layout, arrows, levels).',
    inputSchema: {
      type: z.enum(BLUEPRINT_TYPES).optional().describe(
        'The blueprint to read: basic (peers, centred tiles), architecture, plan (to-do, roadmap, talk outline), flowchart (algorithm), or epic for an example that combines them. Leave out for the general guide.'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ type }) => ({
    content: [{ type: 'text', text: type ? blueprintText(type, assets.blueprints[type]) : guideText(assets.skillMd) }],
  }))

  server.registerTool('validate', {
    title: 'Check a TakeSix document',
    description: 'Checks a TakeSix document against the format: at most 6 blocks per level, unique ids, links between existing blocks. Lists every problem with its JSON path; on success, one line about the shape of the diagram.',
    inputSchema: source,
    annotations: { readOnlyHint: true },
  }, async args => {
    const loaded = load(args)
    if (!loaded.ok) return loaded.error
    return { content: [{ type: 'text', text: `${loaded.warnings}OK: ${summarize(loaded.doc)}` }] }
  })

  registerAppTool(server, 'show', {
    title: 'Show a TakeSix diagram',
    description: 'Validates a TakeSix document and writes it as one self-contained HTML file (opens in any browser, no network). In apps that support MCP Apps the diagram also opens in the conversation. Returns the file path.',
    inputSchema: {
      ...source,
      output: z.string().optional()
        .describe('Where to write the HTML file. Default: next to `file`, or in a takesix folder in the temp directory'),
    },
    _meta: { ui: { resourceUri: VIEW_URI } },
  }, async args => {
    const loaded = load(args)
    if (!loaded.ok) return loaded.error
    const { doc } = loaded
    const out = htmlPath(doc, loaded.file, args.output)
    try {
      mkdirSync(dirname(out), { recursive: true })
      writeFileSync(out, standaloneHtml(doc))
    } catch (e) {
      return fail(`Cannot write ${out}: ${(e as Error).message}`).error
    }
    const summary = summarize(doc)
    return {
      content: [{ type: 'text', text: `${loaded.warnings}OK: ${summary}\nWrote ${out}` }],
      // Small on purpose: some clients give this to the model instead of `content`
      structuredContent: { summary, html: out },
      _meta: { [DOCUMENT_META_KEY]: doc },
    }
  })

  registerAppResource(server, 'TakeSix viewer', VIEW_URI, {
    description: 'Interactive viewer for the diagram shown by `show`',
  }, async () => ({
    contents: [{ uri: VIEW_URI, mimeType: RESOURCE_MIME_TYPE, text: viewHtml(assets) }],
  }))

  server.registerResource('format', 'takesix://format', {
    title: 'TakeSix format specification',
    description: 'Every field of a TakeSix document, the validation rules and how links are shown',
    mimeType: 'text/markdown',
  }, async uri => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: assets.formatMd }] }))

  server.registerResource('schema', 'takesix://schema', {
    title: 'TakeSix JSON Schema',
    description: 'JSON Schema of the TakeSix format 1.0',
    mimeType: 'application/schema+json',
  }, async uri => ({ contents: [{ uri: uri.href, mimeType: 'application/schema+json', text: assets.schemaJson }] }))

  server.registerPrompt('diagram', {
    title: 'Answer with a TakeSix diagram',
    description: 'Explain a subject as a TakeSix diagram instead of long text',
    argsSchema: { subject: z.string().describe('What to explain, e.g. "this repository" or "our release process"') },
  }, ({ subject }) => ({
    messages: [{
      role: 'user',
      content: { type: 'text', text: `${guideText(assets.skillMd)}\n---\n\nExplain ${subject} as a TakeSix diagram, following the guide above.` },
    }],
  }))

  return server
}
