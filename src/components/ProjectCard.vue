<template>
  <n-card
    :title="project.name"
    hoverable
    class="project-card"
    @click="handleClick"
  >
    <template #header-extra>
      <n-dropdown
        :options="dropdownOptions"
        @select="handleDropdownSelect"
        @click.stop
      >
        <n-button text>
          <template #icon>
            <n-icon><MoreOutlined /></n-icon>
          </template>
        </n-button>
      </n-dropdown>
    </template>

    <n-space vertical :size="12">
      <!-- 项目路径 -->
      <n-text depth="3" style="font-size: 12px">
        <n-icon><FolderOutlined /></n-icon>
        {{ project.path }}
      </n-text>

      <!-- 项目信息 -->
      <n-space :size="8">
        <n-tag v-if="project.type" :bordered="false" size="small">
          {{ project.type }}
        </n-tag>
        <n-tag v-if="project.framework" :bordered="false" size="small" type="info">
          {{ project.framework }}
        </n-tag>
        <n-tag v-if="project.packageManager" :bordered="false" size="small" type="success">
          {{ project.packageManager }}
        </n-tag>
      </n-space>

      <!-- 项目描述 -->
      <n-text v-if="project.description" depth="3" style="font-size: 13px">
        {{ project.description }}
      </n-text>

      <!-- 时间信息 -->
      <n-space :size="16">
        <n-text depth="3" style="font-size: 12px">
          创建: {{ formatTime(project.createdAt) }}
        </n-text>
        <n-text v-if="project.lastOpenedAt" depth="3" style="font-size: 12px">
          最近打开: {{ formatTime(project.lastOpenedAt) }}
        </n-text>
      </n-space>
    </n-space>
  </n-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NCard, NSpace, NText, NTag, NButton, NIcon, NDropdown } from 'naive-ui'
import { FolderOutlined, MoreOutlined } from '@vicons/antd'
import type { Project } from '../api/projects'

interface Props {
  project: Project
}

interface Emits {
  (e: 'click', project: Project): void
  (e: 'delete', project: Project): void
  (e: 'open', project: Project): void
  (e: 'analyze', project: Project): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const dropdownOptions = computed(() => [
  {
    label: '打开项目',
    key: 'open',
  },
  {
    label: '分析项目',
    key: 'analyze',
  },
  {
    type: 'divider',
    key: 'd1',
  },
  {
    label: '删除项目',
    key: 'delete',
  },
])

const handleClick = () => {
  emit('click', props.project)
}

const handleDropdownSelect = (key: string) => {
  switch (key) {
    case 'open':
      emit('open', props.project)
      break
    case 'analyze':
      emit('analyze', props.project)
      break
    case 'delete':
      emit('delete', props.project)
      break
  }
}

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  // 小于1分钟
  if (diff < 60 * 1000) {
    return '刚刚'
  }
  
  // 小于1小时
  if (diff < 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 1000))} 分钟前`
  }
  
  // 小于1天
  if (diff < 24 * 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 60 * 1000))} 小时前`
  }
  
  // 小于7天
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return `${Math.floor(diff / (24 * 60 * 60 * 1000))} 天前`
  }
  
  // 格式化日期
  return date.toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.project-card {
  cursor: pointer;
  transition: all 0.3s ease;
}

.project-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>

