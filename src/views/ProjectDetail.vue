<template>
  <div class="project-detail-page">
    <div class="page-header">
      <button class="back-btn" @click="router.back()">
        <ArrowLeft :size="20" />
        返回
      </button>
      <h1>{{ project?.name || '项目详情' }}</h1>
    </div>

    <div v-if="loading" class="loading">
      加载中...
    </div>

    <div v-else-if="error" class="error-message">
      {{ error }}
    </div>

    <div v-else-if="project" class="detail-content">
      <!-- 数据统计展示 -->
      <div class="stats-section">
        <h2 class="stats-title">数据统计</h2>
        <div class="stats-grid">
          <!-- 项目类型：显示启动、打包、预览、部署 -->
          <template v-if="isProject">
            <!-- 启动统计 -->
            <div class="stat-card stat-card--dev">
              <div class="stat-header">
                <div class="stat-icon-wrapper stat-icon-wrapper--dev">
                  <Play :size="24" class="stat-icon" />
                </div>
                <div class="stat-info">
                  <div class="stat-title-text">启动</div>
                  <div class="stat-value-large">{{ projectStats.dev.totalCount }}</div>
                </div>
              </div>
            </div>

            <!-- 打包统计 -->
            <div class="stat-card stat-card--build">
              <div class="stat-header">
                <div class="stat-icon-wrapper stat-icon-wrapper--build">
                  <Package :size="24" class="stat-icon" />
                </div>
                <div class="stat-info">
                  <div class="stat-title-text">打包</div>
                  <div class="stat-value-large">{{ projectStats.build.totalCount }}</div>
                </div>
              </div>
            </div>

            <!-- 预览统计 -->
            <div class="stat-card stat-card--preview">
              <div class="stat-header">
                <div class="stat-icon-wrapper stat-icon-wrapper--preview">
                  <Eye :size="24" class="stat-icon" />
                </div>
                <div class="stat-info">
                  <div class="stat-title-text">预览</div>
                  <div class="stat-value-large">{{ projectStats.preview.totalCount }}</div>
                </div>
              </div>
            </div>

            <!-- 部署统计 -->
            <div class="stat-card stat-card--deploy">
              <div class="stat-header">
                <div class="stat-icon-wrapper stat-icon-wrapper--deploy">
                  <Rocket :size="24" class="stat-icon" />
                </div>
                <div class="stat-info">
                  <div class="stat-title-text">部署</div>
                  <div class="stat-value-large">{{ projectStats.deploy.totalCount }}</div>
                </div>
              </div>
            </div>
          </template>

          <!-- 库类型：只显示打包和发布 -->
          <template v-else-if="isLibrary">
            <!-- 打包统计 -->
            <div class="stat-card stat-card--build">
              <div class="stat-header">
                <div class="stat-icon-wrapper stat-icon-wrapper--build">
                  <Package :size="24" class="stat-icon" />
                </div>
                <div class="stat-info">
                  <div class="stat-title-text">打包</div>
                  <div class="stat-value-large">{{ projectStats.build.totalCount }}</div>
                </div>
              </div>
            </div>

            <!-- 发布统计 -->
            <div class="stat-card stat-card--publish">
              <div class="stat-header">
                <div class="stat-icon-wrapper stat-icon-wrapper--publish">
                  <Upload :size="24" class="stat-icon" />
                </div>
                <div class="stat-info">
                  <div class="stat-title-text">发布</div>
                  <div class="stat-value-large">{{ projectStats.publish.totalCount }}</div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- 快捷功能入口 -->
      <div class="actions-section">
        <h2>快捷功能</h2>
        <div class="actions-grid">
          <!-- 项目类型：显示启动、打包、预览、部署 -->
          <template v-if="isProject">
            <!-- 启动按钮 - 显示环境数量，悬停显示详情 -->
            <div 
              class="action-card-wrapper"
              @mouseenter="showEnvironmentsTooltip = runningEnvironments.length > 0"
              @mouseleave="showEnvironmentsTooltip = false"
            >
              <button 
                class="action-card" 
                :class="{ 'action-card--running': runningEnvironments.length > 0 }"
                @click="navigateToAction('dev')"
              >
                <Play :size="24" />
                <span>启动</span>
                <span v-if="runningEnvironments.length > 0" class="running-count">
                  {{ runningEnvironments.length }}
                </span>
              </button>
              <!-- 悬停显示的环境详情 -->
              <Transition name="tooltip">
                <div 
                  v-if="runningEnvironments.length > 0 && showEnvironmentsTooltip" 
                  class="environments-tooltip"
                  @mouseenter="showEnvironmentsTooltip = true"
                  @mouseleave="showEnvironmentsTooltip = false"
                >
                  <div class="tooltip-header">
                    <span class="tooltip-title">运行中的环境</span>
                    <span class="tooltip-count">{{ runningEnvironments.length }}</span>
                  </div>
                  <div class="tooltip-list">
                    <div
                      v-for="env in runningEnvironments"
                      :key="env.environment || 'development'"
                      class="tooltip-item"
                      :class="{ 'has-service': env.serviceUrl }"
                      @click.stop="env.serviceUrl && openEnvironmentService(env.serviceUrl)"
                    >
                      <span class="item-icon">{{ getEnvironmentIcon(env.environment || 'development') }}</span>
                      <span class="item-name">{{ getEnvironmentLabel(env.environment || 'development') }}</span>
                      <button
                        v-if="env.serviceUrl"
                        class="item-open-btn"
                        @click.stop="openEnvironmentService(env.serviceUrl)"
                        :title="`打开 ${env.serviceUrl}`"
                      >
                        <ExternalLink :size="12" />
                      </button>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>
            <!-- 打包按钮 - 显示环境数量，悬停显示详情 -->
            <div 
              class="action-card-wrapper"
              @mouseenter="showBuildEnvironmentsTooltip = runningBuildEnvironments.length > 0"
              @mouseleave="showBuildEnvironmentsTooltip = false"
            >
              <button 
                class="action-card" 
                :class="{ 'action-card--running': runningBuildEnvironments.length > 0 }"
                @click="navigateToAction('build')"
              >
                <Package :size="24" />
                <span>打包</span>
                <span v-if="runningBuildEnvironments.length > 0" class="running-count">
                  {{ runningBuildEnvironments.length }}
                </span>
              </button>
              <!-- 悬停显示的打包环境详情 -->
              <Transition name="tooltip">
                <div 
                  v-if="runningBuildEnvironments.length > 0 && showBuildEnvironmentsTooltip" 
                  class="environments-tooltip"
                  @mouseenter="showBuildEnvironmentsTooltip = true"
                  @mouseleave="showBuildEnvironmentsTooltip = false"
                >
                  <div class="tooltip-header">
                    <span class="tooltip-title">已打包的环境</span>
                    <span class="tooltip-count">{{ runningBuildEnvironments.length }}</span>
                  </div>
                  <div class="tooltip-list">
                    <div
                      v-for="env in runningBuildEnvironments"
                      :key="env.environment || 'production'"
                      class="tooltip-item"
                    >
                      <span class="item-icon">{{ getEnvironmentIcon(env.environment || 'production') }}</span>
                      <span class="item-name">{{ getEnvironmentLabel(env.environment || 'production') }}</span>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>
            <!-- 预览按钮 - 显示环境数量，悬停显示详情 -->
            <div 
              class="action-card-wrapper"
              @mouseenter="showPreviewEnvironmentsTooltip = runningPreviewEnvironments.length > 0"
              @mouseleave="showPreviewEnvironmentsTooltip = false"
            >
              <button 
                class="action-card" 
                :class="{ 'action-card--running': runningPreviewEnvironments.length > 0 }"
                @click="navigateToAction('preview')"
              >
                <Eye :size="24" />
                <span>预览</span>
                <span v-if="runningPreviewEnvironments.length > 0" class="running-count">
                  {{ runningPreviewEnvironments.length }}
                </span>
              </button>
              <!-- 悬停显示的预览环境详情 -->
              <Transition name="tooltip">
                <div 
                  v-if="runningPreviewEnvironments.length > 0 && showPreviewEnvironmentsTooltip" 
                  class="environments-tooltip"
                  @mouseenter="showPreviewEnvironmentsTooltip = true"
                  @mouseleave="showPreviewEnvironmentsTooltip = false"
                >
                  <div class="tooltip-header">
                    <span class="tooltip-title">预览中的环境</span>
                    <span class="tooltip-count">{{ runningPreviewEnvironments.length }}</span>
                  </div>
                  <div class="tooltip-list">
                    <div
                      v-for="env in runningPreviewEnvironments"
                      :key="env.environment || 'development'"
                      class="tooltip-item"
                      :class="{ 'has-service': env.serviceUrl }"
                      @click.stop="env.serviceUrl && openEnvironmentService(env.serviceUrl)"
                    >
                      <span class="item-icon">{{ getEnvironmentIcon(env.environment || 'development') }}</span>
                      <span class="item-name">{{ getEnvironmentLabel(env.environment || 'development') }}</span>
                      <button
                        v-if="env.serviceUrl"
                        class="item-open-btn"
                        @click.stop="openEnvironmentService(env.serviceUrl)"
                        :title="`打开 ${env.serviceUrl}`"
                      >
                        <ExternalLink :size="12" />
                      </button>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>
            <button class="action-card" @click="navigateToAction('deploy')">
              <Rocket :size="24" />
              <span>部署</span>
            </button>
          </template>
          <!-- 库类型：显示打包、发布 -->
          <template v-else-if="isLibrary">
            <button class="action-card" @click="navigateToAction('build')">
              <Package :size="24" />
              <span>打包</span>
            </button>
            <button class="action-card" @click="navigateToAction('publish')">
              <Upload :size="24" />
              <span>发布</span>
            </button>
          </template>
        </div>
      </div>

      <!-- 项目配置入口 -->
      <div class="config-section">
        <h2>项目配置</h2>
        <div class="config-grid">
          <!-- 项目类型：显示 app 配置和 launcher 配置 -->
          <template v-if="isProject">
            <button class="config-card" @click="openConfig('app')">
              <Code :size="24" />
              <span>App 配置</span>
              <span class="config-desc">应用配置文件</span>
            </button>
            <button class="config-card" @click="openConfig('launcher')">
              <Rocket :size="24" />
              <span>Launcher 配置</span>
              <span class="config-desc">启动器配置</span>
            </button>
          </template>
          <!-- 库类型：显示 builder 配置 -->
          <template v-else-if="isLibrary">
            <button class="config-card" @click="openConfig('builder')">
              <Package :size="24" />
              <span>Builder 配置</span>
              <span class="config-desc">构建工具配置</span>
            </button>
          </template>
          <!-- 所有项目都有：TypeScript 配置和 Package 配置 -->
          <button class="config-card" @click="openConfig('typescript')">
            <FileCode :size="24" />
            <span>TypeScript 配置</span>
            <span class="config-desc">tsconfig.json</span>
          </button>
          <button class="config-card" @click="openConfig('package')">
            <FileText :size="24" />
            <span>Package 配置</span>
            <span class="config-desc">package.json</span>
          </button>
        </div>
      </div>

      <div class="info-section">
        <h2>基本信息</h2>
        <div class="info-grid">
          <!-- 项目名称和类别在一行 -->
          <div class="info-item info-item--inline">
            <span class="label">项目名称:</span>
            <span class="value">{{ project.name }}</span>
            <span v-if="project.category" class="category-badge" :class="`category-badge--${project.category}`">
              {{ getCategoryLabel(project.category) }}
            </span>
          </div>
          <!-- 项目路径独占一行，带打开文件夹图标 -->
          <div class="info-item info-item--full">
            <span class="label">项目路径:</span>
            <div class="path-value-wrapper">
              <span class="value path-value">{{ project.path }}</span>
              <button class="open-folder-btn" @click="openProjectFolder" :title="`在文件管理器中打开`">
                <FolderOpen :size="16" />
              </button>
            </div>
          </div>
          <!-- 项目描述独占一行 -->
          <div v-if="project.description" class="info-item info-item--full">
            <span class="label">项目描述:</span>
            <span class="value description-value">{{ project.description }}</span>
          </div>
          <div v-if="project.type" class="info-item">
            <span class="label">项目类型:</span>
            <span class="value">{{ project.type }}</span>
          </div>
          <div v-if="project.framework" class="info-item">
            <span class="label">框架:</span>
            <span class="value">
              {{ project.framework }}
              <span v-if="project.frameworkVersion"> {{ project.frameworkVersion }}</span>
            </span>
          </div>
          <div class="info-item">
            <span class="label">TypeScript:</span>
            <span class="value">{{ project.isTypeScript ? '是' : '否' }}</span>
          </div>
          <div v-if="project.packageManager" class="info-item">
            <span class="label">包管理器:</span>
            <span class="value">{{ project.packageManager }}</span>
          </div>
          <div class="info-item">
            <span class="label">创建时间:</span>
            <span class="value">{{ formatDate(project.createdAt) }}</span>
          </div>
          <div class="info-item">
            <span class="label">更新时间:</span>
            <span class="value">{{ formatDate(project.updatedAt) }}</span>
          </div>
          <div v-if="project.lastOpenedAt" class="info-item">
            <span class="label">最后打开:</span>
            <span class="value">{{ formatDate(project.lastOpenedAt) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Play, Package, Eye, Rocket, Upload, Code, FileCode, FileText, ExternalLink, FolderOpen } from 'lucide-vue-next'
import { projectApi } from '../api/services'

interface Project {
  id: string
  name: string
  path: string
  type: string
  category?: string
  framework?: string
  frameworkVersion?: string
  isTypeScript: boolean
  packageManager?: string
  description?: string
  lastOpenedAt?: number
  createdAt: number
  updatedAt: number
}

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const error = ref<string | null>(null)
const project = ref<Project | null>(null)

// 启动状态 - 支持多环境
const runningEnvironments = ref<Array<{ environment?: string; executionId: string; serviceUrl?: string }>>([])
const showEnvironmentsTooltip = ref(false)

// 预览状态 - 支持多环境
const runningPreviewEnvironments = ref<Array<{ environment?: string; executionId: string; serviceUrl?: string }>>([])
const showPreviewEnvironmentsTooltip = ref(false)

// 打包状态 - 支持多环境
const runningBuildEnvironments = ref<Array<{ environment?: string; executionId: string; serviceUrl?: string }>>([])
const showBuildEnvironmentsTooltip = ref(false)

// 项目统计数据
const projectStats = ref({
  dev: {
    totalCount: 0,
    successCount: 0,
    failedCount: 0,
    totalDuration: 0,
    lastExecutedAt: undefined as number | undefined,
  },
  build: {
    totalCount: 0,
    successCount: 0,
    failedCount: 0,
    successRate: 0,
    lastExecutedAt: undefined as number | undefined,
  },
  preview: {
    totalCount: 0,
    successCount: 0,
    failedCount: 0,
    totalDuration: 0,
    lastExecutedAt: undefined as number | undefined,
  },
  deploy: {
    totalCount: 0,
    successCount: 0,
    failedCount: 0,
    successRate: 0,
    lastExecutedAt: undefined as number | undefined,
  },
  publish: {
    totalCount: 0,
    successCount: 0,
    failedCount: 0,
    successRate: 0,
    lastExecutedAt: undefined as number | undefined,
  },
  lastActivityAt: undefined as number | undefined,
})

function getCategoryLabel(category: string | undefined): string {
  if (!category) return '未知'
  const labels: Record<string, string> = {
    project: '项目',
    library: '库',
    'project-library': '项目+库',
    other: '其他',
  }
  return labels[category] || category
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN')
}

// 判断是否为项目类型
const isProject = computed(() => {
  return project.value?.category === 'project' || project.value?.category === 'project-library'
})

// 判断是否为库类型
const isLibrary = computed(() => {
  return project.value?.category === 'library'
})

// 导航到对应的功能页面
function navigateToAction(action: string) {
  const id = route.params.id as string
  // 库类型的打包跳转到专用页面
  if (action === 'build' && isLibrary.value) {
    router.push(`/projects/${id}/library-build`)
  } else {
    router.push(`/projects/${id}/${action}`)
  }
}

// 打开配置文件
function openConfig(configType: string) {
  const id = route.params.id as string
  router.push(`/projects/${id}/config/${configType}`)
}

/**
 * 获取环境图标
 */
function getEnvironmentIcon(env: string): string {
  const iconMap: Record<string, string> = {
    development: '🟢',
    production: '🔴',
    staging: '🟡',
    test: '🔵',
    preview: '🟣',
  }
  return iconMap[env] || '🟢'
}

/**
 * 获取环境标签
 */
function getEnvironmentLabel(env: string): string {
  const labelMap: Record<string, string> = {
    development: '开发环境',
    production: '生产环境',
    staging: '预发布环境',
    test: '测试环境',
    preview: '预览环境',
  }
  return labelMap[env] || env
}

/**
 * 检查项目启动状态 - 获取所有运行中的环境
 */
async function checkDevStatus() {
  if (!project.value?.id) return
  
  try {
    const response = await projectApi.getRunningExecutions(project.value.id, 'dev')
    if (response.success && response.data) {
      runningEnvironments.value = response.data.map((exec: any) => ({
        environment: exec.environment || 'development',
        executionId: exec.id || exec.executionId,
        serviceUrl: exec.serviceUrl,
      }))
    } else {
      runningEnvironments.value = []
    }
  } catch (error) {
    console.error('检查启动状态失败:', error)
    runningEnvironments.value = []
  }
}

/**
 * 检查项目预览状态 - 获取所有预览中的环境
 */
async function checkPreviewStatus() {
  if (!project.value?.id) return
  
  try {
    const response = await projectApi.getRunningExecutions(project.value.id, 'preview')
    if (response.success && response.data) {
      runningPreviewEnvironments.value = response.data.map((exec: any) => ({
        environment: exec.environment || 'development',
        executionId: exec.id || exec.executionId,
        serviceUrl: exec.serviceUrl,
      }))
    } else {
      runningPreviewEnvironments.value = []
    }
  } catch (error) {
    console.error('检查预览状态失败:', error)
    runningPreviewEnvironments.value = []
  }
}

/**
 * 格式化时长显示
 */
function formatDuration(ms: number): string {
  if (ms === 0) return '0分钟'
  
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) {
    return `${days}天${hours % 24}小时`
  } else if (hours > 0) {
    return `${hours}小时${minutes % 60}分钟`
  } else if (minutes > 0) {
    return `${minutes}分钟`
  } else {
    return `${seconds}秒`
  }
}

