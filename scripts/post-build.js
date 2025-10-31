/**
 * Post Build Script
 * 构建完成后自动将产物同步到 server/public
 * 保持各包独立的同时，简化生产部署流程
 */

import { cpSync, existsSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const webDist = resolve(__dirname, '../dist')
const serverPublic = resolve(__dirname, '../../server/public')

console.log('\n📦 同步构建产物到 server...')
console.log(`   源: ${webDist}`)
console.log(`   目标: ${serverPublic}`)

try {
  // 确保目标目录存在
  if (!existsSync(serverPublic)) {
    mkdirSync(serverPublic, { recursive: true })
  }

  // 复制构建产物
  if (existsSync(webDist)) {
    cpSync(webDist, serverPublic, { recursive: true, force: true })
    console.log('✅ 构建产物已同步到 server/public')
    console.log('   生产模式下 server 将直接服务这些静态文件\n')
  } else {
    console.warn('⚠️  未找到构建产物，跳过同步\n')
  }
} catch (error) {
  console.error('❌ 同步失败:', error.message)
  process.exit(1)
}
