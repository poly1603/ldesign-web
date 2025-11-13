<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MessagePlugin } from 'tdesign-vue-next'
import { ArrowLeftIcon, StopCircleIcon } from 'tdesign-icons-vue-next'
import { launcherWs, type LogMessage } from '@/services/websocket'
import QRCode from 'qrcode'

interface Props {
  operation: 'dev' | 'build' | 'preview'
  title: string
}

const props = defineProps<Props>()

const API_BASE = 'http://localhost:7001/api/v1'

const route = useRoute()
const router = useRouter()

const projectId = computed(() => Number(route.params.id))
const projectName = ref('')
const loading = ref(false)
const running = ref(false)
const logs = ref<LogMessage[]>([])
const processInfo = ref<any>(null)
const serverUrl = ref('')
const qrcodeUrl = ref('')

// 环境配置
const envMode = ref('development')

// 返回详情页
const goBack = () => {
  router.push(`/project/detail/${projectId.value}`)
}

// 获取项目信息
const fetchProject = async () => {
  try {
    const response = await fetch(`${API_BASE}/projects/${projectId.value}`)
    const result = await response.json()
    if (result.code === 200) {
      projectName.value = result.data.name
    }
  } catch (error) {
    console.error('Failed to fetch project:', error)
  }
}

// 启动操作
const startOperation = async () => {
  loading.value = true
  logs.value = []
  serverUrl.value = ''
  qrcodeUrl.value = ''

  try {
    // 连接 WebSocket
    await launcherWs.connect()

    // 准备请求参数
    const body: any = {}
    if (props.operation === 'dev') {
      body.mode = envMode.value
    } else if (props.operation === 'build') {
      body.mode = envMode.value
    } else if (props.operation === 'preview') {
      // preview 使用默认配置
    }

    // 调用 API 启动操作
    const response = await fetch(`${API_BASE}/projects/${projectId.value}/${props.operation}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const result = await response.json()
    if (result.code === 200) {
      processInfo.value = result.data
      running.value = true
      MessagePlugin.success('启动成功')

      // 订阅日志
      launcherWs.subscribeLogs(projectId.value, props.operation, {
        onLog: (log) => {
          console.log('Received log:', log)
          logs.value.push(log)
          
          // 解析服务器地址
          if (props.operation === 'dev' || props.operation === 'preview') {
            const urlMatch = log.message.match(/https?:\/\/[^\s]+/)
            if (urlMatch && !serverUrl.value) {
              serverUrl.value = urlMatch[0]
              generateQRCode(urlMatch[0])
            }
          }
          
          // 自动滚动到底部
          nextTick(() => {
            const logContainer = document.querySelector('.log-container')
            if (logContainer) {
              logContainer.scrollTop = logContainer.scrollHeight
            }
          })
        },
        onStatus: (status) => {
          console.log('Process status:', status)
        },
        onExit: (data) => {
          running.value = false
          serverUrl.value = ''
          qrcodeUrl.value = ''
          if (data.code === 0) {
            MessagePlugin.success('进程已正常退出')
          } else {
            MessagePlugin.warning(`进程已退出，退出码: ${data.code}`)
          }
        },
        onError: (error) => {
          console.error('WebSocket error:', error)
          MessagePlugin.error(`错误: ${error.message}`)
        },
      })
    } else {
      throw new Error(result.message)
    }
  } catch (error: any) {
    MessagePlugin.error(`启动失败: ${error.message}`)
    console.error('Failed to start operation:', error)
  } finally {
    loading.value = false
  }
}

// 停止操作
const stopOperation = async () => {
  try {
    const response = await fetch(`${API_BASE}/projects/${projectId.value}/stop/${props.operation}`, {
      method: 'POST',
    })

    const result = await response.json()
    if (result.code === 200) {
      MessagePlugin.success('已停止')
      running.value = false
      serverUrl.value = ''
      qrcodeUrl.value = ''
    } else {
      throw new Error(result.message)
    }
  } catch (error: any) {
    MessagePlugin.error(`停止失败: ${error.message}`)
    console.error('Failed to stop operation:', error)
  }
}

// 生成二维码
const generateQRCode = async (url: string) => {
  try {
    qrcodeUrl.value = await QRCode.toDataURL(url, {
      width: 200,
      margin: 1,
    })
  } catch (error) {
    console.error('Failed to generate QR code:', error)
  }
}

// 格式化日志类型
const getLogClass = (type: string) => {
  switch (type) {
    case 'stderr':
    case 'error':
      return 'log-error'
    default:
      return 'log-normal'
  }
}

onMounted(() => {
  fetchProject()
})

onBeforeUnmount(() => {
  launcherWs.disconnect()
})
</script>

<template>
  <div class="operation-runner">
    <div class="page-header">
      <div class="header-left">
        <t-button theme="default" @click="goBack">
          <template #icon><ArrowLeftIcon /></template>
          返回详情
        </t-button>
        <h2>{{ title }} - {{ projectName }}</h2>
      </div>
      <div class="header-right">
        <t-button v-if="running" theme="danger" @click="stopOperation">
          <template #icon><StopCircleIcon /></template>
          停止
        </t-button>
      </div>
    </div>

    <div class="config-section">
      <t-card :bordered="false">
        <div class="config-content">
          <div class="config-left">
            <t-form layout="inline">
              <t-form-item v-if="operation !== 'preview'" label="环境模式">
                <t-select v-model="envMode" :disabled="running" style="width: 160px">
                  <t-option value="development" label="开发环境" />
                  <t-option value="production" label="生产环境" />
                  <t-option value="test" label="测试环境" />
                </t-select>
              </t-form-item>
              <t-form-item>
                <t-button theme="primary" size="large" :loading="loading" :disabled="running" @click="startOperation">
                  {{ running ? '运行中...' : '启动' }}
                </t-button>
              </t-form-item>
            </t-form>
          </div>
          <div v-if="serverUrl" class="server-info">
            <div class="info-text">
              <div class="info-label">服务地址：</div>
              <t-link :href="serverUrl" target="_blank" theme="primary">{{ serverUrl }}</t-link>
            </div>
            <div v-if="qrcodeUrl" class="qrcode">
              <img :src="qrcodeUrl" alt="二维码" />
              <div class="qrcode-tip">扫码访问</div>
            </div>
          </div>
        </div>
      </t-card>
    </div>

    <div class="log-section">
      <t-card title="日志输出" :bordered="false">
        <div class="log-container">
          <div v-if="logs.length === 0" class="log-empty">
            等待日志输出...
          </div>
          <div v-for="(log, index) in logs" :key="index" :class="['log-item', getLogClass(log.type)]">
            <span class="log-time">{{ new Date(log.timestamp).toLocaleTimeString() }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
        </div>
      </t-card>
    </div>
  </div>
</template>

<style scoped>
.operation-runner {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-left h2 {
  margin: 0;
  font-size: 20px;
  color: #333;
}

.config-section {
  margin-bottom: 24px;
}

.config-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
}

.config-left {
  flex: 1;
}

.server-info {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 16px;
  background: #f5f5f5;
  border-radius: 8px;
}

.info-text {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.qrcode {
  text-align: center;
}

.qrcode img {
  display: block;
  width: 120px;
  height: 120px;
  border: 2px solid #e0e0e0;
  border-radius: 4px;
  background: white;
}

.qrcode-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #666;
}

.log-section {
  height: calc(100vh - 300px);
  min-height: 400px;
}

.log-container {
  height: calc(100vh - 380px);
  min-height: 350px;
  overflow-y: auto;
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 16px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.6;
}

.log-empty {
  color: #666;
  text-align: center;
  padding: 40px;
}

.log-item {
  display: flex;
  gap: 12px;
  margin-bottom: 4px;
  word-break: break-all;
}

.log-time {
  color: #858585;
  flex-shrink: 0;
  font-size: 12px;
}

.log-message {
  flex: 1;
  white-space: pre-wrap;
}

.log-normal {
  color: #d4d4d4;
}

.log-error {
  color: #f48771;
}

/* 滚动条样式 */
.log-container::-webkit-scrollbar {
  width: 8px;
}

.log-container::-webkit-scrollbar-track {
  background: #2d2d2d;
  border-radius: 4px;
}

.log-container::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 4px;
}

.log-container::-webkit-scrollbar-thumb:hover {
  background: #666;
}
</style>
