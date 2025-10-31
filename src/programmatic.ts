/**
 * 可编程调用的 Web UI 接口
 * 用于在 CLI 或其他工具中直接启动前端服务
 */

import { createServer as createViteServer, type ViteDevServer, preview, type PreviewServer } from 'vite'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export interface WebUIOptions {
  port?: number
  host?: string
  open?: boolean
  silent?: boolean
  strictPort?: boolean
}

export interface WebUIInstance {
  server: ViteDevServer | PreviewServer
  stop: () => Promise<void>
  getPort: () => number
  getHost: () => string
  getUrl: () => string
}

/**
 * 启动开发模式的前端服务
 * - 支持热重载 (HMR)
 * - 实时编译
 * - 开发友好的错误提示
 */
export async function startDevUI(options: WebUIOptions = {}): Promise<WebUIInstance> {
  const port = options.port ?? 5173
  const host = options.host ?? '0.0.0.0'
  const open = options.open ?? false
  const silent = options.silent ?? false
  const strictPort = options.strictPort ?? false

  if (!silent) {
    console.log('🚀 启动开发模式前端服务...')
  }

  // 创建 Vite 开发服务器
  const server = await createViteServer({
    root: resolve(__dirname, '..'),
    server: {
      port,
      host,
      open,
      strictPort,
      cors: true,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true,
          secure: false,
        },
        '/ws': {
          target: 'ws://127.0.0.1:3000',
          ws: true,
          changeOrigin: true,
        },
      },
    },
    logLevel: silent ? 'error' : 'info',
  })

  await server.listen()

  const serverPort = server.config.server.port ?? port
  const serverHost = server.config.server.host ?? host
  const url = `http://${serverHost === '0.0.0.0' ? 'localhost' : serverHost}:${serverPort}`

  if (!silent) {
    console.log(`✅ 开发前端服务启动成功`)
    console.log(`📍 访问地址: ${url}`)
  }

  return {
    server,
    stop: async () => {
      if (!silent) {
        console.log('🛑 正在停止前端服务...')
      }
      await server.close()
      if (!silent) {
        console.log('✅ 前端服务已停止')
      }
    },
    getPort: () => serverPort,
    getHost: () => serverHost.toString(),
    getUrl: () => url,
  }
}

/**
 * 启动生产模式的前端服务
 * - 使用构建后的静态文件
 * - 优化的性能
 * - 预览生产环境效果
 */
export async function startProdUI(options: WebUIOptions = {}): Promise<WebUIInstance> {
  const port = options.port ?? 5173
  const host = options.host ?? '0.0.0.0'
  const open = options.open ?? false
  const silent = options.silent ?? false
  const strictPort = options.strictPort ?? false

  if (!silent) {
    console.log('🚀 启动生产模式前端服务...')
  }

  // 创建预览服务器
  const server = await preview({
    root: resolve(__dirname, '..'),
    preview: {
      port,
      host,
      open,
      strictPort,
      cors: true,
    },
    logLevel: silent ? 'error' : 'info',
  })

  const serverPort = server.config.preview.port ?? port
  const serverHost = server.config.preview.host ?? host
  const url = `http://${serverHost === '0.0.0.0' ? 'localhost' : serverHost}:${serverPort}`

  if (!silent) {
    console.log(`✅ 生产前端服务启动成功`)
    console.log(`📍 访问地址: ${url}`)
  }

  return {
    server,
    stop: async () => {
      if (!silent) {
        console.log('🛑 正在停止前端服务...')
      }
      server.httpServer.close()
      if (!silent) {
        console.log('✅ 前端服务已停止')
      }
    },
    getPort: () => serverPort,
    getHost: () => serverHost.toString(),
    getUrl: () => url,
  }
}

/**
 * 通用启动函数
 * 根据环境变量或参数决定启动模式
 */
export async function startUI(options: WebUIOptions & { mode?: 'dev' | 'prod' } = {}): Promise<WebUIInstance> {
  const mode = options.mode ?? (process.env.NODE_ENV === 'production' ? 'prod' : 'dev')
  
  if (mode === 'prod') {
    return startProdUI(options)
  } else {
    return startDevUI(options)
  }
}