/**
 * 加载项目统计数据
 */
async function loadProjectStats() {
  if (!project.value?.id) return
  
  try {
    const response = await projectApi.getProjectStats(project.value.id)
    if (response.success && response.data) {
      projectStats.value = response.data
    }
  } catch (error) {
    console.error('加载项目统计数据失败:', error)
  }
}

/**
 * 检查项目打包状态 - 获取所有已打包的环境
 */
async function checkBuildStatus() {
  if (!project.value?.id) return
  
  try {
    const response = await projectApi.getAllBuildStatuses(project.value.id)
    if (response.success && response.data) {
      runningBuildEnvironments.value = response.data.map((status: any) => ({
        environment: status.environment || 'production',
        executionId: '', // 打包状态不关联执行ID
        serviceUrl: undefined, // 打包状态不关联服务URL
      }))
    } else {
      runningBuildEnvironments.value = []
    }
  } catch (error) {
    console.error('检查打包状态失败:', error)
    runningBuildEnvironments.value = []
  }
}

/**
 * 格式化服务地址显示（简化显示）
 */
function formatServiceUrl(url: string): string {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `http://${url}`)
    return urlObj.host
  } catch {
    // 如果解析失败，返回原始地址（截断）
    return url.length > 20 ? `${url.slice(0, 20)}...` : url
  }
}

