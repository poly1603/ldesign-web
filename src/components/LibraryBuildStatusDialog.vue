<template>
  <div class="build-status-dialog-overlay" @click="emit('close')">
    <div class="build-status-dialog" @click.stop>
      <div class="dialog-header">
        <h3>打包产物详情</h3>
        <button class="close-btn" @click="emit('close')">×</button>
      </div>
      <div class="dialog-content">
        <div class="status-section">
          <div class="status-item">
            <span class="label">打包时间:</span>
            <span class="value">{{ buildTimeText }}</span>
          </div>
          <div class="status-item">
            <span class="label">总文件数:</span>
            <span class="value">{{ status.totalFileCount || 0 }} 个文件</span>
          </div>
          <div class="status-item">
            <span class="label">总大小:</span>
            <span class="value">{{ formatSize(status.totalSize || 0) }}</span>
          </div>
          <div class="status-item">
            <span class="label">输出目录数:</span>
            <span class="value">{{ status.buildDirs?.length || 0 }} 个目录</span>
          </div>
        </div>
        
        <div class="directories-section">
          <h4>输出目录</h4>
          <div class="directories-list">
            <div
              v-for="dir in status.buildDirs"
              :key="dir.name"
              class="directory-item"
            >
              <div class="directory-header">
                <span class="directory-name">{{ dir.name }}</span>
                <span class="directory-info">
                  {{ dir.fileCount || 0 }} 个文件 · {{ formatSize(dir.totalSize || 0) }}
                </span>
              </div>
              <div class="directory-path">{{ dir.path }}</div>
              <div class="directory-files">
                <FileTreeItem
                  v-for="file in dir.files"
                  :key="file.path"
                  :node="file"
                  :level="0"
                />
              </div>
            </div>
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
    buildDirs?: Array<{
      name: string
      path: string
      files?: FileNode[]
      totalSize?: number
      fileCount?: number
    }>
    totalSize?: number
    totalFileCount?: number
  }
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

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
  max-width: 800px;
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
  width: 120px;
  flex-shrink: 0;
}

.status-item .value {
  color: var(--color-text, #333);
  flex: 1;
  word-break: break-all;
}

.directories-section h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text, #333);
}

.directories-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.directory-item {
  border: 1px solid var(--color-border, #e8e8e8);
  border-radius: var(--size-radius-md, 8px);
  padding: 12px;
  background: var(--color-bg-container, #fafafa);
}

.directory-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.directory-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--color-text, #333);
}

.directory-info {
  font-size: 12px;
  color: var(--color-text-secondary, #666);
}

.directory-path {
  font-size: 12px;
  color: var(--color-text-tertiary, #999);
  margin-bottom: 12px;
  word-break: break-all;
}

.directory-files {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--color-border-light, #f0f0f0);
  border-radius: var(--size-radius-sm, 4px);
  padding: 8px;
  background: var(--color-bg, #fff);
}
</style>













