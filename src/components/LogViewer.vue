<template>
  <n-card :title="title" class="log-viewer">
    <template #header-extra>
      <n-space>
        <!-- 状态指示器 -->
        <n-tag v-if="taskStatus" :type="statusType" :bordered="false">
          {{ statusText }}
        </n-tag>

        <!-- 操作按钮 -->
        <n-button-group size="small">
          <n-button @click="handleRefresh" :disabled="isRunning">
            <template #icon>
              <n-icon><ReloadOutlined /></n-icon>
            </template>
          </n-button>
          <n-button @click="handleCopy">
            <template #icon>
              <n-icon><CopyOutlined /></n-icon>
            </template>
          </n-button>
          <n-button @click="handleClear">
            <template #icon>
              <n-icon><DeleteOutlined /></n-icon>
            </template>
          </n-button>
          <n-button @click="handleDownload">
            <template #icon>
              <n-icon><DownloadOutlined /></n-icon>
            </template>
          </n-button>
          <n-button v-if="isRunning" @click="handleStop" type="error">
            <template #icon>
              <n-icon><StopOutlined /></n-icon>
            </template>
            停止
          </n-button>
        </n-button-group>
      </n-space>
    </template>

    <!-- 搜索栏 -->
    <div v-if="showSearch" class="search-bar">
      <n-input
        v-model:value="searchKeyword"
        placeholder="搜索日志..."
        clearable
        size="small"
      >
        <template #prefix>
          <n-icon><SearchOutlined /></n-icon>
        </template>
      </n-input>
    </div>

    <!-- 日志内容 -->
    <div ref="logContainerRef" class="log-container" :style="{ height: height }">
      <div v-if="filteredLogs.length === 0" class="log-empty">
        <n-empty description="暂无日志" />
      </div>
      <div v-else class="log-content">
        <div
          v-for="(log, index) in filteredLogs"
          :key="index"
          class="log-line"
          :class="{ 'log-line-highlight': log.includes(searchKeyword) && searchKeyword }"
        >
          <span class="log-line-number">{{ index + 1 }}</span>
          <span class="log-line-text">{{ log }}</span>
        </div>
      </div>
    </div>

    <!-- 底部信息 -->
    <template #footer>
      <n-space justify="space-between">
        <n-text depth="3" style="font-size: 12px">
          共 {{ logs.length }} 行日志
          <span v-if="searchKeyword">，筛选后 {{ filteredLogs.length }} 行</span>
        </n-text>
        <n-checkbox v-model:checked="autoScroll" size="small">
          自动滚动
        </n-checkbox>
      </n-space>
    </template>
  </n-card>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import {
  NCard,
  NSpace,
  NTag,
  NButton,
  NButtonGroup,
  NInput,
  NEmpty,
  NText,
  NCheckbox,
  NIcon,
  useMessage,
} from 'naive-ui'
import {
  ReloadOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  StopOutlined,
  SearchOutlined,
} from '@vicons/antd'

interface Props {
  title?: string
  taskId?: string
  projectId?: string
  height?: string
  showSearch?: boolean
  pollInterval?: number // 轮询间隔（毫秒）
  apiEndpoint?: string // 自定义 API 端点
}

interface Emits {
  (e: 'stop'): void
  (e: 'refresh'): void
}

const props = withDefaults(defineProps<Props>(), {
  title: '日志输出',
  height: '400px',
  showSearch: true,
  pollInterval: 1000,
})

const emit = defineEmits<Emits>()

const message = useMessage()

// 状态
const logs = ref<string[]>([])
const searchKeyword = ref('')
const autoScroll = ref(true)
const taskStatus = ref<'pending' | 'running' | 'success' | 'failed' | null>(null)
const logContainerRef = ref<HTMLElement | null>(null)
let pollTimer: NodeJS.Timeout | null = null

// 计算属性
const filteredLogs = computed(() => {
  if (!searchKeyword.value) {
    return logs.value
  }
  return logs.value.filter(log => log.toLowerCase().includes(searchKeyword.value.toLowerCase()))
})

