<template>
  <div class="project-preview-page">
    <div class="page-header">
      <div class="page-header-top">
        <div class="page-header-left">
          <span class="back-icon" @click="router.back()" title="返回">
            <ArrowLeft :size="20" />
          </span>
          <h1 class="page-title">
            预览项目
            <span v-if="currentViewingEnvironment" class="page-title-env-tag">
              {{ getEnvironmentLabel(currentViewingEnvironment) }}
            </span>
          </h1>
        </div>
        <div class="page-header-right">
          <!-- 操作按钮组 -->
          <div class="header-button-group">
            <!-- 运行环境下拉框（只在有运行中的环境时显示） -->
            <RunningEnvironmentsDropdown
              v-if="runningEnvironments.length > 0"
              :running-environments="runningEnvironments"
              :current-viewing-environment="currentViewingEnvironment"
              @select="handleRunningEnvSelect"
            />
            
            <!-- 环境选择器（用于预览新环境） -->
            <EnvironmentSelect
              v-model="selectedEnvironment"
              :options="environmentOptions"
              :disabled="loading"
              title="选择要预览的环境"
              @update:modelValue="handleEnvironmentSelect"
            />
            
            <!-- 预览按钮 -->
            <Tooltip
              :content="getPreviewButtonTooltip()"
              placement="bottom"
            >
              <button
                class="btn-icon btn-primary"
                :disabled="!canPreview(selectedEnvironment) || isEnvironmentRunning(selectedEnvironment) || loading"
                @click="handlePreview"
              >
                <Eye :size="18" />
              </button>
            </Tooltip>
            
            <!-- 停止按钮 -->
            <Tooltip
              v-if="currentViewingEnvironment && isEnvironmentRunning(currentViewingEnvironment)"
              content="停止当前环境预览"
              placement="bottom"
            >
              <button
                class="btn-icon btn-danger"
                :disabled="!currentViewingEnvironment || loading"
                @click="handleStop"
              >
                <Square :size="18" />
              </button>
            </Tooltip>
            
            <!-- 打开按钮 -->
            <Tooltip
              v-if="currentViewingEnvironment && isEnvironmentRunning(currentViewingEnvironment)"
              :content="primaryServiceUrl ? '打开预览' : '等待服务地址...'"
              placement="bottom"
            >
              <button
                class="btn-icon btn-success"
                :disabled="!primaryServiceUrl"
                @click="handleOpen"
                :title="primaryServiceUrl || '等待服务地址...'"
              >
                <ExternalLink :size="18" />
              </button>
            </Tooltip>
            
            <!-- 二维码按钮 -->
            <div v-if="currentViewingEnvironment && isEnvironmentRunning(currentViewingEnvironment)" class="qr-code-dropdown-wrapper">
              <Tooltip :content="primaryServiceUrl ? '显示二维码' : '等待服务地址...'" placement="bottom">
                <button
                  class="btn-icon btn-success"
                  :disabled="!primaryServiceUrl"
                  @click="toggleQRCodeDropdown"
                  :title="primaryServiceUrl || '等待服务地址...'"
                >
                  <QrCode :size="18" />
                </button>
              </Tooltip>
              <!-- 二维码下拉框 -->
              <div
                v-if="showQRCodeDropdown"
                class="qr-code-dropdown"
                @click.stop
              >
                <div class="qr-code-dropdown-content">
                  <canvas ref="qrCodeCanvas" class="qr-code-canvas"></canvas>
                  <div class="qr-code-label">扫码访问</div>
                  <div class="qr-code-url">{{ primaryServiceUrl }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="page-content">
      <!-- 控制台铺满整个区域 -->
      <div class="console-panel">
        <Console ref="consoleRef" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Eye, Square, ExternalLink, QrCode } from 'lucide-vue-next'
import { projectApi } from '../api/services'
import { useAppStore } from '../stores/app'
import Console from '../components/Console.vue'
import EnvironmentSelect from '../components/common/EnvironmentSelect.vue'
import RunningEnvironmentsDropdown from '../components/common/RunningEnvironmentsDropdown.vue'
import Tooltip from '../components/common/Tooltip.vue'
import type { Socket } from 'socket.io-client'
import QRCode from 'qrcode'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const loading = ref(false)
const serviceUrls = ref<string[]>([])
const executionId = ref<string | null>(null)
const consoleRef = ref<InstanceType<typeof Console> | null>(null)
const qrCodeCanvas = ref<HTMLCanvasElement | null>(null)
let socket: Socket | null = null
let room: string | null = null

// 环境选择（从 URL 参数获取，如果没有则默认生产环境）
const selectedEnvironment = ref<'development' | 'production' | 'test' | 'staging' | 'preview'>('production')

// 初始化时从 URL 读取环境
if (route.query.env && ['development', 'production', 'test', 'staging', 'preview'].includes(route.query.env as string)) {
  selectedEnvironment.value = route.query.env as any
}

// 当前查看的环境（用于显示日志）
const currentViewingEnvironment = ref<string | null>(null)

// 运行中的环境列表
const runningEnvironments = ref<Array<{ environment?: string; executionId: string; serviceUrl?: string }>>([])

// 各环境的打包状态
const environmentBuildStatuses = ref<Map<string, { built: boolean }>>(new Map())

// 可用环境列表
const availableEnvironments = [
  { value: 'development', label: '开发环境', icon: '🟢' },
  { value: 'production', label: '生产环境', icon: '🔴' },
  { value: 'staging', label: '预发布环境', icon: '🟡' },
  { value: 'test', label: '测试环境', icon: '🔵' },
  { value: 'preview', label: '预览环境', icon: '🟣' },
]

const environmentOptions = computed(() => {
  return availableEnvironments.map(env => {
    const buildStatus = environmentBuildStatuses.value.get(env.value)
    const isBuilt = buildStatus?.built || false
    const isRunning = isEnvironmentRunning(env.value)
    
    return {
      value: env.value,
      label: env.label,
      icon: env.icon,
      badge: isRunning ? '预览中' : undefined,
      disabled: !isBuilt, // 未打包的环境禁用
      buildStatus: buildStatus,
    }
  })
})

// 计算主要服务地址（用于二维码，优先使用 network IP）
const primaryServiceUrl = ref<string | null>(null)

// 二维码下拉框显示状态
const showQRCodeDropdown = ref(false)

// 环境执行记录映射（environment -> executionId）
const environmentExecutions = ref<Map<string, string>>(new Map())

// 计算是否显示预览按钮（打开服务和二维码）
// 注意：按钮始终显示（当环境运行时），但可能被禁用（如果没有服务地址）
const showPreviewButtons = computed(() => {
  return currentViewingEnvironment.value 
    && isEnvironmentRunning(currentViewingEnvironment.value)
})

