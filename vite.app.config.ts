import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The MCP App view: @takesix/react on Preact (React's API, a fraction of its
// size) and a small MCP Apps client in one IIFE script plus one stylesheet. The server inlines both into the ui:// resource,
// so the host's sandbox needs no network access.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^react-dom\/client$/, replacement: 'preact/compat/client' },
      { find: /^react\/jsx-(dev-)?runtime$/, replacement: 'preact/jsx-runtime' },
      { find: /^react(-dom)?$/, replacement: 'preact/compat' },
    ],
  },
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: 'dist/app',
    emptyOutDir: true,
    lib: {
      entry: resolve(import.meta.dirname, 'src/mcp/app.tsx'),
      name: 'TakeSixApp',
      formats: ['iife'],
      fileName: () => 'app.js',
      cssFileName: 'app',
    },
  },
})
