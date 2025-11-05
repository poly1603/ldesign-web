<template>
  <button
    :type="nativeType"
    :disabled="disabled || loading"
    :class="buttonClasses"
    @click="handleClick"
  >
    <span v-if="loading" class="mr-2">
      <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </span>
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'default'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  outlined?: boolean
  nativeType?: 'button' | 'submit' | 'reset'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'default',
  size: 'md',
  disabled: false,
  loading: false,
  outlined: false,
  nativeType: 'button',
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const buttonClasses = computed(() => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2'
  
  // 尺寸
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }
  
  // 类型样式
  const typeClasses = props.outlined
    ? {
        primary: 'border-2 border-primary text-primary hover:bg-primary hover:text-white focus:ring-primary',
        success: 'border-2 border-success text-success hover:bg-success hover:text-white focus:ring-success',
        warning: 'border-2 border-warning text-warning hover:bg-warning hover:text-white focus:ring-warning',
        danger: 'border-2 border-danger text-danger hover:bg-danger hover:text-white focus:ring-danger',
        default: 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-300',
      }
    : {
        primary: 'bg-primary text-white hover:bg-primary-600 focus:ring-primary',
        success: 'bg-success text-white hover:bg-success-600 focus:ring-success',
        warning: 'bg-warning text-white hover:bg-warning-600 focus:ring-warning',
        danger: 'bg-danger text-white hover:bg-danger-600 focus:ring-danger',
        default: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-300',
      }
  
  // 禁用状态
  const disabledClasses = props.disabled || props.loading
    ? 'opacity-50 cursor-not-allowed'
    : 'cursor-pointer'
  
  return [
    baseClasses,
    sizeClasses[props.size],
    typeClasses[props.type],
    disabledClasses,
  ].join(' ')
})

function handleClick(event: MouseEvent) {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}
</script>




















