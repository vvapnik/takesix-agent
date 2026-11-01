import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The MCP App view: React, @takesix/react and the ext-apps client in one IIFE
// script plus one stylesheet. The server inlines both into the ui:// resource,
// so the host's sandbox needs no network access.
export default defineConfig({
  plugins: [react()],
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
