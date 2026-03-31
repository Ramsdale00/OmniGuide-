import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to FastAPI backend during development
      '/query': 'http://localhost:8000',
      '/history': 'http://localhost:8000',
      '/clear-history': 'http://localhost:8000',
      '/export': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
    },
  },
})