/**
 * 获取环境标签
 */
function getEnvironmentLabel(env: string | null | undefined): string {
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

/**
 * 检查环境是否正在运行
 */
function isEnvironmentRunning(env: string): boolean {
  const isRunning = runningEnvironments.value.some(e => (e.environment || 'production') === env)
  console.log('[Preview] isEnvironmentRunning:', { env, isRunning, runningEnvironments: runningEnvironments.value })
  return isRunning
}

/**
 * 检查环境是否可以预览（必须已打包）
 */
function canPreview(env: string): boolean {
  const buildStatus = environmentBuildStatuses.value.get(env)
  return buildStatus?.built || false
}

/**
 * 获取预览按钮的提示文本
 */
function getPreviewButtonTooltip(): string {
  if (isEnvironmentRunning(selectedEnvironment.value)) {
    return '该环境正在预览中，请选择其他环境预览'
  }
  if (!canPreview(selectedEnvironment.value)) {
    return '该环境尚未打包，请先打包后再预览'
  }
  return '预览选中的环境'
}

/**
 * 加载所有环境的打包状态
 */
async function loadAllEnvironmentBuildStatuses() {
  const environments = ['development', 'production', 'staging', 'test', 'preview']
  for (const env of environments) {
    try {
      const response = await projectApi.getBuildStatus(projectId, env)
      if (response.success && response.data) {
        environmentBuildStatuses.value.set(env, {
          built: response.data.built || false,
        })
      } else {
        environmentBuildStatuses.value.set(env, { built: false })
      }
    } catch (error) {
      console.error(`加载 ${env} 环境打包状态失败:`, error)
      environmentBuildStatuses.value.set(env, { built: false })
    }
  }
}

/**
 * 切换查看的环境
 */
async function switchEnvironment(env: string) {
  currentViewingEnvironment.value = env
  // 同步更新环境选择器（不触发 watch，避免重复调用）
  isInitializing.value = true
  selectedEnvironment.value = env as any
  await nextTick()
  isInitializing.value = false
  
  // 更新 URL
  router.replace({ query: { ...route.query, env } })
  
  // 清空控制台
  consoleRef.value?.clear()
  
  // 离开当前房间
  leaveRoom()
  
  // 清空服务地址（先清空，避免显示旧环境的数据）
  serviceUrls.value = []
  primaryServiceUrl.value = null
  showQRCodeDropdown.value = false
  
  // 查找该环境的执行记录
  const envExecution = runningEnvironments.value.find(e => (e.environment || 'production') === env)
  if (envExecution) {
    // 环境正在运行，恢复状态
    executionId.value = envExecution.executionId
    if (envExecution.serviceUrl) {
      serviceUrls.value = [envExecution.serviceUrl]
      primaryServiceUrl.value = envExecution.serviceUrl
      console.log('[Preview] switchEnvironment: 设置服务地址:', primaryServiceUrl.value)
    }
    
    // 加载该环境的日志（会解析服务地址）
    await loadEnvironmentLogs(env)
    
    // 连接到该环境的 WebSocket 房间
    connectToRoom()
    
    // 如果还是没有服务地址，再次尝试从日志中解析
    if (!primaryServiceUrl.value) {
      setTimeout(async () => {
        await loadLatestLogs()
        console.log('[Preview] switchEnvironment: 延迟加载后服务地址:', primaryServiceUrl.value)
      }, 1000)
    }
  } else {
    // 环境未运行，清空所有状态
    executionId.value = null
    serviceUrls.value = []
    primaryServiceUrl.value = null
    showQRCodeDropdown.value = false
    consoleRef.value?.appendInfo(`环境 ${getEnvironmentLabel(env)} 未运行\n`)
  }
}

/**
 * 加载环境的日志
 */
async function loadEnvironmentLogs(env: string) {
  try {
    const response = await projectApi.getLatestExecution(projectId, 'preview', env)
    if (response.success && response.data && response.data.output) {
      consoleRef.value?.appendStdout(response.data.output)
    }
  } catch (error) {
    console.error('加载环境日志失败:', error)
  }
}

/**
 * 刷新运行中的环境列表
 */
async function refreshRunningEnvironments() {
  try {
    const response = await projectApi.getRunningExecutions(projectId, 'preview')
    if (response.success && response.data) {
      runningEnvironments.value = response.data.map((exec: any) => ({
        environment: exec.environment || 'production',
        executionId: exec.id,
        serviceUrl: exec.serviceUrl,
      }))
      
      // 更新环境执行记录映射
      environmentExecutions.value.clear()
      runningEnvironments.value.forEach(env => {
        environmentExecutions.value.set(env.environment || 'production', env.executionId)
      })
    } else {
      runningEnvironments.value = []
      environmentExecutions.value.clear()
    }
  } catch (error) {
    console.error('刷新运行环境列表失败:', error)
    runningEnvironments.value = []
    environmentExecutions.value.clear()
  }
}

/**
 * 标准化 URL（统一格式以便比较）
 */
function normalizeUrl(url: string): string {
  if (!url) return ''
  
  // 先清理 URL
  url = cleanUrl(url)
  
  // 移除末尾斜杠，转换为小写，移除空格
  url = url.replace(/\/+$/, '').toLowerCase().trim()
  
  // 统一协议格式（确保都是 http:// 或 https://）
  url = url.replace(/^(https?:\/\/)?/i, (match) => {
    return match || 'http://'
  })
  
  return url
}

/**
 * 添加服务地址（去重）
 */
function addServiceUrl(url: string) {
  if (!url) {
    console.log('[Preview] addServiceUrl: 空 URL，跳过')
    return
  }
  
  // 先清理 URL（移除 ANSI 转义码等），确保完全干净
  url = cleanUrl(url)
  if (!url) {
    console.log('[Preview] addServiceUrl: 清理后为空，跳过')
    return
  }
  
  // 确保 URL 有协议前缀
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `http://${url}`
  }
  
  // 验证 URL 格式是否正确
  try {
    // 尝试解析 URL，如果无效则忽略
    new URL(url)
  } catch {
    // URL 格式无效，忽略
    console.log('[Preview] addServiceUrl: URL 格式无效，跳过:', url)
    return
  }
  
  // 检查是否已存在（使用标准化后的 URL 比较）
  const normalizedUrl = normalizeUrl(url)
  if (!normalizedUrl) {
    console.log('[Preview] addServiceUrl: 标准化后为空，跳过')
    return
  }
  
  const exists = serviceUrls.value.some(existingUrl => {
    const existingNormalized = normalizeUrl(existingUrl)
    return existingNormalized === normalizedUrl
  })
  
  if (exists) {
    console.log('[Preview] addServiceUrl: URL 已存在，跳过:', url)
    return
  }
  
  // 添加到数组（确保是清理后的 URL）
  serviceUrls.value.push(url)
  console.log('[Preview] addServiceUrl: 添加服务地址:', url)
  
  // 更新主要服务地址（优先使用 network IP，然后是 localhost）
  if (!primaryServiceUrl.value) {
    primaryServiceUrl.value = url
    console.log('[Preview] addServiceUrl: 设置主要服务地址:', primaryServiceUrl.value)
  } else {
    // 如果新地址是 network IP，优先使用它
    const isNetwork = /^(http[s]?:\/\/)?(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/i.test(url)
    const currentIsNetwork = /^(http[s]?:\/\/)?(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/i.test(primaryServiceUrl.value)
    if (isNetwork && !currentIsNetwork) {
      primaryServiceUrl.value = url
      console.log('[Preview] addServiceUrl: 更新主要服务地址（网络 IP）:', primaryServiceUrl.value)
    }
  }
  
  // 生成二维码
  nextTick(() => {
    generateQRCode()
  })
}

/**
 * 清理 ANSI 转义码和多余字符
 */
function cleanUrl(url: string): string {
  if (!url) return ''
  
  // 移除所有 ANSI 转义码（包括各种格式）
  // \x1b[ 或 \u001b[ 开头的控制序列
  url = url.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-PR-TZcf-nqry=><]/g, '')
  
  // 移除末尾的斜杠和空白字符
  url = url.replace(/\/+$/, '').trim()
  
  // 移除 URL 中的控制字符（包括不可见字符）
  url = url.replace(/[\x00-\x1F\x7F]/g, '')
  
  // 再次确保移除可能的残留转义码
  url = url.replace(/\[[0-9;]*m/g, '')
  
  return url
}

/**
 * 从日志中解析服务地址
 */
function parseServiceUrlsFromLog(log: string) {
  const urls: string[] = []
  const seenUrls = new Set<string>()
  
  console.log('[Preview] parseServiceUrlsFromLog: 开始解析日志，长度:', log.length)
  
  // 匹配预览服务器格式: • 本地: http://localhost:4174 或 • 网络: http://192.168.x.x:4174
  const previewLocalMatch = log.match(/•\s*本地:\s*(http[s]?:\/\/[^\s│\|]+)/i)
  if (previewLocalMatch) {
    const url = cleanUrl(previewLocalMatch[1])
    const normalizedUrl = normalizeUrl(url)
    if (url && normalizedUrl && !seenUrls.has(normalizedUrl)) {
      urls.push(url)
      seenUrls.add(normalizedUrl)
      console.log('[Preview] parseServiceUrlsFromLog: 找到预览 Local URL:', url)
    }
  }
  
  const previewNetworkMatch = log.match(/•\s*网络:\s*(http[s]?:\/\/[^\s│\|]+)/i)
  if (previewNetworkMatch) {
    const url = cleanUrl(previewNetworkMatch[1])
    const normalizedUrl = normalizeUrl(url)
    if (url && normalizedUrl && !seenUrls.has(normalizedUrl)) {
      urls.push(url)
      seenUrls.add(normalizedUrl)
      console.log('[Preview] parseServiceUrlsFromLog: 找到预览 Network URL:', url)
    }
  }
  
  // 匹配 Vite Local 格式: Local: http://localhost:5176/
  const viteLocalMatch = log.match(/Local:\s*(http[s]?:\/\/[^\s\[\]]+)/i)
  if (viteLocalMatch) {
    const url = cleanUrl(viteLocalMatch[1])
    const normalizedUrl = normalizeUrl(url)
    if (url && normalizedUrl && !seenUrls.has(normalizedUrl)) {
      urls.push(url)
      seenUrls.add(normalizedUrl)
      console.log('[Preview] parseServiceUrlsFromLog: 找到 Vite Local URL:', url)
    }
  }
  
  // 匹配 Vite Network 格式: Network: http://192.168.x.x:5176/
  const viteNetworkMatch = log.match(/Network:\s*(http[s]?:\/\/[^\s\[\]]+)/i)
  if (viteNetworkMatch) {
    const url = cleanUrl(viteNetworkMatch[1])
    const normalizedUrl = normalizeUrl(url)
    if (url && normalizedUrl && !seenUrls.has(normalizedUrl)) {
      urls.push(url)
      seenUrls.add(normalizedUrl)
      console.log('[Preview] parseServiceUrlsFromLog: 找到 Vite Network URL:', url)
    }
  }
  
  // 匹配预览服务器格式: > 网络: http://192.168.x.x:4174/ | 或 > Local: http://localhost:4174/
  const previewNetworkMatch2 = log.match(/>\s*网络:\s*(http[s]?:\/\/[^\s\|]+)/i)
  if (previewNetworkMatch2) {
    const url = cleanUrl(previewNetworkMatch2[1])
    const normalizedUrl = normalizeUrl(url)
    if (url && normalizedUrl && !seenUrls.has(normalizedUrl)) {
      urls.push(url)
      seenUrls.add(normalizedUrl)
      console.log('[Preview] parseServiceUrlsFromLog: 找到预览 Network URL (格式2):', url)
    }
  }
  
  const previewLocalMatch2 = log.match(/>\s*Local:\s*(http[s]?:\/\/[^\s\|]+)/i)
  if (previewLocalMatch2) {
    const url = cleanUrl(previewLocalMatch2[1])
    const normalizedUrl = normalizeUrl(url)
    if (url && normalizedUrl && !seenUrls.has(normalizedUrl)) {
      urls.push(url)
      seenUrls.add(normalizedUrl)
      console.log('[Preview] parseServiceUrlsFromLog: 找到预览 Local URL (格式2):', url)
    }
  }
  
  // 匹配通用端口格式: localhost:5176 或 127.0.0.1:5176 或 0.0.0.0:4174
  const portMatch = log.match(/(?:http[s]?:\/\/)?(?:localhost|127\.0\.0\.1|0\.0\.0\.0)[:\s]+(\d+)/)
  if (portMatch) {
    const port = portMatch[1]
    const url = `http://localhost:${port}`
    const normalizedUrl = normalizeUrl(url)
    if (normalizedUrl && !seenUrls.has(normalizedUrl)) {
      urls.push(url)
      seenUrls.add(normalizedUrl)
      console.log('[Preview] parseServiceUrlsFromLog: 找到端口 URL:', url)
    }
  }
  
  // 匹配其他格式的 URL（但不包括已有格式）
  const otherMatches = log.matchAll(/http[s]?:\/\/[^\s\[\]\|]+/g)
  for (const match of otherMatches) {
    let url = cleanUrl(match[0])
    
    // 只处理有效的服务地址
    if (url && (
      url.includes('localhost') || 
      url.includes('127.0.0.1') || 
      /^(http[s]?:\/\/)?(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/i.test(url)
    )) {
      // 使用标准化后的 URL 进行比较
      const normalizedUrl = normalizeUrl(url)
      if (normalizedUrl && !seenUrls.has(normalizedUrl)) {
        urls.push(url) // 保存清理后的原始格式
        seenUrls.add(normalizedUrl)
        console.log('[Preview] parseServiceUrlsFromLog: 找到其他格式 URL:', url)
      }
    }
  }
  
  console.log('[Preview] parseServiceUrlsFromLog: 解析完成，找到', urls.length, '个 URL:', urls)
  return urls
}

/**
 * 生成二维码
 */
async function generateQRCode() {
  if (!primaryServiceUrl.value || !qrCodeCanvas.value) return
  
  try {
    // 固定 canvas 尺寸，避免布局混乱
    const size = 200
    qrCodeCanvas.value.width = size
    qrCodeCanvas.value.height = size
    
    await QRCode.toCanvas(qrCodeCanvas.value, primaryServiceUrl.value, {
      width: size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })
  } catch (error) {
    console.error('生成二维码失败:', error)
  }
}

/**
 * 切换二维码下拉框显示状态
 */
function toggleQRCodeDropdown() {
  if (!primaryServiceUrl.value) {
    return // 如果没有服务地址，不显示二维码
  }
  showQRCodeDropdown.value = !showQRCodeDropdown.value
  if (showQRCodeDropdown.value && primaryServiceUrl.value) {
    // 显示下拉框时，确保二维码已生成
    nextTick(() => {
      generateQRCode()
    })
  }
}

/**
 * 打开主要服务地址
 */
function handleOpen() {
  if (primaryServiceUrl.value) {
    window.open(primaryServiceUrl.value, '_blank', 'noopener,noreferrer')
  } else {
    console.warn('[Preview] handleOpen: 服务地址为空，无法打开')
    consoleRef.value?.appendWarning('⚠️ 服务地址尚未解析，请稍候...\n')
  }
}

// 监听主要服务地址变化，更新二维码
watch(primaryServiceUrl, () => {
  nextTick(() => {
    generateQRCode()
  })
})

// 事件处理器函数引用（用于正确移除监听器）
let handleOutput: ((data: { executionId: string; data: string; serviceUrl?: string }) => void) | null = null
let handleError: ((data: { executionId: string; data: string }) => void) | null = null
let handleStatus: ((data: { executionId: string; status: string; serviceUrl?: string }) => void) | null = null

// 定期检查日志的定时器
let logCheckInterval: NodeJS.Timeout | null = null

// 点击外部关闭二维码下拉框的事件处理器
let handleClickOutside: ((event: MouseEvent) => void) | null = null

const projectId = route.params.id as string

/**
 * 加载最新日志
 */
async function loadLatestLogs() {
  if (!projectId || !executionId.value) {
    return
  }

  try {
    const response = await projectApi.getLatestExecution(projectId, 'preview', currentViewingEnvironment.value || undefined)
    if (response.success && response.data) {
      const execution = response.data
      
      // 如果日志有更新，追加显示（避免重复显示）
      if (execution.output) {
        // 获取当前控制台内容长度
        const currentLength = consoleRef.value?.getContent().length || 0
        
        // 如果数据库中的日志比当前显示的多，说明有新的日志
        if (execution.output.length > currentLength) {
          // 提取新增的日志部分并追加显示
          const newLogs = execution.output.slice(currentLength)
          if (newLogs.trim()) {
            consoleRef.value?.appendStdout(newLogs)
            console.log(`[Logs] 加载了 ${newLogs.length} 字节的新日志`)
            
            // 从新增的日志中解析服务地址
            const parsedUrls = parseServiceUrlsFromLog(newLogs)
            parsedUrls.forEach(url => addServiceUrl(url))
          }
        } else if (currentLength === 0) {
          // 如果控制台是空的，显示所有日志
          consoleRef.value?.appendStdout(execution.output)
          
          // 从日志中解析服务地址
          const parsedUrls = parseServiceUrlsFromLog(execution.output)
          parsedUrls.forEach(url => addServiceUrl(url))
        }
      }
      
      if (execution.serviceUrl) {
        addServiceUrl(execution.serviceUrl)
      }
    }
  } catch (error) {
    console.error('加载最新日志失败:', error)
  }
}

/**
 * 连接到 WebSocket 房间
 */
function connectToRoom() {
  if (!projectId || !appStore.socket) {
    console.warn('无法连接到 WebSocket 房间: projectId 或 socket 不存在')
    consoleRef.value?.appendError('WebSocket 连接失败: socket 不存在\n')
    return false
  }

  // 检查 WebSocket 是否已连接
  if (!appStore.isConnected || !appStore.socket?.connected) {
    console.warn('WebSocket 未连接，尝试重新连接...')
    consoleRef.value?.appendError('WebSocket 未连接，正在重新连接...\n')
    appStore.connectWebSocket()
    
    // 等待连接后再加入房间
    const checkConnection = setInterval(() => {
      if (appStore.isConnected && appStore.socket?.connected) {
        clearInterval(checkConnection)
        connectToRoom()
      }
    }, 100)
    
    setTimeout(() => {
      clearInterval(checkConnection)
      if (!appStore.isConnected) {
        consoleRef.value?.appendError('WebSocket 连接超时\n')
      }
    }, 5000)
    return false
  }

  // 如果已经连接过，先清理
  if (socket && room) {
    leaveRoom()
  }

  socket = appStore.socket
  room = `project:${projectId}:command:preview`

  console.log(`[WebSocket] 加入房间: ${room}, executionId: ${executionId.value || '未设置'}, socket.connected: ${socket.connected}`)

  // 先绑定事件监听器（在加入房间之前），确保不会错过任何日志
  handleOutput = (data: { executionId: string; data: string; serviceUrl?: string }) => {
    console.log('[WebSocket] 收到 command:output:', { executionId: data.executionId, dataLength: data.data?.length || 0 })
    // 如果 executionId 还没设置，先接收所有日志（避免错过早期日志）
    if (!executionId.value || data.executionId === executionId.value) {
      consoleRef.value?.appendStdout(data.data)
      
      // 从日志中解析服务地址
      const parsedUrls = parseServiceUrlsFromLog(data.data)
      parsedUrls.forEach(url => addServiceUrl(url))
      
      if (data.serviceUrl) {
        addServiceUrl(data.serviceUrl)
      }
    } else {
      console.warn(`[WebSocket] executionId 不匹配: 期望 ${executionId.value}, 收到 ${data.executionId}`)
    }
  }

  handleError = (data: { executionId: string; data: string }) => {
    console.log('[WebSocket] 收到 command:error:', { executionId: data.executionId, dataLength: data.data?.length || 0 })
    if (data.executionId === executionId.value) {
      consoleRef.value?.appendStderr(data.data)
    } else {
      console.warn(`[WebSocket] executionId 不匹配: 期望 ${executionId.value}, 收到 ${data.executionId}`)
    }
  }

  handleStatus = (data: { executionId: string; status: string; serviceUrl?: string }) => {
    console.log('[WebSocket] 收到 command:status:', data)
    // 如果 executionId 还没设置，先接收所有状态（避免错过早期状态）
    if (!executionId.value || data.executionId === executionId.value) {
      if (data.status === 'running') {
        // 启动成功后刷新环境列表
        refreshRunningEnvironments()
      } else if (data.status === 'completed' || data.status === 'failed' || data.status === 'stopped') {
        // 停止后刷新环境列表
        refreshRunningEnvironments()
      }
      if (data.serviceUrl) {
        console.log('[Preview] handleStatus: 收到服务地址:', data.serviceUrl)
        addServiceUrl(data.serviceUrl)
      }
    } else {
      console.warn(`[WebSocket] executionId 不匹配: 期望 ${executionId.value}, 收到 ${data.executionId}`)
    }
  }

  // 先移除可能存在的监听器，再添加新的
  if (handleOutput) socket.off('command:output', handleOutput)
  if (handleError) socket.off('command:error', handleError)
  if (handleStatus) socket.off('command:status', handleStatus)

  // 立即绑定事件监听器（在加入房间之前），确保不会错过日志
  socket.on('command:output', handleOutput)
  socket.on('command:error', handleError)
  socket.on('command:status', handleStatus)

  // 添加超时处理：如果3秒内没有响应，认为连接成功
  let joinRoomTimeout: NodeJS.Timeout | null = null
  let joinRoomSuccess = false

  // 监听 joinedRoom 事件（而不是依赖回调）
  const handleJoinedRoom = (data: any) => {
    console.log('[WebSocket] 收到 joinedRoom 事件:', data)
    if (data && data.room === room) {
      joinRoomSuccess = true
      if (joinRoomTimeout) {
        clearTimeout(joinRoomTimeout)
        joinRoomTimeout = null
      }
      consoleRef.value?.appendInfo('✅ 实时日志连接成功\n')
      socket.off('joinedRoom', handleJoinedRoom)
      
      // 连接成功后，立即获取最新日志并显示
      loadLatestLogs()
      
      // 启动定期检查日志（每2秒检查一次，确保不遗漏日志）
      if (logCheckInterval) {
        clearInterval(logCheckInterval)
      }
      logCheckInterval = setInterval(() => {
        if (currentViewingEnvironment.value && isEnvironmentRunning(currentViewingEnvironment.value) && executionId.value) {
          loadLatestLogs()
        } else {
          // 如果项目已停止，清除定时器
          if (logCheckInterval) {
            clearInterval(logCheckInterval)
            logCheckInterval = null
          }
        }
      }, 2000)
    }
  }

  socket.on('joinedRoom', handleJoinedRoom)

  // 加入房间
  socket.emit('joinRoom', { room }, (response: any) => {
    console.log('[WebSocket] joinRoom 回调响应:', response)
    if (response && !joinRoomSuccess) {
      joinRoomSuccess = true
      if (joinRoomTimeout) {
        clearTimeout(joinRoomTimeout)
        joinRoomTimeout = null
      }
      socket.off('joinedRoom', handleJoinedRoom)
      if (response.event === 'joinedRoom' || (response.data && response.data.room === room)) {
        consoleRef.value?.appendInfo('✅ 实时日志连接成功\n')
        // 连接成功后，立即获取最新日志并显示
        loadLatestLogs()
        
        // 启动定期检查日志
        if (logCheckInterval) {
          clearInterval(logCheckInterval)
        }
        logCheckInterval = setInterval(() => {
          if (currentViewingEnvironment.value && isEnvironmentRunning(currentViewingEnvironment.value) && executionId.value) {
            loadLatestLogs()
          } else {
            if (logCheckInterval) {
              clearInterval(logCheckInterval)
              logCheckInterval = null
            }
          }
        }, 2000)
      } else {
        consoleRef.value?.appendWarning('⚠️ 加入房间响应异常\n')
      }
    }
  })

  // 超时处理：3秒后如果没有响应，认为连接成功
  joinRoomTimeout = setTimeout(() => {
    if (!joinRoomSuccess) {
      console.warn('[WebSocket] joinRoom 超时，但可能已连接成功')
      socket.off('joinedRoom', handleJoinedRoom)
      consoleRef.value?.appendInfo('✅ 实时日志连接成功（超时后默认成功）\n')
      // 即使超时，也尝试加载最新日志
      loadLatestLogs()
      
      // 启动定期检查日志
      if (logCheckInterval) {
        clearInterval(logCheckInterval)
      }
      logCheckInterval = setInterval(() => {
        if (currentViewingEnvironment.value && isEnvironmentRunning(currentViewingEnvironment.value) && executionId.value) {
          loadLatestLogs()
        } else {
          if (logCheckInterval) {
            clearInterval(logCheckInterval)
            logCheckInterval = null
          }
        }
      }, 2000)
    }
  }, 3000)
  
  return true
}

/**
 * 离开 WebSocket 房间
 */
function leaveRoom() {
  if (socket && room) {
    console.log(`[WebSocket] 离开房间: ${room}`)
    socket.emit('leaveRoom', { room })
    
    // 移除事件监听器（使用保存的 handler 引用）
    if (handleOutput) {
      socket.off('command:output', handleOutput)
      handleOutput = null
    }
    if (handleError) {
      socket.off('command:error', handleError)
      handleError = null
    }
    if (handleStatus) {
      socket.off('command:status', handleStatus)
      handleStatus = null
    }
    
    // 清除定期检查日志的定时器
    if (logCheckInterval) {
      clearInterval(logCheckInterval)
      logCheckInterval = null
    }
    
    room = null
  }
}

/**
 * 预览项目
 */
async function handlePreview() {
  if (!projectId || !canPreview(selectedEnvironment.value) || isEnvironmentRunning(selectedEnvironment.value)) return

  loading.value = true
  
  // 清空控制台并显示启动信息
  consoleRef.value?.clear()
  const envLabel = getEnvironmentLabel(selectedEnvironment.value)
  consoleRef.value?.appendInfo(`👁️ 正在预览项目 (${envLabel})...\n`)
  serviceUrls.value = [] // 清空服务地址
  primaryServiceUrl.value = null
  
  try {
    // 确保 WebSocket 已连接
    if (!appStore.socket || !appStore.isConnected) {
      consoleRef.value?.appendInfo('📡 正在连接 WebSocket...\n')
      appStore.connectWebSocket()
      // 等待连接建立（最多等待 2 秒）
      await new Promise<void>((resolve, reject) => {
        if (appStore.isConnected && appStore.socket?.connected) {
          consoleRef.value?.appendInfo('✅ WebSocket 连接成功\n')
          resolve()
          return
        }
        
        let attempts = 0
        const maxAttempts = 40 // 最多等待 2 秒 (40 * 50ms)
        const checkInterval = setInterval(() => {
          attempts++
          if (appStore.isConnected && appStore.socket?.connected) {
            clearInterval(checkInterval)
            consoleRef.value?.appendInfo('✅ WebSocket 连接成功\n')
            resolve()
          } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval)
            reject(new Error('WebSocket 连接超时'))
          }
        }, 50)
      })
    }

    if (!appStore.socket || !appStore.socket.connected) {
      throw new Error('WebSocket 连接失败')
    }

    const tempSocket = appStore.socket
    const tempRoom = `project:${projectId}:command:preview`
    
    consoleRef.value?.appendInfo(`📡 正在加入日志房间: ${tempRoom}\n`)
    
    // 先定义监听器（使用临时变量存储 executionId，稍后更新）
    let tempExecutionId: string | null = null
    let hasReceivedFirstLog = false
    
    handleOutput = (data: { executionId: string; data: string; serviceUrl?: string }) => {
      const targetId = executionId.value || tempExecutionId
      // 如果 executionId 还没设置，先接收所有日志（避免错过早期日志）
      if (!targetId || data.executionId === targetId) {
        if (!hasReceivedFirstLog && data.data.trim()) {
          hasReceivedFirstLog = true
        }
        // 实时显示日志
        consoleRef.value?.appendStdout(data.data)
        
        // 从日志中解析服务地址
        const parsedUrls = parseServiceUrlsFromLog(data.data)
        parsedUrls.forEach(url => addServiceUrl(url))
        
        // 更新服务地址（如果直接提供了，需要清理）
        if (data.serviceUrl) {
          addServiceUrl(data.serviceUrl)
        }
      }
    }

    handleError = (data: { executionId: string; data: string }) => {
      const targetId = executionId.value || tempExecutionId
      if (!targetId || data.executionId === targetId) {
        consoleRef.value?.appendStderr(data.data)
      }
    }

    handleStatus = (data: { executionId: string; status: string; serviceUrl?: string }) => {
      const targetId = executionId.value || tempExecutionId
      if (!targetId || data.executionId === targetId) {
        if (data.status === 'running') {
          // 启动成功后刷新环境列表
          refreshRunningEnvironments()
        } else if (data.status === 'stopped' || data.status === 'completed' || data.status === 'failed') {
          // 停止后刷新环境列表
          refreshRunningEnvironments()
          if (data.status === 'completed') {
            consoleRef.value?.appendInfo('\n✅ 命令执行完成\n')
          } else if (data.status === 'failed') {
            consoleRef.value?.appendError('\n❌ 命令执行失败\n')
          } else {
            consoleRef.value?.appendInfo('\n⏹️  命令已停止\n')
          }
        }
        if (data.serviceUrl) {
          console.log('[Preview] handlePreview handleStatus: 收到服务地址:', data.serviceUrl)
          addServiceUrl(data.serviceUrl)
        }
      }
    }

    // 移除旧的监听器并立即绑定新的（在启动命令之前）
    tempSocket.off('command:output', handleOutput)
    tempSocket.off('command:error', handleError)
    tempSocket.off('command:status', handleStatus)
    tempSocket.on('command:output', handleOutput)
    tempSocket.on('command:error', handleError)
    tempSocket.on('command:status', handleStatus)
    
    // 立即加入房间（在启动命令之前）
    room = tempRoom
    socket = tempSocket
    
    // 加入房间并等待确认
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('加入房间超时'))
      }, 3000)
      
      const handleJoinedRoom = (data: any) => {
        if (data?.room === tempRoom) {
          clearTimeout(timeout)
          tempSocket.off('joinedRoom', handleJoinedRoom)
          consoleRef.value?.appendInfo('✅ 已加入日志房间，开始接收实时日志...\n')
          resolve()
        }
      }
      
      tempSocket.on('joinedRoom', handleJoinedRoom)
      tempSocket.emit('joinRoom', { room: tempRoom }, (response: any) => {
        if (response?.event === 'joinedRoom' || (response?.data && response.data.room === tempRoom)) {
          clearTimeout(timeout)
          tempSocket.off('joinedRoom', handleJoinedRoom)
          consoleRef.value?.appendInfo('✅ 已加入日志房间，开始接收实时日志...\n')
          resolve()
        }
      })
    })
    
    // 启动预览（此时监听器已经绑定，房间已加入）
    consoleRef.value?.appendInfo('⚡ 正在执行预览命令...\n\n')
    const response = await projectApi.executeCommand(projectId, 'preview', selectedEnvironment.value)
    
    if (response.success && response.data) {
      executionId.value = response.data.id
      tempExecutionId = response.data.id
      currentViewingEnvironment.value = selectedEnvironment.value
      
      // 更新 URL
      router.replace({ query: { ...route.query, env: selectedEnvironment.value } })
      
      // 刷新环境列表
      await refreshRunningEnvironments()
      
      consoleRef.value?.appendInfo(`📝 执行 ID: ${response.data.id}\n`)
      
      // 如果有初始输出，立即显示
      if (response.data.output) {
        consoleRef.value?.appendStdout(response.data.output)
      }
      
      // 如果有初始服务地址，立即显示
      if (response.data.serviceUrl) {
        addServiceUrl(response.data.serviceUrl)
        consoleRef.value?.appendInfo(`\n✅ 服务地址: ${response.data.serviceUrl}\n`)
      }
      
      // 从初始输出中解析服务地址
      if (response.data.output) {
        const parsedUrls = parseServiceUrlsFromLog(response.data.output)
        parsedUrls.forEach(url => addServiceUrl(url))
      }
      
      // 启动定期检查日志作为兜底机制（每 2 秒检查一次）
      if (logCheckInterval) {
        clearInterval(logCheckInterval)
      }
      logCheckInterval = setInterval(() => {
        if (currentViewingEnvironment.value && isEnvironmentRunning(currentViewingEnvironment.value) && executionId.value) {
          loadLatestLogs()
        } else {
          if (logCheckInterval) {
            clearInterval(logCheckInterval)
            logCheckInterval = null
          }
        }
      }, 2000)
      
      // 3 秒后再次检查服务地址（有些服务启动较慢）
      setTimeout(() => {
        if (currentViewingEnvironment.value && isEnvironmentRunning(currentViewingEnvironment.value) && !primaryServiceUrl.value) {
          loadLatestLogs()
        }
      }, 3000)
      
      // 5 秒后再次检查服务地址（预览服务器可能需要更长时间）
      setTimeout(() => {
        if (currentViewingEnvironment.value && isEnvironmentRunning(currentViewingEnvironment.value) && !primaryServiceUrl.value) {
          loadLatestLogs()
          console.log('[Preview] 5秒后检查服务地址:', {
            currentViewingEnvironment: currentViewingEnvironment.value,
            isRunning: isEnvironmentRunning(currentViewingEnvironment.value),
            primaryServiceUrl: primaryServiceUrl.value,
          })
        }
      }, 5000)
    } else {
      throw new Error(response.message || '预览失败')
    }
  } catch (error: any) {
    console.error('预览项目失败:', error)
    consoleRef.value?.appendError(`\n❌ 预览失败: ${error.message || '未知错误'}\n`)
    
    // 清理监听器
    if (appStore.socket) {
      appStore.socket.off('command:output', handleOutput)
      appStore.socket.off('command:error', handleError)
      appStore.socket.off('command:status', handleStatus)
    }
    
    // 清理定时器
    if (logCheckInterval) {
      clearInterval(logCheckInterval)
      logCheckInterval = null
    }
  } finally {
    loading.value = false
  }
}

