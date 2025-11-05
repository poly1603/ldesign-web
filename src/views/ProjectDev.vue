<template>
  <div class="project-dev-page">
    <div class="page-header">
      <button class="back-btn" @click="router.back()">
        <ArrowLeft :size="20" />
        返回
      </button>
      <h1>启动项目</h1>
    </div>
    <div class="page-content">
      <div class="dev-layout">
        <!-- 左侧控制区 -->
        <div class="control-panel">
          <div class="control-section">
            <h3>操作</h3>
            <div class="button-group">
              <button
                class="btn btn-primary"
                :disabled="isRunning || loading"
                @click="handleStart"
              >
                <Play :size="18" />
                {{ isRunning ? '运行中...' : '启动' }}
              </button>
              <button
                class="btn btn-danger"
                :disabled="!isRunning || loading"
                @click="handleStop"
              >
                <Square :size="18" />
                停止
              </button>
            </div>
          </div>

          <!-- 服务地址 -->
          <div v-if="serviceUrl" class="service-section">
            <h3>服务地址</h3>
            <div class="service-url">
              <a :href="serviceUrl" target="_blank" rel="noopener noreferrer">
                {{ serviceUrl }}
                <ExternalLink :size="14" />
              </a>
            </div>
          </div>
        </div>

        <!-- 右侧控制台 -->
        <div class="console-panel">
          <Console ref="consoleRef" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Play, Square, ExternalLink } from 'lucide-vue-next'
import { projectApi } from '../api/services'
import { useAppStore } from '../stores/app'
import Console from '../components/Console.vue'
import type { Socket } from 'socket.io-client'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const loading = ref(false)
const isRunning = ref(false)
const serviceUrl = ref<string | null>(null)
const executionId = ref<string | null>(null)
const consoleRef = ref<InstanceType<typeof Console> | null>(null)
let socket: Socket | null = null
let room: string | null = null

// 事件处理器函数引用（用于正确移除监听器）
let handleOutput: ((data: { executionId: string; data: string; serviceUrl?: string }) => void) | null = null
let handleError: ((data: { executionId: string; data: string }) => void) | null = null
let handleStatus: ((data: { executionId: string; status: string; serviceUrl?: string }) => void) | null = null

// 定期检查日志的定时器
let logCheckInterval: NodeJS.Timeout | null = null

const projectId = route.params.id as string

/**
 * 加载最新日志
 */
