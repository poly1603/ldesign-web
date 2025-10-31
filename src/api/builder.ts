import { apiClient } from './client'

export interface BuilderConfig {
  mode: 'development' | 'production'
  outDir: string
  sourcemap: boolean
  minify: boolean
  [key: string]: any
}

export interface BuildTask {
  taskId: string
  status: 'pending' | 'running' | 'success' | 'failed'
  logs: string[]
  startTime?: number
  endTime?: number
  error?: string
}

export const builderApi = {
  /**
   * 获取构建配置
   */
  async getConfig(projectId: string): Promise<BuilderConfig> {
    return apiClient.get(`/projects/${projectId}/builder/config`)
  },

  /**
   * 更新构建配置
   */
  async updateConfig(projectId: string, config: Partial<BuilderConfig>): Promise<BuilderConfig> {
    return apiClient.put(`/projects/${projectId}/builder/config`, config)
  },

  /**
   * 执行构建
   */
  async build(projectId: string, options?: {
    mode?: 'development' | 'production'
    watch?: boolean
  }): Promise<{ taskId: string }> {
    return apiClient.post(`/projects/${projectId}/builder/build`, options)
  },

  /**
   * 获取构建日志
   */
  async getLogs(projectId: string, taskId: string): Promise<BuildTask> {
    return apiClient.get(`/projects/${projectId}/builder/logs/${taskId}`)
  },
}

