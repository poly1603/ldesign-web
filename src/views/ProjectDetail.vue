<template>
  <div class="project-detail-page">
    <n-spin :show="loading">
      <!-- 第一部分：项目基本信息面板 -->
      <ProjectInfo
        v-if="project"
        :project="project"
        @analyze="handleAnalyze"
        @update="handleUpdate"
      />

      <!-- 第二部分：项目操作区 -->
      <n-card title="项目操作" class="project-actions">
        <n-space>
          <n-button type="primary" @click="handleDev" :loading="devRunning">
            <template #icon>
              <n-icon><PlayCircleOutlined /></n-icon>
            </template>
            启动开发服务器
          </n-button>
          <n-button @click="handleBuild" :loading="buildRunning">
            <template #icon>
              <n-icon><BuildOutlined /></n-icon>
            </template>
            项目打包
          </n-button>
          <n-button @click="handlePreview" :loading="previewRunning">
            <template #icon>
              <n-icon><EyeOutlined /></n-icon>
            </template>
            预览
          </n-button>
          <n-button
            v-if="isLibraryProject"
            @click="handleBuildLib"
            :loading="buildLibRunning"
          >
            <template #icon>
              <n-icon><CodeOutlined /></n-icon>
            </template>
            库打包
          </n-button>
        </n-space>
      </n-card>

      <!-- 日志查看器（当有任务运行时显示） -->
      <LogViewer
        v-if="currentTaskId"
        ref="logViewerRef"
        :title="currentTaskTitle"
        :task-id="currentTaskId"
        :project-id="projectId"
        @stop="handleStopTask"
        @refresh="handleRefreshLogs"
      />

      <!-- 第三部分：工具功能入口 -->
      <n-card title="工具功能" class="project-tools">
        <div class="tools-grid">
          <ToolCard
            v-for="tool in tools"
            :key="tool.name"
            :tool="tool"
            :project-id="projectId"
            @click="handleToolClick"
          />
        </div>
      </n-card>
    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NCard,
  NSpace,
  NButton,
  NSpin,
  NIcon,
  useMessage,
} from 'naive-ui'
import {
  PlayCircleOutlined,
  BuildOutlined,
  EyeOutlined,
  CodeOutlined,
} from '@vicons/antd'
import ProjectInfo from '../components/ProjectInfo.vue'
import ToolCard, { type Tool } from '../components/ToolCard.vue'
import LogViewer from '../components/LogViewer.vue'
import { projectsApi, type Project } from '../api/projects'

const route = useRoute()
const router = useRouter()
const message = useMessage()

// 状态
const project = ref<Project | null>(null)
const loading = ref(false)
const devRunning = ref(false)
const buildRunning = ref(false)
const previewRunning = ref(false)
const buildLibRunning = ref(false)
const currentTaskId = ref<string | null>(null)
const currentTaskTitle = ref('')
const logViewerRef = ref<InstanceType<typeof LogViewer> | null>(null)

const projectId = computed(() => route.params.id as string)

const isLibraryProject = computed(() => {
  return project.value?.type === 'library' || project.value?.type === 'library+project'
})

// 工具列表
const tools: Tool[] = [
  {
    name: 'builder',
    label: '构建工具',
    icon: 'BuildOutlined',
    description: '项目构建和打包配置',
    color: '#18a058',
  },
  {
    name: 'deployer',
    label: '部署工具',
    icon: 'RocketOutlined',
    description: '项目部署和发布管理',
    color: '#2080f0',
  },
  {
    name: 'testing',
    label: '测试工具',
    icon: 'BugOutlined',
    description: '单元测试和集成测试',
    color: '#f0a020',
  },
  {
    name: 'git',
    label: 'Git 管理',
    icon: 'BranchesOutlined',
    description: 'Git 版本控制和分支管理',
    color: '#d03050',
  },
  {
    name: 'deps',
    label: '依赖管理',
    icon: 'AppstoreOutlined',
    description: '依赖包管理和更新',
    color: '#7c3aed',
  },
  {
    name: 'monitor',
    label: '监控工具',
    icon: 'DashboardOutlined',
    description: '项目运行监控和日志',
    color: '#0ea5e9',
  },
]

