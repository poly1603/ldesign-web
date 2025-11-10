<template>
  <div class="project-config-page">
    <div class="page-header">
      <button class="back-btn" @click="router.back()">
        <ArrowLeft :size="20" />
        返回
      </button>
      <h1>Package 配置</h1>
      <div class="header-actions">
        <!-- 文档按钮 -->
        <button
          class="btn btn-icon doc-btn"
          @click="goToDocumentation"
          title="查看配置文档"
        >
          <BookOpen :size="20" />
        </button>
        <!-- 布局切换 -->
        <div class="layout-toggle">
          <button
            class="layout-btn"
            :class="{ active: formLayout === 'vertical' }"
            @click="formLayout = 'vertical'"
            title="纵向布局"
          >
            <LayoutList :size="18" />
          </button>
          <button
            class="layout-btn"
            :class="{ active: formLayout === 'horizontal' }"
            @click="formLayout = 'horizontal'"
            title="横向布局"
          >
            <LayoutGrid :size="18" />
          </button>
        </div>
        <!-- 保存按钮 -->
        <button class="btn btn-primary" @click="handleSave" :disabled="saving || !hasChanges">
          <Save v-if="!saving" :size="16" />
          <Loader2 v-else :size="16" class="spinning" />
          {{ saving ? '保存中...' : '保存配置' }}
        </button>
      </div>
    </div>

    <div class="page-content">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <Loader2 :size="32" class="spinning" />
        <p>加载配置中...</p>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="error-state">
        <AlertCircle :size="24" />
        <p>{{ error }}</p>
        <button class="btn btn-primary" @click="loadConfig">重试</button>
      </div>

      <!-- 配置编辑器 -->
      <div v-else class="config-editor">
        <!-- 配置项分组 -->
        <template v-if="categories.length > 0">
          <div class="config-sections">
            <div
              v-for="categoryKey in categories"
              :key="categoryKey"
              class="config-section"
            >
              <div class="section-header">
                <h2>{{ getCategoryLabel(categoryKey) }}</h2>
                <span class="section-count">{{ getCategoryOptions(categoryKey).length }} 项</span>
              </div>
              <div class="config-grid">
                <ConfigInput
                  v-for="option in getCategoryOptions(categoryKey)"
                  :key="option.path"
                  :schema="option"
                  :value="getConfigValue(option.path)"
                  :layout="formLayout"
                  @update:value="handleConfigChange(option.path, $event)"
                />
              </div>
            </div>
          </div>
        </template>
        <div v-else class="empty-state">
          <p>暂无配置项</p>
        </div>
      </div>
    </div>
    <!-- 回到顶部按钮 -->
    <BackToTop />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Save, Loader2, AlertCircle, LayoutGrid, LayoutList, BookOpen } from 'lucide-vue-next'
import { packageApi } from '../api/services'
import ConfigInput from '../components/ConfigInput.vue'
import BackToTop from '../components/common/BackToTop.vue'
import { message } from '../utils/message'

interface PackageConfigOptionSchema {
  name: string
  nameZh?: string
  path: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'enum'
  required?: boolean
  defaultValue?: any
  description: string
  descriptionZh: string
  enumValues?: string[]
  arrayOptions?: string[]
  example?: any
}

const route = useRoute()
const router = useRouter()
const projectId = route.params.id as string

// 状态
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const configSchema = ref<Record<string, { label: string; options: PackageConfigOptionSchema[] }>>({})
const config = ref<Record<string, any>>({})
const originalConfig = ref<Record<string, any>>({})
const formLayout = ref<'vertical' | 'horizontal'>('vertical')

// 计算属性：获取所有分类
const categories = computed(() => {
  try {
    if (!configSchema.value || typeof configSchema.value !== 'object') {
      return []
    }
    const keys = Object.keys(configSchema.value)
    const filtered = keys.filter(key => {
      try {
        const category = configSchema.value[key]
        return category && typeof category === 'object' && category.options && Array.isArray(category.options) && category.options.length > 0
      } catch (err) {
        console.error(`Error checking category ${key}:`, err)
        return false
      }
    })
    return filtered.sort()
  } catch (err) {
    console.error('Error computing categories:', err)
    return []
  }
})

const hasChanges = computed(() => {
  return JSON.stringify(config.value) !== JSON.stringify(originalConfig.value)
})

// 获取配置值
function getConfigValue(path: string): any {
  const keys = path.split('.')
  let value: any = config.value

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key]
    } else {
      // 查找 schema 中的默认值
      const schema = findSchemaByPath(path)
      return schema?.defaultValue
    }
  }

  return value
}

// 根据路径查找 schema
function findSchemaByPath(path: string): PackageConfigOptionSchema | undefined {
  if (!configSchema.value || typeof configSchema.value !== 'object') {
    return undefined
  }
  for (const category of Object.values(configSchema.value)) {
    if (category && category.options && Array.isArray(category.options)) {
      const found = category.options.find(s => s.path === path)
      if (found) return found
    }
  }
  return undefined
}

// 获取分类标签
function getCategoryLabel(categoryKey: string): string {
  if (!configSchema.value || !configSchema.value[categoryKey]) {
    return categoryKey
  }
  return configSchema.value[categoryKey].label || categoryKey
}

