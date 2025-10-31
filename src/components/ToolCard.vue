<template>
  <n-card
    hoverable
    class="tool-card"
    @click="handleClick"
  >
    <n-space vertical align="center" :size="16">
      <!-- 图标 -->
      <div class="tool-icon">
        <n-icon :size="48" :color="tool.color || '#18a058'">
          <component :is="iconComponent" />
        </n-icon>
      </div>

      <!-- 标题 -->
      <n-text strong style="font-size: 16px">
        {{ tool.label }}
      </n-text>

      <!-- 描述 -->
      <n-text depth="3" style="font-size: 13px; text-align: center">
        {{ tool.description }}
      </n-text>

      <!-- 状态标签 -->
      <n-tag v-if="tool.badge" :type="tool.badgeType || 'default'" size="small">
        {{ tool.badge }}
      </n-tag>
    </n-space>
  </n-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NCard, NSpace, NText, NTag, NIcon } from 'naive-ui'
import {
  BuildOutlined,
  RocketOutlined,
  BugOutlined,
  BranchesOutlined,
  AppstoreOutlined,
  DashboardOutlined,
  CodeOutlined,
  FileTextOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  CloudUploadOutlined,
  TranslationOutlined,
  ApiOutlined,
  PlayCircleOutlined,
} from '@vicons/antd'

export interface Tool {
  name: string
  label: string
  icon: string
  description: string
  color?: string
  badge?: string
  badgeType?: 'default' | 'success' | 'warning' | 'error' | 'info'
}

interface Props {
  tool: Tool
  projectId: string
}

interface Emits {
  (e: 'click', tool: Tool): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 图标映射
const iconMap: Record<string, any> = {
  BuildOutlined,
  RocketOutlined,
  BugOutlined,
  BranchesOutlined,
  AppstoreOutlined,
  DashboardOutlined,
  CodeOutlined,
  FileTextOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  CloudUploadOutlined,
  TranslationOutlined,
  ApiOutlined,
  PlayCircleOutlined,
}

const iconComponent = computed(() => {
  return iconMap[props.tool.icon] || BuildOutlined
})

const handleClick = () => {
  emit('click', props.tool)
}
</script>

<style scoped>
.tool-card {
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tool-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.tool-icon {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(24, 160, 88, 0.1) 0%, rgba(24, 160, 88, 0.05) 100%);
}
</style>