const isRunning = computed(() => {
  return taskStatus.value === 'pending' || taskStatus.value === 'running'
})

const statusType = computed(() => {
  switch (taskStatus.value) {
    case 'pending':
      return 'default'
    case 'running':
      return 'info'
    case 'success':
      return 'success'
    case 'failed':
      return 'error'
    default:
      return 'default'
  }
})

const statusText = computed(() => {
  switch (taskStatus.value) {
    case 'pending':
      return '等待中'
    case 'running':
      return '运行中'
    case 'success':
      return '成功'
    case 'failed':
      return '失败'
    default:
      return '未知'
  }
})

// 方法
const scrollToBottom = async () => {
  if (!autoScroll.value || !logContainerRef.value) return
  await nextTick()
  logContainerRef.value.scrollTop = logContainerRef.value.scrollHeight
}

const fetchLogs = async () => {
  if (!props.taskId || !props.projectId) return

  try {
    // TODO: 调用实际的 API
    // const response = await apiClient.get(`/projects/${props.projectId}/logs/${props.taskId}`)
    // logs.value = response.logs
    // taskStatus.value = response.status
    
    // 模拟数据（开发阶段）
    console.log('Fetching logs for task:', props.taskId)
  } catch (error: any) {
    console.error('Failed to fetch logs:', error)
  }
}

const startPolling = () => {
  if (pollTimer) return
  
  pollTimer = setInterval(() => {
    if (isRunning.value) {
      fetchLogs()
    } else {
      stopPolling()
    }
  }, props.pollInterval)
}

const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

const handleRefresh = () => {
  fetchLogs()
  emit('refresh')
}

const handleCopy = () => {
  const text = logs.value.join('\n')
  navigator.clipboard.writeText(text)
  message.success('日志已复制到剪贴板')
}

const handleClear = () => {
  logs.value = []
  message.success('日志已清空')
}

const handleDownload = () => {
  const text = logs.value.join('\n')
  const blob = new Blob([text], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `logs-${props.taskId || Date.now()}.txt`
  a.click()
  URL.revokeObjectURL(url)
  message.success('日志已下载')
}

const handleStop = () => {
  emit('stop')
  stopPolling()
}

// 监听日志变化，自动滚动
watch(() => logs.value.length, () => {
  scrollToBottom()
})

// 生命周期
onMounted(() => {
  if (props.taskId && props.projectId) {
    fetchLogs()
    if (isRunning.value) {
      startPolling()
    }
  }
})

onUnmounted(() => {
  stopPolling()
})

// 暴露方法给父组件
defineExpose({
  addLog: (log: string) => {
    logs.value.push(log)
  },
  setLogs: (newLogs: string[]) => {
    logs.value = newLogs
  },
  setStatus: (status: 'pending' | 'running' | 'success' | 'failed') => {
    taskStatus.value = status
    if (status === 'running') {
      startPolling()
    } else {
      stopPolling()
    }
  },
  clear: () => {
    logs.value = []
  },
})
</script>

<style scoped>
.log-viewer {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

.search-bar {
  margin-bottom: 12px;
}

.log-container {
  overflow-y: auto;
  background: #1e1e1e;
  border-radius: 4px;
  padding: 12px;
}

.log-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.log-content {
  color: #d4d4d4;
  font-size: 13px;
  line-height: 1.6;
}

.log-line {
  display: flex;
  padding: 2px 0;
}

.log-line-highlight {
  background: rgba(255, 255, 0, 0.2);
}

.log-line-number {
  flex-shrink: 0;
  width: 50px;
  color: #858585;
  text-align: right;
  padding-right: 12px;
  user-select: none;
}

.log-line-text {
  flex: 1;
  word-break: break-all;
  white-space: pre-wrap;
}

/* 滚动条样式 */
.log-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.log-container::-webkit-scrollbar-track {
  background: #2d2d2d;
}

.log-container::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 4px;
}

.log-container::-webkit-scrollbar-thumb:hover {
  background: #666;
}
</style>