// 获取分类选项
function getCategoryOptions(categoryKey: string): PackageConfigOptionSchema[] {
  if (!configSchema.value || !configSchema.value[categoryKey]) {
    return []
  }
  const category = configSchema.value[categoryKey]
  if (!category || !category.options || !Array.isArray(category.options)) {
    return []
  }
  return category.options
}

// 设置配置值
function setConfigValue(path: string, value: any): void {
  const keys = path.split('.')
  const lastKey = keys.pop()!

  let target: any = config.value
  for (const key of keys) {
    if (!target[key] || typeof target[key] !== 'object') {
      target[key] = {}
    }
    target = target[key]
  }

  // 检查是否应该删除配置项
  // 注意：空数组 [] 和空对象 {} 应该被保留，因为它们是有意义的配置值
  if (value === undefined || value === null || value === '') {
    // 删除配置项
    if (target && typeof target === 'object' && lastKey in target) {
      delete target[lastKey]
    }
  } else {
    // 保留空数组和空对象
    target[lastKey] = value
  }
}

// 处理配置变更
function handleConfigChange(path: string, value: any): void {
  setConfigValue(path, value)
}

// 保存配置
async function handleSave(): Promise<void> {
  if (!hasChanges.value) return

  saving.value = true
  error.value = null

  try {
    const response = await packageApi.updateConfig(projectId, config.value)
    if (response.success) {
      // 保存成功后，重新加载配置以确保显示的是后端实际保存的配置
      try {
        const reloadResponse = await packageApi.getConfig(projectId)
        if (reloadResponse.success && reloadResponse.data) {
          config.value = reloadResponse.data.config || {}
          originalConfig.value = JSON.parse(JSON.stringify(config.value))
        }
      } catch (reloadError) {
        console.warn('重新加载配置失败，但保存已成功:', reloadError)
      }
      
      message.success('配置已成功保存到 package.json')
    } else {
      throw new Error(response.message || '配置保存失败')
    }
  } catch (err: any) {
    const errorMsg = err.message || '配置保存失败'
    error.value = errorMsg
    message.error(errorMsg)
    console.error('Save config error:', err)
  } finally {
    saving.value = false
  }
}

// 加载 Schema
async function loadSchema(): Promise<void> {
  try {
    const response = await packageApi.getSchema()
    if (response.success && response.data) {
      configSchema.value = JSON.parse(JSON.stringify(response.data))
    } else {
      throw new Error(response.message || '加载 Schema 失败')
    }
  } catch (err: any) {
    console.error('Failed to load schema:', err)
    error.value = err.message || '加载 Schema 失败'
  }
}

// 加载配置
async function loadConfig(): Promise<void> {
  loading.value = true
  error.value = null

  try {
    await loadSchema()

    const response = await packageApi.getConfig(projectId)
    if (response.success && response.data) {
      config.value = response.data.config || {}
      originalConfig.value = JSON.parse(JSON.stringify(config.value))
    } else {
      throw new Error(response.message || '加载配置失败')
    }
  } catch (err: any) {
    const errorMsg = err.message || '加载配置失败'
    error.value = errorMsg
    message.error(errorMsg)
    console.error('Load config error:', err)
  } finally {
    loading.value = false
  }
}

// 跳转到文档页面
function goToDocumentation(): void {
  router.push('/docs/package/config')
}

onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.project-config-page {
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
  transition: box-shadow 0.2s ease;
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
  flex: 1;
  font-size: var(--font-size-2xl);
  font-weight: var(--size-font-weight-semibold);
  margin: 0;
  color: var(--color-text-primary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-md);
}

.doc-btn {
  background: var(--color-bg-component);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-light);
}

.doc-btn:hover {
  background: var(--color-bg-component-hover);
  border-color: var(--theme-color-primary);
  color: var(--theme-color-primary);
}

.layout-toggle {
  display: flex;
  gap: var(--size-spacing-xs);
  background: var(--color-bg-component);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  padding: 2px;
}

.layout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  border-radius: var(--size-radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.layout-btn:hover {
  background: var(--color-bg-component-hover);
  color: var(--color-text-primary);
}

.layout-btn.active {
  background: var(--theme-color-primary);
  color: white;
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

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  padding: var(--size-spacing-sm);
  background: var(--color-bg-component);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-light);
}

.btn-icon:hover:not(:disabled) {
  background: var(--color-bg-component-hover);
  border-color: var(--theme-color-primary);
}

.btn-primary {
  background: var(--theme-color-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
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

.page-content {
  max-width: 1400px;
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

.config-editor {
  background: var(--color-bg-container);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-lg);
  padding: var(--size-spacing-xl);
}

.config-sections {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-2xl);
}

.config-section {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-lg);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: var(--size-spacing-md);
  border-bottom: 2px solid var(--color-border-light);
}

.section-header h2 {
  font-size: var(--font-size-xl);
  font-weight: var(--size-font-weight-semibold);
  margin: 0;
  color: var(--color-text-primary);
}

.section-count {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  background: var(--color-bg-component);
  padding: var(--size-spacing-xs) var(--size-spacing-sm);
  border-radius: var(--size-radius-sm);
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--size-spacing-lg);
  width: 100%;
}

.empty-state {
  text-align: center;
  padding: var(--size-spacing-3xl);
  color: var(--color-text-secondary);
}

/* 响应式 */
@media (max-width: 768px) {
  .page-header {
    flex-wrap: wrap;
  }

  .header-actions {
    flex-wrap: wrap;
  }

  .config-grid {
    grid-template-columns: 1fr;
  }
}
</style>
