<template>
  <div :class="['skeleton', `skeleton--${variant}`, { 'skeleton--animated': animated }]" :style="skeletonStyle">
    <template v-if="variant === 'text'">
      <div v-for="i in lines" :key="i" class="skeleton-text-line" :style="lineStyle(i)" />
    </template>
    <template v-else-if="variant === 'card'">
      <div class="skeleton-card">
        <div class="skeleton-card-header" />
        <div class="skeleton-card-body">
          <div v-for="i in 3" :key="i" class="skeleton-text-line" :style="lineStyle(i)" />
        </div>
      </div>
    </template>
    <template v-else-if="variant === 'list'">
      <div class="skeleton-list">
        <div v-for="i in lines" :key="i" class="skeleton-list-item">
          <div class="skeleton-avatar" />
          <div class="skeleton-content">
            <div class="skeleton-text-line" :style="{ width: '60%' }" />
            <div class="skeleton-text-line" :style="{ width: '40%', marginTop: '8px' }" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'text' | 'card' | 'list' | 'custom'
  lines?: number
  width?: string | number
  height?: string | number
  animated?: boolean
  borderRadius?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'text',
  lines: 3,
  width: '100%',
  height: undefined,
  animated: true,
  borderRadius: '4px',
})

const skeletonStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.width) {
    style.width = typeof props.width === 'number' ? `${props.width}px` : props.width
  }
  if (props.height) {
    style.height = typeof props.height === 'number' ? `${props.height}px` : props.height
  }
  if (props.borderRadius) {
    style.borderRadius = props.borderRadius
  }
  return style
})

function lineStyle(index: number) {
  const widths = ['100%', '90%', '80%', '70%', '60%']
  return {
    width: widths[index - 1] || '100%',
    height: '16px',
    marginBottom: index < props.lines ? '8px' : '0',
  }
}
</script>

<style scoped>
.skeleton {
  background: transparent;
  border-radius: 4px;
}

.skeleton--animated {
  position: relative;
  overflow: hidden;
}

.skeleton--animated::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.4),
    transparent
  );
  animation: skeleton-shimmer 1.5s infinite;
}

@keyframes skeleton-shimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

.skeleton-text-line {
  background: #e5e7eb;
  border-radius: 4px;
  height: 16px;
  width: 100%;
}

.skeleton-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.skeleton-card-header {
  width: 100%;
  height: 120px;
  background: #e5e7eb;
  border-radius: 8px;
}

.skeleton-card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skeleton-list-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.skeleton-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #e5e7eb;
  flex-shrink: 0;
}

.skeleton-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>

