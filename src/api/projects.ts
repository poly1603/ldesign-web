import { apiClient } from './client'

export interface Project {
  id: string
  name: string
  path: string
  type: string
  framework?: string
  packageManager?: string
  description?: string
  createdAt: number
  updatedAt: number
  lastOpenedAt?: number
}

export const projectsApi = {
  /**
   * 获取所有项目
   */
  async getAll(params?: { limit?: number; offset?: number; keyword?: string }): Promise<Project[]> {
    return apiClient.get('/projects', { params })
  },

  /**
   * 获取项目详情
   */
  async getById(id: string): Promise<Project> {
    return apiClient.get(`/projects/${id}`)
  },

  /**
   * 导入项目
   */
  async import(path: string, detect = true): Promise<Project> {
    return apiClient.post('/projects/import', { path, detect })
  },

  /**
   * 创建项目
   */
  async create(options: {
    name: string
    path: string
    template?: string
    framework?: string
  }): Promise<Project> {
    return apiClient.post('/projects/create', options)
  },

  /**
   * 更新项目
   */
  async update(id: string, updates: Partial<Project>): Promise<Project> {
    return apiClient.put(`/projects/${id}`, updates)
  },

  /**
   * 删除项目
   */
  async delete(id: string): Promise<void> {
    return apiClient.delete(`/projects/${id}`)
  },

  /**
   * 打开项目
   */
  async open(id: string): Promise<void> {
    return apiClient.post(`/projects/${id}/open`)
  },

  /**
   * 获取项目统计
   */
  async getStats(id: string): Promise<any> {
    return apiClient.get(`/projects/${id}/stats`)
  },

  /**
   * 分析项目
   */
  async analyze(id: string): Promise<{
    type: string
    framework?: string
    packageManager?: string
    dependencies: Record<string, string>
    devDependencies: Record<string, string>
    scripts: Record<string, string>
    hasPackageJson: boolean
    name?: string
    version?: string
    description?: string
  }> {
    return apiClient.post(`/projects/${id}/analyze`)
  },

  // 项目操作
  async dev(id: string): Promise<{ taskId: string }> {
    return apiClient.post(`/projects/${id}/dev`)
  },

  async build(id: string): Promise<{ taskId: string }> {
    return apiClient.post(`/projects/${id}/build`)
  },

  async preview(id: string): Promise<{ taskId: string }> {
    return apiClient.post(`/projects/${id}/preview`)
  },

  async buildLib(id: string): Promise<{ taskId: string }> {
    return apiClient.post(`/projects/${id}/build-lib`)
  },

  async getLogs(id: string, taskId: string): Promise<{
    taskId: string
    status: 'pending' | 'running' | 'success' | 'failed'
    logs: string[]
    startTime?: number
    endTime?: number
    error?: string
  }> {
    return apiClient.get(`/projects/${id}/logs/${taskId}`)
  },

  async open(id: string): Promise<void> {
    // TODO: 实现打开项目功能
    return Promise.resolve()
  },
}


