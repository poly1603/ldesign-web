import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outDir: 'dist',
  dts: true,
  clean: false, // 不清理 dist，因为 vite build 也会输出到这里
  splitting: false,
  sourcemap: true,
  minify: false,
  target: 'node18',
  platform: 'node',
  external: ['vue', 'vite'],
  onSuccess: async () => {
    console.log('✅ @ldesign/web 库构建完成')
  },
})

