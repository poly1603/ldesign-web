<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import { FolderIcon, AddIcon, DeleteIcon, SearchIcon, ArrowUpIcon, ArrowDownIcon } from 'tdesign-icons-vue-next'
import DirectoryTree from '@/components/DirectoryTree.vue'

enum ProjectType {
  PROJECT = 'project',
  LIBRARY = 'library',
  HYBRID = 'hybrid',
  STATIC = 'static',
}

interface Project {
  id: number
  name: string
  path: string
  description?: string
  version?: string
  type: ProjectType
  framework?: string
  createdAt: string
  updatedAt: string
}

interface ProjectInfo {
  name: string
  path: string
  description?: string
  version?: string
  type: ProjectType
  framework?: string
  hasPackageJson: boolean
  dependencies?: Record<string, string>
}

const API_BASE = 'http://localhost:7001/api/v1'
const router = useRouter()

const projects = ref<Project[]>([])
const loading = ref(false)
const importDialogVisible = ref(false)
const directoryDialogVisible = ref(false)
const editDialogVisible = ref(false)
const selectedPath = ref('')
const projectInfo = ref<ProjectInfo | null>(null)
const loadingInfo = ref(false)
const editingProject = ref<Project | null>(null)

// 搜索和过滤
const searchKeyword = ref('')
const selectedType = ref<ProjectType | 'all'>('all')
const sortBy = ref<'name' | 'updatedAt'>('updatedAt')
const sortOrder = ref<'asc' | 'desc'>('desc')

// 项目类型映射
const projectTypeMap = {
  [ProjectType.PROJECT]: { label: '项目', color: '#0052d9' },
  [ProjectType.LIBRARY]: { label: '库', color: '#00a870' },
  [ProjectType.HYBRID]: { label: '库+项目', color: '#e37318' },
  [ProjectType.STATIC]: { label: '静态项目', color: '#666' },
}

// 获取所有项目
const fetchProjects = async () => {
  loading.value = true
  try {
    const response = await fetch(`${API_BASE}/projects`)
    const result = await response.json()
    if (result.code === 200) {
      projects.value = result.data
    } else {
      throw new Error(result.message)
    }
  } catch (error) {
    MessagePlugin.error('获取项目列表失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 过滤和排序项目列表
const filteredProjects = computed(() => {
  let result = [...projects.value]

  // 搜索过滤
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(p => 
      p.name.toLowerCase().includes(keyword) ||
      p.path.toLowerCase().includes(keyword) ||
      p.description?.toLowerCase().includes(keyword)
    )
  }

  // 类型过滤
  if (selectedType.value !== 'all') {
    result = result.filter(p => p.type === selectedType.value)
  }

  // 排序
  result.sort((a, b) => {
    const aValue = sortBy.value === 'name' ? a.name : new Date(a.updatedAt).getTime()
    const bValue = sortBy.value === 'name' ? b.name : new Date(b.updatedAt).getTime()
    
    if (sortBy.value === 'name') {
      return sortOrder.value === 'asc' 
        ? (aValue as string).localeCompare(bValue as string)
        : (bValue as string).localeCompare(aValue as string)
    } else {
      return sortOrder.value === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number)
    }
  })

  return result
})

// 删除项目
const handleDelete = async (project: Project) => {
  const dialog = DialogPlugin.confirm({
    header: '确认删除',
    body: `确定要删除项目 "${project.name}" 吗？`,
    onConfirm: async () => {
      try {
        const response = await fetch(`${API_BASE}/projects/${project.id}`, {
          method: 'DELETE',
        })
        const result = await response.json()
        if (result.code === 200) {
          MessagePlugin.success('删除成功')
          fetchProjects()
        } else {
          throw new Error(result.message)
        }
      } catch (error) {
        MessagePlugin.error('删除失败')
        console.error(error)
      }
      dialog.destroy()
    },
  })
}

// 打开导入对话框
const handleImport = () => {
  importDialogVisible.value = true
  selectedPath.value = ''
  projectInfo.value = null
}

// 打开目录选择对话框
const openDirectoryDialog = () => {
  directoryDialogVisible.value = true
  selectedPath.value = ''
}

// 处理目录选择
const handleDirectorySelect = (path: string) => {
  selectedPath.value = path
}

// 确认选择目录
const confirmDirectory = () => {
  if (!selectedPath.value) {
    MessagePlugin.warning('请选择一个目录')
    return
  }
  directoryDialogVisible.value = false
  readProjectInfo()
}

// 读取项目信息
const readProjectInfo = async () => {
  if (!selectedPath.value) return
  
  loadingInfo.value = true
  try {
    const response = await fetch(`${API_BASE}/projects/read-info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: selectedPath.value }),
    })
    const result = await response.json()
    if (result.code === 200) {
      projectInfo.value = result.data
    } else {
      throw new Error(result.message)
    }
  } catch (error) {
    MessagePlugin.error('读取项目信息失败')
    console.error(error)
  } finally {
    loadingInfo.value = false
  }
}

// 打开编辑对话框
const handleEdit = (project: Project) => {
  editingProject.value = { ...project }
  editDialogVisible.value = true
}

// 确认编辑项目
const confirmEdit = async () => {
  if (!editingProject.value) return

  try {
    const response = await fetch(`${API_BASE}/projects/${editingProject.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingProject.value),
    })
    const result = await response.json()
    if (result.code === 200) {
      MessagePlugin.success('更新成功')
      editDialogVisible.value = false
      fetchProjects()
    } else {
      throw new Error(result.message)
    }
  } catch (error: any) {
    MessagePlugin.error(error.message || '更新失败')
    console.error(error)
  }
}