/**
 * 停止项目
 */
async function handleStop() {
  if (!projectId || !executionId.value || !currentViewingEnvironment.value) return

  loading.value = true
  const envLabel = getEnvironmentLabel(currentViewingEnvironment.value)
  consoleRef.value?.appendInfo(`正在停止 ${envLabel}...\n`)

  try {
    const response = await projectApi.stopCommand(projectId, executionId.value)
    if (response.success) {
      // 立即清除前端状态
      const stoppedEnvironment = currentViewingEnvironment.value
      const stoppedExecutionId = executionId.value
      executionId.value = null
      currentViewingEnvironment.value = null
      serviceUrls.value = []
      primaryServiceUrl.value = null
      showQRCodeDropdown.value = false
      
      // 离开房间
      leaveRoom()
      
      // 刷新环境列表
      await refreshRunningEnvironments()
      
      // 如果还有其他运行中的环境，切换到第一个
      if (runningEnvironments.value.length > 0) {
        const firstEnv = runningEnvironments.value[0].environment || 'production'
        await switchEnvironment(firstEnv)
      } else {
        // 清空控制台
        setTimeout(() => {
          consoleRef.value?.clear()
          consoleRef.value?.appendInfo('预览已停止\n')
        }, 500)
      }
    } else {
      throw new Error(response.message || '停止失败')
    }
  } catch (error: any) {
    console.error('停止预览失败:', error)
    consoleRef.value?.appendError(`停止失败: ${error.message || '未知错误'}\n`)
    // 即使停止失败，也刷新环境列表
    await refreshRunningEnvironments()
  } finally {
    loading.value = false
  }
}

