<template>
  <div class="build-status-dialog-overlay" @click="emit('close')">
    <div class="build-status-dialog" @click.stop>
      <div class="dialog-header">
        <h3>打包详情</h3>
        <button class="close-btn" @click="emit('close')">×</button>
      </div>
      <div class="dialog-content">
        <div class="status-section">
          <div class="status-item">
            <span class="label">环境:</span>
            <span class="value">{{ getEnvironmentLabel(environment) }}</span>
          </div>
          <div class="status-item">
            <span class="label">打包目录:</span>
            <span class="value">{{ status.buildDir }}</span>
          </div>
          <div class="status-item">
            <span class="label">打包时间:</span>
            <span class="value">{{ buildTimeText }}</span>
          </div>
          <div class="status-item">
            <span class="label">文件数量:</span>
            <span class="value">{{ status.fileCount || 0 }} 个文件</span>
          </div>
          <div class="status-item">
            <span class="label">总大小:</span>
            <span class="value">{{ formatSize(status.totalSize || 0) }}</span>
          </div>
        </div>
        
        <div class="files-section">
          <h4>文件列表</h4>
          <div class="files-list">
            <FileTreeItem
              v-for="file in status.files"
              :key="file.path"
              :node="file"
              :level="0"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import FileTreeItem from './FileTreeItem.vue'

interface FileNode {
  name: string
  path: string
  size: number
  type: 'file' | 'directory'
  children?: FileNode[]
}

interface Props {
  status: {
    built: boolean
    buildTime?: number
    buildDir?: string
    files?: FileNode[]
    totalSize?: number
    fileCount?: number
  }
  environment?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

function getEnvironmentLabel(env?: string): string {
  if (!env) return '生产环境'
  const envMap: Record<string, string> = {
    development: '开发环境',
    production: '生产环境',
    staging: '预发布环境',
    test: '测试环境',
    preview: '预览环境',
  }
  return envMap[env] || env
}

const buildTimeText = computed(() => {
  if (!props.status.buildTime) return '未知时间'
  const date = new Date(props.status.buildTime)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
})

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}
</script>

<style scoped>
.build-status-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.build-status-dialog {
  background: var(--color-bg, #fff);
  border-radius: var(--size-radius-lg, 12px);
  box-shadow: var(--shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.15));
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border, #e8e8e8);
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text, #333);
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--color-text-secondary, #666);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--size-radius-sm, 4px);
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: var(--color-bg-hover, #f5f5f5);
  color: var(--color-text, #333);
}

.dialog-content {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.status-section {
  margin-bottom: 24px;
}

.status-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border-light, #f0f0f0);
}

.status-item:last-child {
  border-bottom: none;
}

.status-item .label {
  font-weight: 600;
  color: var(--color-text-secondary, #666);
  width: 100px;
  flex-shrink: 0;
}

.status-item .value {
  color: var(--color-text, #333);
  flex: 1;
  word-break: break-all;
}

.files-section h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text, #333);
}

.files-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--color-border, #e8e8e8);
  border-radius: var(--size-radius-md, 8px);
  padding: 8px;
}

</style>

