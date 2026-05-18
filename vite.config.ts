import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      name: '@jsweb/ui',
      formats: ['es', 'umd'],
      entry: './src/index.ts',
      fileName: (format: string) => `index.${format}.js`,
    },
    sourcemap: true,
    minify: 'terser',
  },
  plugins: [dts({ insertTypesEntry: true })],
})
