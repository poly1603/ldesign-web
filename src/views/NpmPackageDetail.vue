<template>
  <div class="npm-package-detail-page">
    <div class="page-header">
      <button class="btn-back" @click="goBack">
        <ArrowLeft :size="20" />
        返回
      </button>
      <h1>{{ packageName || '包详情' }}</h1>
    </div>

    <!-- 骨架屏：加载中 -->
    <div v-if="loading && !packageInfo" class="skeleton-container">
      <Skeleton variant="card" :lines="5" />
    </div>

    <div v-else-if="error" class="error-message">{{ error }}</div>
    <div v-else-if="!packageInfo" class="error-message">包不存在</div>
    <div v-else class="detail-content">
      <!-- 包基本信息 -->
      <div class="info-section">
        <div class="package-header-info">
          <div class="package-title">
            <h2 class="package-name-large">{{ packageInfo.name }}</h2>
            <span class="package-version-badge">v{{ packageInfo.latestVersion }}</span>
          </div>
          <div v-if="packageInfo.description" class="package-description-large">
            {{ packageInfo.description }}
          </div>
        </div>

        <div class="info-grid">
          <div v-if="packageInfo.author" class="info-item">
            <span class="info-label">作者:</span>
            <span class="info-value">
              {{ typeof packageInfo.author === 'string' ? packageInfo.author : packageInfo.author.name }}
            </span>
          </div>
          <div v-if="packageInfo.license" class="info-item">
            <span class="info-label">许可证:</span>
            <span class="info-value">{{ typeof packageInfo.license === 'string' ? packageInfo.license : packageInfo.license.type }}</span>
          </div>
          <div v-if="packageInfo.homepage" class="info-item">
            <span class="info-label">主页:</span>
            <a :href="packageInfo.homepage" target="_blank" class="info-link">{{ packageInfo.homepage }}</a>
          </div>
          <div v-if="packageInfo.repository" class="info-item">
            <span class="info-label">仓库:</span>
            <a 
              :href="getRepositoryUrl(packageInfo.repository)" 
              target="_blank" 
              class="info-link"
            >
              {{ getRepositoryUrl(packageInfo.repository) }}
            </a>
          </div>
        </div>

        <div v-if="packageInfo.keywords && packageInfo.keywords.length > 0" class="keywords-section">
          <span class="keywords-label">标签:</span>
          <div class="keywords-list">
            <span v-for="keyword in packageInfo.keywords" :key="keyword" class="keyword-tag">
              {{ keyword }}
            </span>
          </div>
        </div>
      </div>

      <!-- 版本信息 -->
      <div class="versions-section">
        <h2>版本历史</h2>
        <div v-if="versionsLoading" class="versions-skeleton">
          <Skeleton variant="list" :lines="5" />
        </div>
        <div v-else-if="packageInfo.versions && packageInfo.versions.length > 0" class="versions-list">
          <div
            v-for="version in packageInfo.versions"
            :key="version"
            class="version-item"
            :class="{ 'version-item--latest': version === packageInfo.latestVersion }"
          >
            <div class="version-info">
              <span class="version-number">{{ version }}</span>
              <span v-if="version === packageInfo.latestVersion" class="version-badge">最新</span>
            </div>
            <span v-if="packageInfo.time && packageInfo.time[version]" class="version-time">
              {{ formatTime(packageInfo.time[version]) }}
            </span>
          </div>
        </div>
        <div v-else class="empty-state">
          <p>暂无版本信息</p>
        </div>
      </div>

      <!-- 依赖信息 -->
      <div v-if="hasDependencies" class="dependencies-section">
        <h2>依赖信息</h2>
        <div class="dependencies-tabs">
          <button
            v-for="tab in dependencyTabs"
            :key="tab.key"
            class="tab-btn"
            :class="{ 'tab-btn--active': activeTab === tab.key }"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
            <span v-if="tab.count > 0" class="tab-count">({{ tab.count }})</span>
          </button>
        </div>

        <div class="dependencies-content">
          <div v-if="getCurrentDependencies().length === 0" class="empty-state">
            <p>暂无{{ getCurrentTabLabel() }}依赖</p>
          </div>
          <div v-else class="dependencies-list">
            <div
              v-for="[name, version] in Object.entries(getCurrentDependencies())"
              :key="name"
              class="dependency-item"
            >
              <span class="dependency-name">{{ name }}</span>
              <span class="dependency-version">{{ version }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- README -->
      <div v-if="packageInfo.readme" class="readme-section">
        <h2>README</h2>
        <div class="readme-content" v-html="formatReadme(packageInfo.readme)"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import { npmApi } from '../api/services'
import Skeleton from '../components/common/Skeleton.vue'
import { message } from '../utils/message'

interface PackageInfo {
  name: string
  description?: string
  latestVersion: string
  versions: string[]
  author?: string | { name: string; email?: string; url?: string }
  license?: string | { type: string }
  homepage?: string
  repository?: string | { type: string; url: string }
  keywords?: string[]
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  readme?: string
  time?: Record<string, string>
  maintainers?: any[]
  distTags?: Record<string, string>
}

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const error = ref<string | null>(null)
const packageInfo = ref<PackageInfo | null>(null)
const versionsLoading = ref(false)
const activeTab = ref<'dependencies' | 'devDependencies' | 'peerDependencies'>('dependencies')

const packageName = computed(() => {
  return route.params.packageName as string
})

const registryId = computed(() => {
  return route.params.id as string
})

const dependencyTabs = computed(() => {
  return [
    {
      key: 'dependencies' as const,
      label: '生产依赖',
      count: packageInfo.value?.dependencies ? Object.keys(packageInfo.value.dependencies).length : 0,
    },
    {
      key: 'devDependencies' as const,
      label: '开发依赖',
      count: packageInfo.value?.devDependencies ? Object.keys(packageInfo.value.devDependencies).length : 0,
    },
    {
      key: 'peerDependencies' as const,
      label: '对等依赖',
      count: packageInfo.value?.peerDependencies ? Object.keys(packageInfo.value.peerDependencies).length : 0,
    },
  ]
})

const hasDependencies = computed(() => {
  return (
    (packageInfo.value?.dependencies && Object.keys(packageInfo.value.dependencies).length > 0) ||
    (packageInfo.value?.devDependencies && Object.keys(packageInfo.value.devDependencies).length > 0) ||
    (packageInfo.value?.peerDependencies && Object.keys(packageInfo.value.peerDependencies).length > 0)
  )
})

async function loadPackageDetail() {
  const id = registryId.value
  const name = decodeURIComponent(packageName.value)
  
  if (!id || !name) {
    error.value = '参数错误'
    return
  }

  loading.value = true
  error.value = null

  try {
    console.log('[NPM Package Detail] 开始加载包详情，ID:', id, '包名:', name)
    const response = await npmApi.getPackageDetail(id, name)
    console.log('[NPM Package Detail] 包详情响应:', response)
    
    if (response.success && response.data) {
      packageInfo.value = response.data
      console.log('[NPM Package Detail] 包详情加载成功')
    } else {
      error.value = response.message || '加载包详情失败'
      console.error('[NPM Package Detail] 加载失败:', error.value)
    }
  } catch (err: any) {
    error.value = err.message || '加载包详情失败'
    console.error('[NPM Package Detail] 加载异常:', err)
  } finally {
    loading.value = false
  }
}

function getRepositoryUrl(repo: string | { type: string; url: string }): string {
  if (typeof repo === 'string') {
    return repo
  }
  return repo.url.replace(/^git\+/, '').replace(/\.git$/, '')
}

function getCurrentDependencies(): Record<string, string> {
  if (!packageInfo.value) return {}
  
  switch (activeTab.value) {
    case 'dependencies':
      return packageInfo.value.dependencies || {}
    case 'devDependencies':
      return packageInfo.value.devDependencies || {}
    case 'peerDependencies':
      return packageInfo.value.peerDependencies || {}
    default:
      return {}
  }
}

function getCurrentTabLabel(): string {
  const tab = dependencyTabs.value.find(t => t.key === activeTab.value)
  return tab?.label || '依赖'
}

function formatTime(time: string): string {
  if (!time) return ''
  const date = new Date(time)
  return date.toLocaleString('zh-CN')
}

function formatReadme(readme: string): string {
  if (!readme) return ''
  
  // 参考 PackageConfigDoc.vue 的 Markdown 渲染逻辑
  let html = readme
  
  // 标题
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>')
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>')
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>')
  
  // 代码块
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
  
  // 行内代码
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  
  // 粗体和斜体
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  
  // 链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
  
  // 列表
  html = html.replace(/^\* (.+)$/gim, '<li>$1</li>')
  html = html.replace(/^- (.+)$/gim, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
  
  // 换行
  html = html.replace(/\n\n/g, '</p><p>')
  html = html.replace(/\n/g, '<br>')
  
  // 包装段落
  html = `<p>${html}</p>`
  
  return html
}

function goBack() {
  router.push(`/npm/${registryId.value}`)
}

onMounted(() => {
  loadPackageDetail()
})
</script>

<style scoped>
.npm-package-detail-page {
  padding: var(--size-spacing-xl);
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-md);
  margin-bottom: var(--size-spacing-xl);
}

.btn-back {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-xs);
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  background: var(--color-bg-component);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-back:hover {
  background: var(--color-bg-component-hover);
  border-color: var(--theme-color-primary);
  color: var(--theme-color-primary);
}

.page-header h1 {
  font-size: var(--font-size-2xl);
  font-weight: var(--size-font-weight-semibold);
  margin: 0;
  color: var(--color-text-primary);
}

.skeleton-container {
  padding: var(--size-spacing-xl);
}

.error-message {
  text-align: center;
  padding: var(--size-spacing-xl);
  color: var(--color-danger-default);
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-xl);
}

