<template>
  <div class="document-page">
    <div class="page-header">
      <button class="back-btn" @click="router.back()">
        <ArrowLeft :size="20" />
        返回
      </button>
      <h1>{{ document?.title || 'Package 配置文档' }}</h1>
    </div>

    <div class="page-content">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <Loader2 :size="32" class="spinning" />
        <p>加载文档中...</p>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="error-state">
        <AlertCircle :size="24" />
        <p>{{ error }}</p>
        <button class="btn btn-primary" @click="loadDocument">重试</button>
      </div>

      <!-- 文档内容 -->
      <div v-else-if="document" class="document-content">
        <div v-if="document.description" class="document-description">
          {{ document.description }}
        </div>
        <div class="markdown-content" v-html="renderedContent"></div>
      </div>
    </div>
    <!-- 回到顶部按钮 -->
    <BackToTop />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-vue-next'
import { documentApi } from '../api/services'
import BackToTop from '../components/common/BackToTop.vue'

const router = useRouter()

interface Document {
  id: string
  type: string
  title: string
  description?: string
  content: string
  version?: string
}

const loading = ref(true)
const error = ref<string | null>(null)
const document = ref<Document | null>(null)

// 简单的 Markdown 渲染函数（不依赖外部库）
function renderMarkdown(markdown: string): string {
  if (!markdown) return ''
  
  let html = markdown
    // 代码块
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre><code class="language-${lang || ''}">${escapeHtml(code.trim())}</code></pre>`
    })
    // 行内代码
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // 标题
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // 粗体
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // 斜体
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // 链接
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // 列表项
    .replace(/^\* (.*$)/gim, '<li>$1</li>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    // 段落
    .replace(/\n\n/g, '</p><p>')
    // 换行
    .replace(/\n/g, '<br>')
  
  // 包装列表项
  html = html.replace(/(<li>.*<\/li>)/gs, (match) => {
    return `<ul>${match}</ul>`
  })
  
  // 包装段落
  html = `<p>${html}</p>`
  
  return html
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

// 渲染 Markdown 内容
const renderedContent = computed(() => {
  if (!document.value?.content) return ''
  return renderMarkdown(document.value.content)
})

// 加载文档
async function loadDocument(): Promise<void> {
  loading.value = true
  error.value = null

  try {
    const response = await documentApi.getPackageConfigDocument()
    if (response.success && response.data) {
      document.value = response.data
    } else {
      throw new Error(response.message || '加载文档失败')
    }
  } catch (err: any) {
    error.value = err.message || '加载文档失败'
    console.error('Load document error:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadDocument()
})
</script>

<style scoped>
.document-page {
  padding: var(--content-padding);
  background: var(--content-bg);
  color: var(--color-text-primary);
  min-height: 100%;
}

.page-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: var(--size-spacing-md);
  margin-bottom: var(--size-spacing-xl);
  padding: var(--size-spacing-md) var(--size-spacing-lg);
  margin-left: calc(-1 * var(--content-padding));
  margin-right: calc(-1 * var(--content-padding));
  margin-top: calc(-1 * var(--content-padding));
  background: white;
  border-bottom: 1px solid var(--color-border-light);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.page-header h1 {
  flex: 1;
  font-size: var(--font-size-2xl);
  font-weight: var(--size-font-weight-semibold);
  margin: 0;
  color: var(--color-text-primary);
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

.page-content {
  max-width: 1200px;
  margin: 0 auto;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--size-spacing-md);
  padding: var(--size-spacing-3xl);
  background: var(--color-bg-container);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-lg);
  text-align: center;
}

.error-state {
  color: var(--color-danger-default);
}

.document-content {
  background: var(--color-bg-container);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-lg);
  padding: var(--size-spacing-xl);
}

.document-description {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  margin-bottom: var(--size-spacing-xl);
  padding-bottom: var(--size-spacing-lg);
  border-bottom: 1px solid var(--color-border-light);
}

.markdown-content {
  line-height: 1.8;
  color: var(--color-text-primary);
}

.markdown-content :deep(h1) {
  font-size: var(--font-size-2xl);
  font-weight: var(--size-font-weight-bold);
  margin-top: var(--size-spacing-2xl);
  margin-bottom: var(--size-spacing-lg);
  padding-bottom: var(--size-spacing-sm);
  border-bottom: 2px solid var(--color-border-light);
}

.markdown-content :deep(h2) {
  font-size: var(--font-size-xl);
  font-weight: var(--size-font-weight-semibold);
  margin-top: var(--size-spacing-xl);
  margin-bottom: var(--size-spacing-md);
  padding-bottom: var(--size-spacing-xs);
  border-bottom: 1px solid var(--color-border-light);
}

.markdown-content :deep(h3) {
  font-size: var(--font-size-lg);
  font-weight: var(--size-font-weight-semibold);
  margin-top: var(--size-spacing-lg);
  margin-bottom: var(--size-spacing-sm);
}

.markdown-content :deep(p) {
  margin-bottom: var(--size-spacing-md);
}

.markdown-content :deep(code) {
  background: var(--color-bg-component);
  padding: 2px 6px;
  border-radius: var(--size-radius-sm);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 0.9em;
  color: var(--color-text-primary);
}

.markdown-content :deep(pre) {
  background: var(--color-bg-component);
  padding: var(--size-spacing-md);
  border-radius: var(--size-radius-md);
  overflow-x: auto;
  margin-bottom: var(--size-spacing-md);
  border: 1px solid var(--color-border-light);
}

.markdown-content :deep(pre code) {
  background: transparent;
  padding: 0;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin-bottom: var(--size-spacing-md);
  padding-left: var(--size-spacing-xl);
}

.markdown-content :deep(li) {
  margin-bottom: var(--size-spacing-xs);
}

.markdown-content :deep(blockquote) {
  border-left: 4px solid var(--theme-color-primary);
  padding-left: var(--size-spacing-md);
  margin-left: 0;
  margin-bottom: var(--size-spacing-md);
  color: var(--color-text-secondary);
  font-style: italic;
}

.markdown-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: var(--size-spacing-md);
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  border: 1px solid var(--color-border-light);
  padding: var(--size-spacing-sm);
  text-align: left;
}

.markdown-content :deep(th) {
  background: var(--color-bg-component);
  font-weight: var(--size-font-weight-semibold);
}

.markdown-content :deep(hr) {
  border: none;
  border-top: 1px solid var(--color-border-light);
  margin: var(--size-spacing-xl) 0;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--size-spacing-xs);
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  border: none;
  border-radius: var(--size-radius-md);
  font-size: var(--font-size-base);
  font-weight: var(--size-font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: var(--theme-color-primary);
  color: white;
}

.btn-primary:hover {
  opacity: 0.9;
}
</style>






