/**
 * 打开指定环境的服务地址（在新窗口打开）
 */
function openEnvironmentService(url: string) {
  if (!url) return
  
  try {
    // 确保 URL 格式正确
    let finalUrl = url.trim()
    
    // 如果 URL 没有协议，添加 http://
    if (!finalUrl.match(/^https?:\/\//i)) {
      finalUrl = `http://${finalUrl}`
    }
    
    // 在新窗口打开
    const newWindow = window.open(finalUrl, '_blank', 'noopener,noreferrer')
    
    // 如果被浏览器阻止，提示用户
    if (!newWindow) {
      console.warn('无法打开新窗口，可能被浏览器阻止。请检查浏览器弹窗设置。')
      // 可以添加用户提示
      alert(`无法打开新窗口，请手动访问：${finalUrl}`)
    }
  } catch (error) {
    console.error('打开服务地址失败:', error)
  }
}

/**
 * 在系统文件管理器中打开项目文件夹
 */
async function openProjectFolder() {
  if (!project.value?.id) {
    console.warn('项目 ID 不存在，无法打开文件夹')
    return
  }
  
  console.log('准备打开项目文件夹，项目 ID:', project.value.id)
  
  try {
    const response = await projectApi.openFolder(project.value.id)
    console.log('打开文件夹响应:', response)
    if (response.success) {
      console.log('文件夹已成功打开')
    }
  } catch (error: any) {
    console.error('打开项目文件夹失败:', error)
    const errorMessage = error.message || error.toString() || '未知错误'
    alert(`无法打开文件夹: ${errorMessage}`)
  }
}

async function loadProject() {
  const id = route.params.id as string
  if (!id) {
    error.value = '项目 ID 不存在'
    return
  }

  loading.value = true
  error.value = null

  try {
    const response = await projectApi.getOne(id)
    if (response.success) {
      project.value = response.data
      // 更新最后打开时间
      projectApi.open(id).catch(console.error)
      // 检查启动状态、预览状态和打包状态
      await checkDevStatus()
      await checkPreviewStatus()
      await checkBuildStatus()
      // 加载项目统计数据
      await loadProjectStats()
    } else {
      throw new Error(response.message || '获取项目详情失败')
    }
  } catch (e: any) {
    console.error('加载项目详情失败:', e)
    error.value = e.message || '加载项目详情失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadProject()
  
  // 定期检查启动状态、预览状态和打包状态（每5秒检查一次）
  const statusCheckInterval = setInterval(() => {
    if (project.value?.id) {
      checkDevStatus()
      checkPreviewStatus()
      checkBuildStatus()
    }
  }, 5000)
  
  // 组件卸载时清除定时器
  onUnmounted(() => {
    clearInterval(statusCheckInterval)
  })
})
</script>

<style scoped>
.project-detail-page {
  padding: var(--content-padding);
  background: var(--content-bg);
  color: var(--color-text-primary);
  min-height: 100%;
}

.page-header {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-md);
  margin-bottom: var(--size-spacing-xl);
}

