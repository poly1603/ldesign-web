<template>
  <div class="project-build-page">
    <div class="page-header">
      <div class="page-header-top">
        <div class="page-header-left">
          <span class="back-icon" @click="router.back()" title="返回">
            <ArrowLeft :size="20" />
          </span>
          <h1 class="page-title">
            打包项目
            <span v-if="currentViewingEnvironment" class="page-title-env-tag">
              {{ getEnvironmentLabel(currentViewingEnvironment) }}
            </span>
          </h1>
          <!-- 打包状态卡片 -->
          <BuildStatusCard
            v-if="buildStatus?.built"
            :status="buildStatus"
            :environment="currentViewingEnvironment || selectedEnvironment"
            @click="showBuildStatusDialog = true"
          />
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
            
            <!-- 环境选择器（用于打包新环境） -->
            <EnvironmentSelect
              v-model="selectedEnvironment"
              :options="environmentOptions"
              :disabled="loading"
              title="选择要打包的环境"
              @update:modelValue="handleEnvironmentSelect"
            />
            
            <!-- 打包按钮 -->
            <Tooltip
              :content="isEnvironmentRunning(selectedEnvironment) ? '该环境正在打包中，请选择其他环境打包' : '打包选中的环境'"
              placement="bottom"
            >
              <button
                class="btn-icon btn-primary"
                :disabled="isEnvironmentRunning(selectedEnvironment) || loading"
                @click="handleBuild"
              >
                <Package :size="18" />
              </button>
            </Tooltip>
            
            <!-- 停止按钮 -->
            <Tooltip
              v-if="currentViewingEnvironment && isEnvironmentRunning(currentViewingEnvironment)"
              content="停止当前环境打包"
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
    
    <!-- 打包状态对话框 -->
    <BuildStatusDialog
      v-if="showBuildStatusDialog && buildStatus"
      :status="buildStatus"
      :environment="currentViewingEnvironment || selectedEnvironment"
      @close="showBuildStatusDialog = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Package, Square } from 'lucide-vue-next'
import { projectApi } from '../api/services'
import { useAppStore } from '../stores/app'
import Console from '../components/Console.vue'
import EnvironmentSelect from '../components/common/EnvironmentSelect.vue'
import RunningEnvironmentsDropdown from '../components/common/RunningEnvironmentsDropdown.vue'
import Tooltip from '../components/common/Tooltip.vue'
import BuildStatusCard from '../components/BuildStatusCard.vue'
import BuildStatusDialog from '../components/BuildStatusDialog.vue'
import type { Socket } from 'socket.io-client'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const loading = ref(false)
const executionId = ref<string | null>(null)
const consoleRef = ref<InstanceType<typeof Console> | null>(null)
let socket: Socket | null = null
let room: string | null = null

// 打包状态
const buildStatus = ref<any>(null)
const showBuildStatusDialog = ref(false)
// 每个环境的打包状态映射
const environmentBuildStatuses = ref<Map<string, any>>(new Map())
const projectId = computed(() => route.params.id as string)

// 环境选择（从 URL 参数获取，如果没有则默认生产环境）
const selectedEnvironment = ref<'development' | 'production' | 'test' | 'staging' | 'preview'>('production')

// 初始化时从 URL 读取环境
if (route.query.env && ['development', 'production', 'test', 'staging', 'preview'].includes(route.query.env as string)) {
  selectedEnvironment.value = route.query.env as any
}

// 当前查看的环境（用于显示日志）
const currentViewingEnvironment = ref<string | null>(null)

// 运行中的环境列表
const runningEnvironments = ref<Array<{ environment?: string; executionId: string }>>([])

// 可用环境列表（使用 lucide 图标名称）
const availableEnvironments = [
  { value: 'production', label: '生产环境', icon: 'Circle' },
  { value: 'development', label: '开发环境', icon: 'Circle' },
  { value: 'staging', label: '预发布环境', icon: 'Circle' },
  { value: 'test', label: '测试环境', icon: 'Circle' },
  { value: 'preview', label: '预览环境', icon: 'Circle' },
]

const environmentOptions = computed(() => {
  return availableEnvironments.map(env => {
    const buildStatus = environmentBuildStatuses.value.get(env.value)
    const isRunning = isEnvironmentRunning(env.value)
    const isBuilt = buildStatus?.built === true
    
    return {
      value: env.value,
      label: env.label,
      icon: env.icon,
      badge: isRunning ? '打包中' : (isBuilt ? '已打包' : undefined),
      buildStatus: buildStatus,
      disabled: false,
    }
  })
})

