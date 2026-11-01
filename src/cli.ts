import { readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { formatIssues, parseDocument } from '@takesix/core'
import { renderHtml } from './render.js'
import { summarize } from './summary.js'

const USAGE = `Usage:
  takesix validate <file.json>              check a document, list problems with paths
  takesix render <file.json> [-o out.html]  validate, then write one self-contained HTML page`

// The bundled script lives in <skill>/scripts; the viewer in <skill>/assets.
const assets = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets')

function load(file: string) {
  let text: string
  try {
    text = readFileSync(file, 'utf8')
  } catch (e) {
    console.error(`Cannot read ${file}: ${(e as Error).message}`)
    process.exit(2)
  }
  const result = parseDocument(text)
  if (!result.ok) {
    console.error(`${file}: invalid takesix document. Fix these and run again:`)
    console.error(formatIssues(result.issues))
    process.exit(1)
  }
  if (result.issues.length) console.error(formatIssues(result.issues))
  return result.document
}

const [command, file, ...rest] = process.argv.slice(2)
if (!command || !file || !['validate', 'render'].includes(command)) {
  console.error(USAGE)
  process.exit(2)
}

const doc = load(file)
if (command === 'validate') {
  console.log(`OK: ${summarize(doc)}`)
} else {
  const o = rest.indexOf('-o')
  const out = resolve(o >= 0 && rest[o + 1] ? rest[o + 1]! : join(dirname(file), basename(file).replace(/(\.takesix)?\.json$/, '') + '.html'))
  const html = renderHtml(doc, readFileSync(join(assets, 'viewer.js'), 'utf8'), readFileSync(join(assets, 'viewer.css'), 'utf8'))
  writeFileSync(out, html)
  console.log(`OK: ${summarize(doc)}\nWrote ${out}`)
}
