<template>
  <div class="npm-registry-page">
    <n-spin :show="loading">
      <!-- 服务状态 -->
      <n-card title="服务状态" class="status-card">
        <template #header-extra>
          <n-space>
            <n-button @click="loadStatus" :loading="statusLoading">
              <template #icon>
                <n-icon><ReloadOutlined /></n-icon>
              </template>
              刷新
            </n-button>
            <n-button
              v-if="!status?.running"
              type="primary"
              @click="handleStart"
              :loading="starting"
            >
              <template #icon>
                <n-icon><PlayCircleOutlined /></n-icon>
              </template>
              启动服务
            </n-button>
            <n-button
              v-else
              type="error"
              @click="handleStop"
              :loading="stopping"
            >
              <template #icon>
                <n-icon><StopOutlined /></n-icon>
              </template>
              停止服务
            </n-button>
          </n-space>
        </template>

        <n-descriptions v-if="status" :column="2" bordered>
          <n-descriptions-item label="运行状态">
            <n-tag :type="status.running ? 'success' : 'default'">
              {{ status.running ? '运行中' : '已停止' }}
            </n-tag>
          </n-descriptions-item>
          <n-descriptions-item label="进程 ID">
            <n-text>{{ status.pid || '-' }}</n-text>
          </n-descriptions-item>
          <n-descriptions-item label="运行时长">
            <n-text>{{ formatUptime(status.uptime) }}</n-text>
          </n-descriptions-item>
          <n-descriptions-item label="服务地址">
            <n-text code copyable>{{ status.url }}</n-text>
          </n-descriptions-item>
        </n-descriptions>
        <n-empty v-else description="无法获取服务状态" />
      </n-card>

      <!-- 服务日志 -->
      <n-card v-if="status?.running" title="服务日志" class="logs-card">
        <template #header-extra>
          <n-space>
            <n-button @click="loadLogs" :loading="logsLoading">
              <template #icon>
                <n-icon><ReloadOutlined /></n-icon>
              </template>
              刷新
            </n-button>
            <n-button @click="handleClearLogs">
              清空
            </n-button>
          </n-space>
        </template>

        <div ref="logsContainerRef" class="logs-container">
          <div v-for="(log, index) in logs" :key="index" class="log-line">
            <span class="log-line-number">{{ index + 1 }}</span>
            <span class="log-line-text">{{ log }}</span>
          </div>
          <n-empty v-if="logs.length === 0" description="暂无日志" />
        </div>
      </n-card>

      <!-- 配置编辑器 -->
      <n-card title="配置管理" class="config-card">
        <template #header-extra>
          <n-space>
            <n-button @click="loadConfig" :loading="configLoading">
              <template #icon>
                <n-icon><ReloadOutlined /></n-icon>
              </template>
              刷新
            </n-button>
            <n-button type="primary" @click="handleSaveConfig" :loading="saving">
              <template #icon>
                <n-icon><SaveOutlined /></n-icon>
              </template>
              保存配置
            </n-button>
          </n-space>
        </template>

        <n-alert v-if="configPath" type="info" style="margin-bottom: 16px">
          配置文件路径: <n-text code>{{ configPath }}</n-text>
        </n-alert>

        <n-form ref="configFormRef" :model="config" label-placement="left" label-width="120">
          <n-form-item label="存储目录" path="storage">
            <n-input v-model:value="config.storage" placeholder="./storage" />
          </n-form-item>

          <n-divider>上游链接 (Uplinks)</n-divider>
          <n-dynamic-input
            v-model:value="uplinksArray"
            :on-create="createUplink"
            #="{ index, value }"
          >
            <n-space vertical style="width: 100%">
              <n-input v-model:value="value.name" placeholder="名称 (例如: npmjs)" />
              <n-input v-model:value="value.url" placeholder="URL (例如: https://registry.npmjs.org/)" />
            </n-space>
          </n-dynamic-input>

          <n-divider>服务器配置</n-divider>
          <n-grid :cols="2" :x-gap="24">
            <n-form-item-gi label="监听端口">
              <n-input-number v-model:value="serverPort" :min="1" :max="65535" />
            </n-form-item-gi>
          </n-grid>
        </n-form>
      </n-card>

      <!-- 包列表 -->
      <n-card v-if="status?.running" title="包列表" class="packages-card">
        <template #header-extra>
          <n-button @click="loadPackages" :loading="packagesLoading">
            <template #icon>
              <n-icon><ReloadOutlined /></n-icon>
            </template>
            刷新
          </n-button>
        </template>

        <n-data-table
          :columns="packageColumns"
          :data="packages"
          :loading="packagesLoading"
          :pagination="pagination"
        />
      </n-card>
    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  NCard,
  NSpace,
  NButton,
  NIcon,
  NTag,
  NText,
  NDescriptions,
  NDescriptionsItem,
  NEmpty,
  NAlert,
  NForm,
  NFormItem,
  NFormItemGi,
  NGrid,
  NInput,
  NInputNumber,
  NDivider,
  NDynamicInput,
  NDataTable,
  NSpin,
  useMessage,
  type FormInst,
  type DataTableColumns,
} from 'naive-ui'
import {
  ReloadOutlined,
  PlayCircleOutlined,
  StopOutlined,
  SaveOutlined,
} from '@vicons/antd'
import { npmRegistryApi, type RegistryStatus, type RegistryConfig, type Package } from '../api/npm-registry'

const message = useMessage()

