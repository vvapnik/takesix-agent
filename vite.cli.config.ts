import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// The skill's command line tool: one Node script with @takesix/core bundled
// in, so the skill works without installing anything.
export default defineConfig({
  build: {
    outDir: 'skill/takesix/scripts',
    emptyOutDir: false,
    ssr: resolve(import.meta.dirname, 'src/cli.ts'),
    target: 'node22',
    rollupOptions: {
      output: { entryFileNames: 'takesix.mjs', banner: '#!/usr/bin/env node' },
    },
  },
  ssr: { noExternal: true },
})
