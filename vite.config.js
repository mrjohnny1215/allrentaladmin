import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base를 './'로 해서 Vercel/정적 호스팅 어디서든 동작하게 함
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: true,
    port: 5173,
  },
  build: {
    outDir: 'dist',
  },
})