.back-btn {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-xs);
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  background: var(--color-bg-component);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  cursor: pointer;
  font-size: var(--font-size-base);
  transition: all 0.2s ease;
}

.back-btn:hover {
  background: var(--color-bg-component-hover);
  border-color: var(--theme-color-primary);
}

.page-header h1 {
  font-size: var(--font-size-2xl);
  font-weight: var(--size-font-weight-semibold);
  margin: 0;
  color: var(--color-text-primary);
}

.loading,
.error-message {
  text-align: center;
  padding: var(--size-spacing-3xl);
  color: var(--color-text-secondary);
}

.error-message {
  color: var(--color-danger-default);
  background: var(--color-danger-light);
  border-radius: var(--size-radius-md);
}

.detail-content {
  max-width: 1200px;
}

/* 数据统计展示 */
.stats-section {
  margin-bottom: var(--size-spacing-xl);
}

.stats-title {
  font-size: var(--font-size-xl);
  font-weight: var(--size-font-weight-semibold);
  margin: 0 0 var(--size-spacing-lg) 0;
  color: var(--color-text-primary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--size-spacing-lg);
}

.stat-card {
  background: var(--color-bg-container);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-lg);
  padding: var(--size-spacing-lg);
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--color-border-light);
  transition: all 0.2s ease;
}

