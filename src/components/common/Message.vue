<template>
  <Teleport to="body">
    <TransitionGroup
      name="message"
      tag="div"
      class="message-container"
    >
      <div
        v-for="item in messageList"
        :key="item.id"
        class="message-item"
        :class="[`message--${item.type}`]"
      >
        <div class="message-icon">
          <component :is="getIcon(item.type)" :size="20" />
        </div>
        <div class="message-content">
          <p class="message-text">{{ item.message }}</p>
        </div>
        <button
          v-if="item.closable"
          class="message-close"
          @click="removeMessage(item.id)"
        >
          <X :size="16" />
        </button>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<script setup lang="ts">
import { onUnmounted } from 'vue'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-vue-next'
import { messageList, removeMessage, clearAll, type MessageItem } from '../../utils/message'

function getIcon(type: MessageItem['type']) {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  }
  return icons[type]
}

// 组件卸载时清理所有定时器
onUnmounted(() => {
  clearAll()
})
</script>

<style scoped>
.message-container {
  position: fixed;
  top: var(--size-spacing-lg);
  right: var(--size-spacing-lg);
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-sm);
  pointer-events: none;
  max-width: 400px;
}

.message-item {
  display: flex;
  align-items: flex-start;
  gap: var(--size-spacing-sm);
  padding: var(--size-spacing-md) var(--size-spacing-lg);
  background: white;
  border-radius: var(--size-radius-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  pointer-events: auto;
  min-width: 300px;
  max-width: 400px;
  animation: slideInRight 0.3s ease;
}

.message-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-top: 2px;
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message-text {
  margin: 0;
  font-size: var(--font-size-sm);
  line-height: 1.5;
  color: var(--color-text-primary);
  word-wrap: break-word;
  word-break: break-word;
}

.message-close {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: var(--size-radius-sm);
  transition: all 0.2s ease;
  margin-top: 2px;
}

.message-close:hover {
  background: var(--color-bg-component-hover);
  color: var(--color-text-primary);
}

/* 不同类型样式 */
.message--success {
  border-left: 4px solid var(--color-success-default);
}

.message--success .message-icon {
  color: var(--color-success-default);
}

.message--error {
  border-left: 4px solid var(--color-danger-default);
}

.message--error .message-icon {
  color: var(--color-danger-default);
}

.message--warning {
  border-left: 4px solid var(--color-warning-default);
}

.message--warning .message-icon {
  color: var(--color-warning-default);
}

.message--info {
  border-left: 4px solid var(--theme-color-primary);
}

.message--info .message-icon {
  color: var(--theme-color-primary);
}

/* 动画 */
.message-enter-active {
  transition: all 0.3s ease;
}

.message-leave-active {
  transition: all 0.3s ease;
}

.message-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.message-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 响应式 */
@media (max-width: 768px) {
  .message-container {
    top: var(--size-spacing-md);
    right: var(--size-spacing-md);
    left: var(--size-spacing-md);
    max-width: none;
  }
  
  .message-item {
    min-width: auto;
    max-width: none;
  }
}
</style>


