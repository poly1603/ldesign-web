import { resolve } from 'path'
import postcssImport from 'postcss-import'

export default {
  plugins: {
    // 首先处理 @import，确保路径正确解析
    'postcss-import': postcssImport({
      // 设置根目录为项目根目录，这样相对路径可以从项目根目录解析
      root: resolve(process.cwd()),
      // 允许从 node_modules 导入
      path: [resolve(process.cwd(), 'themes')],
    }),
    tailwindcss: {},
    autoprefixer: {},
  },
}

