/**
 * 检查是否有正在运行的命令
 */
async function checkRunningCommand() {
  try {
    // 先刷新运行中的环境列表
    await refreshRunningEnvironments()
    
    // 优先使用 URL 中的环境参数（刷新后保持用户选择的环境）
    const envFromUrl = route.query.env as string
    const targetEnv = (envFromUrl && ['development', 'production', 'test', 'staging', 'preview'].includes(envFromUrl))
      ? envFromUrl
      : selectedEnvironment.value
    
    // 如果 URL 中的环境正在运行，切换到该环境
    if (envFromUrl && runningEnvironments.value.some(e => (e.environment || 'production') === envFromUrl)) {
      await switchEnvironment(envFromUrl)
    } else if (runningEnvironments.value.length > 0) {
      // 如果 URL 中的环境未运行，但其他环境在运行，切换到第一个运行中的环境
      const firstRunningEnv = runningEnvironments.value[0].environment || 'production'
      await switchEnvironment(firstRunningEnv)
    } else {
      // 没有运行中的环境，设置当前查看的环境为 URL 中的环境或选中的环境
      currentViewingEnvironment.value = targetEnv
      consoleRef.value?.clear()
      executionId.value = null
      serviceUrls.value = []
      primaryServiceUrl.value = null
      consoleRef.value?.appendInfo(`环境 ${getEnvironmentLabel(targetEnv)} 未运行\n`)
    }
  } catch (error) {
    console.error('检查运行状态失败:', error)
    consoleRef.value?.clear()
    executionId.value = null
    const envFromUrl = route.query.env as string
    const targetEnv = (envFromUrl && ['development', 'production', 'test', 'staging', 'preview'].includes(envFromUrl))
      ? envFromUrl
      : selectedEnvironment.value
    currentViewingEnvironment.value = targetEnv
    serviceUrls.value = []
    primaryServiceUrl.value = null
    consoleRef.value?.appendError('检查运行状态失败\n')
  }
}

