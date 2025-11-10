<template>
  <div v-if="project && command" class="space-y-6">
    <!-- 头部 -->
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <Button
          type="default"
          size="sm"
          outlined
          @click="$emit('back')"
        >
          ← 返回
        </Button>
        <div>
          <h2 class="text-xl font-bold text-gray-900">{{ getCommandTitle(command) }}</h2>
          <p class="text-sm text-gray-600 mt-1">{{ project.name }}</p>
        </div>
      </div>
    </div>

    <!-- 命令执行区域 -->
    <Card padding="lg">
      <div class="space-y-4">
        <!-- 命令信息 -->
        <div class="bg-gray-50 rounded-lg p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-gray-700">执行命令</span>
            <Badge :type="getCommandType(command)">{{ command }}</Badge>
          </div>
          <div class="text-sm text-gray-600 font-mono">
            {{ getCommandLine(command) }}
          </div>
        </div>

        <!-- 命令输出 -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-semibold text-gray-700">输出</h3>
            <div class="flex space-x-2">
              <Button
                v-if="isRunning"
                type="danger"
                size="sm"
                outlined
                @click="stopCommand"
              >
                停止
              </Button>
              <Button
                type="default"
                size="sm"
                outlined
                @click="clearOutput"
              >
                清空
              </Button>
            </div>
          </div>
          <div class="bg-gray-900 rounded-lg p-4 min-h-[400px] max-h-[600px] overflow-y-auto">
            <pre v-if="output" class="text-green-400 text-xs font-mono whitespace-pre-wrap">{{ output }}</pre>
            <div v-else class="text-gray-500 text-sm text-center py-20">
              <div class="mb-2">等待命令执行...</div>
              <div class="text-xs">点击"开始执行"按钮启动命令</div>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="flex space-x-3">
          <Button
            type="primary"
            :loading="isRunning"
            :disabled="isRunning"
            @click="startCommand"
          >
            {{ isRunning ? '执行中...' : '开始执行' }}
          </Button>
          <Button
            type="default"
            outlined
            @click="$emit('back')"
          >
            取消
          </Button>
        </div>
      </div>
    </Card>

    <!-- 命令说明 -->
    <Card padding="lg">
      <h3 class="text-lg font-semibold text-gray-900 mb-3">命令说明</h3>
      <div class="text-sm text-gray-600 space-y-2">
        <p>{{ getCommandDescription(command) }}</p>
        <div v-if="getCommandExamples(command)" class="mt-4">
          <p class="font-medium text-gray-700 mb-2">示例：</p>
          <pre class="bg-gray-50 p-3 rounded text-xs font-mono">{{ getCommandExamples(command) }}</pre>
        </div>
      </div>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Card from './common/Card.vue'
import Button from './common/Button.vue'
import Badge from './common/Badge.vue'

interface Project {
  id: string
  name: string
  path: string
  type: 'web' | 'api' | 'library' | 'mobile' | 'desktop' | 'other'
  framework?: string
  packageManager?: string
}

interface Props {
  project: Project
  command: string
}

const props = defineProps<Props>()
const emit = defineEmits<['back'>()

const isRunning = ref(false)
const output = ref('')

/**
 * 获取命令标题
 */
function getCommandTitle(command: string): string {
  const titles: Record<string, string> = {
    dev: '启动开发服务器',
    build: '打包构建',
    preview: '预览',
    deploy: '部署',
    publish: '发布到 NPM',
    test: '运行测试',
    lint: '代码检查',
    format: '代码格式化',
    docs: '生成文档',
    changelog: '更新日志',
    deps: '依赖管理',
    security: '安全检查',
    performance: '性能分析',
  }
  return titles[command] || command
}

/**
 * 获取命令类型徽章
 */
function getCommandType(command: string): 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default' {
  const typeMap: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
    dev: 'primary',
    build: 'success',
    preview: 'info',
    deploy: 'warning',
    publish: 'warning',
    test: 'info',
    lint: 'default',
    format: 'default',
    docs: 'default',
    changelog: 'default',
    deps: 'default',
    security: 'danger',
    performance: 'info',
  }
  return typeMap[command] || 'default'
}

