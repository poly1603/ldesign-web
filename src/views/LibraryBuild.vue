<template>
  <div class="library-build-page">
    <div class="page-header">
      <div class="page-header-top">
        <div class="page-header-left">
          <span class="back-icon" @click="router.back()" title="返回">
            <ArrowLeft :size="20" />
          </span>
          <h1 class="page-title">打包库</h1>
        </div>
        <div class="page-header-right">
          <!-- 操作按钮组 -->
          <div class="header-button-group">
            <!-- 查看打包产物按钮（如果有打包产物则显示） -->
            <Tooltip
              v-if="buildStatus && buildStatus.built === true"
              content="查看打包产物详情"
              placement="bottom"
            >
              <button
                class="btn-icon btn-success"
                @click="handleViewBuildStatus"
                title="查看打包产物"
              >
                <Eye :size="18" />
              </button>
            </Tooltip>
            
            <!-- 打包按钮 -->
            <Tooltip
              :content="isBuilding ? '正在打包中...' : '开始打包'"
              placement="bottom"
            >
              <button
                class="btn-icon btn-primary"
                :disabled="isBuilding || loading"
                @click="handleBuild"
              >
                <Package :size="18" />
              </button>
            </Tooltip>
            
            <!-- 停止按钮 -->
            <Tooltip
              v-if="isBuilding"
              content="停止打包"
              placement="bottom"
            >
              <button
                class="btn-icon btn-danger"
                :disabled="loading"
                @click="handleStop"
              >
                <Square :size="18" />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
      
      <!-- 版本提升区域 -->
      <div class="version-bump-section">
        <div class="version-info">
          <div class="version-current">
            <span class="version-label">当前版本:</span>
            <span class="version-value">{{ currentVersion || '未设置' }}</span>
          </div>
          <div v-if="selectedBumpType && selectedBumpType !== 'none' && newVersion" class="version-new">
            <span class="version-label">新版本:</span>
            <span class="version-value version-value--new">{{ newVersion }}</span>
          </div>
        </div>
        <div class="version-bump-options">
          <Tooltip
            v-for="option in versionBumpOptions"
            :key="option.type"
            :content="option.description || ''"
            placement="top"
            :delay="300"
          >
            <button
              class="version-bump-btn"
              :class="{ 'is-active': selectedBumpType === option.type }"
              @click="selectBumpType(option.type)"
            >
              <component :is="getIconComponent(option.icon)" :size="20" class="bump-icon" />
              <span class="bump-label">{{ option.label }}</span>
              <span class="bump-example">{{ option.example || '' }}</span>
            </button>
          </Tooltip>
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
    <LibraryBuildStatusDialog
      v-if="showBuildStatusDialog && buildStatus"
      :status="buildStatus"
      @close="showBuildStatusDialog = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  Package,
  Square,
  Circle,
  Wrench,
  Sparkles,
  Rocket,
  FlaskConical,
  Microscope,
  Target,
  Eye,
} from 'lucide-vue-next'
import { projectApi } from '../api/services'
import { useAppStore } from '../stores/app'
import { message } from '../utils/message'
import Console from '../components/Console.vue'
import Tooltip from '../components/common/Tooltip.vue'
import LibraryBuildStatusDialog from '../components/LibraryBuildStatusDialog.vue'
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
const buildStatus = ref<{
  built: boolean
  buildTime?: number
  buildDirs?: Array<{
    name: string
    path: string
    files?: any[]
    totalSize?: number
    fileCount?: number
  }>
  totalSize?: number
  totalFileCount?: number
} | null>(null)
const showBuildStatusDialog = ref(false)
const projectId = computed(() => route.params.id as string)

// 版本信息
const currentVersion = ref<string>('')
const selectedBumpType = ref<string | null>('none')
const newVersion = computed(() => {
  if (!selectedBumpType.value || selectedBumpType.value === 'none' || !currentVersion.value) return null
  return calculateNewVersion(currentVersion.value, selectedBumpType.value)
})

// 版本提升选项（从 API 获取）
const versionBumpOptions = ref<Array<{
  type: string | null
  label: string
  icon: string
  example?: string
  description?: string
}>>([])

// WebSocket 事件处理器
let handleOutput: ((data: { executionId: string; data: string }) => void) | null = null
let handleError: ((data: { executionId: string; data: string }) => void) | null = null
let handleStatus: ((data: { executionId: string; status: string }) => void) | null = null

// 定期检查日志的定时器
let logCheckInterval: NodeJS.Timeout | null = null

const isBuilding = computed(() => !!executionId.value)

/**
 * 查看打包状态详情
 */