// 处理运行环境下拉框选择
async function handleRunningEnvSelect(env: string) {
  // 同步更新环境选择器（不触发 watch，避免重复调用）
  isInitializing.value = true
  selectedEnvironment.value = env as any
  await nextTick()
  isInitializing.value = false
  
  // 切换到该环境（查看日志）
  await switchEnvironment(env)
}

// 处理环境选择器选择
async function handleEnvironmentSelect(env: string) {
  // 刷新运行中的环境列表，获取最新状态
  await refreshRunningEnvironments()
  
  // 检查该环境是否正在运行
  if (isEnvironmentRunning(env)) {
    // 环境正在运行，切换到查看该环境的日志
    await switchEnvironment(env)
  } else {
    // 环境未运行，更新当前查看的环境（用于更新标题标签）
    currentViewingEnvironment.value = env
    // 更新 URL
    router.replace({ query: { ...route.query, env } })
    // 清空控制台和相关状态
    consoleRef.value?.clear()
    leaveRoom()
    executionId.value = null
    serviceUrls.value = []
    primaryServiceUrl.value = null
    showQRCodeDropdown.value = false
    consoleRef.value?.appendInfo(`环境 ${getEnvironmentLabel(env)} 未运行\n`)
  }
}

// 监听环境选择器变化，更新 URL
const isInitializing = ref(true)
watch(selectedEnvironment, async (newEnv, oldEnv) => {
  // 跳过初始化时的触发
  if (isInitializing.value) {
    return
  }
  
  // 更新 URL
  router.replace({ query: { ...route.query, env: newEnv } })
  
  // 刷新运行中的环境列表，获取最新状态
  await refreshRunningEnvironments()
  
  // 如果该环境正在运行，切换到查看该环境的日志
  if (isEnvironmentRunning(newEnv)) {
    await switchEnvironment(newEnv)
  } else {
    // 环境未运行，更新当前查看的环境（用于更新标题标签）
    currentViewingEnvironment.value = newEnv
    // 清空控制台和相关状态
    consoleRef.value?.clear()
    leaveRoom()
    executionId.value = null
    serviceUrls.value = []
    primaryServiceUrl.value = null
    showQRCodeDropdown.value = false
    consoleRef.value?.appendInfo(`环境 ${getEnvironmentLabel(newEnv)} 未运行\n`)
  }
})

