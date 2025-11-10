import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { projectApi } from '../api/services'

export interface Project {
  id: string
  name: string
  path: string
  type: 'web' | 'api' | 'library' | 'mobile' | 'desktop' | 'other'
  category?: 'project' | 'library' | 'project-library' | 'other'
  framework?: string
  frameworkVersion?: string
  isTypeScript: boolean
  packageManager?: string
  description?: string
  createdAt: number
  updatedAt: number
  lastOpenedAt?: number
}

export const useProjectsStore = defineStore('projects', () => {
  // State
  const projects = ref<Project[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastFetch = ref<number>(0)
  
  // Getters
  const projectCount = computed(() => projects.value.length)
  
  const recentProjects = computed(() => {
    return [...projects.value]
      .filter(p => p.lastOpenedAt)
      .sort((a, b) => (b.lastOpenedAt || 0) - (a.lastOpenedAt || 0))
      .slice(0, 10)
  })
  
  const projectsByCategory = computed(() => {
    const grouped: Record<string, Project[]> = {}
    projects.value.forEach(project => {
      const category = project.category || 'other'
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(project)
    })
    return grouped
  })

  // Actions
  async function fetchProjects(params?: {
    search?: string
    category?: string
    type?: string
    framework?: string
    sortBy?: string
    sortOrder?: 'ASC' | 'DESC'
  }, force = false) {
    // 缓存策略：5分钟内不重复请求
    const now = Date.now()
    if (!force && lastFetch.value && now - lastFetch.value < 5 * 60 * 1000) {
      return projects.value
    }

    loading.value = true
    error.value = null

    try {
      const response = await projectApi.getAll(params)
      if (response.success && response.data) {
        projects.value = response.data
        lastFetch.value = now
      }
      return projects.value
    } catch (err: any) {
      error.value = err.message || '获取项目列表失败'
      console.error('Failed to fetch projects:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function getProject(id: string): Promise<Project | undefined> {
    // 先从缓存中查找
    const cached = projects.value.find(p => p.id === id)
    if (cached) {
      return cached
    }

    // 从API获取
    loading.value = true
    error.value = null

    try {
      const response = await projectApi.getOne(id)
      if (response.success && response.data) {
        // 更新缓存
        const index = projects.value.findIndex(p => p.id === id)
        if (index !== -1) {
          projects.value[index] = response.data
        } else {
          projects.value.push(response.data)
        }
        return response.data
      }
    } catch (err: any) {
      error.value = err.message || '获取项目详情失败'
      console.error('Failed to fetch project:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createProject(data: Partial<Project>): Promise<Project> {
    loading.value = true
    error.value = null

    try {
      const response = await projectApi.create(data)
      if (response.success && response.data) {
        // 乐观更新：立即添加到列表
        projects.value.unshift(response.data)
        return response.data
      }
      throw new Error('创建项目失败')
    } catch (err: any) {
      error.value = err.message || '创建项目失败'
      console.error('Failed to create project:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateProject(id: string, data: Partial<Project>): Promise<Project> {
    loading.value = true
    error.value = null

    // 乐观更新：先更新本地缓存
    const index = projects.value.findIndex(p => p.id === id)
    const oldProject = index !== -1 ? { ...projects.value[index] } : null
    
    if (index !== -1) {
      projects.value[index] = { ...projects.value[index], ...data }
    }

    try {
      const response = await projectApi.update(id, data)
      if (response.success && response.data) {
        // 使用服务器返回的数据更新
        if (index !== -1) {
          projects.value[index] = response.data
        }
        return response.data
      }
      throw new Error('更新项目失败')
    } catch (err: any) {
      // 回滚乐观更新
      if (oldProject && index !== -1) {
        projects.value[index] = oldProject
      }
      error.value = err.message || '更新项目失败'
      console.error('Failed to update project:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteProject(id: string): Promise<void> {
    loading.value = true
    error.value = null

    // 乐观更新：先从列表中移除
    const index = projects.value.findIndex(p => p.id === id)
    const removedProject = index !== -1 ? projects.value[index] : null
    
    if (index !== -1) {
      projects.value.splice(index, 1)
    }

    try {
      const response = await projectApi.delete(id)
      if (!response.success) {
        throw new Error('删除项目失败')
      }
    } catch (err: any) {
      // 回滚乐观更新
      if (removedProject && index !== -1) {
        projects.value.splice(index, 0, removedProject)
      }
      error.value = err.message || '删除项目失败'
      console.error('Failed to delete project:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function importProject(data: { path: string; name?: string }): Promise<Project> {
    loading.value = true
    error.value = null

    try {
      const response = await projectApi.import(data)
      if (response.success && response.data) {
        // 添加到列表
        projects.value.unshift(response.data)
        return response.data
      }
      throw new Error('导入项目失败')
    } catch (err: any) {
      error.value = err.message || '导入项目失败'
      console.error('Failed to import project:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function openProject(id: string): Promise<void> {
    try {
      await projectApi.open(id)
      // 更新本地缓存的最后打开时间
      const index = projects.value.findIndex(p => p.id === id)
      if (index !== -1) {
        projects.value[index].lastOpenedAt = Date.now()
      }
    } catch (err: any) {
      error.value = err.message || '更新项目打开时间失败'
      console.error('Failed to open project:', err)
      throw err
    }
  }

  function clearError() {
    error.value = null
  }

  function clearCache() {
    projects.value = []
    lastFetch.value = 0
  }

  return {
    // State
    projects,
    loading,
    error,
    
    // Getters
    projectCount,
    recentProjects,
    projectsByCategory,
    
    // Actions
    fetchProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    importProject,
    openProject,
    clearError,
    clearCache,
  }
})