.stat-card--dev::before {
  background: var(--color-success-default);
}

.stat-card--build::before {
  background: var(--theme-color-primary);
}

.stat-card--preview::before {
  background: var(--color-info-default);
}

.stat-card--deploy::before {
  background: var(--color-warning-default);
}

.stat-card--publish::before {
  background: var(--color-success-default);
}

.stat-card:hover {
  border-color: var(--theme-color-primary);
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

.stat-header {
  display: flex;
  align-items: flex-start;
  gap: var(--size-spacing-md);
  margin-bottom: var(--size-spacing-lg);
}

.stat-icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: var(--size-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon-wrapper--dev {
  background: rgba(52, 211, 153, 0.1);
  color: var(--color-success-default);
}

.stat-icon-wrapper--build {
  background: rgba(59, 130, 246, 0.1);
  color: var(--theme-color-primary);
}

.stat-icon-wrapper--preview {
  background: rgba(99, 102, 241, 0.1);
  color: var(--color-info-default);
}

.stat-icon-wrapper--deploy {
  background: rgba(251, 191, 36, 0.1);
  color: var(--color-warning-default);
}

.stat-icon-wrapper--publish {
  background: rgba(52, 211, 153, 0.1);
  color: var(--color-success-default);
}

.stat-icon {
  flex-shrink: 0;
}

.stat-info {
  flex: 1;
  min-width: 0;
}

.stat-title-text {
  font-size: var(--font-size-sm);
  font-weight: var(--size-font-weight-medium);
  color: var(--color-text-secondary);
  margin-bottom: var(--size-spacing-xs);
}

.stat-value-large {
  font-size: var(--font-size-4xl);
  font-weight: var(--size-font-weight-bold);
  color: var(--color-text-primary);
  line-height: 1;
}

.stat-details {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-spacing-md);
  padding-top: var(--size-spacing-md);
  border-top: 1px solid var(--color-border-light);
}

.stat-detail-item {
  flex: 1;
  min-width: 80px;
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-xs);
}

