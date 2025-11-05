<template>
  <div class="home-page">
    <div class="page-header">
      <h1>系统信息</h1>
      <button 
        class="refresh-btn" 
        @click="loadSystemInfo"
        :disabled="loading"
      >
        {{ loading ? '加载中...' : '刷新' }}
      </button>
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <div v-if="loading && !healthInfo" class="loading">
      正在加载系统信息...
    </div>

    <div v-else class="system-info-grid">
      <!-- 服务状态 -->
      <div class="info-card">
        <h2>服务状态</h2>
        <div v-if="healthInfo" class="info-content">
          <div class="info-item">
            <span class="label">状态:</span>
            <span :class="['value', 'status', healthInfo.status]">
              {{ healthInfo.status === 'healthy' ? '健康' : '异常' }}
            </span>
          </div>
          <div class="info-item">
            <span class="label">服务名:</span>
            <span class="value">{{ healthInfo.service }}</span>
          </div>
          <div class="info-item">
            <span class="label">版本:</span>
            <span class="value">{{ healthInfo.version }}</span>
          </div>
          <div class="info-item">
            <span class="label">运行时间:</span>
            <span class="value">{{ healthInfo.uptime?.formatted || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="label">时间戳:</span>
            <span class="value">{{ formatTimestamp(healthInfo.timestamp) }}</span>
          </div>
        </div>
      </div>

      <!-- 系统信息 -->
      <div class="info-card">
        <h2>系统信息</h2>
        <div v-if="systemInfo" class="info-content">
          <div class="info-item">
            <span class="label">平台:</span>
            <span class="value">{{ systemInfo.platform }}</span>
          </div>
          <div class="info-item">
            <span class="label">架构:</span>
            <span class="value">{{ systemInfo.arch }}</span>
          </div>
          <div class="info-item">
            <span class="label">CPU 核心数:</span>
            <span class="value">{{ systemInfo.cpus }}</span>
          </div>
          <div class="info-item">
            <span class="label">Node.js 版本:</span>
            <span class="value">{{ systemInfo.nodeVersion }}</span>
          </div>
          <div class="info-item">
            <span class="label">系统运行时间:</span>
            <span class="value">{{ formatUptime(systemInfo.uptime) }}</span>
          </div>
        </div>
      </div>

      <!-- 内存使用 -->
      <div class="info-card">
        <h2>内存使用</h2>
        <div v-if="memoryInfo" class="info-content">
          <div class="info-item">
            <span class="label">总内存:</span>
            <span class="value">{{ memoryInfo.totalFormatted }}</span>
          </div>
          <div class="info-item">
            <span class="label">已使用:</span>
            <span class="value">{{ memoryInfo.usedFormatted }}</span>
          </div>
          <div class="info-item">
            <span class="label">可用内存:</span>
            <span class="value">{{ memoryInfo.freeFormatted }}</span>
          </div>
          <div class="info-item">
            <span class="label">使用率:</span>
            <span class="value">
              <span :class="['usage-percent', getUsageClass(memoryInfo.usagePercent)]">
                {{ memoryInfo.usagePercent }}%
              </span>
            </span>
          </div>
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: `${memoryInfo.usagePercent}%` }"
              :class="getUsageClass(memoryInfo.usagePercent)"
            ></div>
          </div>
        </div>
      </div>

      <!-- CPU 信息 -->
      <div class="info-card">
        <h2>CPU 信息</h2>
        <div v-if="cpuInfo" class="info-content">
          <div class="info-item">
            <span class="label">CPU 数量:</span>
            <span class="value">{{ cpuInfo.count }}</span>
          </div>
          <div class="info-item">
            <span class="label">型号:</span>
            <span class="value">{{ cpuInfo.model }}</span>
          </div>
          <div class="info-item">
            <span class="label">频率:</span>
            <span class="value">{{ cpuInfo.speed }} MHz</span>
          </div>
          <div v-if="cpuInfo.average" class="info-item">
            <span class="label">平均使用率:</span>
            <span class="value">
              <span>用户: {{ cpuInfo.average.user }}</span>
              <span>系统: {{ cpuInfo.average.system }}</span>
              <span>空闲: {{ cpuInfo.average.idle }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { systemApi } from '../api/services'

const loading = ref(false)
const error = ref<string | null>(null)
const healthInfo = ref<any>(null)
const systemInfo = ref<any>(null)
const memoryInfo = ref<any>(null)
const cpuInfo = ref<any>(null)

async function loadSystemInfo() {
  loading.value = true
  error.value = null

  try {
    // 并行加载所有信息
    const [healthRes, systemRes, memoryRes, cpuRes] = await Promise.all([
      systemApi.getHealth(),
      systemApi.getSystemInfo(),
      systemApi.getMemoryUsage(),
      systemApi.getCPUUsage(),
    ])

    if (healthRes.success) {
      healthInfo.value = healthRes
    }

    if (systemRes.success && systemRes.data) {
      systemInfo.value = systemRes.data
    }

    if (memoryRes.success && memoryRes.data) {
      memoryInfo.value = memoryRes.data
    }

    if (cpuRes.success && cpuRes.data) {
      cpuInfo.value = cpuRes.data
    }
  } catch (err: any) {
    error.value = err.message || '加载系统信息失败'
    console.error('加载系统信息失败:', err)
  } finally {
    loading.value = false
  }
}

function formatTimestamp(timestamp?: string): string {
  if (!timestamp) return '-'
  try {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN')
  } catch {
    return timestamp
  }
}

function formatUptime(seconds?: number): string {
  if (!seconds) return '-'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  const parts = []
  if (days > 0) parts.push(`${days}天`)
  if (hours > 0) parts.push(`${hours}小时`)
  if (minutes > 0) parts.push(`${minutes}分钟`)
  parts.push(`${secs}秒`)

  return parts.join(' ')
}

function getUsageClass(percent: number): string {
  if (percent >= 90) return 'critical'
  if (percent >= 70) return 'warning'
  return 'normal'
}

onMounted(() => {
  loadSystemInfo()
})
</script>

<style scoped>
.home-page {
  padding: var(--content-padding);
  background: var(--content-bg);
  color: var(--color-text-primary);
  transition: background-color 0.3s ease, color 0.3s ease;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--size-spacing-xl);
}

.page-header h1 {
  margin: 0;
  font-size: var(--font-size-2xl);
  font-weight: var(--size-font-weight-semibold);
  color: var(--color-text-primary);
}

.refresh-btn {
  padding: var(--size-spacing-sm) var(--size-spacing-lg);
  background: var(--theme-color-primary);
  color: var(--color-text-inverse);
  border: none;
  border-radius: var(--size-radius-md);
  cursor: pointer;
  font-size: var(--font-size-base);
  transition: background-color 0.2s ease;
}

.refresh-btn:hover:not(:disabled) {
  background: var(--theme-color-primary-hover);
}

.refresh-btn:disabled {
  background: var(--color-gray-300);
  cursor: not-allowed;
  opacity: 0.6;
}

.error-message {
  padding: var(--size-spacing-md);
  background: var(--color-danger-light);
  border: 1px solid var(--color-danger-default);
  border-radius: var(--size-radius-md);
  color: var(--color-danger-default);
  margin-bottom: var(--size-spacing-xl);
}

.loading {
  padding: var(--size-spacing-3xl);
  text-align: center;
  color: var(--color-text-secondary);
}

.system-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--size-spacing-xl);
}

