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
      <!-- 快捷功能入口 -->
      <div class="actions-section">
        <h2>快捷功能</h2>
        <div class="actions-grid">
          <!-- 项目类型：显示启动、打包、预览、部署 -->
          <template v-if="isProject">
            <button class="action-card" @click="navigateToAction('dev')">
              <Play :size="24" />
              <span>启动</span>
            </button>
            <button class="action-card" @click="navigateToAction('build')">
              <Package :size="24" />
              <span>打包</span>
            </button>
            <button class="action-card" @click="navigateToAction('preview')">
              <Eye :size="24" />
              <span>预览</span>
            </button>
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

      <div class="info-section">
        <h2>基本信息</h2>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">项目名称:</span>
            <span class="value">{{ project.name }}</span>
          </div>
          <div class="info-item">
            <span class="label">项目路径:</span>
            <span class="value">{{ project.path }}</span>
          </div>
          <div v-if="project.description" class="info-item">
            <span class="label">项目描述:</span>
            <span class="value">{{ project.description }}</span>
          </div>
          <div v-if="project.category" class="info-item">
            <span class="label">项目类别:</span>
            <span class="value">{{ getCategoryLabel(project.category) }}</span>
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
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Play, Package, Eye, Rocket, Upload } from 'lucide-vue-next'
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
  router.push(`/projects/${id}/${action}`)
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

.info-item .label {
  font-weight: var(--size-font-weight-medium);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.info-item .value {
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
  word-break: break-all;
}
</style>


