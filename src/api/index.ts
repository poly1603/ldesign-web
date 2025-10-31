import { projectsApi } from './projects'
import { buildsApi } from './builds'
import { deploymentsApi } from './deployments'
import { toolsApi } from './tools'
import { monitorApi } from './monitor'
import { tasksApi } from './tasks'
import { dependenciesApi } from './dependencies'
import { filesApi } from './files'
import { builderApi } from './builder'
import { nodeManagerApi } from './node-manager'
import { apiClient } from './client'

export const api = {
  // 项目管理
  ...projectsApi,
  
  // 构建管理
  ...buildsApi,
  
  // 部署管理
  ...deploymentsApi,
  
  // 工具管理
  ...toolsApi,
  
  // 监控
  ...monitorApi,
  
  // 任务管理
  ...tasksApi,
  
  // 依赖管理
  ...dependenciesApi,
  
  // 健康检查
  checkHealth: () => apiClient.get('/health'),
}

export * from './projects'
export * from './builds'
export * from './deployments'
export * from './tools'
export * from './monitor'
export * from './tasks'
export * from './dependencies'
export * from './files'
export * from './builder'
export * from './node-manager'
export * from './npm-registry'

export { projectsApi, filesApi, builderApi, nodeManagerApi }