// 在 onMounted 中设置初始化完成标志
onMounted(async () => {
  // 页面加载时，先清空所有状态和日志
  consoleRef.value?.clear()
  currentViewingEnvironment.value = null
  executionId.value = null
  serviceUrls.value = []
  primaryServiceUrl.value = null
  showQRCodeDropdown.value = false
  
  // 确保从 URL 参数读取环境（刷新后保持）
  const envFromUrl = route.query.env as string
  if (envFromUrl && ['development', 'production', 'test', 'staging', 'preview'].includes(envFromUrl)) {
    selectedEnvironment.value = envFromUrl as any
  } else {
    // 如果 URL 中没有环境参数，添加默认环境到 URL
    router.replace({ query: { ...route.query, env: selectedEnvironment.value } })
  }
  
  // 加载所有环境的打包状态
  await loadAllEnvironmentBuildStatuses()
  
  // 点击外部关闭二维码下拉框
  handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement
    if (!target.closest('.qr-code-dropdown-wrapper')) {
      showQRCodeDropdown.value = false
    }
  }
  document.addEventListener('click', handleClickOutside)
  
  // 确保 WebSocket 已连接
  if (!appStore.socket || !appStore.isConnected) {
    appStore.connectWebSocket()
    // 等待连接建立
    await new Promise(resolve => {
      if (appStore.isConnected) {
        resolve(true)
      } else {
        const checkInterval = setInterval(() => {
          if (appStore.isConnected) {
            clearInterval(checkInterval)
            resolve(true)
          }
        }, 100)
        setTimeout(() => {
          clearInterval(checkInterval)
          resolve(false)
        }, 5000)
      }
    })
  }

  // 检查是否有正在运行的命令（支持多环境）
  await checkRunningCommand()
  
  // 标记初始化完成，允许 watch 触发
  isInitializing.value = false
  
  // 定期刷新运行中的环境列表和打包状态（每5秒）
  const refreshInterval = setInterval(() => {
    refreshRunningEnvironments()
    loadAllEnvironmentBuildStatuses()
  }, 5000)
  
  // 组件卸载时清理
  onUnmounted(() => {
    clearInterval(refreshInterval)
    // 清理事件监听器
    if (handleClickOutside) {
      document.removeEventListener('click', handleClickOutside)
      handleClickOutside = null
    }
    leaveRoom()
  })
})
</script>

