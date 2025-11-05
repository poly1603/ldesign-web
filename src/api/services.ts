import { apiClient } from './client'
import type { Project, NodeVersion, GitStatus, SystemInfo } from '@ldesign/shared'

/**
 * 项目 API
 */
export const projectApi = {
  /**
   * 获取所有项目（支持查询、排序、分类）
   */
  async getAll(params?: {
    search?: string
    category?: 'project' | 'library' | 'project-library' | 'other'
    type?: 'web' | 'api' | 'library' | 'mobile' | 'desktop' | 'other'
    framework?: string
    sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'lastOpenedAt'
    sortOrder?: 'ASC' | 'DESC'
  }) {
    return apiClient.get('/projects', { params })
  },
  
  /**
   * 获取项目详情
   */
  async getOne(id: string) {
    return apiClient.get(`/projects/${id}`)
  },
  
  /**
   * 创建项目
   */
  async create(data: any) {
    return apiClient.post('/projects', data)
  },
  
  /**
   * 更新项目
   */
  async update(id: string, data: any) {
    return apiClient.put(`/projects/${id}`, data)
  },
  
  /**
   * 删除项目
   */
  async delete(id: string) {
    return apiClient.delete(`/projects/${id}`)
  },
  
  /**
   * 导入单个项目
   */
  async import(data: { path: string; name?: string }) {
    return apiClient.post('/projects/import', data)
  },
  
  /**
   * 扫描目录下的项目
   */
  async scanDirectory(directory: string) {
    return apiClient.get('/projects/scan', { params: { directory } })
  },
  
  /**
   * 批量导入目录下的项目
   */
  async importDirectory(directory: string) {
    return apiClient.post('/projects/import-directory', { directory })
  },
  
  /**
   * 打开项目（更新最后打开时间）
   */
  async open(id: string) {
    return apiClient.post(`/projects/${id}/open`)
  },
  
  /**
   * 执行项目命令
   */
  async executeCommand(id: string, command: string) {
    return apiClient.post(`/projects/${id}/command`, { command })
  },
  
  /**
   * 停止命令执行
   */
  async stopCommand(id: string, executionId: string) {
    return apiClient.post(`/projects/${id}/command/${executionId}/stop`)
  },
  
  /**
   * 获取最新的命令执行记录
   */
  async getLatestExecution(id: string, command: string) {
    return apiClient.get(`/projects/${id}/command/${command}/latest`)
  },

  /**
   * 分析项目
   */
  async analyze(path: string) {
    return apiClient.post('/projects/analyze', { path })
  },
}

/**
 * Node 版本管理 API
 */
export const nodeApi = {
  /**
   * 获取已安装的版本列表
   */
  async getVersions() {
    return apiClient.get<NodeVersion[]>('/node/versions')
  },
  
  /**
   * 获取当前版本
   */
  async getCurrent() {
    return apiClient.get<{ version: string }>('/node/current')
  },
  
  /**
   * 获取可用版本列表（远程）
   */
  async getAvailable() {
    return apiClient.get<string[]>('/node/versions/available')
  },
  
  /**
   * 安装指定版本
   */
  async install(version: string) {
    return apiClient.post('/node/install', { version })
  },
  
  /**
   * 切换到指定版本
   */
  async switch(version: string) {
    return apiClient.post('/node/switch', { version })
  },
  
  /**
   * 删除指定版本
   */
  async remove(version: string) {
    return apiClient.delete(`/node/versions/${version}`)
  },
  
  /**
   * 获取所有管理器状态
   */
  async getManagers() {
    return apiClient.get('/node/managers')
  },
  
  /**
   * 获取当前使用的管理器
   */
  async getCurrentManager() {
    return apiClient.get('/node/manager/status')
  },
  
  /**
   * 安装管理器
   */
  async installManager(type: string) {
    return apiClient.post('/node/manager/install', { managerType: type })
  },
}

/**
 * Git API
 */
export const gitApi = {
  /**
   * 获取 Git 状态
   */
  async getStatus() {
    return apiClient.get('/git/status')
  },
  
  /**
   * 获取 Git 配置
   */
  async getConfig() {
    return apiClient.get('/git/config')
  },
  
  /**
   * 重新安装 Git
   */
  async reinstall(packageManager: string) {
    return apiClient.post('/git/reinstall', { packageManager })
  },
}

/**
 * 系统 API
 */
export const systemApi = {
  /**
   * 获取健康状态
   */
  async getHealth() {
    return apiClient.get('/health/status')
  },
  
  /**
   * 获取系统信息
   */
  async getSystemInfo() {
    return apiClient.get('/health/system')
  },
  
  /**
   * 获取内存使用情况
   */
  async getMemoryUsage() {
    return apiClient.get('/health/memory')
  },
  
  /**
   * 获取 CPU 使用情况
   */
  async getCPUUsage() {
    return apiClient.get('/health/cpu')
  },
  
  /**
   * 获取磁盘使用情况
   */
  async getDiskUsage() {
    return apiClient.get('/health/disk')
  },
  
  /**
   * 获取目录选择器信息
   */
  async getDirectoryPickerInfo() {
    return apiClient.get('/system/directory-picker')
  },
  
  /**
   * 打开系统目录选择器
   */
  async openDirectoryPicker(defaultPath?: string) {
    return apiClient.post('/system/open-directory-picker', { defaultPath })
  },
  
  /**
   * 验证路径
   */
  async validatePath(path: string, options?: {
    mustExist?: boolean
    mustBeDirectory?: boolean
    mustBeFile?: boolean
    mustBeReadable?: boolean
    mustBeWritable?: boolean
  }) {
    return apiClient.post('/system/validate-path', { path, ...options })
  },
}

/**
 * 日志 API
 */
export const logsApi = {
  async getLogs(params?: { level?: string; limit?: number; offset?: number }) {
    return apiClient.post('/logs/query', {
      level: params?.level,
      limit: params?.limit || 100,
      offset: params?.offset || 0,
    })
  },
  
  async getErrors(params?: { limit?: number; offset?: number }) {
    return apiClient.post('/logs/query', {
      level: 'error',
      limit: params?.limit || 100,
      offset: params?.offset || 0,
    })
  },
  
  async getStats() {
    return apiClient.get('/logs/statistics')
  },
  
  async clear() {
    return apiClient.delete('/logs/clear')
  },
}
