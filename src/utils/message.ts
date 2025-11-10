/**
 * 全局消息提示服务（使用响应式状态）
 * 
 * 提供 success、error、warning、info 四种类型的消息提示
 * 消息会自动显示在页面右上角，并在指定时间后自动消失
 */

import { ref } from 'vue'

// 定义 MessageItem 类型（避免循环依赖）
export interface MessageItem {
  id: string | number
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  closable?: boolean
  timer?: ReturnType<typeof setTimeout>
}

// 全局消息列表
export const messageList = ref<MessageItem[]>([])

// 定时器映射
const timers = new Map<string | number, ReturnType<typeof setTimeout>>()

/**
 * 添加消息
 */
function addMessage(item: Omit<MessageItem, 'id'>): string | number {
  const id = Date.now() + Math.random()
  const messageItem: MessageItem = {
    id,
    duration: 3000,
    closable: true,
    ...item,
  }
  
  messageList.value.push(messageItem)
  
  // 自动移除：设置定时器
  if (messageItem.duration && messageItem.duration > 0) {
    const timer = setTimeout(() => {
      removeMessage(id)
    }, messageItem.duration)
    
    // 保存定时器引用，以便后续清理
    timers.set(id, timer)
  }
  
  return id
}

/**
 * 移除消息
 */
export function removeMessage(id: string | number): void {
  // 清除对应的定时器
  const timer = timers.get(id)
  if (timer) {
    clearTimeout(timer)
    timers.delete(id)
  }
  
  // 从消息列表中移除
  const index = messageList.value.findIndex(item => item.id === id)
  if (index > -1) {
    messageList.value.splice(index, 1)
  }
}

/**
 * 清除所有消息
 */
export function clearAll(): void {
  // 清除所有定时器
  timers.forEach(timer => clearTimeout(timer))
  timers.clear()
  
  // 清空消息列表
  messageList.value = []
}

/**
 * 成功消息
 */
function success(message: string, duration?: number): string | number {
  return addMessage({ message, type: 'success', duration })
}

/**
 * 错误消息
 */
function error(message: string, duration?: number): string | number {
  return addMessage({ message, type: 'error', duration })
}

/**
 * 警告消息
 */
function warning(message: string, duration?: number): string | number {
  return addMessage({ message, type: 'warning', duration })
}

/**
 * 信息消息
 */
function info(message: string, duration?: number): string | number {
  return addMessage({ message, type: 'info', duration })
}

export const message = {
  addMessage,
  removeMessage,
  clearAll,
  success,
  error,
  warning,
  info,
}

// 兼容性导出
export const useMessage = () => message
