import { readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { formatIssues, parseDocument } from '@takesix/core'
import { layoutHints, sketch } from './layout.js'
import { standaloneHtml } from '@takesix/react/standalone'
import { summarize } from './summary.js'

const USAGE = `Usage:
  takesix validate <file.json>              check a document, list problems with paths
  takesix sketch <file.json>                print every level's 6×6 grid as text
  takesix render <file.json> [-o out.html]  validate, then write one self-contained HTML page`

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
  const hints = layoutHints(result.document)
  if (hints) console.error(hints.trimEnd())
  return result.document
}

const [command, file, ...rest] = process.argv.slice(2)
if (!command || !file || !['validate', 'sketch', 'render'].includes(command)) {
  console.error(USAGE)
  process.exit(2)
}

const doc = load(file)
if (command === 'validate') {
  console.log(`OK: ${summarize(doc)}`)
} else if (command === 'sketch') {
  process.stdout.write(sketch(doc))
} else {
  const o = rest.indexOf('-o')
  const out = resolve(o >= 0 && rest[o + 1] ? rest[o + 1]! : join(dirname(file), basename(file).replace(/(\.takesix)?\.json$/, '') + '.html'))
  writeFileSync(out, standaloneHtml(doc))
  console.log(`OK: ${summarize(doc)}\nWrote ${out}`)
}
