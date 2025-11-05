<template>
  <div class="projects-page">
    <div class="page-header">
      <h1>项目管理</h1>
      <div class="header-actions">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索项目..."
          class="search-input"
          @input="handleSearch"
        />
        <select v-model="categoryFilter" class="filter-select" @change="loadProjects">
          <option value="">所有类别</option>
          <option value="project">项目</option>
          <option value="library">库</option>
          <option value="project-library">项目+库</option>
          <option value="other">其他</option>
        </select>
        <select v-model="sortBy" class="filter-select" @change="loadProjects">
          <option value="lastOpenedAt">最近打开</option>
          <option value="name">名称</option>
          <option value="createdAt">创建时间</option>
          <option value="updatedAt">更新时间</option>
        </select>
        <button class="import-btn" @click="showImportDialog = true">
          <FolderPlus :size="18" />
          导入项目
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error-message">{{ error }}</div>
    <div v-else-if="projects.length === 0" class="empty-state">
      <FolderOpen :size="48" />
      <p>暂无项目</p>
      <button class="import-btn" @click="showImportDialog = true">导入第一个项目</button>
    </div>
    <div v-else class="projects-grid">
      <div
        v-for="project in projects"
        :key="project.id"
        class="project-card"
        @click="openProject(project)"
      >
        <div class="project-header">
          <div class="project-icon">
            <Folder v-if="project.type === 'web' || !project.category" :size="24" />
            <Box v-else-if="project.category === 'library'" :size="24" />
            <Code v-else-if="project.type === 'api'" :size="24" />
            <Globe v-else :size="24" />
          </div>
          <div class="project-title">
            <h3>{{ project.name }}</h3>
            <span class="project-path">{{ project.path }}</span>
          </div>
          <div class="project-actions">
            <button class="action-btn" @click.stop="editProject(project)" title="编辑">
              <Edit :size="16" />
            </button>
            <button class="action-btn danger" @click.stop="deleteProject(project)" title="删除">
              <Trash2 :size="16" />
            </button>
          </div>
        </div>
        <div v-if="project.description" class="project-description">
          {{ project.description }}
        </div>
        <div class="project-info">
          <span v-if="project.category" class="info-badge category" :class="project.category">
            {{ getCategoryLabel(project.category) }}
          </span>
          <span v-if="project.framework" class="info-badge framework">
            {{ project.framework }}{{ project.frameworkVersion ? ` ${project.frameworkVersion}` : '' }}
          </span>
          <span v-if="project.isTypeScript" class="info-badge typescript">TypeScript</span>
          <span v-if="project.packageManager" class="info-badge package-manager">
            {{ project.packageManager }}
          </span>
        </div>
        <div class="project-footer">
          <span class="project-date">最后打开: {{ formatDate(project.lastOpenedAt) }}</span>
        </div>
      </div>
    </div>

    <ImportProjectDialog v-model:visible="showImportDialog" @imported="handleProjectImported" />
    <EditProjectDialog v-model:visible="showEditDialog" :project="editingProject" @updated="handleProjectUpdated" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { FolderPlus, FolderOpen, Edit, Trash2, Folder, Code, Globe, Box } from 'lucide-vue-next'
import { projectApi } from '../api/services'
import ImportProjectDialog from '../components/ImportProjectDialog.vue'
import EditProjectDialog from '../components/EditProjectDialog.vue'

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

const router = useRouter()
const loading = ref(false)
const error = ref<string | null>(null)
const projects = ref<Project[]>([])
const searchQuery = ref('')
const categoryFilter = ref('')
const sortBy = ref<'name' | 'createdAt' | 'updatedAt' | 'lastOpenedAt'>('lastOpenedAt')
const showImportDialog = ref(false)
const showEditDialog = ref(false)
const editingProject = ref<Project | null>(null)

let searchTimeout: ReturnType<typeof setTimeout> | null = null

