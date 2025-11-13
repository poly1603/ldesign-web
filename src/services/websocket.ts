import { io, Socket } from 'socket.io-client'

export interface LogMessage {
  type: 'stdout' | 'stderr' | 'error'
  message: string
  timestamp: Date
}

export interface ProcessStatus {
  status: string
  pid: number
  startTime: Date
}

export interface ExitData {
  code: number | null
  signal: string | null
}

export type LogHandler = (log: LogMessage) => void
export type StatusHandler = (status: ProcessStatus) => void
export type ExitHandler = (data: ExitData) => void
export type ErrorHandler = (error: any) => void

class LauncherWebSocket {
  private socket: Socket | null = null
  private serverUrl = 'http://localhost:7001'

  connect(): Promise<Socket> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve(this.socket)
        return
      }

      this.socket = io(`${this.serverUrl}/launcher`, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      })

      this.socket.on('connect', () => {
        console.log('WebSocket connected')
        resolve(this.socket!)
      })

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error)
        reject(error)
      })
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  subscribeLogs(
    projectId: number,
    command: string,
    handlers: {
      onLog?: LogHandler
      onStatus?: StatusHandler
      onExit?: ExitHandler
      onError?: ErrorHandler
    }
  ) {
    if (!this.socket) {
      throw new Error('WebSocket not connected')
    }

    // 订阅日志
    this.socket.emit('subscribe:logs', { projectId, command })

    // 监听日志
    if (handlers.onLog) {
      this.socket.on('log', handlers.onLog)
    }

    // 监听状态
    if (handlers.onStatus) {
      this.socket.on('status', handlers.onStatus)
    }

    // 监听退出
    if (handlers.onExit) {
      this.socket.on('exit', handlers.onExit)
    }

    // 监听错误
    if (handlers.onError) {
      this.socket.on('error', handlers.onError)
    }

    // 返回清理函数
    return () => {
      if (this.socket) {
        this.socket.emit('unsubscribe:logs', { projectId, command })
        if (handlers.onLog) this.socket.off('log', handlers.onLog)
        if (handlers.onStatus) this.socket.off('status', handlers.onStatus)
        if (handlers.onExit) this.socket.off('exit', handlers.onExit)
        if (handlers.onError) this.socket.off('error', handlers.onError)
      }
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false
  }
}

export const launcherWs = new LauncherWebSocket()