.info-card {
  background: var(--color-bg-container);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-lg);
  padding: var(--size-spacing-xl);
  box-shadow: var(--shadow-sm);
  transition: background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
}

.info-card h2 {
  margin: 0 0 var(--size-spacing-lg) 0;
  font-size: var(--font-size-xl);
  font-weight: var(--size-font-weight-semibold);
  color: var(--color-text-primary);
  border-bottom: 2px solid var(--color-border-light);
  padding-bottom: var(--size-spacing-sm);
  transition: color 0.3s ease, border-color 0.3s ease;
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-sm);
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--size-spacing-sm) 0;
}

.label {
  font-weight: var(--size-font-weight-medium);
  color: var(--color-text-secondary);
  min-width: 100px;
  transition: color 0.3s ease;
}

.value {
  color: var(--color-text-primary);
  text-align: right;
  flex: 1;
  transition: color 0.3s ease;
}

.value.status {
  padding: 4px var(--size-spacing-sm);
  border-radius: var(--size-radius-full);
  font-size: var(--font-size-sm);
  font-weight: var(--size-font-weight-medium);
}

.value.status.healthy {
  background: var(--color-success-light);
  color: var(--color-success-default);
}

.value.status.unhealthy {
  background: var(--color-danger-light);
  color: var(--color-danger-default);
}

.usage-percent {
  font-weight: var(--size-font-weight-semibold);
  font-size: var(--font-size-lg);
}

.usage-percent.normal {
  color: var(--color-success-default);
}

.usage-percent.warning {
  color: var(--color-warning-default);
}

.usage-percent.critical {
  color: var(--color-danger-default);
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--color-bg-component);
  border-radius: var(--size-radius-full);
  overflow: hidden;
  margin-top: var(--size-spacing-sm);
  transition: background-color 0.3s ease;
}

.progress-fill {
  height: 100%;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.progress-fill.normal {
  background: var(--color-success-default);
}

.progress-fill.warning {
  background: var(--color-warning-default);
}

.progress-fill.critical {
  background: var(--color-danger-default);
}

/* 暗黑模式下的特殊调整 */
:global(.dark-mode) .info-card {
  box-shadow: var(--shadow-md);
}

:global(.dark-mode) .progress-bar {
  background: var(--color-gray-800);
}
</style>