function handleViewBuildStatus() {
  if (buildStatus.value && buildStatus.value.built) {
    showBuildStatusDialog.value = true
  }
}

/**
 * 获取图标组件
 */
function getIconComponent(iconName: string) {
  const iconMap: Record<string, any> = {
    Circle,
    Wrench,
    Sparkles,
    Rocket,
    FlaskConical,
    Microscope,
    Target,
  }
  return iconMap[iconName] || Circle
}

/**
 * 计算新版本号
 */
function calculateNewVersion(version: string, bumpType: string): string {
  if (!version || bumpType === 'none') return ''
  
  // 解析版本号（支持带预发布版本）
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/)
  if (!match) return version
  
  const [, major, minor, patch, prerelease] = match
  let newMajor = parseInt(major)
  let newMinor = parseInt(minor)
  let newPatch = parseInt(patch)
  let newPrerelease = prerelease || ''
  
  switch (bumpType) {
    case 'patch':
      newPatch++
      newPrerelease = ''
      break
    case 'minor':
      newMinor++
      newPatch = 0
      newPrerelease = ''
      break
    case 'major':
      newMajor++
      newMinor = 0
      newPatch = 0
      newPrerelease = ''
      break
    case 'alpha':
    case 'beta':
    case 'rc':
      if (newPrerelease) {
        const prereleaseMatch = newPrerelease.match(/^([^.]+)\.(\d+)$/)
        if (prereleaseMatch && prereleaseMatch[1] === bumpType) {
          const prereleaseNum = parseInt(prereleaseMatch[2])
          newPrerelease = `${bumpType}.${prereleaseNum + 1}`
        } else {
          newPrerelease = `${bumpType}.1`
        }
      } else {
        newPrerelease = `${bumpType}.1`
      }
      break
    default:
      return version
  }
  
  return newPrerelease ? `${newMajor}.${newMinor}.${newPatch}-${newPrerelease}` : `${newMajor}.${newMinor}.${newPatch}`
}

/**
 * 选择版本提升类型
 */
function selectBumpType(type: string | null) {
  selectedBumpType.value = type
}

/**
 * 加载版本提升选项
 */
async function loadVersionBumpOptions() {
  try {
    const response = await projectApi.getVersionBumpOptions()
    if (response.success && response.data) {
      versionBumpOptions.value = response.data.map((option: any) => ({
        type: option.type === 'none' ? null : option.type,
        label: option.label,
        icon: option.icon,
        example: option.example || '',
        description: option.description || '',
      }))
      // 添加"不升级"选项（如果不存在）
      if (!versionBumpOptions.value.find((opt: any) => opt.type === null)) {
        versionBumpOptions.value.unshift({
          type: null,
          label: '不升级',
          icon: 'Circle',
          example: '',
          description: '保持当前版本不变。适用于调试构建、预览构建或不需要发布的构建。',
        })
      }
    }
  } catch (error) {
    console.error('加载版本提升选项失败:', error)
    // 使用默认选项
    versionBumpOptions.value = [
      { type: null, label: '不升级', icon: 'Circle', example: '', description: '保持当前版本不变。' },
      { type: 'patch', label: '补丁版本', icon: 'Wrench', example: '0.0.x', description: '修复 bug 或小改动。' },
      { type: 'minor', label: '次要版本', icon: 'Sparkles', example: '0.x.0', description: '新增功能但向后兼容。' },
      { type: 'major', label: '主要版本', icon: 'Rocket', example: 'x.0.0', description: '重大更新或不兼容改动。' },
      { type: 'alpha', label: 'Alpha 版本', icon: 'FlaskConical', example: '.alpha-x', description: 'Alpha 预发布版本。' },
      { type: 'beta', label: 'Beta 版本', icon: 'Microscope', example: '.beta-x', description: 'Beta 预发布版本。' },
      { type: 'rc', label: 'RC 版本', icon: 'Target', example: '.rc-x', description: 'Release Candidate 版本。' },
    ]
  }
}

/**
 * 加载项目信息和版本
 */
async function loadProjectInfo() {
  try {
    const response = await projectApi.getPackageVersion(projectId.value)
    if (response.success && response.data) {
      currentVersion.value = response.data.version || '0.0.0'
    }
  } catch (error) {
    console.error('加载项目信息失败:', error)
    currentVersion.value = '0.0.0'
  }
}

/**
 * 加载打包状态
 */
