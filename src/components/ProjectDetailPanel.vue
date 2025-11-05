<template>
  <Transition name="slide-left">
    <div
      v-if="project"
      class="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-50 overflow-y-auto"
    >
      <!-- 头部 -->
      <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <Button
              type="default"
              size="sm"
              outlined
              @click="$emit('close')"
            >
              ← 返回
            </Button>
            <div>
              <h2 class="text-xl font-bold text-gray-900">{{ project.name }}</h2>
              <p v-if="project.description" class="text-sm text-gray-600 mt-1">
                {{ project.description }}
              </p>
            </div>
          </div>
          <Badge :type="getProjectTypeBadge(project.type)">
            {{ project.type }}
          </Badge>
        </div>
      </div>

      <!-- 内容区域 -->
      <div class="p-6 space-y-6">
        <!-- 基本信息 -->
        <Card padding="lg">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">基本信息</h3>
          <dl class="space-y-3">
            <div>
              <dt class="text-sm font-medium text-gray-500">项目路径</dt>
              <dd class="mt-1 text-sm text-gray-900 font-mono break-all">
                {{ project.path }}
              </dd>
            </div>
            <div v-if="project.framework">
              <dt class="text-sm font-medium text-gray-500">框架</dt>
              <dd class="mt-1">
                <Badge type="info" size="sm">{{ project.framework }}</Badge>
              </dd>
            </div>
            <div v-if="project.packageManager">
              <dt class="text-sm font-medium text-gray-500">包管理器</dt>
              <dd class="mt-1">
                <Badge type="default" size="sm">{{ project.packageManager }}</Badge>
              </dd>
            </div>
          </dl>
        </Card>

        <!-- 操作区域 -->
        <Card padding="lg">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">操作</h3>
          
          <!-- Web 项目操作 -->
          <div v-if="project.type === 'web'" class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <Button
                type="primary"
                class="w-full"
                :loading="runningCommand === 'dev'"
                @click="runCommand('dev')"
              >
                🚀 启动开发服务器
              </Button>
              <Button
                type="success"
                class="w-full"
                :loading="runningCommand === 'build'"
                @click="runCommand('build')"
              >
                📦 打包构建
              </Button>
              <Button
                type="info"
                class="w-full"
                :loading="runningCommand === 'preview'"
                @click="runCommand('preview')"
              >
                👁️ 预览
              </Button>
              <Button
                type="warning"
                class="w-full"
                :loading="runningCommand === 'deploy'"
                @click="runCommand('deploy')"
              >
                🚢 部署
              </Button>
            </div>
          </div>

          <!-- Library 项目操作 -->
          <div v-else-if="project.type === 'library'" class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <Button
                type="primary"
                class="w-full"
                :loading="runningCommand === 'dev'"
                @click="runCommand('dev')"
              >
                🚀 启动开发服务器
              </Button>
              <Button
                type="success"
                class="w-full"
                :loading="runningCommand === 'build'"
                @click="runCommand('build')"
              >
                📦 打包构建
              </Button>
              <Button
                type="warning"
                class="w-full"
                :loading="runningCommand === 'publish'"
                @click="runCommand('publish')"
              >
                📤 发布到 NPM
              </Button>
              <Button
                type="info"
                class="w-full"
                :loading="runningCommand === 'preview'"
                @click="runCommand('preview')"
              >
                👁️ 预览
              </Button>
            </div>
          </div>

          <!-- 其他类型项目操作 -->
          <div v-else class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <Button
                type="primary"
                class="w-full"
                :loading="runningCommand === 'dev'"
                @click="runCommand('dev')"
              >
                🚀 启动开发服务器
              </Button>
              <Button
                type="success"
                class="w-full"
                :loading="runningCommand === 'build'"
                @click="runCommand('build')"
              >
                📦 打包构建
              </Button>
            </div>
          </div>

          <!-- 通用工具 -->
          <div class="mt-6 pt-6 border-t border-gray-200">
            <h4 class="text-sm font-semibold text-gray-700 mb-3">工具</h4>
            <div class="grid grid-cols-2 gap-2">
              <Button
                type="default"
                size="sm"
                outlined
                :loading="runningCommand === 'test'"
                @click="runCommand('test')"
              >
                🧪 测试
              </Button>
              <Button
                type="default"
                size="sm"
                outlined
                :loading="runningCommand === 'lint'"
                @click="runCommand('lint')"
              >
                🔍 代码检查
              </Button>
              <Button
                type="default"
                size="sm"
                outlined
                :loading="runningCommand === 'format'"
                @click="runCommand('format')"
              >
                ✨ 格式化
              </Button>
              <Button
                type="default"
                size="sm"
                outlined
                :loading="runningCommand === 'docs'"
                @click="runCommand('docs')"
              >
                📚 生成文档
              </Button>
              <Button
                type="default"
                size="sm"
                outlined
                :loading="runningCommand === 'changelog'"
                @click="runCommand('changelog')"
              >
                📝 更新日志
              </Button>
              <Button
                type="default"
                size="sm"
                outlined
                :loading="runningCommand === 'deps'"
                @click="runCommand('deps')"
              >
                📦 依赖管理
              </Button>
              <Button
                type="default"
                size="sm"
                outlined
                :loading="runningCommand === 'security'"
                @click="runCommand('security')"
              >
                🔒 安全检查
              </Button>
              <Button
                type="default"
                size="sm"
                outlined
                :loading="runningCommand === 'performance'"
                @click="runCommand('performance')"
              >
                ⚡ 性能分析
              </Button>
            </div>
          </div>
        </Card>

        <!-- 命令输出 -->
        <Card v-if="commandOutput" padding="lg">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-semibold text-gray-900">命令输出</h3>
            <Button
              type="default"
              size="sm"
              outlined
              @click="commandOutput = ''"
            >
              清空
            </Button>
          </div>
          <pre class="bg-gray-900 text-green-400 p-4 rounded-lg text-xs font-mono overflow-x-auto max-h-96 overflow-y-auto">{{ commandOutput }}</pre>
        </Card>

        <!-- 其他信息 -->
        <Card padding="lg">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">其他信息</h3>
          <dl class="space-y-3">
            <div>
              <dt class="text-sm font-medium text-gray-500">创建时间</dt>
              <dd class="mt-1 text-sm text-gray-900">
                {{ formatDate(project.createdAt) }}
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">更新时间</dt>
              <dd class="mt-1 text-sm text-gray-900">
                {{ formatDate(project.updatedAt) }}
              </dd>
            </div>
            <div v-if="project.lastOpenedAt">
              <dt class="text-sm font-medium text-gray-500">最后打开时间</dt>
              <dd class="mt-1 text-sm text-gray-900">
                {{ formatDate(project.lastOpenedAt) }}
              </dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  </Transition>

  <!-- 遮罩层 -->
  <Transition name="fade">
    <div
      v-if="project"
      class="fixed inset-0 bg-black bg-opacity-50 z-40"
      @click="$emit('close')"
    ></div>
  </Transition>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Card from './common/Card.vue'
