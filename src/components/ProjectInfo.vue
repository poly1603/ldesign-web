<template>
  <n-card title="项目信息" class="project-info">
    <n-descriptions :column="2" bordered>
      <n-descriptions-item label="项目名称">
        <n-text>{{ project.name }}</n-text>
      </n-descriptions-item>

      <n-descriptions-item label="项目类型">
        <n-tag :bordered="false">{{ project.type || '未知' }}</n-tag>
      </n-descriptions-item>

      <n-descriptions-item label="框架">
        <n-tag v-if="project.framework" :bordered="false" type="info">
          {{ project.framework }}
        </n-tag>
        <n-text v-else depth="3">未检测到</n-text>
      </n-descriptions-item>

      <n-descriptions-item label="包管理器">
        <n-tag v-if="project.packageManager" :bordered="false" type="success">
          {{ project.packageManager }}
        </n-tag>
        <n-text v-else depth="3">未检测到</n-text>
      </n-descriptions-item>

      <n-descriptions-item label="项目路径" :span="2">
        <n-space align="center">
          <n-text code>{{ project.path }}</n-text>
          <n-button text @click="copyPath">
            <template #icon>
              <n-icon><CopyOutlined /></n-icon>
            </template>
          </n-button>
        </n-space>
      </n-descriptions-item>

      <n-descriptions-item v-if="project.description" label="描述" :span="2">
        <n-text>{{ project.description }}</n-text>
      </n-descriptions-item>

      <n-descriptions-item label="创建时间">
        <n-text>{{ formatDateTime(project.createdAt) }}</n-text>
      </n-descriptions-item>

      <n-descriptions-item label="更新时间">
        <n-text>{{ formatDateTime(project.updatedAt) }}</n-text>
      </n-descriptions-item>

      <n-descriptions-item v-if="project.lastOpenedAt" label="最近打开" :span="2">
        <n-text>{{ formatDateTime(project.lastOpenedAt) }}</n-text>
      </n-descriptions-item>
    </n-descriptions>

    <template #action>
      <n-space>
        <n-button type="primary" @click="handleAnalyze" :loading="analyzing">
          <template #icon>
            <n-icon><SearchOutlined /></n-icon>
          </template>
          分析项目
        </n-button>
        <n-button @click="handleEdit">
          <template #icon>
            <n-icon><EditOutlined /></n-icon>
          </template>
          编辑信息
        </n-button>
      </n-space>
    </template>
  </n-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  NCard,
  NDescriptions,
  NDescriptionsItem,
  NText,
  NTag,
  NSpace,
  NButton,
  NIcon,
  useMessage,
} from 'naive-ui'
import { CopyOutlined, SearchOutlined, EditOutlined } from '@vicons/antd'
import type { Project } from '../api/projects'

interface Props {
  project: Project
}

interface Emits {
  (e: 'update', project: Project): void
  (e: 'analyze'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const message = useMessage()
const analyzing = ref(false)

const copyPath = () => {
  navigator.clipboard.writeText(props.project.path)
  message.success('路径已复制到剪贴板')
}

const handleAnalyze = () => {
  analyzing.value = true
  emit('analyze')
  // 分析完成后由父组件设置 analyzing.value = false
  setTimeout(() => {
    analyzing.value = false
  }, 3000)
}

const handleEdit = () => {
  // TODO: 打开编辑对话框
  message.info('编辑功能开发中...')
}

const formatDateTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}
</script>

<style scoped>
.project-info {
  margin-bottom: 24px;
}
</style>

