import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // 这是最关键的部分。我们强制 Vite 在开发和构建前
  // 预构建这些依赖，将它们转换为标准格式，避免解析错误。
  optimizeDeps: {
    include: [
      'pixi.js', 
      'pixi-live2d-display', 
      'tone'
    ],
  },
  
  build: {
    // 为 Rollup 添加 CommonJS 插件的配置，
    // 因为 pixi.js 或其依赖可能包含一些旧的模块格式，
    // 这能确保它们在构建时被正确转换。
    commonjsOptions: {
      transformMixedEsModules: true,
      // pixi-live2d-display 有时需要这个来正确解析
      include: /node_modules/
    },
    rollupOptions: {
      // 我们不需要在这里添加 `external`，因为我们的目标是把 pixi.js 打包进去。
      // 这个错误日志的提示有一点误导性。
    },
    chunkSizeWarningLimit: 1000, // 你的 Live2D 模型可能较大，保留这个配置
  },
});
