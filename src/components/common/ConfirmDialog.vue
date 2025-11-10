<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="modelValue" class="dialog-overlay" @click="handleOverlayClick">
        <div class="dialog-container" @click.stop>
          <div class="dialog-header">
            <h3 class="dialog-title">{{ title }}</h3>
            <button 
              v-if="showClose" 
              class="dialog-close" 
              @click="handleCancel"
              aria-label="关闭"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="dialog-body">
            <div v-if="icon" class="dialog-icon" :class="type">
              <!-- Warning Icon -->
              <svg v-if="type === 'warning'" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <!-- Danger Icon -->
              <svg v-else-if="type === 'danger'" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <!-- Info Icon -->
              <svg v-else-if="type === 'info'" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <!-- Success Icon -->
              <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <div class="dialog-content">
              <p class="dialog-message">{{ message }}</p>
              <p v-if="description" class="dialog-description">{{ description }}</p>
            </div>
          </div>

          <div class="dialog-footer">
            <button 
              class="btn btn-secondary" 
              @click="handleCancel"
              :disabled="loading"
            >
              {{ cancelText }}
            </button>
            <button 
              class="btn btn-primary" 
              :class="type"
              @click="handleConfirm"
              :disabled="loading"
            >
              <span v-if="loading" class="btn-spinner"></span>
              {{ loading ? loadingText : confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  /**
   * 是否显示对话框
   */
  modelValue: boolean
  /**
   * 对话框类型
   */
  type?: 'info' | 'warning' | 'danger' | 'success'
  /**
   * 标题
   */
  title?: string
  /**
   * 消息内容
   */
  message: string
  /**
   * 描述信息
   */
  description?: string
  /**
   * 确认按钮文本
   */
  confirmText?: string
  /**
   * 取消按钮文本
   */
  cancelText?: string
  /**
   * 加载中文本
   */
  loadingText?: string
  /**
   * 是否显示图标
   */
  icon?: boolean
  /**
   * 是否显示关闭按钮
   */
  showClose?: boolean
  /**
   * 点击遮罩层是否关闭
   */
  closeOnOverlay?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm'): void | Promise<void>
  (e: 'cancel'): void
}>()

const loading = ref(false)

async function handleConfirm() {
  loading.value = true
  try {
    await emit('confirm')
    emit('update:modelValue', false)
  } catch (error) {
    // 如果确认操作失败，不关闭对话框
    console.error('Confirm action failed:', error)
  } finally {
    loading.value = false
  }
}

function handleCancel() {
  emit('cancel')
  emit('update:modelValue', false)
}

function handleOverlayClick() {
  if (props.closeOnOverlay ?? true) {
    handleCancel()
  }
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.dialog-container {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 28rem;
  width: 100%;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.dialog-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
}

.dialog-close {
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: none;
  background: none;
  color: #6b7280;
  cursor: pointer;
  transition: color 0.2s;
}

.dialog-close:hover {
  color: #111827;
}

.dialog-body {
  padding: 1.5rem;
  display: flex;
  gap: 1rem;
}

.dialog-icon {
  flex-shrink: 0;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-icon svg {
  width: 2rem;
  height: 2rem;
}

.dialog-icon.info {
  background-color: #dbeafe;
  color: #3b82f6;
}

.dialog-icon.warning {
  background-color: #fef3c7;
  color: #f59e0b;
}

.dialog-icon.danger {
  background-color: #fee2e2;
  color: #ef4444;
}

.dialog-icon.success {
  background-color: #d1fae5;
  color: #10b981;
}

.dialog-content {
  flex: 1;
}

.dialog-message {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  font-weight: 500;
  color: #111827;
}

.dialog-description {
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.5;
}

.dialog-footer {
  padding: 1rem 1.5rem;
  background-color: #f9fafb;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.btn {
  padding: 0.5rem 1rem;
  border: 1px solid;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: white;
  border-color: #d1d5db;
  color: #374151;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #f9fafb;
}

.btn-primary {
  background-color: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #2563eb;
}

.btn-primary.danger {
  background-color: #ef4444;
  border-color: #ef4444;
}

.btn-primary.danger:hover:not(:disabled) {
  background-color: #dc2626;
}

.btn-primary.warning {
  background-color: #f59e0b;
  border-color: #f59e0b;
}

.btn-primary.warning:hover:not(:disabled) {
  background-color: #d97706;
}

.btn-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Transition */
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.3s ease;
}

.dialog-enter-active .dialog-container,
.dialog-leave-active .dialog-container {
  transition: transform 0.3s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-from .dialog-container,
.dialog-leave-to .dialog-container {
  transform: scale(0.95);
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .dialog-container {
    background-color: #1f2937;
  }

  .dialog-header {
    border-bottom-color: #374151;
  }

  .dialog-title {
    color: #f9fafb;
  }

  .dialog-close {
    color: #9ca3af;
  }

  .dialog-close:hover {
    color: #f9fafb;
  }

  .dialog-message {
    color: #f9fafb;
  }

  .dialog-description {
    color: #9ca3af;
  }

  .dialog-footer {
    background-color: #111827;
  }

  .btn-secondary {
    background-color: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }

  .btn-secondary:hover:not(:disabled) {
    background-color: #4b5563;
  }
}
</style>