// 加载项目信息
const loadProject = async () => {
  loading.value = true
  try {
    project.value = await projectsApi.getById(projectId.value)
  } catch (error: any) {
    message.error(error.message || '加载项目信息失败')
  } finally {
    loading.value = false
  }
}

// 分析项目
const handleAnalyze = async () => {
  try {
    await projectsApi.analyze(projectId.value)
    message.success('项目分析完成')
    await loadProject()
  } catch (error: any) {
    message.error(error.message || '项目分析失败')
  }
}

// 更新项目
const handleUpdate = async (updates: Partial<Project>) => {
  try {
    await projectsApi.update(projectId.value, updates)
    message.success('项目信息已更新')
    await loadProject()
  } catch (error: any) {
    message.error(error.message || '更新失败')
  }
}

// 启动开发服务器
const handleDev = async () => {
  devRunning.value = true
  currentTaskTitle.value = '开发服务器'
  try {
    const result = await projectsApi.dev(projectId.value)
    currentTaskId.value = result.taskId
    logViewerRef.value?.setStatus('running')
    message.success('开发服务器启动中...')
    startPollingLogs(result.taskId)
  } catch (error: any) {
    message.error(error.message || '启动失败')
    devRunning.value = false
  }
}

// 项目打包
const handleBuild = async () => {
  buildRunning.value = true
  currentTaskTitle.value = '项目打包'
  try {
    const result = await projectsApi.build(projectId.value)
    currentTaskId.value = result.taskId
    logViewerRef.value?.setStatus('running')
    message.success('项目打包中...')
    startPollingLogs(result.taskId)
  } catch (error: any) {
    message.error(error.message || '打包失败')
    buildRunning.value = false
  }
}

// 预览
const handlePreview = async () => {
  previewRunning.value = true
  currentTaskTitle.value = '预览'
  try {
    const result = await projectsApi.preview(projectId.value)
    currentTaskId.value = result.taskId
    logViewerRef.value?.setStatus('running')
    message.success('预览启动中...')
    startPollingLogs(result.taskId)
  } catch (error: any) {
    message.error(error.message || '预览失败')
    previewRunning.value = false
  }
}

// 库打包
const handleBuildLib = async () => {
  buildLibRunning.value = true
  currentTaskTitle.value = '库打包'
  try {
    const result = await projectsApi.buildLib(projectId.value)
    currentTaskId.value = result.taskId
    logViewerRef.value?.setStatus('running')
    message.success('库打包中...')
    startPollingLogs(result.taskId)
  } catch (error: any) {
    message.error(error.message || '打包失败')
    buildLibRunning.value = false
  }
}

// 轮询日志
let pollTimer: NodeJS.Timeout | null = null
const startPollingLogs = (taskId: string) => {
  if (pollTimer) {
    clearInterval(pollTimer)
  }

  pollTimer = setInterval(async () => {
    try {
      const logs = await projectsApi.getLogs(projectId.value, taskId)
      logViewerRef.value?.setLogs(logs.logs)
      logViewerRef.value?.setStatus(logs.status)

      if (logs.status === 'success' || logs.status === 'failed') {
        clearInterval(pollTimer!)
        pollTimer = null
        devRunning.value = false
        buildRunning.value = false
        previewRunning.value = false
        buildLibRunning.value = false

        if (logs.status === 'success') {
          message.success('任务执行成功')
        } else {
          message.error(logs.error || '任务执行失败')
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch logs:', error)
    }
  }, 1000)
}

// 停止任务
const handleStopTask = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  currentTaskId.value = null
  devRunning.value = false
  buildRunning.value = false
  previewRunning.value = false
  buildLibRunning.value = false
  message.success('任务已停止')
}

// 刷新日志
const handleRefreshLogs = () => {
  // 日志刷新逻辑由 LogViewer 组件内部处理
}

// 点击工具卡片
const handleToolClick = (tool: Tool) => {
  router.push(`/projects/${projectId.value}/${tool.name}`)
}

onMounted(() => {
  loadProject()
})

onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
})
</script>

<style scoped>
.project-detail-page {
  padding: 24px;
}

.project-actions {
  margin-top: 24px;
}

.project-tools {
  margin-top: 24px;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

@media (max-width: 768px) {
  .tools-grid {
    grid-template-columns: 1fr;
  }
}
</style>

