/**
 * Web 可编程接口
 * 供 CLI 调用启动 Web 开发服务器或构建
 */

import { createServer as createViteServer, ViteDevServer, build } from 'vite'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

export interface WebUIOptions {
  port?: number
  host?: string
  open?: boolean
  silent?: boolean
}

export interface WebUIInstance {
  server?: ViteDevServer
  port: number
  host: string
  stop: () => Promise<void>
  getUrl: () => string
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * 启动开发 UI 服务器
 */
export async function startDevUI(options: WebUIOptions = {}): Promise<WebUIInstance> {
  const port = options.port || 5173
  const host = options.host || '0.0.0.0'

  const server = await createViteServer({
    configFile: resolve(__dirname, '../vite.config.ts'),
    server: {
      port,
      host,
      open: options.open,
    },
    logLevel: options.silent ? 'error' : 'info',
  })

  await server.listen()

  if (!options.silent) {
    server.printUrls()
  }

  return {
    server,
    port,
    host,
    stop: async () => {
      await server.close()
    },
    getUrl: () => `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`,
  }
}

/**
 * 构建生产版本
 */
export async function buildUI(options: { silent?: boolean } = {}): Promise<void> {
  await build({
    configFile: resolve(__dirname, '../vite.config.ts'),
    logLevel: options.silent ? 'error' : 'info',
  })

  if (!options.silent) {
    console.log('✅ Web UI built successfully')
  }
}

/**
 * 启动生产 UI 服务器（预览模式）
 * 使用 Vite 的 preview 模式启动构建后的静态文件
 */
export async function startProdUI(options: WebUIOptions = {}): Promise<WebUIInstance> {
  const { preview } = await import('vite')
  const port = options.port || 5173
  const host = options.host || '0.0.0.0'

  const previewServer = await preview({
    configFile: resolve(__dirname, '../vite.config.ts'),
    preview: {
      port,
      host,
      open: options.open,
    },
    logLevel: options.silent ? 'error' : 'info',
  })

  if (!options.silent) {
    previewServer.printUrls()
  }

  return {
    server: previewServer as any,
    port,
    host,
    stop: async () => {
      await previewServer.close()
    },
    getUrl: () => `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`,
  }
}