/**
 * 获取命令行
 */
function getCommandLine(command: string): string {
  const pm = props.project.packageManager || 'pnpm'
  const commands: Record<string, string> = {
    dev: `${pm} run dev`,
    build: `${pm} run build`,
    preview: `${pm} run preview`,
    deploy: `ldesign deploy`,
    publish: `ldesign publish`,
    test: `${pm} run test`,
    lint: `${pm} run lint`,
    format: `ldesign format`,
    docs: `ldesign docs`,
    changelog: `ldesign changelog`,
    deps: `ldesign deps`,
    security: `ldesign security`,
    performance: `ldesign performance`,
  }
  return commands[command] || command
}

/**
 * 获取命令说明
 */
function getCommandDescription(command: string): string {
  const descriptions: Record<string, string> = {
    dev: '启动开发服务器，支持热重载和自动刷新。适用于本地开发和调试。',
    build: '构建生产版本，优化代码并生成可部署的文件。',
    preview: '预览构建后的项目，用于测试生产环境的效果。',
    deploy: '部署项目到指定环境，支持多种部署目标。',
    publish: '将库发布到 NPM 仓库，包含版本管理和变更日志生成。',
    test: '运行单元测试和集成测试，确保代码质量。',
    lint: '检查代码风格和潜在问题，保持代码规范。',
    format: '自动格式化代码，统一代码风格。',
    docs: '生成项目文档，包括 API 文档和使用说明。',
    changelog: '生成或更新变更日志，记录版本更新内容。',
    deps: '管理项目依赖，包括安装、更新和清理。',
    security: '检查依赖的安全漏洞，确保项目安全。',
    performance: '分析项目性能，提供优化建议。',
  }
  return descriptions[command] || `执行 ${command} 命令`
}

/**
 * 获取命令示例
 */
function getCommandExamples(command: string): string {
  const examples: Record<string, string> = {
    dev: `# 启动开发服务器
pnpm run dev

# 指定端口
pnpm run dev --port 3000

# 指定主机
pnpm run dev --host 0.0.0.0`,
    build: `# 构建生产版本
pnpm run build

# 构建并生成分析报告
pnpm run build --analyze`,
    deploy: `# 部署到生产环境
ldesign deploy --env production

# 部署到测试环境
ldesign deploy --env staging`,
    publish: `# 发布到 NPM
ldesign publish

# 发布指定版本
ldesign publish --version 1.0.0`,
  }
  return examples[command] || ''
}

/**
 * 开始执行命令
 */
async function startCommand() {
  if (isRunning.value) return

  isRunning.value = true
  output.value = `正在执行命令: ${getCommandLine(props.command)}\n`
  output.value += `项目路径: ${props.project.path}\n`
  output.value += `${'='.repeat(50)}\n\n`

  try {
    // TODO: 调用后端 API 执行命令
    // 这里应该通过 WebSocket 或 Server-Sent Events 获取实时输出
    // 暂时模拟输出
    const lines = [
      '初始化环境...',
      '检查依赖...',
      '执行命令...',
      '处理中...',
      '完成！',
    ]

    for (const line of lines) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      output.value += `${line}\n`
    }

    output.value += `\n命令执行完成！\n`
  } catch (error: any) {
    output.value += `\n错误: ${error?.message || '执行失败'}\n`
  } finally {
    isRunning.value = false
  }
}

/**
 * 停止命令
 */
function stopCommand() {
  // TODO: 调用后端 API 停止命令
  isRunning.value = false
  output.value += `\n\n命令已停止\n`
}

/**
 * 清空输出
 */
function clearOutput() {
  output.value = ''
}
</script>



































