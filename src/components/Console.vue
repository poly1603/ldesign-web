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
          :class="[getLineClass(line), { 'has-qrcode': isQRCodeContent(line.content) }]"
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
 * 按行分割内容并添加
 */
function appendLines(type: ConsoleLine['type'], content: string) {
  if (!content) return
  
  // 按换行符分割，但保留换行符信息
  const lines = content.split(/\r?\n/)
  
  // 如果最后一行是空的（因为末尾有换行符），移除它
  // 但如果有内容，需要保留
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // 如果不是最后一行，或者最后一行有内容，都添加
    if (i < lines.length - 1 || line.length > 0) {
      addLine(type, line)
    }
  }
}

/**
 * 添加标准输出（支持多行）
 */
function appendStdout(content: string) {
  appendLines('stdout', content)
}

/**
 * 添加错误输出（支持多行）
 */
function appendStderr(content: string) {
  appendLines('stderr', content)
}

/**
 * 添加信息日志（支持多行）
 */
function appendInfo(content: string) {
  appendLines('info', content)
}

/**
 * 添加错误日志（支持多行）
 */
function appendError(content: string) {
  appendLines('error', content)
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
 * 检测是否是二维码内容
 */
function isQRCodeContent(content: string): boolean {
  if (!content || content.trim().length === 0) return false
  
  // 二维码特征：包含特殊字符（█、▓、▒、░、▄、▀、■、□等）和空格
  // 终端二维码可能使用不同的字符组合
  const qrCodeChars = /[█▓▒░▄▀▌▐■□▪▫▮▯]/g
  const qrCodeCharCount = (content.match(qrCodeChars) || []).length
  const spaceCount = (content.match(/ /g) || []).length
  
  const totalChars = content.length
  if (totalChars === 0) return false
  
  // 如果包含二维码特殊字符
  if (qrCodeCharCount > 0) {
    const qrCharRatio = qrCodeCharCount / totalChars
    const spaceRatio = spaceCount / totalChars
    
    // 二维码行通常：特殊字符占比 > 3%，或者空格占比 > 15% 且有特殊字符
    // 降低阈值以识别单行二维码
    if (qrCharRatio > 0.03 || (spaceRatio > 0.15 && qrCodeCharCount >= 2)) {
      return true
    }
  }
  
  // 如果行主要是空格和特殊字符的组合，也可能是二维码的一部分
  // 二维码通常有规律的模式：空格和特殊字符交替出现
  if (totalChars > 10 && totalChars < 200) {
    const spaceRatio = spaceCount / totalChars
    // 如果空格占比很高（> 30%）且有特殊字符，可能是二维码
    if (spaceRatio > 0.3 && qrCodeCharCount >= 1) {
      return true
    }
    // 如果特殊字符和空格加起来占比很高，也可能是二维码
    if ((qrCodeCharCount + spaceCount) / totalChars > 0.7) {
      return true
    }
  }
  
  return false
}

/**
 * 格式化行内容（支持 ANSI 颜色码和二维码）
 */
function formatLine(line: ConsoleLine): string {
  let content = line.content
  
  // 检测是否是二维码内容
  const isQRCode = isQRCodeContent(content)
  
  // HTML 转义（但保留空格用于二维码）
  if (isQRCode) {
    // 二维码内容：保留所有字符，包括空格和特殊字符
    // 先转义 HTML 特殊字符
    content = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
    // 将空格转换为 &nbsp; 以保留空格（HTML 会合并多个空格）
    // 但保留换行符，因为二维码是多行的
    content = content.replace(/ /g, '&nbsp;')
  } else {
    // 普通内容：标准 HTML 转义
    content = escapeHtml(content)
  }
  
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

  // 如果是二维码，添加特殊样式类
  if (isQRCode) {
    return `<span class="qr-code-content">${content}</span>`
  }

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
  return lines.value.map(line => line.content).join('\n')
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
  flex: 1;
  min-width: 0;
}

.console-title span:first-child {
  white-space: nowrap;
}

.line-count {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  white-space: nowrap;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .console-title {
    font-size: var(--font-size-xs);
  }
  
  .line-count {
    display: none; /* 小屏幕隐藏行数 */
  }
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
  /* 隐藏滚动条但保持滚动功能 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.console-content::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
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

/* 包含二维码的行 */
.console-line.has-qrcode {
  white-space: pre;
  word-break: normal;
  overflow-x: auto;
  line-height: 1;
  padding: 1px 0;
  font-family: 'Consolas', 'Monaco', 'Courier New', 'Menlo', monospace;
  font-size: 11px;
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

/* 二维码内容样式 */
.qr-code-content {
  display: inline-block;
  white-space: pre;
  font-family: 'Consolas', 'Monaco', 'Courier New', 'Menlo', monospace;
  font-size: 11px;
  line-height: 1;
  letter-spacing: 0;
  word-spacing: 0;
  /* 确保字符对齐 */
  font-feature-settings: 'liga' off, 'calt' off;
  font-variant-ligatures: none;
  /* 确保字符等宽 */
  font-variant-numeric: tabular-nums;
  /* 防止字符被拉伸 */
  text-rendering: optimizeSpeed;
  -webkit-font-smoothing: none;
  -moz-osx-font-smoothing: unset;
  /* 二维码字符颜色：在深色背景下，特殊字符显示为白色/浅色 */
  color: #ffffff;
}

/* 滚动条样式 - 已隐藏 */
.console-content::-webkit-scrollbar {
  display: none;
}
</style>