async function loadProjects() {
  loading.value = true
  error.value = null
  try {
    const response = await projectApi.getAll({
      search: searchQuery.value || undefined,
      category: categoryFilter.value || undefined,
      sortBy: sortBy.value,
      sortOrder: 'DESC',
    })
    if (response.success) {
      projects.value = response.data || []
    } else {
      throw new Error(response.message || '获取项目列表失败')
    }
  } catch (e: any) {
    console.error('加载项目列表失败:', e)
    error.value = e.message || '加载项目列表失败'
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  searchTimeout = setTimeout(() => {
    loadProjects()
  }, 300)
}

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

function formatDate(timestamp?: number): string {
  if (!timestamp) return '从未打开'
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN')
}

function openProject(project: Project) {
  projectApi.open(project.id).catch(console.error)
  router.push(`/projects/${project.id}`)
}

function editProject(project: Project) {
  editingProject.value = project
  showEditDialog.value = true
}

async function deleteProject(project: Project) {
  if (!confirm(`确定要删除项目 "${project.name}" 吗？`)) {
    return
  }
  try {
    const response = await projectApi.delete(project.id)
    if (response.success) {
      await loadProjects()
    } else {
      throw new Error(response.message || '删除项目失败')
    }
  } catch (e: any) {
    alert(e.message || '删除项目失败')
  }
}

function handleProjectImported() {
  showImportDialog.value = false
  loadProjects()
}

function handleProjectUpdated() {
  showEditDialog.value = false
  editingProject.value = null
  loadProjects()
}

onMounted(() => {
  loadProjects()
})
</script>

<style scoped>
.projects-page {
  padding: var(--content-padding);
  background: var(--content-bg);
  color: var(--color-text-primary);
  min-height: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--size-spacing-xl);
  flex-wrap: wrap;
  gap: var(--size-spacing-md);
}

.page-header h1 {
  font-size: var(--font-size-2xl);
  font-weight: var(--size-font-weight-semibold);
  margin: 0;
  color: var(--color-text-primary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-md);
  flex-wrap: wrap;
}

.search-input {
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  background: var(--color-bg-container);
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
  min-width: 200px;
  transition: border-color 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--theme-color-primary);
}

.filter-select {
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  background: var(--color-bg-container);
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.filter-select:focus {
  outline: none;
  border-color: var(--theme-color-primary);
}

.import-btn {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-xs);
  padding: var(--size-spacing-sm) var(--size-spacing-lg);
  background: var(--theme-color-primary);
  color: var(--color-text-inverse);
  border: none;
  border-radius: var(--size-radius-md);
  cursor: pointer;
  font-size: var(--font-size-base);
  transition: background-color 0.2s ease;
}

.import-btn:hover {
  background: var(--theme-color-primary-hover);
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
  margin-bottom: var(--size-spacing-xl);
}

.empty-state {
  text-align: center;
  padding: var(--size-spacing-3xl);
  color: var(--color-text-secondary);
}

.empty-state svg {
  margin-bottom: var(--size-spacing-lg);
  opacity: 0.5;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: var(--size-spacing-xl);
}

.project-card {
  background: var(--color-bg-container);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-lg);
  padding: var(--size-spacing-xl);
  cursor: pointer;
  transition: all 0.2s ease;
}

.project-card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--theme-color-primary);
  transform: translateY(-2px);
}

.project-header {
  display: flex;
  align-items: flex-start;
  gap: var(--size-spacing-md);
  margin-bottom: var(--size-spacing-md);
}

.project-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--size-radius-md);
  background: var(--theme-color-primary-light);
  color: var(--theme-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.project-title {
  flex: 1;
  min-width: 0;
}

.project-title h3 {
  margin: 0 0 var(--size-spacing-xs) 0;
  font-size: var(--font-size-lg);
  font-weight: var(--size-font-weight-semibold);
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-path {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.project-actions {
  display: flex;
  gap: var(--size-spacing-xs);
  flex-shrink: 0;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--size-radius-md);
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: var(--color-bg-component-hover);
  color: var(--color-text-primary);
}

.action-btn.danger:hover {
  background: var(--color-danger-light);
  color: var(--color-danger-default);
}

.project-description {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--size-spacing-md);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project-info {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-spacing-xs);
  margin-bottom: var(--size-spacing-md);
}

.info-badge {
  padding: 2px var(--size-spacing-sm);
  border-radius: var(--size-radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--size-font-weight-medium);
}

.info-badge.category.project {
  background: var(--color-success-light);
  color: var(--color-success-default);
}

.info-badge.category.library {
  background: var(--color-primary-light);
  color: var(--color-primary-default);
}

.info-badge.category.project-library {
  background: var(--color-warning-light);
  color: var(--color-warning-default);
}

.info-badge.framework {
  background: var(--color-primary-light);
  color: var(--color-primary-default);
}

.info-badge.typescript {
  background: var(--color-primary-light);
  color: var(--color-primary-default);
}

.info-badge.package-manager {
  background: var(--color-gray-100);
  color: var(--color-gray-700);
}

.project-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--size-spacing-md);
  border-top: 1px solid var(--color-border-light);
}

.project-date {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
</style>

