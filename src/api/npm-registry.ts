import { apiClient } from './client'

export interface RegistryStatus {
  running: boolean
  pid: number | null
  uptime: number
  url: string
}

export interface RegistryConfig {
  storage?: string
  auth?: Record<string, any>
  uplinks?: Record<string, any>
  packages?: Record<string, any>
  server?: Record<string, any>
  middlewares?: Record<string, any>
  logs?: Record<string, any>
}

export interface Package {
  name: string
  version: string
  description?: string
  author?: string
  license?: string
  homepage?: string
  repository?: string
}

export const npmRegistryApi = {
  /**
   * 获取服务状态
   */
  async getStatus(): Promise<RegistryStatus> {
    return apiClient.get('/npm-registry/status')
  },

  /**
   * 启动服务
   */
  async start(options?: { port?: number; configPath?: string }): Promise<{
    message: string
    pid: number
    url: string
  }> {
    return apiClient.post('/npm-registry/start', options)
  },

  /**
   * 停止服务
   */
  async stop(): Promise<{ message: string }> {
    return apiClient.post('/npm-registry/stop')
  },

  /**
   * 获取日志
   */
  async getLogs(): Promise<{ logs: string[] }> {
    return apiClient.get('/npm-registry/logs')
  },

  /**
   * 获取配置
   */
  async getConfig(): Promise<{
    config: RegistryConfig
    path: string
  }> {
    return apiClient.get('/npm-registry/config')
  },

  /**
   * 更新配置
   */
  async updateConfig(config: RegistryConfig): Promise<{ message: string }> {
    return apiClient.put('/npm-registry/config', { config })
  },

  /**
   * 获取包列表
   */
  async getPackages(): Promise<{ packages: Package[] }> {
    return apiClient.get('/npm-registry/packages')
  },
}

