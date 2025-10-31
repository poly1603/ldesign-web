import { apiClient } from './client'

export interface VersionManager {
  name: string
  version: string | null
  installed: boolean
}

export interface NodeVersion {
  version: string
  current?: boolean
  lts?: boolean
}

export interface CurrentVersion {
  version: string
  path: string
}

export const nodeManagerApi = {
  // 获取已安装的版本管理工具
  async getTools(): Promise<VersionManager[]> {
    return apiClient.get('/node-manager/tools')
  },

  // 获取已安装的 Node 版本列表
  async getInstalledVersions(tool: string = 'nvm'): Promise<string[]> {
    return apiClient.get('/node-manager/versions', { params: { tool } })
  },

  // 获取可安装的 Node 版本列表
  async getAvailableVersions(tool: string = 'nvm'): Promise<string[]> {
    return apiClient.get('/node-manager/versions/available', { params: { tool } })
  },

  // 获取当前使用的 Node 版本
  async getCurrentVersion(): Promise<CurrentVersion> {
    return apiClient.get('/node-manager/versions/current')
  },

  // 安装指定版本
  async installVersion(version: string, tool: string = 'nvm'): Promise<void> {
    return apiClient.post('/node-manager/versions/install', { version, tool })
  },

  // 卸载指定版本
  async uninstallVersion(version: string, tool: string = 'nvm'): Promise<void> {
    return apiClient.post('/node-manager/versions/uninstall', { version, tool })
  },

  // 切换到指定版本
  async useVersion(version: string, tool: string = 'nvm'): Promise<void> {
    return apiClient.post('/node-manager/versions/use', { version, tool })
  },
}

