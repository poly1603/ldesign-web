import { defineConfig } from 'tsup'

export default defineConfig({
  // 入口文件 - 构建 Node.js 模块
  entry: ['src/index.ts'],

  // 输出格式 - 使用 ESM
  format: ['esm'],

  // 输出目录
  outDir: 'dist',

  // 生成类型定义文件
  dts: true,

  // 清理输出目录（但保留前端构建产物）
  clean: false,

  // 不分包
  splitting: false,

  // 源码映射
  sourcemap: true,

  // 不压缩
  minify: false,

  // 目标环境
  target: 'node18',

  // 平台
  platform: 'node',

  // 外部依赖 - 不打包这些包
  external: [
    // Node.js 内置模块
    'fs',
    'path',
    'url',
    'events',
    'stream',
    'buffer',
    'util',
    'crypto',
    'http',
    'https',

    // 第三方依赖
    'vite',
    'vue',
    'vue-router',
    'pinia',
    'socket.io-client',
    '@ldesign/shared',
  ],

  // 保持目录结构
  keepNames: true,

  // 环境变量
  env: {
    NODE_ENV: 'production',
  },
})









































