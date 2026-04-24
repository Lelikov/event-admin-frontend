import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const apiBaseUrl = env.VITE_API_BASE_URL || 'http://localhost:8000'
  const usersApiBaseUrl = env.VITE_USERS_API_BASE_URL || 'http://localhost:8001'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/users': {
          target: usersApiBaseUrl,
          changeOrigin: true,
        },
        '/api': {
          target: apiBaseUrl,
          changeOrigin: true,
        },
      },
    },
  }
})
