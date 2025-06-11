import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // 确保根路径正确
  // 让Vite在构建时能识别process.env
  define: {
    'process.env': process.env
  }
})
