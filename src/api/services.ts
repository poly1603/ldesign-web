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
   * 在系统文件管理器中打开项目文件夹
   */
  async openFolder(id: string) {
    return apiClient.post(`/projects/${id}/open-folder`)
  },
  
  /**
   * 执行项目命令
   */
  async executeCommand(id: string, command: string, environment?: string) {
    return apiClient.post(`/projects/${id}/command`, { command, environment })
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
  async getLatestExecution(id: string, command: string, environment?: string) {
    const params = environment ? { environment } : undefined
    return apiClient.get(`/projects/${id}/command/${command}/latest`, { params })
  },

  /**
   * 获取项目的所有运行中的命令执行记录
   */
  async getRunningExecutions(id: string, command?: string) {
    const params = command ? { command } : undefined
    return apiClient.get(`/projects/${id}/command/running`, { params })
  },

  /**
   * 检查项目的打包状态
   */
  async getBuildStatus(id: string, environment?: string) {
    const params = environment ? { environment } : undefined
    return apiClient.get(`/projects/${id}/build-status`, { params })
  },

  /**
   * 获取所有环境的打包状态
   */
  async getAllBuildStatuses(id: string) {
    return apiClient.get(`/projects/${id}/build-statuses`)
  },

  /**
   * 获取项目统计数据
   */
  async getProjectStats(id: string) {
    return apiClient.get(`/projects/${id}/stats`)
  },

  /**
   * 获取库项目的打包产物信息
   */
  async getLibraryBuildStatus(id: string) {
    return apiClient.get(`/projects/${id}/library-build-status`)
  },

  /**
   * 获取项目的当前版本号
   */
  async getPackageVersion(id: string) {
    return apiClient.get(`/package/project/${id}/version`)
  },

  /**
   * 更新项目的版本号
   */
  async updatePackageVersion(id: string, version: string) {
    return apiClient.post(`/package/project/${id}/version`, { version })
  },

  /**
   * 获取所有版本提升选项
   */
  async getVersionBumpOptions() {
    return apiClient.get('/package/version-bump-options')
  },

  /**
   * 获取所有 Builder 输出目录配置
   */
  async getBuilderOutputDirs() {
    return apiClient.get('/package/builder-output-dirs')
  },

  /**
   * 更新 Builder 输出目录配置
   */
  async updateBuilderOutputDirs(dirs: Array<{
    name: string
    label?: string
    description?: string
    enabled?: boolean
    order?: number
  }>) {
    return apiClient.put('/package/builder-output-dirs', { dirs })
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

/**
 * TypeScript 配置 API
 */
export const typescriptApi = {
  /**
   * 获取支持的 TypeScript 版本列表
   */
  async getVersions() {
    return apiClient.get<string[]>('/typescript/versions')
  },

  /**
   * 获取 TypeScript 配置 Schema（根据版本过滤）
   */
  async getSchema(version?: string) {
    return apiClient.get('/typescript/schema', { params: { version } })
  },
  
  /**
   * 获取项目的当前 TypeScript 版本
   */
  async getCurrentVersion(projectId: string) {
    return apiClient.get(`/typescript/project/${projectId}/version`)
  },
  
  /**
   * 获取项目的 TypeScript 配置
   */
  async getConfig(projectId: string) {
    return apiClient.get(`/typescript/project/${projectId}/config`)
  },
  
  /**
   * 更新项目的 TypeScript 配置
   */
  async updateConfig(projectId: string, config: Record<string, any>) {
    return apiClient.put(`/typescript/project/${projectId}/config`, { config })
  },
  
  /**
   * 更新项目的 TypeScript 版本
   */
  async updateVersion(projectId: string, version: string) {
    return apiClient.put(`/typescript/project/${projectId}/version`, { version })
  },
}

/**
 * 文档 API
 */
export const documentApi = {
  /**
   * 根据 ID 获取文档
   */
  async getDocumentById(id: string) {
    return apiClient.get(`/documents/${id}`)
  },

  /**
   * 获取 TypeScript 配置文档
   */
  async getTypeScriptConfigDocument() {
    return apiClient.get('/documents/typescript/config')
  },

  /**
   * 获取 Package 配置文档
   */
  async getPackageConfigDocument() {
    return apiClient.get('/documents/package/config')
  },
}

/**
 * Package 配置 API
 */
export const packageApi = {
  /**
   * 获取 Package 配置 Schema
   */
  async getSchema() {
    return apiClient.get('/package/schema')
  },
  
  /**
   * 获取项目的 package.json 配置
   */
  async getConfig(projectId: string) {
    return apiClient.get(`/package/project/${projectId}/config`)
  },
  
  /**
   * 更新项目的 package.json 配置
   */
  async updateConfig(projectId: string, config: Record<string, any>) {
    return apiClient.put(`/package/project/${projectId}/config`, { config })
  },
}

/**
 * NPM 仓库管理 API
 */
export const npmApi = {
  /**
   * 获取所有 NPM 仓库配置
   */
  async getRegistries() {
    return apiClient.get('/npm/registries')
  },
  
  /**
   * 获取单个 NPM 仓库配置
   */
  async getRegistry(id: string) {
    return apiClient.get(`/npm/registries/${id}`)
  },
  
  /**
   * 创建 NPM 仓库配置
   */
  async createRegistry(data: {
    name: string
    registry: string
    isDefault?: boolean
    enabled?: boolean
    order?: number
  }) {
    return apiClient.post('/npm/registries', data)
  },
  
  /**
   * 更新 NPM 仓库配置
   */
  async updateRegistry(id: string, data: {
    name?: string
    registry?: string
    isDefault?: boolean
    enabled?: boolean
    order?: number
  }) {
    return apiClient.put(`/npm/registries/${id}`, data)
  },
  
  /**
   * 删除 NPM 仓库配置
   */
  async deleteRegistry(id: string) {
    return apiClient.delete(`/npm/registries/${id}`)
  },
  
  /**
   * 重启指定仓库的 Verdaccio 服务
   */
  async restartVerdaccio(registryId: string) {
    return apiClient.post(`/npm/registries/${registryId}/verdaccio/restart`)
  },
  
  /**
   * NPM 登录
   */
  async login(
    data: {
      registryId: string
      username: string
      password: string
      email?: string
    },
    options?: RequestInit & { timeout?: number }
  ) {
    return apiClient.post('/npm/login', data, options)
  },
  
  /**
   * NPM 登出
   */
  async logout(registryId: string) {
    return apiClient.post(`/npm/logout/${registryId}`)
  },
  
  /**
   * 检查登录状态
   */
  async checkLoginStatus(registryId: string) {
    return apiClient.get(`/npm/registries/${registryId}/status`)
  },
  
  /**
   * 获取当前登录用户发布的包列表（支持分页）
   */
  async getPackages(registryId: string, page: number = 1, pageSize: number = 20) {
    // 确保参数是有效的数字
    const validPage = Number(page) || 1
    const validPageSize = Number(pageSize) || 20
    
    return apiClient.get(`/npm/registries/${registryId}/packages`, {
      params: {
        page: validPage,
        pageSize: validPageSize,
      },
    })
  },
  
  /**
   * 获取包详情信息
   */
  async getPackageDetail(registryId: string, packageName: string) {
    return apiClient.get(`/npm/registries/${registryId}/packages/${encodeURIComponent(packageName)}`)
  },
  
    /**
     * 启动本地 Verdaccio 服务
     */
    async startLocalVerdaccio(port?: number) {
      return apiClient.post('/npm/verdaccio/start', { port })
    },
    
    /**
     * 安装 Verdaccio（全局安装）
     */
    async installVerdaccio() {
      return apiClient.post('/npm/verdaccio/install')
    },
  
  /**
   * 停止本地 Verdaccio 服务
   */
  async stopLocalVerdaccio() {
    return apiClient.post('/npm/verdaccio/stop')
  },
  
  /**
   * 重启本地 Verdaccio 服务
   */
  async restartLocalVerdaccio(port?: number) {
    return apiClient.post('/npm/verdaccio/restart', { port })
  },
  
  /**
   * 获取本地 Verdaccio 服务状态
   */
  async getLocalVerdaccioStatus() {
    return apiClient.get('/npm/verdaccio/status')
  },
  
  /**
   * 检查仓库是否支持用户注册
   */
  async checkRegistrySupportsUserRegistration(registryId: string) {
    return apiClient.get(`/npm/registries/${registryId}/supports-user-registration`)
  },
  
  /**
   * 在 Verdaccio 中创建新用户
   */
  async createVerdaccioUser(registryId: string, username: string, password: string, email: string) {
    return apiClient.post(`/npm/registries/${registryId}/create-user`, {
      username,
      password,
      email,
    })
  },
  
  /**
   * 获取 Verdaccio 配置文件
   */
  async getVerdaccioConfig(registryId: string) {
    return apiClient.get(`/npm/registries/${registryId}/verdaccio/config`)
  },
  
  /**
   * 保存 Verdaccio 配置文件
   */
  async saveVerdaccioConfig(registryId: string, content: string, restart: boolean = true) {
    return apiClient.put(`/npm/registries/${registryId}/verdaccio/config`, {
      content,
      restart,
    })
  },
  
  /**
   * 获取 Verdaccio 配置文件（解析为对象）
   */
  async getVerdaccioConfigParsed(registryId: string) {
    return apiClient.get(`/npm/registries/${registryId}/verdaccio/config/parsed`)
  },
  
  /**
   * 保存 Verdaccio 配置文件（从对象）
   */
  async saveVerdaccioConfigParsed(registryId: string, config: any, restart: boolean = true) {
    return apiClient.put(`/npm/registries/${registryId}/verdaccio/config/parsed`, {
      config,
      restart,
    })
  },
  
  /**
   * 获取 Verdaccio 配置项结构定义
   */
  async getVerdaccioConfigSchema() {
    return apiClient.get('/npm/verdaccio/config/schema')
  },
}