.stat-detail-item--full {
  flex: 1 1 100%;
  min-width: 100%;
}

.stat-detail-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-weight: var(--size-font-weight-medium);
}

.stat-detail-value {
  font-size: var(--font-size-lg);
  font-weight: var(--size-font-weight-semibold);
  color: var(--color-text-primary);
}

.stat-detail-value--success {
  color: var(--color-success-default);
}

.stat-detail-value--failed {
  color: var(--color-danger-default);
}

.stat-detail-value--duration,
.stat-detail-value--rate {
  color: var(--color-text-secondary);
}

.actions-section {
  background: var(--color-bg-container);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-lg);
  padding: var(--size-spacing-xl);
  margin-bottom: var(--size-spacing-xl);
}

.actions-section h2 {
  font-size: var(--font-size-xl);
  font-weight: var(--size-font-weight-semibold);
  margin: 0 0 var(--size-spacing-lg) 0;
  color: var(--color-text-primary);
  border-bottom: 2px solid var(--color-border-light);
  padding-bottom: var(--size-spacing-sm);
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: var(--size-spacing-md);
  align-items: start;
}

.action-card-wrapper {
  position: relative;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--size-spacing-sm);
  padding: var(--size-spacing-xl);
  background: var(--color-bg-component);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--color-text-primary);
  min-height: 120px;
  width: 100%;
  position: relative;
}

