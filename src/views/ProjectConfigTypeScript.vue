<template>
  <div class="project-config-page">
    <div class="page-header">
      <button class="back-btn" @click="router.back()">
        <ArrowLeft :size="20" />
        返回
      </button>
      <h1>TypeScript 配置</h1>
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
        <!-- 版本选择器 -->
        <div class="version-selector-compact">
          <label class="version-label">版本</label>
          <select
            v-model="selectedVersion"
            @change="handleVersionChange"
            class="version-select"
          >
            <option v-if="currentVersion" :value="currentVersion">
              {{ currentVersion }}
            </option>
            <option v-for="version in availableVersions" :key="version" :value="version">
              {{ version }}
            </option>
          </select>
          <button
            v-if="selectedVersion !== currentVersion"
            class="btn btn-icon"
            @click="handleUpdateVersion"
            :disabled="updatingVersion"
            :title="'更新到 ' + selectedVersion"
          >
            <Package v-if="!updatingVersion" :size="16" />
            <Loader2 v-else :size="16" class="spinning" />
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
import { ArrowLeft, Save, Loader2, AlertCircle, Package, LayoutGrid, LayoutList, BookOpen } from 'lucide-vue-next'
import { typescriptApi } from '../api/services'
import ConfigInput from '../components/ConfigInput.vue'
import BackToTop from '../components/common/BackToTop.vue'
import { message } from '../utils/message'

interface ConfigOptionSchema {
  name: string
  path: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'enum'
  inCompilerOptions?: boolean
  defaultValue?: any
  description: string
  descriptionZh: string
  introducedIn?: string
  deprecatedIn?: string
  enumValues?: string[]
  example?: any
}

const route = useRoute()
const router = useRouter()
const projectId = route.params.id as string