async function loadLatestLogs() {
  if (!projectId || !executionId.value) {
    return
  }

  try {
    const response = await projectApi.getLatestExecution(projectId, 'dev')
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
          }
        }
      }
      
      if (execution.serviceUrl && !serviceUrl.value) {
        serviceUrl.value = execution.serviceUrl
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
  room = `project:${projectId}:command:dev`

  console.log(`[WebSocket] 加入房间: ${room}, executionId: ${executionId.value || '未设置'}, socket.connected: ${socket.connected}`)

  // 先绑定事件监听器（在加入房间之前），确保不会错过任何日志
  handleOutput = (data: { executionId: string; data: string; serviceUrl?: string }) => {
    console.log('[WebSocket] 收到 command:output:', { executionId: data.executionId, dataLength: data.data?.length || 0 })
    if (data.executionId === executionId.value) {
      consoleRef.value?.appendStdout(data.data)
      if (data.serviceUrl) {
        serviceUrl.value = data.serviceUrl
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
    if (data.executionId === executionId.value) {
      if (data.status === 'running') {
        isRunning.value = true
      } else if (data.status === 'completed' || data.status === 'failed' || data.status === 'stopped') {
        isRunning.value = false
      }
      if (data.serviceUrl) {
        serviceUrl.value = data.serviceUrl
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
        if (isRunning.value && executionId.value) {
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
          if (isRunning.value && executionId.value) {
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
        if (isRunning.value && executionId.value) {
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
 * 启动项目
 */
async function handleStart() {
  if (!projectId || isRunning.value) return

  loading.value = true
  consoleRef.value?.clear()
  consoleRef.value?.appendInfo('正在启动项目...\n')

  try {
    // 确保 WebSocket 已连接（快速检查，不阻塞）
    if (!appStore.socket || !appStore.isConnected) {
      console.log('[Start] WebSocket 未连接，正在连接...')
      appStore.connectWebSocket()
      // 简单等待一下，不阻塞太久
      await new Promise<void>((resolve) => {
        if (appStore.isConnected) {
          resolve()
        } else {
          const checkInterval = setInterval(() => {
            if (appStore.isConnected) {
              clearInterval(checkInterval)
              resolve()
            }
          }, 50) // 更频繁检查
          setTimeout(() => {
            clearInterval(checkInterval)
            resolve() // 500ms 后继续，不等待
          }, 500)
        }
      })
    }

    if (!appStore.socket) {
      throw new Error('WebSocket 连接失败')
    }

    const tempSocket = appStore.socket
    const tempRoom = `project:${projectId}:command:dev`
    
    // 关键修复：先绑定监听器并加入房间，再启动命令
    // 这样可以确保不会错过任何日志
    console.log(`[Start] 准备连接 WebSocket 房间: ${tempRoom}`)
    
    // 先定义监听器（使用临时变量存储 executionId，稍后更新）
    let tempExecutionId: string | null = null
    
    handleOutput = (data: { executionId: string; data: string; serviceUrl?: string }) => {
      console.log(`[WebSocket] 收到 command:output: executionId=${data.executionId}, dataLength=${data.data?.length || 0}, currentExecutionId=${executionId.value || tempExecutionId}`)
      // 如果 executionId 还没设置，先接收所有日志（避免错过早期日志）
      const targetId = executionId.value || tempExecutionId
      if (!targetId || data.executionId === targetId) {
        consoleRef.value?.appendStdout(data.data)
        if (data.serviceUrl) {
          serviceUrl.value = data.serviceUrl
          console.log(`[WebSocket] 更新服务地址: ${data.serviceUrl}`)
        }
      } else {
        console.warn(`[WebSocket] executionId 不匹配: 期望 ${targetId}, 收到 ${data.executionId}`)
      }
    }

    handleError = (data: { executionId: string; data: string }) => {
      console.log(`[WebSocket] 收到 command:error: executionId=${data.executionId}, dataLength=${data.data?.length || 0}`)
      const targetId = executionId.value || tempExecutionId
      if (!targetId || data.executionId === targetId) {
        consoleRef.value?.appendStderr(data.data)
      } else {
        console.warn(`[WebSocket] executionId 不匹配: 期望 ${targetId}, 收到 ${data.executionId}`)
      }
    }

    handleStatus = (data: { executionId: string; status: string; serviceUrl?: string }) => {
      console.log(`[WebSocket] 收到 command:status:`, data)
      const targetId = executionId.value || tempExecutionId
      if (!targetId || data.executionId === targetId) {
        if (data.status === 'stopped' || data.status === 'completed' || data.status === 'failed') {
          isRunning.value = false
        }
        if (data.serviceUrl) {
          serviceUrl.value = data.serviceUrl
          console.log(`[WebSocket] 更新服务地址: ${data.serviceUrl}`)
        }
      } else {
        console.warn(`[WebSocket] executionId 不匹配: 期望 ${targetId}, 收到 ${data.executionId}`)
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
    tempSocket.emit('joinRoom', { room: tempRoom })
    console.log(`[Start] 已发送加入房间请求: ${tempRoom}, socket.connected: ${tempSocket.connected}`)
    
    // 等待一小段时间确保房间已加入，然后启动命令
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 现在启动项目（此时监听器已经绑定，房间已加入）
    console.log(`[Start] 开始启动命令...`)
    const response = await projectApi.executeCommand(projectId, 'dev')
    if (response.success && response.data) {
      executionId.value = response.data.id
      tempExecutionId = response.data.id
      isRunning.value = true
      console.log(`[Start] 命令执行 ID: ${response.data.id}`)
      consoleRef.value?.appendInfo(`命令执行 ID: ${response.data.id}\n`)
      
      // 如果有初始输出，显示
      if (response.data.output) {
        consoleRef.value?.appendStdout(response.data.output)
      }
      if (response.data.serviceUrl) {
        serviceUrl.value = response.data.serviceUrl
        console.log(`[Start] 初始服务地址: ${response.data.serviceUrl}`)
      }
      
      // 立即加载最新日志（以防有遗漏）
      setTimeout(() => {
        loadLatestLogs()
      }, 500)
      
      // 不再需要定期轮询，完全依赖 WebSocket 实时推送
      // 只在 WebSocket 连接失败时作为兜底机制使用
    } else {
      throw new Error(response.message || '启动失败')
    }
  } catch (error: any) {
    console.error('启动项目失败:', error)
    consoleRef.value?.appendError(`启动失败: ${error.message || '未知错误'}\n`)
    isRunning.value = false
    // 清理监听器
    if (appStore.socket) {
      appStore.socket.off('command:output', handleOutput)
      appStore.socket.off('command:error', handleError)
      appStore.socket.off('command:status', handleStatus)
    }
  } finally {
    loading.value = false
  }
}

/**
 * 停止项目
 */
async function handleStop() {
  if (!projectId || !executionId.value || !isRunning.value) return

  loading.value = true
  consoleRef.value?.appendInfo('正在停止项目...\n')

  try {
    const response = await projectApi.stopCommand(projectId, executionId.value)
    if (response.success) {
      // 立即清除前端状态
      isRunning.value = false
      const stoppedExecutionId = executionId.value
      executionId.value = null
      serviceUrl.value = null
      
      // 离开房间
      leaveRoom()
      
      // 清空控制台
      setTimeout(() => {
        consoleRef.value?.clear()
        consoleRef.value?.appendInfo('项目已停止\n')
      }, 500)
      
      // 验证后端是否真的删除了记录（延迟检查，确保后端处理完成）
      setTimeout(async () => {
        try {
          const checkResponse = await projectApi.getLatestExecution(projectId, 'dev')
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
    console.error('停止项目失败:', error)
    consoleRef.value?.appendError(`停止失败: ${error.message || '未知错误'}\n`)
    // 即使停止失败，也清除前端状态
    isRunning.value = false
    executionId.value = null
    serviceUrl.value = null
    leaveRoom()
  } finally {
    loading.value = false
  }
}

/**
 * 检查是否有正在运行的命令
 */
async function checkRunningCommand() {
  try {
    const response = await projectApi.getLatestExecution(projectId, 'dev')
    if (response.success && response.data) {
      const execution = response.data
      
      // 先设置 executionId，再连接 WebSocket
      executionId.value = execution.id
      
      // 恢复运行状态
      isRunning.value = true
      if (execution.serviceUrl) {
        serviceUrl.value = execution.serviceUrl
      }
      
      // 清空控制台并显示历史输出
      consoleRef.value?.clear()
      
      // 显示历史输出
      if (execution.output) {
        consoleRef.value?.appendStdout(execution.output)
      }
      
      // 连接 WebSocket 房间（在设置 executionId 之后）
      connectToRoom()
    } else {
      // 没有正在运行的命令，清空状态
      consoleRef.value?.clear()
      executionId.value = null
      isRunning.value = false
      serviceUrl.value = null
      consoleRef.value?.appendInfo('没有正在运行的命令\n')
    }
  } catch (error) {
    console.error('检查运行状态失败:', error)
    consoleRef.value?.clear()
    executionId.value = null
    isRunning.value = false
    serviceUrl.value = null
    consoleRef.value?.appendError('检查运行状态失败\n')
  }
}

onMounted(async () => {
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

  // 检查是否有正在运行的命令
  await checkRunningCommand()
})

onUnmounted(() => {
  leaveRoom()
})
</script>

<style scoped>
.project-dev-page {
  padding: var(--content-padding);
  background: var(--content-bg);
  color: var(--color-text-primary);
  min-height: 100%;
}

.page-header {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-md);
  margin-bottom: var(--size-spacing-xl);
}

.back-btn {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-xs);
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  background: var(--color-bg-component);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  cursor: pointer;
  font-size: var(--font-size-base);
  transition: all 0.2s ease;
}

.back-btn:hover {
  background: var(--color-bg-component-hover);
  border-color: var(--theme-color-primary);
}

.page-header h1 {
  font-size: var(--font-size-2xl);
  font-weight: var(--size-font-weight-semibold);
  margin: 0;
  color: var(--color-text-primary);
}

.page-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dev-layout {
  display: flex;
  gap: var(--size-spacing-lg);
  height: calc(100vh - 200px);
  min-height: 600px;
}

.control-panel {
  flex: 0 0 300px;
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-lg);
}

.control-section,
.service-section {
  background: var(--color-bg-container);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  padding: var(--size-spacing-lg);
}

.control-section h3,
.service-section h3 {
  margin: 0 0 var(--size-spacing-md) 0;
  font-size: var(--font-size-base);
  font-weight: var(--size-font-weight-semibold);
  color: var(--color-text-primary);
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-sm);
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--size-spacing-xs);
  padding: var(--size-spacing-md);
  border: none;
  border-radius: var(--size-radius-md);
  font-size: var(--font-size-base);
  font-weight: var(--size-font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--theme-color-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--theme-color-primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-danger {
  background: var(--color-danger-default);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: var(--color-danger-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.service-url {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-xs);
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  background: var(--color-bg-component);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-sm);
}

.service-url a {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-xs);
  color: var(--theme-color-primary);
  text-decoration: none;
  word-break: break-all;
  transition: color 0.2s ease;
}

.service-url a:hover {
  color: var(--theme-color-primary-hover);
  text-decoration: underline;
}

.console-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
</style>

