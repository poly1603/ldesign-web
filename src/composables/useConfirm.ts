import { ref } from 'vue'

export interface ConfirmOptions {
  type?: 'info' | 'warning' | 'danger' | 'success'
  title?: string
  message: string
  description?: string
  confirmText?: string
  cancelText?: string
  icon?: boolean
  showClose?: boolean
  closeOnOverlay?: boolean
}

export interface ConfirmState {
  show: boolean
  options: ConfirmOptions
  resolve?: (value: boolean) => void
}

/**
 * 确认对话框组合式函数
 * 提供命令式调用确认对话框的能力
 */
export function useConfirm() {
  const state = ref<ConfirmState>({
    show: false,
    options: {
      message: '',
    },
  })

  /**
   * 显示确认对话框
   * @param options 对话框选项
   * @returns Promise<boolean> 用户是否确认
   */
  function confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      state.value = {
        show: true,
        options: {
          type: 'info',
          confirmText: '确认',
          cancelText: '取消',
          icon: true,
          showClose: true,
          closeOnOverlay: true,
          ...options,
        },
        resolve,
      }
    })
  }

  /**
   * 确认操作
   */
  function handleConfirm() {
    state.value.resolve?.(true)
    state.value.show = false
  }

  /**
   * 取消操作
   */
  function handleCancel() {
    state.value.resolve?.(false)
    state.value.show = false
  }

  /**
   * 删除确认（预设样式）
   */
  function confirmDelete(message: string, description?: string): Promise<boolean> {
    return confirm({
      type: 'danger',
      title: '确认删除',
      message,
      description,
      confirmText: '删除',
      cancelText: '取消',
      icon: true,
    })
  }

  /**
   * 警告确认（预设样式）
   */
  function confirmWarning(message: string, description?: string): Promise<boolean> {
    return confirm({
      type: 'warning',
      title: '警告',
      message,
      description,
      confirmText: '继续',
      cancelText: '取消',
      icon: true,
    })
  }

  return {
    state,
    confirm,
    confirmDelete,
    confirmWarning,
    handleConfirm,
    handleCancel,
  }
}