<style scoped>
.project-preview-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  padding: 0;
  background: var(--content-bg);
  color: var(--color-text-primary);
}

.page-header {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-sm);
  padding: var(--size-spacing-lg);
  flex-shrink: 0;
  background: var(--content-bg);
  border-bottom: 1px solid var(--color-border-light);
}

.page-header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--size-spacing-md);
}

.page-header-left {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-sm);
  flex: 1;
  min-width: 0;
}

.back-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color 0.2s ease;
  flex-shrink: 0;
}

.back-icon:hover {
  color: var(--color-text-primary);
}

.page-title {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-sm);
  font-size: var(--font-size-lg);
  font-weight: var(--size-font-weight-semibold);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  margin: 0;
}

.page-title-env-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  font-size: var(--font-size-xs);
  font-weight: var(--size-font-weight-medium);
  color: var(--color-text-secondary);
  background: var(--color-bg-component);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-sm);
  white-space: nowrap;
  flex-shrink: 0;
  position: relative;
  /* 书签效果：右上角小三角缺口 */
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, calc(100% - 8px) 100%, 0 100%);
  padding-right: 14px;
}

@media (max-width: 768px) {
  .page-title {
    font-size: var(--font-size-base);
  }
  
  .page-header-top {
    flex-wrap: wrap;
    gap: var(--size-spacing-sm);
  }
  
  .page-header-left {
    flex: 1;
    min-width: 0;
  }
  
  .page-header-right {
    width: 100%;
  }
  
  .header-button-group {
    width: 100%;
    flex-wrap: wrap;
  }
}