.action-card--running {
  border-color: var(--color-success-default);
}

.running-count {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  background: var(--color-success-default);
  color: white;
  border-radius: 12px;
  font-size: var(--font-size-xs);
  font-weight: var(--size-font-weight-semibold);
  margin-top: var(--size-spacing-xs);
}

/* 悬停显示的环境详情 */
.environments-tooltip {
  position: absolute;
  top: calc(100% + var(--size-spacing-xs));
  left: 0;
  right: 0;
  z-index: 1000;
  background: var(--color-bg-container);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  box-shadow: var(--shadow-lg);
  padding: var(--size-spacing-md);
  font-size: var(--font-size-sm);
  min-width: 240px;
  pointer-events: auto;
}

.tooltip-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--size-spacing-md);
  padding-bottom: var(--size-spacing-sm);
  border-bottom: 1px solid var(--color-border-light);
}

.tooltip-title {
  color: var(--color-text-secondary);
  font-weight: var(--size-font-weight-medium);
  font-size: var(--font-size-sm);
}

.tooltip-count {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  background: var(--color-success-default);
  color: white;
  border-radius: 12px;
  font-size: var(--font-size-xs);
  font-weight: var(--size-font-weight-semibold);
}

.tooltip-list {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-xs);
  max-height: 200px;
  overflow-y: auto;
  overflow-x: hidden;
}

/* 自定义滚动条样式 */
.tooltip-list::-webkit-scrollbar {
  width: 4px;
}

.tooltip-list::-webkit-scrollbar-track {
  background: transparent;
}

.tooltip-list::-webkit-scrollbar-thumb {
  background: var(--color-border-light);
  border-radius: 2px;
}

.tooltip-list::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-tertiary);
}

.tooltip-item {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-sm);
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  border-radius: var(--size-radius-sm);
  transition: all 0.15s ease;
  cursor: default;
}

.tooltip-item.has-service {
  cursor: pointer;
}

.tooltip-item.has-service:hover {
  background: var(--color-bg-component-hover);
}

.item-icon {
  font-size: var(--font-size-base);
  line-height: 1;
  flex-shrink: 0;
}

