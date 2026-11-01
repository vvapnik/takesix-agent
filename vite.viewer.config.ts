import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The viewer for rendered HTML files: React, @takesix/react and the mount
// code in one IIFE script plus one stylesheet. render inlines both.
export default defineConfig({
  plugins: [react()],
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: 'skill/takesix/assets',
    emptyOutDir: false,
    lib: {
      entry: resolve(import.meta.dirname, 'src/viewer.tsx'),
      name: 'TakeSixViewer',
      formats: ['iife'],
      fileName: () => 'viewer.js',
      cssFileName: 'viewer',
    },
  },
})
