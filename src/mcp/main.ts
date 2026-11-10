import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { BLUEPRINT_TYPES, type BlueprintType } from './guide.js'
import { createServer } from './server.js'

// Runs from <package>/dist/mcp.js; the skill and the built views ship alongside.
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (...path: string[]) => readFileSync(join(root, ...path), 'utf8')
const require = createRequire(import.meta.url)

const server = createServer({
  version: JSON.parse(read('package.json')).version,
  skillMd: read('skill', 'takesix', 'SKILL.md'),
  blueprints: Object.fromEntries(BLUEPRINT_TYPES.map(type =>
    [type, read('skill', 'takesix', 'references', 'blueprints', type === 'epic' ? 'epic.takesix.json' : `${type}.md`)])) as Record<BlueprintType, string>,
  formatMd: read('skill', 'takesix', 'references', 'format.md'),
  schemaJson: readFileSync(require.resolve('@takesix/core/schema.json'), 'utf8'),
  appJs: read('dist', 'app', 'app.js'),
  appCss: read('dist', 'app', 'app.css'),
})

await server.connect(new StdioServerTransport())