.item-name {
  flex: 1;
  color: var(--color-text-primary);
  font-weight: var(--size-font-weight-medium);
  font-size: var(--font-size-sm);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.item-open-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: var(--size-radius-sm);
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  opacity: 0;
}

.tooltip-item.has-service:hover .item-open-btn {
  opacity: 1;
  background: var(--theme-color-primary);
  color: white;
}

.item-open-btn:hover {
  background: var(--theme-color-primary-hover) !important;
  transform: scale(1.1);
}

.item-open-btn:active {
  transform: scale(0.95);
}

.item-open-btn svg {
  width: 12px;
  height: 12px;
}

/* Tooltip 动画 */
.tooltip-enter-active,
.tooltip-leave-active {
  transition: all 0.2s ease;
}

.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.action-card:hover {
  background: var(--color-bg-component-hover);
  border-color: var(--theme-color-primary);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.action-card:active {
  transform: translateY(0);
}

.action-card svg {
  color: var(--theme-color-primary);
}

.action-card .open-service-btn svg {
  color: white;
}

.action-card span {
  font-size: var(--font-size-base);
  font-weight: var(--size-font-weight-medium);
}

.info-section {
  background: var(--color-bg-container);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-lg);
  padding: var(--size-spacing-xl);
  margin-bottom: var(--size-spacing-xl);
}

.info-section h2 {
  font-size: var(--font-size-xl);
  font-weight: var(--size-font-weight-semibold);
  margin: 0 0 var(--size-spacing-lg) 0;
  color: var(--color-text-primary);
  border-bottom: 2px solid var(--color-border-light);
  padding-bottom: var(--size-spacing-sm);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--size-spacing-lg);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-xs);
}

.info-item--inline {
  flex-direction: row;
  align-items: center;
  gap: var(--size-spacing-md);
}

.info-item--full {
  grid-column: 1 / -1;
}

.info-item .label {
  font-weight: var(--size-font-weight-medium);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  flex-shrink: 0;
}

.info-item .value {
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
  word-break: break-all;
}

.path-value-wrapper {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-sm);
  flex: 1;
  min-width: 0;
}

.path-value {
  flex: 1;
  min-width: 0;
  word-break: break-all;
}

.open-folder-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: var(--color-bg-component);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  outline: none;
}

.open-folder-btn:hover {
  background: var(--color-bg-component-hover);
  border-color: var(--theme-color-primary);
  color: var(--theme-color-primary);
}

.open-folder-btn:active {
  transform: scale(0.95);
}

.open-folder-btn:focus-visible {
  outline: 2px solid var(--theme-color-primary);
  outline-offset: 2px;
}

.description-value {
  line-height: 1.6;
  word-break: break-word;
}

.category-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: var(--size-radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--size-font-weight-semibold);
  white-space: nowrap;
}

.category-badge--project {
  background: rgba(59, 130, 246, 0.1);
  color: var(--theme-color-primary);
}

.category-badge--library {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
}

.category-badge--project-library {
  background: rgba(236, 72, 153, 0.1);
  color: #ec4899;
}

.category-badge--other {
  background: rgba(107, 114, 128, 0.1);
  color: var(--color-text-secondary);
}

.config-section {
  background: var(--color-bg-container);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-lg);
  padding: var(--size-spacing-xl);
  margin-bottom: var(--size-spacing-xl);
}

.config-section h2 {
  font-size: var(--font-size-xl);
  font-weight: var(--size-font-weight-semibold);
  margin: 0 0 var(--size-spacing-lg) 0;
  color: var(--color-text-primary);
  border-bottom: 2px solid var(--color-border-light);
  padding-bottom: var(--size-spacing-sm);
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--size-spacing-md);
}

.config-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  gap: var(--size-spacing-xs);
  padding: var(--size-spacing-lg);
  background: var(--color-bg-component);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--color-text-primary);
  text-align: left;
}

.config-card:hover {
  background: var(--color-bg-component-hover);
  border-color: var(--theme-color-primary);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.config-card:active {
  transform: translateY(0);
}

.config-card svg {
  color: var(--theme-color-primary);
  margin-bottom: var(--size-spacing-xs);
}

.config-card span:first-of-type {
  font-size: var(--font-size-base);
  font-weight: var(--size-font-weight-semibold);
  color: var(--color-text-primary);
}

.config-card .config-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: var(--size-font-weight-normal);
}
</style>


