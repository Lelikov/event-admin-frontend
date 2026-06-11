import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // ALL backend traffic goes to event-admin: it authenticates requests,
  // enforces admin RBAC, and proxies /api/users/* to event-users itself.
  // The dev proxy must mirror that topology (never call event-users directly).
  // Note: when VITE_API_BASE_URL is set, apiRequest builds absolute URLs and
  // this proxy is bypassed; it only matters for relative (same-origin) setups.
  const apiBaseUrl = env.VITE_API_BASE_URL || 'http://localhost:8000'

  const toEventAdmin = {
    target: apiBaseUrl,
    changeOrigin: true,
  }

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': toEventAdmin,
        '/auth': toEventAdmin,
        '/bookings': toEventAdmin,
        '/health': toEventAdmin,
      },
    },
  }
})
