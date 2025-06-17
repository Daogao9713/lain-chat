import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // 添加这个 build 配置来帮助 Rollup
  build: {
    rollupOptions: {
      // 在这里不需要将 'pixi.js' 设置为 external，
      // Vite 通常能够智能处理。
      // 如果问题仍然存在，可以尝试添加 optimizeDeps.include
    },
    chunkSizeWarningLimit: 1000, // 提高chunk大小警告限制，因为Live2D模型可能较大
  },

  // 添加这个 optimizeDeps 配置，强制 Vite 预构建这些依赖项
  // 这可以提高冷启动速度并避免一些常见的依赖解析问题
  optimizeDeps: {
    include: [
      'pixi.js', 
      'pixi-live2d-display', 
      'tone'
    ],
  },
  
  server: {
    // 如果你的 Live2D 模型文件（如 .json, .moc3）加载时出现404错误，
    // 可能需要为特定文件类型设置正确的 MIME 类型。
    // 不过通常情况下，Vercel 或现代服务器能自动处理。
    // headers: {
    //   '.model3.json': { 'Content-Type': 'application/json' },
    //   '.moc3': { 'Content-Type': 'application/octet-stream' },
    //   '.physics3.json': { 'Content-Type': 'application/json' },
    // }
  }
});
