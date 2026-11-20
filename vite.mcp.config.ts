import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// The MCP server: one Node module. Its dependencies stay external and come
// from npm; the views it serves are built by the other configs. The loading
// screen from @takesix/react is plain HTML and bundled in: React is only a
// build-time dependency of the package.
export default defineConfig({
  ssr: { noExternal: ['@takesix/react'] },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    ssr: resolve(import.meta.dirname, 'src/mcp/main.ts'),
    target: 'node22',
    rollupOptions: {
      output: { entryFileNames: 'mcp.js', banner: '#!/usr/bin/env node' },
    },
  },
})