async function loadBuildStatus() {
  if (!projectId.value) {
    console.warn('[LoadBuildStatus] 项目 ID 不存在，无法加载打包状态')
    return
  }
  
  try {
    console.log(`[LoadBuildStatus] 开始加载打包状态: projectId=${projectId.value}`)
    const response = await projectApi.getLibraryBuildStatus(projectId.value)
    console.log(`[LoadBuildStatus] 接口响应:`, response)
    console.log(`[LoadBuildStatus] response.success:`, response.success)
    console.log(`[LoadBuildStatus] response.data:`, response.data)
    
    if (response.success) {
      if (response.data) {
        buildStatus.value = response.data
        console.log(`[LoadBuildStatus] 打包状态已更新:`, buildStatus.value)
        console.log(`[LoadBuildStatus] buildStatus.built:`, buildStatus.value.built)
        console.log(`[LoadBuildStatus] buildStatus.buildDirs:`, buildStatus.value.buildDirs)
        
        // 如果已打包，显示提示信息
        if (buildStatus.value.built) {
          console.log(`[LoadBuildStatus] ✅ 库已打包，输出目录数: ${buildStatus.value.buildDirs?.length || 0}`)
        } else {
          console.log(`[LoadBuildStatus] ❌ 库未打包`)
        }
      } else {
        console.warn(`[LoadBuildStatus] 接口返回成功但数据为空`)
        buildStatus.value = { built: false }
      }
    } else {
      console.warn(`[LoadBuildStatus] 接口返回失败:`, response)
      buildStatus.value = { built: false }
    }
  } catch (error: any) {
    console.error('[LoadBuildStatus] 加载打包状态失败:', error)
    console.error('[LoadBuildStatus] 错误详情:', error.message)
    console.error('[LoadBuildStatus] 错误堆栈:', error.stack)
    buildStatus.value = { built: false }
  }
}

/**
 * 加载最新日志
 */