.info-section,
.versions-section,
.dependencies-section,
.readme-section {
  background: var(--color-bg-container);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-lg);
  padding: var(--size-spacing-lg);
}

.info-section h2,
.versions-section h2,
.dependencies-section h2,
.readme-section h2 {
  font-size: var(--font-size-lg);
  font-weight: var(--size-font-weight-semibold);
  margin: 0 0 var(--size-spacing-lg) 0;
  color: var(--color-text-primary);
}

.package-header-info {
  margin-bottom: var(--size-spacing-lg);
}

.package-title {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-md);
  margin-bottom: var(--size-spacing-md);
}

.package-name-large {
  font-size: var(--font-size-2xl);
  font-weight: var(--size-font-weight-bold);
  margin: 0;
  color: var(--theme-color-primary);
}

.package-version-badge {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  background: var(--color-bg-component);
  padding: 4px 12px;
  border-radius: var(--size-radius-md);
}

.package-description-large {
  font-size: var(--font-size-lg);
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--size-spacing-md);
  margin-bottom: var(--size-spacing-md);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-xs);
}

.info-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: var(--size-font-weight-medium);
}

.info-value {
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
}

.info-link {
  font-size: var(--font-size-base);
  color: var(--theme-color-primary);
  text-decoration: none;
  word-break: break-all;
}