// 服务状态
const status = ref<RegistryStatus | null>(null)
const statusLoading = ref(false)
const starting = ref(false)
const stopping = ref(false)

// 日志
const logs = ref<string[]>([])
const logsLoading = ref(false)
const logsContainerRef = ref<HTMLElement | null>(null)

// 配置
const config = ref<RegistryConfig>({})
const configPath = ref('')
const configLoading = ref(false)
const saving = ref(false)
const configFormRef = ref<FormInst | null>(null)

// Uplinks 数组（用于动态输入）
const uplinksArray = ref<Array<{ name: string; url: string }>>([])
const serverPort = ref(4873)

// 包列表
const packages = ref<Package[]>([])
const packagesLoading = ref(false)

const loading = ref(false)

// 轮询定时器
let pollTimer: NodeJS.Timeout | null = null

// 格式化运行时长
const formatUptime = (seconds: number) => {
  if (seconds === 0) return '-'
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}小时 ${minutes}分钟`
  }
  if (minutes > 0) {
    return `${minutes}分钟 ${secs}秒`
  }
  return `${secs}秒`
}

// 加载服务状态
const loadStatus = async () => {
  statusLoading.value = true
  try {
    status.value = await npmRegistryApi.getStatus()
    
    if (status.value.running && !pollTimer) {
      startPolling()
    } else if (!status.value.running && pollTimer) {
      stopPolling()
    }
  } catch (error: any) {
    message.error(error.message || '获取服务状态失败')
  } finally {
    statusLoading.value = false
  }
}

// 启动服务
const handleStart = async () => {
  starting.value = true
  try {
    const result = await npmRegistryApi.start({ port: serverPort.value })
    message.success(result.message)
    await loadStatus()
  } catch (error: any) {
    message.error(error.message || '启动服务失败')
  } finally {
    starting.value = false
  }
}

// 停止服务
const handleStop = async () => {
  stopping.value = true
  try {
    const result = await npmRegistryApi.stop()
    message.success(result.message)
    await loadStatus()
  } catch (error: any) {
    message.error(error.message || '停止服务失败')
  } finally {
    stopping.value = false
  }
}

// 加载日志
const loadLogs = async () => {
  logsLoading.value = true
  try {
    const result = await npmRegistryApi.getLogs()
    logs.value = result.logs
    
    // 自动滚动到底部
    setTimeout(() => {
      if (logsContainerRef.value) {
        logsContainerRef.value.scrollTop = logsContainerRef.value.scrollHeight
      }
    }, 100)
  } catch (error: any) {
    message.error(error.message || '获取日志失败')
  } finally {
    logsLoading.value = false
  }
}

// 清空日志
const handleClearLogs = () => {
  logs.value = []
}

// 加载配置
const loadConfig = async () => {
  configLoading.value = true
  try {
    const result = await npmRegistryApi.getConfig()
    config.value = result.config
    configPath.value = result.path
    
    // 转换 uplinks 为数组
    if (config.value.uplinks) {
      uplinksArray.value = Object.entries(config.value.uplinks).map(([name, value]: [string, any]) => ({
        name,
        url: value.url || '',
      }))
    }
    
    // 设置端口
    if (config.value.server?.listen) {
      serverPort.value = parseInt(config.value.server.listen) || 4873
    }
  } catch (error: any) {
    // 配置文件可能不存在，这是正常的
    console.log('配置文件不存在或无法读取')
  } finally {
    configLoading.value = false
  }
}

// 保存配置
const handleSaveConfig = async () => {
  saving.value = true
  try {
    // 转换 uplinks 数组为对象
    const uplinks: Record<string, any> = {}
    uplinksArray.value.forEach(item => {
      if (item.name && item.url) {
        uplinks[item.name] = { url: item.url }
      }
    })
    
    const updatedConfig = {
      ...config.value,
      uplinks,
      server: {
        ...config.value.server,
        listen: serverPort.value,
      },
    }
    
    const result = await npmRegistryApi.updateConfig(updatedConfig)
    message.success(result.message)
  } catch (error: any) {
    message.error(error.message || '保存配置失败')
  } finally {
    saving.value = false
  }
}

// 创建 uplink
const createUplink = () => {
  return { name: '', url: '' }
}

// 加载包列表
const loadPackages = async () => {
  packagesLoading.value = true
  try {
    const result = await npmRegistryApi.getPackages()
    packages.value = result.packages
  } catch (error: any) {
    message.error(error.message || '获取包列表失败')
  } finally {
    packagesLoading.value = false
  }
}

// 包列表列
const packageColumns: DataTableColumns<Package> = [
  { title: '包名', key: 'name' },
  { title: '版本', key: 'version' },
  { title: '描述', key: 'description', ellipsis: { tooltip: true } },
]

// 分页
const pagination = {
  pageSize: 10,
}

// 开始轮询
const startPolling = () => {
  if (pollTimer) return
  
  pollTimer = setInterval(() => {
    loadStatus()
    loadLogs()
  }, 3000)
}

// 停止轮询
const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

onMounted(() => {
  loadStatus()
  loadConfig()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped>
.npm-registry-page {
  padding: 24px;
}

.status-card,
.logs-card,
.config-card,
.packages-card {
  margin-bottom: 24px;
}

.logs-container {
  max-height: 400px;
  overflow-y: auto;
  background: #1e1e1e;
  border-radius: 4px;
  padding: 12px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
}

.log-line {
  display: flex;
  color: #d4d4d4;
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
}
</style>

