<template>
  <div class="builder-page">
    <n-spin :show="loading">
      <!-- 构建配置 -->
      <n-card title="构建配置" class="config-card">
        <template #header-extra>
          <n-space>
            <n-button @click="loadConfig" :loading="configLoading">
              <template #icon>
                <n-icon><ReloadOutlined /></n-icon>
              </template>
              刷新配置
            </n-button>
            <n-button type="primary" @click="saveConfig" :loading="saving">
              <template #icon>
                <n-icon><SaveOutlined /></n-icon>
              </template>
              保存配置
            </n-button>
          </n-space>
        </template>

        <n-form
          ref="formRef"
          :model="config"
          label-placement="left"
          label-width="120"
          require-mark-placement="right-hanging"
        >
          <n-grid :cols="2" :x-gap="24">
            <n-form-item-gi label="构建模式" path="mode">
              <n-select
                v-model:value="config.mode"
                :options="modeOptions"
                placeholder="选择构建模式"
              />
            </n-form-item-gi>

            <n-form-item-gi label="输出目录" path="outDir">
              <n-input v-model:value="config.outDir" placeholder="输出目录" />
            </n-form-item-gi>

            <n-form-item-gi label="Source Map" path="sourcemap">
              <n-switch v-model:value="config.sourcemap" />
            </n-form-item-gi>

            <n-form-item-gi label="代码压缩" path="minify">
              <n-switch v-model:value="config.minify" />
            </n-form-item-gi>
          </n-grid>
        </n-form>
      </n-card>

      <!-- 构建操作 -->
      <n-card title="构建操作" class="actions-card">
        <n-space>
          <n-button
            type="primary"
            size="large"
            @click="handleBuild"
            :loading="building"
          >
            <template #icon>
              <n-icon><PlayCircleOutlined /></n-icon>
            </template>
            开始构建
          </n-button>

          <n-button
            size="large"
            @click="handleStopBuild"
            :disabled="!building"
          >
            <template #icon>
              <n-icon><StopOutlined /></n-icon>
            </template>
            停止构建
          </n-button>
        </n-space>
      </n-card>

      <!-- 构建日志 -->
      <LogViewer
        v-if="currentTaskId"
        ref="logViewerRef"
        title="构建日志"
        :task-id="currentTaskId"
        :project-id="projectId"
        @stop="handleStopBuild"
        @refresh="handleRefreshLogs"
      />

      <!-- 构建历史 -->
      <n-card title="构建历史" class="history-card">
        <n-data-table
          :columns="columns"
          :data="builds"
          :loading="historyLoading"
          :pagination="pagination"
        />
      </n-card>
    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  NCard,
  NSpace,
  NButton,
  NIcon,
  NForm,
  NFormItemGi,
  NGrid,
  NSelect,
  NInput,
  NSwitch,
  NDataTable,
  NTag,
  NSpin,
  useMessage,
  type FormInst,
} from 'naive-ui'
import {
  ReloadOutlined,
  SaveOutlined,
  PlayCircleOutlined,
  StopOutlined,
} from '@vicons/antd'
import LogViewer from '../../components/LogViewer.vue'
import { builderApi } from '../../api/builder'
import { buildsApi, type Build } from '../../api/builds'

const route = useRoute()
const message = useMessage()

const projectId = computed(() => route.params.id as string)

// 配置相关
const formRef = ref<FormInst | null>(null)
const config = ref({
  mode: 'development',
  outDir: 'dist',
  sourcemap: true,
  minify: false,
})
const configLoading = ref(false)
const saving = ref(false)

const modeOptions = [
  { label: '开发模式', value: 'development' },
  { label: '生产模式', value: 'production' },
  { label: '测试模式', value: 'test' },
]

// 构建相关
const building = ref(false)
const currentTaskId = ref<string | null>(null)
const logViewerRef = ref<InstanceType<typeof LogViewer> | null>(null)

// 历史记录
const builds = ref<Build[]>([])
const historyLoading = ref(false)
const loading = ref(false)

const columns = [
  { title: 'ID', key: 'id', width: 100, ellipsis: { tooltip: true } },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row: Build) => {
      const statusMap: Record<string, { type: any; text: string }> = {
        pending: { type: 'info', text: '待处理' },
        running: { type: 'warning', text: '构建中' },
        success: { type: 'success', text: '成功' },
        failed: { type: 'error', text: '失败' },
        cancelled: { type: 'default', text: '已取消' },
      }
      const config = statusMap[row.status] || { type: 'default', text: row.status }
      return h(NTag, { type: config.type }, () => config.text)
    },
  },
  {
    title: '开始时间',
    key: 'startTime',
    render: (row: Build) => new Date(row.startTime).toLocaleString(),
  },
  {
    title: '耗时',
    key: 'duration',
    width: 100,
    render: (row: Build) => (row.duration ? `${Math.round(row.duration / 1000)}s` : '-'),
  },
]

const pagination = {
  pageSize: 10,
}

// 加载配置
const loadConfig = async () => {
  configLoading.value = true
  try {
    const data = await builderApi.getConfig(projectId.value)
    config.value = data
  } catch (error: any) {
    message.error(error.message || '加载配置失败')
  } finally {
    configLoading.value = false
  }
}

// 保存配置
const saveConfig = async () => {
  saving.value = true
  try {
    await builderApi.updateConfig(projectId.value, config.value)
    message.success('配置已保存')
  } catch (error: any) {
    message.error(error.message || '保存配置失败')
  } finally {
    saving.value = false
  }
}

// 开始构建
const handleBuild = async () => {
  building.value = true
  try {
    const result = await builderApi.build(projectId.value, config.value)
    currentTaskId.value = result.taskId
    logViewerRef.value?.setStatus('running')
    message.success('构建任务已创建')
    startPollingLogs(result.taskId)
  } catch (error: any) {
    message.error(error.message || '创建构建任务失败')
    building.value = false
  }
}

// 停止构建
const handleStopBuild = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  currentTaskId.value = null
  building.value = false
  message.success('构建已停止')
}

// 刷新日志
const handleRefreshLogs = () => {
  // 日志刷新逻辑由 LogViewer 组件内部处理
}

// 轮询日志
let pollTimer: NodeJS.Timeout | null = null
const startPollingLogs = (taskId: string) => {
  if (pollTimer) {
    clearInterval(pollTimer)
  }

  pollTimer = setInterval(async () => {
    try {
      const logs = await builderApi.getLogs(projectId.value, taskId)
      logViewerRef.value?.setLogs(logs.logs)
      logViewerRef.value?.setStatus(logs.status)

      if (logs.status === 'success' || logs.status === 'failed') {
        clearInterval(pollTimer!)
        pollTimer = null
        building.value = false

        if (logs.status === 'success') {
          message.success('构建成功')
        } else {
          message.error(logs.error || '构建失败')
        }

        // 刷新构建历史
        loadBuilds()
      }
    } catch (error: any) {
      console.error('Failed to fetch logs:', error)
    }
  }, 1000)
}

// 加载构建历史
const loadBuilds = async () => {
  historyLoading.value = true
  try {
    builds.value = await buildsApi.getAll({ projectId: projectId.value })
  } catch (error: any) {
    message.error(error.message || '获取构建历史失败')
  } finally {
    historyLoading.value = false
  }
}

onMounted(() => {
  loadConfig()
  loadBuilds()
})

onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
})
</script>

<style scoped>
.builder-page {
  padding: 24px;
}

.config-card,
.actions-card,
.history-card {
  margin-bottom: 24px;
}
</style>