.page-header-right {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-md);
}

.header-button-group {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-sm);
}

.page-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
  width: 100%;
  padding: 0;
}

.console-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* 图标按钮样式 */
.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: var(--size-radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon.btn-primary {
  background: var(--theme-color-primary);
  color: white;
}

.btn-icon.btn-primary:hover:not(:disabled) {
  background: var(--theme-color-primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-icon.btn-danger {
  background: var(--color-danger-default, #ff4d4f);
  color: white;
}

.btn-icon.btn-danger:hover:not(:disabled) {
  background: var(--color-danger-hover, #ff7875);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-icon.btn-success {
  background: var(--color-success-default, #52c41a);
  color: white;
}

.btn-icon.btn-success:hover:not(:disabled) {
  background: var(--color-success-hover, #73d13d);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

/* 二维码下拉框 */
.qr-code-dropdown-wrapper {
  position: relative;
  display: inline-block;
}

.qr-code-dropdown {
  position: absolute;
  top: calc(100% + var(--size-spacing-xs));
  right: 0;
  z-index: 1000;
  background: var(--color-bg-container);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  box-shadow: var(--shadow-lg);
  padding: var(--size-spacing-lg);
  min-width: 250px;
  max-width: 300px;
  /* 确保下拉框不会超出视口 */
  max-height: calc(100vh - 200px);
  overflow: hidden;
}

.qr-code-dropdown-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--size-spacing-md);
  width: 100%;
}

.qr-code-canvas {
  display: block;
  width: 200px !important;
  height: 200px !important;
  background: white;
  padding: var(--size-spacing-sm);
  border-radius: var(--size-radius-sm);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.qr-code-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: var(--size-font-weight-medium);
  text-align: center;
  width: 100%;
}

.qr-code-url {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  word-break: break-all;
  text-align: center;
  max-width: 100%;
  font-family: 'Courier New', 'Monaco', monospace;
  padding: var(--size-spacing-xs);
  background: var(--color-bg-component);
  border-radius: var(--size-radius-sm);
  width: 100%;
  box-sizing: border-box;
}
</style>
