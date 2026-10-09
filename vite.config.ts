import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isPortableStatic = process.env.PORTABLE_STATIC === 'true'
const isGitHubPages = process.env.GITHUB_PAGES === 'true'

export default defineConfig({
  base: isPortableStatic ? './' : isGitHubPages ? '/-/' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})