async function loadLatestLogs() {
  if (!projectId.value || !executionId.value) return

  try {
    // 库打包不需要环境参数，传递 undefined（不传环境参数）
    const response = await projectApi.getLatestExecution(projectId.value, 'build', undefined)
    if (response.success && response.data) {
      const execution = response.data
      if (execution.id === executionId.value) {
        const currentContent = consoleRef.value?.getContent() || ''
        const currentLength = currentContent.length
        
        if (execution.output && execution.output.length > currentLength) {
          const newLogs = execution.output.slice(currentLength)
          if (newLogs.trim()) {
            consoleRef.value?.appendStdout(newLogs)
          }
        }
        
        // 检查状态
        if (execution.status === 'completed' || execution.status === 'failed' || execution.status === 'stopped') {
          if (logCheckInterval) {
            clearInterval(logCheckInterval)
            logCheckInterval = null
          }
          if (execution.status === 'completed') {
            consoleRef.value?.appendInfo('\n✅ 打包完成\n')
            executionId.value = null
            leaveRoom()
            await loadBuildStatus()
          } else if (execution.status === 'failed') {
            consoleRef.value?.appendError('\n❌ 打包失败\n')
            executionId.value = null
            leaveRoom()
          } else {
            consoleRef.value?.appendInfo('\n⏹️  打包已停止\n')
            executionId.value = null
            leaveRoom()
          }
        }
      }
    } else if (response.success && !response.data && executionId.value) {
      // 如果查询不到记录，但之前有 executionId，说明打包已完成（记录已被删除）
      console.log(`[LoadLogs] 执行记录不存在，可能已完成: executionId=${executionId.value}`)
      
      // 停止轮询
      if (logCheckInterval) {
        clearInterval(logCheckInterval)
        logCheckInterval = null
      }
      
      // 显示完成状态（如果还没有显示）
      const currentContent = consoleRef.value?.getContent() || ''
      if (!currentContent.includes('✅ 打包完成') && !currentContent.includes('打包成功') && !currentContent.includes('✓ 构建成功')) {
        consoleRef.value?.appendInfo('\n✅ 打包完成\n')
      }
      
      // 清除 executionId
      executionId.value = null
      leaveRoom()
      
      // 立即刷新构建状态
      await loadBuildStatus()
    }
  } catch (error) {
    console.error('加载最新日志失败:', error)
    // 如果查询失败，可能是记录已被删除（已完成），尝试清理状态
    if (executionId.value) {
      const currentContent = consoleRef.value?.getContent() || ''
      if (currentContent.includes('✓ 构建成功') || currentContent.includes('构建完成') || currentContent.includes('[COMPLETE]')) {
        // 如果日志中已经有完成信息，清理状态
        if (logCheckInterval) {
          clearInterval(logCheckInterval)
          logCheckInterval = null
        }
        executionId.value = null
        leaveRoom()
        await loadBuildStatus()
      }
    }
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
      if (data.status === 'completed') {
        consoleRef.value?.appendInfo('\n✅ 打包完成\n')
        if (logCheckInterval) {
          clearInterval(logCheckInterval)
          logCheckInterval = null
        }
        executionId.value = null
        leaveRoom()
        await loadBuildStatus()
      } else if (data.status === 'failed') {
        consoleRef.value?.appendError('\n❌ 打包失败\n')
        if (logCheckInterval) {
          clearInterval(logCheckInterval)
          logCheckInterval = null
        }
        executionId.value = null
        leaveRoom()
      } else if (data.status === 'stopped') {
        consoleRef.value?.appendInfo('\n⏹️  打包已停止\n')
        if (logCheckInterval) {
          clearInterval(logCheckInterval)
          logCheckInterval = null
        }
        executionId.value = null
        leaveRoom()
      }
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
        if (executionId.value) {
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
          if (executionId.value) {
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
        if (executionId.value) {
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
    socket.emit('leaveRoom', { room })
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
    if (logCheckInterval) {
      clearInterval(logCheckInterval)
      logCheckInterval = null
    }
    room = null
  }
}

/**
 * 打包库
 */
async function handleBuild() {
  if (!projectId.value || isBuilding.value) return

  // 检查是否选择了版本提升选项
  if (!selectedBumpType.value || selectedBumpType.value === 'none') {
    // 在控制台显示警告信息
    if (consoleRef.value) {
      consoleRef.value.appendError('⚠️  请先选择版本提升选项！\n')
      consoleRef.value.appendInfo('提示：打包前必须选择一个版本提升策略（不升级、补丁版本、次要版本等）\n')
    }
    
    // 显示消息提示
    console.log('[LibraryBuild] 显示警告消息：未选择版本提升选项')
    try {
      message.warning('请先选择版本提升选项！打包前必须选择一个版本提升策略。', 5000)
      console.log('[LibraryBuild] message.warning 调用成功')
    } catch (error) {
      console.error('[LibraryBuild] message.warning 调用失败:', error)
    }
    return
  }

  loading.value = true
  
  // 清空控制台并显示打包信息
  consoleRef.value?.clear()
  consoleRef.value?.appendInfo('📦 正在打包库...\n')
  
  try {
    // 如果选择了版本提升，先更新版本
    if (selectedBumpType.value && selectedBumpType.value !== 'none' && newVersion.value) {
      consoleRef.value?.appendInfo(`📝 更新版本: ${currentVersion.value} -> ${newVersion.value}\n`)
      try {
        const versionResponse = await projectApi.updatePackageVersion(projectId.value, newVersion.value)
        if (versionResponse.success) {
          currentVersion.value = newVersion.value
          consoleRef.value?.appendInfo(`✅ 版本更新成功\n`)
        } else {
          throw new Error(versionResponse.message || '版本更新失败')
        }
      } catch (versionError: any) {
        console.error('版本更新失败:', versionError)
        consoleRef.value?.appendError(`❌ 版本更新失败: ${versionError.message || '未知错误'}\n`)
        throw versionError
      }
    }
    
    // 确保 WebSocket 已连接
    if (!appStore.socket || !appStore.isConnected) {
      consoleRef.value?.appendInfo('📡 正在连接 WebSocket...\n')
      appStore.connectWebSocket()
      await new Promise<void>((resolve, reject) => {
        if (appStore.isConnected && appStore.socket?.connected) {
          resolve()
          return
        }
        
        let attempts = 0
        const maxAttempts = 100
        const checkInterval = setInterval(() => {
          attempts++
          if (appStore.isConnected && appStore.socket?.connected) {
            clearInterval(checkInterval)
            resolve()
          } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval)
            reject(new Error('WebSocket 连接超时'))
          }
        }, 50)
      })
    }

    // 执行打包命令（库类型不需要环境参数）
    const response = await projectApi.executeCommand(projectId.value, 'build')
    if (response.success && response.data) {
      executionId.value = response.data.id || response.data.executionId
      consoleRef.value?.appendInfo(`✅ 打包任务已启动 (ID: ${executionId.value})\n`)
      
      // 连接到 WebSocket 房间
      connectToRoom()
      
      // 如果有初始输出，立即显示
      if (response.data.output) {
        consoleRef.value?.appendStdout(response.data.output)
      }
      
      // 立即加载一次日志
      await loadLatestLogs()
    } else {
      throw new Error(response.message || '打包启动失败')
    }
  } catch (error: any) {
    console.error('打包失败:', error)
    consoleRef.value?.appendError(`❌ 打包失败: ${error.message || '未知错误'}\n`)
    leaveRoom()
  } finally {
    loading.value = false
  }
}

/**
 * 停止打包
 */
async function handleStop() {
  if (!executionId.value) return
  
  loading.value = true
  try {
    await projectApi.stopCommand(projectId.value, executionId.value)
    consoleRef.value?.appendInfo('⏹️  正在停止打包...\n')
    executionId.value = null
    leaveRoom()
  } catch (error: any) {
    console.error('停止打包失败:', error)
    consoleRef.value?.appendError(`❌ 停止失败: ${error.message || '未知错误'}\n`)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  // 确保 projectId 存在
  if (!projectId.value) {
    console.error('项目 ID 不存在')
    return
  }
  
  console.log(`[LibraryBuild] 页面加载，projectId=${projectId.value}`)
  
  // 并行加载所有数据
  await Promise.all([
    loadProjectInfo(),
    loadBuildStatus(),
    loadVersionBumpOptions(),
  ])
  
  console.log('[LibraryBuild] 页面初始化完成')
})

onUnmounted(() => {
  leaveRoom()
})
</script>

<style scoped>
.library-build-page {
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
  gap: var(--size-spacing-md);
}

.back-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--size-radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-icon:hover {
  background: var(--color-bg-component-hover);
}

.page-header-left {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-md);
}

