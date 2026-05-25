import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Admin SPA is served under /admin/ in production behind Caddy.
// Locally the dev server is at the root, so use the same base only for build.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/admin/' : '/',
}))
