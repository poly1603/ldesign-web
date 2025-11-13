<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { FolderIcon, ChevronRightIcon, ChevronDownIcon } from 'tdesign-icons-vue-next'
import { MessagePlugin } from 'tdesign-vue-next'
import TreeNodeItem from './TreeNodeItem.vue'

interface TreeNode {
  path: string
  name: string
  children?: TreeNode[]
  expanded?: boolean
  loading?: boolean
  loaded?: boolean
  isDirectory?: boolean
}

const props = defineProps<{
  apiBase: string
}>()

const emit = defineEmits<{
  select: [path: string]
}>()

const treeData = ref<TreeNode[]>([])
const selectedPath = ref<string>('')
const loading = ref(false)

// 加载根目录（驱动器）
const loadRootDrives = async () => {
  loading.value = true
  try {
    const response = await fetch(`${props.apiBase}/projects/directories/list`)
    const result = await response.json()
    if (result.code === 200) {
      treeData.value = result.data.map((path: string) => ({
        path,
        name: path,
        children: [],
        expanded: false,
        loading: false,
        loaded: false,
        isDirectory: true
      }))
    }
  } catch (error) {
    MessagePlugin.error('加载驱动器列表失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 加载子目录
const loadChildren = async (node: TreeNode) => {
  if (node.loaded) {
    node.expanded = !node.expanded
    return
  }

  node.loading = true
  try {
    const response = await fetch(
      `${props.apiBase}/projects/directories/list?path=${encodeURIComponent(node.path)}`
    )
    const result = await response.json()
    if (result.code === 200) {
      node.children = result.data.map((path: string) => {
        const parts = path.split('\\')
        const name = parts[parts.length - 1] || path
        return {
          path,
          name,
          children: [],
          expanded: false,
          loading: false,
          loaded: false,
          isDirectory: true
        }
      })
      node.loaded = true
      node.expanded = true
    }
  } catch (error) {
    MessagePlugin.error('加载子目录失败')
    console.error(error)
  } finally {
    node.loading = false
  }
}

// 切换节点展开/折叠
const toggleNode = async (node: TreeNode) => {
  if (node.loading) return
  await loadChildren(node)
}

// 选择节点
const selectNode = (node: TreeNode) => {
  selectedPath.value = node.path
  emit('select', node.path)
}

onMounted(() => {
  loadRootDrives()
})
</script>

<template>
  <div class="directory-tree">
    <div v-if="loading" class="tree-loading">
      <t-loading text="加载中..." size="small" />
    </div>
    <div v-else class="tree-container">
      <div
        v-for="node in treeData"
        :key="node.path"
        class="tree-node-wrapper"
      >
        <div
          class="tree-node"
          :class="{ selected: selectedPath === node.path }"
          @click="selectNode(node)"
        >
          <span class="expand-icon" @click.stop="toggleNode(node)">
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
            @toggle="toggleNode"
            @select="selectNode"
          />
        </div>
      </div>
      <t-empty v-if="treeData.length === 0" description="没有可访问的驱动器" size="small" />
    </div>
  </div>
</template>

<style scoped>
.directory-tree {
  width: 100%;
  height: 450px;
  overflow-y: auto;
  border: 1px solid #e7e7e7;
  border-radius: 4px;
  background: #fff;
}

.tree-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
}

.tree-container {
  padding: 8px;
}

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
