<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'

interface SystemInfo {
  status: string
  timestamp: string
  uptime: number
  environment: string
  version: string
  appName: string
  nodeVersion: string
  system: {
    platform: string
    arch: string
    cpus: number
    hostname: string
    type: string
    release: string
  }
  memory: {
    total: string
    free: string
    used: string
    usagePercent: string
    process: {
      heapTotal: string
      heapUsed: string
      external: string
      rss: string
      arrayBuffers: string
    }
  }
  cpu: {
    model: string
    speed: string
    cores: number
    usage?: number
  }
}

const systemInfo = ref<SystemInfo | null>(null)
const loading = ref(false)

// 格式化运行时间
const formatUptime = computed(() => {
  if (!systemInfo.value) return '-'
  const seconds = systemInfo.value.uptime
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${days}天 ${hours}小时 ${minutes}分钟 ${secs}秒`
})

// 获取系统信息
const fetchSystemInfo = async () => {
  loading.value = true
  try {
    const response = await fetch('http://localhost:7001/api/v1/system/info')
    if (!response.ok) {
      throw new Error('获取系统信息失败')
    }
    const result = await response.json()
    // 后端返回格式: { code, message, data }
    if (result.code === 200 && result.data) {
      systemInfo.value = result.data
    } else {
      throw new Error(result.message || '获取系统信息失败')
    }
  } catch (error) {
    MessagePlugin.error('获取系统信息失败，请确保服务器正在运行')
    // 开发环境下才输出错误详情
    if (import.meta.env.DEV) {
      console.error('获取系统信息失败:', error)
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchSystemInfo()
})
</script>

<template>
  <div class="system-info">
    <div class="page-header">
      <h1 class="page-title">系统信息</h1>
      <t-button theme="primary" @click="fetchSystemInfo" :loading="loading">
        刷新数据
      </t-button>
    </div>

    <div v-if="loading && !systemInfo" class="loading-container">
      <t-loading text="加载中..." />
    </div>

    <div v-else-if="systemInfo && systemInfo.system && systemInfo.memory && systemInfo.cpu" class="info-container">
      <!-- 基本信息 -->
      <t-card title="基本信息" class="info-card" :bordered="false">
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">应用名称：</span>
            <span class="info-value">{{ systemInfo.appName }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">应用版本：</span>
            <span class="info-value">{{ systemInfo.version }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">运行环境：</span>
            <t-tag
              :theme="systemInfo.environment === 'production' ? 'success' : 'warning'"
            >
              {{ systemInfo.environment }}
            </t-tag>
          </div>
          <div class="info-item">
            <span class="info-label">系统状态：</span>
            <t-tag theme="success">{{ systemInfo.status }}</t-tag>
          </div>
          <div class="info-item">
            <span class="info-label">运行时间：</span>
            <span class="info-value">{{ formatUptime }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Node.js 版本：</span>
            <span class="info-value">{{ systemInfo.nodeVersion }}</span>
          </div>
        </div>
      </t-card>

      <!-- 系统信息 -->
      <t-card title="系统信息" class="info-card" :bordered="false">
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">主机名：</span>
            <span class="info-value">{{ systemInfo.system.hostname }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">操作系统：</span>
            <span class="info-value">{{ systemInfo.system.type }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">平台：</span>
            <span class="info-value">{{ systemInfo.system.platform }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">架构：</span>
            <span class="info-value">{{ systemInfo.system.arch }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">系统版本：</span>
            <span class="info-value">{{ systemInfo.system.release }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">CPU 核心数：</span>
            <span class="info-value">{{ systemInfo.system.cpus }}</span>
          </div>
        </div>
      </t-card>

      <!-- CPU 信息 -->
      <t-card title="CPU 信息" class="info-card" :bordered="false">
        <div class="info-grid">
          <div class="info-item full-width">
            <span class="info-label">型号：</span>
            <span class="info-value">{{ systemInfo.cpu.model }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">主频：</span>
            <span class="info-value">{{ systemInfo.cpu.speed }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">核心数：</span>
            <span class="info-value">{{ systemInfo.cpu.cores }}</span>
          </div>
        </div>
      </t-card>

      <!-- 内存信息 -->
      <t-card title="内存信息" class="info-card" :bordered="false">
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">总内存：</span>
            <span class="info-value">{{ systemInfo.memory.total }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">已使用：</span>
            <span class="info-value">{{ systemInfo.memory.used }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">空闲内存：</span>
            <span class="info-value">{{ systemInfo.memory.free }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">使用率：</span>
            <span class="info-value highlight">
              {{ systemInfo.memory.usagePercent }}
            </span>
          </div>
        </div>

        <t-divider />

        <h4 class="sub-title">进程内存</h4>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">堆总量：</span>
            <span class="info-value">{{ systemInfo.memory.process.heapTotal }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">堆使用：</span>
            <span class="info-value">{{ systemInfo.memory.process.heapUsed }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">RSS：</span>
            <span class="info-value">{{ systemInfo.memory.process.rss }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">外部内存：</span>
            <span class="info-value">{{ systemInfo.memory.process.external }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">ArrayBuffers：</span>
            <span class="info-value">
              {{ systemInfo.memory.process.arrayBuffers }}
            </span>
          </div>
        </div>
      </t-card>
    </div>
  </div>
</template>

<style scoped>
.system-info {
  max-width: 1400px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  margin: 0;
  color: #333;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.info-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-card {
  transition: all 0.3s;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.info-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
}

.info-item.full-width {
  grid-column: 1 / -1;
}

.info-label {
  font-weight: 500;
  color: #666;
  min-width: 120px;
}

.info-value {
  color: #333;
  word-break: break-all;
}

.info-value.highlight {
  color: #0052d9;
  font-weight: 600;
}

.sub-title {
  margin: 8px 0 16px 0;
  font-size: 16px;
  color: #333;
}
</style>