// 环境执行记录映射（environment -> executionId）
const environmentExecutions = ref<Map<string, string>>(new Map())

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
  return runningEnvironments.value.some(e => (e.environment || 'production') === env)
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
  
  // 查找该环境的执行记录
  const envExecution = runningEnvironments.value.find(e => (e.environment || 'production') === env)
  if (envExecution) {
    // 环境正在运行，恢复状态
    executionId.value = envExecution.executionId
    
    // 加载该环境的日志
    await loadEnvironmentLogs(env)
    
    // 连接到该环境的 WebSocket 房间
    connectToRoom()
  } else {
    // 环境未运行，清空所有状态
    executionId.value = null
    consoleRef.value?.appendInfo(`环境 ${getEnvironmentLabel(env)} 未运行\n`)
  }
}

/**
 * 加载环境的日志
 */
async function loadEnvironmentLogs(env: string) {
  try {
    const response = await projectApi.getLatestExecution(projectId.value, 'build', env)
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
    const response = await projectApi.getRunningExecutions(projectId.value, 'build')
    if (response.success && response.data) {
      runningEnvironments.value = response.data.map((exec: any) => ({
        environment: exec.environment || 'production',
        executionId: exec.id,
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

// 事件处理器函数引用（用于正确移除监听器）
let handleOutput: ((data: { executionId: string; data: string }) => void) | null = null
let handleError: ((data: { executionId: string; data: string }) => void) | null = null
let handleStatus: ((data: { executionId: string; status: string }) => void) | null = null

// 定期检查日志的定时器
let logCheckInterval: NodeJS.Timeout | null = null

/**
 * 加载最新日志
 */
async function loadLatestLogs() {
  if (!projectId.value || !executionId.value || !currentViewingEnvironment.value) {
    console.log(`[LoadLogs] 跳过加载: projectId=${projectId.value}, executionId=${executionId.value}, environment=${currentViewingEnvironment.value}`)
    return
  }

  try {
    const response = await projectApi.getLatestExecution(projectId.value, 'build', currentViewingEnvironment.value)
    if (response.success && response.data) {
      const execution = response.data
      console.log(`[LoadLogs] 获取到执行记录: executionId=${execution.id}, output length=${execution.output?.length || 0}`)
      
      // 如果日志有更新，追加显示（避免重复显示）
      if (execution.output) {
        // 获取当前控制台内容（纯文本）
        const currentContent = consoleRef.value?.getContent() || ''
        const currentLength = currentContent.length
        
        if (currentLength === 0 && execution.output.length > 0) {
          // 如果控制台为空，但数据库有日志，直接显示所有日志
          consoleRef.value?.appendStdout(execution.output)
          console.log(`[Logs] 初始加载了 ${execution.output.length} 字节的日志`)
        } else if (execution.output.length > currentLength) {
          // 如果数据库中的日志比当前显示的多，说明有新的日志
          // 检查内容是否匹配（避免内容不匹配导致的问题）
          const prefixMatch = execution.output.startsWith(currentContent)
          if (prefixMatch) {
            // 内容匹配，只追加新增部分
            const newLogs = execution.output.slice(currentLength)
            if (newLogs.trim()) {
              consoleRef.value?.appendStdout(newLogs)
              console.log(`[Logs] 加载了 ${newLogs.length} 字节的新日志`)
            }
          } else {
            // 内容不匹配，重新加载所有日志（可能控制台被清空或内容被修改）
            consoleRef.value?.clear()
            consoleRef.value?.appendStdout(execution.output)
            console.log(`[Logs] 重新加载了 ${execution.output.length} 字节的日志（内容不匹配）`)
          }
        } else if (execution.output.length < currentLength) {
          // 如果数据库的日志比控制台的短，可能是控制台被清空后重新加载
          // 这种情况下，如果内容不匹配，重新加载所有日志
          const prefixMatch = execution.output.startsWith(currentContent.slice(0, Math.min(currentLength, execution.output.length)))
          if (!prefixMatch) {
            consoleRef.value?.clear()
            consoleRef.value?.appendStdout(execution.output)
            console.log(`[Logs] 重新加载了 ${execution.output.length} 字节的日志（内容不匹配）`)
          }
        } else {
          console.log(`[Logs] 日志长度相同，无需更新: ${currentLength}`)
        }
      }
    } else if (response.success && !response.data && executionId.value) {
      // 如果查询不到记录，但之前有 executionId，说明打包已完成（记录已被删除）
      console.log(`[LoadLogs] 执行记录不存在，可能已完成: executionId=${executionId.value}`)
      // 刷新环境列表，清除运行状态
      await refreshRunningEnvironments()
      
      // 如果当前环境不在运行列表中，说明已完成
      if (!isEnvironmentRunning(currentViewingEnvironment.value || '')) {
        // 停止轮询
        if (logCheckInterval) {
          clearInterval(logCheckInterval)
          logCheckInterval = null
        }
        
        // 显示完成状态（如果还没有显示）
        const currentContent = consoleRef.value?.getContent() || ''
        if (!currentContent.includes('✅ 打包完成') && !currentContent.includes('打包成功')) {
          consoleRef.value?.appendInfo('\n✅ 打包完成\n')
        }
        
        // 清除 executionId
        executionId.value = null
        
        // 立即刷新构建状态
        await loadBuildStatus()
        // 刷新所有环境的打包状态
        await loadAllEnvironmentBuildStatuses()
      }
    } else {
      console.log(`[LoadLogs] 查询失败或数据为空: success=${response.success}, data=${response.data ? 'exists' : 'null'}`)
    }
  } catch (error) {
    console.error('加载最新日志失败:', error)
  }
}

/**
 * 连接到 WebSocket 房间
 */
function connectToRoom() {
  if (!projectId.value || !appStore.socket) {
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
  room = `project:${projectId.value}:command:build`

  console.log(`[WebSocket] 加入房间: ${room}, executionId: ${executionId.value || '未设置'}, socket.connected: ${socket.connected}`)

  // 先绑定事件监听器（在加入房间之前），确保不会错过任何日志
  handleOutput = (data: { executionId: string; data: string }) => {
    console.log('[WebSocket] 收到 command:output:', { executionId: data.executionId, dataLength: data.data?.length || 0 })
    if (data.executionId === executionId.value) {
      consoleRef.value?.appendStdout(data.data)
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

  handleStatus = async (data: { executionId: string; status: string }) => {
    console.log('[WebSocket] 收到 command:status:', data)
    if (data.executionId === executionId.value) {
      if (data.status === 'running') {
        // 启动成功后刷新环境列表
        refreshRunningEnvironments()
      } else if (data.status === 'completed' || data.status === 'failed' || data.status === 'stopped') {
        // 停止后刷新环境列表
        refreshRunningEnvironments()
        if (data.status === 'completed') {
          consoleRef.value?.appendInfo('\n✅ 打包完成\n')
          // 打包完成后立即刷新构建状态
          await loadBuildStatus()
        } else if (data.status === 'failed') {
          consoleRef.value?.appendError('\n❌ 打包失败\n')
        } else {
          consoleRef.value?.appendInfo('\n⏹️  打包已停止\n')
        }
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
      
      // 启动定期检查日志（每 500ms 检查一次，确保实时显示）
      if (logCheckInterval) {
        clearInterval(logCheckInterval)
      }
      logCheckInterval = setInterval(() => {
        if (currentViewingEnvironment.value && executionId.value) {
          // 只要 executionId 存在就继续轮询
          loadLatestLogs()
        } else {
          // 如果 executionId 不存在，停止轮询
          if (logCheckInterval) {
            clearInterval(logCheckInterval)
            logCheckInterval = null
          }
        }
      }, 500) // 500ms 轮询，确保实时显示日志
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
        
        // 启动定期检查日志（每 500ms 检查一次，确保实时显示）
        if (logCheckInterval) {
          clearInterval(logCheckInterval)
        }
        logCheckInterval = setInterval(() => {
          if (currentViewingEnvironment.value && executionId.value) {
            // 只要 executionId 存在就继续轮询
            loadLatestLogs()
          } else {
            // 如果 executionId 不存在，停止轮询
            if (logCheckInterval) {
              clearInterval(logCheckInterval)
              logCheckInterval = null
            }
          }
        }, 500) // 500ms 轮询，确保实时显示日志
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
      
      // 启动定期检查日志（每 500ms 检查一次，确保实时显示）
      if (logCheckInterval) {
        clearInterval(logCheckInterval)
      }
      logCheckInterval = setInterval(() => {
        if (currentViewingEnvironment.value && executionId.value) {
          // 只要 executionId 存在就继续轮询
          loadLatestLogs()
        } else {
          // 如果 executionId 不存在，停止轮询
          if (logCheckInterval) {
            clearInterval(logCheckInterval)
            logCheckInterval = null
          }
        }
      }, 500) // 500ms 轮询，确保实时显示日志
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
 * 打包项目
 */
async function handleBuild() {
  if (!projectId.value || isEnvironmentRunning(selectedEnvironment.value)) return

  loading.value = true
  
  // 清空控制台并显示打包信息
  consoleRef.value?.clear()
  const envLabel = getEnvironmentLabel(selectedEnvironment.value)
  consoleRef.value?.appendInfo(`📦 正在打包项目 (${envLabel})...\n`)
  
  try {
    // 确保 WebSocket 已连接
    if (!appStore.socket || !appStore.isConnected) {
      consoleRef.value?.appendInfo('📡 正在连接 WebSocket...\n')
      appStore.connectWebSocket()
      // 等待连接建立（最多等待 5 秒）
      await new Promise<void>((resolve, reject) => {
        // 立即检查一次
        if (appStore.isConnected && appStore.socket?.connected) {
          consoleRef.value?.appendInfo('✅ WebSocket 连接成功\n')
          resolve()
          return
        }
        
        let attempts = 0
        const maxAttempts = 100 // 最多等待 5 秒 (100 * 50ms)
        const checkInterval = setInterval(() => {
          attempts++
          if (appStore.isConnected && appStore.socket?.connected) {
            clearInterval(checkInterval)
            consoleRef.value?.appendInfo('✅ WebSocket 连接成功\n')
            resolve()
          } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval)
            consoleRef.value?.appendError('❌ WebSocket 连接超时，请检查服务器连接\n')
            reject(new Error('WebSocket 连接超时'))
          }
        }, 50)
        
        // 监听 WebSocket 连接事件
        const handleConnect = () => {
          if (appStore.isConnected && appStore.socket?.connected) {
            clearInterval(checkInterval)
            if (appStore.socket) {
              appStore.socket.off('connect', handleConnect)
            }
            consoleRef.value?.appendInfo('✅ WebSocket 连接成功\n')
            resolve()
          }
        }
        
        if (appStore.socket) {
          appStore.socket.on('connect', handleConnect)
        }
      })
    }

    // 再次检查连接状态
    if (!appStore.socket || !appStore.socket.connected) {
      consoleRef.value?.appendError('❌ WebSocket 未连接，请检查服务器状态\n')
      throw new Error('WebSocket 连接失败')
    }

    const tempSocket = appStore.socket
    const tempRoom = `project:${projectId.value}:command:build`
    
    consoleRef.value?.appendInfo(`📡 正在加入日志房间: ${tempRoom}\n`)
    
    // 先定义监听器（使用临时变量存储 executionId，稍后更新）
    let tempExecutionId: string | null = null
    let hasReceivedFirstLog = false
    
    handleOutput = (data: { executionId: string; data: string }) => {
      const targetId = executionId.value || tempExecutionId
      // 如果 executionId 还没设置，先接收所有日志（避免错过早期日志）
      if (!targetId || data.executionId === targetId) {
        if (!hasReceivedFirstLog && data.data.trim()) {
          hasReceivedFirstLog = true
        }
        // 实时显示日志
        consoleRef.value?.appendStdout(data.data)
      }
    }

    handleError = (data: { executionId: string; data: string }) => {
      const targetId = executionId.value || tempExecutionId
      if (!targetId || data.executionId === targetId) {
        consoleRef.value?.appendStderr(data.data)
      }
    }

    handleStatus = async (data: { executionId: string; status: string }) => {
      const targetId = executionId.value || tempExecutionId
      if (!targetId || data.executionId === targetId) {
        if (data.status === 'running') {
          // 启动成功后刷新环境列表
          refreshRunningEnvironments()
        } else if (data.status === 'stopped' || data.status === 'completed' || data.status === 'failed') {
          // 停止后刷新环境列表
          refreshRunningEnvironments()
          if (data.status === 'completed') {
            consoleRef.value?.appendInfo('\n✅ 打包完成\n')
            // 打包完成后立即刷新构建状态
            await loadBuildStatus()
          } else if (data.status === 'failed') {
            consoleRef.value?.appendError('\n❌ 打包失败\n')
          } else {
            consoleRef.value?.appendInfo('\n⏹️  打包已停止\n')
          }
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
        tempSocket.off('joinedRoom', handleJoinedRoom)
        consoleRef.value?.appendError('⚠️ 加入房间超时，但将继续执行打包命令\n')
        // 超时后仍然继续，不阻止打包
        resolve()
      }, 5000) // 增加到 5 秒
      
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
    
    // 执行打包命令（此时监听器已经绑定，房间已加入）
    consoleRef.value?.appendInfo('⚡ 正在执行打包命令...\n\n')
    const response = await projectApi.executeCommand(projectId.value, 'build', selectedEnvironment.value)
    
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
        console.log(`[Build] 显示初始输出: ${response.data.output.length} 字节`)
      }
      
      // 立即加载一次日志，确保获取所有已有的日志（包括初始输出之后的新日志）
      await loadLatestLogs()
      console.log(`[Build] 初始日志加载完成，executionId: ${executionId.value}`)
      
      // 启动定期检查日志作为兜底机制（每 500ms 检查一次，确保实时显示）
      if (logCheckInterval) {
        clearInterval(logCheckInterval)
      }
      console.log(`[Build] 启动日志轮询，executionId: ${executionId.value}`)
      logCheckInterval = setInterval(() => {
        if (currentViewingEnvironment.value && executionId.value) {
          // 只要 executionId 存在就继续轮询，不依赖 isEnvironmentRunning（可能状态更新延迟）
          loadLatestLogs()
        } else {
          // 如果 executionId 不存在，停止轮询
          console.log(`[Build] 停止日志轮询，executionId: ${executionId.value}, environment: ${currentViewingEnvironment.value}`)
          if (logCheckInterval) {
            clearInterval(logCheckInterval)
            logCheckInterval = null
          }
        }
      }, 500) // 500ms 轮询，确保实时显示日志
    } else {
      throw new Error(response.message || '打包失败')
    }
  } catch (error: any) {
    console.error('打包项目失败:', error)
    const errorMessage = error.message || '未知错误'
    
    // 根据错误类型显示不同的错误信息
    if (errorMessage.includes('WebSocket')) {
      consoleRef.value?.appendError(`\n❌ 打包失败: ${errorMessage}\n`)
      consoleRef.value?.appendError('💡 提示: 请确保服务器正在运行，并且 WebSocket 服务已启动\n')
    } else {
      consoleRef.value?.appendError(`\n❌ 打包失败: ${errorMessage}\n`)
    }
    
    // 清理监听器
    if (appStore.socket && handleOutput) {
      appStore.socket.off('command:output', handleOutput)
    }
    if (appStore.socket && handleError) {
      appStore.socket.off('command:error', handleError)
    }
    if (appStore.socket && handleStatus) {
      appStore.socket.off('command:status', handleStatus)
    }
    
    // 清理定时器
    if (logCheckInterval) {
      clearInterval(logCheckInterval)
      logCheckInterval = null
    }
    
    // 清理房间连接
    if (socket && room) {
      leaveRoom()
    }
  } finally {
    loading.value = false
  }
}

/**
 * 停止打包
 */
async function handleStop() {
  if (!projectId.value || !executionId.value || !currentViewingEnvironment.value) return

  loading.value = true
  const envLabel = getEnvironmentLabel(currentViewingEnvironment.value)
  consoleRef.value?.appendInfo(`正在停止 ${envLabel} 打包...\n`)

  try {
    const response = await projectApi.stopCommand(projectId.value, executionId.value)
    if (response.success) {
      // 立即清除前端状态
      const stoppedEnvironment = currentViewingEnvironment.value
      const stoppedExecutionId = executionId.value
      executionId.value = null
      currentViewingEnvironment.value = null
      
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
          consoleRef.value?.appendInfo('打包已停止\n')
        }, 500)
      }
      
      // 验证后端是否真的删除了记录（延迟检查，确保后端处理完成）
      setTimeout(async () => {
        try {
          const checkResponse = await projectApi.getLatestExecution(projectId.value, 'build', stoppedEnvironment)
          if (checkResponse.success && checkResponse.data) {
            // 如果还有记录，说明删除失败
            console.warn(`[Stop] 停止后仍有运行记录: ${checkResponse.data.id}`)
            if (checkResponse.data.id === stoppedExecutionId) {
              console.error('[Stop] 停止的记录仍然存在！')
            }
          } else {
            console.log('[Stop] 确认记录已清除')
          }
        } catch (error) {
          console.error('[Stop] 验证记录删除失败:', error)
        }
      }, 1000)
    } else {
      throw new Error(response.message || '停止失败')
    }
  } catch (error: any) {
    console.error('停止打包失败:', error)
    consoleRef.value?.appendError(`停止失败: ${error.message || '未知错误'}\n`)
    // 即使停止失败，也刷新环境列表
    await refreshRunningEnvironments()
  } finally {
    loading.value = false
  }
}

/**
 * 检查是否有正在运行的打包命令
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
      // 如果 URL 中的环境未运行，但其他环境在运行，优先保持 URL 中的环境（不自动切换）
      // 设置当前查看的环境为 URL 中的环境
      currentViewingEnvironment.value = targetEnv
      consoleRef.value?.clear()
      executionId.value = null
      consoleRef.value?.appendInfo(`环境 ${getEnvironmentLabel(targetEnv)} 未运行\n`)
    } else {
      // 没有运行中的环境，设置当前查看的环境为 URL 中的环境或选中的环境
      currentViewingEnvironment.value = targetEnv
      consoleRef.value?.clear()
      executionId.value = null
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
    consoleRef.value?.appendInfo(`环境 ${getEnvironmentLabel(newEnv)} 未运行\n`)
  }
})

/**
 * 加载打包状态
 */
async function loadBuildStatus() {
  try {
    const env = currentViewingEnvironment.value || selectedEnvironment.value
    const response = await projectApi.getBuildStatus(projectId.value, env)
    if (response.success && response.data) {
      buildStatus.value = response.data
    } else {
      buildStatus.value = null
    }
  } catch (error) {
    console.error('加载打包状态失败:', error)
    buildStatus.value = null
  }
}

/**
 * 加载所有环境的打包状态
 */
async function loadAllEnvironmentBuildStatuses() {
  const environments = ['production', 'development', 'staging', 'test', 'preview']
  const promises = environments.map(async (env) => {
    try {
      const response = await projectApi.getBuildStatus(projectId.value, env)
      if (response.success && response.data) {
        environmentBuildStatuses.value.set(env, response.data)
      } else {
        environmentBuildStatuses.value.set(env, { built: false })
      }
    } catch (error) {
      console.error(`加载环境 ${env} 打包状态失败:`, error)
      environmentBuildStatuses.value.set(env, { built: false })
    }
  })
  await Promise.all(promises)
}

// 监听环境变化，重新加载打包状态
watch(
  () => currentViewingEnvironment.value || selectedEnvironment.value,
  () => {
    loadBuildStatus()
  },
)

// 在 onMounted 中设置初始化完成标志
onMounted(async () => {
  // 加载所有环境的打包状态
  await loadAllEnvironmentBuildStatuses()
  // 加载当前环境的打包状态
  await loadBuildStatus()
  // 页面加载时，先清空所有状态和日志
  consoleRef.value?.clear()
  currentViewingEnvironment.value = null
  executionId.value = null
  
  // 确保从 URL 参数读取环境（刷新后保持）
  const envFromUrl = route.query.env as string
  if (envFromUrl && ['development', 'production', 'test', 'staging', 'preview'].includes(envFromUrl)) {
    selectedEnvironment.value = envFromUrl as any
  } else {
    // 如果 URL 中没有环境参数，添加默认环境到 URL
    router.replace({ query: { ...route.query, env: selectedEnvironment.value } })
  }
  
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

  // 检查是否有正在运行的打包命令（支持多环境）
  await checkRunningCommand()
  
  // 标记初始化完成，允许 watch 触发
  isInitializing.value = false
  
  // 定期刷新运行中的环境列表（每5秒）
  const refreshInterval = setInterval(() => {
    refreshRunningEnvironments()
  }, 5000)
  
  // 组件卸载时清理
  onUnmounted(() => {
    clearInterval(refreshInterval)
    leaveRoom()
  })
})
</script>

<style scoped>
.project-build-page {
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
  gap: var(--size-spacing-md, 12px);
  flex: 1;
  min-width: 0;
  flex-wrap: wrap;
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
</style>
