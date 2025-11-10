import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 8888, // 改为5174以匹配当前访问的端口
    host: '0.0.0.0',
    cors: true,
    proxy: {
      '/api/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true, // 启用 WebSocket 代理
        // 不 rewrite，保留 /api/api 路径，因为服务器端就是 /api/api/xxx
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: false, // 不清空，保留 Node.js 模块文件
    rollupOptions: {
      input: resolve(__dirname, 'index.html'), // 明确指定入口文件
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      // 添加 themes 目录的别名，确保 CSS 导入能正确解析
      'themes': resolve(__dirname, '../themes'),
    },
  },
  css: {
    // 配置 PostCSS 的路径解析
    postcss: {
      // 确保 PostCSS 能正确解析相对路径
      config: {
        path: resolve(__dirname, 'postcss.config.js'),
      },
    },
  },
})
