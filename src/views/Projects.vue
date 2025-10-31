<template>
  <div class="projects-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <h1>项目管理</h1>
      <n-space>
        <n-button type="primary" @click="showImportDialog = true">
          <template #icon>
            <n-icon><FolderAddOutlined /></n-icon>
          </template>
          导入项目
        </n-button>
        <n-button @click="loadProjects">
          <template #icon>
            <n-icon><ReloadOutlined /></n-icon>
          </template>
          刷新
        </n-button>
      </n-space>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <n-input
        v-model:value="keyword"
        placeholder="搜索项目名称或路径..."
        clearable
        @input="handleSearch"
      >
        <template #prefix>
          <n-icon><SearchOutlined /></n-icon>
        </template>
      </n-input>
    </div>

    <!-- 项目列表 -->
    <n-spin :show="loading">
      <div v-if="projects.length > 0" class="projects-grid">
        <ProjectCard
          v-for="project in projects"
          :key="project.id"
          :project="project"
          @click="handleProjectClick"
          @delete="handleDelete"
          @open="handleOpen"
          @analyze="handleAnalyze"
        />
      </div>

      <n-empty
        v-else
        description="暂无项目"
        style="margin-top: 100px"
      >
        <template #extra>
          <n-button type="primary" @click="showImportDialog = true">
            导入第一个项目
          </n-button>
        </template>
      </n-empty>
    </n-spin>

    <!-- 导入项目对话框 -->
    <n-modal v-model:show="showImportDialog">
      <n-card
        title="导入项目"
        :bordered="false"
        style="width: 600px"
        role="dialog"
        aria-modal="true"
      >
        <n-form ref="importFormRef" :model="importForm" :rules="importRules">
          <n-form-item label="项目路径" path="path">
            <n-input
              v-model:value="importForm.path"
              placeholder="请输入项目的绝对路径，例如: D:\projects\my-app"
              clearable
            />
          </n-form-item>
          <n-form-item label="自动检测">
            <n-switch v-model:value="importForm.detect" />
            <n-text depth="3" style="margin-left: 12px; font-size: 12px">
              自动检测项目类型、框架和包管理器
            </n-text>
          </n-form-item>
        </n-form>

        <template #footer>
          <n-space justify="end">
            <n-button @click="showImportDialog = false">取消</n-button>
            <n-button type="primary" @click="handleImport" :loading="importing">
              导入
            </n-button>
          </n-space>
        </template>
      </n-card>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  NCard,
  NSpace,
  NButton,
  NSpin,
  NEmpty,
  NModal,
  NForm,
  NFormItem,
  NInput,
  NSwitch,
  NText,
  NIcon,
  useMessage,
  useDialog,
  type FormInst,
  type FormRules,
} from 'naive-ui'
import {
  FolderAddOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@vicons/antd'
import ProjectCard from '../components/ProjectCard.vue'
import { projectsApi, type Project } from '../api/projects'

const router = useRouter()
const message = useMessage()
const dialog = useDialog()

// 状态
const loading = ref(false)
const importing = ref(false)
const projects = ref<Project[]>([])
const keyword = ref('')
const showImportDialog = ref(false)

// 导入表单
const importFormRef = ref<FormInst | null>(null)
const importForm = ref({
  path: '',
  detect: true,
})

const importRules: FormRules = {
  path: [
    {
      required: true,
      message: '请输入项目路径',
      trigger: 'blur',
    },
  ],
}

// 加载项目列表
const loadProjects = async () => {
  loading.value = true
  try {
    projects.value = await projectsApi.getAll({ keyword: keyword.value })
  } catch (error: any) {
    message.error(error.message || '加载项目列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
let searchTimer: NodeJS.Timeout | null = null
const handleSearch = () => {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
  searchTimer = setTimeout(() => {
    loadProjects()
  }, 300)
}

// 导入项目
const handleImport = async () => {
  try {
    await importFormRef.value?.validate()
    importing.value = true

    const project = await projectsApi.import(importForm.value.path, importForm.value.detect)
    message.success('项目导入成功')
    showImportDialog.value = false
    importForm.value.path = ''
    await loadProjects()
  } catch (error: any) {
    if (error.message) {
      message.error(error.message)
    }
  } finally {
    importing.value = false
  }
}

// 点击项目卡片
const handleProjectClick = (project: Project) => {
  router.push(`/projects/${project.id}`)
}

// 删除项目
const handleDelete = (project: Project) => {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除项目 "${project.name}" 吗？此操作不可恢复。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await projectsApi.delete(project.id)
        message.success('项目已删除')
        await loadProjects()
      } catch (error: any) {
        message.error(error.message || '删除失败')
      }
    },
  })
}

// 打开项目
const handleOpen = async (project: Project) => {
  try {
    await projectsApi.open(project.id)
    message.success('项目已打开')
    router.push(`/projects/${project.id}`)
  } catch (error: any) {
    message.error(error.message || '打开失败')
  }
}

// 分析项目
const handleAnalyze = async (project: Project) => {
  try {
    const analysis = await projectsApi.analyze(project.id)
    message.success('项目分析完成')
    console.log('分析结果:', analysis)
    await loadProjects()
  } catch (error: any) {
    message.error(error.message || '分析失败')
  }
}

onMounted(() => {
  loadProjects()
})
</script>

<style scoped>
.projects-page {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.search-bar {
  margin-bottom: 24px;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

@media (max-width: 768px) {
  .projects-grid {
    grid-template-columns: 1fr;
  }
}
</style>

