<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="modal-overlay"
        @click.self="handleClose"
      >
        <div class="modal-backdrop"></div>
        <div class="modal-container">
          <div
            class="modal-content"
            :class="sizeClasses"
          >
            <div v-if="title || $slots.header" class="modal-header">
              <slot name="header">
                <div class="header-content">
                  <h3 class="modal-title">{{ title }}</h3>
                  <button
                    v-if="closable"
                    class="modal-close-btn"
                    @click="handleClose"
                  >
                    <svg class="close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </slot>
            </div>
            
            <div class="modal-body">
              <slot></slot>
            </div>
            
            <div v-if="$slots.footer" class="modal-footer">
              <slot name="footer"></slot>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'

interface Props {
  modelValue: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  closable: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
}>()

const sizeClasses = computed(() => {
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }
  return sizes[props.size]
})

function handleClose() {
  if (props.closable) {
    emit('update:modelValue', false)
    emit('close')
  }
}

// 防止背景滚动
watch(() => props.modelValue, (value) => {
  if (value) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--size-spacing-lg);
  overflow-y: auto;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9998;
  backdrop-filter: blur(2px);
}

.modal-container {
  position: relative;
  z-index: 9999;
  width: 100%;
  max-width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: var(--size-spacing-lg);
}

.modal-content {
  position: relative;
  background: var(--color-bg-container, #ffffff);
  border-radius: var(--size-radius-lg, 8px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border-light, #e5e7eb);
}

.modal-header {
  padding: var(--size-spacing-lg);
  border-bottom: 1px solid var(--color-border-light);
  flex-shrink: 0;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  font-size: var(--font-size-lg);
  font-weight: var(--size-font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0;
}

.modal-close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: var(--size-radius-sm);
  transition: all 0.2s ease;
}

.modal-close-btn:hover {
  background: var(--color-bg-component-hover);
  color: var(--color-text-primary);
}

.close-icon {
  width: 20px;
  height: 20px;
}

.modal-body {
  padding: var(--size-spacing-lg);
  flex: 1;
  overflow-y: auto;
}

.modal-footer {
  padding: var(--size-spacing-lg);
  border-top: 1px solid var(--color-border-light);
  display: flex;
  justify-content: flex-end;
  gap: var(--size-spacing-md);
  flex-shrink: 0;
}

/* 动画 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.95);
  opacity: 0;
}
</style>



