// 状态
const loading = ref(true)
const saving = ref(false)
const updatingVersion = ref(false)
const error = ref<string | null>(null)
// 移除 saveSuccess 和 saveSuccessMessage，改用全局 message
const availableVersions = ref<string[]>([])
const currentVersion = ref<string | null>(null)
const selectedVersion = ref<string>('')
const configSchema = ref<Record<string, { label: string; options: ConfigOptionSchema[] }>>({})
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
function findSchemaByPath(path: string): ConfigOptionSchema | undefined {
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
function getCategoryOptions(categoryKey: string): ConfigOptionSchema[] {
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

  if (value === undefined || value === null || value === '') {
    // 删除配置项
    if (target && typeof target === 'object' && lastKey in target) {
      delete target[lastKey]
    }
  } else {
    target[lastKey] = value
  }
}

// 处理配置变更
function handleConfigChange(path: string, value: any): void {
  setConfigValue(path, value)
}

// 处理版本变更
async function handleVersionChange(): Promise<void> {
  await loadSchema()
}

// 更新版本
async function handleUpdateVersion(): Promise<void> {
  if (!selectedVersion.value) return

  updatingVersion.value = true
  error.value = null
  
  try {
    const response = await typescriptApi.updateVersion(projectId, selectedVersion.value)
    if (response.success) {
      // 更新版本成功后，重新加载所有数据（版本、Schema、配置）
      await loadConfig()
      message.success(`TypeScript 版本已更新到 ${selectedVersion.value}`)
    } else {
      throw new Error(response.message || '版本更新失败')
    }
  } catch (err: any) {
    const errorMsg = err.message || '版本更新失败'
    error.value = errorMsg
    message.error(errorMsg)
    console.error('Update version error:', err)
  } finally {
    updatingVersion.value = false
  }
}

// 保存配置
async function handleSave(): Promise<void> {
  if (!hasChanges.value) return

  saving.value = true
  error.value = null

  try {
    const response = await typescriptApi.updateConfig(projectId, config.value)
    if (response.success) {
      // 保存成功后，重新加载配置以确保显示的是后端实际保存的配置
      // 因为后端可能会做深度合并，返回的配置可能和前端发送的不完全一样
      // 但不显示加载状态，只静默刷新配置
      try {
        const reloadResponse = await typescriptApi.getConfig(projectId)
        if (reloadResponse.success && reloadResponse.data) {
          config.value = reloadResponse.data.config || {}
          originalConfig.value = JSON.parse(JSON.stringify(config.value))
        }
      } catch (reloadError) {
        console.warn('重新加载配置失败，但保存已成功:', reloadError)
      }
      
      message.success('配置已成功保存到 tsconfig.json')
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

// 加载可用版本列表
async function loadVersions(): Promise<void> {
  try {
    const response = await typescriptApi.getVersions()
    if (response.success && response.data) {
      availableVersions.value = Array.isArray(response.data) ? response.data : []
    }
  } catch (err: any) {
    console.error('Failed to load versions:', err)
  }
}

// 加载当前版本
async function loadCurrentVersion(): Promise<void> {
  try {
    const response = await typescriptApi.getCurrentVersion(projectId)
    if (response.success && response.data) {
      currentVersion.value = response.data.version
      selectedVersion.value = response.data.version || availableVersions.value[0] || ''
    }
  } catch (err: any) {
    console.error('Failed to load current version:', err)
    selectedVersion.value = availableVersions.value[0] || ''
  }
}

// 加载配置 Schema
async function loadSchema(): Promise<void> {
  try {
    const version = selectedVersion.value || currentVersion.value
    const response = await typescriptApi.getSchema(version || undefined)
    if (response.success && response.data) {
      // 后端返回的是分组后的对象
      const data = response.data
      
      if (typeof data === 'object' && !Array.isArray(data) && data !== null) {
        // 使用深拷贝确保嵌套对象也被正确复制
        configSchema.value = JSON.parse(JSON.stringify(data))
      } else {
        console.warn('Invalid schema data format:', data)
        configSchema.value = {}
      }
    } else {
      console.warn('Schema response not successful:', response)
      configSchema.value = {}
    }
  } catch (err: any) {
    console.error('Failed to load schema:', err)
    const errorMsg = '加载配置 Schema 失败'
    error.value = errorMsg
    message.error(errorMsg)
    configSchema.value = {}
  }
}

// 加载配置
async function loadConfig(): Promise<void> {
  loading.value = true
  error.value = null

  try {
    await Promise.all([loadVersions(), loadCurrentVersion()])
    await loadSchema()

    const response = await typescriptApi.getConfig(projectId)
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
  router.push('/docs/typescript/config')
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
  align-items: center;
  gap: 2px;
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
  padding: 0;
  background: transparent;
  border: none;
  border-radius: var(--size-radius-sm);
  color: var(--color-text-secondary);
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

.layout-btn.active:hover {
  background: var(--theme-color-primary);
  opacity: 0.9;
}

.version-selector-compact {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-xs);
  padding: var(--size-spacing-xs) var(--size-spacing-sm);
  background: var(--color-bg-component);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
}

.version-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.version-select {
  padding: var(--size-spacing-xs) var(--size-spacing-sm);
  background: transparent;
  color: var(--color-text-primary);
  border: none;
  font-size: var(--font-size-sm);
  cursor: pointer;
  outline: none;
  min-width: 100px;
}

.btn-icon {
  width: 32px;
  height: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
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
  max-width: 1800px;
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

.config-editor {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-xl);
}

.config-sections {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-xl);
}

.config-section {
  background: var(--color-bg-container);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-lg);
  padding: var(--size-spacing-xl);
}

.section-header {
  display: flex;
  align-items: baseline;
  gap: var(--size-spacing-md);
  margin-bottom: var(--size-spacing-xl);
  padding-bottom: var(--size-spacing-md);
  border-bottom: 2px solid var(--color-border-light);
}

.section-header h2 {
  font-size: var(--font-size-xl);
  font-weight: var(--size-font-weight-semibold);
  margin: 0;
  color: var(--color-text-primary);
}

.section-subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: var(--size-font-weight-normal);
}

.section-count {
  margin-left: auto;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  background: var(--color-bg-component);
  padding: var(--size-spacing-xs) var(--size-spacing-sm);
  border-radius: var(--size-radius-sm);
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--size-spacing-xl);
  align-items: start;
}

/* 响应式布局 */
@media (max-width: 1400px) {
  .config-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .config-grid {
    grid-template-columns: 1fr;
  }
  
  .page-header {
    flex-wrap: wrap;
    padding: var(--size-spacing-sm) var(--size-spacing-md);
  }
  
  .header-actions {
    width: 100%;
    justify-content: space-between;
  }
}

.btn {
  display: flex;
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

.btn-primary {
  background: var(--theme-color-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--theme-color-primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-icon {
  background: var(--color-bg-component);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-light);
}

.btn-icon:hover:not(:disabled) {
  background: var(--color-bg-component-hover);
  border-color: var(--theme-color-primary);
}
</style>