// 确认导入项目
const confirmImport = async () => {
  if (!selectedPath.value) {
    MessagePlugin.warning('请选择项目目录')
    return
  }

  try {
    const response = await fetch(`${API_BASE}/projects/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: selectedPath.value }),
    })
    const result = await response.json()
    if (result.code === 200) {
      MessagePlugin.success('导入成功')
      importDialogVisible.value = false
      fetchProjects()
    } else {
      throw new Error(result.message)
    }
  } catch (error: any) {
    MessagePlugin.error(error.message || '导入失败')
    console.error(error)
  }
}

// 查看项目详情
const viewDetail = (project: Project) => {
  const routeMap = {
    [ProjectType.PROJECT]: 'ProjectDetail',
    [ProjectType.LIBRARY]: 'LibraryDetail',
    [ProjectType.HYBRID]: 'HybridDetail',
    [ProjectType.STATIC]: 'StaticDetail',
  }
  router.push({ name: routeMap[project.type], params: { id: project.id } })
}

// 格式化日期
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

onMounted(() => {
  fetchProjects()
})
</script>

<template>
  <div class="project-page">
    <div class="page-header-fixed">
      <div class="toolbar">
        <!-- 筛选栏 -->
        <div class="filter-bar">
        <t-input
        v-model="searchKeyword"
        placeholder="搜索项目名称、路径或描述..."
        clearable
        class="search-input"
      >
        <template #prefix-icon>
          <search-icon />
        </template>
      </t-input>
      <t-select
        v-model="selectedType"
        placeholder="类型"
        class="filter-select"
      >
        <t-option value="all" label="全部" />
        <t-option :value="ProjectType.PROJECT" label="项目" />
        <t-option :value="ProjectType.LIBRARY" label="库" />
        <t-option :value="ProjectType.HYBRID" label="库+项目" />
        <t-option :value="ProjectType.STATIC" label="静态项目" />
      </t-select>
      <t-select
        v-model="sortBy"
        placeholder="排序"
        class="filter-select-compact"
      >
        <t-option value="updatedAt" label="更新时间" />
        <t-option value="name" label="名称" />
      </t-select>
      <t-button-group variant="outline">
        <t-button 
          :theme="sortOrder === 'desc' ? 'primary' : 'default'"
          @click="sortOrder = 'desc'"
        >
          <template #icon><ArrowDownIcon /></template>
        </t-button>
        <t-button 
          :theme="sortOrder === 'asc' ? 'primary' : 'default'"
          @click="sortOrder = 'asc'"
        >
          <template #icon><ArrowUpIcon /></template>
        </t-button>
      </t-button-group>
        </div>
        <t-button theme="primary" @click="handleImport">
          <template #icon><FolderIcon /></template>
          导入项目
        </t-button>
      </div>
    </div>

    <div class="page-content">
      <div v-if="loading" class="loading-container">
        <t-loading text="加载中..." />
      </div>

      <div v-else-if="filteredProjects.length === 0" class="empty-container">
        <t-empty :description="projects.length === 0 ? '暂无项目，点击\'\\u5bfc入项目\'\u5f00始' : '没有找到匹配的项目'" />
      </div>

      <div v-else class="projects-grid">
      <t-card
        v-for="project in filteredProjects"
        :key="project.id"
        class="project-card"
        :bordered="false"
        hover
      >
        <div class="card-header">
          <div class="project-name" @click="viewDetail(project)" style="cursor: pointer;">
            {{ project.name }}
          </div>
          <t-space>
            <t-button theme="default" variant="text" size="small" @click="handleEdit(project)">
              编辑
            </t-button>
            <t-button theme="danger" variant="text" size="small" @click="handleDelete(project)">
              删除
            </t-button>
          </t-space>
        </div>

        <div class="card-body" @click="viewDetail(project)" style="cursor: pointer;">
          <div class="info-item">
            <span class="label">路径：</span>
            <span class="value path">{{ project.path }}</span>
          </div>
          <div v-if="project.description" class="info-item">
            <span class="label">描述：</span>
            <span class="value">{{ project.description }}</span>
          </div>
          <div class="info-item">
            <span class="label">版本：</span>
            <span class="value">{{ project.version || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="label">类型：</span>
            <t-tag :theme="projectTypeMap[project.type].color === '#0052d9' ? 'primary' : 'default'">
              {{ projectTypeMap[project.type].label }}
            </t-tag>
          </div>
          <div v-if="project.framework" class="info-item">
            <span class="label">框架：</span>
            <t-tag theme="success" variant="light">{{ project.framework }}</t-tag>
          </div>
          <div class="info-item">
            <span class="label">更新时间：</span>
            <span class="value time">{{ formatDate(project.updatedAt) }}</span>
          </div>
        </div>
      </t-card>
      </div>
    </div>
  </div>

  <!-- 导入项目对话框 -->
  <t-dialog
      v-model:visible="importDialogVisible"
      header="导入项目"
      width="600px"
      placement="center"
      :confirm-btn="{ content: '确认导入', theme: 'primary' }"
      @confirm="confirmImport"
    >
      <div class="import-dialog-content">
        <t-form label-width="80px">
          <t-form-item label="项目目录">
            <t-input
              v-model="selectedPath"
              placeholder="请选择项目目录"
              readonly
            >
              <template #suffix>
                <t-button size="small" @click="openDirectoryDialog">
                  选择目录
                </t-button>
              </template>
            </t-input>
          </t-form-item>
        </t-form>

        <div v-if="loadingInfo" class="info-loading">
          <t-loading text="读取项目信息中..." />
        </div>

        <div v-else-if="projectInfo" class="project-info">
          <t-divider>项目信息预览</t-divider>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">项目名称：</span>
              <span class="value">{{ projectInfo.name }}</span>
            </div>
            <div class="info-item">
              <span class="label">版本：</span>
              <span class="value">{{ projectInfo.version || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">类型：</span>
              <t-tag>{{ projectTypeMap[projectInfo.type].label }}</t-tag>
            </div>
            <div v-if="projectInfo.framework" class="info-item">
              <span class="label">框架：</span>
              <t-tag theme="success" variant="light">{{ projectInfo.framework }}</t-tag>
            </div>
            <div v-if="projectInfo.description" class="info-item full-width">
              <span class="label">描述：</span>
              <span class="value">{{ projectInfo.description }}</span>
            </div>
            <div class="info-item">
              <span class="label">package.json：</span>
              <t-tag :theme="projectInfo.hasPackageJson ? 'success' : 'default'">
                {{ projectInfo.hasPackageJson ? '存在' : '不存在' }}
              </t-tag>
            </div>
          </div>
        </div>
      </div>
  </t-dialog>

  <!-- 目录选择对话框 -->
  <t-dialog
      v-model:visible="directoryDialogVisible"
      header="选择项目目录"
      width="700px"
      placement="center"
      :footer="true"
      @confirm="confirmDirectory"
    >
      <div class="directory-dialog">
        <div v-if="selectedPath" class="selected-path">
          <span class="label">当前选择：</span>
          <span class="path">{{ selectedPath }}</span>
        </div>
        <DirectoryTree :apiBase="API_BASE" @select="handleDirectorySelect" />
      </div>
  </t-dialog>

  <!-- 编辑项目对话框 -->
  <t-dialog
      v-model:visible="editDialogVisible"
      header="编辑项目"
      width="600px"
      placement="center"
      :confirm-btn="{ content: '保存', theme: 'primary' }"
      @confirm="confirmEdit"
    >
      <div v-if="editingProject" class="edit-dialog-content">
        <t-form label-width="100px">
          <t-form-item label="项目名称">
            <t-input v-model="editingProject.name" placeholder="请输入项目名称" />
          </t-form-item>
          <t-form-item label="项目路径">
            <t-input v-model="editingProject.path" placeholder="项目路径" readonly />
          </t-form-item>
          <t-form-item label="项目描述">
            <t-textarea
              v-model="editingProject.description"
              placeholder="请输入项目描述"
              :autosize="{ minRows: 2, maxRows: 4 }"
            />
          </t-form-item>
          <t-form-item label="版本号">
            <t-input v-model="editingProject.version" placeholder="请输入版本号" />
          </t-form-item>
          <t-form-item label="项目类型">
            <t-select v-model="editingProject.type" placeholder="选择项目类型">
              <t-option :value="ProjectType.PROJECT" label="项目" />
              <t-option :value="ProjectType.LIBRARY" label="库" />
              <t-option :value="ProjectType.HYBRID" label="库+项目" />
              <t-option :value="ProjectType.STATIC" label="静态项目" />
            </t-select>
          </t-form-item>
          <t-form-item label="框架">
            <t-input v-model="editingProject.framework" placeholder="请输入框架名称" />
          </t-form-item>
        </t-form>
      </div>
  </t-dialog>
</template>

<style scoped>
.project-page {
  min-height: 100%;
}

.page-header-fixed {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #f5f5f5;
  border-bottom: 1px solid #e7e7e7;
  margin: 0;
  padding: 0;
}

.toolbar {
  max-width: 1400px;
  margin: 0 auto;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.page-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px 24px 24px;
}

.filter-bar {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  flex: 1;
}

.search-input {
  flex: 1;
  min-width: 180px;
  max-width: 350px;
}

.filter-select {
  min-width: 120px;
  width: 140px;
}

.filter-select-compact {
  min-width: 100px;
  width: 120px;
}

.loading-container,
.empty-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  min-height: 400px;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.project-card {
  transition: all 0.3s;
}

.project-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 12px;
  min-width: 0;
}

.project-name {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.info-item .label {
  color: #666;
  font-weight: 500;
  min-width: 80px;
}

.info-item .value {
  color: #333;
  flex: 1;
}

.info-item .value.path {
  font-size: 12px;
  color: #666;
  word-break: break-all;
  overflow-wrap: break-word;
}

.info-item .value.time {
  font-size: 12px;
  color: #999;
}

.import-dialog-content {
  padding: 16px 0;
}

.info-loading {
  display: flex;
  justify-content: center;
  padding: 40px 0;
}

.project-info {
  margin-top: 16px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.info-grid .info-item.full-width {
  grid-column: 1 / -1;
}

.directory-dialog {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.selected-path {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
  font-size: 14px;
}

.selected-path .label {
  color: #666;
  font-weight: 500;
}

.selected-path .path {
  flex: 1;
  color: #0052d9;
  word-break: break-all;
}
</style>
