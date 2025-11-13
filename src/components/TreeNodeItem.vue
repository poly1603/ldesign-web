<script setup lang="ts">
import { FolderIcon, ChevronRightIcon, ChevronDownIcon } from 'tdesign-icons-vue-next'

interface TreeNode {
  path: string
  name: string
  children?: TreeNode[]
  expanded?: boolean
  loading?: boolean
  loaded?: boolean
  isDirectory?: boolean
}

defineProps<{
  node: TreeNode
  selectedPath: string
  apiBase: string
}>()

const emit = defineEmits<{
  toggle: [node: TreeNode]
  select: [node: TreeNode]
}>()

const handleToggle = (node: TreeNode) => {
  emit('toggle', node)
}

const handleSelect = (node: TreeNode) => {
  emit('select', node)
}
</script>

<template>
  <div class="tree-node-wrapper">
    <div
      class="tree-node"
      :class="{ selected: selectedPath === node.path }"
      @click="handleSelect(node)"
    >
      <span class="expand-icon" @click.stop="handleToggle(node)">
        <t-loading v-if="node.loading" size="small" />
        <ChevronDownIcon v-else-if="node.expanded" />
        <ChevronRightIcon v-else />
      </span>
      <FolderIcon class="folder-icon" />
      <span class="node-name">{{ node.name }}</span>
    </div>
    <div v-if="node.expanded && node.children" class="tree-children">
      <TreeNodeItem
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :selectedPath="selectedPath"
        :apiBase="apiBase"
        @toggle="$emit('toggle', $event)"
        @select="$emit('select', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.tree-node-wrapper {
  width: 100%;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  cursor: pointer;
  transition: background 0.2s;
  border-radius: 4px;
  user-select: none;
}

.tree-node:hover {
  background: #f5f5f5;
}

.tree-node.selected {
  background: #e6f2ff;
  color: #0052d9;
}

.expand-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  cursor: pointer;
  flex-shrink: 0;
}

.expand-icon:hover {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.folder-icon {
  flex-shrink: 0;
  color: #faad14;
}

.node-name {
  flex: 1;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-children {
  padding-left: 20px;
  margin-left: 4px;
  border-left: 1px solid #e7e7e7;
}
</style>
