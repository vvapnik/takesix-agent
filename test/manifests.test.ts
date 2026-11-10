import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// package.json, server.json (MCP Registry) and the Claude Code plugin manifest
// describe the same release: a version bump must touch all of them.
const read = (file: string) => JSON.parse(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'))

const pkg = read('package.json')
const server = read('server.json')
const plugin = read('.claude-plugin/plugin.json')

describe('release manifests', () => {
  it('server.json names the package and its version', () => {
    expect(server.name).toBe(pkg.mcpName)
    expect(server.version).toBe(pkg.version)
    expect(server.packages).toEqual([
      expect.objectContaining({ registryType: 'npm', identifier: pkg.name, version: pkg.version }),
    ])
  })

  it('server.json description fits the registry limit', () => {
    expect(server.description.length).toBeLessThanOrEqual(100)
  })

  it('the plugin has the package version and starts the published server', () => {
    expect(plugin.version).toBe(pkg.version)
    expect(plugin.mcpServers.takesix.args).toContain(pkg.name)
  })
})
