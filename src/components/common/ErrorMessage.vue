<template>
  <div :class="['error-message', type, { dismissible }]" v-if="modelValue">
    <div class="error-content">
      <div class="error-icon">
        <svg v-if="type === 'error'" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <svg v-else-if="type === 'warning'" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <svg v-else-if="type === 'info'" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      
      <div class="error-text">
        <p class="error-title" v-if="title">{{ title }}</p>
        <p class="error-description">{{ message }}</p>
        <details v-if="details" class="error-details">
          <summary>详细信息</summary>
          <pre>{{ details }}</pre>
        </details>
      </div>

      <button v-if="dismissible" class="error-close" @click="close" aria-label="关闭">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <div v-if="retry" class="error-actions">
      <button class="btn-retry" @click="$emit('retry')">
        重试
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  /**
   * 是否显示
   */
  modelValue: boolean
  /**
   * 错误类型
   */
  type?: 'error' | 'warning' | 'info'
  /**
   * 标题
   */
  title?: string
  /**
   * 错误消息
   */
  message: string
  /**
   * 详细信息
   */
  details?: string
  /**
   * 是否可关闭
   */
  dismissible?: boolean
  /**
   * 是否显示重试按钮
   */
  retry?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'retry'): void
}>()

function close() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.error-message {
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 1rem;
  border: 1px solid;
}

.error-message.error {
  background-color: #fef2f2;
  border-color: #fca5a5;
  color: #991b1b;
}

.error-message.warning {
  background-color: #fef9c3;
  border-color: #fde047;
  color: #854d0e;
}

.error-message.info {
  background-color: #dbeafe;
  border-color: #93c5fd;
  color: #1e40af;
}

.error-content {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.error-icon {
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
}

.error-icon svg {
  width: 100%;
  height: 100%;
}

.error-text {
  flex: 1;
}

.error-title {
  margin: 0 0 0.5rem 0;
  font-weight: 600;
  font-size: 1rem;
}

.error-description {
  margin: 0;
  font-size: 0.875rem;
}

.error-details {
  margin-top: 0.75rem;
  font-size: 0.75rem;
}

.error-details summary {
  cursor: pointer;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.error-details pre {
  margin: 0;
  padding: 0.5rem;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 0.25rem;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.error-close {
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.error-close:hover {
  opacity: 1;
}

.error-close svg {
  width: 100%;
  height: 100%;
}

.error-actions {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid currentColor;
  opacity: 0.3;
}

.btn-retry {
  padding: 0.5rem 1rem;
  border: 1px solid currentColor;
  background-color: transparent;
  color: inherit;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-retry:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .error-message.error {
    background-color: #7f1d1d;
    border-color: #991b1b;
    color: #fecaca;
  }

  .error-message.warning {
    background-color: #713f12;
    border-color: #854d0e;
    color: #fef08a;
  }

  .error-message.info {
    background-color: #1e3a8a;
    border-color: #1e40af;
    color: #bfdbfe;
  }

  .error-details pre {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .btn-retry:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
}
</style>
