<template>
  <div class="console-container">
    <div class="console-header">
      <div class="console-title">
        <span>控制台</span>
        <span v-if="lines.length > 0" class="line-count">{{ lines.length }} 行</span>
      </div>
      <div class="console-actions">
        <button class="action-btn" @click="clear" title="清空">
          <Trash2 :size="16" />
        </button>
        <button class="action-btn" @click="toggleAutoScroll" :title="autoScroll ? '关闭自动滚动' : '开启自动滚动'">
          <ArrowDown :size="16" :class="{ 'disabled': !autoScroll }" />
        </button>
      </div>
    </div>
    <div class="console-content" ref="consoleRef">
      <div v-if="lines.length === 0" class="console-empty">
        暂无日志输出
      </div>
      <div v-else class="console-lines">
        <div
          v-for="(line, index) in lines"
          :key="index"
          class="console-line"
          :class="getLineClass(line)"
        >
          <span class="line-number">{{ index + 1 }}</span>
          <span class="line-content" v-html="formatLine(line)"></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onUnmounted } from 'vue'
import { ArrowDown, Trash2 } from 'lucide-vue-next'

interface Props {
  /** 是否自动滚动到底部 */
  autoScroll?: boolean
  /** 最大行数（超出后自动删除最旧的行） */
  maxLines?: number
}

interface ConsoleLine {
  type: 'stdout' | 'stderr' | 'info' | 'error'
  content: string
  timestamp: number
}

const props = withDefaults(defineProps<Props>(), {
  autoScroll: true,
  maxLines: 10000,
})

const lines = ref<ConsoleLine[]>([])
const consoleRef = ref<HTMLDivElement | null>(null)
const autoScroll = ref(props.autoScroll)

/**
 * 添加日志行
 */
function addLine(type: ConsoleLine['type'], content: string) {
  const line: ConsoleLine = {
    type,
    content,
    timestamp: Date.now(),
  }

  lines.value.push(line)

  // 限制最大行数
  if (lines.value.length > props.maxLines) {
    lines.value.shift()
  }

  // 自动滚动到底部
  if (autoScroll.value) {
    nextTick(() => {
      scrollToBottom()
    })
  }
}

/**
 * 添加标准输出
 */
function appendStdout(content: string) {
  addLine('stdout', content)
}

/**
 * 添加错误输出
 */
function appendStderr(content: string) {
  addLine('stderr', content)
}

/**
 * 添加信息日志
 */
function appendInfo(content: string) {
  addLine('info', content)
}

/**
 * 添加错误日志
 */
function appendError(content: string) {
  addLine('error', content)
}

/**
 * 清空日志
 */
function clear() {
  lines.value = []
}

/**
 * 滚动到底部
 */
function scrollToBottom() {
  if (consoleRef.value) {
    consoleRef.value.scrollTop = consoleRef.value.scrollHeight
  }
}

/**
 * 切换自动滚动
 */
function toggleAutoScroll() {
  autoScroll.value = !autoScroll.value
  if (autoScroll.value) {
    scrollToBottom()
  }
}

/**
 * 获取行的样式类
 */
function getLineClass(line: ConsoleLine): string {
  if (line.type === 'stderr' || line.type === 'error') {
    return 'line-error'
  }
  if (line.type === 'info') {
    return 'line-info'
  }
  return 'line-stdout'
}

/**
 * 格式化行内容（支持 ANSI 颜色码）
 */
function formatLine(line: ConsoleLine): string {
  let content = escapeHtml(line.content)
  
  // 简单的 ANSI 颜色码支持
  // 匹配常见的 ANSI 颜色码并转换为 HTML
  content = content
    // 重置样式
    .replace(/\x1b\[0m/g, '</span>')
    // 绿色
    .replace(/\x1b\[32m/g, '<span style="color: #4ade80">')
    // 黄色
    .replace(/\x1b\[33m/g, '<span style="color: #fbbf24">')
    // 蓝色
    .replace(/\x1b\[34m/g, '<span style="color: #60a5fa">')
    // 红色
    .replace(/\x1b\[31m/g, '<span style="color: #f87171">')
    // 青色
    .replace(/\x1b\[36m/g, '<span style="color: #22d3ee">')
    // 白色/默认
    .replace(/\x1b\[37m/g, '<span style="color: #ffffff">')
    // 粗体
    .replace(/\x1b\[1m/g, '<span style="font-weight: bold">')
    // 其他 ANSI 码（清除）
    .replace(/\x1b\[[0-9;]+m/g, '')

  return content
}

/**
 * HTML 转义
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * 监听 autoScroll prop 变化
 */
watch(() => props.autoScroll, (newVal) => {
  autoScroll.value = newVal
})

/**
 * 获取当前所有日志内容（用于对比）
 */
function getContent(): string {
  return lines.value.map(line => line.content).join('')
}

/**
 * 获取当前日志行数
 */
function getLineCount(): number {
  return lines.value.length
}

// 暴露方法供父组件调用
defineExpose({
  appendStdout,
  appendStderr,
  appendInfo,
  appendError,
  clear,
  scrollToBottom,
  getContent,
  getLineCount,
})
</script>

<style scoped>
.console-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-container);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  overflow: hidden;
}

.console-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  background: var(--color-bg-component);
  border-bottom: 1px solid var(--color-border-light);
}

.console-title {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-sm);
  font-size: var(--font-size-sm);
  font-weight: var(--size-font-weight-medium);
  color: var(--color-text-primary);
}

.line-count {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

.console-actions {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-xs);
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: var(--size-radius-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: var(--color-bg-component-hover);
  color: var(--color-text-primary);
}

.action-btn svg.disabled {
  opacity: 0.5;
}

.console-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  padding: var(--size-spacing-sm);
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: var(--font-size-sm);
  line-height: 1.5;
  background: #1e1e1e;
  color: #d4d4d4;
}

.console-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.console-lines {
  min-height: 100%;
}

.console-line {
  display: flex;
  gap: var(--size-spacing-sm);
  padding: 2px 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.console-line.line-stdout {
  color: #d4d4d4;
}

.console-line.line-error {
  color: #f48771;
}

.console-line.line-info {
  color: #4ec9b0;
}

.line-number {
  flex-shrink: 0;
  min-width: 40px;
  text-align: right;
  color: var(--color-text-tertiary);
  user-select: none;
  opacity: 0.5;
}

.line-content {
  flex: 1;
  min-width: 0;
}

/* 滚动条样式 */
.console-content::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.console-content::-webkit-scrollbar-track {
  background: #252526;
}

.console-content::-webkit-scrollbar-thumb {
  background: #424242;
  border-radius: 4px;
}

.console-content::-webkit-scrollbar-thumb:hover {
  background: #4e4e4e;
}
</style>

