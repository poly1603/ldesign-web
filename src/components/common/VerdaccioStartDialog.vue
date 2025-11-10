<template>
  <Modal
    v-model="visible"
    :title="title"
    size="lg"
    @close="handleClose"
  >
    <div class="verdaccio-start-dialog">
      <!-- 状态显示 -->
      <div class="status-section">
        <div class="status-indicator" :class="`status-${status}`">
          <div v-if="status === 'starting'" class="spinner"></div>
          <div v-else-if="status === 'success'" class="success-icon">✓</div>
          <div v-else-if="status === 'error'" class="error-icon">✗</div>
        </div>
        <div class="status-text">
          <div class="status-title">{{ statusTitle }}</div>
          <div v-if="statusMessage" class="status-message">{{ statusMessage }}</div>
        </div>
      </div>

      <!-- 日志显示区域 -->
      <div class="logs-section">
        <div class="logs-header">
          <span>{{ logTitle }}</span>
          <button 
            v-if="logs.length > 0" 
            class="btn-clear-logs" 
            @click="logs = []"
          >
            清空
          </button>
        </div>
        <div class="logs-content" ref="logsContainer">
          <div 
            v-for="(log, index) in logs" 
            :key="index" 
            class="log-item"
            :class="`log-${log.type}`"
          >
            <span class="log-time">{{ log.time }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
          <div v-if="logs.length === 0" class="logs-empty">
            等待启动日志...
          </div>
        </div>
      </div>

      <!-- 错误详情 -->
      <div v-if="errorDetails" class="error-section">
        <div class="error-title">错误详情：</div>
        <div class="error-content">{{ errorDetails }}</div>
      </div>
    </div>

    <template #footer>
      <button 
        v-if="status === 'success'" 
        class="btn-primary" 
        @click="handleClose"
      >
        关闭
      </button>
      <button 
        v-else-if="status === 'error'" 
        class="btn-secondary" 
        @click="handleClose"
      >
        关闭
      </button>
      <button 
        v-else 
        class="btn-secondary" 
        @click="handleCancel"
        :disabled="!canCancel"
      >
        取消
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import Modal from './Modal.vue'

interface LogEntry {
  time: string
  message: string
  type: 'info' | 'success' | 'error' | 'warning'
}

const props = withDefaults(defineProps<{
  modelValue: boolean
  title?: string
  logTitle?: string
}>(), {
  title: '启动本地 Verdaccio 服务',
  logTitle: '启动日志',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'close': []
  'cancel': []
}>()

const visible = ref(props.modelValue)
const status = ref<'idle' | 'starting' | 'success' | 'error'>('idle')
const statusTitle = ref('准备启动')
const statusMessage = ref('')
const logs = ref<LogEntry[]>([])
const errorDetails = ref('')
const canCancel = ref(true)
const logsContainer = ref<HTMLElement | null>(null)

watch(() => props.modelValue, (newVal) => {
  visible.value = newVal
  if (newVal) {
    reset()
  }
})

watch(visible, (newVal) => {
  emit('update:modelValue', newVal)
})

watch(logs, () => {
  // 自动滚动到底部
  nextTick(() => {
    if (logsContainer.value) {
      logsContainer.value.scrollTop = logsContainer.value.scrollHeight
    }
  })
}, { deep: true })

function reset() {
  status.value = 'idle'
  statusTitle.value = '准备启动'
  statusMessage.value = ''
  logs.value = []
  errorDetails.value = ''
  canCancel.value = true
}

function addLog(message: string, type: LogEntry['type'] = 'info') {
  const time = new Date().toLocaleTimeString('zh-CN')
  logs.value.push({ time, message, type })
}

function setStatus(
  newStatus: 'idle' | 'starting' | 'success' | 'error',
  title: string,
  message: string = '',
  error: string = ''
) {
  status.value = newStatus
  statusTitle.value = title
  statusMessage.value = message
  errorDetails.value = error
  canCancel.value = newStatus !== 'success' && newStatus !== 'error'
}

function handleClose() {
  visible.value = false
  emit('close')
}

function handleCancel() {
  if (canCancel.value) {
    visible.value = false
    emit('cancel')
  }
}

// 暴露方法供父组件调用
defineExpose({
  addLog,
  setStatus,
  reset,
})
</script>

<style scoped>
.verdaccio-start-dialog {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-lg);
  min-height: 400px;
}

.status-section {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-md);
  padding: var(--size-spacing-md);
  background: var(--color-bg-component);
  border-radius: var(--size-radius-md);
}

.status-indicator {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.status-idle {
  background: var(--color-bg-component);
  color: var(--color-text-secondary);
}

.status-starting {
  background: var(--theme-color-primary-light);
  color: var(--theme-color-primary);
}

.status-success {
  background: var(--color-success-light);
  color: var(--color-success-default);
}

.status-error {
  background: var(--color-danger-light);
  color: var(--color-danger-default);
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid var(--theme-color-primary-light);
  border-top-color: var(--theme-color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.success-icon,
.error-icon {
  font-size: 24px;
  font-weight: bold;
}

.status-text {
  flex: 1;
}

.status-title {
  font-size: var(--font-size-lg);
  font-weight: var(--size-font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--size-spacing-xs);
}

.status-message {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.logs-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 200px;
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  overflow: hidden;
}

.logs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  background: var(--color-bg-component);
  border-bottom: 1px solid var(--color-border-light);
  font-size: var(--font-size-sm);
  font-weight: var(--size-font-weight-medium);
  color: var(--color-text-primary);
}

.btn-clear-logs {
  padding: 2px 8px;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  border-radius: var(--size-radius-sm);
}

.btn-clear-logs:hover {
  background: var(--color-bg-component-hover);
  color: var(--color-text-primary);
}

.logs-content {
  flex: 1;
  padding: var(--size-spacing-sm);
  overflow-y: auto;
  background: var(--color-bg-container);
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: var(--font-size-xs);
  line-height: 1.6;
}

.log-item {
  display: flex;
  gap: var(--size-spacing-sm);
  margin-bottom: var(--size-spacing-xs);
  padding: 2px 0;
}

.log-time {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
  min-width: 80px;
}

.log-message {
  color: var(--color-text-primary);
  flex: 1;
}

.log-info .log-message {
  color: var(--color-text-secondary);
}

.log-success .log-message {
  color: var(--color-success-default);
}

.log-error .log-message {
  color: var(--color-danger-default);
}

.log-warning .log-message {
  color: #ff9800;
}

.logs-empty {
  text-align: center;
  color: var(--color-text-tertiary);
  padding: var(--size-spacing-xl);
}

.error-section {
  padding: var(--size-spacing-md);
  background: var(--color-danger-light);
  border-radius: var(--size-radius-md);
  border: 1px solid var(--color-danger-default);
}

.error-title {
  font-weight: var(--size-font-weight-semibold);
  color: var(--color-danger-default);
  margin-bottom: var(--size-spacing-xs);
}

.error-content {
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  white-space: pre-wrap;
  word-break: break-all;
}

.btn-primary,
.btn-secondary {
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  border: none;
  border-radius: var(--size-radius-md);
  font-size: var(--font-size-base);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: var(--theme-color-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--theme-color-primary-hover);
}

.btn-secondary {
  background: var(--color-bg-component);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-light);
}

.btn-secondary:hover {
  background: var(--color-bg-component-hover);
  border-color: var(--theme-color-primary);
}
</style>