.info-link:hover {
  text-decoration: underline;
}

.keywords-section {
  display: flex;
  align-items: flex-start;
  gap: var(--size-spacing-md);
  padding-top: var(--size-spacing-md);
  border-top: 1px solid var(--color-border-light);
}

.keywords-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: var(--size-font-weight-medium);
  flex-shrink: 0;
}

.keywords-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-spacing-xs);
}

.keyword-tag {
  font-size: var(--font-size-xs);
  color: var(--theme-color-primary);
  background: var(--theme-color-primary-light);
  padding: 2px 8px;
  border-radius: var(--size-radius-sm);
}

.versions-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-md);
}

.versions-list {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-sm);
}

.version-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  background: var(--color-bg-component);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  transition: all 0.2s ease;
}

.version-item--latest {
  border-color: var(--theme-color-primary);
  background: var(--theme-color-primary-light);
}

.version-info {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-sm);
}

.version-number {
  font-size: var(--font-size-base);
  font-weight: var(--size-font-weight-semibold);
  color: var(--color-text-primary);
}

.version-badge {
  font-size: var(--font-size-xs);
  color: var(--theme-color-primary);
  background: var(--color-bg-container);
  padding: 2px 6px;
  border-radius: var(--size-radius-sm);
}

.version-time {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.dependencies-tabs {
  display: flex;
  gap: var(--size-spacing-sm);
  margin-bottom: var(--size-spacing-lg);
  border-bottom: 1px solid var(--color-border-light);
}

.tab-btn {
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: var(--font-size-base);
  display: flex;
  align-items: center;
  gap: var(--size-spacing-xs);
}

.tab-btn:hover {
  color: var(--theme-color-primary);
}

.tab-btn--active {
  color: var(--theme-color-primary);
  border-bottom-color: var(--theme-color-primary);
}

.tab-count {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.dependencies-content {
  min-height: 100px;
}

.dependencies-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--size-spacing-sm);
}