.build-status-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--color-success-border, #b7eb8f);
  border-radius: var(--size-radius-sm);
  background: var(--color-success-light, #f6ffed);
  color: var(--color-success-default, #52c41a);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.build-status-icon-btn:hover {
  background: var(--color-success-hover, #f0f9e8);
  border-color: var(--color-success-default, #52c41a);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(82, 196, 26, 0.2);
}

.page-title {
  font-size: var(--font-size-xl);
  font-weight: var(--size-font-weight-semibold);
  margin: 0;
}

.page-header-right {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-sm);
}

.header-button-group {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-sm);
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
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

.btn-primary {
  background: var(--theme-color-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--theme-color-primary-hover);
}

.btn-danger {
  background: var(--color-danger-default);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: var(--color-danger-hover);
}

.btn-success {
  background: var(--color-success-default, #52c41a);
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: var(--color-success-hover, #73d13d);
}

/* 版本提升区域 */
.version-bump-section {
  padding: var(--size-spacing-md);
  background: var(--color-bg-component);
  border-radius: var(--size-radius-md);
  border: 1px solid var(--color-border-light);
}

.version-info {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-lg);
  margin-bottom: var(--size-spacing-md);
  padding-bottom: var(--size-spacing-md);
  border-bottom: 1px solid var(--color-border-light);
}

.version-current,
.version-new {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-sm);
}

.version-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.version-value {
  font-size: var(--font-size-lg);
  font-weight: var(--size-font-weight-semibold);
  color: var(--color-text-primary);
  font-family: 'Courier New', monospace;
}

.version-value--new {
  color: var(--theme-color-primary);
}

.version-bump-options {
  display: flex;
  gap: var(--size-spacing-sm);
  flex-wrap: wrap;
}

.version-bump-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--size-spacing-xs);
  padding: var(--size-spacing-md) var(--size-spacing-lg);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  background: var(--color-bg-container);
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 100px;
  height: 80px;
  position: relative;
}

.version-bump-btn:hover {
  border-color: var(--theme-color-primary);
  background: var(--color-bg-component-hover);
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.version-bump-btn.is-active {
  border-color: var(--theme-color-primary);
  background: var(--theme-color-primary-light);
  color: var(--theme-color-primary);
  box-shadow: 0 0 0 2px var(--theme-color-primary-light);
}

.version-bump-btn.is-active .bump-icon {
  color: var(--theme-color-primary);
}

.bump-icon {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  color: var(--color-text-secondary);
  transition: color 0.2s ease;
}

.version-bump-btn.is-active .bump-icon {
  color: var(--theme-color-primary);
}

.bump-label {
  font-size: var(--font-size-sm);
  font-weight: var(--size-font-weight-medium);
  color: var(--color-text-primary);
  white-space: nowrap;
}

.version-bump-btn.is-active .bump-label {
  color: var(--theme-color-primary);
  font-weight: var(--size-font-weight-semibold);
}

.bump-example {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-family: 'Courier New', monospace;
  opacity: 0.8;
  min-height: 1em;
  display: block;
  line-height: 1.2;
}

.version-bump-btn.is-active .bump-example {
  color: var(--theme-color-primary);
  opacity: 0.9;
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
  padding: var(--content-padding);
}
</style>
