import { apiClient } from './client'

export interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'directory'
  size: number
  modifiedAt: number
  children?: FileTreeNode[]
}

export interface DirectorySelectResult {
  path: string
  exists: boolean
  isDirectory: boolean
}

export const filesApi = {
  /**
   * 选择目录（手动输入方案）
   */
  async selectDirectory(path: string, title?: string): Promise<DirectorySelectResult> {
    return apiClient.post('/files/select-directory', { path, title })
  },

  /**
   * 获取文件树
   */
  async getTree(path: string, depth = 2): Promise<FileTreeNode> {
    return apiClient.get('/files/tree', { params: { path, depth } })
  },

  /**
   * 读取文件内容
   */
  async readFile(path: string): Promise<{ content: string; size: number }> {
    return apiClient.get('/files/read', { params: { path } })
  },

  /**
   * 写入文件
   */
  async writeFile(path: string, content: string): Promise<void> {
    return apiClient.post('/files/write', { path, content })
  },

  /**
   * 创建文件或目录
   */
  async create(path: string, type: 'file' | 'directory', content = ''): Promise<void> {
    return apiClient.post('/files/create', { path, type, content })
  },

  /**
   * 删除文件或目录
   */
  async delete(path: string): Promise<void> {
    return apiClient.delete('/files/delete', { params: { path } })
  },
}

