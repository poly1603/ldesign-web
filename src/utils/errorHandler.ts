import { toast } from './toast'

export interface ErrorHandlerOptions {
  showToast?: boolean
  logToConsole?: boolean
  reportToServer?: boolean
}

class ErrorHandler {
  private defaultOptions: ErrorHandlerOptions = {
    showToast: true,
    logToConsole: true,
    reportToServer: false,
  }

  /**
   * 处理错误
   */
  handle(error: any, options?: ErrorHandlerOptions) {
    const opts = { ...this.defaultOptions, ...options }

    // 提取错误信息
    const message = this.extractMessage(error)

    // 显示 Toast
    if (opts.showToast) {
      toast.error(message)
    }

    // 控制台日志
    if (opts.logToConsole) {
      console.error('[Error]:', error)
    }

    // 上报服务器（可选）
    if (opts.reportToServer) {
      this.reportError(error)
    }
  }

  /**
   * 提取错误消息
   */
  private extractMessage(error: any): string {
    if (typeof error === 'string') {
      return error
    }

    if (error instanceof Error) {
      return error.message
    }

    if (error?.response?.data?.message) {
      return error.response.data.message
    }

    if (error?.message) {
      return error.message
    }

    return '发生未知错误'
  }

  /**
   * 上报错误到服务器
   */
  private async reportError(error: any) {
    try {
      // 这里可以实现错误上报逻辑
      // await fetch('/api/errors/report', { ... })
      console.log('Error reported:', error)
    } catch (e) {
      console.error('Failed to report error:', e)
    }
  }

  /**
   * 安装全局错误处理器
   */
  install() {
    // Vue 错误处理
    window.addEventListener('error', (event) => {
      this.handle(event.error, { showToast: false })
    })

    // Promise 未捕获错误
    window.addEventListener('unhandledrejection', (event) => {
      this.handle(event.reason, { showToast: false })
    })
  }
}

export const errorHandler = new ErrorHandler()
