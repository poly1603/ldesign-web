import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { systemApi } from '../api/services'
import { io, type Socket } from 'socket.io-client'

export const useAppStore = defineStore('app', () => {
  // State
  const isInitialized = ref(false)
  const isLoading = ref(false)
  const systemInfo = ref<any>(null)
  const socket = ref<Socket | null>(null)
  const isConnected = ref(false)
  const serverPort = ref<number>(3000) // 服务器端口
  const healthCheckInterval = ref<number | null>(null) // 健康检查定时器

  // Computed
  const isReady = computed(() => isInitialized.value && !isLoading.value)

  // Actions
  async function initialize() {
    if (isInitialized.value) return

    isLoading.value = true
    try {
      // 先尝试获取系统信息和健康检查
      await checkServerHealth()

      // 连接 WebSocket
      connectWebSocket()

      // 启动定期健康检查（每30秒）
      startHealthCheck()

      isInitialized.value = true
    } catch (error) {
      console.error('初始化失败:', error)
      // 即使初始化失败，也尝试连接 WebSocket
      connectWebSocket()
      startHealthCheck()
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 检查服务器健康状态
   */
  async function checkServerHealth() {
    try {
      // 尝试健康检查端点
      const healthResponse = await systemApi.getHealth()
      if (healthResponse.success) {
        isConnected.value = true
        // 默认端口3000
        serverPort.value = 3000
        return true
      }
    } catch (error) {
      console.warn('服务器健康检查失败:', error)
    }

    isConnected.value = false
    return false
  }

  /**
   * 启动定期健康检查
   */
  function startHealthCheck() {
    // 清除之前的定时器
    if (healthCheckInterval.value) {
      clearInterval(healthCheckInterval.value)
    }

    // 每30秒检查一次服务器状态
    healthCheckInterval.value = window.setInterval(async () => {
      await checkServerHealth()
    }, 30000)
  }

  /**
   * 停止健康检查
   */
  function stopHealthCheck() {
    if (healthCheckInterval.value) {
      clearInterval(healthCheckInterval.value)
      healthCheckInterval.value = null
    }
  }

  function connectWebSocket() {
    // 如果已有连接，先断开
    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
    }

    // WebSocket 需要使用完整URL，不能使用相对路径
    // 如果配置了环境变量则使用，否则从当前页面协议和主机推断
    const wsURL = import.meta.env.VITE_WS_URL || 'http://localhost:3000'
    
    socket.value = io(`${wsURL}/events`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10, // 增加重连次数
      reconnectionDelayMax: 5000,
      timeout: 20000,
    })

    socket.value.on('connect', () => {
      console.log('WebSocket connected')
      isConnected.value = true
    })

    socket.value.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason)
      // 仅在非主动断开时更新状态
      if (reason !== 'io client disconnect') {
        isConnected.value = false
      }
    })

    socket.value.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
      isConnected.value = false
    })

    socket.value.on('connection', (data: any) => {
      console.log('Connection established:', data)
      isConnected.value = true
    })
  }

  function disconnectWebSocket() {
    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
      isConnected.value = false
    }
    stopHealthCheck()
  }

  return {
    isInitialized,
    isLoading,
    isReady,
    systemInfo,
    socket,
    isConnected,
    serverPort,
    initialize,
    connectWebSocket,
    disconnectWebSocket,
    checkServerHealth,
    startHealthCheck,
    stopHealthCheck,
  }
})
