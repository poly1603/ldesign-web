/**
 * Toast 提示工具
 */

export interface ToastOptions {
  message: string
  type?: 'success' | 'warning' | 'error' | 'info'
  duration?: number
}

class Toast {
  private container: HTMLElement | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      this.createContainer()
    }
  }

  private createContainer() {
    if (!this.container) {
      this.container = document.createElement('div')
      this.container.className = 'toast-container fixed top-4 right-4 z-[9999] space-y-2'
      document.body.appendChild(this.container)
    }
  }

  show(options: ToastOptions) {
    const { message, type = 'info', duration = 3000 } = options

    const toast = document.createElement('div')
    
    const bgColors = {
      success: 'bg-green-500',
      warning: 'bg-yellow-500',
      error: 'bg-red-500',
      info: 'bg-blue-500',
    }
    
    toast.className = `${bgColors[type]} text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full opacity-0`
    toast.textContent = message

    this.container?.appendChild(toast)

    setTimeout(() => {
      toast.classList.remove('translate-x-full', 'opacity-0')
    }, 10)

    setTimeout(() => {
      toast.classList.add('translate-x-full', 'opacity-0')
      setTimeout(() => {
        toast.remove()
      }, 300)
    }, duration)
  }

  success(message: string, duration?: number) {
    this.show({ message, type: 'success', duration })
  }

  error(message: string, duration?: number) {
    this.show({ message, type: 'error', duration })
  }

  warning(message: string, duration?: number) {
    this.show({ message, type: 'warning', duration })
  }

  info(message: string, duration?: number) {
    this.show({ message, type: 'info', duration })
  }
}

const toastInstance = new Toast()

export const useToast = () => toastInstance

export const toast = toastInstance