import Button from './common/Button.vue'
import Badge from './common/Badge.vue'
import { useToast } from '../utils/toast.js'

interface Project {
  id: string
  name: string
  path: string
  type: 'web' | 'api' | 'library' | 'mobile' | 'desktop' | 'other'
  framework?: string
  packageManager?: string
  description?: string
  createdAt: number
  updatedAt: number
  lastOpenedAt?: number
}

interface Props {
  project: Project | null
}

interface Emits {
  close: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const toast = useToast()
const runningCommand = ref<string | null>(null)
const commandOutput = ref('')

/**
 * 格式化日期
 */
function formatDate(timestamp: number): string {
  if (!timestamp) return '-'
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

/**
 * 获取项目类型徽章
 */
function getProjectTypeBadge(type: string): 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default' {
  const badgeMap: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
    web: 'primary',
    api: 'success',
    library: 'info',
    mobile: 'warning',
    desktop: 'warning',
    other: 'default',
  }
  return badgeMap[type] || 'default'
}

/**
 * 运行命令
 */
async function runCommand(command: string) {
  if (!props.project) return

  runningCommand.value = command
  commandOutput.value = ''

  try {
    // TODO: 调用后端 API 执行命令
    // 这里应该调用后端 API，后端再执行 ldesign CLI 命令
    toast.info(`正在执行: ${command}`)
    
    // 模拟命令输出
    commandOutput.value = `正在执行命令: ${command}\n项目路径: ${props.project.path}\n\n`
    
    // 这里应该通过 WebSocket 或 Server-Sent Events 获取实时输出
    // 暂时使用 setTimeout 模拟
    setTimeout(() => {
      commandOutput.value += `命令执行完成！\n`
      runningCommand.value = null
      toast.success(`命令执行成功: ${command}`)
    }, 2000)
  } catch (error: any) {
    commandOutput.value += `错误: ${error?.message || '执行失败'}\n`
    runningCommand.value = null
    toast.error(`命令执行失败: ${error?.message || command}`)
  }
}
</script>

<style scoped>
.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 0.3s ease;
}

.slide-left-enter-from {
  transform: translateX(100%);
}

.slide-left-leave-to {
  transform: translateX(100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

