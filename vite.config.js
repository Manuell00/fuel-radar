import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const mimitProxy = {
  '/mimit': {
    target: 'https://www.mimit.gov.it',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/mimit/, '/images/exportCSV'),
  },
}

export default defineConfig({
  plugins: [vue()],
  server:  { proxy: mimitProxy },
  preview: { proxy: mimitProxy },
})
