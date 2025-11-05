<template>
  <Transition name="toast">
    <div v-if="visible" class="toast" :class="[type]">
      <span class="toast-icon">{{ icon }}</span>
      <span class="toast-message">{{ message }}</span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'

export interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

const props = withDefaults(defineProps<ToastProps>(), {
  type: 'info',
  duration: 3000,
})

const visible = ref(false)

const icon = computed(() => {
  const icons = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ',
  }
  return icons[props.type]
})

let timer: NodeJS.Timeout | null = null

const show = () => {
  visible.value = true
  
  if (timer) {
    clearTimeout(timer)
  }
  
  timer = setTimeout(() => {
    visible.value = false
  }, props.duration)
}

const hide = () => {
  visible.value = false
  if (timer) {
    clearTimeout(timer)
  }
}

watch(() => props.message, () => {
  if (props.message) {
    show()
  }
})

defineExpose({
  show,
  hide,
})
</script>

<style scoped>
.toast {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 12px 20px;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 200px;
  max-width: 400px;
  z-index: 9999;
  font-size: 14px;
}

.toast-icon {
  font-size: 18px;
  font-weight: bold;
}

.toast.success {
  background: #4CAF50;
  color: white;
}

.toast.error {
  background: #f44336;
  color: white;
}

.toast.warning {
  background: #ff9800;
  color: white;
}

.toast.info {
  background: #2196F3;
  color: white;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
