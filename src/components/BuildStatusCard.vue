<template>
  <div class="build-status-card" @click="emit('click')">
    <CheckCircle2 :size="16" class="build-status-icon" />
    <span class="build-status-text">已打包</span>
    <span class="build-status-time">{{ buildTimeText }}</span>
    <ChevronRight :size="14" class="build-status-arrow" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CheckCircle2, ChevronRight } from 'lucide-vue-next'

interface Props {
  status: {
    built: boolean
    buildTime?: number
    buildDir?: string
    files?: Array<{ name: string; size: number; type: 'file' | 'directory' }>
    totalSize?: number
    fileCount?: number
  }
  environment?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  click: []
}>()

const buildTimeText = computed(() => {
  if (!props.status.buildTime) return '未知时间'
  const date = new Date(props.status.buildTime)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) {
    return `${days} 天前`
  } else if (hours > 0) {
    return `${hours} 小时前`
  } else if (minutes > 0) {
    return `${minutes} 分钟前`
  } else {
    return '刚刚'
  }
})
</script>

<style scoped>
.build-status-card {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px 4px 6px;
  background: var(--color-success-light, #f6ffed);
  border: 1px solid var(--color-success-border, #b7eb8f);
  border-radius: var(--size-radius-sm, 4px);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
  line-height: 1.4;
}

.build-status-card:hover {
  background: var(--color-success-hover, #f0f9e8);
  border-color: var(--color-success-default, #52c41a);
  box-shadow: var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.1));
}

.build-status-icon {
  color: var(--color-success-default, #52c41a);
  flex-shrink: 0;
}

.build-status-text {
  font-weight: 500;
  color: var(--color-success-default, #52c41a);
  white-space: nowrap;
}

.build-status-time {
  font-size: 11px;
  color: var(--color-text-secondary, #666);
  white-space: nowrap;
}

.build-status-arrow {
  color: var(--color-text-tertiary, #999);
  flex-shrink: 0;
  margin-left: 2px;
}
</style>
