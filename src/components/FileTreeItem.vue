<template>
  <div>
    <div
      class="file-item"
      :class="{ 'is-directory': node.type === 'directory', 'is-expanded': isExpanded }"
      :style="{ paddingLeft: `${level * 20 + 8}px` }"
      @click="handleClick"
    >
      <template v-if="node.type === 'directory'">
        <ChevronDown v-if="isExpanded" :size="14" class="file-expand-icon" />
        <ChevronRight v-else :size="14" class="file-expand-icon" />
        <FolderOpen v-if="isExpanded" :size="16" class="file-icon" />
        <Folder v-else :size="16" class="file-icon" />
      </template>
      <template v-else>
        <span class="file-expand-icon" style="width: 14px; display: inline-block;"></span>
        <File :size="16" class="file-icon" />
      </template>
      <span class="file-name">{{ node.name }}</span>
      <span class="file-size">{{ formatSize(node.size) }}</span>
    </div>
    <template v-if="node.type === 'directory' && isExpanded && node.children">
      <FileTreeItem
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :level="level + 1"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ChevronRight, ChevronDown, Folder, FolderOpen, File } from 'lucide-vue-next'

interface FileNode {
  name: string
  path: string
  size: number
  type: 'file' | 'directory'
  children?: FileNode[]
}

interface Props {
  node: FileNode
  level?: number
}

const props = withDefaults(defineProps<Props>(), {
  level: 0,
})

const isExpanded = ref(false)

function handleClick() {
  if (props.node.type === 'directory') {
    isExpanded.value = !isExpanded.value
  }
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}
</script>

<style scoped>
.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: var(--size-radius-sm, 4px);
  transition: background 0.2s ease;
  cursor: pointer;
  user-select: none;
}

.file-item:hover {
  background: var(--color-bg-hover, #f5f5f5);
}

.file-item.is-directory {
  font-weight: 500;
}

.file-expand-icon {
  flex-shrink: 0;
  color: var(--color-text-secondary, #666);
  display: flex;
  align-items: center;
}

.file-icon {
  flex-shrink: 0;
  color: var(--color-text-secondary, #666);
}

.file-item.is-directory .file-icon {
  color: var(--theme-color-primary, #1890ff);
}

.file-name {
  flex: 1;
  color: var(--color-text, #333);
  word-break: break-all;
  font-size: 13px;
}

.file-size {
  font-size: 12px;
  color: var(--color-text-tertiary, #999);
  flex-shrink: 0;
  margin-left: auto;
}
</style>