.dependency-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  background: var(--color-bg-component);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
}

.dependency-name {
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  font-weight: var(--size-font-weight-medium);
}

.dependency-version {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-family: monospace;
}

.readme-content {
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  line-height: 1.8;
  word-break: break-word;
}

.readme-content :deep(h1) {
  font-size: var(--font-size-2xl);
  font-weight: var(--size-font-weight-bold);
  margin: var(--size-spacing-lg) 0 var(--size-spacing-md) 0;
  color: var(--color-text-primary);
  border-bottom: 2px solid var(--color-border-light);
  padding-bottom: var(--size-spacing-sm);
}

.readme-content :deep(h2) {
  font-size: var(--font-size-xl);
  font-weight: var(--size-font-weight-semibold);
  margin: var(--size-spacing-lg) 0 var(--size-spacing-md) 0;
  color: var(--color-text-primary);
}

.readme-content :deep(h3) {
  font-size: var(--font-size-lg);
  font-weight: var(--size-font-weight-semibold);
  margin: var(--size-spacing-md) 0 var(--size-spacing-sm) 0;
  color: var(--color-text-primary);
}

.readme-content :deep(p) {
  margin: var(--size-spacing-md) 0;
}

.readme-content :deep(ul),
.readme-content :deep(ol) {
  margin: var(--size-spacing-md) 0;
  padding-left: var(--size-spacing-xl);
}

.readme-content :deep(li) {
  margin: var(--size-spacing-xs) 0;
}

.readme-content :deep(pre) {
  background: var(--color-bg-component);
  padding: var(--size-spacing-md);
  border-radius: var(--size-radius-md);
  overflow-x: auto;
  margin: var(--size-spacing-md) 0;
  border: 1px solid var(--color-border-light);
}

.readme-content :deep(code) {
  background: var(--color-bg-component);
  padding: 2px 6px;
  border-radius: var(--size-radius-sm);
  font-family: monospace;
  font-size: var(--font-size-sm);
  border: 1px solid var(--color-border-light);
}

.readme-content :deep(pre code) {
  background: transparent;
  padding: 0;
  border: none;
}

.readme-content :deep(a) {
  color: var(--theme-color-primary);
  text-decoration: none;
}

.readme-content :deep(a:hover) {
  text-decoration: underline;
}

.readme-content :deep(blockquote) {
  border-left: 4px solid var(--theme-color-primary);
  padding-left: var(--size-spacing-md);
  margin: var(--size-spacing-md) 0;
  color: var(--color-text-secondary);
  font-style: italic;
}

.empty-state {
  text-align: center;
  padding: var(--size-spacing-xl);
  color: var(--color-text-secondary);
}
</style>

